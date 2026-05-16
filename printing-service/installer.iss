[Setup]
AppName=Restaurant Printing Service
AppVersion=1.2
AppPublisher=Tu Empresa S.L.
AppPublisherURL=https://tu-sitio-web.com
AppSupportURL=https://tu-sitio-web.com/soporte
AppUpdatesURL=https://tu-sitio-web.com
AppId={{A8B4C6D2-E9F1-4A3B-8C7D-2E1F9A6B4C8D}} // doble llave para escapar
AppCopyright=Copyright (C) 2025 Tu Empresa S.L.
VersionInfoVersion=1.2.0.0
VersionInfoCompany=Tu Empresa S.L.
VersionInfoDescription=Servicio de impresion para sistema de restaurante
VersionInfoCopyright=Copyright (C) 2025 Tu Empresa S.L.
DefaultDirName={autopf}\RestaurantPrintingService
DefaultGroupName=Restaurant Printing Service
OutputDir=output
OutputBaseFilename=RestaurantPrintingServiceInstaller
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupLogging=yes
AllowNoIcons=yes
DisableWelcomePage=no
CloseApplications=yes
RestartApplications=yes
UninstallDisplayIcon={app}\PrintingService.exe

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Detener servicio si existe
Filename: "sc.exe"; Parameters: "stop RestaurantPrintService"; Flags: runhidden waituntilterminated; StatusMsg: "Deteniendo servicio anterior..."; 
; Dar tiempo a que se detenga
Filename: "cmd.exe"; Parameters: "/c timeout /t 2"; Flags: runhidden waituntilterminated; StatusMsg: "Esperando...";
; Crear o actualizar servicio
Filename: "sc.exe"; Parameters: "delete RestaurantPrintService"; Flags: runhidden waituntilterminated; StatusMsg: "Removiendo versión anterior del servicio..."; 
Filename: "sc.exe"; Parameters: "create RestaurantPrintService binPath= ""{app}\PrintingService.exe"" start= auto DisplayName= ""Restaurant Print Service"""; Flags: runhidden waituntilterminated; StatusMsg: "Instalando servicio actualizado...";
; Iniciar el nuevo servicio
Filename: "sc.exe"; Parameters: "start RestaurantPrintService"; Flags: runhidden waituntilterminated; StatusMsg: "Iniciando servicio...";

[UninstallRun]
Filename: "sc.exe"; Parameters: "stop RestaurantPrintService"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete RestaurantPrintService"; Flags: runhidden waituntilterminated

[Code]
// Función para verificar si una versión anterior está instalada
function InitializeSetup(): Boolean;
begin
  // Si la aplicación ya está instalada, permitir actualización
  Result := True;
end;

// Antes de instalar, detener el servicio si existe
procedure CurStepChanged(CurStep: TSetupStep);
var
  ErrorCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    // Intentar detener el servicio Windows
    ShellExec('open', 'sc.exe', 'stop RestaurantPrintService', '', SW_HIDE, True, ErrorCode);
  end;
end;