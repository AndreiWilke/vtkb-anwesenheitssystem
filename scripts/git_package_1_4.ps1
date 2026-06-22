# =============================================================================
# git_package_1_4.ps1
#
# Branch feature/package-1-4-belt-management anlegen,
# alle Paket-1.4-Dateien committen, pushen, Draft-PR erstellen.
#
# VORAUSSETZUNGEN:
#   - git und gh (GitHub CLI) im PATH
#   - gh auth login ausgefuehrt
#   - Aktives Verzeichnis: Repo-Root
#   - Paket-1.3-Branch wurde bereits gepusht (chained PRs)
#
# SICHERHEITSREGELN:
#   - Kein Force Push, kein Rebase von main, kein Merge
#   - PR bleibt DRAFT
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "==> Arbeitsverzeichnis: $RepoRoot" -ForegroundColor Cyan

$branch = "feature/package-1-4-belt-management"
$baseBranch = "feature/package-1-3-conversion-members"
$currentBranch = git rev-parse --abbrev-ref HEAD

# Branch anlegen von Paket-1.3-Branch aus
$existingBranch = git branch --list $branch
if ($existingBranch) {
    Write-Host "==> Branch '$branch' existiert bereits – wechsle dorthin." -ForegroundColor Yellow
    git checkout $branch
} else {
    # Sicherstellen, dass wir auf dem richtigen Basis-Branch sind
    if ($currentBranch -ne $baseBranch) {
        Write-Host "==> Wechsle zu '$baseBranch' als Basis." -ForegroundColor Cyan
        git checkout $baseBranch
    }
    Write-Host "==> Erstelle Branch '$branch' von '$baseBranch'." -ForegroundColor Cyan
    git checkout -b $branch
}

# -----------------------------------------------------------------------------
# Commit 1: Shared Belt-Erweiterung + Tests
# -----------------------------------------------------------------------------
$sharedFiles = @(
    "packages/shared/src/belt.ts",
    "packages/shared/test/belt.test.ts"
)

$hasShared = $false
foreach ($f in $sharedFiles) {
    if ((git status --porcelain $f).Trim()) { $hasShared = $true; break }
}

if ($hasShared) {
    Write-Host "==> Commit 1: Shared Belt-Erweiterung + Tests" -ForegroundColor Cyan
    foreach ($f in $sharedFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "feat(shared): add package 1.4 belt validation and reporting

- belt.ts: +validateBeltChange, suggestNextBelt, BeltExamHint,
  calculateBeltDistribution, simulateBeltColorSuggestion (demo-only)
- belt.test.ts: 36 unit tests for catalog, validation, exam hints,
  distribution, simulation, id generator
PROJECT_RULES: image analysis never determines grade (invariant)"
}

# -----------------------------------------------------------------------------
# Commit 2: Web-App – Belt-Screens + Gürtelauswertung
# -----------------------------------------------------------------------------
$screenFiles = @(
    "apps/web/src/beltScreens.tsx",
    "apps/web/src/beltReportScreen.tsx"
)

$hasScreens = $false
foreach ($f in $screenFiles) {
    if ((git status --porcelain $f).Trim()) { $hasScreens = $true; break }
}

if ($hasScreens) {
    Write-Host "==> Commit 2: Belt-Screens + Auswertung" -ForegroundColor Cyan
    foreach ($f in $screenFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "feat(web): add package 1.4 belt screens and report

- beltScreens.tsx: BeltHistoryScreen, BeltChangeDialog,
  BeltSuggestionReviewScreen, BeltSimulationDemoScreen
- beltReportScreen.tsx: distribution bar chart, exam hints,
  filter modes, CSV export
RULE: suggested color pre-fills dialog, grade always manual"
}

# -----------------------------------------------------------------------------
# Commit 3: Typen + Reporting + Mockdaten + Tests + CSS
# -----------------------------------------------------------------------------
$webFiles = @(
    "apps/web/src/types.ts",
    "apps/web/src/reporting.ts",
    "apps/web/src/mockData.ts",
    "apps/web/src/workflow.test.ts",
    "apps/web/src/styles.css"
)

$hasWeb = $false
foreach ($f in $webFiles) {
    if ((git status --porcelain $f).Trim()) { $hasWeb = $true; break }
}

if ($hasWeb) {
    Write-Host "==> Commit 3: Typen, Reporting, Mockdaten, Tests, CSS" -ForegroundColor Cyan
    foreach ($f in $webFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "feat(web): add package 1.4 types, reporting, mock data and tests

- types.ts: +BELT_HISTORY, BELT_CHANGE, BELT_REPORT, BELT_SIM_DEMO screens
  +BELT_REPORT, BELT_HISTORY_DETAIL reporting views
- reporting.ts: +beltReportCsv
- mockData.ts: +beltHistoryExtended (3 fictional belt changes)
- workflow.test.ts: +8 Paket-1.4 tests (catalog, validation, hints,
  distribution, suggestions)
- styles.css: +belt-badge, belt-bar, dialog-overlay, dialog-box,
  notice variants, btn--danger"
}

# -----------------------------------------------------------------------------
# Commit 4: Dokumentation
# -----------------------------------------------------------------------------
$docsFiles = @(
    "docs/PACKAGE_1_4_REPORT.md",
    "scripts/git_package_1_4.ps1"
)

$hasDocs = $false
foreach ($f in $docsFiles) {
    if ((git status --porcelain $f).Trim()) { $hasDocs = $true; break }
}

if ($hasDocs) {
    Write-Host "==> Commit 4: Dokumentation" -ForegroundColor Cyan
    foreach ($f in $docsFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "docs: add package 1.4 report and git helper script"
}

# -----------------------------------------------------------------------------
# Push
# -----------------------------------------------------------------------------
Write-Host "==> Push nach origin/$branch" -ForegroundColor Cyan
git push --set-upstream origin $branch

# -----------------------------------------------------------------------------
# Draft-PR
# -----------------------------------------------------------------------------
Write-Host "==> Erstelle Draft-PR..." -ForegroundColor Cyan

$prBody = @"
## Paket 1.4 – Gürtelverwaltung, Gürtelhistorie, simulierter Bildvorschlag, Gürtelauswertung

### Enthaltene Änderungen

**Shared (`packages/shared`)**
- `belt.ts`: `validateBeltChange`, `suggestNextBelt`, `BeltExamHint`,
  `calculateBeltDistribution`, `simulateBeltColorSuggestion` (Demo-only)
- `belt.test.ts`: 36 Unit-Tests

**Web App (`apps/web`)**
- `beltScreens.tsx`: `BeltHistoryScreen`, `BeltChangeDialog`,
  `BeltSuggestionReviewScreen`, `BeltSimulationDemoScreen`
- `beltReportScreen.tsx`: Verteilungsdiagramm, Prüfungshinweise, CSV-Export
- `beltHistoryExtended`: 3 fiktive Gürteländerungen
- 8 neue Workflow-Tests

### Fachregeln (Auszug)
- Bildanalyse bestimmt NIEMALS Kyu-/Dan-Grad (PROJECT_RULES invariant)
- Ohne manuelle Bestätigung keine Gürteländerung
- Jede bestätigte Änderung → unveränderlicher BeltHistoryEntry
- Simulation = deterministischer Zufallsgenerator, kein echtes Modell

**⚠ DRAFT – Nicht mergen. Paket 2 mit AWS/DB erfordert separate Freigabe.**
"@

gh pr create `
    --title "feat: add package 1.4 belt management history and reporting" `
    --body $prBody `
    --base "feature/package-1-3-conversion-members" `
    --head $branch `
    --draft

Write-Host ""
Write-Host "==> Fertig! Draft-PR angelegt." -ForegroundColor Green
Write-Host "    Branch: $branch" -ForegroundColor Green
