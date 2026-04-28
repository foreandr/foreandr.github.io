@echo off
setlocal enabledelayedexpansion

:: Setup paths and log file
cd /d "%~dp0"
set LOG_FILE=refresh_log.txt
set START_TIME=%TIME%

echo ------------------------------------------ >> %LOG_FILE%
echo RUN STARTED: %DATE% %START_TIME% >> %LOG_FILE%

:: --- TASK 1: ACTIVATE VENV ---
call .\venv\Scripts\activate >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] VENV Activation >> %LOG_FILE%
) else (
    echo [FAILED]  VENV Activation >> %LOG_FILE%
)

:: --- TASK 2: LOT RECORDER ---
python .\apps\lot_recorder\update_html_file.py
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Lot Recorder Update >> %LOG_FILE%
) else (
    echo [FAILED]  Lot Recorder Update >> %LOG_FILE%
)

:: --- TASK 3: FINANCE SENTIMENT ---
python .\apps\finance_sentiment\main.py
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Finance Sentiment Update >> %LOG_FILE%
) else (
    echo [FAILED]  Finance Sentiment Update >> %LOG_FILE%
)

:: --- TASK 4: NETWORK STATE DASHBOARD DATA ---
python .\apps\network_state_dashboards\get_data.py
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Network State Dashboard Data >> %LOG_FILE%
) else (
    echo [FAILED]  Network State Dashboard Data >> %LOG_FILE%
)

:: --- FINISH ---
set END_TIME=%TIME%
echo RUN FINISHED: %END_TIME% >> %LOG_FILE%
echo ------------------------------------------ >> %LOG_FILE%

echo Process Complete. Check %LOG_FILE% for details.
pause
