using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Linq;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    /// <summary>Línea base del informe final (Etapa 3).</summary>
    public class LineaBaseCD
    {
        /// <summary>La línea base más reciente, o null si todavía no se registró.</summary>
        public static Entidades.Gestion_de_Entidades.LineaBase Obtener()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_lineabase_obtener()",
                dr => new Entidades.Gestion_de_Entidades.LineaBase
                {
                    IdLineaBase = Entero(dr, "idlineabase"),
                    FechaRegistro = Fecha(dr, "fecharegistro"),
                    NombreUsuario = Texto(dr, "nombreusuario"),
                    Periodo = Texto(dr, "periodo"),
                    TotalIncidencias = EnteroNulo(dr, "totalincidencias"),
                    TiempoPromedioResolucionHoras = DecimalNulo(dr, "tiempopromedioresolucionhoras"),
                    TiempoPrimeraRespuestaHoras = DecimalNulo(dr, "tiempoprimerarespuestahoras"),
                    PorcentajeSlaCumplido = DecimalNulo(dr, "porcentajeslacumplido"),
                    SatisfaccionPromedio = DecimalNulo(dr, "satisfaccionpromedio"),
                    Fuente = Texto(dr, "fuente"),
                    Observaciones = Texto(dr, "observaciones")
                }).FirstOrDefault(),
                "Error al leer la línea base");
        }

        public static int Guardar(Entidades.Gestion_de_Entidades.LineaBase lb, int? idUsuario)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_lineabase_guardar(@idusuario, @nombre, @periodo, @total, @tres, @tpr, @sla, @sat, @fuente, @obs)",
                P("idusuario", NpgsqlDbType.Integer, idUsuario),
                P("nombre", NpgsqlDbType.Varchar, lb.NombreUsuario),
                P("periodo", NpgsqlDbType.Varchar, lb.Periodo),
                P("total", NpgsqlDbType.Integer, lb.TotalIncidencias),
                P("tres", NpgsqlDbType.Numeric, lb.TiempoPromedioResolucionHoras),
                P("tpr", NpgsqlDbType.Numeric, lb.TiempoPrimeraRespuestaHoras),
                P("sla", NpgsqlDbType.Numeric, lb.PorcentajeSlaCumplido),
                P("sat", NpgsqlDbType.Numeric, lb.SatisfaccionPromedio),
                P("fuente", NpgsqlDbType.Varchar, lb.Fuente),
                P("obs", NpgsqlDbType.Text, lb.Observaciones)),
                "Error al guardar la línea base");
        }
    }
}
