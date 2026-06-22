# =============================================================================
# git_catchup_paket12.ps1
#
# Nachtraeglicher Catch-up-Commit fuer alle Paket-1.2-Dateien die nie committed
# wurden: neue Dateien (trial.ts, person.ts, trialWorkflow.ts, Tests, Docs)
# sowie modifizierte Dateien (domain.ts, workflow.ts, components.tsx etc.).
# Ebenfalls enthalten: hasContract-Fix aus dem Fehlerbericht.
#
# SICHERHEITSREGELN:
#   - Kein Force Push, kein Rebase von main, kein Merge
#   - Arbeite niemals direkt auf main
#   - Der Pull Request bleibt ein Entwurf. Nicht mergen.
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "==> Arbeitsverzeichnis: $RepoRoot" -ForegroundColor Cyan
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

if ($branch -eq "main") {
    Write-Error "ABBRUCH: Niemals direkt auf main committen!"
}

# Alle noch offenen Paket-1.2-Dateien (neu + modifiziert)
$allFiles = @(
    # Neue Dateien (untracked)
    "packages/shared/src/trial.ts",
    "packages/shared/src/person.ts",
    "packages/shared/test/trial.test.ts",
    "packages/shared/test/person.test.ts",
    "apps/web/src/trialWorkflow.ts",
    "docs/PACKAGE_1_2_REPORT.md",
    "scripts/git_package_1_2.ps1",
    "scripts/git_design_fixes.ps1",
    "scripts/git_bugfix_fehlerbericht.ps1",
    # Modifizierte bestehende Dateien
    "PROJECT_RULES.md",
    "README.md",
    "apps/web/README.md",
    "apps/web/public/icon.svg",
    "apps/web/src/App.test.tsx",
    "apps/web/src/components.tsx",
    "apps/web/src/reporting.test.ts",
    "apps/web/src/reportingMockData.ts",
    "apps/web/src/reportingScreens.tsx",
    "apps/web/src/workflow.ts",
    "apps/web/vite.config.ts",
    "docs/PACKAGE_1_1_REPORT.md",
    "package-lock.json",
    "packages/shared/src/domain.ts",
    "scripts/package1-browser-qa.mjs",
    "vitest.config.ts"
)

$staged = 0
foreach ($file in $allFiles) {
    if (Test-Path $file) {
        $status = git status --porcelain $file
        if ($status -and $status.Trim()) {
            git add $file
            Write-Host "==> Staged: $file" -ForegroundColor Gray
            $staged++
        }
    }
}

if ($staged -eq 0) {
    Write-Host "==> Nichts zu committen – alles bereits committed." -ForegroundColor Yellow
    exit 0
}

git commit -m "feat: add package 1.2 trial management and domain model (catch-up commit)

Paket-1.2-Dateien wurden bisher nie committed (Skript war nicht ausgefuehrt).
Nachtraeglicher Commit auf dem aktuellen Branch fuer vollstaendige Git-Historie.

Neue Dateien:
  packages/shared/src/trial.ts
    - TrialEligibilityInput/Result, checkTrialEligibility (4-Einheiten-Regel)
    - canTransitionContract, grantBoardOverride (Vorstandsausnahme)
    - createTrialParticipantIdGenerator
    - fix: redundante MEMBERSHIP_ACTIVATED-Pruefung in hasContract entfernt
  packages/shared/src/person.ts
    - normalizeName (Umlaut-Normalisierung), checkForDuplicates
    - createPersonIdGenerator, createMemberNumberGenerator
  packages/shared/test/trial.test.ts  (34 Unit-Tests)
  packages/shared/test/person.test.ts (14 Unit-Tests)
  apps/web/src/trialWorkflow.ts
    - computeTrialSessionCount, getTrialWarning, buildNewTrialParticipant
    - blockedTrialParticipantsInSession, ageGroupLabel, contractStatusLabel

Modifizierte Dateien:
  packages/shared/src/domain.ts
    - PersonMembershipStatus, ContractStatus, TrialOverrideStatus
    - BeltChangeSource, BeltSuggestionStatus
    - TrialParticipant, BeltHistoryEntry, BeltSuggestion
    - DemoRole.ASSISTANT_TRAINER als 4. Demo-Rolle
  apps/web/src/workflow.ts
    - canCompleteSession: blockiert gesperrte Probetrainingsteilnehmer
  apps/web/src/components.tsx
    - Paket-1.2 UI-Komponenten
  apps/web/src/reportingScreens.tsx
    - buildTrialSummaries, trialDashboardMetrics, trialCsv integriert
  apps/web/src/App.test.tsx
    - Erweiterte Tests fuer Paket-1.2-Funktionalitaet
  vitest.config.ts, vite.config.ts, package-lock.json
    - Konfigurationsanpassungen fuer Paket 1.2
  PROJECT_RULES.md, README.md, docs/
    - Dokumentation aktualisiert
  scripts/
    - git_package_1_2.ps1, git_design_fixes.ps1, git_bugfix_fehlerbericht.ps1"

Write-Host ""
Write-Host "==> Catch-up-Commit erstellt. Jetzt pushen:" -ForegroundColor Green
Write-Host "    git push" -ForegroundColor Cyan
