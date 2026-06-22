Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
Write-Host "==> Aktueller Branch: $branch" -ForegroundColor Cyan

# Sicherstellen dass wir auf dem Feature-Branch sind
if ($branch -eq "main") {
    Write-Host "==> Wechsle zurueck auf Feature-Branch..." -ForegroundColor Yellow
    git checkout feature/package-1-3-conversion-members
    if ($LASTEXITCODE -ne 0) { Write-Error "Checkout fehlgeschlagen (Exit $LASTEXITCODE)" }
    $branch = git rev-parse --abbrev-ref HEAD
    Write-Host "==> Jetzt auf: $branch" -ForegroundColor Cyan
}

# main holen und mergen
Write-Host "==> Wechsle auf main..." -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Error "Checkout main fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Hole aktuellen Stand von origin/main..." -ForegroundColor Cyan
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Pull fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Merge $branch -> main..." -ForegroundColor Cyan
git merge --no-ff "feature/package-1-3-conversion-members" -m "feat: Verwaltung nav + management hub screen (Paket 1.4)"
if ($LASTEXITCODE -ne 0) { Write-Error "Merge fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Push main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Push fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Fertig! CI deployed jetzt automatisch." -ForegroundColor Green
git log --oneline -3
