@echo off
REM WaterGB Backend Deployment Script for Windows
REM This script handles the complete deployment process including Prisma setup

setlocal enabledelayedexpansion

echo 🌊 WaterGB Backend Deployment Script
echo =====================================

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    exit /b 1
) else (
    echo [SUCCESS] Node.js is installed
)

REM Check if PM2 is installed
echo [INFO] Checking PM2 installation...
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PM2 is not installed. Installing PM2...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install PM2
        exit /b 1
    ) else (
        echo [SUCCESS] PM2 installed successfully
    )
) else (
    echo [SUCCESS] PM2 is already installed
)

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
) else (
    echo [SUCCESS] Dependencies installed successfully
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "pids" mkdir pids
echo [SUCCESS] Directories created successfully

REM Setup Prisma
echo [INFO] Setting up Prisma...

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client
    exit /b 1
) else (
    echo [SUCCESS] Prisma client generated successfully
)

REM Push database schema
echo [INFO] Pushing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push database schema
    exit /b 1
) else (
    echo [SUCCESS] Database schema pushed successfully
)

REM Stop existing PM2 processes
echo [INFO] Stopping existing PM2 processes...
pm2 stop watergb-backend >nul 2>&1
pm2 delete watergb-backend >nul 2>&1
echo [SUCCESS] Existing processes stopped

REM Start the application with PM2
echo [INFO] Starting application with PM2...
call pm2 start ecosystem.config.js
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start application
    exit /b 1
) else (
    echo [SUCCESS] Application started successfully
)

REM Setup PM2 startup script
echo [INFO] Setting up PM2 startup script...
pm2 startup >nul 2>&1
pm2 save >nul 2>&1
echo [SUCCESS] PM2 startup script configured

REM Show application status
echo [INFO] Application Status:
pm2 status

echo.
echo [SUCCESS] 🎉 Deployment completed successfully!
echo.
echo [INFO] Useful commands:
echo   pm2 status                    - Check application status
echo   pm2 logs watergb-backend      - View application logs
echo   pm2 restart watergb-backend   - Restart application
echo   pm2 stop watergb-backend      - Stop application
echo   pm2 monit                     - Open monitoring interface
echo.

pause

