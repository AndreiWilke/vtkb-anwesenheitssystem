Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

# Schritt 1: Workflow-Fix committen
git add .github/workflows/deploy-pages.yml
git commit -m "ci: deploy to GitHub Pages only from main branch

Feature-Branch-Pushes bauen und testen weiterhin,
deployen aber nicht (GitHub Pages-Schutzregel)."
git push
Write-Host "==> Workflow-Fix gepusht." -ForegroundColor Cyan

# Schritt 2: Nach main wechseln und Feature-Branch mergen
git checkout main
git pull --ff-only
git merge --no-ff $branch -m "feat: Verwaltung nav + management hub screen (Paket 1.4)

Zusammenfuehrt feature/package-1-3-conversion-members in main.
Enthaelt:
  - 5. Nav-Punkt Verwaltung (sichtbar fuer Vorstand + Trainer)
  - ManagementScreen als Einstiegspunkt
  - Auto-Confirm bei Mitglieder-Auswahl im Foto-Review
  - Gesperrte Trainer-Zeile mit Label in Schnellerfassung"
git push
Write-Host "==> main aktualisiert – CI deployed automatisch." -ForegroundColor Green
