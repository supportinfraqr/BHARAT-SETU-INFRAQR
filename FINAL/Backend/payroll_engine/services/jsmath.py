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
    return float(math.floor(x + 0.5))


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
