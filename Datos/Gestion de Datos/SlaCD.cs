using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public static class SlaCD
    {
        // enProceso = false: aviso de SLA en "Pendiente" (columna escaladosla)
        // enProceso = true:  aviso de SLA en "En Proceso" (columna escaladoslaproceso, Etapa 2)
        // Solo los usa el Bot, que corre en el servidor con appb_app.

        public static bool YaEscalado(int idIncidencia, bool enProceso = false)
        {
            string columna = enProceso ? "escaladoslaproceso" : "escaladosla";
            return ManejoErrores.Intentar(() => EscalarEntero(
                $"SELECT COUNT(*) FROM incidencias WHERE idincidencia = @id AND {columna} = TRUE",
                P("id", NpgsqlDbType.Integer, idIncidencia)) > 0,
                "Error al verificar el escalamiento SLA");
        }

        public static void MarcarEscalado(int idIncidencia, bool enProceso = false)
        {
            string columna = enProceso ? "escaladoslaproceso" : "escaladosla";
            ManejoErrores.Intentar(() => Ejecutar(
                $"UPDATE incidencias SET {columna} = TRUE WHERE idincidencia = @id",
                P("id", NpgsqlDbType.Integer, idIncidencia)),
                "Error al marcar el escalamiento SLA");
        }
    }
}
