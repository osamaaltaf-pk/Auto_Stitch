@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Setup

echo ====================================================
echo  AutoStitch v1 - Unified Studio Setup
echo ====================================================
echo.

REM ── Check Python ────────────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11 or 3.12.
    echo Make sure to tick "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo       Python found.

REM ── Create Virtual Environment ──────────────────────
echo [2/4] Creating virtual environment (.venv)...
if exist ".venv" (
    echo       .venv virtual environment already exists, skipping creation.
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create .venv virtual environment.
        pause
        exit /b 1
    )
    echo       .venv created successfully.
)

REM ── Install Dependencies ───────────────────────────
echo [3/4] Installing backend dependencies...
call .venv\Scripts\activate.bat
.venv\Scripts\python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Check connection and requirements.txt.
    pause
    exit /b 1
)
echo       All backend packages successfully installed.

REM ── Cache Frontend Libraries ──────────────────────
echo [4/4] Caching offline frontend assets...
.venv\Scripts\python download_frontend_assets.py
if errorlevel 1 (
    echo ERROR: Failed caching offline libraries.
    pause
    exit /b 1
)
echo       Offline pre-cache download complete.

echo.
echo ====================================================
echo  AutoStitch Setup Finished successfully!
echo  To start the unified editor and proxy, run: run.bat
echo ====================================================
pause
