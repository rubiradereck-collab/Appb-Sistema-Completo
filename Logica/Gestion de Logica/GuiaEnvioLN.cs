using Datos.Gestion_de_Datos;
using Entidades.Gestion_de_Entidades;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Logica.Gestion_de_Logica
{
    /// <summary>
    /// Envío de guías por correo y su registro (Etapa 3). Lo usa el escritorio; la API
    /// registra sus propios envíos en la misma tabla.
    /// </summary>
    public class GuiaEnvioLN
    {
        /// <summary>Correos de los usuarios activos; con idArea, solo los de esa área.</summary>
        public List<string> ObtenerDestinatarios(int? idArea)
        {
            try
            {
                return new UsuarioLN().ShowUsuario()
                    .Where(u => u.Estado && !string.IsNullOrWhiteSpace(u.Correo) && u.Correo.Contains("@"))
                    .Where(u => !idArea.HasValue || u.IdArea == idArea.Value)
                    .Select(u => u.Correo.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al obtener los destinatarios de las guías", ex);
            }
        }

        /// <summary>Registra un envío ya realizado. No lanza excepción: el correo ya salió.</summary>
        public void Registrar(Usuario actor, string tipoDestino, int? idArea, List<string> destinatarios, IEnumerable<int> idsGuias)
        {
            try
            {
                var envio = new GuiaEnvio
                {
                    IdUsuario = actor?.IdUsuario,
                    NombreUsuario = actor != null ? $"{actor.Nombre} {actor.Apellido}" : "Sistema",
                    Canal = "Escritorio",
                    TipoDestino = tipoDestino,
                    IdArea = idArea,
                    Destinatarios = string.Join(", ", destinatarios ?? new List<string>()),
                    TotalDestinatarios = destinatarios?.Count ?? 0
                };
                GuiaEnvioCD.Registrar(envio, idsGuias);
            }
            catch
            {
                // El envío ya se hizo; si falla el registro no se le muestra error al usuario.
            }
        }

        public List<GuiaEnvio> ShowEnvios()
        {
            try { return GuiaEnvioCD.ListarEnvios(); }
            catch (Exception ex) { throw new LogicaExcepciones("Error al listar los envíos de guías", ex); }
        }
    }
}
