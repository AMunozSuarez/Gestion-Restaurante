@echo off

REM Ruta al ejecutable del servicio
set SERVICE_NAME=RestaurantPrintService
set EXECUTABLE_PATH="%~dp0publish\PrintingService.exe"

REM Crear el servicio
sc create %SERVICE_NAME% binPath= "%EXECUTABLE_PATH%" start= auto DisplayName= "Restaurant Print Service"

REM Iniciar el servicio
sc start %SERVICE_NAME%

echo Servicio %SERVICE_NAME% registrado e iniciado correctamente.
pause