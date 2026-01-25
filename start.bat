@echo off
REM Chat Application Startup Script for Windows

echo.
echo ============================================
echo   Chatify - Production Chat Application
echo ============================================
echo.

REM Check if .env exists
if not exist "backend\.env" (
    echo ❌ Error: backend\.env not found
    echo Please create .env file with required variables
    exit /b 1
)

echo ✅ Backend configuration found
echo.
echo Starting application...
echo.

REM Open two terminal windows
echo Starting Backend (Port 8200)...
start cmd /k "cd backend && npm start"

timeout /t 3 /nobreak

echo Starting Frontend (Port 5173)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   Application Starting...
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8200
echo API:      http://localhost:8200/api
echo.
echo Press Ctrl+C in either terminal to stop
echo.
