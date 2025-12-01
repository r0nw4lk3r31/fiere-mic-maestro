@echo off
REM Fiere Mic Maestro - Start with ngrok
REM This script starts the development servers and ngrok tunnel

echo.
echo ============================================
echo   Fiere Mic Maestro - ngrok Startup
echo ============================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ngrok is not installed!
    echo Please run: npm install -g ngrok
    echo.
    pause
    exit /b 1
)

REM Check if ngrok is configured
ngrok config check >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ngrok is not configured!
    echo Please run: ngrok config add-authtoken YOUR_TOKEN
    echo Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken
    echo.
    pause
    exit /b 1
)

echo Starting ngrok tunnel on port 3001...
echo.
echo INSTRUCTIONS:
echo 1. Copy the 'Forwarding' URL from the ngrok window (e.g., https://abc123.ngrok-free.app)
echo 2. Open .env file in the project root
echo 3. Update VITE_API_URL=YOUR_NGROK_URL
echo 4. Restart the frontend server
echo.
echo Press Ctrl+C to stop the tunnel when done
echo.

REM Start ngrok
ngrok http 3001

echo.
echo ngrok tunnel stopped
pause
