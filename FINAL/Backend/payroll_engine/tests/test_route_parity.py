"""Route parity with the legacy Express routers.

Every ``router.<method>(path)`` in ``FINAL/legacy_payroll/router/payRollRouter.js`` and
``payrollImportRouter.js`` (mounted at ``/import``) must resolve under
``/v1/payroll-engine/`` to a view that accepts that HTTP method, and must answer an HR
request and a worker request without a server error.
"""

import re
import uuid
from pathlib import Path

from django.test import TestCase
from django.urls import Resolver404, resolve

from payroll_engine.tests.fixtures import BASE, client_for, make_org_world

LEGACY_ROUTER_DIR = Path(__file__).resolve().parents[3] / "legacy_payroll" / "router"
ROUTE_RE = re.compile(r"router\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]")


def legacy_routes():
    routes = []
    for filename, prefix in (("payRollRouter.js", ""), ("payrollImportRouter.js", "import")):
        source = re.sub(r"//[^\n]*", "", (LEGACY_ROUTER_DIR / filename).read_text())
        for match in ROUTE_RE.finditer(source):
            routes.append((match.group(1).upper(), f"{prefix}/{match.group(2).strip('/')}".strip("/")))
    return routes


class RouteParityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.routes = legacy_routes()
        cls.world = make_org_world(n_workers=1)

    def sample_path(self, path):
        return "/".join(str(uuid.uuid4()) if seg.startswith(":") else seg for seg in path.split("/"))

    def test_legacy_routers_parsed(self):
        self.assertEqual(len(self.routes), 160)
        self.assertEqual(len(set(self.routes)), len(self.routes))

    def test_every_legacy_route_resolves(self):
        missing = []
        for method, path in self.routes:
            try:
                resolve(BASE + self.sample_path(path))
            except Resolver404:
                missing.append(f"{method} {path}")
        self.assertEqual(missing, [])

    def _sweep(self, user):
        client = client_for(user)
        bad = []
        for method, path in self.routes:
            url = BASE + self.sample_path(path)
            response = getattr(client, method.lower())(url, {}, format="json") if method != "GET" \
                else client.get(url)
            if response.status_code in (405, 500):
                bad.append(f"{method} {path} -> {response.status_code} {response.content[:160]!r}")
        return bad

    def test_methods_accepted_and_no_server_error_for_hr(self):
        self.assertEqual(self._sweep(self.world["contractor"]), [])

    def test_methods_accepted_and_no_server_error_for_worker(self):
        self.assertEqual(self._sweep(self.world["workers"][0]), [])
