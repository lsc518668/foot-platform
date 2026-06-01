@echo off
echo ============================================
echo  2026 World Cup Football Betting Platform
echo ============================================
echo.
echo Starting all services...
echo.

echo [1/3] Starting API Server (port 5001)...
start "Foot-API" cmd /c "set HTTPS_PROXY=&& set HTTP_PROXY=&& cd foot-platform-server && npx tsx src/index.ts"

echo [2/3] Starting Frontend (port 5002)...
start "Foot-Frontend" cmd /c "set HTTPS_PROXY=&& set HTTP_PROXY=&& cd foot-platform && npx vite --port 5002 --host"

echo [3/3] Starting Admin (port 5003)...
start "Foot-Admin" cmd /c "set HTTPS_PROXY=&& set HTTP_PROXY=&& cd foot-platform-admin && npx vite --port 5003 --host"

echo.
echo All services started!
echo   Frontend: http://localhost:5002
echo   Admin:    http://localhost:5003
echo   API:      http://localhost:5001/api
echo.
echo Admin login: admin@fifa2026.com / admin123456
echo.
pause
