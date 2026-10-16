using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class AreaCD
    {
        public static List<sp_Areas_ListarResult> ListarAreas()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_areas_listar()",
                dr => new sp_Areas_ListarResult
                {
                    IdArea = Entero(dr, "idarea"),
                    NombreArea = Texto(dr, "nombrearea")
                }),
                "Error al ejecutar el procedimiento Listar áreas");
        }

        public static void InsertarArea(Entidades.Gestion_de_Entidades.Area oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_areas_insertar(@nombre)",
                P("nombre", NpgsqlDbType.Varchar, oc.NombreArea)),
                "Error al insertar en la tabla Areas");
        }

        public static void ModificarArea(Entidades.Gestion_de_Entidades.Area oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_areas_modificar(@id, @nombre)",
                P("id", NpgsqlDbType.Integer, oc.IdArea),
                P("nombre", NpgsqlDbType.Varchar, oc.NombreArea)),
                "Error al modificar en la tabla Areas");
        }

        public static void EliminarArea(Entidades.Gestion_de_Entidades.Area oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_areas_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oc.IdArea)),
                "Error al eliminar en la tabla Areas");
        }
    }
}
