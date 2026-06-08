@echo off
REM ============================================================
REM  Stable Audio 3 — One-click Setup for Windows (CPU)
REM  Run this ONCE, then use start_server.bat daily
REM ============================================================

echo.
echo  ====================================================
echo    Stable Audio 3 Setup — Windows CPU
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

echo [1/5] Creating virtual environment...
python -m venv venv
if errorlevel 1 ( echo [ERROR] Failed to create venv & pause & exit /b 1 )

echo [2/5] Activating venv...
call venv\Scripts\activate.bat

echo [3/5] Installing PyTorch (CPU build)...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

echo [4/5] Installing Stable Audio 3 and server deps...
pip install git+https://github.com/Stability-AI/stable-audio-3.git
pip install flask flask-cors einops

echo [5/5] Setup complete!
echo.
echo  ====================================================
echo    IMPORTANT: Accept the model license on HuggingFace
echo    before first run:
echo    https://huggingface.co/stabilityai/stable-audio-3-small-music
echo    https://huggingface.co/stabilityai/stable-audio-3-small-sfx
echo    Log in with: huggingface-cli login
echo  ====================================================
echo.
pip install huggingface_hub
echo Run: huggingface-cli login
echo Then: start_server.bat
echo.
pause
