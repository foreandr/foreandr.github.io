@echo off
cd /d C:\Users\forea\Documents\foreandr.github.io\apps\openalex_pipeline

echo.
echo ============================================
echo  Deleting old data files...
echo ============================================
del /f /q openalex_data.js 2>nul
del /f /q openalex_papers.csv 2>nul
del /f /q openalex_manifest.js 2>nul
del /f /q openalex_data_*.js 2>nul
del /f /q output\fetch_cursor.json 2>nul
echo  Done cleaning.

echo.
echo ============================================
echo  Starting fetch from year 1600...
echo  (JS chunks rebuild every 50,000 papers)
echo ============================================
echo.
python get_data.py

pause
