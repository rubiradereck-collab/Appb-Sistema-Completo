@echo off
REM ==========================================================================
REM  Respaldo diario de la base dbincidencias (Sistema de Incidencias APPB)
REM
REM  - Guarda un archivo .backup por ejecucion en DESTINO.
REM  - Borra los respaldos con mas de DIAS_A_GUARDAR dias.
REM  - Si COPIA_EXTERNA tiene una ruta, copia ahi el respaldo (otro equipo o
REM    carpeta de red), para no perderlo si falla el disco del servidor.
REM
REM  La contrasena NO va en este archivo: se lee de PGPASSFILE (ver guia).
REM ==========================================================================

set PGBIN=C:\Program Files\PostgreSQL\18\bin
set DESTINO=C:\Respaldos\APPB
set DIAS_A_GUARDAR=30
set COPIA_EXTERNA=
set PGPASSFILE=C:\Respaldos\pgpass.conf

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmm"') do set FECHA=%%i
if not exist "%DESTINO%" mkdir "%DESTINO%"

set ARCHIVO=%DESTINO%\dbincidencias_%FECHA%.backup
"%PGBIN%\pg_dump.exe" -h 127.0.0.1 -U postgres -F c -f "%ARCHIVO%" dbincidencias
if errorlevel 1 (
    echo %date% %time% ERROR: fallo el respaldo >> "%DESTINO%\respaldo.log"
    exit /b 1
)
echo %date% %time% OK: %ARCHIVO% >> "%DESTINO%\respaldo.log"

if not "%COPIA_EXTERNA%"=="" copy /Y "%ARCHIVO%" "%COPIA_EXTERNA%\" >nul

forfiles /p "%DESTINO%" /m *.backup /d -%DIAS_A_GUARDAR% /c "cmd /c del @path" 2>nul
exit /b 0
