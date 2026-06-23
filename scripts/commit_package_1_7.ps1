$ErrorActionPreference = "Continue"
Set-Location "D:\Anwesenheit"
$branch = "feature/package-1-7-redesign-guertelfarben"

$current = git branch --show-current
Write-Host "==> Aktueller Branch: $current"

if ($current -ne $branch) {
  Write-Host "==> Wechsle auf Branch: $branch"
  git checkout $branch 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Branch nicht vorhanden, erstelle neu von main..."
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
  git commit -m "feat: Paket 1.7 – Redesign Dojo-Aesthetik + neue Guertelfarben

Design-Redesign (styles.redesign.css aus Handoff):
- styles.css: Redesign-Token-Block + Klassen-Overrides angehaengt
  (--paper, --ink, --faint, --line-soft, --red-tint, --accent, --shadow-card)
- Typografie: IBM Plex Sans (UI), Spectral (Headings/Zahlen), IBM Plex Mono (Labels)
- index.html: Google Fonts (Spectral + IBM Plex Sans + IBM Plex Mono) eingebunden
- Header: Wellenmuster entfernt (background-image: none), Hoehe 58px, warmweiss
- Brand: VTKB Berlin jetzt in Tinte (nicht mehr rot), Monospace-Unterzeile
- Bottom-Nav: 2px roter Indikator oben bei aktivem Item (::before)
- Buttons: weicher roter Schatten, radius 13px, --red-tint Sekundaer
- Mitgliedszeile: --red-tint Hintergrund bei anwesend, inset Balken links
- Status-Tags: Indigo (--accent) statt Gruen fuer 'good' / 'Vorgeschlagen'
- Guertelbalken: rechteckig 18x8px, Radius 2px

Logo-Swap:
- components.tsx: ToriiMark-SVG ersetzt durch VTKBLogo.png (import.meta.env.BASE_URL)
- apps/web/public/VTKBLogo.png: Vereinslogo hinterlegt

Neue Guertelfarben (Vereinsordnung):
- belt.ts: WEISS_GELB (9b. Kyu) zwischen WEISS_ROT und GELB eingefuegt
- belt.ts: BRAUN 4. Kyu -> VIOLETT 4. Kyu
- belt.ts: BELT_CATALOG 18 -> 19 Eintraege, BELT_COLORS 12 -> 14 Farben
- types.ts (web): BeltColor um WEISS_GELB + VIOLETT erweitert
- components.tsx: beltLabels um 'Weiss-Gelb' + 'Violett' ergaenzt
- styles.css: .belt-weiss_gelb + .belt-violett CSS-Klassen (Farben aus Handoff)

Test-Korrekturen (shared/belt.test.ts):
- BELT_CATALOG Laenge: 18 -> 19
- gradesForColor BRAUN: 5 -> 4 Grade (4. Kyu jetzt VIOLETT)
- calculateBeltDistribution: 12 -> 14 Farben
- suggestNextBelt-Test: BRAUN '4. Kyu' -> VIOLETT '4. Kyu' -> BRAUN '3. Kyu'"
  if ($LASTEXITCODE -ne 0) { Write-Error "Commit fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }
} else {
  Write-Host "==> Nichts zu committen, Branch bereits aktuell."
}

Write-Host "==> Push Branch..."
git push -u origin $branch
if ($LASTEXITCODE -ne 0) { Write-Error "Push fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host ""
Write-Host "==> Fertig! Branch '$branch' gepusht."
Write-Host "==> Nach Pruefung: scripts\merge_package_1_7_to_main.ps1 ausfuehren"
Write-Host "==> CI: https://github.com/AndreiWilke/vtkb-anwesenheitssystem/actions"
