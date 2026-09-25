"""Central seeders for the BSS platform.

All mandatory catalog seeding lives here so a fresh deployment anywhere (local,
staging, prod) comes up complete. ``run_all()`` is idempotent — it is invoked by
``manage.py seed_all`` and the container entrypoint on every start.

Add a new seeder by writing a module that exposes ``seed()`` and registering it
in ``SEEDERS`` (or add an existing management command to ``COMMAND_SEEDERS``).
"""

import os

# Management-command seeders run in order (idempotent). Kept as commands while
# their (larger) logic is migrated into this package.
COMMAND_SEEDERS = [
    ("CLRA register field mappings + calculation rules", "seed_register_config"),
]

# Python-module seeders: (label, "module.path"). Each module exposes ``seed()``.
MODULE_SEEDERS: list[tuple[str, str]] = [
    ("worker document master catalog", "bss_core.seeders.documents"),
    ("statutory compliance catalog", "bss_core.seeders.compliance"),
    ("leave-type catalog", "bss_core.seeders.leave_types"),
    ("statutory rate master", "bss_core.seeders.statutory"),
    ("minimum wage master", "bss_core.seeders.minimum_wage"),
    ("default letter templates", "bss_core.seeders.letter_templates"),
]


def _clra_zip() -> str | None:
    path = os.environ.get("CLRA_ZIP", "/app/data/clra-registers.zip")
    return path if path and os.path.exists(path) else None


def _run_clra_library() -> str:
    """One-time (only-if-empty) import of the CLRA register library.

    Scoped to Maharashtra only — the template library is seeded for that state
    alone (both locally and in prod), so the other states' register files are
    intentionally not imported.
    """
    zip_path = _clra_zip()
    if not zip_path:
        return "skipped (no bundle)"
    from django.core.management import call_command
    call_command("import_clra_templates", zip=zip_path, state="Maharashtra", only_if_empty=True)
    call_command("import_clra_applicability", zip=zip_path, only_if_empty=True)
    return "ok"


def run_all(verbose=False):
    """Run every mandatory seeder. Returns ``[(label, status), ...]``.

    A failing seeder never aborts the run — it is reported so the container
    still starts (a partial catalogue is better than a dead backend)."""
    from django.core.management import call_command
    import importlib

    results: list[tuple[str, str]] = []

    for label, command in COMMAND_SEEDERS:
        try:
            call_command(command)
            results.append((label, "ok"))
        except Exception as exc:  # noqa: BLE001
            results.append((label, f"failed: {exc}"))

    for label, module_path in MODULE_SEEDERS:
        try:
            module = importlib.import_module(module_path)
            module.seed()
            results.append((label, "ok"))
        except Exception as exc:  # noqa: BLE001
            results.append((label, f"failed: {exc}"))

    try:
        results.append(("CLRA register library", _run_clra_library()))
    except Exception as exc:  # noqa: BLE001
        results.append(("CLRA register library", f"failed: {exc}"))

    if verbose:
        for label, status in results:
            print(f"  {label}: {status}")
    return results


__all__ = ["run_all", "COMMAND_SEEDERS", "MODULE_SEEDERS"]
