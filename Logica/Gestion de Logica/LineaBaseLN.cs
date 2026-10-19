using Datos.Gestion_de_Datos;
using Entidades.Gestion_de_Entidades;
using System;

namespace Logica.Gestion_de_Logica
{
    /// <summary>Línea base para el informe final (Etapa 3).</summary>
    public class LineaBaseLN
    {
        public LineaBase Obtener()
        {
            try { return LineaBaseCD.Obtener(); }
            catch (Exception ex) { throw new LogicaExcepciones("Error al leer la línea base", ex); }
        }

        public void Guardar(LineaBase lb, Usuario actor)
        {
            if (lb == null) throw new LogicaExcepciones("No hay datos de línea base.", null);
            if (string.IsNullOrWhiteSpace(lb.Periodo))
                throw new LogicaExcepciones("Indica a qué período corresponde la línea base (por ejemplo: \"Enero a junio de 2026\").", null);
            lb.Periodo = lb.Periodo.Trim();
            if (lb.Periodo.Length > 100) throw new LogicaExcepciones("El período no puede superar los 100 caracteres.", null);
            if (lb.Fuente != null && lb.Fuente.Trim().Length > 200) throw new LogicaExcepciones("La fuente no puede superar los 200 caracteres.", null);
            if (lb.TotalIncidencias < 0) throw new LogicaExcepciones("El total de incidencias no puede ser negativo.", null);
            if (lb.TiempoPromedioResolucionHoras < 0 || lb.TiempoPrimeraRespuestaHoras < 0)
                throw new LogicaExcepciones("Los tiempos no pueden ser negativos.", null);
            if (lb.PorcentajeSlaCumplido < 0 || lb.PorcentajeSlaCumplido > 100)
                throw new LogicaExcepciones("El porcentaje de SLA debe estar entre 0 y 100.", null);
            if (lb.SatisfaccionPromedio < 1 || lb.SatisfaccionPromedio > 5)
                throw new LogicaExcepciones("La satisfacción debe estar entre 1 y 5.", null);
            if (!lb.TotalIncidencias.HasValue && !lb.TiempoPromedioResolucionHoras.HasValue && !lb.TiempoPrimeraRespuestaHoras.HasValue
                && !lb.PorcentajeSlaCumplido.HasValue && !lb.SatisfaccionPromedio.HasValue)
                throw new LogicaExcepciones("Ingresa al menos una cifra de la línea base.", null);

            try
            {
                lb.NombreUsuario = actor != null ? $"{actor.Nombre} {actor.Apellido}" : "Sistema";
                lb.IdLineaBase = LineaBaseCD.Guardar(lb, actor?.IdUsuario);
                new AuditoriaLN().Registrar(actor?.IdUsuario, lb.NombreUsuario, "Modificar", "LineaBase", lb.IdLineaBase,
                    $"Período: {lb.Periodo}");
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al guardar la línea base", ex);
            }
        }
    }
}
