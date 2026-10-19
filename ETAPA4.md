# Etapa 4 — Pulido final (despliegue en el servidor)

Este patch va **después de la Etapa 3**. Si la Etapa 3 todavía no está desplegada, se pueden
desplegar las dos juntas: se ejecutan los scripts en orden (`BD_Etapa3.sql` y luego
`BD_Etapa4.sql`) y después se copian los programas una sola vez. Lo que dice `ETAPA3.md` sobre
completar áreas, tipos de guía y línea base sigue valiendo.

## Qué cambia

| Tema | Antes | Ahora |
|---|---|---|
| Bloqueo de login | Escritorio: 5 intentos / 5 min. API: 3 intentos / 15 min | 5 intentos / 5 min en los dos (la regla vive en la base de datos) |
| Recuperar contraseña | Cambiaba la contraseña de inmediato; sin límite; clave con `Math.random`; el escritorio decía si la cuenta existía | La clave temporal se guarda aparte y vence en 30 min; la contraseña actual sigue funcionando; 1 solicitud cada 5 min por cuenta y 5 cada 15 min por IP; clave criptográfica; mismo mensaje exista o no la cuenta |
| Foto de perfil | Escritorio 2 MB, API 10 MB | 2 MB en los dos; la API solo acepta imágenes |
| Eliminar incidencia | Borraba el registro (desaparecía de los informes) | **Anula** con motivo (queda en el historial). El borrado definitivo existe solo en el escritorio y se confirma dos veces |
| Edición simultánea en la app | Ganaba el último que guardaba | La app envía la versión que leyó; si alguien la cambió antes, avisa y recarga |
| Tomar un ticket terminado | Un botón "Aceptar" viejo de Telegram o la app podían reabrir un ticket resuelto, cerrado o anulado | Bloqueado en Telegram, app y escritorio (el administrador sí puede reabrir) |
| Errores no previstos (escritorio) | Cerraban la aplicación sin aviso | Mensaje y detalle en `%LOCALAPPDATA%\APPB\errores.log` |
| Estados en la app | Usaba Ids fijos (2 = En Proceso, 3 o más = terminado) | Busca los estados por nombre; muestra "Anulado" |
| Dashboard del escritorio | "Resueltos" no sumaba los cerrados; sin "Mes anterior" | Suma ambos; opción "Mes anterior" |
| Bot | No respondía a /start ni /ayuda | Responde con los comandos disponibles |
| Botón de Telegram en el perfil de la app | Abría un bot de ejemplo (`TuBotDeAPPB`) | Abre el Bot real (la API pregunta su nombre a Telegram) |
| `analisis_paridad.md` | Decía 100 % de paridad | Tabla real de lo que hace cada canal |

## Pasos

### 1. Respaldo

```
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -Fc --create -f C:\Respaldos\APPB\antes_etapa4.dump dbincidencias
```

Copia también las carpetas actuales del Bot y de la API.

### 2. Detener el Bot y la API

### 3. Scripts de base de datos (pgAdmin, como postgres, en dbincidencias)

- Si la Etapa 3 no está aplicada: `BD_Etapa3.sql` primero.
- Luego `BD_Etapa4.sql`.

### 4. API

Copia `api-mock\index.js`, `api-mock\db_postgres.js` y `api-mock\reports.js` (sin tocar `.env`) y
reinicia **APPB API Node Server**. Para que funcione el botón de Telegram del perfil, el `.env`
debe tener `TELEGRAM_BOT_TOKEN` (es el mismo token del Bot).

### 5. Bot

Compila en Release y reemplaza los archivos **sin tocar `Bot.exe.config`**. Inicia el servicio.

### 6. Escritorio y app móvil

Nueva versión del escritorio en cada PC (conserva su `App.config`) y nuevo APK o versión web.

## Pruebas

1. Login: 5 contraseñas malas seguidas bloquean 5 minutos, en el escritorio y en la app.
2. Recuperar contraseña (escritorio y app): llega el correo; la contraseña anterior sigue
   funcionando; al entrar con la temporal aparece el aviso para cambiarla. Pedir otra antes de
   5 minutos no envía un segundo correo.
3. Escritorio, Incidencias, botón **🚫 Anular**: "Sí" anula con motivo; "No" pide una segunda
   confirmación y borra.
4. App: abrir el mismo ticket en dos teléfonos, guardar en uno y luego en el otro: el segundo
   recibe el aviso de conflicto y recarga.
5. Telegram: tocar "Aceptar" en un ticket ya anulado muestra "Este ticket ya está Anulado".
6. Telegram: `/start` y `/ayuda` responden.
7. App, Perfil: el botón de Telegram abre el Bot real.

## Si hay que volver atrás

```
dropdb -U postgres dbincidencias
pg_restore -U postgres -C -d postgres C:\Respaldos\APPB\antes_etapa4.dump
```

Y vuelve a poner las carpetas anteriores del Bot, la API y el escritorio.
