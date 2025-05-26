@echo off
title WBOT - WhatsApp Business Bot
echo.
echo ==========================================
echo    WBOT - WhatsApp Business Automation
echo ==========================================
echo.
echo Starting your WhatsApp Business Bot...
echo.
echo IMPORTANT STEPS:
echo 1. Wait for the QR code to appear
echo 2. Open WhatsApp on your phone
echo 3. Go to Settings ^> Linked Devices
echo 4. Scan the QR code displayed below
echo 5. Your bot will be ready to respond!
echo.
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "src\index.js" (
    echo ERROR: Cannot find src\index.js
    echo Please make sure you're running this from the WBOT directory
    pause
    exit /b 1
)

REM Start the bot
echo Starting WBOT...
echo.
node src/index.js

echo.
echo Bot stopped. Press any key to exit...
pause >nul 