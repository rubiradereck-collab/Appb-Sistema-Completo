using Npgsql;
using System;

namespace Datos
{
    /// <summary>
    /// Traduce PostgresException (violaciones de UNIQUE, FOREIGN KEY, etc.) a mensajes
    /// entendibles para el usuario final, en vez de mostrar el texto crudo de PostgreSQL.
    /// Se usa desde las clases ...CD antes de envolver el error en DatosExcepciones.
    /// </summary>
    public static class SqlErrorTraductor
    {
        // Códigos SQLSTATE de PostgreSQL que nos interesa traducir.
        private const string ERROR_UNIQUE_VIOLATION = "23505";
        private const string ERROR_FOREIGN_KEY_VIOLATION = "23503";

        public static string Traducir(PostgresException ex, string mensajePorDefecto)
        {
            switch (ex.SqlState)
            {
                case ERROR_UNIQUE_VIOLATION:
                    return TraducirUnique(ex);

                case ERROR_FOREIGN_KEY_VIOLATION:
                    return TraducirForeignKey(ex);

                default:
                    return mensajePorDefecto;
            }
        }

        private static string TraducirUnique(PostgresException ex)
        {
            string restriccion = ex.ConstraintName ?? ex.MessageText;

            if (Contiene(restriccion, "uq_usuarios_correo"))
                return "Ya existe un usuario registrado con ese correo.";

            if (Contiene(restriccion, "uq_usuarios_usuario"))
                return "Ya existe un usuario registrado con ese nombre de usuario.";

            return "Ya existe un registro con esos datos (violación de restricción única).";
        }

        private static string TraducirForeignKey(PostgresException ex)
        {
            // PostgreSQL: "update or delete on table ... violates foreign key constraint ..."
            bool esEliminacion = Contiene(ex.MessageText, "update or delete on table");
            string restriccion = ex.ConstraintName ?? ex.MessageText;

            if (Contiene(restriccion, "fk_incidencias_areas"))
                return esEliminacion
                    ? "No se puede eliminar esta área porque tiene incidencias asociadas."
                    : "El área seleccionada no es válida.";

            if (Contiene(restriccion, "fk_incidencias_prioridades"))
                return esEliminacion
                    ? "No se puede eliminar esta prioridad porque tiene incidencias asociadas."
                    : "La prioridad seleccionada no es válida.";

            if (Contiene(restriccion, "fk_incidencias_estados"))
                return esEliminacion
                    ? "No se puede eliminar este estado porque tiene incidencias asociadas."
                    : "El estado seleccionado no es válido.";

            if (Contiene(restriccion, "fk_incidencias_tecnico"))
                return esEliminacion
                    ? "No se puede eliminar este usuario porque tiene incidencias asignadas como técnico."
                    : "El técnico seleccionado no es válido.";

            return esEliminacion
                ? "No se puede eliminar este registro porque está siendo utilizado por otros datos."
                : "Uno de los datos referenciados no es válido.";
        }

        private static bool Contiene(string mensaje, string texto)
        {
            return mensaje != null && mensaje.IndexOf(texto, StringComparison.OrdinalIgnoreCase) >= 0;
        }
    }
}
