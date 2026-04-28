Set-Location "C:\Users\forea\Documents\foreandr.github.io"

Write-Host "`n=== KILLING ALL GIT PROCESSES ===" -ForegroundColor Yellow
Get-Process -Name "git","git-lfs","git-remote-https" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "`n=== DELETING LOCK FILES ===" -ForegroundColor Yellow
@(".git\index.lock",".git\HEAD.lock",".git\MERGE_HEAD",".git\CHERRY_PICK_HEAD") | ForEach-Object {
    if (Test-Path $_) { Remove-Item -Force $_ ; Write-Host "Deleted $_" }
}
Start-Sleep -Seconds 1

Write-Host "`n=== CREATING ORPHAN BRANCH (no LFS history) ===" -ForegroundColor Cyan
git branch -D fresh-main 2>$null
git checkout --orphan fresh-main
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED at checkout --orphan" -ForegroundColor Red; Read-Host; exit }

Write-Host "`n=== CLEARING INDEX ===" -ForegroundColor Cyan
git rm --cached -r . -q
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED at rm --cached" -ForegroundColor Red; Read-Host; exit }

Write-Host "`n=== STAGING FILES (LFS giants excluded by .gitignore) ===" -ForegroundColor Cyan
git add -A
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED at add -A" -ForegroundColor Red; Read-Host; exit }

Write-Host "`n=== COMMITTING ===" -ForegroundColor Cyan
git commit -m "clean: purge LFS history, add k_lab + function_builder updates"
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED at commit" -ForegroundColor Red; Read-Host; exit }

Write-Host "`n=== FORCE PUSHING (fresh-main -> origin/main) ===" -ForegroundColor Cyan
git push --force origin fresh-main:main
if ($LASTEXITCODE -ne 0) { Write-Host "PUSH FAILED — check output above" -ForegroundColor Red; Read-Host; exit }

Write-Host "`n=== CLEANING UP LOCAL BRANCHES ===" -ForegroundColor Cyan
git branch -D main 2>$null
git checkout -b main 2>$null
git branch -D fresh-main 2>$null

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  SUCCESS! Live at https://foreandr.github.io" -ForegroundColor Green
Write-Host "  GitHub Pages deploys in ~60 seconds" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
Read-Host "Press Enter to close"
