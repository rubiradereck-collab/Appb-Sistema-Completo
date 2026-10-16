using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class TipoIncidenciaCD
    {
        public static List<sp_TiposIncidencia_ListarResult> ListarTipos(bool soloActivos)
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_tiposincidencia_listar(@soloactivos)",
                dr => new sp_TiposIncidencia_ListarResult
                {
                    IdTipoIncidencia = Entero(dr, "idtipoincidencia"),
                    Nombre = Texto(dr, "nombre"),
                    Activo = Logico(dr, "activo"),
                    TotalIncidencias = Entero(dr, "totalincidencias")
                },
                P("soloactivos", NpgsqlDbType.Boolean, soloActivos)),
                "Error al ejecutar el procedimiento Listar tipos de incidencia");
        }

        public static int InsertarTipo(Entidades.Gestion_de_Entidades.TipoIncidencia oc)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_tiposincidencia_insertar(@nombre, @activo)",
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre),
                P("activo", NpgsqlDbType.Boolean, oc.Activo)),
                "Error al insertar en la tabla TiposIncidencia");
        }

        public static void ModificarTipo(Entidades.Gestion_de_Entidades.TipoIncidencia oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_tiposincidencia_modificar(@id, @nombre, @activo)",
                P("id", NpgsqlDbType.Integer, oc.IdTipoIncidencia),
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre),
                P("activo", NpgsqlDbType.Boolean, oc.Activo)),
                "Error al modificar en la tabla TiposIncidencia");
        }

        /// <summary>true = se eliminó; false = tenía tickets y solo se desactivó.</summary>
        public static bool EliminarTipo(int idTipoIncidencia)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_tiposincidencia_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, idTipoIncidencia)) == 1,
                "Error al eliminar en la tabla TiposIncidencia");
        }
    }
}
