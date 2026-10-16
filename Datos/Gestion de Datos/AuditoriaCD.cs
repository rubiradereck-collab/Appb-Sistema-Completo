using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class AuditoriaCD
    {
        public static void Insertar(int? idUsuario, string nombreUsuario, string accion, string entidad, int? entidadId, string detalle)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_auditoria_insertar(@idusuario, @nombreusuario, @accion, @entidad, @entidadid, @detalle)",
                P("idusuario", NpgsqlDbType.Integer, idUsuario),
                P("nombreusuario", NpgsqlDbType.Varchar, nombreUsuario),
                P("accion", NpgsqlDbType.Varchar, accion),
                P("entidad", NpgsqlDbType.Varchar, entidad),
                P("entidadid", NpgsqlDbType.Integer, entidadId),
                P("detalle", NpgsqlDbType.Text, detalle)),
                "Error al insertar en la tabla Auditoria");
        }

        public static List<sp_Auditoria_ListarResult> Listar()
        {
            return ManejoErrores.Intentar(() => Conexion.Listar(
                "SELECT * FROM sp_auditoria_listar()",
                dr => new sp_Auditoria_ListarResult
                {
                    IdAuditoria = Entero(dr, "idauditoria"),
                    Fecha = Fecha(dr, "fecha"),
                    IdUsuario = EnteroNulo(dr, "idusuario"),
                    NombreUsuario = Texto(dr, "nombreusuario"),
                    Accion = Texto(dr, "accion"),
                    Entidad = Texto(dr, "entidad"),
                    EntidadId = EnteroNulo(dr, "entidadid"),
                    Detalle = Texto(dr, "detalle")
                }),
                "Error al ejecutar el procedimiento Listar auditoría");
        }
    }
}
