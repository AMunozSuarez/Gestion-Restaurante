@echo off
echo ========================================
echo  DEV MODE - Quick Rebuild
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Building project...
dotnet build -c Release -o publish

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo.
echo [2/2] Build successful!
echo.
echo Now you can run: run-console.bat
echo Or manually: .\publish\PrintingService.exe
echo.
pause
