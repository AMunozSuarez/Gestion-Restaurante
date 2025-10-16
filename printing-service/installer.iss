[Setup]
AppName=Printing Service
AppVersion=1.0
DefaultDirName={autopf}\PrintingService
DefaultGroupName=Printing Service
OutputDir=output
OutputBaseFilename=PrintingServiceInstaller
Compression=lzma
SolidCompression=yes

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs
Source: "install-service.bat"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{app}\install-service.bat"; Description: "Registrar e iniciar el servicio"; Flags: runhidden