using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using System.Linq;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    /// <summary>Registro de envíos de guías (Etapa 3).</summary>
    public class GuiaEnvioCD
    {
        public static int Registrar(Entidades.Gestion_de_Entidades.GuiaEnvio envio, IEnumerable<int> idsGuias)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_guiasenvios_registrar(@idusuario, @nombre, @canal, @tipodestino, @idarea, @destinatarios, @total, @guias)",
                P("idusuario", NpgsqlDbType.Integer, envio.IdUsuario),
                P("nombre", NpgsqlDbType.Varchar, envio.NombreUsuario),
                P("canal", NpgsqlDbType.Varchar, envio.Canal),
                P("tipodestino", NpgsqlDbType.Varchar, envio.TipoDestino),
                P("idarea", NpgsqlDbType.Integer, envio.IdArea),
                P("destinatarios", NpgsqlDbType.Text, envio.Destinatarios),
                P("total", NpgsqlDbType.Integer, envio.TotalDestinatarios),
                P("guias", NpgsqlDbType.Array | NpgsqlDbType.Integer, (idsGuias ?? Enumerable.Empty<int>()).ToArray())),
                "Error al registrar el envío de guías");
        }

        public static List<Entidades.Gestion_de_Entidades.GuiaEnvio> ListarEnvios()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_guiasenvios_listar()",
                dr => new Entidades.Gestion_de_Entidades.GuiaEnvio
                {
                    IdEnvio = Entero(dr, "idenvio"),
                    Fecha = Fecha(dr, "fecha"),
                    IdUsuario = EnteroNulo(dr, "idusuario"),
                    NombreUsuario = Texto(dr, "nombreusuario"),
                    Canal = Texto(dr, "canal"),
                    TipoDestino = Texto(dr, "tipodestino"),
                    IdArea = EnteroNulo(dr, "idarea"),
                    NombreArea = Texto(dr, "nombrearea"),
                    Destinatarios = Texto(dr, "destinatarios"),
                    TotalDestinatarios = Entero(dr, "totaldestinatarios"),
                    TotalGuias = Entero(dr, "totalguias"),
                    Guias = Texto(dr, "guias")
                }),
                "Error al listar los envíos de guías");
        }
    }
}
