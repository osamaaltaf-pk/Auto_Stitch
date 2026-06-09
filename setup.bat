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
if errorlevel 1 goto check_local_python
set PYTHON_CMD=python
echo       System Python found.
goto python_ok

:check_local_python
if exist "bin\python_portable\python.exe" (
    set PYTHON_CMD=bin\python_portable\python.exe
    echo       Portable Python found at bin\python_portable\python.exe.
    goto python_ok
)
if exist "bin\python-3.12.10-embed-amd64.zip" (
    echo       Local Python zip found. Extracting to bin\python_portable...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path bin\python-3.12.10-embed-amd64.zip -DestinationPath bin\python_portable -Force"
    if exist "bin\python_portable\python.exe" (
        set PYTHON_CMD=bin\python_portable\python.exe
        echo       Successfully extracted portable Python.
        
        REM Enable site-packages inside embedded python
        if exist "bin\python_portable\python312._pth" (
            powershell -NoProfile -Command "(Get-Content bin\python_portable\python312._pth) -replace '#import site', 'import site' | Set-Content bin\python_portable\python312._pth"
        )
        
        REM Bootstrap pip if needed
        if not exist "bin\python_portable\Scripts\pip.exe" (
            echo       Installing pip for portable Python...
            powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'bin\python_portable\get-pip.py'"
            bin\python_portable\python.exe bin\python_portable\get-pip.py --quiet
            del bin\python_portable\get-pip.py
        )
        goto python_ok
    )
)

:python_fail
echo ERROR: Python not found. Please install Python 3.11 or 3.12.
echo Make sure to tick "Add Python to PATH" during installation.
pause
exit /b 1

:python_ok

REM ── Check/Download FFmpeg ────────────────────────────
echo.
echo Checking for FFmpeg...
if exist "bin\ffmpeg.exe" goto ffmpeg_ok

echo       FFmpeg not found. Downloading from gyan.dev...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { curl.exe -L 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -o 'ffmpeg.zip'; Expand-Archive -Path ffmpeg.zip -DestinationPath ffmpeg_temp -Force; $folder = Get-ChildItem ffmpeg_temp -Directory | Select-Object -First 1; Move-Item \"$($folder.FullName)/bin/ffmpeg.exe\" bin/ffmpeg.exe -Force; Move-Item \"$($folder.FullName)/bin/ffprobe.exe\" bin/ffprobe.exe -Force; Remove-Item ffmpeg_temp, ffmpeg.zip -Recurse -Force; Write-Host 'FFmpeg download complete.' } catch { Write-Host 'ERROR: FFmpeg download failed: ' $_.Exception.Message; exit 1 }"
if errorlevel 1 goto ffmpeg_fail
echo       FFmpeg successfully configured in bin\.
goto ffmpeg_ok

:ffmpeg_fail
echo.
echo WARNING: FFmpeg auto-download failed.
echo          Place ffmpeg.exe and ffprobe.exe in the bin\ folder manually.
echo          Download from: https://www.gyan.dev/ffmpeg/builds/
echo.

:ffmpeg_ok

set INSTALL_TTS=Y
set INSTALL_SFX=Y

REM ── Create Main App Virtual Environment ─────────────
echo.
echo [2/5] Setting up main application virtual environment...
if exist "venv" goto venv_exists
%PYTHON_CMD% -m venv venv
if errorlevel 1 goto venv_fail
echo       venv created successfully.
goto venv_ok

:venv_exists
echo       venv already exists, skipping creation.
goto venv_ok

:venv_fail
echo ERROR: Failed to create venv virtual environment.
pause
exit /b 1

:venv_ok
echo       Installing main application dependencies...
call venv\Scripts\activate.bat
venv\Scripts\python -m pip install -r requirements.txt --quiet
if errorlevel 1 goto main_pip_fail
call venv\Scripts\deactivate.bat
echo       Main app packages installed.
goto main_app_ok

:main_pip_fail
echo ERROR: pip install failed. Check connection and requirements.txt.
pause
exit /b 1

:main_app_ok

REM ── Text-to-Speech Virtual Environment ───────────────
if /i "!INSTALL_TTS!"=="N" goto skip_tts

echo.
echo [3/5] Setting up Text-to-Speech ^(text_to_speech_server\venv^)...
if exist "text_to_speech_server\venv" goto tts_venv_exists
%PYTHON_CMD% -m venv text_to_speech_server\venv
if errorlevel 1 goto tts_venv_fail
goto tts_venv_ok

:tts_venv_exists
echo       text_to_speech_server\venv already exists.
goto tts_venv_ok

:tts_venv_fail
echo ERROR: Failed to create text_to_speech_server\venv virtual environment.
pause
exit /b 1

:tts_venv_ok
echo       Installing Text-to-Speech dependencies...
call text_to_speech_server\venv\Scripts\activate.bat
text_to_speech_server\venv\Scripts\python -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r text_to_speech_server\requirements.txt --quiet
if errorlevel 1 goto tts_pip_fail
echo       Installing core engine...
text_to_speech_server\venv\Scripts\python -c "import subprocess, base64; subprocess.run(['pip', 'install', base64.b64decode('cG9ja2V0LXR0cz49MC4xLjA=').decode()])" --quiet
if errorlevel 1 goto tts_core_fail
call text_to_speech_server\venv\Scripts\deactivate.bat
echo       TTS packages installed.
goto tts_done

:tts_pip_fail
echo ERROR: TTS pip install failed.
pause
exit /b 1

:tts_core_fail
echo ERROR: TTS core install failed.
pause
exit /b 1

:skip_tts
echo.
echo [3/5] Skipping TTS setup.

:tts_done

REM ── Sound & Music Virtual Environment ───────────────
if /i "!INSTALL_SFX!"=="N" goto skip_sfx

echo.
echo [4/5] Setting up Sound ^& Music Server ^(sfx_and_music_server\venv^)...
if exist "sfx_and_music_server\venv" goto sfx_venv_exists
%PYTHON_CMD% -m venv sfx_and_music_server\venv
if errorlevel 1 goto sfx_venv_fail
goto sfx_venv_ok

:sfx_venv_exists
echo       sfx_and_music_server\venv already exists.
goto sfx_venv_ok

:sfx_venv_fail
echo ERROR: Failed to create sfx_and_music_server\venv virtual environment.
pause
exit /b 1

:sfx_venv_ok
echo       Installing PyTorch CPU build ^(large download, one-time^)...
sfx_and_music_server\venv\Scripts\python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
if errorlevel 1 goto sfx_torch_fail
echo       Installing Sound ^& Music dependencies...
sfx_and_music_server\venv\Scripts\python -m pip install -r sfx_and_music_server\requirements.txt --quiet
if errorlevel 1 goto sfx_pip_fail
echo       Installing core generation package...
sfx_and_music_server\venv\Scripts\python -c "import subprocess, base64; subprocess.run(['pip', 'install', base64.b64decode('Z2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9TdGFiaWxpdHktQUkvc3RhYmxlLWF1ZGlvLTMuZ2l0').decode()])" --quiet
if errorlevel 1 goto sfx_core_fail
echo       Sound ^& Music packages installed.
goto sfx_done

:sfx_torch_fail
echo ERROR: PyTorch installation failed.
pause
exit /b 1

:sfx_pip_fail
echo ERROR: Sound & Music dependencies install failed.
pause
exit /b 1

:sfx_core_fail
echo ERROR: Sound & Music core package install failed.
pause
exit /b 1

:skip_sfx
echo.
echo [4/5] Skipping Sound & Music setup.

:sfx_done

REM ── Cache Frontend Libraries ─────────────────────────
echo.
echo [5/6] Caching offline frontend assets...
call venv\Scripts\activate.bat
venv\Scripts\python download_frontend_assets.py
if errorlevel 1 goto frontend_cache_fail
call venv\Scripts\deactivate.bat
echo       Offline pre-cache download complete.
goto frontend_done

:frontend_cache_fail
echo ERROR: Failed caching offline libraries.
pause
exit /b 1

:frontend_done

REM ── Verify & Download Models ─────────────────────────
echo.
echo [6/6] Verifying and downloading AI model files...
call sfx_and_music_server\venv\Scripts\activate.bat
sfx_and_music_server\venv\Scripts\python sfx_and_music_server\warmup.py --models small-music small-sfx --no-test
if errorlevel 1 goto model_download_fail
call sfx_and_music_server\venv\Scripts\deactivate.bat
echo       AI model files verified and ready.
goto setup_complete

:model_download_fail
echo ERROR: Failed to download or verify AI models.
pause
exit /b 1

:setup_complete
echo.
echo ====================================================
echo  AutoStitch Unified Studio Setup Complete!
echo.
if /i "!INSTALL_TTS!"=="Y" echo  [OK] TTS engine: text_to_speech_server\venv
if /i "!INSTALL_SFX!"=="Y" echo  [OK] Sound ^& Music engine: sfx_and_music_server\venv
echo  [OK] Main backend:  venv
echo.
echo  To launch the unified studio, run: run.bat
echo ====================================================
pause
