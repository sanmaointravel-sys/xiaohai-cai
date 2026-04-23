@echo off
chcp 65001 >nul
title 小孩菜 - Backend

echo ========================================
echo   小孩菜 - Backend Launcher
echo ========================================
echo.

"C:\Program Files\Python311\python.exe" --version
echo.

cd /d "%~dp0backend"

echo Installing dependencies...
"C:\Program Files\Python311\python.exe" -m pip install flask flask-cors --quiet

echo.
echo Starting server at http://localhost:5000
echo Press Ctrl+C to stop
echo.
"C:\Program Files\Python311\python.exe" app.py

pause
