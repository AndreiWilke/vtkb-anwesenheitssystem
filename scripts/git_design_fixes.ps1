# =============================================================================
# git_design_fixes.ps1
#
# Design-Verbesserungen auf dem aktuellen Branch committen.
# Kein Branch-Wechsel, kein PR – nur ein sauberer Commit on top.
#
# SICHERHEITSREGELN:
#   - Kein Force Push, kein Rebase von main, kein Merge
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot

Write-Host "==> Arbeitsverzeichnis: $RepoRoot" -ForegroundColor Cyan
Write-Host "==> Branch: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Cyan

$file = "apps/web/src/styles.css"

if (-not (git status --porcelain $file).Trim()) {
    Write-Host "==> Keine Aenderungen in styles.css – nichts zu committen." -ForegroundColor Yellow
    exit 0
}

git add $file

git commit -m "style: unify button system, fix h2 size, consolidate notices

Button-System:
  - .btn als kanonische Basis (display:flex, padding, border-radius,
    font-weight, transitions)
  - .btn--primary / .btn--secondary / .btn--danger als Farbmodifier
  - .btn-primary / .btn-secondary als direkte Aliase (TrialScreens)
  - .btn-sm als Größenmodifier (min-height 34px)
  - .btn-back fuer Zurück-Navigation
  - .primary-button / .secondary-button behalten volle Breite (alte Screens)
  - Doppelte .btn-sm- und .btn--danger-Definitionen entfernt

Typografie:
  - h2: 1.08rem → 1.35rem (war zu klein als Screen-Überschrift)

Notice-Boxen:
  - .notice als gemeinsame Basis mit border + padding
  - .notice--success / --info / --warn / --error kanonisch definiert
  - Doppelte Definitionen aus Paket-1.4-Abschnitt entfernt
  - --info jetzt einheitlich blau (vorher grau/muted)
  - --warn Text auf #7c4200 (besser lesbarer Kontrast auf gelbem BG)

Barrierefreiheit:
  - @media (prefers-reduced-motion: reduce) hinzugefuegt"

Write-Host ""
Write-Host "==> Commit erstellt. Jetzt pushen:" -ForegroundColor Green
Write-Host "    git push" -ForegroundColor Cyan
