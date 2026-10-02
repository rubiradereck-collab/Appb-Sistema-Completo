@echo off
echo ===========================================
echo Generando Instalador APPB (Release 1.1.0)
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

echo [1/2] Compilando la solucion en Release...
"%MSBUILD_PATH%" Appb.sln /t:Rebuild /p:Configuration=Release
if %errorlevel% neq 0 (
  echo.
  echo ERROR: La compilacion fallo. Deteniendo el proceso.
  pause
  exit /b %errorlevel%
)

echo.
echo [2/2] Generando instalador con Inno Setup...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" generar_instalador.iss
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Inno Setup fallo.
  pause
  exit /b %errorlevel%
)

echo.
echo EXITO: El instalador se ha generado correctamente en la carpeta Output\
pause
