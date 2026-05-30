@echo off
setlocal enabledelayedexpansion
title AutoStitch Unified Studio Setup

echo ====================================================
echo  AutoStitch v1 - Unified Studio Setup
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

REM ── Create Virtual Environment ──────────────────────
echo [2/5] Creating virtual environment (.venv)...
if exist ".venv" (
    echo       .venv virtual environment already exists, skipping creation.
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create .venv virtual environment.
        pause
        exit /b 1
    )
    echo       .venv created successfully.
)

REM ── Install Dependencies ───────────────────────────
echo [3/5] Installing backend dependencies...
call .venv\Scripts\activate.bat
.venv\Scripts\python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Check connection and requirements.txt.
    pause
    exit /b 1
)
echo       All backend packages successfully installed.

REM ── Download FFmpeg ───────────────────────────────
echo [4/5] Checking FFmpeg binaries...
if exist "bin\ffmpeg.exe" (
    if exist "bin\ffprobe.exe" (
        echo       FFmpeg already present, skipping download.
        goto :ffmpeg_done
    )
)

echo       FFmpeg not found. Downloading FFmpeg for Windows...
echo       This is a one-time download (~80 MB). Please wait...
echo.

if not exist "bin" mkdir bin

REM Download the zip using PowerShell (built into every Windows 8+)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'bin\ffmpeg_dl.zip' -UseBasicParsing; Write-Host 'Download complete.' } catch { Write-Error $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo ERROR: FFmpeg download failed. Please check your internet connection.
    echo You can manually download FFmpeg from https://ffmpeg.org/download.html
    echo and place ffmpeg.exe and ffprobe.exe inside the 'bin' folder.
    pause
    exit /b 1
)

echo       Extracting ffmpeg.exe and ffprobe.exe...
REM Extract only the two needed executables from the zip
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

if errorlevel 1 (
    echo ERROR: Extraction failed. Trying alternate method...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
      "$zip = [System.IO.Compression.ZipFile]::OpenRead('bin\ffmpeg_dl.zip');" ^
      "foreach ($e in $zip.Entries) { if ($e.Name -eq 'ffmpeg.exe' -or $e.Name -eq 'ffprobe.exe') { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,'bin\'+$e.Name,$true) } };" ^
      "$zip.Dispose()"
)

REM Clean up zip
if exist "bin\ffmpeg_dl.zip" del /f /q "bin\ffmpeg_dl.zip"

REM Verify extraction worked
if not exist "bin\ffmpeg.exe" (
    echo ERROR: ffmpeg.exe not found after extraction.
    echo Please manually download FFmpeg from https://ffmpeg.org/download.html
    echo and place ffmpeg.exe and ffprobe.exe inside the 'bin' folder.
    pause
    exit /b 1
)
echo       FFmpeg installed successfully.

:ffmpeg_done

REM ── Cache Frontend Libraries ──────────────────────
echo [5/5] Caching offline frontend assets...
.venv\Scripts\python download_frontend_assets.py
if errorlevel 1 (
    echo ERROR: Failed caching offline libraries.
    pause
    exit /b 1
)
echo       Offline pre-cache download complete.

echo.
echo ====================================================
echo  AutoStitch Setup Finished successfully!
echo  To start the unified editor and proxy, run: run.bat
echo ====================================================
pause
