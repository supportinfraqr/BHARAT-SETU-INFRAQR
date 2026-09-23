"""Structured view of the Verification Framework sheet.

The framework is the canonical parameter list (Sr 2–55): each parameter with its
pointers, procedure, primary BSS data/evidence, 100% verification method,
expected result, classification, exception/CAPA trigger, key relationships and
owner. It drives which parameters the engine evaluates and how they are labelled.
"""

from .spec_data import SHEETS

_SHEET = SHEETS["Verification Framework"]["rows"]

# Column order in the sheet (0-based indices in each stored row).
_COLUMNS = [
    "sr", "parameter", "pointers", "procedure", "evidence", "method",
    "expected", "classification", "trigger", "relationships", "owner", "reviewer",
]


def _cell(row, idx):
    if idx >= len(row) or row[idx] is None:
        return ""
    cell = row[idx]
    value = cell[0] if isinstance(cell, list) else cell
    return "" if value is None else str(value).strip()


def load_parameters():
    """Return the framework parameters as ``[{sr, parameter, ...}, ...]``."""
    out = []
    # First four rows are banner/title/header; data starts at index 4.
    for row in _SHEET[4:]:
        if not row:
            continue
        sr = _cell(row, 0)
        name = _cell(row, 1)
        if not name:
            continue
        item = {col: _cell(row, i) for i, col in enumerate(_COLUMNS)}
        item["code"] = f"VP-{sr.zfill(2) if sr else '??'}"
        out.append(item)
    return out


PARAMETERS = load_parameters()
PARAMETERS_BY_NAME = {p["parameter"]: p for p in PARAMETERS}


def owner_for(parameter):
    return PARAMETERS_BY_NAME.get(parameter, {}).get("owner", "")
