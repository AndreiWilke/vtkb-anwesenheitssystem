# =============================================================================
# git_package_1_3.ps1
#
# Branch feature/package-1-3-conversion-members anlegen,
# alle Paket-1.3-Dateien committen, pushen, Draft-PR erstellen.
#
# VORAUSSETZUNGEN:
#   - git und gh (GitHub CLI) im PATH
#   - gh auth login ausgefuehrt
#   - Aktives Verzeichnis: Repo-Root
#   - Paket-1.2-Branch wurde bereits gemergt ODER dieses Skript
#     wird auf Basis von feature/package-1-2-... ausgefuehrt
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

$branch = "feature/package-1-3-conversion-members"
$currentBranch = git rev-parse --abbrev-ref HEAD

# Branch anlegen (von aktuellem Branch, typisch: p1.2-Branch oder main)
$existingBranch = git branch --list $branch
if ($existingBranch) {
    Write-Host "==> Branch '$branch' existiert bereits – wechsle dorthin." -ForegroundColor Yellow
    git checkout $branch
} else {
    Write-Host "==> Erstelle Branch '$branch' von '$currentBranch'." -ForegroundColor Cyan
    git checkout -b $branch
}

# -----------------------------------------------------------------------------
# Commit 1: Shared Konvertierungslogik
# -----------------------------------------------------------------------------
$sharedFiles = @(
    "packages/shared/src/conversion.ts",
    "packages/shared/src/index.ts",
    "packages/shared/test/conversion.test.ts"
)

$hasShared = $false
foreach ($f in $sharedFiles) {
    if ((git status --porcelain $f).Trim()) { $hasShared = $true; break }
}

if ($hasShared) {
    Write-Host "==> Commit 1: Shared Konvertierungslogik" -ForegroundColor Cyan
    foreach ($f in $sharedFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "feat(shared): add package 1.3 conversion and board override logic

- conversion.ts: checkConversionEligibility, convertTrialParticipantToMember,
  createDirectMember, grantBoardOverride
- index.ts: re-export conversion.js
- conversion.test.ts: 24 unit tests (eligibility, conversion, direct, override)"
}

# -----------------------------------------------------------------------------
# Commit 2: Web-App – Typen, Screens, Report
# -----------------------------------------------------------------------------
$webFiles = @(
    "apps/web/src/types.ts",
    "apps/web/src/trialScreens.tsx",
    "apps/web/src/trialReportScreen.tsx",
    "apps/web/src/styles.css"
)

$hasWeb = $false
foreach ($f in $webFiles) {
    if ((git status --porcelain $f).Trim()) { $hasWeb = $true; break }
}

if ($hasWeb) {
    Write-Host "==> Commit 2: Web-App – Typen, Screens, Report, CSS" -ForegroundColor Cyan
    foreach ($f in $webFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "feat(web): add package 1.3 conversion screens and trial report

- types.ts: +AuditEntry, ConversionResult, DirectMemberResult re-exports;
  +TRIAL_CONVERT, TRIAL_BOARD_OVERRIDE, MEMBER_DIRECT_NEW, TRIAL_REPORT screens
- trialScreens.tsx: +BoardOverrideScreen, TrialConversionScreen,
  DirectMemberNewScreen
- trialReportScreen.tsx: TrialReportScreen with metrics, filter table, CSV export
- styles.css: +MetricCard, ReportTable, SearchInput, form-field--checkbox styles"
}

# -----------------------------------------------------------------------------
# Commit 3: Mockdaten + Tests
# -----------------------------------------------------------------------------
$testFiles = @(
    "apps/web/src/mockData.ts",
    "apps/web/src/workflow.test.ts"
)

$hasTests = $false
foreach ($f in $testFiles) {
    if ((git status --porcelain $f).Trim()) { $hasTests = $true; break }
}

if ($hasTests) {
    Write-Host "==> Commit 3: Mockdaten + Tests" -ForegroundColor Cyan
    foreach ($f in $testFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "test(web): add package 1.3 mock data and workflow tests

- mockData.ts: trial-005 converted to member-41; +demoAuditEntries (3 entries)
- workflow.test.ts: +7 tests for conversion, direct member, board override, audit"
}

# -----------------------------------------------------------------------------
# Commit 4: Dokumentation
# -----------------------------------------------------------------------------
$docsFiles = @(
    "docs/PACKAGE_1_3_REPORT.md",
    "scripts/git_package_1_3.ps1"
)

$hasDocs = $false
foreach ($f in $docsFiles) {
    if ((git status --porcelain $f).Trim()) { $hasDocs = $true; break }
}

if ($hasDocs) {
    Write-Host "==> Commit 4: Dokumentation" -ForegroundColor Cyan
    foreach ($f in $docsFiles) { if (Test-Path $f) { git add $f } }
    git commit -m "docs: add package 1.3 report and git helper script"
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
## Paket 1.3 – Umwandlung zum Mitglied, Direktanlage, Vorstandsausnahme, Auswertungen

### Enthaltene Änderungen

**Shared (`packages/shared`)**
- `conversion.ts`: `checkConversionEligibility`, `convertTrialParticipantToMember`,
  `createDirectMember`, `grantBoardOverride`
- 24 neue Unit-Tests (`conversion.test.ts`)

**Web App (`apps/web`)**
- 3 neue Screens: `BoardOverrideScreen`, `TrialConversionScreen`, `DirectMemberNewScreen`
- `TrialReportScreen`: Kennzahlen, Filtertabelle, CSV-Export
- `trial-005` als Demo-Konvertierung (`ACTIVE_MEMBER`, `memberId: member-41`)
- 3 fiktive `demoAuditEntries`
- 7 neue Workflow-Tests

### Fachregeln (Auszug)
- Umwandlung: `contractStatus >= RECEIVED`, vollständige Historienerhaltung
- Direktanlage: nur via Vorstand, ohne Probetraining-Vorgeschichte
- Vorstandsausnahme: 1x pro Person, Begründungspflicht, AuditEntry

**⚠ DRAFT – Nicht mergen bis Paket 1.4 abgeschlossen.**
"@

gh pr create `
    --title "feat: add package 1.3 trial conversion members and reporting" `
    --body $prBody `
    --base "feature/package-1-2-members-trials-belts" `
    --head $branch `
    --draft

Write-Host ""
Write-Host "==> Fertig! Draft-PR angelegt." -ForegroundColor Green
Write-Host "    Branch: $branch" -ForegroundColor Green
