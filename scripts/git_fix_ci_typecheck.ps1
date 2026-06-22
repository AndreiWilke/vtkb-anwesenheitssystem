Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan

git add `
    packages/shared/test/trial.test.ts `
    packages/shared/src/belt.ts `
    packages/shared/src/conversion.ts

git commit -m "fix: resolve exactOptionalPropertyTypes TS errors caught by CI

Drei Dateien verletzten exactOptionalPropertyTypes=true (tsconfig shared):

  trial.test.ts
    - trialRecord()-Helper: membershipStatusAtTime-Override-Typ von
      'string' auf 'PersonMembershipStatus' geaendert (6 Fehler)

  belt.ts
    - createBeltHistoryEntry: examDate/examiner/note als bedingter
      Spread statt direkte Zuweisung von string|undefined
    - applyBeltSuggestionDecision: historyEntryId als bedingter Spread

  conversion.ts
    - convertTrialParticipantToMember: note als bedingter Spread nach
      combinedNote-Berechnung
    - createDirectMember: note als bedingter Spread"

git push
Write-Host "==> Fertig – CI-Workflow startet automatisch." -ForegroundColor Green
