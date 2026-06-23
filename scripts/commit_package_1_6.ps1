$ErrorActionPreference = "Continue"
Set-Location "D:\Anwesenheit"
$branch = "feature/package-1-6-gast-entfernt-retro-telefon"

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
  git commit -m "feat: Paket 1.6 – Gast entfernt, Nachtragserfassung, Telefon

Gaeste-Funktion entfernt:
- types: AppScreen GUESTS entfernt, RETRO_DATE_SELECT hinzugefuegt
- screens: Gaeste-Button aus ManualAttendanceScreen entfernt (guestCount/onGuests)
- App: GuestScreen-Import entfernt, addGuest-Funktion entfernt, GUESTS-Case entfernt
- App.test: Gaeste-Tests entfernt (Feature intentional entfernt)

Nachtragserfassung (vollstaendiger Workflow fuer vergangene Trainings):
- types: RETRO_DATE_SELECT AppScreen
- screens: RetroDateSelectScreen (Datumsauswahl + Validierung)
- screens: SessionSelectScreen zeigt Nachtrag-Banner wenn retroDate gesetzt
- screens: ManagementScreen mit neuem 'Nachtrag erfassen' Button (History-Icon)
- App: retroDate-State, sessions useMemo mit retroDate-Datum
- App: RETRO_DATE_SELECT-Case verdrahtet, CompleteScreen resettet retroDate
- App: SESSION_SELECT Zurueck-Navigation retro-aware

Telefonnummer in Formulare:
- trialScreens: TrialNewScreen – contactPhone in Personalien-Fieldset verschoben
- trialScreens: DirectMemberNewScreen – contactPhone-Feld hinzugefuegt

Test-Korrekturen (shared/belt.test.ts – Katalog-Konsistenz):
- BELT_CATALOG Laenge: 12 -> 18 (inkl. Halbguertel und mehrere Braun/Schwarz-Grade)
- gradesForColor WEISS: '9. Kyu' -> '10. Kyu'
- gradesForColor BRAUN: 4 -> 5 Grade
- validateBeltChange Basis: GRUEN/6.Kyu->BLAU/5.Kyu -> GRUEN/7.Kyu->BLAU/6.Kyu
- suggestNextBelt: WEISS/9.Kyu->GELB -> WEISS/10.Kyu->WEISS_ROT
- calculateBeltDistribution: 7 Farben -> 12 Farben"
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
