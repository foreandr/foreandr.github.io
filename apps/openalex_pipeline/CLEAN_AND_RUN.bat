@echo off
cd /d C:\Users\forea\Documents\foreandr.github.io\apps\openalex_pipeline

echo.
echo ############################################################
echo  WARNING: CLEAN_AND_RUN  --  WIPES ALL EXISTING PROGRESS
echo  This deletes the CSV, all JS chunks, and the checkpoint.
echo  Use RUN.bat instead if you want to RESUME where you left off.
echo ############################################################
echo.
set /p CONFIRM="  Type YES to wipe everything and start fresh: "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo  Cancelled. Run RUN.bat to resume safely.
    echo.
    pause
    exit /b 0
)

echo.
echo  Deleting old data files...
del /f /q openalex_data.js 2>nul
del /f /q openalex_papers.csv 2>nul
del /f /q openalex_manifest.js 2>nul
del /f /q openalex_data_*.js 2>nul
del /f /q output\fetch_cursor.json 2>nul
echo  Done cleaning.
echo.
echo ============================================
echo  Starting fresh fetch...
echo  (JS chunks rebuild every 50,000 papers)
echo  (Kill anytime -- progress is saved per page)
echo ============================================
echo.
python get_data.py --reset

echo.
pause
