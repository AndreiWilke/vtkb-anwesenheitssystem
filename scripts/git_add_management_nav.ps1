Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

git add `
    apps/web/src/types.ts `
    apps/web/src/components.tsx `
    apps/web/src/screens.tsx `
    apps/web/src/App.tsx `
    apps/web/src/styles.css

git commit -m "feat: add Verwaltung nav item with management hub screen

Vorstand und Trainer sehen jetzt einen 5. Nav-Punkt 'Verwaltung'.
Der ManagementScreen bietet direkte Zugaenge zu:
  - Probetraining-Liste (TRIAL_LIST)
  - Neues Mitglied anlegen (MEMBER_DIRECT_NEW)
  - Guertelauswertung (BELT_REPORT)
  - Bildvorschlaege pruefen (BELT_SUGGESTION_REVIEW)

Kassenwart sieht weiterhin nur die 4 Basis-Punkte (kein Verwaltung).
Nav-Item bleibt aktiv bei allen Verwaltungs-Unterscreens."

git push
Write-Host "==> Fertig – CI deployed automatisch." -ForegroundColor Green
