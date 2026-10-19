# Paridad entre la app de escritorio y la app móvil/PWA

Actualizado en la Etapa 4 (octubre de 2026). La versión anterior de este documento afirmaba una
paridad del 100 % que no era real (por ejemplo, el perfil de la app no guardaba los cambios).
Aquí se indica lo que hace cada canal hoy.

Arquitectura: el escritorio (C#) se conecta directo a PostgreSQL con el usuario `appb_escritorio`,
que solo puede ejecutar las funciones `sp_*`. La app móvil/PWA usa la API Node.js (JWT). Las dos
comparten la misma base de datos y, desde las etapas 2 a 4, las mismas reglas de negocio.

| Módulo | Escritorio | App móvil | Paridad |
|---|---|---|---|
| Inicio de sesión | BCrypt; bloqueo 5 intentos / 5 min; recuperación con clave temporal de 30 min | Igual (misma función de bloqueo en la BD; misma recuperación) | Completa |
| Perfil | Datos, foto (2 MB), contraseña | Datos, foto (2 MB), contraseña, enlace al Bot | Completa |
| Incidencias: crear | Todos los campos; tipo del catálogo | Todos los campos; tipo del catálogo | Completa |
| Incidencias: editar | Todos los campos según el rol; control de concurrencia | Estado, observaciones y "asignarme"; control de concurrencia | Parcial: la app no edita área, tipo ni descripción |
| Incidencias: anular / borrar | Anular (admin, con motivo) y borrado definitivo explícito | Anular (admin, con motivo) | Parcial: borrado definitivo solo en escritorio |
| Encuesta de satisfacción | — (se responde en la app o en Telegram) | Calificar 1 a 5 en el detalle del ticket | Solo app y Telegram |
| Dashboard | Tarjetas, adopción, gráficos, filtros (incluye mes anterior), envío por correo | Tarjetas, gráficos, filtros, exportación | Completa en lo esencial |
| Informe final y línea base | Sí (Dashboard → Informe final) | No | Solo escritorio |
| Reportes PDF/Excel de incidencias | Sí | Sí (generados en el teléfono) | Completa |
| Guías | CRUD con tipo; envío a un correo, a todos o por área; PDF/Excel | CRUD con tipo; envío a un correo, a todos o por área; PDF/Excel | Completa |
| Catálogo de tipos de incidencia | Sí (Áreas → Tipos de incidencia) | No hay pantalla (la API ya tiene las rutas) | Solo escritorio |
| Usuarios | CRUD con área; restablecer contraseña | CRUD con área; restablecer contraseña | Completa |
| Áreas | CRUD | CRUD | Completa |
| Auditoría | Consulta | Consulta | Completa |

## Diferencias que se mantienen a propósito

- **Borrado definitivo de incidencias:** solo en el escritorio, para limpiar registros de prueba o
  duplicados. Lo normal es anular.
- **Informe final, línea base y catálogo de tipos:** son tareas de administración poco frecuentes;
  quedaron en el escritorio.

## Límite conocido

Quien tenga la cadena de conexión de `appb_escritorio` puede llamar a las funciones `sp_*` por
fuera de la app. Cerrarlo del todo requiere que el escritorio también pase por la API.
