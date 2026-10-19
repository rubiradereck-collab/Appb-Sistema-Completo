using System;
using System.Collections.Generic;

namespace Reportes
{
    public class MetricasIncidencias
    {
        public int Total { get; set; }
        public Dictionary<string, int> PorEstado { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, int> PorPrioridad { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, int> PorArea { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, int> PorTipo { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, double> TiempoPromedioResolucionPorArea { get; set; } = new Dictionary<string, double>();
        public Dictionary<string, Tuple<int, double>> MetricasPorTecnico { get; set; } = new Dictionary<string, Tuple<int, double>>();
        public double? TiempoPromedioResolucionHoras { get; set; }
        public double AdopcionPorcentaje { get; set; }

        // Etapa 3
        /// <summary>% de tickets resueltos/cerrados dentro del tiempo de su prioridad (Alta 4 h, Media 24 h, Baja 72 h).</summary>
        public double? PorcentajeSlaCumplido { get; set; }
        public int TicketsEvaluadosSla { get; set; }
        /// <summary>Promedio de horas entre el reporte y la primera respuesta (solo tickets que la tienen).</summary>
        public double? TiempoPrimeraRespuestaHoras { get; set; }
        public double? SatisfaccionPromedio { get; set; }
        public int TotalCalificaciones { get; set; }
    }
}
