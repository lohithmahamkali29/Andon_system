@echo off
echo.
echo ==========================================
echo    🚀 ANDON SYSTEM - STARTING ALL SERVICES
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

REM Start MQTT Broker (if not running)
echo 📡 Starting MQTT Broker...
tasklist /FI "IMAGENAME eq mosquitto.exe" 2>NUL | find /I /N "mosquitto.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MQTT Broker is already running
) else (
    echo 🔄 Starting MQTT Broker...
    start "MQTT Broker" /MIN mosquitto -c mosquitto\config\mosquitto.conf
    timeout /t 2 /nobreak >nul
    echo ✅ MQTT Broker started
)
echo.

REM Start Backend Server
echo 🖥️ Starting Backend Server...
cd backend
if not exist node_modules (
    echo 📦 Installing backend dependencies...
    npm install
)
start "Backend Server" cmd /k "npm run dev"
cd ..
echo ✅ Backend server started on port 3001
echo.

REM Start Frontend Dashboard
echo 🌐 Starting Frontend Dashboard...
cd frontend\andon-dashboard
if not exist node_modules (
    echo 📦 Installing frontend dependencies...
    npm install
)
start "Frontend Dashboard" cmd /k "npm start"
cd ..\..
echo ✅ Frontend dashboard started on port 3000
echo.