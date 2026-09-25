[Setup]
AppName=APPB Gestión
AppVersion=1.0
DefaultDirName={autopf}\APPB
DefaultGroupName=APPB
OutputDir=Instalador
OutputBaseFilename=Instalador_APPB
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "Presentacion\bin\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\APPB"; Filename: "{app}\Presentacion.exe"
Name: "{autodesktop}\APPB"; Filename: "{app}\Presentacion.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Presentacion.exe"; Description: "{cm:LaunchProgram,APPB}"; Flags: nowait postinstall skipifsilent
