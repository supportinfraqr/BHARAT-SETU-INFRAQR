"""Differential-test helpers that run legacy *controller* code in Node.

``call_handler(controller, fn, req, models)`` runs an Express handler with a fake
``req``/``res`` and stubbed ``initModels`` (each model is ``{"findOne": doc, "find": [docs],
"findById": doc, "findByIdAndUpdate": doc}``)
and returns ``{"status": http_status, "body": json}``.

``call_internal(file, fn, *args)`` calls a *non-exported* top-level function of a legacy
file (the source is compiled with an extra export appended).
"""

import os
import tempfile

from .legacy_js import LEGACY_DIR, run_js_batch

_HARNESS = r"""
const path = require('path');
const fs = require('fs');
const Module = require('module');
const root = process.argv[1];

function stubModels(models) {
  const idx = require.resolve(path.join(root, 'models/indexModel'));
  const built = {};
  for (const [name, spec] of Object.entries(models || {})) {
    built[name] = {
      findOne: () => { const p = Promise.resolve(spec.findOne ?? null);
                       p.lean = () => p; p.sort = () => p; p.select = () => p; p.populate = () => p; return p; },
      find: () => { const p = Promise.resolve(spec.find ?? []);
                    p.lean = () => p; p.sort = () => p; p.select = () => p; p.populate = () => p;
                    p.limit = () => p; return p; },
      findById: () => { const p = Promise.resolve(spec.findById ?? null);
                        p.lean = () => p; p.select = () => p; p.populate = () => p; return p; },
      findByIdAndUpdate: () => { const p = Promise.resolve(spec.findByIdAndUpdate ?? spec.findById ?? null);
                                 p.lean = () => p; p.select = () => p; return p; },
    };
  }
  require.cache[idx] = { id: idx, filename: idx, loaded: true, exports: { initModels: async () => built } };
}

exports.callHandler = async (controllerRel, fn, req, models) => {
  stubModels(models);
  const file = require.resolve(path.join(root, controllerRel));
  delete require.cache[file];
  const ctrl = require(file);
  let out = null;
  const res = {
    _s: 200,
    status(s) { this._s = s; return this; },
    json(b) { out = { status: this._s, body: b }; return this; },
    setHeader() {}, send(b) { out = { status: this._s, body: String(b) }; return this; },
  };
  await ctrl[fn]({ headers: { org_uuid: 'org1' }, params: {}, query: {}, userId: 'u1', ...req }, res);
  return out;
};

const compiled = {};
exports.callInternal = async (fileRel, fn, ...args) => {
  const file = path.join(root, fileRel);
  if (!compiled[file + '#' + fn]) {
    const src = fs.readFileSync(file, 'utf8') + `\nmodule.exports.__internal = (typeof ${fn} !== 'undefined') ? ${fn} : undefined;`;
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(src, file);
    compiled[file + '#' + fn] = m.exports.__internal;
  }
  return compiled[file + '#' + fn](...args);
};
"""

_HARNESS_PATH = None


def _harness_rel():
    global _HARNESS_PATH
    if _HARNESS_PATH is None or not os.path.exists(_HARNESS_PATH):
        fd, p = tempfile.mkstemp(suffix="_pe_harness.js")
        with os.fdopen(fd, "w") as fh:
            fh.write(_HARNESS)
        _HARNESS_PATH = p
    return os.path.relpath(_HARNESS_PATH, LEGACY_DIR)


def handler_call(controller, fn, req, models=None):
    return {"module": _harness_rel(), "fn": "callHandler",
            "args": [controller, fn, req, models or {}]}


def internal_call(file, fn, *args):
    return {"module": _harness_rel(), "fn": "callInternal", "args": [file, fn, *args]}


def run_batch(calls):
    out = run_js_batch(calls)
    for r in out:
        if isinstance(r, dict) and "$error" in r and len(r) == 1:
            raise RuntimeError(f"JS error: {r['$error']}")
    return out


def call_handler(controller, fn, req, models=None):
    return run_batch([handler_call(controller, fn, req, models)])[0]


def call_internal(file, fn, *args):
    return run_batch([internal_call(file, fn, *args)])[0]
