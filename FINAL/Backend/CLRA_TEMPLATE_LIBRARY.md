# CLRA Registers / Forms Template Library

Single source of truth for the CLRA register/forms library (Replication guide).

## Source data

- Archive: `Requirements/CLRA Registers PAN India (3).zip` (repo path: `FINAL/Requirements/`).
- Layered per state: `CLRA Registers PAN India/<State>/<file>`.
- Contains both **forms** (fill-in documents; FORM IV, V, VI-A, VI-B, VII, XXIV,
  Identity Card FORM X, Wage Slip FORM XIX) and **registers** (tabular row lists;
  FORM II, III, VIII, IX, XI–XVII, XX–XXV and the xls "Register of …" sets).
- Classifications are **derived automatically at import time**, not hard-coded:
  - DOCX with field-dictionary content (`fields` and no columns) → **form**;
  - XLSX/XLS with columns → **register**;
  - DOCX with FORM X / FORM XIX identity + wage-slip layouts are forced to **form**.

## Scope (render mode)

Stored on each template as `meta.scope` and REST `perRow`:

- `per-worker` (perRow = true): **FORM X** (Identity Card) and **FORM XIX**
  (Wage Slip) — one copy rendered per worker row in the master file.
- `whole` (perRow = false): everything else — rendered once per batch.

## Import command

```
# from the Backend dir with the venv / docker service active

# Local (dev machine):
.venv/bin/python manage.py import_clra_templates

# Staging:
ssh -i <STAGING_KEY> ubuntu@<STAGING_HOST> \
  'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py import_clra_templates'

# Prod (explicit approval + DB backup first):
ssh -i <PROD_KEY> ubuntu@<PROD_HOST> \
  'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend python manage.py import_clra_templates'
```

Behaviour:

- Creates 559 templates (184 forms / 375 registers) across all states; skips
  unclassified/unrelated files (36 in the archive).
- Always **overwrites** the stored `html` on re-import → re-running regenerates
  the faithful printed-form layout from the source files.
- Sets `meta.scope` (`per-worker` / `whole`) and `per_row` on every template.
- Sets `meta.file` = source filename, `meta.lines` = parsed header lines.
- Is **idempotent** (0 created / N updated / M skipped when re-run).

Useful options:

- `--dry-run` prints the planned create/update classification table, no writes.
- `--zip-path <archive>` imports from a specific archive.
- `--only-state <State>` imports a single state.

## Clearing the library

Deletes every seeded template plus the cascaded rows (adoptions, field mappings,
calculation rules). Idempotent.

```
# Local:
.venv/bin/python manage.py shell -c "from bss_core.models import RegisterTemplate; print(RegisterTemplate.objects.all().delete())"

# Staging: (same via docker exec)
ssh -i <STAGING_KEY> ubuntu@<STAGING_HOST> \
  'cd ~/bss/FINAL/deploy && docker compose exec -T backend python manage.py shell -c "from bss_core.models import RegisterTemplate; print(RegisterTemplate.objects.all().delete())"'

# Prod (explicit approval + DB backup first):
ssh -i <PROD_KEY> ubuntu@<PROD_HOST> \
  'cd ~/bss/FINAL/deploy-prod && sudo docker compose exec -T backend python manage.py shell -c "from bss_core.models import RegisterTemplate; print(RegisterTemplate.objects.all().delete())"'
```

Clear + re-seed in one step is just the import command above (it recreates the
full library from the archive).

## Rendering

- `api/clra.render_register_html(template, rows, contractor, site, state)`
  renders a template. `perRow` wraps the layout in `{{#rows}}` so a form-style
  template renders once per worker; `whole` renders into the register's
  `{{HEAD}}`/`{{ROWS}}` grid.
- Field values bind via strict label matching (`_faithful_form_html.field_key`)
  to master-file fields: employee/workman/worker → `name`, father/husband/spouse
  → `fatherName`, sex → `gender`, date of entry/joining → `doj`, designation,
  department, mobile, addresses → `address`, aadhaar.