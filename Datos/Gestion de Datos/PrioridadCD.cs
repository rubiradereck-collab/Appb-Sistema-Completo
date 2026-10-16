using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class PrioridadCD
    {
        public static List<sp_Prioridades_ListarResult> ListarPrioridades()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_prioridades_listar()",
                dr => new sp_Prioridades_ListarResult
                {
                    IdPrioridad = Entero(dr, "idprioridad"),
                    Nombre = Texto(dr, "nombre")
                }),
                "Error al ejecutar el procedimiento Listar prioridades");
        }

        public static void InsertarPrioridad(Entidades.Gestion_de_Entidades.Prioridad oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_prioridades_insertar(@nombre)",
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre)),
                "Error al insertar en la tabla Prioridades");
        }

        public static void ModificarPrioridad(Entidades.Gestion_de_Entidades.Prioridad oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_prioridades_modificar(@id, @nombre)",
                P("id", NpgsqlDbType.Integer, oc.IdPrioridad),
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre)),
                "Error al modificar en la tabla Prioridades");
        }

        public static void EliminarPrioridad(Entidades.Gestion_de_Entidades.Prioridad oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_prioridades_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oc.IdPrioridad)),
                "Error al eliminar en la tabla Prioridades");
        }
    }
}
