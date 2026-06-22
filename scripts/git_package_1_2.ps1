# =============================================================================
# git_package_1_2.ps1
#
# Erstellt Branch, commitet Optimierungen (falls noch ausstehend) und alle
# Paket-1.2-Dateien, pusht und legt einen Draft-PR an.
#
# VORAUSSETZUNGEN:
#   - Git installiert und im PATH
#   - GitHub CLI (gh) installiert und authentifiziert: gh auth login
#   - Aktives Verzeichnis: Repo-Root (C:\...\VTKB\Anwesenheit)
#
# SICHERHEITSREGELN:
#   - Kein Force Push, kein Rebase von main, kein Merge
#   - Der PR bleibt ein DRAFT. Nicht mergen.
#   - Keine Produktiv- oder Kostenpflichtigen Aktionen.
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "==> Arbeitsverzeichnis: $RepoRoot" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Sicherstellen, dass wir auf main sind
# -----------------------------------------------------------------------------
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "main") {
    Write-Warning "Aktueller Branch ist '$currentBranch', nicht 'main'. Bitte zuerst auf main wechseln."
    exit 1
}

# -----------------------------------------------------------------------------
# 2. Branch erstellen
# -----------------------------------------------------------------------------
$branch = "feature/package-1-2-members-trials-belts"

$existingBranch = git branch --list $branch
if ($existingBranch) {
    Write-Host "==> Branch '$branch' existiert bereits – wechsle dorthin." -ForegroundColor Yellow
    git checkout $branch
} else {
    Write-Host "==> Erstelle Branch '$branch' von main." -ForegroundColor Cyan
    git checkout -b $branch
}

# -----------------------------------------------------------------------------
# 3. Commit 1: Paket-1.1-Optimierungen (falls noch nicht committed)
# -----------------------------------------------------------------------------
$optimizationFiles = @(
    "apps/web/src/App.tsx",
    "apps/web/src/reporting.ts",
    "apps/web/src/workflow.ts",
    "apps/web/vite.config.ts",
    "vitest.config.ts"
)

$hasOptimizationChanges = $false
foreach ($f in $optimizationFiles) {
    $status = git status --porcelain $f
    if ($status) { $hasOptimizationChanges = $true; break }
}

if ($hasOptimizationChanges) {
    Write-Host "==> Commit 1: Optimierungen (Paket 1.1)" -ForegroundColor Cyan
    foreach ($f in $optimizationFiles) {
        if (Test-Path $f) { git add $f }
    }
    git commit -m "refactor: apply package 1.1 optimizations

- Fix double suggestSession() call in App.tsx
- Replace flatMap filter-antipattern with filter().map() in presentMemberIds
- Remove double COMPLETED filter in calculateDashboardMetrics
- Consolidate settlement reduce loop
- Fix PWA icon purpose (any maskable -> any)"
} else {
    Write-Host "==> Keine ausstehenden Optimierungs-Aenderungen." -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 4. Commit 2: PROJECT_RULES.md
# -----------------------------------------------------------------------------
$rulesStatus = git status --porcelain "PROJECT_RULES.md"
if ($rulesStatus) {
    Write-Host "==> Commit 2: PROJECT_RULES.md" -ForegroundColor Cyan
    git add PROJECT_RULES.md
    git commit -m "docs: add package 1.2 project rules

- Belt image analysis: color hint only, never grade
- TrialParticipant model: permanent profile, not a day guest
- 4-session limit from history, not mutable field
- GuestKind.PROBETRAINING deprecated
- Board override: exactly one additional session with reason
- Belt change: always immutable BeltHistoryEntry"
}

# -----------------------------------------------------------------------------
# 5. Commit 3: Shared Domain-Typen
# -----------------------------------------------------------------------------
$sharedFiles = @(
    "packages/shared/src/domain.ts",
    "packages/shared/src/trial.ts",
    "packages/shared/src/person.ts",
    "packages/shared/src/belt.ts",
    "packages/shared/src/index.ts",
    "packages/shared/test/trial.test.ts",
    "packages/shared/test/person.test.ts"
)

$hasSharedChanges = $false
foreach ($f in $sharedFiles) {
    $status = git status --porcelain $f
    if ($status) { $hasSharedChanges = $true; break }
}

if ($hasSharedChanges) {
    Write-Host "==> Commit 3: Shared Domain-Typen, trial.ts, person.ts, belt.ts" -ForegroundColor Cyan
    foreach ($f in $sharedFiles) {
        if (Test-Path $f) { git add $f }
    }
    git commit -m "feat(shared): add package 1.2 domain types and business logic

- domain.ts: PersonMembershipStatus, ContractStatus, TrialOverrideStatus,
  BeltChangeSource, BeltSuggestionStatus, DemoRole.ASSISTANT_TRAINER,
  TrialParticipant, BeltHistoryEntry, BeltSuggestion
- trial.ts: countTrialSessionsAttended, checkTrialEligibility,
  canTransitionContract, useTrialOverride, createTrialParticipantIdGenerator
- person.ts: normalizeName, checkForDuplicates, createPersonIdGenerator,
  createMemberNumberGenerator
- belt.ts: BELT_CATALOG, createBeltHistoryEntry, applyBeltSuggestionDecision,
  openBeltSuggestions, createBeltHistoryIdGenerator
- index.ts: re-export trial, person, belt
- trial.test.ts: 30 unit tests
- person.test.ts: 12 unit tests"
}

# -----------------------------------------------------------------------------
# 6. Commit 4: Web-App (Typen, Workflow, Screens, Tests, CSS, Reporting)
# -----------------------------------------------------------------------------
$webFiles = @(
    "apps/web/src/types.ts",
    "apps/web/src/trialWorkflow.ts",
    "apps/web/src/trialScreens.tsx",
    "apps/web/src/workflow.ts",
    "apps/web/src/workflow.test.ts",
    "apps/web/src/reporting.ts",
    "apps/web/src/styles.css",
    "apps/web/src/mockData.ts"
)

$hasWebChanges = $false
foreach ($f in $webFiles) {
    $status = git status --porcelain $f
    if ($status) { $hasWebChanges = $true; break }
}

if ($hasWebChanges) {
    Write-Host "==> Commit 4: Web-App – Typen, Workflow, Screens, Reporting, CSS" -ForegroundColor Cyan
    foreach ($f in $webFiles) {
        if (Test-Path $f) { git add $f }
    }
    git commit -m "feat(web): add package 1.2 trial workflow, screens and reporting

- types.ts: GuestKind = 'GAST' only, new AppScreens (TRIAL_LIST/NEW/PROFILE/CONTRACT,
  BELT_SUGGESTION_REVIEW), re-export shared p1.2 types
- trialWorkflow.ts: computeTrialSessionCount, blockedTrialParticipantsInSession,
  buildNewTrialParticipant, getTrialWarning
- trialScreens.tsx: TrialListScreen, TrialNewScreen, TrialProfileScreen,
  TrialContractScreen
- workflow.ts: canCompleteSession accepts optional blockedTrialParticipants
- workflow.test.ts: +5 trial-specific tests
- reporting.ts: buildTrialSummaries, trialDashboardMetrics, trialCsv
- styles.css: p1.2 CSS (.trial-list, .contract-steps, .progress-bar, .badge etc.)
- mockData.ts: 6 fictional TrialParticipants, belt history, belt suggestions"
}

# -----------------------------------------------------------------------------
# 7. Commit 5: Dokumentation
# -----------------------------------------------------------------------------
$docsFiles = @(
    "docs/PACKAGE_1_2_REPORT.md",
    "scripts/git_package_1_2.ps1"
)

$hasDocsChanges = $false
foreach ($f in $docsFiles) {
    $status = git status --porcelain $f
    if ($status) { $hasDocsChanges = $true; break }
}

if ($hasDocsChanges) {
    Write-Host "==> Commit 5: Dokumentation und Git-Skript" -ForegroundColor Cyan
    foreach ($f in $docsFiles) {
        if (Test-Path $f) { git add $f }
    }
    git commit -m "docs: add package 1.2 report and git helper script"
}

# -----------------------------------------------------------------------------
# 8. Push
# -----------------------------------------------------------------------------
Write-Host "==> Push nach origin/$branch" -ForegroundColor Cyan
git push --set-upstream origin $branch

# -----------------------------------------------------------------------------
# 9. Draft-PR anlegen (GitHub CLI)
# -----------------------------------------------------------------------------
Write-Host "==> Erstelle Draft-PR..." -ForegroundColor Cyan

$prTitle = "feat: add package 1.2 members trials and belt management"
$prBody = @"
## Paket 1.2 – Personenmodell, Probetraining, Gürtelverwaltung

### Enthaltene Änderungen

**Shared (`packages/shared`)**
- Neue Enums: `PersonMembershipStatus`, `ContractStatus`, `TrialOverrideStatus`, `BeltChangeSource`, `BeltSuggestionStatus`
- Neues Interface: `TrialParticipant`, `BeltHistoryEntry`, `BeltSuggestion`
- `DemoRole.ASSISTANT_TRAINER` als 4. Demo-Rolle
- `trial.ts`: Probetraining-Kernlogik (Zählung, Sperre, Vertragsstatus-Übergänge)
- `person.ts`: Normalisierung, Dubletten-Check, ID-Generatoren
- `belt.ts`: Demo-Gürteldaten, Historieneinträge, Bildvorschlag-Entscheidungen

**Web App (`apps/web`)**
- `GuestKind` auf `"GAST"` reduziert (PROBETRAINING → TrialParticipant)
- 5 neue AppScreens: TRIAL_LIST, TRIAL_NEW, TRIAL_PROFILE, TRIAL_CONTRACT, BELT_SUGGESTION_REVIEW
- `trialWorkflow.ts`: App-seitige Trial-Logik
- `trialScreens.tsx`: 4 neue Screens (Liste, Neuanlage, Profil, Vertrag)
- `canCompleteSession` blockiert bei gesperrten Probetrainingsteilnehmern
- Reporting: `buildTrialSummaries`, `trialDashboardMetrics`, `trialCsv`
- CSS: Probetraining-spezifische Styles

### Tests
- 30 Unit-Tests (trial.test.ts)
- 12 Unit-Tests (person.test.ts)
- 5 neue Workflow-Tests

### Sicherheitshinweise
- Alle Demo-Daten sind ausschließlich fiktiv
- Keine Echtdaten, keine Kinderbilder, keine biometrischen Daten
- Bildanalyse: nur Farbhinweis, kein Grad

**⚠ DRAFT – Nicht mergen bis Paket 1.3 abgeschlossen.**
"@

gh pr create `
    --title $prTitle `
    --body $prBody `
    --base main `
    --head $branch `
    --draft

Write-Host ""
Write-Host "==> Fertig! Draft-PR wurde angelegt." -ForegroundColor Green
Write-Host "    Branch: $branch" -ForegroundColor Green
Write-Host "    Bitte auf GitHub pruefen: https://github.com/AndreiWilke/vtkb-anwesenheitssystem/pulls" -ForegroundColor Green
