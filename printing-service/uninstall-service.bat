@echo off
echo Desinstalando Restaurant Print Service...

REM Detener el servicio
sc stop RestaurantPrintService

REM Esperar un momento
timeout /t 2 /nobreak > nul

REM Eliminar el servicio
sc delete RestaurantPrintService

echo Servicio desinstalado correctamente.
pause
