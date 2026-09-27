$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$py = "$root\.venv\Scripts\python.exe"

[System.IO.File]::WriteAllText("$root\tools\mediamtx_local.yml", "paths:`r`n  cctv:")

Write-Host "=== starting MediaMTX ==="
$mtx = Start-Process -FilePath "$root\tools\mediamtx\mediamtx.exe" `
    -ArgumentList "$root\tools\mediamtx_local.yml" `
    -WorkingDirectory "$root\tools\mediamtx" `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput "$root\tools\mediamtx.log" `
    -RedirectStandardError "$root\tools\mediamtx.err.log"
Start-Sleep 2

$ffmpeg = (Get-ChildItem "$root\tools\ffmpeg-*\bin\ffmpeg.exe" | Select-Object -First 1).FullName
Write-Host "=== starting publisher ==="
$ff = Start-Process -FilePath $ffmpeg `
    -ArgumentList "-hide_banner","-loglevel","warning","-re","-stream_loop","-1",`
        "-i","$root\tests\assets\cctv_sim.mp4",`
        "-c:v","libx264","-preset","veryfast","-tune","zerolatency","-pix_fmt","yuv420p",`
        "-f","rtsp","rtsp://127.0.0.1:8554/cctv" `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput "$root\tools\ffmpeg.log" `
    -RedirectStandardError "$root\tools\ffmpeg.err.log"
Start-Sleep 5

$listening = netstat -ano | Select-String ":8554.*LISTENING"
Write-Host "port 8554: $(if ($listening) { 'LISTENING' } else { 'NOT LISTENING' })"

try {
    Write-Host "=== running analytics pipeline on rtsp://127.0.0.1:8554/cctv ==="
    & $py "$root\main.py" --source "rtsp://127.0.0.1:8554/cctv" --no-display --duration 60
    Write-Host "=== report ==="
    & $py "$root\report.py"
} finally {
    Stop-Process -Id $ff.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $mtx.Id -Force -ErrorAction SilentlyContinue
    Write-Host "=== rig stopped ==="
}
