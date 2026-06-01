@echo off
echo Building all projects...
echo.

echo [1/2] Building frontend...
cd foot-platform
call npx vite build
if %ERRORLEVEL% neq 0 (echo Frontend build FAILED && exit /b 1)
echo Frontend build OK

echo.
echo [2/2] Building admin...
cd ..\foot-platform-admin
call npx vite build
if %ERRORLEVEL% neq 0 (echo Admin build FAILED && exit /b 1)
echo Admin build OK

echo.
echo All builds completed successfully!
echo Output:
echo   Frontend: foot-platform\dist\
echo   Admin:    foot-platform-admin\dist\
cd ..
pause
