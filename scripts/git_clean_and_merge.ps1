Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "==> Bereinige Merge-Zustand..." -ForegroundColor Yellow
git merge --abort 2>$null
git checkout --force main
if ($LASTEXITCODE -ne 0) { Write-Error "Checkout main fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Setze main auf origin/main zurueck..." -ForegroundColor Yellow
git reset --hard origin/main
if ($LASTEXITCODE -ne 0) { Write-Error "Reset fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Merge Feature-Branch..." -ForegroundColor Cyan
git merge --no-ff feature/package-1-3-conversion-members `
    -X theirs `
    -m "feat: Verwaltung nav + management hub screen (Paket 1.4)"
if ($LASTEXITCODE -ne 0) { Write-Error "Merge fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Push main nach origin..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Push fehlgeschlagen (Exit $LASTEXITCODE)" }

Write-Host "==> Fertig! CI deployed automatisch." -ForegroundColor Green
git log --oneline -4
