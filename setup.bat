@echo off
setlocal enabledelayedexpansion
title AutoStitch Setup - Unified Launcher

REM ── Root directory ──────────────────────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Setup - Unified Launcher
echo ====================================================
echo.

call "%ROOT%\setup1.bat"
if errorlevel 1 (
    exit /b 1
)

REM Check if Python is active in the current session
python --version >nul 2>&1
if errorlevel 1 (
    if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
        set "PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312;%USERPROFILE%\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"
    ) else (
        echo.
        echo [INFO] Python was installed, but Windows needs a new terminal session
        echo        to recognize it globally.
        echo.
        echo  -- PLEASE CLOSE THIS TERMINAL WINDOW --
        echo  -- OPEN A NEW WINDOW, AND RUN setup2.bat DIRECTLY --
        echo.
        pause
        exit /b 0
    )
)

echo.
echo Proceeding automatically to Phase 2 (setup2.bat)...
echo.
call "%ROOT%\setup2.bat"
exit /b %errorlevel%
