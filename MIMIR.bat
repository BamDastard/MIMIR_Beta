@echo off
title MIMIR Launcher
color 0b

echo ========================================================
echo                MIMIR AI SYSTEM LAUNCHER
echo ========================================================
echo.

:: 1. Start Backend
echo [1/3] Initializing Neural Backend...
start "MIMIR Backend" /min cmd /k "py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: 2. Start Frontend
echo [2/3] Launching Visual Interface...
cd frontend
start "MIMIR Frontend" /min cmd /k "npm run dev"
cd ..

:: 3. Wait and Launch
echo [3/3] Establishing Connection...
echo.
echo Waiting for services to synchronize...
timeout /t 8 /nobreak >nul

echo.
echo Opening MIMIR Interface...
start http://localhost:3000

echo.
echo ========================================================
echo             SYSTEM ONLINE - DO NOT CLOSE
echo ========================================================
echo.
echo To stop the system, run STOP_MIMIR.bat or close the windows.
