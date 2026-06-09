@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Setup

echo ====================================================
echo  AutoStitch v1 - Unified Studio Setup (Stand-alone)
echo ====================================================
echo.

REM ── Check Python ────────────────────────────────────
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11 or 3.12.
    echo Make sure to tick "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo       Python found.

REM ── Check/Download FFmpeg ────────────────────────────
echo.
echo Checking for FFmpeg...
if not exist "bin\ffmpeg.exe" (
    echo       FFmpeg not found. Downloading release essentials zip...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "curl.exe -L 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -o 'ffmpeg.zip'; Expand-Archive -Path ffmpeg.zip -DestinationPath ffmpeg_temp; Move-Item -Path ffmpeg_temp/ffmpeg-*-essentials_build/bin/ffmpeg.exe, ffmpeg_temp/ffmpeg-*-essentials_build/bin/ffprobe.exe -Destination bin/ -Force; Remove-Item -Path ffmpeg_temp, ffmpeg.zip -Recurse -Force"
    echo       FFmpeg successfully configured in bin/.
) else (
    echo       FFmpeg already present.
)

REM ── Component Selection ─────────────────────────────
echo.
echo ====================================================
echo  AutoStitch Studio - Component Selection
echo ====================================================
echo  [1] Complete Setup  (AutoStitch + PocketTTS + Stable Audio)
echo  [2] Lightweight     (AutoStitch + PocketTTS only - NO Stable Audio)
echo  [3] Core Only       (AutoStitch backend only - no AI engines)
echo ====================================================
set /p SETUP_CHOICE="Enter choice [1-3] (default 1): "
if "%SETUP_CHOICE%"=="" set SETUP_CHOICE=1

set INSTALL_TTS=Y
set INSTALL_SFX=Y

if "%SETUP_CHOICE%"=="2" (
    set INSTALL_SFX=N
)
if "%SETUP_CHOICE%"=="3" (
    set INSTALL_TTS=N
    set INSTALL_SFX=N
)

REM ── Create Main App Virtual Environment ─────────────
echo.
echo [2/5] Setting up main application virtual environment...
if exist "venv" (
    echo       venv already exists, skipping creation.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create venv virtual environment.
        pause
        exit /b 1
    )
    echo       venv created successfully.
)
echo       Installing main application dependencies...
call venv\Scripts\activate.bat
venv\Scripts\python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Check connection and requirements.txt.
    pause
    exit /b 1
)
call venv\Scripts\deactivate.bat
echo       Main app packages installed.

REM ── PocketTTS Virtual Environment ───────────────────
if /i "!INSTALL_TTS!"=="Y" (
    echo.
    echo [3/5] Setting up PocketTTS ^(pocket_tts\venv^)...
    if not exist "pocket_tts\venv" (
        python -m venv pocket_tts\venv
        if errorlevel 1 (
            echo ERROR: Failed to create pocket_tts\venv virtual environment.
            pause
            exit /b 1
        )
    )
    echo       Installing PocketTTS dependencies...
    call pocket_tts\venv\Scripts\activate.bat
    pocket_tts\venv\Scripts\python -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r pocket_tts\requirements.txt --quiet
    if errorlevel 1 (
        echo ERROR: PocketTTS pip install failed.
        pause
        exit /b 1
    )
    call pocket_tts\venv\Scripts\deactivate.bat
    echo       PocketTTS packages installed.
) else (
    echo.
    echo [3/5] Skipping PocketTTS setup.
)

REM ── Stable Audio Virtual Environment ────────────────
if /i "!INSTALL_SFX!"=="Y" (
    echo.
    echo [4/5] Setting up Stable Audio ^(stable_audio_local_cpu\venv^)...
    if not exist "stable_audio_local_cpu\venv" (
        python -m venv stable_audio_local_cpu\venv
        if errorlevel 1 (
            echo ERROR: Failed to create stable_audio_local_cpu\venv virtual environment.
            pause
            exit /b 1
        )
    )
    echo       Installing PyTorch CPU build ^(large download, one-time^)...
    stable_audio_local_cpu\venv\Scripts\python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
    echo       Installing Stable Audio dependencies...
    stable_audio_local_cpu\venv\Scripts\python -m pip install -r stable_audio_local_cpu\requirements.txt --quiet
    if errorlevel 1 (
        echo ERROR: Stable Audio pip install failed.
        pause
        exit /b 1
    )
    echo       Stable Audio packages installed.
) else (
    echo.
    echo [4/5] Skipping Stable Audio setup.
)

REM ── Cache Frontend Libraries ─────────────────────────
echo.
echo [5/5] Caching offline frontend assets...
call venv\Scripts\activate.bat
venv\Scripts\python download_frontend_assets.py
if errorlevel 1 (
    echo ERROR: Failed caching offline libraries.
    pause
    exit /b 1
)
call venv\Scripts\deactivate.bat
echo       Offline pre-cache download complete.

echo.
echo ====================================================
echo  AutoStitch Unified Studio Setup Complete!
echo.
if /i "!INSTALL_TTS!"=="Y" echo  [OK] PocketTTS engine: pocket_tts\venv
if /i "!INSTALL_SFX!"=="Y" echo  [OK] Stable Audio engine: stable_audio_local_cpu\venv
echo  [OK] Main backend:  venv
echo.
echo  To launch the unified studio, run: run.bat
echo ====================================================
pause
