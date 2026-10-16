using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class EstadoCD
    {
        public static List<sp_Estados_ListarResult> ListarEstados()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_estados_listar()",
                dr => new sp_Estados_ListarResult
                {
                    IdEstado = Entero(dr, "idestado"),
                    Nombre = Texto(dr, "nombre")
                }),
                "Error al ejecutar el procedimiento Listar estados");
        }

        public static void InsertarEstado(Entidades.Gestion_de_Entidades.Estado oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_estados_insertar(@nombre)",
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre)),
                "Error al insertar en la tabla Estados");
        }

        public static void ModificarEstado(Entidades.Gestion_de_Entidades.Estado oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_estados_modificar(@id, @nombre)",
                P("id", NpgsqlDbType.Integer, oc.IdEstado),
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre)),
                "Error al modificar en la tabla Estados");
        }

        public static void EliminarEstado(Entidades.Gestion_de_Entidades.Estado oe)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_estados_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oe.IdEstado)),
                "Error al eliminar en la tabla Estados");
        }
    }
}
