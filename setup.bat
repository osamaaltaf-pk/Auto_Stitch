@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Setup

REM ── Root directory (always the folder this .bat lives in) ─────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Unified Studio - Setup
echo  Root: %ROOT%
echo ====================================================
echo.

REM ── PHASE 1: Python Detection & Bootstrapping ──────────────────────────────
echo [1/8] Detecting Python environment...
set "PYTHON_CMD="

REM 1. Check if python is already in PATH and works
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%V in ('python --version 2^>^&1') do set "PY_VER=%%V"
    echo   [OK] System Python found: !PY_VER!
    set "PYTHON_CMD=python"
    goto python_ready
)

REM 2. Check default Windows non-admin local install path
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
    echo   [OK] Found Python 3.12 in AppData local directory.
    set "PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312;%USERPROFILE%\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"
    set "PYTHON_CMD=python"
    goto python_ready
)

REM 3. If Python is completely missing, download and install it
echo   Python not found. Bootstrapping Python 3.12.10...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"

echo   Downloading Python 3.12.10 installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile '%ROOT%\bin\python-3.12.10-amd64.exe'"

if errorlevel 1 (
    echo   [!!] ERROR: Failed to download Python. Check internet connection.
    pause
    exit /b 1
)

echo   Installing Python 3.12.10 silently...
"%ROOT%\bin\python-3.12.10-amd64.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0 Include_launcher=1
if errorlevel 1 (
    echo   [!!] ERROR: Python installation failed.
    pause
    exit /b 1
)

echo   Waiting for installation to register...
timeout /t 10 /nobreak >nul

REM Add the expected location of the newly installed Python to session PATH
set "PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312;%USERPROFILE%\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"

REM Reload environment path from HKCU registry just in case
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USERPATH=%%B"
if defined USERPATH set "PATH=%USERPATH%;%PATH%"

python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%V in ('python --version 2^>^&1') do set "PY_VER=%%V"
    echo   [OK] Python installed successfully: !PY_VER!
    set "PYTHON_CMD=python"
    goto python_ready
)

REM Fallback check for python launcher
where py >nul 2>&1
if not errorlevel 1 (
    echo   [OK] Using Python launcher (py).
    set "PYTHON_CMD=py"
    goto python_ready
)

echo   [!!] ERROR: Python was installed but is still not recognized.
echo        Please restart this setup window or log out and log back in.
pause
exit /b 1

:python_ready
echo   Using Python Command: %PYTHON_CMD%
echo.

REM ── PHASE 2: Install Hugging Face CLI ──────────────────────────────────────
echo [2/8] Setting up Hugging Face CLI...
%PYTHON_CMD% -m pip install --upgrade pip --quiet
%PYTHON_CMD% -m pip install -U "huggingface_hub[cli]" --quiet
if errorlevel 1 (
    echo   [!!] WARNING: pip installation of huggingface_hub failed.
    echo        Trying direct PowerShell installer...
    powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
)

REM Dynamically locate the python Scripts directory and add it to session PATH
for /f "delims=" %%I in ('%PYTHON_CMD% -c "import sys, os; print(os.path.dirname(sys.executable))"') do set "PY_DIR=%%I"
set "PATH=!PY_DIR!;!PY_DIR!\Scripts;%PATH%"

REM Determine the correct HF CLI command
set "HF_CMD=hf"
where hf >nul 2>&1
if errorlevel 1 (
    where huggingface-cli >nul 2>&1
    if not errorlevel 1 (
        set "HF_CMD=huggingface-cli"
    ) else (
        echo   [!!] ERROR: Hugging Face CLI (hf) was not found after installation.
        pause
        exit /b 1
    )
)
echo   [OK] Hugging Face CLI ready: %HF_CMD%
echo.

REM ── PHASE 3: Sync Binaries ─────────────────────────────────────────────────
echo [3/8] Syncing binaries from Hugging Face bucket...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"
%HF_CMD% sync hf://buckets/deepLEARNING786/YTAuto "%ROOT%\bin"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to sync binaries from YTAuto bucket.
    pause
    exit /b 1
)
set "PATH=%ROOT%\bin;%PATH%"
echo   [OK] Binaries synced and added to PATH.
echo.

REM ── PHASE 4: Check FFmpeg ──────────────────────────────────────────────────
echo [4/8] Verifying FFmpeg...
if exist "%ROOT%\bin\ffmpeg.exe" (
    echo   [OK] ffmpeg.exe found in bin\
) else (
    echo   [!!] ERROR: ffmpeg.exe not found in bin\ after sync.
    pause
    exit /b 1
)
echo.

REM ── PHASE 5: Main venv ─────────────────────────────────────────────────────
echo [5/8] Setting up main venv...
if exist "%ROOT%\venv\Scripts\python.exe" (
    "%ROOT%\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] Main venv already healthy - skipping.
        goto venv_ok
    )
    echo   Broken venv detected - rebuilding...
    rmdir /s /q "%ROOT%\venv" >nul 2>&1
)

echo   Creating main venv...
%PYTHON_CMD% -m venv "%ROOT%\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create main venv.
    pause
    exit /b 1
)

echo   Installing main requirements...
call "%ROOT%\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install -r "%ROOT%\requirements.txt" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: pip install for main app failed.
    call "%ROOT%\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\deactivate.bat"
echo   [OK] Main app venv ready.

:venv_ok
echo.

REM ── PHASE 6: TTS venv ──────────────────────────────────────────────────────
echo [6/8] Setting up TTS environment...
if exist "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" (
    "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] TTS venv already healthy - skipping.
        goto tts_ok
    )
    echo   Broken TTS venv - rebuilding...
    rmdir /s /q "%ROOT%\text_to_speech_server\venv" >nul 2>&1
)

echo   Creating TTS venv...
%PYTHON_CMD% -m venv "%ROOT%\text_to_speech_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create TTS venv.
    pause
    exit /b 1
)

call "%ROOT%\text_to_speech_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r "%ROOT%\text_to_speech_server\requirements.txt" --quiet
pip install "piper-tts>=0.1.0" --quiet
call "%ROOT%\text_to_speech_server\venv\Scripts\deactivate.bat"
echo   [OK] TTS venv ready.

:tts_ok
echo.

REM ── PHASE 7: SFX venv ──────────────────────────────────────────────────────
echo [7/8] Setting up Sound and Music environment...
if exist "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" (
    "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] SFX venv already healthy - skipping.
        goto sfx_ok
    )
    echo   Broken SFX venv - rebuilding...
    rmdir /s /q "%ROOT%\sfx_and_music_server\venv" >nul 2>&1
)

echo   Creating SFX venv...
%PYTHON_CMD% -m venv "%ROOT%\sfx_and_music_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create SFX venv.
    pause
    exit /b 1
)

call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
pip install -r "%ROOT%\sfx_and_music_server\requirements.txt" --quiet
pip install "git+https://github.com/Stability-AI/stable-audio-3.git" --quiet
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
echo   [OK] SFX venv ready.

:sfx_ok
echo.

REM ── PHASE 8: Frontend Caching & Model Syncing ──────────────────────────────
echo [8/8] Caching frontend assets & syncing AI models...
call "%ROOT%\venv\Scripts\activate.bat"
python "%ROOT%\download_frontend_assets.py"
if errorlevel 1 (
    echo   [!!] ERROR: Frontend asset cache failed.
    call "%ROOT%\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\deactivate.bat"
echo   [OK] Frontend assets cached.

echo Syncing SFX model from Hugging Face bucket...
if not exist "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-sfx\snapshots\ae12755283df9d62ca39a9b050a39a0b607b8c20" mkdir "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-sfx\snapshots\ae12755283df9d62ca39a9b050a39a0b607b8c20"
%HF_CMD% sync hf://buckets/deepLEARNING786/stable-audio-3-small-sfx-bucket "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-sfx\snapshots\ae12755283df9d62ca39a9b050a39a0b607b8c20"

echo Syncing TTS model from Hugging Face bucket...
if not exist "%ROOT%\text_to_speech_server\model_cache\hub\models--kyutai--pocket-tts\snapshots\39592ff23c9ef80098bb74895d104c26275fe2c9" mkdir "%ROOT%\text_to_speech_server\model_cache\hub\models--kyutai--pocket-tts\snapshots\39592ff23c9ef80098bb74895d104c26275fe2c9"
%HF_CMD% sync hf://buckets/deepLEARNING786/pocket-tts-bucket "%ROOT%\text_to_speech_server\model_cache\hub\models--kyutai--pocket-tts\snapshots\39592ff23c9ef80098bb74895d104c26275fe2c9"

echo Syncing Music model from Hugging Face bucket...
if not exist "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-music\snapshots\0fef1392cd842149a2b6d445e181c97608faac06" mkdir "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-music\snapshots\0fef1392cd842149a2b6d445e181c97608faac06"
%HF_CMD% sync hf://buckets/deepLEARNING786/stable-audio-3-small-music "%ROOT%\sfx_and_music_server\model_cache\hub\models--stabilityai--stable-audio-3-small-music\snapshots\0fef1392cd842149a2b6d445e181c97608faac06"
if errorlevel 1 (
    echo   [WARN] Music model bucket deepLEARNING786/stable-audio-3-small-music could not be synced.
    echo          Make sure it is public and populated if you want to use the music model.
)

REM ── AI Models Verification ────────────────────────────────────────────────
echo.
echo Verifying AI models...
call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python "%ROOT%\sfx_and_music_server\warmup.py" --models small-music small-sfx --no-test
if errorlevel 1 (
    echo   [WARN] AI model verification failed.
    echo          If the music model is missing, this is expected since its bucket is private/empty.
    echo          The server can still start; missing models will be downloaded lazily or skipped.
)
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
echo   [OK] AI models check complete.

echo.
echo ====================================================
echo  Setup Complete! Run run.bat to launch.
echo ====================================================
pause
exit /b 0
