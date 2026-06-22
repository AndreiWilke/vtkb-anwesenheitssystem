Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

git add apps/web/src/screens.tsx apps/web/src/App.test.tsx
git commit -m "ux: auto-confirm member picker on single click

Mitglied-Auswahldialog bestaetigt sofort beim Klick auf ein Mitglied
(kein separater 'Uebernehmen'-Button mehr noetig). Abbrechen-Button
bleibt erhalten. Beschreibungstext angepasst. Tests aktualisiert."

git push
Write-Host "==> Fertig." -ForegroundColor Green
