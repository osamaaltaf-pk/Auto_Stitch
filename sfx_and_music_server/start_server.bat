@echo off
echo.
echo  ====================================================
echo    Sound & Music Studio — Starting Server
echo    Open http://localhost:5000 in your browser
echo  ====================================================
echo.
call venv\Scripts\activate.bat
python server.py
pause
