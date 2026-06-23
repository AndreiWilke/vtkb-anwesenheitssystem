$ErrorActionPreference = "Continue"
Set-Location "D:\Anwesenheit"
$branch = "feature/package-1-5-belt-gender-updates"

$current = git branch --show-current
Write-Host "==> Aktueller Branch: $current"

if ($current -ne $branch) {
  Write-Host "==> Wechsle auf Branch: $branch"
  git checkout $branch 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Branch nicht vorhanden, erstelle neu..."
    git checkout -b $branch
    if ($LASTEXITCODE -ne 0) { Write-Error "Branch-Erstellung fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }
  }
} else {
  Write-Host "==> Bereits auf Branch: $branch"
}

Write-Host "==> Stage alle Aenderungen (inkl. neue Dateien)..."
git add -A
if ($LASTEXITCODE -ne 0) { Write-Error "git add fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

$status = git status --porcelain
if ($status) {
  Write-Host "==> Commit..."
  git commit -m "fix: Paket 1.5 – TypeScript + Tests + UI (vollstaendiger Review-Durchlauf)

TypeScript-Fehler:
- shared/belt: effectiveFrom per conditional spread (exactOptionalPropertyTypes)
- web/components: beltLabels Record um alle 5 Halbguertel-Farben erweitert
- web/beltScreens + beltReportScreen: .sort() mit (x ?? '') fuer optionales effectiveFrom
- web/reporting: beltReportCsv-Signatur effectiveFrom optional; sort + set mit ??

UI-Fixes:
- web/styles: CSS-Klassen fuer Halbguertel-Dots + belt-history-card Layout
- web/beltScreens: Guertelhistorie als vertikale Card-Liste (Mobile-fix)
- web/styles: bottom-nav 5 Spalten (alle Nav-Items in einer Zeile)
- web/screens: session-option-right Wrapper fuer StatusTag + ChevronRight

Labels + CSV-Header:
- web/beltReportScreen: Altersgruppe -> Geschlecht
- web/trialReportScreen: Altersgruppe -> Geschlecht
- web/reporting: attendanceCsv/trialCsv/beltReportCsv Altersgruppe -> Geschlecht, Geburtsjahr -> Geburtsdatum

Test-Korrekturen:
- workflow.test.ts: validateBeltChange GRUEN/7. Kyu -> BLAU/6. Kyu (Katalogkonsistenz)
- workflow.test.ts: createBeltHistoryEntry ORANGE/8. Kyu -> GRUEN/7. Kyu
- workflow.test.ts: suggestNextBelt WEISS/10. Kyu -> WEISS_ROT (neuer Katalog)
- workflow.test.ts: calculateBeltDistribution toHaveLength(7) -> (12) (Halbguertel)
- reporting.test.ts: CSV-Header-Test Altersgruppe -> Geschlecht

Mockdaten-Korrekturen:
- mockData: beltHistory Grades an neuen Katalog angepasst (GRUEN=7.Kyu, BLAU=6.Kyu, ORANGE=8.Kyu, GELB=9.Kyu)"
  if ($LASTEXITCODE -ne 0) { Write-Error "Commit fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }
} else {
  Write-Host "==> Nichts zu committen, Branch bereits aktuell."
}

Write-Host "==> Push Branch..."
git push -u origin $branch
if ($LASTEXITCODE -ne 0) { Write-Error "Push fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host ""
Write-Host "==> Fertig! Branch '$branch' gepusht."
Write-Host "==> CI laeuft unter: https://github.com/AndreiWilke/vtkb-anwesenheitssystem/actions"
