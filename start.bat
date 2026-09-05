@echo off
title GeoShield - Landslide Risk Monitoring System
echo.
echo ============================================
echo   GeoShield - Starting Application
echo   AI-Based Landslide Risk Monitoring
echo   North Eastern Region, India
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Setting up Python virtual environment...
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/5] Installing backend dependencies...
pip install --upgrade pip -q
pip install -r requirements.txt -q
cd ..

echo [3/5] Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo [4/5] Building frontend...
cd frontend
call npm run build
cd ..

echo [5/5] Starting GeoShield server...
echo.
echo ============================================
echo   GeoShield is running!
echo   Open: http://localhost:8000
echo   Login: admin@geoshield.gov.in / admin123
echo   Press Ctrl+C to stop
echo ============================================
echo.

cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
