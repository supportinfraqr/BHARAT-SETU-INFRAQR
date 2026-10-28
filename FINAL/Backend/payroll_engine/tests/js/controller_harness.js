// Differential-test harness: runs a legacy payroll controller handler against an
// in-memory mini-Mongo (fake Mongoose models) and returns the captured HTTP response.
// Loaded by tests/legacy_js.py (cwd = legacy payroll dir).
//
// run({ controller, handler, collections, refs, req, now })
//   collections: { PayrollRunModel: [docs], EmployeeModel: [docs], ... }
//   refs:        { PayrollRunModel: { employeeId: 'EmployeeModel' }, ... } (populate targets)
//   now:         ISO string -> freezes Date.now() / new Date()
// Returns { status, headers, body, created: {Model: [docs]}, deleted: {Model: [ids]} }.
const path = require('path');

const root = process.cwd();
let current = null;

const indexPath = require.resolve(path.join(root, 'models/indexModel.js'));
require.cache[indexPath] = {
  id: indexPath, filename: indexPath, loaded: true, children: [], paths: [],
  exports: { initModels: async () => current },
};

const getPath = (doc, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
const toCmp = (v) => (v instanceof Date ? v.getTime() : (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? Date.parse(v) : v));
const eq = (a, b) => {
  if (Array.isArray(a)) return a.some((x) => eq(x, b));
  if (a == null && b == null) return true;
  return String(toCmp(a)) === String(toCmp(b));
};

function matchCond(value, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)
      && Object.keys(cond).some((k) => k.startsWith('$'))) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$in': return arg.some((x) => eq(value, x));
        case '$nin': return !arg.some((x) => eq(value, x));
        case '$ne': return !eq(value, arg);
        case '$exists': return arg ? value !== undefined : value === undefined;
        case '$gte': return value != null && toCmp(value) >= toCmp(arg);
        case '$lte': return value != null && toCmp(value) <= toCmp(arg);
        case '$gt': return value != null && toCmp(value) > toCmp(arg);
        case '$lt': return value != null && toCmp(value) < toCmp(arg);
        case '$regex': return new RegExp(arg, cond.$options || '').test(String(value ?? ''));
        case '$options': return true;
        default: throw new Error(`unsupported operator ${op}`);
      }
    });
  }
  return eq(value, cond);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return cond.some((f) => matches(doc, f));
    if (k === '$and') return cond.every((f) => matches(doc, f));
    return matchCond(getPath(doc, k), cond);
  });
}

function project(doc, select) {
  if (!select || !doc) return doc;
  const fields = String(select).split(/\s+/).filter(Boolean);
  if (fields.every((f) => f.startsWith('-'))) {
    const out = { ...doc };
    fields.forEach((f) => delete out[f.slice(1)]);
    return out;
  }
  const out = { _id: doc._id };
  fields.forEach((f) => {
    const v = getPath(doc, f);
    if (v === undefined) return;
    const parts = f.split('.');
    let o = out;
    parts.slice(0, -1).forEach((p) => { o[p] = o[p] || {}; o = o[p]; });
    o[parts[parts.length - 1]] = v;
  });
  return out;
}

function makeModels(collections, refs, created, deleted) {
  const models = {};
  const clone = (d) => JSON.parse(JSON.stringify(d));
  const byId = (name, id) => (collections[name] || []).find((d) => String(d._id) === String(id));

  const populateDoc = (name, doc, spec) => {
    const opt = typeof spec === 'string' ? { path: spec } : spec;
    const target = (refs[name] || {})[opt.path];
    if (!target || !doc) return doc;
    const id = getPath(doc, opt.path);
    let ref = id == null ? null : byId(target, id);
    ref = ref ? project(clone(ref), opt.select) : null;
    if (ref && opt.populate) ref = populateDoc(target, ref, opt.populate);
    doc[opt.path] = ref;
    return doc;
  };

  const query = (name, filter, single) => {
    const st = { sort: null, skip: 0, limit: 0, select: null, pops: [] };
    const exec = () => {
      let rows = (collections[name] || []).filter((d) => matches(d, filter)).map(clone);
      if (st.sort) {
        const keys = Object.entries(st.sort);
        rows.sort((a, b) => {
          for (const [k, dir] of keys) {
            const x = toCmp(getPath(a, k)); const y = toCmp(getPath(b, k));
            if (x === y) continue;
            if (x == null) return -dir; if (y == null) return dir;
            return (x < y ? -1 : 1) * dir;
          }
          return 0;
        });
      }
      if (st.skip) rows = rows.slice(st.skip);
      if (st.limit) rows = rows.slice(0, st.limit);
      rows = rows.map((d) => project(d, st.select));
      rows = rows.map((d) => st.pops.reduce((acc, p) => populateDoc(name, acc, p), d));
      return single ? (rows[0] || null) : rows;
    };
    const q = {
      sort(s) { st.sort = s; return q; },
      skip(n) { st.skip = n; return q; },
      limit(n) { st.limit = n; return q; },
      select(s) { st.select = s; return q; },
      populate(p, sel) { st.pops.push(sel ? { path: p, select: sel } : p); return q; },
      lean() { return q; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    return q;
  };

  Object.keys({ ...collections, ...refs }).forEach((name) => {
    models[name] = {
      find: (f) => query(name, f || {}, false),
      findOne: (f) => query(name, f || {}, true),
      findById: (id) => query(name, { _id: id }, true),
      countDocuments: async (f) => (collections[name] || []).filter((d) => matches(d, f || {})).length,
      distinct: async (field, f) => [...new Set((collections[name] || []).filter((d) => matches(d, f || {}))
        .map((d) => String(getPath(d, field))))],
      aggregate: async (pipeline) => {
        let rows = (collections[name] || []).map(clone);
        for (const stage of pipeline) {
          if (stage.$match) rows = rows.filter((d) => matches(d, stage.$match));
          else if (stage.$unwind) {
            const f = stage.$unwind.replace(/^\$/, '');
            rows = rows.flatMap((d) => (getPath(d, f) || []).map((x) => ({ ...d, [f]: x })));
          } else if (stage.$count) rows = rows.length ? [{ [stage.$count]: rows.length }] : [];
          else throw new Error('unsupported stage');
        }
        return rows;
      },
      create: async (doc) => {
        const out = { _id: `created${(created[name] || []).length + 1}`, ...doc };
        (created[name] = created[name] || []).push(out);
        return out;
      },
      findByIdAndDelete: async (id) => {
        const doc = byId(name, id);
        if (doc) (deleted[name] = deleted[name] || []).push(String(id));
        return doc || null;
      },
    };
  });
  return models;
}

function freeze(nowIso) {
  const Real = Date;
  const fixed = Real.parse(nowIso);
  class FakeDate extends Real {
    constructor(...a) { if (a.length) super(...a); else super(fixed); }
    static now() { return fixed; }
  }
  global.Date = FakeDate;
  return () => { global.Date = Real; };
}

exports.run = async ({ controller, handler, collections = {}, refs = {}, req = {}, now }) => {
  const created = {}; const deleted = {};
  current = makeModels(collections, refs, created, deleted);
  const restore = now ? freeze(now) : () => {};
  try {
    const ctrlPath = require.resolve(path.join(root, controller));
    delete require.cache[ctrlPath];
    const ctrl = require(ctrlPath);
    const res = {
      statusCode: 200, headers: {}, body: undefined,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      send(b) { this.body = Buffer.isBuffer(b) ? { $buffer: b.toString('utf-8') } : b; return this; },
    };
    await ctrl[handler]({ headers: { org_uuid: 'org' }, query: {}, params: {}, body: {}, ...req }, res);
    const conv = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data)
      ? { $buffer: Buffer.from(v.data).toString('utf-8') } : v)));
    return { status: res.statusCode, headers: res.headers, body: conv(res.body ?? null), created: conv(created), deleted };
  } finally {
    restore();
  }
};
