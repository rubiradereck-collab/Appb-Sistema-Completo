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
    }
}
