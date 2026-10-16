# Migración de SQL Server a PostgreSQL

El sistema completo (escritorio WinForms, Bot de Telegram y API Node de la app móvil) ahora usa PostgreSQL.

## Pasos para el despliegue

1. **Instalar PostgreSQL** (versión 13 o superior; probado con 16) en el servidor.

2. **Crear la base de datos** (como usuario `postgres`):
   ```
   psql -U postgres -c "CREATE DATABASE dbincidencias"
   psql -U postgres -d dbincidencias -f BD_Completa.sql
   ```
   Al final de `BD_Completa.sql` hay un bloque comentado para crear el usuario `appb_app` con sus permisos.

3. **Copiar los datos actuales desde SQL Server** (una sola vez):
   - En `api-mock/.env` llenar las variables `DB_*` (PostgreSQL) y `SQLSERVER_*` (base anterior). Ver `api-mock/.env.example`.
   - `cd api-mock && npm install && node migrar_datos_sqlserver_a_postgres.js`
   - Conserva los Id, así que los números de ticket (`Solicitud-00042`) no cambian. Si algo falla, no se guarda nada.

4. **Actualizar la cadena de conexión** en el `App.config` de `Presentacion` y de `Bot` (mismo nombre de siempre, nuevo formato):
   ```xml
   <add name="Datos.Properties.Settings.DBIncidenciasConnectionString2"
        connectionString="Host=131.150.25.22;Port=5432;Database=dbincidencias;Username=appb_app;Password=...;SSL Mode=Prefer"
        providerName="Npgsql" />
   ```
   Copiar también los `bindingRedirect` nuevos de `App.config.example` (System.Collections.Immutable, Microsoft.Extensions.Logging.Abstractions, etc.).

5. **Restaurar paquetes NuGet** en Visual Studio (clic derecho en la solución → *Restaurar paquetes NuGet*) y compilar.

6. **API Node**: actualizar `api-mock/.env` con `DB_PORT=5432` y los datos de PostgreSQL, luego `npm install` y reiniciar el servicio.

## Qué cambió

| Antes (SQL Server) | Ahora (PostgreSQL) |
|---|---|
| LINQ to SQL (`BDIncidencias.dbml`) | Npgsql 8 (`Datos/Base de Datos/Conexion.cs`) |
| Procedimientos `sp_*` | Funciones `sp_*` con los mismos parámetros |
| `FilaVersion` tipo `rowversion` | Contador `BIGINT` con trigger, expuesto como `byte[]` |
| `bit`, `varchar(max)`, `varbinary(max)` | `boolean`, `text`, `bytea` |
| Comparaciones sin mayúsculas (collation CI) | Columnas `citext` (usuario, correo, rol, catálogos) |
| `GETDATE()` | `LOCALTIMESTAMP` con zona `America/Guayaquil` |
| Paquete `mssql` en la API | Paquete `pg` (`api-mock/db_postgres.js`) |

Las capas Lógica, Presentación, Reportes y Bot no cambian: siguen usando las mismas clases `sp_*_ListarResult`.

## Correcciones incluidas

- **Editar incidencias desde el escritorio**: `ShowIncidencia` no copiaba `FilaVersion`, así que guardar cambios siempre mostraba "Conflicto de edición". Ahora se copia.
- **Horas en la app móvil**: `mssql` leía las fechas como UTC, y las incidencias creadas en el escritorio aparecían con 5 horas de diferencia en el celular. Ahora la API interpreta las fechas como hora de Ecuador (`DB_TZ_OFFSET`).
- Las incidencias creadas desde la app guardan la hora del servidor de BD en lugar de la del servidor Node.

El script original de SQL Server queda como referencia en `BD_Completa_SQLServer.sql`.
