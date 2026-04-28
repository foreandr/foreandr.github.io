@echo off
cd /d "%~dp0"

:: Get locale-independent timestamp via wmic
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set YYYY=%DT:~0,4%
set MM=%DT:~4,2%
set DD=%DT:~6,2%
set HH=%DT:~8,2%
set MIN=%DT:~10,2%
set SEC=%DT:~12,2%
set LOGFILE=logs\scan_%YYYY%-%MM%-%DD%_%HH%%MIN%%SEC%.txt

:: Create logs folder if it doesn't exist
if not exist logs mkdir logs

echo Running arb scan...
echo.

:: Run scan — output goes to screen live, also captured to log
python scan.py > "%LOGFILE%" 2>&1
type "%LOGFILE%"

echo.
echo -----------------------------------------------
echo Log saved ^-^> %LOGFILE%
echo -----------------------------------------------
pause
