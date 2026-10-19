using System;

namespace Entidades.Gestion_de_Entidades
{
    /// <summary>
    /// Cifras de antes del sistema para el informe final (Etapa 3). Todas son opcionales:
    /// se llena lo que se pueda reconstruir de hojas de cálculo o correos de soporte.
    /// </summary>
    public class LineaBase
    {
        public int IdLineaBase { get; set; }
        public DateTime FechaRegistro { get; set; }
        public string NombreUsuario { get; set; }

        /// <summary>Descripción del período medido, p. ej. "Enero a junio de 2026 (antes del sistema)".</summary>
        public string Periodo { get; set; }
        public int? TotalIncidencias { get; set; }
        public decimal? TiempoPromedioResolucionHoras { get; set; }
        public decimal? TiempoPrimeraRespuestaHoras { get; set; }
        public decimal? PorcentajeSlaCumplido { get; set; }
        public decimal? SatisfaccionPromedio { get; set; }
        public string Fuente { get; set; }
        public string Observaciones { get; set; }
    }
}
