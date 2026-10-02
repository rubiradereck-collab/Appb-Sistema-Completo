#define MyAppName "APPB Incidencias"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "APPB"
#define MyAppExeName "Presentacion.exe"

[Setup]
AppId={{82B9F472-FD77-4A5A-8DFF-B5B0A6475517}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=Output
OutputBaseFilename=Instalador_APPB_v{#MyAppVersion}
SetupIconFile=Presentacion\icon1.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
WizardStyle=modern
CloseApplications=force

[Languages]
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startmenuicon"; Description: "Crear un icono en el menú Inicio"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "Presentacion\bin\Release\Presentacion.exe.config"; DestDir: "{app}"; Flags: onlyifdoesntexist
Source: "Presentacion\bin\Release\*"; DestDir: "{app}"; Excludes: "*.pdb,*.xml,*.vshost.*,Presentacion.exe.config"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir APPB al terminar"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  netVersion: Cardinal;
begin
  Result := True;
  // Check for .NET 4.7.2 (Release 461808)
  if RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', netVersion) then
  begin
    if netVersion < 461808 then
    begin
      MsgBox('Esta aplicación requiere .NET Framework 4.7.2 o superior.'#13#13'Por favor, instálelo desde el sitio web de Microsoft y vuelva a intentarlo.', mbError, MB_OK);
      Result := False;
    end;
  end
  else
  begin
    MsgBox('No se detectó .NET Framework en su sistema.'#13#13'Esta aplicación requiere .NET Framework 4.7.2 o superior.', mbError, MB_OK);
    Result := False;
  end;
end;

