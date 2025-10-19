[Setup]
AppName=Restaurant Printing Service
AppVersion=1.0
DefaultDirName={autopf}\RestaurantPrintingService
DefaultGroupName=Restaurant Printing Service
OutputDir=output
OutputBaseFilename=RestaurantPrintingServiceInstaller
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Run]
Filename: "sc.exe"; Parameters: "create RestaurantPrintService binPath= ""{app}\PrintingService.exe"" start= auto DisplayName= ""Restaurant Print Service"""; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "start RestaurantPrintService"; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "sc.exe"; Parameters: "stop RestaurantPrintService"; Flags: runhidden waituntilterminated
Filename: "sc.exe"; Parameters: "delete RestaurantPrintService"; Flags: runhidden waituntilterminated