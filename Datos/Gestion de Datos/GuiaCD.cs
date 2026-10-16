using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class GuiaCD
    {
        public static List<sp_Guias_ListarResult> ListarGuias()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_guias_listar()",
                dr => new sp_Guias_ListarResult
                {
                    IdGuia = Entero(dr, "idguia"),
                    Titulo = Texto(dr, "titulo"),
                    Problema = Texto(dr, "problema"),
                    Solucion = Texto(dr, "solucion")
                }),
                "Error al ejecutar el procedimiento Listar guías");
        }

        public static void InsertarGuia(Entidades.Gestion_de_Entidades.Guia oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_guias_insertar(@titulo, @problema, @solucion)",
                P("titulo", NpgsqlDbType.Varchar, oc.Titulo),
                P("problema", NpgsqlDbType.Text, oc.Problema),
                P("solucion", NpgsqlDbType.Text, oc.Solucion)),
                "Error al insertar en la tabla Guias");
        }

        public static void ModificarGuia(Entidades.Gestion_de_Entidades.Guia oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_guias_modificar(@id, @titulo, @problema, @solucion)",
                P("id", NpgsqlDbType.Integer, oc.IdGuia),
                P("titulo", NpgsqlDbType.Varchar, oc.Titulo),
                P("problema", NpgsqlDbType.Text, oc.Problema),
                P("solucion", NpgsqlDbType.Text, oc.Solucion)),
                "Error al modificar en la tabla Guias");
        }

        public static void EliminarGuia(Entidades.Gestion_de_Entidades.Guia oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_guias_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oc.IdGuia)),
                "Error al eliminar en la tabla Guias");
        }
    }
}
