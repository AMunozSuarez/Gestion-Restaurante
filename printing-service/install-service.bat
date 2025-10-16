@echo off

REM Ruta al ejecutable del servicio
set SERVICE_NAME=PrintingService
set EXECUTABLE_PATH="%~dp0publish\PrintingService.runtimeconfig.json"

REM Crear el servicio
sc create %SERVICE_NAME% binPath= "%EXECUTABLE_PATH%" start= auto

REM Iniciar el servicio
sc start %SERVICE_NAME%

echo Servicio %SERVICE_NAME% registrado e iniciado correctamente.