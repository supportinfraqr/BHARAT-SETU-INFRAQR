"""JavaScript number semantics for a faithful port of the legacy payroll maths.

Python's ``round`` is banker's rounding and ``float('')`` raises, while the
legacy code relied on ``Math.round`` (half towards +infinity), ``toFixed``,
``Number(x) || 0`` and ``parseFloat``. Use these helpers wherever the legacy
code used the JS builtin so every amount matches to the paisa.
"""

import math
import re
from decimal import ROUND_HALF_UP, Decimal

_NUM_PREFIX = re.compile(r"^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")


def js_round(x):
    """``Math.round`` — nearest integer, .5 rounds towards +infinity."""
    x = float(x)
    if math.isnan(x) or math.isinf(x):
        return x
    r = math.floor(x)
    return float(r + 1 if x - r >= 0.5 else r)


def round2(x):
    """``Math.round(x * 100) / 100`` (the legacy 2-dp idiom)."""
    return js_round(float(x) * 100) / 100


def to_fixed(x, digits=2):
    """``Number(x.toFixed(digits))`` — JS toFixed rounds the exact binary value half-up."""
    x = float(x)
    if math.isnan(x) or math.isinf(x):
        return x
    q = Decimal(1).scaleb(-digits)
    return float(Decimal(x).quantize(q, rounding=ROUND_HALF_UP))


def to_fixed_str(x, digits=2):
    x = float(x)
    q = Decimal(1).scaleb(-digits)
    return str(Decimal(x).quantize(q, rounding=ROUND_HALF_UP))


def js_number(value):
    """``Number(value)`` — returns NaN for unparsable input (None -> 0, '' -> 0)."""
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    text = str(value).strip()
    if text == "":
        return 0.0
    try:
        if text.lower().startswith(("0x", "-0x", "+0x")):
            return float(int(text, 16))
        return float(text)
    except ValueError:
        return float("nan")


def num(value, default=0.0):
    """``Number(value) || default`` — NaN / 0 / null collapse to ``default``."""
    n = js_number(value)
    if math.isnan(n) or n == 0:
        return float(default)
    return n


def parse_float(value):
    """``parseFloat(value)`` — leading numeric prefix, else NaN."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    match = _NUM_PREFIX.match(str(value if value is not None else ""))
    return float(match.group()) if match else float("nan")


def parse_int(value):
    """``parseInt(value, 10)``."""
    match = re.match(r"^\s*[+-]?\d+", str(value if value is not None else ""))
    return int(match.group()) if match else float("nan")


def is_finite(value):
    """``Number.isFinite(value)`` (no coercion: only real numbers qualify)."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def finite_number(value):
    """``Number.isFinite(Number(value))``."""
    n = js_number(value)
    return not (math.isnan(n) or math.isinf(n))


def truthy(value):
    """JavaScript truthiness."""
    if value is None or value is False:
        return False
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return not (value == 0 or math.isnan(value))
    if isinstance(value, str):
        return value != ""
    return True


def clean(n):
    """Render integral floats as ints for JSON parity with JS (``1500`` not ``1500.0``)."""
    if isinstance(n, float) and n.is_integer() and math.isfinite(n):
        return int(n)
    return n


# --------------------------------------------------------------------------------------
# JavaScript value model (added for the calculation-library ports).
#
# Legacy inputs are JSON-shaped dicts: a *missing* key is JS ``undefined`` and ``None`` is
# ``null``. ``UNDEFINED`` represents ``undefined`` explicitly where the distinction matters
# (``JSON.stringify`` drops undefined object properties; destructuring defaults apply only
# to undefined; ``Number(undefined)`` is NaN while ``Number(null)`` is 0).
# --------------------------------------------------------------------------------------


class _Undefined:
    __slots__ = ()

    def __repr__(self):
        return "undefined"

    def __bool__(self):
        return False


UNDEFINED = _Undefined()

# Characters stripped by String.prototype.trim and matched by the JS regex class ``\s``.
JS_WS = ("\t\n\v\f\r            "
         "      　﻿")
JS_WS_CLASS = "[" + re.escape(JS_WS) + "]"

_JS_DEC = re.compile(r"[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)")
_JS_RADIX = re.compile(r"0([xXoObB])([0-9a-fA-F]+)")


def is_nullish(value):
    """``value == null`` (null or undefined)."""
    return value is None or value is UNDEFINED


def js_trim(text):
    """``String.prototype.trim`` on a Python ``str``."""
    return text.strip(JS_WS)


def _is_num(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def to_primitive(value):
    """``ToPrimitive`` for the JSON value space (arrays / objects become strings)."""
    if isinstance(value, (list, tuple, dict, set)):
        return js_str(value)
    return value


def to_number(value):
    """Full ``Number(value)`` (``ToNumber``): undefined -> NaN, null -> 0, '' -> 0, ' 12 ' -> 12,
    '0x1f' -> 31, 'Infinity' -> inf, '12px' -> NaN, [] -> 0, [5] -> 5, {} -> NaN."""
    if value is UNDEFINED:
        return float("nan")
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, int):
        return float(value)
    if isinstance(value, float):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return float("nan")
    if isinstance(value, (list, tuple)):
        return to_number(js_str(value))
    if isinstance(value, str):
        text = js_trim(value)
        if text == "":
            return 0.0
        m = _JS_RADIX.fullmatch(text)
        if m:
            base = {"x": 16, "o": 8, "b": 2}[m.group(1).lower()]
            try:
                return float(int(m.group(2), base))
            except ValueError:
                return float("nan")
        if _JS_DEC.fullmatch(text):
            return float(text.replace("Infinity", "inf"))
        return float("nan")
    return float("nan")


def num0(value):
    """``Number(value) || 0``."""
    n = to_number(value)
    return 0.0 if (math.isnan(n) or n == 0) else n


def is_integer(value):
    """``Number.isInteger(value)`` (no coercion)."""
    return _is_num(value) and math.isfinite(value) and float(value).is_integer()


def _num_to_str(x):
    x = float(x)
    if math.isnan(x):
        return "NaN"
    if math.isinf(x):
        return "Infinity" if x > 0 else "-Infinity"
    if x == 0:
        return "0"
    sign = "-" if x < 0 else ""
    d = Decimal(repr(abs(x)))
    _, digits, exp = d.as_tuple()
    digits = "".join(map(str, digits)).rstrip("0") or "0"
    k = len(digits)
    n = exp + len("".join(map(str, d.as_tuple()[1])))  # decimal point position
    if k <= n <= 21:
        out = digits + "0" * (n - k)
    elif 0 < n <= 21:
        out = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        out = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        mant = digits if k == 1 else digits[0] + "." + digits[1:]
        out = f"{mant}e{'+' if e >= 0 else '-'}{abs(e)}"
    return sign + out


def js_str(value):
    """``String(value)``."""
    if value is UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, Decimal)):
        return _num_to_str(value)
    if isinstance(value, (list, tuple)):
        return ",".join("" if is_nullish(v) else js_str(v) for v in value)
    if isinstance(value, dict):
        return "[object Object]"
    if isinstance(value, (set, frozenset)):
        return "[object Set]"
    return str(value)


def js_truthy(value):
    """JavaScript truthiness, aware of ``UNDEFINED`` (``[]`` and ``{}`` are truthy)."""
    if value is UNDEFINED:
        return False
    return truthy(value)


def js_or(*values):
    """``a || b || c`` — first truthy operand, else the last one."""
    for v in values[:-1]:
        if js_truthy(v):
            return v
    return values[-1]


def js_and(a, b):
    """``a && b``."""
    return b if js_truthy(a) else a


def js_nc(a, b):
    """``a ?? b``."""
    return b if is_nullish(a) else a


def js_strict_eq(a, b):
    """``a === b`` for JSON values (bool is not a number; objects compare by identity)."""
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    if _is_num(a) and _is_num(b):
        return float(a) == float(b)
    if isinstance(a, str) and isinstance(b, str):
        return a == b
    if a is None or b is None or a is UNDEFINED or b is UNDEFINED:
        return a is b
    if _is_num(a) or _is_num(b) or isinstance(a, str) or isinstance(b, str):
        return False
    return a is b


def _relational(a, b):
    a, b = to_primitive(a), to_primitive(b)
    if isinstance(a, str) and isinstance(b, str):
        return a, b
    x, y = to_number(a), to_number(b)
    if math.isnan(x) or math.isnan(y):
        return None
    return x, y


def js_lt(a, b):
    p = _relational(a, b)
    return p is not None and p[0] < p[1]


def js_le(a, b):
    p = _relational(a, b)
    return p is not None and p[0] <= p[1]


def js_gt(a, b):
    p = _relational(a, b)
    return p is not None and p[0] > p[1]


def js_ge(a, b):
    p = _relational(a, b)
    return p is not None and p[0] >= p[1]


def js_max(*values):
    """``Math.max(...)`` (ToNumber on each, NaN wins, +0 beats -0)."""
    nums = [to_number(v) for v in values]
    result = float("-inf")
    for n in nums:
        if math.isnan(n):
            return float("nan")
        if n > result or (n == 0 and result == 0 and math.copysign(1, n) > 0):
            result = n
    return result


def js_min(*values):
    """``Math.min(...)`` (ToNumber on each, NaN wins, -0 beats +0)."""
    nums = [to_number(v) for v in values]
    result = float("inf")
    for n in nums:
        if math.isnan(n):
            return float("nan")
        if n < result or (n == 0 and result == 0 and math.copysign(1, n) < 0):
            result = n
    return result


def js_add(a, b):
    """Binary ``+`` (string concatenation when either primitive is a string)."""
    a, b = to_primitive(a), to_primitive(b)
    if isinstance(a, str) or isinstance(b, str):
        return js_str(a) + js_str(b)
    return to_number(a) + to_number(b)


def js_sub(a, b):
    return to_number(a) - to_number(b)


def js_mul(a, b):
    x, y = to_number(a), to_number(b)
    if (math.isinf(x) and y == 0) or (math.isinf(y) and x == 0):
        return float("nan")
    return x * y


def js_div(a, b):
    """``a / b`` with IEEE semantics (x/0 -> ±Infinity, 0/0 -> NaN)."""
    x, y = to_number(a), to_number(b)
    if y == 0:
        if x == 0 or math.isnan(x):
            return float("nan")
        return math.copysign(float("inf"), x) * math.copysign(1, y)
    return x / y


def math_round(value):
    """``Math.round(value)`` with ToNumber coercion (see ``js_round``)."""
    return js_round(to_number(value))


def js_get(obj, key):
    """``obj.key`` — TypeError on null/undefined like JS; missing keys -> ``UNDEFINED``."""
    if obj is None or obj is UNDEFINED:
        raise TypeError(f"Cannot read properties of {js_str(obj)} (reading '{key}')")
    if isinstance(obj, dict):
        return obj.get(key, UNDEFINED)
    if key == "length" and isinstance(obj, (str, list, tuple)):
        return len(obj)
    return UNDEFINED


def js_opt(obj, key):
    """``obj?.key``."""
    if obj is None or obj is UNDEFINED:
        return UNDEFINED
    return js_get(obj, key)


def js_str_method_target(value):
    """Receiver of a ``String.prototype`` method call (``x.trim()``): must be a string."""
    if not isinstance(value, str):
        raise TypeError(f"{js_str(value)}.<string method> is not a function")
    return value


def js_out(value):
    """Deep copy for returning JS-shaped results: drops ``UNDEFINED`` object properties
    (as ``JSON.stringify`` does), maps ``UNDEFINED`` array items to ``None`` and renders
    integral floats as ints (``clean``) so serialised JSON matches the legacy bytes."""
    if isinstance(value, dict):
        return {k: js_out(v) for k, v in value.items() if v is not UNDEFINED}
    if isinstance(value, (list, tuple)):
        return [None if v is UNDEFINED else js_out(v) for v in value]
    if isinstance(value, float):
        return clean(value)
    return value
