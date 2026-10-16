using Datos.Base_de_Datos;
using NpgsqlTypes;
using System.Collections.Generic;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public static class ReporteMensualCD
    {
        public static bool YaFueEnviado(int anio, int mes)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT COUNT(*) FROM reportesmensualesenviados WHERE anio = @anio AND mes = @mes",
                P("anio", NpgsqlDbType.Integer, anio),
                P("mes", NpgsqlDbType.Integer, mes)) > 0,
                "Error al verificar el reporte mensual");
        }

        public static void RegistrarEnvio(int anio, int mes)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "INSERT INTO reportesmensualesenviados (anio, mes, fechaenvio) VALUES (@anio, @mes, LOCALTIMESTAMP)",
                P("anio", NpgsqlDbType.Integer, anio),
                P("mes", NpgsqlDbType.Integer, mes)),
                "Error al registrar el reporte mensual");
        }
    }
}
