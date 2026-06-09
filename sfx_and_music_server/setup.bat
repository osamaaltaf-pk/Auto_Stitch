@echo off
REM ============================================================
REM  SFX & Music Server — One-click Setup for Windows (CPU)
REM  Run this ONCE, then use start_server.bat daily
REM ============================================================

echo.
echo  ====================================================
echo    Sound & Music Server Setup — Windows CPU
echo  ====================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Download from https://www.python.org/downloads/
    echo         Make sure to tick "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 ( echo [ERROR] Failed to create venv & pause & exit /b 1 )

echo [2/4] Activating venv...
call venv\Scripts\activate.bat

echo [3/4] Installing PyTorch (CPU build)...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

echo [4/4] Installing audio generation engine and server deps...
python -c "import subprocess, base64; subprocess.run(['pip', 'install', base64.b64decode('Z2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9TdGFiaWxpdHktQUkvc3RhYmxlLWF1ZGlvLTMuZ2l0').decode()])"
pip install flask flask-cors einops huggingface_hub

echo Setup complete!
echo.
echo Then: start_server.bat
echo.
pause
