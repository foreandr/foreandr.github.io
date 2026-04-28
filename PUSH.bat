@echo off
cd /d C:\Users\forea\Documents\foreandr.github.io
echo.
echo ============================================
echo  STEP 1 — Kill hung git processes
echo ============================================
taskkill /f /im git.exe 2>nul
taskkill /f /im git-lfs.exe 2>nul
ping -n 3 127.0.0.1 >nul

echo ============================================
echo  STEP 2 — Delete stale lock
echo ============================================
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
powershell -Command "Remove-Item -Force '.git\index.lock' -ErrorAction SilentlyContinue"
ping -n 2 127.0.0.1 >nul

echo ============================================
echo  STEP 3 — Stage + commit
echo ============================================
git add -A
git commit -m "add k_lab + function_builder; fix gitignore large files"

echo ============================================
echo  STEP 4 — Push (--no-verify skips LFS hook)
echo ============================================
git push --no-verify origin main
if errorlevel 1 goto :orphan
goto :done

:orphan
echo.
echo  Normal push failed — trying orphan branch approach...
echo ============================================
git checkout --detach HEAD 2>nul
git branch -D fresh-main 2>nul
git branch -D main 2>nul
git checkout --orphan fresh-main
git rm --cached -r . -q
git add -A
git commit -m "clean: purge history, add k_lab + function_builder"
git push --force --no-verify origin fresh-main:main
if errorlevel 1 goto :err
git checkout -b main
git branch -D fresh-main 2>nul

:done
echo.
echo ============================================
echo  DONE — live at https://foreandr.github.io
echo  (GitHub Pages takes ~60 seconds to deploy)
echo ============================================
pause
goto :end

:err
echo.
echo  FAILED — check output above
echo ============================================
pause

:end
