using Datos.Gestion_de_Datos;
using Entidades.Gestion_de_Entidades;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Logica.Gestion_de_Logica
{
    public class SlaLN
    {
        private static readonly Dictionary<string, TimeSpan> LimitesPorPrioridad = new Dictionary<string, TimeSpan>
        {
            { "Alta", TimeSpan.FromHours(4) },
            { "Media", TimeSpan.FromHours(24) },
            { "Baja", TimeSpan.FromHours(72) }
        };

        /// <summary>Límite de la prioridad, o null si la prioridad no tiene SLA definido.</summary>
        public static TimeSpan? Limite(string nombrePrioridad)
        {
            return LimitesPorPrioridad.TryGetValue(nombrePrioridad ?? "", out TimeSpan limite) ? limite : (TimeSpan?)null;
        }

        /// <summary>Tickets "Pendiente": el tiempo cuenta desde que se reportaron.</summary>
        public List<Incidencia> ObtenerVencidasSinEscalar(List<Incidencia> pendientes)
        {
            return ObtenerVencidas(pendientes, enProceso: false);
        }

        /// <summary>
        /// Tickets "En Proceso" (Etapa 2): el tiempo cuenta desde que se asignó el técnico
        /// actual (FechaAsignacion). Tickets antiguos sin ese dato usan la fecha del reporte.
        /// </summary>
        public List<Incidencia> ObtenerVencidasEnProcesoSinEscalar(List<Incidencia> enProceso)
        {
            return ObtenerVencidas(enProceso, enProceso: true);
        }

        public static DateTime InicioConteo(Incidencia inc, bool enProceso)
        {
            return enProceso ? (inc.FechaAsignacion ?? inc.Fecha) : inc.Fecha;
        }

        private List<Incidencia> ObtenerVencidas(List<Incidencia> incidencias, bool enProceso)
        {
            var vencidas = new List<Incidencia>();

            foreach (var inc in incidencias)
            {
                if (!LimitesPorPrioridad.TryGetValue(inc.NombrePrioridad ?? "", out TimeSpan limite))
                    continue;

                if (DateTime.Now - InicioConteo(inc, enProceso) < limite)
                    continue;

                try
                {
                    if (!SlaCD.YaEscalado(inc.IdIncidencia, enProceso))
                        vencidas.Add(inc);
                }
                catch (Exception ex)
                {
                    throw new LogicaExcepciones("Error al verificar el SLA de la incidencia " + inc.NumeroTicket, ex);
                }
            }

            return vencidas;
        }

        public void MarcarEscalado(int idIncidencia, bool enProceso = false)
        {
            try { SlaCD.MarcarEscalado(idIncidencia, enProceso); }
            catch (Exception ex) { throw new LogicaExcepciones("Error al marcar el escalamiento SLA", ex); }
        }
    }

}
