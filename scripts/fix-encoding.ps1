param(
  [string]$Path = ".",
  [switch]$DryRun
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$fixer = Join-Path $root "scripts\fix-encoding.ps1"

if (-not (Test-Path $fixer)) {
  Write-Host "Missing fixer script: $fixer" -ForegroundColor Red
  exit 1
}

$args = @("-ExecutionPolicy", "Bypass", "-File", $fixer, "-Path", $Path)
if ($DryRun) { $args += "-DryRun" }

powershell @args
exit $LASTEXITCODE
