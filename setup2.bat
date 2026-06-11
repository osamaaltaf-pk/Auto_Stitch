@echo off
setlocal enabledelayedexpansion
title AutoStitch Setup - Step 2 (Environments & HF Downloads)

REM ── Root directory ──────────────────────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Setup - Step 2: Environments & Assets
echo  Root: %ROOT%
echo ====================================================
echo.

REM ── Check Python ────────────────────────────────────────────────────────────
set "PYTHON_CMD="
python --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python"
) else (
    if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
        set "PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312;%USERPROFILE%\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"
        set "PYTHON_CMD=python"
    ) else (
        where py >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_CMD=py"
        )
    )
)

if not defined PYTHON_CMD (
    echo   [!!] ERROR: Python was not found on your system.
    echo        Please run setup1.bat first to install Python.
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%V in ('%PYTHON_CMD% --version 2^>^&1') do set "PY_VER=%%V"
echo   [OK] Python verified: !PY_VER!
echo.

REM ── Install Hugging Face Hub CLI ────────────────────────────────────────────
echo [1/7] Installing Hugging Face CLI...
%PYTHON_CMD% -m pip install --upgrade pip --quiet
%PYTHON_CMD% -m pip install -U huggingface_hub --quiet
if errorlevel 1 (
    echo   [!!] WARNING: pip installation of huggingface_hub failed.
    echo        Trying direct PowerShell installer...
    powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
)

REM Dynamically locate the python Scripts directory and add it to session PATH
for /f "delims=" %%I in ('%PYTHON_CMD% -c "import sys, os; print(os.path.dirname(sys.executable))"') do set "PY_DIR=%%I"
set "PATH=!PY_DIR!;!PY_DIR!\Scripts;%PATH%"

set "HF_CMD="
if exist "!PY_DIR!\Scripts\hf.exe" (
    set "HF_CMD=!PY_DIR!\Scripts\hf.exe"
)
if not defined HF_CMD (
    where hf >nul 2>&1
    if not errorlevel 1 (
        set "HF_CMD=hf"
    )
)
if not defined HF_CMD (
    where huggingface-cli >nul 2>&1
    if not errorlevel 1 (
        set "HF_CMD=huggingface-cli"
    )
)
if not defined HF_CMD (
    if exist "%USERPROFILE%\.cargo\bin\hf.exe" (
        set "HF_CMD=%USERPROFILE%\.cargo\bin\hf.exe"
    )
)

if not defined HF_CMD (
    echo   [!!] ERROR: Hugging Face CLI (hf) was not found after installation.
    pause
    exit /b 1
)
echo   [OK] Hugging Face CLI ready: %HF_CMD%
echo.

REM ── Sync Required Binaries ──────────────────────────────────────────────────
echo [2/7] Syncing required binaries from Hugging Face bucket...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"
"%HF_CMD%" sync hf://buckets/deepLEARNING786/YTAuto "%ROOT%\bin"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to sync binaries from YTAuto bucket.
    pause
    exit /b 1
)
set "PATH=%ROOT%\bin;%PATH%"
echo   [OK] Binaries synced successfully.
echo.

REM ── Verify FFmpeg ───────────────────────────────────────────────────────────
echo [3/7] Verifying FFmpeg...
if exist "%ROOT%\bin\ffmpeg.exe" (
    echo   [OK] ffmpeg.exe found in bin\
) else (
    echo   [!!] ERROR: ffmpeg.exe not found in bin\ after sync.
    pause
    exit /b 1
)
echo.

REM ── Build Main Venv ─────────────────────────────────────────────────────────
echo [4/7] Setting up main app virtual environment...
if exist "%ROOT%\venv\Scripts\python.exe" (
    "%ROOT%\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] Main venv healthy - skipping rebuild.
        goto venv_ok
    )
    echo   Broken main venv detected - rebuilding...
    rmdir /s /q "%ROOT%\venv" >nul 2>&1
)

echo   Creating main venv...
%PYTHON_CMD% -m venv "%ROOT%\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create main venv.
    pause
    exit /b 1
)

echo   Installing requirements for main app...
call "%ROOT%\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install -r "%ROOT%\requirements.txt" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: Requirements installation failed.
    call "%ROOT%\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\deactivate.bat"
echo   [OK] Main app environment ready.

:venv_ok
echo.

REM ── Build TTS Venv ──────────────────────────────────────────────────────────
echo [5/7] Setting up TTS engine virtual environment...
if exist "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" (
    "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] TTS venv healthy - skipping rebuild.
        goto tts_ok
    )
    echo   Broken TTS venv detected - rebuilding...
    rmdir /s /q "%ROOT%\text_to_speech_server\venv" >nul 2>&1
)

echo   Creating TTS venv...
%PYTHON_CMD% -m venv "%ROOT%\text_to_speech_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create TTS venv.
    pause
    exit /b 1
)

echo   Installing requirements for TTS server...
call "%ROOT%\text_to_speech_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r "%ROOT%\text_to_speech_server\requirements.txt" --quiet
pip install "piper-tts>=0.1.0" --quiet
call "%ROOT%\text_to_speech_server\venv\Scripts\deactivate.bat"
echo   [OK] TTS environment ready.

:tts_ok
echo.

REM ── Build SFX Venv ──────────────────────────────────────────────────────────
echo [6/7] Setting up Sound and Music virtual environment...
if exist "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" (
    "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] SFX venv healthy - skipping rebuild.
        goto sfx_ok
    )
    echo   Broken SFX venv detected - rebuilding...
    rmdir /s /q "%ROOT%\sfx_and_music_server\venv" >nul 2>&1
)

echo   Creating SFX venv...
%PYTHON_CMD% -m venv "%ROOT%\sfx_and_music_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create SFX venv.
    pause
    exit /b 1
)

echo   Installing requirements for Sound and Music server...
call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
pip install -r "%ROOT%\sfx_and_music_server\requirements.txt" --quiet
pip install "git+https://github.com/Stability-AI/stable-audio-3.git" --quiet
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
echo   [OK] Sound and Music environment ready.

:sfx_ok
echo.

REM ── Pre-cache Assets & Download Models ──────────────────────────────────────
echo [7/7] Pre-caching frontend assets & downloading model caches...
call "%ROOT%\venv\Scripts\activate.bat"
python "%ROOT%\download_frontend_assets.py"
if errorlevel 1 (
    echo   [!!] ERROR: Frontend asset pre-caching failed.
    call "%ROOT%\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\deactivate.bat"
echo   [OK] Frontend assets cached.

echo.
echo Downloading SFX & Music model cache from Hugging Face...
if not exist "%ROOT%\sfx_and_music_server\model_cache" mkdir "%ROOT%\sfx_and_music_server\model_cache"
"%HF_CMD%" download deepLEARNING786/sfx-music-auto-stitch --local-dir "%ROOT%\sfx_and_music_server\model_cache" --local-dir-use-symlinks False
if errorlevel 1 (
    echo   [WARN] Failed to download SFX & Music model cache from Hugging Face.
)

echo.
echo Downloading TTS model cache from Hugging Face...
if not exist "%ROOT%\text_to_speech_server\model_cache" mkdir "%ROOT%\text_to_speech_server\model_cache"
"%HF_CMD%" download deepLEARNING786/tts-auto-stitch --local-dir "%ROOT%\text_to_speech_server\model_cache" --local-dir-use-symlinks False
if errorlevel 1 (
    echo   [WARN] Failed to download TTS model cache from Hugging Face.
)

REM ── Verify AI Models ────────────────────────────────────────────────────────
echo.
echo Verifying AI models cache health...
call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python "%ROOT%\sfx_and_music_server\warmup.py" --models small-music small-sfx --no-test
if errorlevel 1 (
    echo   [WARN] Model cache verification check returned warnings.
    echo          This is normal if the music model files are missing or incomplete.
)
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
echo   [OK] Cache checks completed.

echo.
echo ====================================================
echo  Setup Complete! Run run.bat to launch AutoStitch.
echo ====================================================
pause
exit /b 0
