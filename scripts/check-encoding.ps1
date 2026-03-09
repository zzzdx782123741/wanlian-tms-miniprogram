param(
  [string]$Path = "."
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$checker = Join-Path $root "scripts\quick-encoding-check.ps1"

if (-not (Test-Path $checker)) {
  Write-Host "Missing checker script: $checker" -ForegroundColor Red
  exit 1
}

powershell -ExecutionPolicy Bypass -File $checker -Path $Path
exit $LASTEXITCODE
