# Etapa 1 — Seguridad y arranque

Cambios de código incluidos en esta rama y pasos que hay que hacer en el servidor.
Los IDs (C1, A1…) son los de la auditoría técnica del 16/10/2026.

## Qué cambió en el código

| ID | Cambio | Archivos |
| --- | --- | --- |
| C1 | El Bot ya no guarda el texto de los mensajes en su log (solo el comando) y borra del chat el mensaje de `/registrar`, que lleva la contraseña. | `Bot/Program.cs` |
| A1 | Script de datos iniciales: estados, prioridades, un área y un administrador. Es seguro ejecutarlo varias veces. | `BD_Datos_Iniciales.sql` |
| A5 | `GET /api/usuarios` ya no devuelve el hash de la contraseña ni la foto. | `api-mock/index.js` |
| C4 | Rutas `PUT /api/perfil` y `PUT /api/perfil/password` (exige la contraseña actual). El perfil de la app móvil ahora guarda de verdad. Ambas quedan en la auditoría. | `api-mock/index.js`, `pwa-client/src/pages/Profile.jsx` |
| C2 | Nuevo usuario de base `appb_escritorio` que solo puede ejecutar las funciones `sp_*`; nadie puede editar ni borrar la auditoría. | `BD_Seguridad_Roles.sql` |
| C3 | Script de respaldo diario. | `scripts/respaldo_bd.bat` |

## Pasos en el servidor (en este orden)

### 1. Borrar los logs viejos del Bot

Ya contienen contraseñas en texto plano. Con el servicio del Bot detenido, borra la carpeta `logs` dentro de la carpeta del Bot.
Pide a los usuarios que se vincularon por Telegram que cambien su contraseña.

### 2. Respaldos (C3)

1. Crea la carpeta `C:\Respaldos\APPB` y copia ahí `scripts\respaldo_bd.bat`.
2. Crea `C:\Respaldos\pgpass.conf` con una sola línea (la contraseña real de `postgres`):
   ```
   127.0.0.1:5432:dbincidencias:postgres:CLAVE_DE_POSTGRES
   ```
   Clic derecho → Propiedades → Seguridad: deja acceso solo a Administradores y SYSTEM.
3. Ejecuta el `.bat` una vez a mano y revisa que aparezca un `.backup` y la línea `OK` en `respaldo.log`.
4. Prográmalo todos los días (CMD como administrador):
   ```
   schtasks /create /tn "APPB Respaldo BD" /tr "C:\Respaldos\APPB\respaldo_bd.bat" /sc daily /st 23:00 /ru SYSTEM
   ```
5. Pon en `COPIA_EXTERNA` del `.bat` una carpeta de otro equipo (por ejemplo `\\otro-servidor\respaldos`) para no depender de un solo disco.
6. **Prueba de restauración** (una vez al mes): crea una base vacía `prueba_restauracion` en pgAdmin y ejecuta
   ```
   "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h 127.0.0.1 -U postgres -d prueba_restauracion --no-owner C:\Respaldos\APPB\dbincidencias_AAAAMMDD_HHMM.backup
   ```
   Si las tablas tienen datos, el respaldo sirve. Luego borra esa base.

### 3. Permisos de base de datos (C2)

1. En pgAdmin, abre `BD_Seguridad_Roles.sql` conectado a `dbincidencias` como `postgres`, cambia la contraseña marcada con `>>>` (mínimo 8 caracteres) y ejecútalo.
2. En `pg_hba.conf` reemplaza la línea de `appb_app` por estas dos y ejecuta `SELECT pg_reload_conf();`:
   ```
   host    dbincidencias   appb_app          127.0.0.1/32       scram-sha-256
   host    dbincidencias   appb_escritorio   131.150.25.0/24    scram-sha-256
   ```
3. **Bot:** en su `Bot.exe.config` usa `Host=127.0.0.1` (con `131.150.25.22` ya no lo dejaría entrar) y sigue con `appb_app`. Reinicia el servicio.
4. **API:** su `.env` ya usa `DB_HOST=127.0.0.1` y `appb_app`: no cambia.
5. **App de escritorio:** en el `App.config` de cada PC cambia a `Username=appb_escritorio;Password=<la nueva>`.

Límite conocido: con la cadena de `appb_escritorio` todavía se pueden llamar las funciones `sp_*` por fuera de la app. Cerrarlo del todo requiere que el escritorio use la API (etapa posterior).

### 4. Instalaciones nuevas (A1)

Solo en una base nueva, después de `BD_Completa.sql`: abre `BD_Datos_Iniciales.sql`, cambia la contraseña marcada con `>>>` y ejecútalo. Entra con el usuario `admin` y cambia su correo desde el sistema.
La base actual ya tiene datos migrados: **no hace falta** ejecutarlo ahí (si se ejecuta, no duplica nada).

### 5. Publicar las versiones nuevas

- **Bot:** compilar en Release y reemplazar los archivos (paso 3.3 para el config).
- **API:** copiar `api-mock/index.js` a `C:\APPB\Appb-Sistema-Completo\api-mock` y reiniciar el servicio **APPB API Node Server**.
- **App móvil:** generar de nuevo el APK o la versión web desde `pwa-client`.
