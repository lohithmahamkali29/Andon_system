@echo off
echo.
echo ==========================================
echo    🛑 ANDON SYSTEM - STOPPING ALL SERVICES
echo ==========================================
echo.

REM Stop Node.js processes
echo 🔄 Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️ No Node.js processes found
) else (
    echo ✅ Node.js processes stopped
)

REM Stop MQTT Broker
echo 🔄 Stopping MQTT Broker...
taskkill /F /IM mosquitto.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️ MQTT Broker not running
) else (
    echo ✅ MQTT Broker stopped
)

REM Stop any remaining processes
echo 🔄 Stopping remaining processes...
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Backend Server" >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq Frontend Dashboard" >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq MQTT Broker" >nul 2>&1

echo.
echo ==========================================
echo    ✅ ALL SERVICES STOPPED SUCCESSFULLY!
echo ==========================================
echo.
pause
