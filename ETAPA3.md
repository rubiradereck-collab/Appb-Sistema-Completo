# Etapa 3 — Guías y Fase 4 (despliegue en el servidor)

Se publica todo junto, igual que la Etapa 2. Calcula unos 30 minutos.

## Qué cambia

| Parte | Cambio |
|---|---|
| Base de datos | `usuarios.idarea`; `guias.idtipoincidencia`; tablas `guiasenvios` y `guiasenviosdetalle` (registro de envíos); `incidencias.calificacion` y `fechacalificacion`; tabla `lineabase`. |
| Escritorio | **Usuarios:** campo Área. **Guías:** campo Tipo; el envío por correo permite elegir un correo, todos los usuarios o los usuarios de un área, una guía o todas; cada envío queda registrado. **Dashboard:** botón **📑 Informe final** con la línea base y el informe del período en PDF y Excel. El reporte mensual muestra SLA cumplido y satisfacción. |
| Bot | Al resolver o cerrar un ticket le pide a quien lo reportó una calificación de 1 a 5 con botones. El correo del reporte mensual incluye SLA cumplido y satisfacción. |
| API | Área en usuarios; tipo en guías; envío de guías por área; registro de envíos (`/api/guias-envios`); calificación (`POST /api/incidencias/:id/calificacion`); auditoría de áreas y guías. Al resolver o cerrar desde el escritorio o la app también se pide la calificación por Telegram. **Arreglado:** `/api/reportes/incidencias/pdf` (error 500) y editar un usuario desde la app ya no desvincula su Telegram. |
| App móvil | Área en usuarios; tipo en guías; envío de guías por área; calificación en el detalle del ticket. |

## Encuesta de satisfacción

- La responde solo quien reportó, una vez, cuando el ticket está Resuelto o Cerrado.
- Por Telegram llega con el aviso del cambio de estado (botones 1 a 5). En la app aparece en el detalle del ticket.
- Si el ticket se reabre, la calificación se borra y se vuelve a pedir al resolverlo.
- Si no la necesitas para tu informe, no hay que desactivar nada: simplemente no se usa.

## Informe del período completo

Dashboard → **📑 Informe final**:

1. Elige el período (por defecto, desde el primer ticket hasta hoy).
2. Llena la **línea base** con lo que tengas de antes del sistema (hojas de cálculo, correos). Todo es opcional menos la descripción del período. Se guarda cada versión y se usa la última.
3. Genera el PDF o el Excel.

Incluye: comparativo antes del sistema / primer mes / último mes / período completo, evolución mes a mes (registradas, resueltas, tiempo de resolución, primera respuesta, SLA cumplido, satisfacción, adopción, guías enviadas), tipos más frecuentes y cuáles no tienen guía, y el detalle de los envíos de guías.

Notas: el SLA se mide sobre tickets resueltos o cerrados (Alta 4 h, Media 24 h, Baja 72 h). La primera respuesta existe desde la Etapa 2 y la satisfacción desde esta etapa: los meses anteriores salen con "—".

## Pasos

### 1. Respaldo

```
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -Fc --create -f C:\Respaldos\APPB\antes_etapa3.dump dbincidencias
```

Copia también las carpetas actuales del Bot y de la API.

### 2. Detener el Bot y la API

En `services.msc`: **Incidencias Telegram Bot** y **APPB API Node Server**.

### 3. Script de base de datos

En pgAdmin, como **postgres** en **dbincidencias**: abre `BD_Etapa3.sql` y ejecútalo completo (F5). Al final aparece un resumen. A los usuarios que ya tenían tickets enlazados se les asigna como área aquella donde más reportaron; los demás quedan sin área.

### 4. API

Copia `api-mock\index.js`, `api-mock\db_postgres.js` y `api-mock\reports.js` (no toques `.env`) y reinicia **APPB API Node Server**.

### 5. Bot

Compila en Release y reemplaza los archivos **sin tocar `Bot.exe.config`**. Inicia el servicio.

### 6. Escritorio y app móvil

Instala la versión nueva del escritorio en cada PC (conserva su `App.config`) y genera de nuevo el APK o la versión web.

### 7. Completar datos

- En **Usuarios**, asigna el área a cada usuario (los que quedaron sin área).
- En **Guías**, asigna a cada guía su tipo de incidencia.
- En **Dashboard → Informe final**, registra la línea base.

## Pruebas

1. Usuarios: asigna un área a un usuario y guarda.
2. Guías: asigna un tipo a una guía. Envíala "a los usuarios de un área": debe llegar solo a esa área.
3. Telegram: un técnico marca Resuelto un ticket. Quien lo reportó recibe el aviso con botones 1 a 5; al tocar uno, el mensaje confirma la calificación.
4. App móvil: en un ticket resuelto propio aparece "¿Cómo calificas la atención?".
5. Dashboard → Informe final: guarda una línea base y genera el PDF y el Excel.
6. En el navegador del servidor, `http://localhost:PUERTO/api/reportes/incidencias/pdf?token=...` ya descarga el PDF (antes daba error 500). Ninguna pantalla actual usa esa ruta; queda lista para quien la necesite.
7. Auditoría: aparecen los cambios de áreas, guías, línea base y las calificaciones.

## Si hay que volver atrás

1. Detén Bot y API.
2. En `C:\Program Files\PostgreSQL\18\bin`:
   ```
   dropdb -U postgres dbincidencias
   pg_restore -U postgres -C -d postgres C:\Respaldos\APPB\antes_etapa3.dump
   ```
3. Vuelve a poner las carpetas anteriores del Bot, la API y el escritorio.
