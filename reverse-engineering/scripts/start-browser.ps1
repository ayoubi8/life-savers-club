#requires -Version 5.1
<#
  Launch a dedicated Chrome profile with the DevTools port open so the capture
  script (and REA) can attach. Log into Lovable once in this window; the session
  persists in .chrome-profile for later runs.

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\start-browser.ps1
    powershell -ExecutionPolicy Bypass -File scripts\start-browser.ps1 -Port 9222
#>
param(
  [int]$Port = 9222,
  [string]$ChromePath = ""
)

$ErrorActionPreference = "Stop"

if (-not $ChromePath) {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )
  $ChromePath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $ChromePath -or -not (Test-Path -LiteralPath $ChromePath)) {
  throw "Chrome/Edge not found. Pass -ChromePath 'C:\path\to\chrome.exe'."
}

$profile = Join-Path (Split-Path -Parent $PSScriptRoot) ".chrome-profile"
New-Item -ItemType Directory -Path $profile -Force | Out-Null

Write-Host "Chrome  : $ChromePath"
Write-Host "Profile : $profile"
Write-Host "CDP     : http://127.0.0.1:$Port"
Write-Host ""
Write-Host "1) In the window that opens, log into Lovable."
Write-Host "2) Open the preview URL and confirm the app renders."
Write-Host "3) Leave Chrome running and run: npm run capture -- --url <url> --crawl"
Write-Host ""

& $ChromePath `
  --remote-debugging-port=$Port `
  --user-data-dir="$profile" `
  --no-first-run `
  --no-default-browser-check `
  --disable-features=Translate `
  "https://preview--club-vibe-nexus.lovable.app/"
