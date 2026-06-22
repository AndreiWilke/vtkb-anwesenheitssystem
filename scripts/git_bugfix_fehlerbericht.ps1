# =============================================================================
# git_bugfix_fehlerbericht.ps1
#
# Commit fuer die drei echten Bugs aus dem externen Fehlerbericht (Paket 1.2-1.4).
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
    Write-Error "ABBRUCH: Niemals direkt auf main commiten!"
}

# Zu patchende Dateien
$files = @(
    "apps/web/src/App.tsx",
    "apps/web/src/beltScreens.tsx",
    "apps/web/src/screens.tsx"
)

# Pruefen ob Aenderungen vorhanden
$changed = $false
foreach ($file in $files) {
    $status = git status --porcelain $file
    if ($status.Trim()) {
        $changed = $true
        break
    }
}

if (-not $changed) {
    Write-Host "==> Keine Aenderungen in den Bugfix-Dateien – nichts zu committen." -ForegroundColor Yellow
    exit 0
}

foreach ($file in $files) {
    $status = git status --porcelain $file
    if ($status.Trim()) {
        git add $file
        Write-Host "==> Staged: $file" -ForegroundColor Gray
    }
}

git commit -m "fix: drei Bugs aus externem Fehlerbericht (Paket 1.2-1.4)

Analyse: 10 Findings geprueft. 3 echte Bugs, 7 Fehlbewertungen / Design-Entscheidungen.

Bug 1 (5.1): TypeScript-Feldnamenfehler in beltScreens.tsx
  - simulateBeltColorSuggestion gibt { suggestedColor, confidencePercent } zurueck
  - useState-Typ war { color, confidence } -> TypeScript-Fehler beim Compilieren
  - Fix: useState-Typ auf { suggestedColor, confidencePercent } korrigiert
  - Alle drei Verwendungsstellen (State, Display, handleCreateSuggestion) angepasst

Bug 2 (4.3): PROBETRAINING-Option im Gast-Dialog
  - screens.tsx Zeile 561: <option value=""PROBETRAINING""> war noch vorhanden
  - Paket 1.2 hatte GuestKind auf nur ""GAST"" beschraenkt, aber diese Option
    wurde versehentlich nicht entfernt
  - Fix: Option entfernt; nur noch value=""GAST"" vorhanden

Bug 3 (4.1): Alle neuen Screens fehlten in App.tsx
  - Keiner der Paket-1.2/1.3/1.4-Screens war im Switch-Case von App.tsx verdrahtet
  - TRIAL_LIST, TRIAL_NEW, TRIAL_PROFILE, TRIAL_CONTRACT, TRIAL_BOARD_OVERRIDE,
    TRIAL_CONVERT, TRIAL_REPORT, MEMBER_DIRECT_NEW,
    BELT_SUGGESTION_REVIEW, BELT_HISTORY, BELT_CHANGE, BELT_REPORT, BELT_SIM_DEMO
    waren alle unerreichbar
  - Fix: App.tsx vollstaendig neu strukturiert mit
      * Imports fuer trialScreens, trialReportScreen, beltScreens, beltReportScreen
      * State fuer trialParticipants, members (erweiterbar), beltHistory, beltSuggestions,
        selectedTrialId, selectedBeltMemberId, auditEntries
      * Switch-Cases fuer alle 13 neuen Screens mit korrekter Navigation und State-Uebergabe
      * BeltChangeDialog im BELT_CHANGE-Case direkt verdrahtet (nicht als Side-Effect)

Als Fehlbewertung eingestuft (kein Fix noetig):
  - 4.6: convertTrialParticipantToMember existiert als atomare Funktion
  - 4.7: PersonId geht nicht verloren (memberId ist zusaetzliches Feld, nicht Ersatz)
  - 4.5: Override-Logik korrekt (bool reicht fuer genau eine Ausnahme)
  - 4.2, 4.4, 4.8, 4.9, 4.10, 5.2-5.4, 6-9: Prototyp-Design-Entscheidungen / Paket-2-Scope"

Write-Host ""
Write-Host "==> Commit erstellt. Jetzt pushen:" -ForegroundColor Green
Write-Host "    git push" -ForegroundColor Cyan
