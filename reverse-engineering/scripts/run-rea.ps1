#requires -Version 5.1
<#
  Run REA (https://github.com/morluto/rea) against the already-running,
  logged-in Chrome to collect passive evidence (DOM tree, scripts, routes,
  network metadata, screenshots).

  REA requirement: Node.js 22.x >= 22.23.4, 24.x >= 24.22.1, or 26.12.1+.
  Check with: node -v

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\run-rea.ps1
    powershell -ExecutionPolicy Bypass -File scripts\run-rea.ps1 -Origin "https://preview--club-vibe-nexus.lovable.app"
#>
param(
  [string]$Endpoint = "http://127.0.0.1:9222",
  [string]$Origin = "https://preview--club-vibe-nexus.lovable.app",
  [string]$OutDir = "output/rea"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root $OutDir
New-Item -ItemType Directory -Path $out -Force | Out-Null

Write-Host "REA targets on $Endpoint ..."
$targetsRaw = npx -y rea-agents@latest list-browser-targets $Endpoint --json 2>&1
$targetsRaw | Out-File -FilePath (Join-Path $out "targets.json") -Encoding utf8

$targets = $targetsRaw | ConvertFrom-Json
$rows = @()
if ($targets.targets) { $rows = $targets.targets }
elseif ($targets.result -and $targets.result.targets) { $rows = $targets.result.targets }
elseif ($targets -is [array]) { $rows = $targets }

$target = $rows | Where-Object { $_.url -like "$Origin*" } | Select-Object -First 1
if (-not $target) {
  Write-Host "No target matched $Origin. Open the preview in the Chrome window and rerun."
  Write-Host "Available targets:"
  $rows | ForEach-Object { Write-Host "  $($_.id)  $($_.url)" }
  exit 1
}

Write-Host "Selected target: $($target.id)  $($target.url)"

Write-Host "inspect-web-page ..."
npx -y rea-agents@latest inspect-web-page $Endpoint $target.id `
  --include-script-sources `
  --include-console-text `
  --include-storage-keys `
  --observation-ms 1500 `
  --json | Out-File -FilePath (Join-Path $out "inspect-web-page.json") -Encoding utf8

Write-Host "analyze-web-bundle ..."
npx -y rea-agents@latest analyze-web-bundle $Endpoint $target.id --json |
  Out-File -FilePath (Join-Path $out "web-bundle.json") -Encoding utf8

Write-Host "capture-web-screenshot ..."
npx -y rea-agents@latest capture-web-screenshot $Endpoint $target.id --json |
  Out-File -FilePath (Join-Path $out "screenshot.json") -Encoding utf8

Write-Host "observe-web-session (10s; interact with the page now) ..."
npx -y rea-agents@latest observe-web-session $Endpoint $target.id `
  --observation-ms 10000 --json |
  Out-File -FilePath (Join-Path $out "session.json") -Encoding utf8

Write-Host "Done. Evidence in $out"
