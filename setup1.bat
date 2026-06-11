@echo off
setlocal enabledelayedexpansion
title AutoStitch Setup - Step 1 (Python Bootstrap)

REM ── Root directory ──────────────────────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Setup - Step 1: Python Bootstrapper
echo  Root: %ROOT%
echo ====================================================
echo.

REM ── Check if Python is already in PATH ──────────────────────────────────────
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%V in ('python --version 2^>^&1') do set "PY_VER=%%V"
    echo   [OK] Python is already installed in your system PATH: !PY_VER!
    echo        You can proceed directly to setup2.bat.
    echo.
    pause
    exit /b 0
)

REM ── Check default non-admin installation folder ─────────────────────────────
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
    echo   [OK] Found Python 3.12 in AppData local directory.
    echo        Updating environment PATH...
    set "PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312;%USERPROFILE%\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"
    echo        Please run setup2.bat next.
    echo.
    pause
    exit /b 0
)

REM ── Download Python installer ──────────────────────────────────────────────
echo   Python is not installed. Preparing bootstrap...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"

if exist "%ROOT%\bin\python-3.12.10-amd64.exe" (
    echo   [OK] Python installer already present at bin\python-3.12.10-amd64.exe - skipping download.
) else (
    echo   Downloading Python 3.12.10 installer...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile '%ROOT%\bin\python-3.12.10-amd64.exe'"

    if errorlevel 1 (
        echo   [!!] ERROR: Failed to download Python. Check internet connection.
        pause
        exit /b 1
    )
    echo   [OK] Download complete.
)

REM ── Install Python ──────────────────────────────────────────────────────────
echo   Installing Python 3.12.10 silently...
"%ROOT%\bin\python-3.12.10-amd64.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0 Include_launcher=1
if errorlevel 1 (
    echo   [!!] ERROR: Python installation failed.
    pause
    exit /b 1
)

echo   Waiting for installation to register...
timeout /t 10 /nobreak >nul

echo.
echo ====================================================
echo  Python has been installed successfully!
echo.
echo  [IMPORTANT] PLEASE CLOSE THIS COMMAND PROMPT WINDOW,
echo  OPEN A NEW TERMINAL WINDOW, AND RUN setup2.bat
echo  TO FINISH THE AUTOSTITCH COMPOSER SETUP.
echo ====================================================
echo.
pause
exit /b 0
