@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio - Launcher

echo ====================================================
echo  AutoStitch Studio v1.0.0 — Unified Launcher
echo ====================================================
echo.

REM ── Check System RAM ─────────────────────────────────
echo Checking system resources...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$mem = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum; $gb = [Math]::Round($mem.Sum / 1GB); if ($gb -lt 16) { Write-Host '----------------------------------------------------' -ForegroundColor Yellow; Write-Host 'WARNING: Detected' $gb 'GB of system RAM.' -ForegroundColor Yellow; Write-Host 'Stable Audio requires >= 16 GB RAM to run smoothly.' -ForegroundColor Yellow; Write-Host 'You can toggle models manually inside the studio UI,' -ForegroundColor Yellow; Write-Host 'but ensure heavy apps are closed to avoid OOM errors.' -ForegroundColor Yellow; Write-Host '----------------------------------------------------' -ForegroundColor Yellow; Start-Sleep -Seconds 4 }"

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
