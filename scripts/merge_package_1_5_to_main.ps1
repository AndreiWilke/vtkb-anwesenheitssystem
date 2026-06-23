$ErrorActionPreference = "Continue"
Set-Location "D:\Anwesenheit"
$feature = "feature/package-1-5-belt-gender-updates"

Write-Host "==> Wechsle auf main..."
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Error "Checkout main fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host "==> Aktualisiere main von origin..."
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Pull fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host "==> Merge $feature -> main..."
git merge --no-ff $feature -m "feat: merge Paket 1.5 (Halbguertel, gender/birthDate, mobile UI-Fixes)"
if ($LASTEXITCODE -ne 0) { Write-Error "Merge fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host "==> Push main..."
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Push fehlgeschlagen (Exit $LASTEXITCODE)"; exit 1 }

Write-Host ""
Write-Host "==> Fertig! main gepusht, CI/CD deployt jetzt."
Write-Host "==> Status: https://github.com/AndreiWilke/vtkb-anwesenheitssystem/actions"
Write-Host "==> Live-URL: https://andreiwilke.github.io/vtkb-anwesenheitssystem/"
