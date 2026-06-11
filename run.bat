@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio

echo ====================================================
echo  AutoStitch Unified Studio - Launcher
echo ====================================================
echo.

REM ── Check Virtual Environment ─────────────────────────
if not exist "venv" (
    echo ERROR: Virtual environment not found. Please run setupfinal.bat first.
    pause
    exit /b 1
)

REM ── Check FFmpeg ──────────────────────────────────────
if not exist "bin\ffmpeg.exe" (
    echo WARNING: FFmpeg not found in bin\ffmpeg.exe
    echo          Please run setupfinal.bat first to copy/download FFmpeg automatically.
    echo          Or manually place ffmpeg.exe and ffprobe.exe inside the 'bin' folder.
    echo.
    pause
    exit /b 1
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
call venv\Scripts\activate.bat
call venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8080

pause
