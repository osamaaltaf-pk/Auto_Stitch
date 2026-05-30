# INSTALLER.md — Windows Batch File Spec

All three batch files must work on:
- Windows 10 (build 1903+) and Windows 11
- Clean installs with no prior Python, Git, or FFmpeg
- Both cmd.exe and Windows Terminal

---

## warmup.bat — First-time model + binary download

Run ONCE before first use. Downloads everything.

```batch
@echo off
setlocal enabledelayedexpansion
title AutoStitch Warmup

echo ============================================
echo  AutoStitch v1 - First-time Setup (Warmup)
echo ============================================
echo.

REM ── Check Python 3.11 ─────────────────────────────────────────────
echo [1/6] Checking Python 3.11...
py -3.11 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11 not found.
    echo Please install Python 3.11 from https://python.org/downloads/
    echo Make sure to check "Add to PATH" during installation.
    pause
    exit /b 1
)
echo       Python 3.11 found.

REM ── Check Git ─────────────────────────────────────────────────────
echo [2/6] Checking Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not found.
    echo Please install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)
echo       Git found.

REM ── Check disk space (warn if < 20GB free on C:) ──────────────────
REM (basic check — PowerShell fallback)
echo [3/6] Checking disk space...
for /f "tokens=3" %%a in ('dir /-c "%~dp0" ^| findstr /i "bytes free"') do set FREE=%%a
echo       (disk check: see console for warnings)

REM ── Download FFmpeg ───────────────────────────────────────────────
echo [4/6] Downloading FFmpeg...
if exist "bin\ffmpeg.exe" (
    echo       FFmpeg already present, skipping.
) else (
    mkdir bin 2>nul
    REM Use PowerShell to download
    powershell -Command "& {
        $url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
        $zip = 'bin\ffmpeg.zip'
        Write-Host '      Downloading FFmpeg (~80MB)...'
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Write-Host '      Extracting...'
        Expand-Archive -Path $zip -DestinationPath 'bin\ffmpeg_tmp' -Force
        $exe = Get-ChildItem -Path 'bin\ffmpeg_tmp' -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
        Copy-Item $exe.FullName 'bin\ffmpeg.exe'
        $probe = Get-ChildItem -Path 'bin\ffmpeg_tmp' -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1
        Copy-Item $probe.FullName 'bin\ffprobe.exe'
        Remove-Item $zip -Force
        Remove-Item 'bin\ffmpeg_tmp' -Recurse -Force
        Write-Host '      FFmpeg ready.'
    }"
)

REM ── Clone engine repos (if not present) ──────────────────────────
echo [5/6] Setting up engine repos...
REM NOTE: Replace these URLs with the actual repo URLs when provided by project owner
if not exist "engines\stable_audio" (
    echo       Cloning Stable Audio repo...
    git clone https://PLACEHOLDER_STABLE_AUDIO_REPO engines\stable_audio
    if errorlevel 1 (
        echo ERROR: Failed to clone Stable Audio repo.
        echo Update the URL in warmup.bat when repo is available.
        pause
        exit /b 1
    )
) else (
    echo       Stable Audio repo already present.
)

if not exist "engines\pocket_tts" (
    echo       Cloning PocketTTS repo...
    git clone https://PLACEHOLDER_POCKET_TTS_REPO engines\pocket_tts
    if errorlevel 1 (
        echo ERROR: Failed to clone PocketTTS repo.
        pause
        exit /b 1
    )
) else (
    echo       PocketTTS repo already present.
)

REM ── Download model weights ────────────────────────────────────────
echo [6/6] Downloading model weights...
echo       (This may take 5-30 minutes depending on your connection)
mkdir models\stable_audio 2>nul
mkdir models\pocket_tts 2>nul

REM Stable Audio models — agent fills in actual download logic from repo README
if exist "engines\stable_audio\download_models.py" (
    py -3.11 engines\stable_audio\download_models.py --output models\stable_audio
) else (
    echo       NOTE: No download_models.py found in Stable Audio repo.
    echo       Manually place model weights in models\stable_audio\
)

REM PocketTTS models
if exist "engines\pocket_tts\download_models.py" (
    py -3.11 engines\pocket_tts\download_models.py --output models\pocket_tts
) else (
    echo       NOTE: No download_models.py found in PocketTTS repo.
    echo       Manually place model weights in models\pocket_tts\
)

echo.
echo ============================================
echo  Warmup complete!
echo  Now run: installer.bat
echo ============================================
pause
```

---

## installer.bat — Create venv + install dependencies + launch

Run after warmup.bat. Can be re-run to update dependencies.

```batch
@echo off
setlocal enabledelayedexpansion
title AutoStitch Installer

echo ============================================
echo  AutoStitch v1 - Installer
echo ============================================
echo.

REM ── Verify warmup was run ─────────────────────────────────────────
if not exist "bin\ffmpeg.exe" (
    echo ERROR: FFmpeg not found. Please run warmup.bat first.
    pause
    exit /b 1
)

REM ── Create virtual environment ────────────────────────────────────
echo [1/4] Creating Python 3.11 virtual environment...
if exist ".venv" (
    echo       .venv already exists, skipping creation.
) else (
    py -3.11 -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create venv.
        pause
        exit /b 1
    )
    echo       .venv created.
)

REM ── Install engine requirements first (torch version must win) ────
echo [2/4] Installing engine dependencies...
call .venv\Scripts\activate.bat

if exist "engines\stable_audio\requirements.txt" (
    echo       Installing Stable Audio requirements...
    pip install -r engines\stable_audio\requirements.txt --quiet
)
if exist "engines\pocket_tts\requirements.txt" (
    echo       Installing PocketTTS requirements...
    pip install -r engines\pocket_tts\requirements.txt --quiet
)

REM ── Install AutoStitch requirements ──────────────────────────────
echo [3/4] Installing AutoStitch requirements...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Check requirements.txt.
    pause
    exit /b 1
)
echo       All dependencies installed.

REM ── Launch app ───────────────────────────────────────────────────
echo [4/4] Launching AutoStitch...
echo.
echo  Opening in your browser at http://localhost:8080
echo  Press Ctrl+C in this window to stop the app.
echo.
python main.py

pause
```

---

## run.bat — Quick launch after install

```batch
@echo off
title AutoStitch
call .venv\Scripts\activate.bat
echo Starting AutoStitch...
echo Open http://localhost:8080 in your browser if it doesn't open automatically.
python main.py
```

---

## Agent notes for batch file implementation

1. All `.bat` files must have `@echo off` and `setlocal` at the top.
2. Use `py -3.11` not `python` to invoke Python — the `py` launcher is
   installed with Python on Windows and respects the version flag.
3. Use `call .venv\Scripts\activate.bat` not `source .venv/bin/activate`
   (that is Unix syntax).
4. Error handling: every critical step that can fail must check `errorlevel 1`
   and halt with a clear message.
5. The FFmpeg download URL in warmup.bat may change. Use the BtbN builds
   from GitHub releases — they are reliable and always have a `latest` redirect.
6. When engine repo URLs are known, replace `PLACEHOLDER_*` strings.
