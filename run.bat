@echo off
title AutoStitch Unified Studio
echo ====================================================
echo  Starting AutoStitch Unified Studio Editor...
echo ====================================================
echo.

if not exist ".venv" (
    echo ERROR: Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

REM ── Guard: check FFmpeg is present ───────────────
if not exist "bin\ffmpeg.exe" (
    echo WARNING: FFmpeg not found in bin\ffmpeg.exe
    echo          Please run setup.bat first to download FFmpeg automatically.
    echo          Or manually place ffmpeg.exe and ffprobe.exe inside the 'bin' folder.
    echo.
    pause
    exit /b 1
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Opening browser at http://localhost:8080...
start http://localhost:8080

echo Starting backend server...
.venv\Scripts\python main.py

pause
