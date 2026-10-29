param(
  [Parameter(Mandatory = $true)][string]$Pattern,
  [string]$PfxBase64 = $env:BSS_WINDOWS_SIGNING_PFX_BASE64,
  [string]$Password = $env:BSS_WINDOWS_SIGNING_PFX_PASSWORD
)

$ErrorActionPreference = 'Stop'
Write-Host "Signing: $Pattern"

if ([string]::IsNullOrWhiteSpace($PfxBase64)) {
  Write-Host 'BSS_WINDOWS_SIGNING_PFX_BASE64 is not set; skipping Windows signing.'
  exit 0
}

$pfxPath = Join-Path $env:RUNNER_TEMP 'BSS_windows_signing.pfx'
[IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($PfxBase64))

$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signtool) {
  throw 'signtool.exe was not found in the Windows SDK.'
}

$files = Get-ChildItem $Pattern -File -ErrorAction SilentlyContinue
if (-not $files) {
  Write-Host "No files matched: $Pattern"
  exit 0
}

foreach ($file in $files) {
  & $signtool.FullName sign /f $pfxPath /p $Password /tr http://timestamp.digicert.com /td sha256 /fd sha256 $file.FullName
  if ($LASTEXITCODE -ne 0) { throw "Signing failed: $($file.FullName)" }
  & $signtool.FullName verify /pa /v $file.FullName
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Signed, but the certificate chain is not trusted on this runner (self-signed certificate). Replace BSS_WINDOWS_SIGNING_PFX_BASE64 with a CA-issued code-signing certificate for public trust."
  }
  Write-Host "Signed: $($file.FullName)"
}

Remove-Item $pfxPath -Force
exit 0
