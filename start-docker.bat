@echo off
REM Fiere Mic Maestro - Docker Startup Script
REM Checks if Docker is running and starts it in WSL2 if needed

echo Checking Docker status...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Docker is already running.
    exit /b 0
)

echo Docker is not running. Attempting to start in WSL2...

REM Start Docker in WSL2 (Ubuntu)
wsl -d Ubuntu -e sudo service docker start >nul 2>&1

REM Wait for Docker to initialize
timeout /t 3 /nobreak >nul

REM Verify Docker started
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Docker started successfully in WSL2.
    exit /b 0
) else (
    echo ⚠ Could not start Docker in WSL2.
    echo   Please start Docker Desktop manually or check WSL2 configuration.
    exit /b 1
)
