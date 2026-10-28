"""Auto payroll on pay day (legacy ``config/scheduler.js`` ``scheduleAutoPayroll``).

Legacy ran a node-cron job every minute. Here the engineer installs a system cron that
runs this command every 15 minutes, e.g.::

    */15 * * * * cd /app && python manage.py run_auto_payroll >> ~/bss_auto_payroll.log 2>&1

Each run: registers every org that has a PayrollSchedule in ``AutoPayrollRegistry``
(backfill), then for every registry row applies the legacy gates — schedule active,
``autoProcessEnabled`` true, on/after ``firstPayPeriod``, today is a pay day (an
``upcomingPayrolls`` date, or ``payDay`` for monthly schedules), ``lastAutoRunKey`` not
already this period, and the current IST time within ``--window`` minutes after
``autoProcessTime`` (legacy: exact minute; ``--window 1`` reproduces that). On a match it
processes payroll for that month (same as POST /processPayroll for all active
employees), stamps ``lastAutoRun*`` and refreshes the upcoming pay dates, so re-runs are
idempotent per period.
"""

import json

from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime

from payroll_engine.services.auto_payroll_runner import (backfill_registry,
                                                          run_auto_payroll_for_all_organizations)


class Command(BaseCommand):
    help = ("Run auto payroll for orgs whose pay day/time is due. Schedule from cron every "
            "15 minutes (*/15 * * * *); --window should equal the cron interval.")

    def add_arguments(self, parser):
        parser.add_argument("--window", type=int, default=15,
                            help="Minutes after autoProcessTime that still count as due "
                                 "(default 15 = cron interval; 1 = legacy exact minute).")
        parser.add_argument("--now", default=None,
                            help="Override the current time (ISO, e.g. 2026-07-07T13:05+05:30) "
                                 "for testing.")
        parser.add_argument("--json", action="store_true", help="Print the summary as JSON.")

    def handle(self, *args, **opts):
        now = None
        if opts["now"]:
            now = parse_datetime(opts["now"])
            if now is None:
                raise SystemExit(f"Invalid --now: {opts['now']}")
        added = backfill_registry()
        summary = run_auto_payroll_for_all_organizations(now=now, window_minutes=opts["window"])
        if opts["json"]:
            self.stdout.write(json.dumps({"registered": added, "summary": summary},
                                         default=str))
            return
        for row in summary:
            if not row.get("skipped"):
                self.stdout.write(f"[AutoPayroll] {row['org']}: success={row.get('success')} "
                                  f"period={row.get('period')} "
                                  f"{row.get('message') or row.get('error') or ''}")
            elif row.get("reason") == "already_auto_run":
                self.stdout.write(f"[AutoPayroll] SKIP {row['org']}: already ran {row.get('period')}")
            elif row.get("reason") == "not_auto_time":
                self.stdout.write(f"[AutoPayroll] WAIT {row['org']}: need {row.get('configuredTime')}"
                                  f", now {row.get('now')}")
