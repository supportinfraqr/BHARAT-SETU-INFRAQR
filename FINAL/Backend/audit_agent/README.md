# BSS Document Audit Agent (BSS integration)

This folder is the vendored audit engine used by the BSS monthly contractor audit.
It is **not** the standalone admin console from the original release.

Start here: [BSS_RUNBOOK.md](BSS_RUNBOOK.md).

The engine reads:

- `worker_documents/` — the workers' own documents
- `contractor_documents_<Month>_<Year>/` — employer-approved CLRA registers and uploaded forms
- `bss_workers.json` — the bound-worker master for that contractor/site/month
- `job.json` — principal employer, contractor, site, state, wage month

It writes branded HTML, PDF, Excel, JSON and an evidence trail.

The production runner is isolated: no DB credentials, no BSS network, only the
shared job volume and outbound HTTPS to the active AI provider.
