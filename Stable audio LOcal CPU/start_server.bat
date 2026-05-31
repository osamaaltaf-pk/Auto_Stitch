@echo off
echo.
echo  ====================================================
echo    Stable Audio 3 Studio — Starting Server
echo    Open http://localhost:5000 in your browser
echo  ====================================================
echo.
call venv\Scripts\activate.bat
python server.py
pause
