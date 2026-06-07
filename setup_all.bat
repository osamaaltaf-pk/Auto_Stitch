@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Installer - Standalone Edition

echo ====================================================
echo  AutoStitch Studio v1.0.0 — Standalone Installer
echo ====================================================
echo.

REM ── Check Bundled Portable Python ──────────────────────
if not exist "bin\python-3.12.10-embed-amd64.zip" (
    echo [ERROR] Bundled Python zip not found in bin\python-3.12.10-embed-amd64.zip.
    echo         Please download and place python-3.12.10-embed-amd64.zip inside bin\ folder.
    pause
    exit /b 1
)

REM ── Step 1: Unzip Portable Python for Activation Check ─
echo [1/6] Extracting bundled portable Python runtime...
if not exist "bin\python_portable" (
    mkdir bin\python_portable
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Expand-Archive -Path 'bin\python-3.12.10-embed-amd64.zip' -DestinationPath 'bin\python_portable' -Force"
    
    REM Enable site-packages in python312._pth
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$pth = 'bin\python_portable\python312._pth'; (Get-Content $pth) -replace '#import site', 'import site' | Set-Content $pth"
)
echo       Portable Python extracted successfully.

REM ── Step 2: Enforce Licensing and Activation ──────────
echo [2/6] Launching Product Activation Wizard...
bin\python_portable\python.exe activate.py
if errorlevel 1 (
    echo.
    echo ====================================================
    echo  [ERROR] PRODUCT ACTIVATION FAILED!
    echo  AutoStitch Studio setup has been locked.
    echo  Please enter a valid active Gmail and License Key.
    echo ====================================================
    echo.
    REM Cleanup portable folder on failure
    rmdir /s /q bin\python_portable >nul 2>&1
    pause
    exit /b 1
)

REM ── Step 2.5: Component Selection ──────────────────────
echo.
echo ====================================================
echo  AutoStitch Studio - Component Selection
echo ====================================================
echo  [1] Complete Setup (TTS, SFX, Music, FFmpeg, LipSync)
echo  [2] Lightweight Setup (TTS, FFmpeg, LipSync - NO Stable Audio)
echo  [3] Custom Selection
echo ====================================================
set /p SETUP_CHOICE="Enter choice [1-3] (default 1): "
if "%SETUP_CHOICE%"=="" set SETUP_CHOICE=1

set INSTALL_TTS=Y
set INSTALL_SFX=Y
set INSTALL_MUSIC=Y
set INSTALL_FFMPEG=Y
set NEED_SA_VENV=N

if "%SETUP_CHOICE%"=="2" (
    set INSTALL_SFX=N
    set INSTALL_MUSIC=N
)
if "%SETUP_CHOICE%"=="3" (
    set /p CHOOSE_TTS="Install PocketTTS (Offline TTS)? [Y/N] (default Y): "
    if /i "!CHOOSE_TTS!"=="N" set INSTALL_TTS=N
    
    set /p CHOOSE_SA="Install Stable Audio (SFX/Music)? [Y/N] (default Y): "
    if /i "!CHOOSE_SA!"=="N" (
        set INSTALL_SFX=N
        set INSTALL_MUSIC=N
    ) else (
        echo  Which Stable Audio models to download?
        echo  [1] Sound Effects (SFX) Only
        echo  [2] Music Only
        echo  [3] Both SFX and Music
        set /p SA_CHOICE="Enter choice [1-3] (default 3): "
        if "!SA_CHOICE!"=="1" (
            set INSTALL_SFX=Y
            set INSTALL_MUSIC=N
        )
        if "!SA_CHOICE!"=="2" (
            set INSTALL_SFX=N
            set INSTALL_MUSIC=Y
        )
        if "!SA_CHOICE!"=="3" (
            set INSTALL_SFX=Y
            set INSTALL_MUSIC=Y
        )
    )
    set /p CHOOSE_FFMPEG="Install FFmpeg Engine? [Y/N] (default Y): "
    if /i "!CHOOSE_FFMPEG!"=="N" set INSTALL_FFMPEG=N
)

REM ── Step 3: Bootstrap Pip Package Manager ─────────────
echo [3/6] Bootstrapping local package manager (pip)...
if not exist "bin\python_portable\Scripts\pip.exe" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'bin\python_portable\get-pip.py' -UseBasicParsing; Write-Host 'Downloaded get-pip.' } catch { Write-Error $_.Exception.Message; exit 1 }"
    
    bin\python_portable\python.exe bin\python_portable\get-pip.py --quiet
    if exist "bin\python_portable\get-pip.py" del /f /q "bin\python_portable\get-pip.py"
)
echo       Pip package manager installed locally.

REM ── Step 4: Create the Virtual Environments ───────────
echo [4/6] Setting up virtual environments...

REM A. Main App Venv (Always installed)
echo       Creating main application virtual environment (venv)...
if not exist "venv" (
    bin\python_portable\python.exe -m venv venv
)
echo       Installing main application dependencies...
call venv\Scripts\activate.bat
venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
call venv\Scripts\deactivate.bat

REM B. PocketTTS Venv
if /i "!INSTALL_TTS!"=="Y" (
    echo       Creating PocketTTS virtual environment (Pocket_tts\venv)...
    if not exist "Pocket_tts\venv" (
        bin\python_portable\python.exe -m venv Pocket_tts\venv
    )
    echo       Installing PocketTTS dependencies...
    call Pocket_tts\venv\Scripts\activate.bat
    Pocket_tts\venv\Scripts\python.exe -m pip install -r Pocket_tts\requirements.txt --quiet
    call Pocket_tts\venv\Scripts\deactivate.bat
)

REM C. Stable Audio CPU Venv
if /i "!INSTALL_SFX!"=="Y" (
    set NEED_SA_VENV=Y
)
if /i "!INSTALL_MUSIC!"=="Y" (
    set NEED_SA_VENV=Y
)
if "!NEED_SA_VENV!"=="Y" (
    echo       Creating Stable Audio virtual environment (Stable audio LOcal CPU\venv)...
    if not exist "Stable audio LOcal CPU\venv" (
        bin\python_portable\python.exe -m venv "Stable audio LOcal CPU\venv"
    )
    echo       Installing Stable Audio CPU-Optimized dependencies (includes PyTorch CPU)...
    call "Stable audio LOcal CPU\venv\Scripts\activate.bat"
    "Stable audio LOcal CPU\venv\Scripts\python.exe" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
    "Stable audio LOcal CPU\venv\Scripts\python.exe" -m pip install -r "Stable audio LOcal CPU\requirements.txt" --quiet
    call "Stable audio LOcal CPU\venv\Scripts\deactivate.bat"
)

echo       Virtual environments successfully constructed.

REM ── Step 5: Install FFmpeg Binary ──────────────────────
if /i "!INSTALL_FFMPEG!"=="Y" (
    echo [5/6] Checking FFmpeg video rendering engine...
    if exist "bin\ffmpeg.exe" (
        if exist "bin\ffprobe.exe" (
            echo       FFmpeg already present, skipping download.
            goto :ffmpeg_done
        )
    )

    echo       FFmpeg not found. Downloading FFmpeg for Windows...
    echo       This is a one-time download (~80 MB). Please wait...
    echo.

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'bin\ffmpeg_dl.zip' -UseBasicParsing; Write-Host 'Download complete.' } catch { Write-Error $_.Exception.Message; exit 1 }"

    if errorlevel 1 (
        echo [ERROR] FFmpeg download failed. Check internet connection.
        pause
        exit /b 1
    )

    echo       Extracting ffmpeg.exe and ffprobe.exe...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$zip = [System.IO.Compression.ZipFile]::OpenRead('bin\ffmpeg_dl.zip');" ^
      "$needed = @('ffmpeg.exe','ffprobe.exe');" ^
      "foreach ($entry in $zip.Entries) {" ^
      "  $name = $entry.Name;" ^
      "  if ($needed -contains $name) {" ^
      "    $dst = 'bin\' + $name;" ^
      "    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dst, $true);" ^
      "    Write-Host ('Extracted: ' + $name)" ^
      "  }" ^
      "};" ^
      "$zip.Dispose();" ^
      "Add-Type -AssemblyName System.IO.Compression.FileSystem"

    if exist "bin\ffmpeg_dl.zip" del /f /q "bin\ffmpeg_dl.zip"
    echo       FFmpeg engine successfully installed.
) else (
    echo [5/6] Skipping FFmpeg binary installation.
)

:ffmpeg_done

REM ── Step 6: Warm up Model Weights ──────────────────────
echo [6/6] Caching offline AI model weights (Warmup)...

REM A. Cache main frontend offline assets (always run)
venv\Scripts\python.exe download_frontend_assets.py --quiet

REM B. Cache TTS Models
if /i "!INSTALL_TTS!"=="Y" (
    echo       Caching TTS Models (PocketTTS)...
    call Pocket_tts\venv\Scripts\activate.bat
    Pocket_tts\venv\Scripts\python.exe -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('averaged_perceptron_tagger', quiet=True)" >nul 2>&1
    call Pocket_tts\venv\Scripts\deactivate.bat
)

REM C. Cache Stable Audio Models
set WARMUP_FLAGS=
if /i "!INSTALL_SFX!"=="Y" (
    if /i "!INSTALL_MUSIC!"=="Y" (
        set WARMUP_FLAGS=--models small-sfx small-music
    ) else (
        set WARMUP_FLAGS=--models small-sfx
    )
) else if /i "!INSTALL_MUSIC!"=="Y" (
    set WARMUP_FLAGS=--models small-music
)

if not "!WARMUP_FLAGS!"=="" (
    echo       Loading HF_TOKEN from .env...
    set HF_TOKEN=
    if exist .env (
        for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
            set key=%%A
            set val=%%B
            for /f "tokens=*" %%x in ("!key!") do set key=%%x
            for /f "tokens=*" %%x in ("!val!") do set val=%%x
            if "!key!"=="HF_TOKEN" (
                set HF_TOKEN=!val!
                set HF_TOKEN=!HF_TOKEN:"=!
                set HF_TOKEN=!HF_TOKEN:'=!
                echo       Found HF_TOKEN in .env file.
            )
        )
    )
    if not "!HF_TOKEN!"=="" (
        set HF_TOKEN=!HF_TOKEN!
    )
    echo       Running Stable Audio Warmup and cache verification...
    call "Stable audio LOcal CPU\venv\Scripts\activate.bat"
    "Stable audio LOcal CPU\venv\Scripts\python.exe" "Stable audio LOcal CPU\warmup.py" !WARMUP_FLAGS!
    call "Stable audio LOcal CPU\venv\Scripts\deactivate.bat"
)

echo.
echo ====================================================
echo  AutoStitch Standalone Setup Completed Successfully!
echo  To launch the unified editor and all AI servers, run:
echo  👉 run_all.bat
echo ====================================================
pause
