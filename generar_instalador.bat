@echo off
echo ===========================================
echo Generando Instalador APPB (Release 1.2.0)
echo ===========================================

REM Buscar MSBuild
set MSBUILD_PATH=
for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe`) do (
  set MSBUILD_PATH=%%i
)

if "%MSBUILD_PATH%"=="" (
  echo No se encontro MSBuild.exe
  pause
  exit /b 1
)

echo [1/3] Restaurando paquetes NuGet...
"%MSBUILD_PATH%" APPB.slnx /t:Restore /p:RestorePackagesConfig=true
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Fallo la restauracion de NuGet.
  pause
  exit /b %errorlevel%
)

echo.
echo [2/3] Compilando la solucion en Release...
"%MSBUILD_PATH%" Presentacion\Presentacion.csproj /t:Rebuild /p:Configuration=Release
if %errorlevel% neq 0 (
  echo.
  echo ERROR: La compilacion fallo. Deteniendo el proceso.
  pause
  exit /b %errorlevel%
)

echo.
echo Verificando la configuracion compilada...
set CONFIG=Presentacion\bin\Release\Presentacion.exe.config
findstr /C:"Host=" "%CONFIG%" >nul
if errorlevel 1 (
  echo.
  echo ERROR: %CONFIG% no tiene la cadena de PostgreSQL ^(Host=...^).
  echo Corrige Presentacion\App.config y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
findstr /I /C:"Data Source=" /C:"CLAVE_DE_" /C:"TU_TOKEN" /C:"TU_NUEVO_PASSWORD" "%CONFIG%" >nul
if not errorlevel 1 (
  echo.
  echo ERROR: %CONFIG% todavia tiene la cadena de SQL Server o valores de ejemplo.
  echo Corrige Presentacion\App.config y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo.
echo [3/3] Generando instalador con Inno Setup...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" generar_instalador.iss
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Inno Setup fallo.
  pause
  exit /b %errorlevel%
)

echo.
echo EXITO: El instalador se ha generado correctamente en la carpeta Output\


