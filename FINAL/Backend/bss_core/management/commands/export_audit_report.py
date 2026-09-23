"""Generate the live BSS audit/verification report workbook for a scope + quarter.

Phase 2: the Report Data sheet and the three report dashboards are populated
from live BSS data by the verification engine; the specification sheets
(Framework, Classification, Mapping, Results Engine) keep their exact layout.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate the audit/verification report workbook from live BSS data."

    def add_arguments(self, parser):
        parser.add_argument("--out", default="/tmp/audit_report_live.xlsx")
        parser.add_argument("--fy", type=int, default=None, help="FY start year, e.g. 2026 for FY 2026-27")
        parser.add_argument("--quarter", type=int, default=None, help="Quarter 1..4 (Apr-Mar)")
        parser.add_argument("--employer", default=None, help="Employer username")
        parser.add_argument("--contractor", default=None, help="Contractor username")
        parser.add_argument("--site", default=None, help="Site name or code")
        parser.add_argument("--start", default=None, help="Start date YYYY-MM-DD")
        parser.add_argument("--end", default=None, help="End date YYYY-MM-DD")
        parser.add_argument("--spec-only", action="store_true",
                            help="Emit the reference layout without live data")

    def handle(self, *args, **options):
        from bss_core.models import Site, User
        from api.audit import Scope, build_overrides, build_row_overrides, build_workbook, compute, quarter_bounds

        scope_kwargs = {}
        if options.get("employer"):
            user = User.objects.filter(username=options["employer"]).first()
            if user is None:
                self.stderr.write(f"employer not found: {options['employer']}")
                return
            scope_kwargs["employer"] = user
        if options.get("contractor"):
            user = User.objects.filter(username=options["contractor"]).first()
            if user is None:
                self.stderr.write(f"contractor not found: {options['contractor']}")
                return
            scope_kwargs["contractor"] = user
        if options.get("site"):
            site = (Site.objects.filter(site_name__iexact=options["site"]).first()
                    or Site.objects.filter(site_code__iexact=options["site"]).first())
            if site is None:
                self.stderr.write(f"site not found: {options['site']}")
                return
            scope_kwargs["site"] = site

        start, end = options.get("start"), options.get("end")
        if options.get("fy") and options.get("quarter"):
            start, end = quarter_bounds(options["fy"], options["quarter"])

        if options.get("spec_only"):
            data = build_workbook()
            with open(options["out"], "wb") as handle:
                handle.write(data)
            self.stdout.write(self.style.SUCCESS(f"Wrote spec workbook {options['out']}"))
            return

        scope = Scope(start=start, end=end, **scope_kwargs)
        dataset = compute(scope)
        overrides = build_overrides(dataset)
        row_overrides = build_row_overrides(scope, dataset)
        data = build_workbook(overrides=overrides, row_overrides=row_overrides)
        with open(options["out"], "wb") as handle:
            handle.write(data)
        summary = None
        self.stdout.write(self.style.SUCCESS(
            f"Wrote live workbook {options['out']} for scope "
            f"{scope_kwargs or 'ALL'} {start or ''}..{end or ''} "
            f"({len(dataset['parameters'])} parameters, {len(data)} bytes)"))
