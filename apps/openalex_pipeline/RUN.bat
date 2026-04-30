@echo off
cd /d C:\Users\forea\Documents\foreandr.github.io\apps\openalex_pipeline

echo.
echo ============================================================
echo  OpenAlex Pipeline  --  RESUME-SAFE RUN
echo  (never wipes progress; safe to kill and restart anytime)
echo ============================================================
echo.

REM ── Show checkpoint status ──────────────────────────────────
if exist output\fetch_cursor.json (
    echo  [CHECKPOINT FOUND] Will resume from saved progress:
    python -c "import json,sys; d=json.load(open('output/fetch_cursor.json')); tot=max(d.get('total',1),1); f=d.get('fetched',0); pct=f/tot*100; print(f'    Papers fetched : {f:,} / {tot:,}  ({pct:.1f}%%)'); print(f'    Remaining      : {tot-f:,}')"
    echo.
) else (
    if exist openalex_papers.csv (
        echo  [NO CHECKPOINT] CSV exists but cursor is gone -- checking row count...
        python -c "import csv; rows=sum(1 for _ in open('openalex_papers.csv',encoding='utf-8'))-1; print(f'    CSV rows: {rows:,}  (will start API fetch from beginning)')"
        echo.
    ) else (
        echo  [FRESH START] No checkpoint and no CSV -- starting from scratch.
        echo.
    )
)

REM ── Run fetcher (auto-resumes if checkpoint exists) ─────────
echo  Starting get_data.py ...
echo  (Kill this window any time -- progress is saved every page)
echo.

python get_data.py

echo.
echo ============================================================
echo  Run finished. If interrupted, just run RUN.bat again.
echo  To wipe everything and start over, use CLEAN_AND_RUN.bat
echo ============================================================
echo.
pause
