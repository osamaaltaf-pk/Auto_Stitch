@echo off
REM ============================================================
REM  Stable Audio 3 — Warmup Launcher
REM  Checks/downloads models, then runs a quick test generation
REM ============================================================

title Stable Audio 3 - Warmup

echo.
echo  ====================================================
echo    Stable Audio 3 — Model Warmup
echo  ====================================================
echo.
echo  Choose an option:
echo.
echo  [1] Check + download BOTH models (music + sfx) + run test
echo  [2] Check + download music model only
echo  [3] Check + download sfx model only
echo  [4] Download only (skip test generation, faster)
echo  [5] Exit
echo.
set /p choice="  Enter choice [1-5]: "

call venv\Scripts\activate.bat

if "%choice%"=="1" (
    echo.
    python warmup.py --models small-music small-sfx
)
if "%choice%"=="2" (
    echo.
    python warmup.py --music-only
)
if "%choice%"=="3" (
    echo.
    python warmup.py --sfx-only
)
if "%choice%"=="4" (
    echo.
    python warmup.py --models small-music small-sfx --no-test
)
if "%choice%"=="5" (
    exit /b 0
)

echo.
echo  ====================================================
echo  Done. You can now run: start_server.bat
echo  ====================================================
echo.
pause
