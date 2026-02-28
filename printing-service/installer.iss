[Setup]
AppName=Restaurant Printing Service
AppVersion=1.0
AppPublisher=Tu Empresa S.L.
AppPublisherURL=https://tu-sitio-web.com
AppSupportURL=https://tu-sitio-web.com/soporte
AppUpdatesURL=https://tu-sitio-web.com
AppId={{A8B4C6D2-E9F1-4A3B-8C7D-2E1F9A6B4C8D}} // doble llave para escapar
AppCopyright=Copyright (C) 2025 Tu Empresa S.L.
VersionInfoVersion=1.0.0.0
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

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Run]
Filename: "sc.exe"; Parameters: "create RestaurantPrintService binPath= ""{app}\PrintingService.exe"" start= auto DisplayName= ""Restaurant Print Service"""; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "start RestaurantPrintService"; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "sc.exe"; Parameters: "stop RestaurantPrintService"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete RestaurantPrintService"; Flags: runhidden waituntilterminated