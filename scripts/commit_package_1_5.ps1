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
  git commit -m "fix: TypeScript-Fehler + UI-Verbesserungen (Paket 1.5)

- shared/belt: effectiveFrom per conditional spread (exactOptionalPropertyTypes)
- web/components: beltLabels Record um alle 5 Halbguertel-Farben erweitert
- web/beltScreens + beltReportScreen: .sort() mit (x ?? '') fuer optionales effectiveFrom
- web/reporting: beltReportCsv-Signatur effectiveFrom optional; sort + set mit ??
- web/styles: CSS-Klassen fuer Halbguertel-Dots (belt-weiss_rot etc.) + belt-history-card Layout
- web/beltScreens: Guertelhistorie als vertikale Card-Liste statt breite Tabelle (Mobile-fix)"
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
