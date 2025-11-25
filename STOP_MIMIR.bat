@echo off
title MIMIR Shutdown
color 0c

echo ========================================================
echo                STOPPING MIMIR SYSTEM
echo ========================================================
echo.

echo Terminating Node.js processes (Frontend)...
taskkill /F /IM node.exe /T 2>nul

echo Terminating Python processes (Backend)...
taskkill /F /IM python.exe /T 2>nul

echo.
echo ========================================================
echo                  SYSTEM SHUTDOWN COMPLETE
echo ========================================================
pause
