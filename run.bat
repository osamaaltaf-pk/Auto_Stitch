@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio

REM Always work relative to this bat file's location
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Unified Studio - Launcher
echo ====================================================
echo.

REM ── Check Virtual Environment ─────────────────────────
if not exist "%ROOT%\venv" (
    echo ERROR: Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

REM ── Check FFmpeg ──────────────────────────────────────
if not exist "%ROOT%\bin\ffmpeg.exe" (
    echo WARNING: FFmpeg not found in bin\ffmpeg.exe
    echo          Please run setup.bat first to copy/download FFmpeg automatically.
    echo          Or manually place ffmpeg.exe and ffprobe.exe inside the 'bin' folder.
    echo.
    pause
    exit /b 1
)

REM ── License Check ─────────────────────────────────────
if not exist "%ROOT%\license.json" (
    echo No license found. Launching activation...
    echo.
    call "%ROOT%\venv\Scripts\python.exe" "%ROOT%\activate.py"
    if errorlevel 1 (
        echo [ERROR] Activation failed. Cannot launch AutoStitch.
        pause
        exit /b 1
    )
    echo.
)

REM ── Physical RAM Check ────────────────────────────────
echo Checking system resources...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$mem = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum; $gb = [Math]::Round($mem.Sum / 1GB); if ($gb -lt 16) { Write-Host '----------------------------------------------------' -ForegroundColor Yellow; Write-Host ('WARNING: Detected ' + $gb + ' GB of system RAM.') -ForegroundColor Yellow; Write-Host 'The Sound & Music engine requires >= 16 GB RAM to run smoothly.' -ForegroundColor Yellow; Write-Host 'You can toggle models manually inside the studio UI,' -ForegroundColor Yellow; Write-Host 'but ensure heavy apps are closed to avoid OOM errors.' -ForegroundColor Yellow; Write-Host '----------------------------------------------------' -ForegroundColor Yellow; Start-Sleep -Seconds 3 } else { Write-Host ('RAM OK: ' + $gb + ' GB detected.') -ForegroundColor Green }"

echo.
echo Opening browser at http://localhost:8080...
start http://localhost:8080

echo Starting AutoStitch Unified Studio backend...
echo (All required local background engines will start automatically)
echo.

REM Use absolute paths - works regardless of where run.bat is launched from
call "%ROOT%\venv\Scripts\activate.bat"
"%ROOT%\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8080

pause
