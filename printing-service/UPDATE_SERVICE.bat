@echo off
echo ========================================
echo  UPDATE INSTALLED SERVICE
echo ========================================
echo.
echo Este script actualizara el servicio instalado
echo con la nueva version compilada.
echo.

:: Check for admin rights
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Este script debe ejecutarse como Administrador!
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo [1/4] Deteniendo servicio...
sc stop RestaurantPrintService
timeout /t 3 /nobreak >nul
echo Servicio detenido.
echo.

echo [2/4] Recompilando proyecto...
dotnet build -c Release -o publish

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED!
    echo.
    pause
    exit /b 1
)
echo Compilacion exitosa.
echo.

echo [3/4] Buscando ruta del servicio instalado...
for /f "tokens=2*" %%a in ('sc qc RestaurantPrintService ^| findstr BINARY_PATH_NAME') do set SERVICE_PATH=%%b

:: Limpiar comillas de la ruta
set SERVICE_PATH=%SERVICE_PATH:"=%

if "%SERVICE_PATH%"=="" (
    echo ERROR: No se pudo encontrar la ruta del servicio instalado.
    echo Copia manualmente: publish\PrintingService.exe
    echo A la ubicacion donde instalaste el servicio.
    pause
    exit /b 1
)

echo Ruta del servicio: %SERVICE_PATH%
echo.

echo Actualizando ejecutable...
copy /Y publish\PrintingService.exe "%SERVICE_PATH%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo copiar el ejecutable.
    echo Intenta copiar manualmente:
    echo   Desde: %~dp0publish\PrintingService.exe
    echo   Hasta: %SERVICE_PATH%
    pause
    exit /b 1
)
echo Ejecutable actualizado.
echo.

echo [4/4] Iniciando servicio...
sc start RestaurantPrintService
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  SERVICIO ACTUALIZADO EXITOSAMENTE
echo ========================================
echo.
echo El servicio esta corriendo con la nueva version.
echo Puedes verificar en: http://localhost:8088/health
echo.
pause
