"""Node runner for the TDS differential tests.

Like ``legacy_js.run_js_batch`` but it can also call the *internal* (non-exported)
helpers of ``controller/payroll/tdsManagement.js``: module ``"internal:<path>"`` loads the
file with an extra ``module.exports.__i = { <every top-level function> }``. Extra argument
tags build the Mongoose model stand-ins the legacy helpers take as parameters:

* ``{"$findOneLean": v}``       -> ``{ findOne: () => ({ lean: async () => v }) }``
* ``{"$findPopulateLean": v}``  -> ``{ find: () => ({ populate: () => ({ lean: async () => v }) }) }``

Other tags as in ``legacy_js`` (``$undefined``, ``$date``).
"""

import json
import os
import subprocess

from .legacy_js import LEGACY_DIR, _node_path

_RUNNER = r"""
const path = require('path');
const fs = require('fs');
const Module = require('module');
const root = process.argv[1];
const internals = {};
function loadInternal(rel) {
  if (internals[rel]) return internals[rel];
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, 'utf8');
  const names = [...src.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map((m) => m[1]);
  src += '\nmodule.exports.__i = {' + names.join(',') + '};';
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(src, file);
  internals[rel] = m.exports.__i;
  return internals[rel];
}
let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', async () => {
  const calls = JSON.parse(input);
  const decode = (v) => {
    if (Array.isArray(v)) return v.map(decode);
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      if (v.$undefined === true && keys.length === 1) return undefined;
      if (typeof v.$date === 'string' && keys.length === 1) return new Date(v.$date);
      if ('$findOneLean' in v && keys.length === 1) {
        const val = decode(v.$findOneLean);
        return { findOne: () => ({ lean: async () => val }) };
      }
      if ('$findPopulateLean' in v && keys.length === 1) {
        const val = decode(v.$findPopulateLean);
        return { find: () => ({ populate: () => ({ lean: async () => val }) }) };
      }
      const o = {};
      for (const k of keys) o[k] = decode(v[k]);
      return o;
    }
    return v;
  };
  const enc = (v) => (v === undefined ? { $undefined: true } : JSON.parse(JSON.stringify(v) ?? 'null'));
  const out = [];
  for (const c of calls) {
    try {
      let mod;
      if (c.module.startsWith('internal:')) mod = loadInternal(c.module.slice(9));
      else mod = require(path.join(root, c.module));
      const target = mod[c.fn];
      const args = c.args.map(decode);
      const ret = typeof target === 'function' ? await target(...args) : target;
      if (c.mutated) {
        const a = {};
        for (const i of c.mutated) a[i] = enc(args[i]);
        out.push({ ret: enc(ret), args: a });
      } else {
        out.push(enc(ret));
      }
    } catch (e) {
      out.push({ $error: String(e && e.message || e) });
    }
  }
  process.stdout.write(JSON.stringify(out), () => process.exit(0));
});
"""


def run_tds_js_batch(calls, timeout=300):
    node = _node_path()
    env = dict(os.environ, TZ="Asia/Kolkata")
    proc = subprocess.run([node, "-e", _RUNNER, LEGACY_DIR], input=json.dumps(calls),
                          capture_output=True, text=True, cwd=LEGACY_DIR, env=env, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"node failed ({proc.returncode}): {proc.stderr[-2000:]}")
    return json.loads(proc.stdout)
