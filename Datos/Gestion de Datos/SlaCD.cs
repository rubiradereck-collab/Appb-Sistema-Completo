using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public static class SlaCD
    {
        public static bool YaEscalado(int idIncidencia)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT COUNT(*) FROM incidencias WHERE idincidencia = @id AND escaladosla = TRUE",
                P("id", NpgsqlDbType.Integer, idIncidencia)) > 0,
                "Error al verificar el escalamiento SLA");
        }

        public static void MarcarEscalado(int idIncidencia)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "UPDATE incidencias SET escaladosla = TRUE WHERE idincidencia = @id",
                P("id", NpgsqlDbType.Integer, idIncidencia)),
                "Error al marcar el escalamiento SLA");
        }
    }
}
