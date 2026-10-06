# Launch one BTP pipeline process per entry in config.yaml 'cameras:'.
# Each camera gets its own source, web dashboard port, db file and snapshot
# folder (see main.py --camera). One process per camera keeps TensorFlow /
# DeepFace happy on Windows (no shared-session threading issues).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools\run_all_cameras.ps1
#   # single camera instead:
#   .\.venv\Scripts\python main.py --camera gate

$ErrorActionPreference = "Stop"

$cams = .\.venv\Scripts\python -c "import yaml; print(' '.join(str(c['name']) for c in (yaml.safe_load(open('config.yaml', encoding='utf-8')).get('cameras') or [])))"
$names = @($cams.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries))

if ($names.Count -eq 0) {
    Write-Host "No entries under 'cameras:' in config.yaml - nothing to launch."
    exit 1
}

foreach ($c in $names) {
    Write-Host "Starting camera '$c' ..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python main.py --camera $c"
}

Write-Host "Launched $($names.Count) camera(s): $($names -join ', ')"
Write-Host "Dashboards / reports per camera: see 'python main.py --list-cameras' and 'python report.py --db data/db_<name>.sqlite3'."
