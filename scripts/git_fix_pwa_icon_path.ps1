Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $RepoRoot
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "main") { Write-Error "ABBRUCH: Niemals direkt auf main committen!" }
Write-Host "==> Branch: $branch" -ForegroundColor Cyan
git add apps/web/vite.config.ts
git commit -m "fix: use relative icon path in PWA manifest for GitHub Pages subpath

/icon.svg ist ein absoluter Pfad und zeigt auf andreiwilke.github.io/icon.svg
statt auf andreiwilke.github.io/vtkb-anwesenheitssystem/icon.svg.
Geaendert zu 'icon.svg' (relativ zur base-URL)."
git push
Write-Host "==> Fertig." -ForegroundColor Green
