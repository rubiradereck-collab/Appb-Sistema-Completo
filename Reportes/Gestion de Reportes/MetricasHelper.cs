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

            if (totalUsuariosActivos > 0)
            {
                var usuariosLN = new Logica.Gestion_de_Logica.UsuarioLN();
                var usuariosList = usuariosLN.ShowUsuario();
                var usuariosActivos = usuariosList.Where(u => u.Rol == "Usuario" && u.Estado).ToList();
                var nombresValidos = usuariosActivos.Select(u => (u.Nombre.Trim() + " " + u.Apellido.Trim()).ToLower()).ToList();

                int reportadoresUnicos = incidencias
                    .Where(i => !string.IsNullOrEmpty(i.Empleado))
                    .Select(i => i.Empleado.Trim().ToLower())
                    .Where(e => nombresValidos.Contains(e))
                    .Distinct()
                    .Count();

                double adop = (double)reportadoresUnicos / totalUsuariosActivos * 100.0;
                metricas.AdopcionPorcentaje = adop > 100.0 ? 100.0 : adop;
            }

            return metricas;
        }
    }
}
