@echo off
echo Starting Restaurant Print Service in Console Mode...
echo This is useful for testing and debugging
echo Press Ctrl+C to stop the service
echo.

cd /d "%~dp0"

if not exist "publish\PrintingService.exe" (
    echo ERROR: PrintingService.exe not found in publish folder
    echo Please run build.bat first
    echo.
    pause
    exit /b 1
)

echo Starting service...
echo.

"%~dp0publish\PrintingService.exe"

pause
