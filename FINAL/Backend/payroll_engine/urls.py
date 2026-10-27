"""URL table for the payroll engine.

Mounted at ``/v1/payroll-engine/`` (see ``config/urls.py``). Every route keeps
the legacy path (``/payroll/<path>`` in the Node app -> ``/v1/payroll-engine/<path>``)
so the legacy API docs map 1:1. Each views module exposes ``ROUTES`` as a list
of ``(route, view, name)``; routes are registered with and without a trailing
slash, matching the rest of the BSS /v1 bridge.
"""

import importlib

from django.urls import path

VIEW_MODULES = [
    "core",
]

urlpatterns = []
for module_name in VIEW_MODULES:
    module = importlib.import_module(f"payroll_engine.views.{module_name}")
    for route, view, name in module.ROUTES:
        urlpatterns.append(path(route, view, name=f"pe_{name}"))
        urlpatterns.append(path(f"{route}/", view, name=f"pe_{name}_slash"))
