$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$yml = @"
paths:
  cctv:
"@
Set-Content -LiteralPath "$root\tools\mediamtx_local.yml" -Value $yml -Encoding UTF8

Write-Host "[rtsp-rig] starting MediaMTX on rtsp://127.0.0.1:8554/cctv ..."
$mtx = Start-Process -FilePath "$root\tools\mediamtx\mediamtx.exe" `
    -ArgumentList "$root\tools\mediamtx_local.yml" `
    -WorkingDirectory "$root\tools\mediamtx" `
    -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

$ffmpeg = (Get-ChildItem "$root\tools\ffmpeg-*\bin\ffmpeg.exe" | Select-Object -First 1).FullName
Write-Host "[rtsp-rig] publishing looped footage via $ffmpeg ..."

& $ffmpeg -hide_banner -loglevel warning `
    -re -stream_loop -1 -i "$root\tests\assets\cctv_sim.mp4" `
    -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p `
    -f rtsp "rtsp://127.0.0.1:8554/cctv"

Stop-Process -Id $mtx.Id -Force -ErrorAction SilentlyContinue
