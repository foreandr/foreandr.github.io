@echo off
setlocal

cd /d "%~dp0"

echo [1/4] Scraping GE buy limits...
python get_ge_buy_limits.py
if errorlevel 1 goto :fail

echo [2/4] Enriching prices and official GE links...
python enrich_ge_prices.py
if errorlevel 1 goto :fail

echo [3/4] Adding trade volume to enriched CSV...
python add_trade_volume_to_csv.py
if errorlevel 1 goto :fail

echo [4/4] Building JSON and crawl metadata...
python csv_to_json.py
if errorlevel 1 goto :fail
python update_crawl_metadata.py
if errorlevel 1 goto :fail

echo Pipeline complete.
exit /b 0

:fail
echo Pipeline failed.
exit /b 1
