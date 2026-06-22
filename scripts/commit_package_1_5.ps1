$ErrorActionPreference = "Continue"
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
  git commit -m "feat: Halbguertel, gender/birthDate, mobile UI-Fixes (Paket 1.5)

- shared/belt: BELT_CATALOG auf 18 Eintraege erweitert (Halbguertel 9a-5a Kyu)
- shared/domain: TrialParticipant.ageGroup/birthYear -> gender/birthDate
- web/beltScreens: BeltChangeDialog vereinfacht (1 Selektor, Gueltig-ab optional)
- web/trialScreens: TrialNew + DirectMemberNew auf gender/birthDate umgestellt
- web/screens: Altersgruppe-Filter -> Geschlecht-Filter; session-option Bug-Fix
- web/styles: Bottom-Nav 4->5 Spalten; table-scroll overflow-x fuer Mobile
- web/reporting: ReportingFilters.ageGroup -> gender"
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
