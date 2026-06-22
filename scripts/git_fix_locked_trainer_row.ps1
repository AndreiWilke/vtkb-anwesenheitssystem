Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

git add apps/web/src/screens.tsx apps/web/src/styles.css
git commit -m "ux: show 'Verantwortlicher Trainer' label on locked member row

Der verantwortliche Trainer war in der Schnellerfassung als gesperrte
Zeile nicht erkennbar. Neu: aria-label erklaert den Grund, die small-
Beschriftung zeigt 'Verantwortlicher Trainer' statt Altersgruppe, und
die Zeile erhaelt ein abweichendes Hintergrunddesign (.locked-Klasse)."

git push
Write-Host "==> Fertig." -ForegroundColor Green
