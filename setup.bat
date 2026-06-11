@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Setup

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ====================================================
echo  AutoStitch Unified Studio - Setup
echo  Root: %ROOT%
echo ====================================================
echo.

REM ============================================================
REM PHASE 1: Python Detection and Bootstrapping
REM ============================================================
echo [1/8] Detecting Python environment...
set "PY_EXE="

if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
    set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe"
    echo   [OK] Found Python312 in AppData.
    goto python_found
)
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe" (
    set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe"
    echo   [OK] Found Python311 in AppData.
    goto python_found
)
if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python310\python.exe" (
    set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python310\python.exe"
    echo   [OK] Found Python310 in AppData.
    goto python_found
)

python --version >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('python -c "import sys; print(sys.executable)"') do set "PY_EXE=%%I"
    echo   [OK] Found Python in PATH.
    goto python_found
)

echo   Python not found. Downloading Python 3.12.10...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"
if not exist "%ROOT%\bin\python-3.12.10-amd64.exe" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile '%ROOT%\bin\python-3.12.10-amd64.exe'"
    if errorlevel 1 (
        echo   [!!] ERROR: Failed to download Python.
        pause
        exit /b 1
    )
)
echo   Installing Python 3.12.10 silently...
"%ROOT%\bin\python-3.12.10-amd64.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0 Include_launcher=1
if errorlevel 1 (
    echo   [!!] ERROR: Python installation failed.
    pause
    exit /b 1
)
echo   Waiting for install to register...
timeout /t 12 /nobreak >nul
if not exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
    echo   [!!] ERROR: Python installed but not found. Close and re-run setup.bat.
    pause
    exit /b 1
)
set "PY_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe"

:python_found
REM Derive PY_DIR safely without subprocess (avoids the 'import' not recognized bug)
for %%F in ("!PY_EXE!") do set "PY_DIR=%%~dpF"
if "!PY_DIR:~-1!"=="\" set "PY_DIR=!PY_DIR:~0,-1!"
set "PATH=!PY_DIR!;!PY_DIR!\Scripts;!PATH!"
for /f "tokens=2" %%V in ('"!PY_EXE!" --version 2^>^&1') do set "PY_VER=%%V"
echo   [OK] Python !PY_VER! ready at !PY_DIR!
echo.

REM ============================================================
REM PHASE 2: Install huggingface_hub with hf-xet (fast backend)
REM ============================================================
echo [2/8] Installing Hugging Face hub...

"!PY_EXE!" -m pip install --upgrade pip --quiet
if errorlevel 1 echo   [WARN] pip upgrade warning, continuing...

REM [hf-xet] extra installs the fast Xet backend automatically
"!PY_EXE!" -m pip install -U "huggingface_hub[hf-xet]" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: huggingface_hub install failed.
    pause
    exit /b 1
)
echo   [OK] huggingface_hub + hf-xet installed.

REM Verify importable - correct check, not --help on a non-existent entrypoint
"!PY_EXE!" -c "from huggingface_hub import snapshot_download, sync_bucket; print('ok')" >nul 2>&1
if errorlevel 1 (
    echo   [!!] ERROR: huggingface_hub not importable after install.
    pause
    exit /b 1
)
echo   [OK] huggingface_hub API ready.

"!PY_EXE!" -c "import hf_xet" >nul 2>&1
if errorlevel 1 (
    echo   [WARN] hf_xet not available - downloads will use standard speed.
) else (
    echo   [OK] hf_xet fast backend confirmed.
)
echo.

REM ============================================================
REM PHASE 3: Download Binaries from HF Bucket (public)
REM    Set XET env vars HERE in bat before Python starts - not inside script
REM ============================================================
echo [3/8] Syncing binaries from HF bucket...
if not exist "%ROOT%\bin" mkdir "%ROOT%\bin"

set HF_XET_HIGH_PERFORMANCE=1
set HF_HUB_ENABLE_HF_TRANSFER=0

"!PY_EXE!" -c "from huggingface_hub import sync_bucket; sync_bucket('hf://buckets/deepLEARNING786/YTAuto', r'%ROOT%\bin')"
if errorlevel 1 (
    echo   [!!] ERROR: Bucket sync failed.
    echo        Check that bucket deepLEARNING786/YTAuto is public and internet is working.
    pause
    exit /b 1
)
set "PATH=%ROOT%\bin;!PATH!"
echo   [OK] Binaries synced.
echo.

REM ============================================================
REM PHASE 4: Verify FFmpeg
REM ============================================================
echo [4/8] Verifying FFmpeg...
if exist "%ROOT%\bin\ffmpeg.exe" (
    echo   [OK] ffmpeg.exe found.
) else (
    echo   [!!] ERROR: ffmpeg.exe not found in bin\ after sync.
    pause
    exit /b 1
)
echo.

REM ============================================================
REM PHASE 5: Main venv
REM ============================================================
echo [5/8] Setting up main venv...

if exist "%ROOT%\venv\Scripts\python.exe" (
    "%ROOT%\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] Main venv healthy - skipping.
        goto venv_ok
    )
    echo   Broken venv - rebuilding...
    rmdir /s /q "%ROOT%\venv" >nul 2>&1
)

"!PY_EXE!" -m venv "%ROOT%\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create main venv.
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install -r "%ROOT%\requirements.txt" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: Main requirements install failed.
    call "%ROOT%\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
call "%ROOT%\venv\Scripts\deactivate.bat"
echo   [OK] Main venv ready.

:venv_ok
echo.

REM ============================================================
REM PHASE 6: TTS venv
REM ============================================================
echo [6/8] Setting up TTS environment...

if exist "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" (
    "%ROOT%\text_to_speech_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] TTS venv healthy - skipping.
        goto tts_ok
    )
    echo   Broken TTS venv - rebuilding...
    rmdir /s /q "%ROOT%\text_to_speech_server\venv" >nul 2>&1
)

"!PY_EXE!" -m venv "%ROOT%\text_to_speech_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create TTS venv.
    pause
    exit /b 1
)
call "%ROOT%\text_to_speech_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r "%ROOT%\text_to_speech_server\requirements.txt" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: TTS requirements install failed.
    call "%ROOT%\text_to_speech_server\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
pip install "piper-tts>=0.1.0" --quiet
if errorlevel 1 (
    echo   [WARN] piper-tts install failed. Limited TTS voice support.
)
call "%ROOT%\text_to_speech_server\venv\Scripts\deactivate.bat"
echo   [OK] TTS venv ready.

:tts_ok
echo.

REM ============================================================
REM PHASE 7: SFX venv
REM ============================================================
echo [7/8] Setting up SFX environment...

if exist "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" (
    "%ROOT%\sfx_and_music_server\venv\Scripts\python.exe" -c "import socket" >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] SFX venv healthy - skipping.
        goto sfx_ok
    )
    echo   Broken SFX venv - rebuilding...
    rmdir /s /q "%ROOT%\sfx_and_music_server\venv" >nul 2>&1
)

"!PY_EXE!" -m venv "%ROOT%\sfx_and_music_server\venv"
if errorlevel 1 (
    echo   [!!] ERROR: Failed to create SFX venv.
    pause
    exit /b 1
)
call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
if errorlevel 1 (
    echo   [!!] ERROR: torch/torchaudio install failed.
    call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
pip install -r "%ROOT%\sfx_and_music_server\requirements.txt" --quiet
if errorlevel 1 (
    echo   [!!] ERROR: SFX requirements install failed.
    call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
    pause
    exit /b 1
)
pip install "git+https://github.com/Stability-AI/stable-audio-3.git" --quiet
if errorlevel 1 (
    echo   [WARN] stable-audio-3 install failed.
)
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"
echo   [OK] SFX venv ready.

:sfx_ok
echo.

REM ============================================================
REM PHASE 8: Frontend Assets and Model Downloads
REM ============================================================
echo [8/8] Caching frontend assets and downloading AI models...

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
echo.

echo   Downloading SFX and Music model cache...
if not exist "%ROOT%\sfx_and_music_server\model_cache" mkdir "%ROOT%\sfx_and_music_server\model_cache"
"!PY_EXE!" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='deepLEARNING786/sfx-music-auto-stitch', local_dir=r'%ROOT%\sfx_and_music_server\model_cache')"
if errorlevel 1 (
    echo   [WARN] SFX and Music model download failed.
) else (
    echo   [OK] SFX and Music models downloaded.
)

echo   Downloading TTS model cache...
if not exist "%ROOT%\text_to_speech_server\model_cache" mkdir "%ROOT%\text_to_speech_server\model_cache"
"!PY_EXE!" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='deepLEARNING786/tts-auto-stitch', local_dir=r'%ROOT%\text_to_speech_server\model_cache')"
if errorlevel 1 (
    echo   [WARN] TTS model download failed.
) else (
    echo   [OK] TTS model downloaded.
)
echo.

echo   Verifying AI models...
call "%ROOT%\sfx_and_music_server\venv\Scripts\activate.bat"
python "%ROOT%\sfx_and_music_server\warmup.py" --models small-music small-sfx --no-test
if errorlevel 1 (
    echo   [WARN] Model warmup reported issues. Server will still start.
) else (
    echo   [OK] AI models verified.
)
call "%ROOT%\sfx_and_music_server\venv\Scripts\deactivate.bat"

echo.
echo ====================================================
echo  Setup Complete! Run run.bat to launch AutoStitch.
echo ====================================================
pause
exit /b 0
