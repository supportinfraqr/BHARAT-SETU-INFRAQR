"""Run legacy payroll JS functions in Node for differential (parity) tests.

``run_js(module_rel_path, function_name, *args)`` runs one call; ``run_js_batch(calls)``
runs many calls in a single Node process. Arguments travel as JSON with these tags:

* ``{"$undefined": true}``  -> ``undefined``
* ``{"$set": [...]}``       -> ``new Set([...])``
* ``{"$date": "<iso>"}``    -> ``new Date("<iso>")``

Results come back as JSON (``Date`` -> ISO string via ``toJSON``, ``NaN``/``Infinity`` ->
``null``, ``Set`` -> ``{"$set": [sorted items]}``, top-level ``undefined`` ->
``{"$undefined": true}``). A thrown error yields ``{"$error": "<message>"}``. With
``mutated=[i, ...]`` the reply is ``{"ret": <result>, "args": {i: <arg i after call>}}``
(for functions that mutate an argument). Async functions are awaited.

Environment: ``LEGACY_PAYROLL_JS_DIR`` (legacy copy with node_modules) and ``NODE_BIN``.
Node runs with ``TZ=Asia/Kolkata``.
"""

import json
import os
import shutil
import subprocess

DEFAULT_LEGACY_DIR = (
    "/tmp/claude-1000/-home-gaurav-ahuja-Downloads-Payroll/"
    "be8c3ff7-69f8-404a-8380-221e10906478/scratchpad/legacy_run"
)
DEFAULT_NODE = "/home/gaurav-ahuja/.local/node/bin/node"

LEGACY_DIR = os.environ.get("LEGACY_PAYROLL_JS_DIR", DEFAULT_LEGACY_DIR)
NODE_BIN = os.environ.get("NODE_BIN", DEFAULT_NODE)


def _node_path():
    if NODE_BIN and os.path.isfile(NODE_BIN) and os.access(NODE_BIN, os.X_OK):
        return NODE_BIN
    return shutil.which("node")


def node_available():
    """True when Node and the legacy JS copy are both available."""
    return bool(_node_path()) and os.path.isdir(os.path.join(LEGACY_DIR, "utils"))


SKIP_REASON = (
    f"Node ({NODE_BIN}) or legacy payroll JS dir ({LEGACY_DIR}) not available; "
    "set NODE_BIN / LEGACY_PAYROLL_JS_DIR to run differential tests"
)

_RUNNER = r"""
const path = require('path');
const root = process.argv[1];
let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', async () => {
  const calls = JSON.parse(input);
  const decode = (v) => {
    if (Array.isArray(v)) return v.map(decode);
    if (v && typeof v === 'object') {
      if (v.$undefined === true && Object.keys(v).length === 1) return undefined;
      if (Array.isArray(v.$set) && Object.keys(v).length === 1) return new Set(v.$set.map(decode));
      if (typeof v.$date === 'string' && Object.keys(v).length === 1) return new Date(v.$date);
      const o = {};
      for (const k of Object.keys(v)) o[k] = decode(v[k]);
      return o;
    }
    return v;
  };
  const replacer = (k, v) => {
    if (v instanceof Set) {
      return { $set: [...v].sort((a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)) };
    }
    return v;
  };
  const enc = (v) => (v === undefined ? { $undefined: true } : JSON.parse(JSON.stringify(v, replacer) ?? 'null'));
  const out = [];
  for (const c of calls) {
    try {
      const mod = require(path.join(root, c.module));
      const target = mod[c.fn];
      const args = c.args.map(decode);
      let ret;
      if (typeof target === 'function') ret = await target(...args);
      else ret = target;
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
  process.stdout.write(JSON.stringify(out));
});
"""


def run_js_batch(calls, timeout=120):
    """``calls``: list of dicts ``{"module", "fn", "args", "mutated"?}``; returns results."""
    node = _node_path()
    if not node:
        raise RuntimeError(SKIP_REASON)
    env = dict(os.environ, TZ="Asia/Kolkata")
    proc = subprocess.run(
        [node, "-e", _RUNNER, LEGACY_DIR],
        input=json.dumps(calls),
        capture_output=True,
        text=True,
        cwd=LEGACY_DIR,
        env=env,
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"node failed ({proc.returncode}): {proc.stderr[-2000:]}")
    return json.loads(proc.stdout)


def run_js(module_rel_path, function_name, *args):
    """Run one legacy JS export with JSON ``args`` and return its JSON-decoded result.

    Raises ``RuntimeError`` if the JS function threw."""
    (res,) = run_js_batch([{"module": module_rel_path, "fn": function_name, "args": list(args)}])
    if isinstance(res, dict) and "$error" in res and len(res) == 1:
        raise RuntimeError(f"JS error: {res['$error']}")
    return res
