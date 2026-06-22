Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan
git add apps/web/vite.config.ts .github/workflows/deploy-pages.yml
git commit -m "fix: use process.env.CI for GitHub Pages base path

VITE_BASE_URL wurde beim Build nicht zuverlaessig uebernommen.
GitHub Actions setzt CI=true automatisch -- zuverlaessiger als
eine benutzerdefinierte Env-Variable.

Lokal (CI nicht gesetzt): base = '/'
GitHub Actions (CI=true): base = '/vtkb-anwesenheitssystem/'"
git push

# Auch auf main aktualisieren (workflow + vite config)
git checkout main
git checkout $branch -- apps/web/vite.config.ts .github/workflows/deploy-pages.yml
git add apps/web/vite.config.ts .github/workflows/deploy-pages.yml
git commit -m "fix: use process.env.CI for GitHub Pages base path (sync to main)"
git push
git checkout $branch
Write-Host "==> Fertig. CI startet automatisch." -ForegroundColor Green
