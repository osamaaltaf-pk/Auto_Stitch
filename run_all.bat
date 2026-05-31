@echo off
title AutoStitch Unified Studio - Launcher

echo ====================================================
echo  AutoStitch Studio v1.0.0 — Unified Launcher
echo ====================================================
echo.

REM ── Check License Activation ─────────────────────────
if not exist "license.json" (
    echo [ERROR] Product Activation Key is missing!
    echo         Please run setup_all.bat first to activate and install.
    echo.
    pause
    exit /b 1
)

REM ── Start AutoStitch Unified Editor ──────────────────
echo [1/1] Launching AutoStitch Unified Editor (Port 8080)...
echo       Opening browser at http://localhost:8080...
start http://localhost:8080

call venv\Scripts\activate.bat
python main.py

exit /b 0
