@echo off
echo.
echo ==========================================
echo    🔧 ANDON SYSTEM - INITIAL SETUP
echo ==========================================
echo.

REM Check Node.js installation
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed
for /f "tokens=*" %%i in ('node --version') do echo    Version: %%i
echo.

REM Check npm installation
echo 🔍 Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not available
    pause
    exit /b 1
)
echo ✅ npm is available
for /f "tokens=*" %%i in ('npm --version') do echo    Version: %%i
echo.

REM Setup backend
echo 📦 Setting up backend...
cd backend
if not exist package.json (
    echo ❌ Backend package.json not found
    cd ..
    pause
    exit /b 1
)
npm install
if errorlevel 1 (
    echo ❌ Backend npm install failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
echo.

REM Setup database
echo 🗄️ Setting up database...
npm run setup
if errorlevel 1 (
    echo ❌ Database setup failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Database setup completed
echo.

REM Seed initial data
echo 🌱 Seeding initial data...
npm run seed
if errorlevel 1 (
    echo ⚠️ Data seeding failed (continuing anyway)
) else (
    echo ✅ Initial data seeded
)
cd ..
echo.

REM Setup frontend
echo 🌐 Setting up frontend...
if not exist "frontend\andon-dashboard" (
    echo 📱 Creating React app...
    cd frontend
    npx create-react-app andon-dashboard
    cd ..
)

cd frontend\andon-dashboard
if not exist package.json (
    echo ❌ Frontend package.json not found
    cd ..\..
    pause
    exit /b 1
)
npm install
if errorlevel 1 (
    echo ❌ Frontend npm install failed
    cd ..\..
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
echo.

REM Install additional frontend dependencies
echo 📦 Installing additional frontend dependencies...
npm install socket.io-client recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo ✅ Additional dependencies installed
cd ..\..
echo.

REM Create folders
echo 📁 Creating required folders...
if not exist "backend\database" mkdir "backend\database"
if not exist "mosquitto\data" mkdir "mosquitto\data"
if not exist "mosquitto\log" mkdir "mosquitto\log"
if not exist "docs" mkdir "docs"
echo ✅ Folders created
echo.

echo ==========================================
echo    🎉 SETUP COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo Next steps:
echo 1. Run 'install-mqtt.bat' to install MQTT broker
echo 2. Run 'start-all.bat' to start all services
echo 3. Open http://localhost:3000 for dashboard
echo.
pause