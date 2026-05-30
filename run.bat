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

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Opening browser at http://localhost:8080...
start http://localhost:8080

echo Starting backend server...
.venv\Scripts\python main.py

pause
