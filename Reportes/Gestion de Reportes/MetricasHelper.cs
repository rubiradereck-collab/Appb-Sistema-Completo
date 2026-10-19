using Entidades.Gestion_de_Entidades;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Reportes
{
    public static class MetricasHelper
    {
        public static MetricasIncidencias Calcular(List<Incidencia> incidencias, int totalUsuariosActivos = 0)
        {
            var metricas = new MetricasIncidencias
            {
                Total = incidencias.Count,
                PorEstado = incidencias
                    .GroupBy(i => i.NombreEstado ?? "Sin estado")
                    .ToDictionary(g => g.Key, g => g.Count()),
                PorPrioridad = incidencias
                    .GroupBy(i => i.NombrePrioridad ?? "Sin prioridad")
                    .ToDictionary(g => g.Key, g => g.Count()),
                PorArea = incidencias
                    .GroupBy(i => i.NombreArea ?? "Sin área")
                    .ToDictionary(g => g.Key, g => g.Count()),
                PorTipo = incidencias
                    .GroupBy(i => i.TipoIncidencia ?? "Sin tipo")
                    .ToDictionary(g => g.Key, g => g.Count())
            };

            var resueltas = incidencias.Where(i => i.FechaSolucion.HasValue).ToList();
            if (resueltas.Count > 0)
            {
                metricas.TiempoPromedioResolucionHoras = resueltas.Average(i => (i.FechaSolucion.Value - i.Fecha).TotalHours);
                
                metricas.TiempoPromedioResolucionPorArea = resueltas
                    .GroupBy(i => i.NombreArea ?? "Sin área")
                    .ToDictionary(
                        g => g.Key, 
                        g => g.Average(i => (i.FechaSolucion.Value - i.Fecha).TotalHours)
                    );

                metricas.MetricasPorTecnico = resueltas
                    .Where(i => !string.IsNullOrEmpty(i.TecnicoAsignado))
                    .GroupBy(i => i.TecnicoAsignado)
                    .ToDictionary(
                        g => g.Key,
                        g => new Tuple<int, double>(g.Count(), g.Average(i => (i.FechaSolucion.Value - i.Fecha).TotalHours))
                    );
            }

            CalcularIndicadoresEtapa3(metricas, incidencias);

            if (totalUsuariosActivos > 0)
            {
                var usuariosActivos = new Logica.Gestion_de_Logica.UsuarioLN().ShowUsuario()
                    .Where(u => u.Rol == "Usuario" && u.Estado).ToList();
                metricas.AdopcionPorcentaje = Adopcion(incidencias, usuariosActivos) ?? 0;
            }

            return metricas;
        }

        /// <summary>SLA cumplido, primera respuesta y satisfacción (Etapa 3).</summary>
        public static void CalcularIndicadoresEtapa3(MetricasIncidencias metricas, List<Incidencia> incidencias)
        {
            var evaluables = incidencias
                .Where(i => i.FechaSolucion.HasValue && Logica.Gestion_de_Logica.SlaLN.Limite(i.NombrePrioridad).HasValue)
                .ToList();
            metricas.TicketsEvaluadosSla = evaluables.Count;
            if (evaluables.Count > 0)
            {
                int cumplidos = evaluables.Count(i =>
                    i.FechaSolucion.Value - i.Fecha <= Logica.Gestion_de_Logica.SlaLN.Limite(i.NombrePrioridad).Value);
                metricas.PorcentajeSlaCumplido = cumplidos * 100.0 / evaluables.Count;
            }

            var conRespuesta = incidencias.Where(i => i.FechaPrimeraRespuesta.HasValue).ToList();
            if (conRespuesta.Count > 0)
                metricas.TiempoPrimeraRespuestaHoras = conRespuesta.Average(i => Math.Max(0, (i.FechaPrimeraRespuesta.Value - i.Fecha).TotalHours));

            var calificadas = incidencias.Where(i => i.Calificacion.HasValue).ToList();
            metricas.TotalCalificaciones = calificadas.Count;
            if (calificadas.Count > 0)
                metricas.SatisfaccionPromedio = calificadas.Average(i => i.Calificacion.Value);
        }

        /// <summary>
        /// % de usuarios (rol Usuario, activos) que reportaron al menos un ticket. Se identifica a quien
        /// reportó por IdUsuarioReporta y, en tickets antiguos sin ese dato, por el nombre.
        /// </summary>
        public static double? Adopcion(List<Incidencia> incidencias, List<Usuario> usuariosActivos)
        {
            if (usuariosActivos == null || usuariosActivos.Count == 0) return null;
            // Los tickets anulados (duplicados, reportados por error) no cuentan como uso del sistema
            var validas = incidencias.Where(i => i.NombreEstado != "Anulado").ToList();
            int reportan = usuariosActivos.Count(u => validas.Any(i => Logica.Gestion_de_Logica.IncidenciaLN.EsDelUsuario(i, u)));
            return Math.Min(100.0, reportan * 100.0 / usuariosActivos.Count);
        }
    }
}
