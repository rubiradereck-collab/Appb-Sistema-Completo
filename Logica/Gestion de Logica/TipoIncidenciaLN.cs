using Datos.Base_de_Datos;
using Datos.Gestion_de_Datos;
using System;
using System.Collections.Generic;
using System.Linq;
using TipoIncidencia = Entidades.Gestion_de_Entidades.TipoIncidencia;

namespace Logica.Gestion_de_Logica
{
    /// <summary>Catálogo de tipos de incidencia. Lo usan el escritorio y el Bot.</summary>
    public class TipoIncidenciaLN
    {
        /// <param name="soloActivos">true para llenar listas de selección (reportar un ticket).</param>
        public List<TipoIncidencia> ShowTipos(bool soloActivos = false)
        {
            try
            {
                return TipoIncidenciaCD.ListarTipos(soloActivos)
                    .Select(t => new TipoIncidencia(t.IdTipoIncidencia, t.Nombre, t.Activo, t.TotalIncidencias))
                    .ToList();
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al mostrar los tipos de incidencia", ex);
            }
        }

        public int InsertTipo(TipoIncidencia oe)
        {
            try
            {
                Validar(oe);
                return TipoIncidenciaCD.InsertarTipo(oe);
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al insertar el tipo de incidencia", ex);
            }
        }

        public bool UpdateTipo(TipoIncidencia oe)
        {
            try
            {
                Validar(oe);
                TipoIncidenciaCD.ModificarTipo(oe);
                return true;
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al actualizar el tipo de incidencia", ex);
            }
        }

        /// <summary>
        /// Devuelve true si se eliminó. Si el tipo ya tiene tickets no se borra (se perdería
        /// el historial): se desactiva y devuelve false.
        /// </summary>
        public bool DeleteTipo(TipoIncidencia oe)
        {
            try
            {
                if (ShowTipos(true).Count(t => t.IdTipoIncidencia != oe.IdTipoIncidencia) == 0)
                    throw new LogicaExcepciones("Debe quedar al menos un tipo de incidencia activo.", null);
                return TipoIncidenciaCD.EliminarTipo(oe.IdTipoIncidencia);
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al eliminar el tipo de incidencia", ex);
            }
        }

        private void Validar(TipoIncidencia oe)
        {
            if (string.IsNullOrWhiteSpace(oe.Nombre))
                throw new LogicaExcepciones("Debe indicar el nombre del tipo de incidencia.", null);
            oe.Nombre = oe.Nombre.Trim();
            if (oe.Nombre.Length > 100)
                throw new LogicaExcepciones("El nombre del tipo no puede superar los 100 caracteres.", null);

            bool duplicado = ShowTipos().Any(t =>
                t.IdTipoIncidencia != oe.IdTipoIncidencia &&
                string.Equals(t.Nombre.Trim(), oe.Nombre, StringComparison.OrdinalIgnoreCase));
            if (duplicado)
                throw new LogicaExcepciones("Ya existe un tipo de incidencia con ese nombre.", null);

            if (!oe.Activo && oe.IdTipoIncidencia > 0 && ShowTipos(true).Count(t => t.IdTipoIncidencia != oe.IdTipoIncidencia) == 0)
                throw new LogicaExcepciones("Debe quedar al menos un tipo de incidencia activo.", null);
        }
    }
}
