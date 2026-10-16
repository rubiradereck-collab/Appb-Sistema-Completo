# Etapa 2 — Despliegue en el servidor

Todo se publica junto, en este orden. Calcula unos 30 minutos con el sistema detenido.

## Qué cambia

| Parte | Cambio |
|---|---|
| Base de datos | Catálogo `tiposincidencia`; en `incidencias`: `idtipoincidencia`, `idusuarioreporta`, `fechaasignacion`, `fechaprimerarespuesta`, `escaladoslaproceso`; estado **Anulado**; trigger con las reglas de fechas. |
| Escritorio | El tipo se elige del catálogo (ya no es texto libre). Nueva pantalla **Áreas → Tipos de incidencia**. Reglas por rol al guardar. Columnas "Asignada" y "1.ª Respuesta". Avisos por Telegram al asignar y en cada cambio de estado. |
| Bot | Los botones de tipo salen del catálogo. Guarda quién reportó. Texto escapado (un `_` o `*` en la descripción ya no bloquea el aviso). Avisa a quien reportó cuando un técnico acepta o cambia el estado. SLA también para "En Proceso". `/estado TICKET` ya no muestra tickets ajenos a un Usuario. |
| API | Rutas `/api/tipos-incidencia`. Validaciones: rol válido, solo técnicos activos se asignan, solo el técnico asignado cambia el estado de su ticket, solo el administrador anula. Auditoría de cambios de usuarios. Avisos por Telegram. |
| App móvil | El tipo se elige de una lista. La versión anterior sigue funcionando: si el texto no coincide con el catálogo, el ticket entra como "Otro" con el texto al inicio de la descripción. |

## Reglas que aplica la base de datos (trigger)

- **fechaasignacion**: hora en que se asignó el técnico actual (se actualiza si se reasigna).
- **fechaprimerarespuesta**: la primera vez que se toma el ticket o sale de "Pendiente". No cambia después.
- **fechasolucion**: solo existe en Resuelto o Cerrado. Al reabrir o anular se borra.
- Al reabrir, se reinician los avisos de SLA.
- Tickets anteriores a la Etapa 2: `fechaasignacion` y `fechaprimerarespuesta` quedan vacías (esa hora no se guardó).

SLA "En Proceso": mismos límites por prioridad (Alta 4 h, Media 24 h, Baja 72 h), contados desde la asignación. Avisa al técnico asignado y a los administradores.

## Pasos

### 1. Respaldo (obligatorio)

```
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -Fc --create -f C:\Respaldos\APPB\antes_etapa2.dump dbincidencias
```

Guarda también una copia de las carpetas actuales del Bot, la API y el escritorio.

### 2. Detener el Bot y la API

En `services.msc`: detén **Incidencias Telegram Bot** y **APPB API Node Server**.

### 3. Script de base de datos

En pgAdmin, conectado como **postgres** a **dbincidencias**: abre `BD_Etapa2.sql` en el Query Tool y ejecútalo completo (F5).

Al final aparece un resumen. Revisa:

- **Estados** debe terminar en `5=Anulado`.
- **Tipos inactivos**: son textos que se escribieron a mano en el escritorio. Quedan guardados pero no se ofrecen al reportar. Desde el escritorio, en Áreas → Tipos de incidencia, puedes activarlos, renombrarlos o dejarlos así.
- **Tickets con usuario que reporta**: los que no se enlazaron tienen un nombre que no coincide con ningún usuario o que coincide con dos. Siguen funcionando por nombre.

Si algo falla, el script no deja cambios a medias (todo va en una transacción).

Funciona antes o después de `BD_Seguridad_Roles.sql`. Si ese script ya se ejecutó, este vuelve a dar los permisos a `appb_escritorio` para las funciones nuevas.

### 4. API

Copia `api-mock/index.js` y `api-mock/db_postgres.js` a la carpeta de la API del servidor (no toques `.env`) y reinicia **APPB API Node Server**.

Esto también aplica el cambio de la Etapa 1 que faltaba en el servidor (`/api/usuarios` sin hashes).

### 5. Bot

Compila en Release y reemplaza los archivos **sin tocar `Bot.exe.config`**. Inicia el servicio.

### 6. Escritorio

Instala la nueva versión en cada PC. El `App.config` de cada equipo se conserva.

### 7. App móvil

Genera de nuevo el APK o la versión web.

## Pruebas

1. Escritorio (admin): Áreas → Tipos de incidencia. Crea uno, renómbralo, desactívalo.
2. Telegram: `/reportar`. Los tipos deben ser los del catálogo y no debe salir el que desactivaste. Usa una descripción con `_` y `*`: el técnico debe recibir el aviso igual.
3. Técnico acepta en Telegram: quien reportó recibe "Tu Solicitud-XXXXX fue asignada a…".
4. Técnico marca Resuelto: quien reportó recibe el nuevo estado y la observación.
5. Escritorio (admin): reabre ese ticket (Pendiente). La "Fecha Solución" debe quedar vacía.
6. Escritorio (técnico): intenta cambiar el estado de un ticket de otro técnico. Debe impedirlo.
7. App móvil (usuario): crea un ticket eligiendo el tipo de la lista.
8. Auditoría: deben aparecer los cambios de usuarios y de tipos.

## Si hay que volver atrás

1. Detén Bot y API.
2. Borra la base y restáurala completa desde el respaldo (restaurar encima dejaría funciones nuevas que chocan con las anteriores). En la carpeta `C:\Program Files\PostgreSQL\18\bin`:
   ```
   dropdb -U postgres dbincidencias
   pg_restore -U postgres -C -d postgres C:\Respaldos\APPB\antes_etapa2.dump
   ```
   Si `dropdb` dice que hay conexiones abiertas, cierra pgAdmin y las apps de escritorio.
3. Vuelve a poner las carpetas anteriores del Bot, la API y el escritorio.
