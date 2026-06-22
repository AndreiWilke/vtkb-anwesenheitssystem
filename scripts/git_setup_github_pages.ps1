Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

git add .github/workflows/deploy-pages.yml apps/web/vite.config.ts

git commit -m "ci: add GitHub Pages deployment via GitHub Actions

- .github/workflows/deploy-pages.yml: baut und deployed den Vite-PWA-Build
  bei jedem Push auf main oder feature/package-1-3-conversion-members
- Typecheck laeuft vor dem Build (Build schlaegt fehl bei TS-Fehlern)
- VITE_BASE_URL=/vtkb-anwesenheitssystem/ setzt den korrekten base-Pfad
- apps/web/vite.config.ts: liest base aus VITE_BASE_URL (Fallback: /)
  damit lokale Entwicklung unveraendert bleibt

Nach dem Push:
  GitHub -> Settings -> Pages -> Source: GitHub Actions
  URL: https://andreiwilke.github.io/vtkb-anwesenheitssystem/"

git push
Write-Host "" -ForegroundColor Green
Write-Host "==> Fertig! Naechste Schritte:" -ForegroundColor Green
Write-Host "    1. GitHub -> Repo -> Settings -> Pages" -ForegroundColor Cyan
Write-Host "    2. Source auf 'GitHub Actions' umstellen" -ForegroundColor Cyan
Write-Host "    3. Workflow laeuft automatisch an" -ForegroundColor Cyan
Write-Host "    4. URL: https://andreiwilke.github.io/vtkb-anwesenheitssystem/" -ForegroundColor Cyan
