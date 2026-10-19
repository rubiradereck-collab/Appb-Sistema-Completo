using Datos.Base_de_Datos;
using Datos.Gestion_de_Datos;
using Entidades.Gestion_de_Entidades;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Incidencia = Entidades.Gestion_de_Entidades.Incidencia;

namespace Logica.Gestion_de_Logica
{
    public class IncidenciaLN
    {
        /* Nombres oficiales del catálogo Estados. 
         * Se resuelven en tiempo de ejecución para no depender del orden de los INSERT iniciales. */
        private const string ESTADO_PENDIENTE = "Pendiente";
        private const string ESTADO_EN_PROCESO = "En Proceso"; // Agregado para el bot
        private const string ESTADO_RESUELTO = "Resuelto";
        private const string ESTADO_CERRADO = "Cerrado";
        private const string ESTADO_ANULADO = "Anulado";

        private const string ROL_ADMIN = "Administrador";
        private const string ROL_TECNICO = "Técnico";
        private const string ROL_USUARIO = "Usuario";

        public List<Incidencia> ShowIncidencia()
        {
            List<Incidencia> lista = new List<Incidencia>();
            Incidencia oc;
            try
            {
                List<sp_Incidencias_ListarResult> auxLista = IncidenciaCD.ListarIncidencias();

                foreach (sp_Incidencias_ListarResult obj in auxLista)
                {
                    oc = new Incidencia(
                        obj.IdIncidencia,
                        obj.NumeroTicket,
                        obj.Fecha,
                        obj.Empleado,
                        obj.IdArea,
                        obj.TipoIncidencia,
                        obj.Descripcion,
                        obj.IdPrioridad,
                        obj.IdEstado,
                        obj.IdTecnicoAsignado,
                        obj.FechaSolucion,
                        obj.Observaciones
                    );

                    oc.NombreArea = obj.NombreArea;
                    oc.NombrePrioridad = obj.NombrePrioridad;
                    oc.NombreEstado = obj.NombreEstado;
                    oc.TecnicoAsignado = obj.TecnicoAsignado;
                    // Necesario para el control de concurrencia al modificar (antes no se copiaba
                    // y la edición siempre se reportaba como conflicto).
                    oc.FilaVersion = obj.FilaVersion;
                    oc.IdTipoIncidencia = obj.IdTipoIncidencia;
                    oc.IdUsuarioReporta = obj.IdUsuarioReporta;
                    oc.FechaAsignacion = obj.FechaAsignacion;
                    oc.FechaPrimeraRespuesta = obj.FechaPrimeraRespuesta;
                    oc.Calificacion = obj.Calificacion;
                    oc.FechaCalificacion = obj.FechaCalificacion;

                    lista.Add(oc);
                }
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al mostrar incidencias", ex);
            }
            return lista;
        }

        public bool InsertIncidencia(Incidencia oe)
        {
            return InsertIncidencia(oe, out _);
        }

        public bool InsertIncidencia(Incidencia oe, out int idGenerado)
        {
            try
            {
                ValidarIncidencia(oe);
                AplicarTipoDelCatalogo(oe, soloActivos: true);
                oe.IdEstado = ObtenerIdEstadoPorNombre(ESTADO_PENDIENTE);
                idGenerado = IncidenciaCD.InsertarIncidencia(oe);
                return idGenerado > 0;
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al insertar incidencia en la BD", ex);
            }
        }

        /// <summary>
        /// Modifica aplicando las reglas de cada rol (Etapa 2):
        /// - Usuario: no cambia el estado ni el técnico.
        /// - Técnico: solo puede tomar un ticket sin asignar (para sí mismo), solo cambia el
        ///   estado de los tickets asignados a él y no puede anular.
        /// - Administrador: sin restricciones.
        /// </summary>
        public bool UpdateIncidencia(Incidencia oe, Usuario actor)
        {
            if (actor == null) throw new LogicaExcepciones("No se indicó el usuario que realiza el cambio.", null);

            Incidencia actual = ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == oe.IdIncidencia);
            if (actual == null) throw new LogicaExcepciones("La incidencia ya no existe.", null);

            bool cambiaEstado = actual.IdEstado != oe.IdEstado;
            bool cambiaTecnico = actual.IdTecnicoAsignado != oe.IdTecnicoAsignado;

            if (actor.Rol == ROL_USUARIO)
            {
                if (cambiaEstado || cambiaTecnico)
                    throw new LogicaExcepciones("Tu rol no permite cambiar el estado ni el técnico de una incidencia.", null);
                if (!EsDelUsuario(actual, actor))
                    throw new LogicaExcepciones("Solo puedes modificar las incidencias que tú reportaste.", null);
            }
            else if (actor.Rol == ROL_TECNICO)
            {
                if (cambiaTecnico)
                {
                    bool seLaAsigna = actual.IdTecnicoAsignado == null && oe.IdTecnicoAsignado == actor.IdUsuario;
                    if (!seLaAsigna)
                        throw new LogicaExcepciones("Solo un administrador puede asignar o reasignar incidencias a otro técnico.", null);
                    // Etapa 4: tomar un ticket solo si sigue abierto (igual que en la API y en Telegram)
                    if (actual.NombreEstado == ESTADO_RESUELTO || actual.NombreEstado == ESTADO_CERRADO || actual.NombreEstado == ESTADO_ANULADO)
                        throw new LogicaExcepciones($"Este ticket ya está {actual.NombreEstado}. Solo un administrador puede reabrirlo.", null);
                }
                if (cambiaEstado)
                {
                    if (oe.IdTecnicoAsignado != actor.IdUsuario)
                        throw new LogicaExcepciones("Solo el técnico asignado puede cambiar el estado de esta incidencia.", null);
                    if (oe.IdEstado == ObtenerIdEstadoPorNombre(ESTADO_ANULADO))
                        throw new LogicaExcepciones("Solo un administrador puede anular una incidencia.", null);
                }
            }
            else if (actor.Rol != ROL_ADMIN)
            {
                throw new LogicaExcepciones("Rol no reconocido.", null);
            }

            return UpdateIncidencia(oe);
        }

        public bool UpdateIncidencia(Incidencia oe)
        {
            try
            {
                ValidarIncidencia(oe);
                AplicarTipoDelCatalogo(oe, soloActivos: false);

                List<sp_Estados_ListarResult> estados = EstadoCD.ListarEstados();
                int idResuelto = ObtenerIdEstadoPorNombre(estados, ESTADO_RESUELTO);
                int idCerrado = ObtenerIdEstadoPorNombre(estados, ESTADO_CERRADO);
                bool esResueltaOCerrada = (oe.IdEstado == idResuelto || oe.IdEstado == idCerrado);

                if (esResueltaOCerrada && oe.IdTecnicoAsignado == null)
                {
                    throw new LogicaExcepciones("No se puede marcar la incidencia como Resuelto/Cerrado sin un técnico asignado.", null);
                }

                if (esResueltaOCerrada && oe.FechaSolucion == null)
                {
                    oe.FechaSolucion = DateTime.Now;
                }
                else if (!esResueltaOCerrada)
                {
                    // Reabierta o anulada: no tiene fecha de solución (la BD también lo garantiza)
                    oe.FechaSolucion = null;
                }

                return IncidenciaCD.ModificarIncidencia(oe);
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al actualizar incidencia en la BD", ex);
            }
        }

        /// <summary>
        /// Etapa 4: "Eliminar" anula la incidencia (queda en el historial y en los informes).
        /// Solo el administrador. Devuelve false si ya estaba anulada.
        /// </summary>
        public bool AnularIncidencia(Incidencia oe, Usuario actor, string motivo)
        {
            if (actor == null || actor.Rol != ROL_ADMIN)
                throw new LogicaExcepciones("Solo un administrador puede anular incidencias.", null);
            if (string.IsNullOrWhiteSpace(motivo))
                throw new LogicaExcepciones("Indica el motivo de la anulación.", null);
            try
            {
                return IncidenciaCD.AnularIncidencia(oe.IdIncidencia, motivo.Trim());
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al anular la incidencia", ex);
            }
        }

        /// <summary>Borra la incidencia de la base de datos. Usar solo para registros de prueba o duplicados.</summary>
        public bool DeleteIncidencia(Incidencia oe)
        {
            try
            {
                IncidenciaCD.EliminarIncidencia(oe);
                return true;
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al eliminar incidencia en la BD", ex);
            }
        }

        private int ObtenerIdEstadoPorNombre(string nombreEstado)
        {
            List<sp_Estados_ListarResult> estados = EstadoCD.ListarEstados();
            return ObtenerIdEstadoPorNombre(estados, nombreEstado);
        }

        private int ObtenerIdEstadoPorNombre(List<sp_Estados_ListarResult> estados, string nombreEstado)
        {
            sp_Estados_ListarResult estado = estados.FirstOrDefault(e => e.Nombre == nombreEstado);

            if (estado == null)
            {
                throw new LogicaExcepciones($"No se encontró el estado '{nombreEstado}' en el catálogo dbo.Estados.", null);
            }
            return estado.IdEstado;
        }

        private void ValidarIncidencia(Incidencia oe)
        {
            if (string.IsNullOrWhiteSpace(oe.Empleado)) throw new LogicaExcepciones("Debe indicar el nombre del empleado.", null);
            if (oe.Empleado.Length > 150) throw new LogicaExcepciones("El nombre no puede superar los 150 caracteres.", null);
            if (string.IsNullOrWhiteSpace(oe.TipoIncidencia)) throw new LogicaExcepciones("Debe indicar el tipo de incidencia.", null);
            if (oe.TipoIncidencia.Length > 100) throw new LogicaExcepciones("El tipo no puede superar los 100 caracteres.", null);
            if (string.IsNullOrWhiteSpace(oe.Descripcion)) throw new LogicaExcepciones("Debe indicar una descripción.", null);
            if (oe.Descripcion.Trim().Length < 10) throw new LogicaExcepciones("La descripción debe tener al menos 10 caracteres.", null);
            if (oe.IdArea <= 0) throw new LogicaExcepciones("Debe seleccionar un área válida.", null);
            if (oe.IdPrioridad <= 0) throw new LogicaExcepciones("Debe seleccionar una prioridad válida.", null);
            if (oe.IdTecnicoAsignado.HasValue) ValidarTecnico(oe.IdTecnicoAsignado.Value);
        }

        private void ValidarTecnico(int idUsuario)
        {
            List<sp_Usuarios_ListarResult> usuarios = UsuarioCD.ListarUsuarios();
            sp_Usuarios_ListarResult usuario = usuarios.FirstOrDefault(u => u.IdUsuario == idUsuario);

            if (usuario == null) throw new LogicaExcepciones("El técnico asignado no existe.", null);
            if (usuario.Rol != "Técnico") throw new LogicaExcepciones("El usuario asignado no tiene el rol de Técnico.", null);
            if (!usuario.Estado) throw new LogicaExcepciones("El técnico asignado está inactivo.", null);
        }

        /// <summary>
        /// Si llega IdTipoIncidencia, comprueba que exista (y esté activo al crear) y copia su nombre.
        /// Sin Id (versión anterior), se deja el texto: la BD lo enlaza con el catálogo si coincide.
        /// </summary>
        private void AplicarTipoDelCatalogo(Incidencia oe, bool soloActivos)
        {
            if (!oe.IdTipoIncidencia.HasValue) return;

            var tipo = TipoIncidenciaCD.ListarTipos(false).FirstOrDefault(t => t.IdTipoIncidencia == oe.IdTipoIncidencia.Value);
            if (tipo == null) throw new LogicaExcepciones("El tipo de incidencia seleccionado no existe.", null);
            if (soloActivos && !tipo.Activo) throw new LogicaExcepciones($"El tipo '{tipo.Nombre}' está desactivado. Elige otro.", null);
            oe.TipoIncidencia = tipo.Nombre;
        }

        /// <summary>
        /// ¿La incidencia la reportó este usuario? Primero por IdUsuarioReporta; en tickets
        /// antiguos sin ese dato, por el nombre (como se hacía antes de la Etapa 2).
        /// </summary>
        public static bool EsDelUsuario(Incidencia inc, Usuario usuario)
        {
            if (inc == null || usuario == null) return false;
            if (inc.IdUsuarioReporta.HasValue) return inc.IdUsuarioReporta.Value == usuario.IdUsuario;

            string nombre = $"{usuario.Nombre} {usuario.Apellido}".Trim();
            return string.Equals((inc.Empleado ?? "").Trim(), nombre, StringComparison.OrdinalIgnoreCase);
        }

        public List<Incidencia> ShowIncidenciasDelUsuario(Usuario usuario)
        {
            return ShowIncidencia().Where(i => EsDelUsuario(i, usuario)).ToList();
        }

        /// <summary>
        /// Id del usuario cuyo nombre completo coincide con el empleado escrito, solo si hay
        /// exactamente uno (con dos homónimos no se adivina y se devuelve null).
        /// </summary>
        public int? BuscarIdUsuarioPorNombre(string empleado)
        {
            if (string.IsNullOrWhiteSpace(empleado)) return null;
            try
            {
                var coincidencias = UsuarioCD.ListarUsuarios()
                    .Where(u => string.Equals($"{(u.Nombre ?? "").Trim()} {(u.Apellido ?? "").Trim()}", empleado.Trim(), StringComparison.OrdinalIgnoreCase))
                    .ToList();
                return coincidencias.Count == 1 ? coincidencias[0].IdUsuario : (int?)null;
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al buscar el usuario que reporta", ex);
            }
        }

        /// <summary>
        /// Etapa 3: encuesta de satisfacción. Solo quien reportó puede calificar, una vez,
        /// cuando el ticket está Resuelto o Cerrado. Devuelve un mensaje para mostrar.
        /// </summary>
        public string Calificar(int idIncidencia, Usuario usuario, int calificacion)
        {
            if (usuario == null) return "Tu cuenta no está vinculada.";
            if (calificacion < 1 || calificacion > 5) return "La calificación debe estar entre 1 y 5.";
            try
            {
                int resultado = IncidenciaCD.Calificar(idIncidencia, usuario.IdUsuario, calificacion);
                if (resultado == 1)
                {
                    new AuditoriaLN().Registrar(usuario.IdUsuario, $"{usuario.Nombre} {usuario.Apellido}",
                        "Calificar", "Incidencia", idIncidencia, $"Calificación: {calificacion} de 5");
                    return "OK";
                }
                if (resultado == 2) return "Este ticket ya fue calificado.";
                return "Solo quien reportó el ticket puede calificarlo, y solo cuando está Resuelto o Cerrado.";
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al guardar la calificación", ex);
            }
        }

        public Incidencia BuscarPorTicket(string numeroTicket)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numeroTicket)) throw new LogicaExcepciones("Debe indicar un número de ticket.", null);

                List<Incidencia> incidencias = ShowIncidencia();
                return incidencias.FirstOrDefault(i => string.Equals(i.NumeroTicket, numeroTicket.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            catch (LogicaExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al buscar incidencia por ticket", ex);
            }
        }

        public string AceptarIncidenciaPorTelegram(int idIncidencia, long chatIdTelegram)
        {
            try
            {
                Usuario tecnico = new UsuarioLN().BuscarPorChatId(chatIdTelegram);

                if (tecnico == null || tecnico.Rol != "Técnico" || !tecnico.Estado)
                {
                    return "❌ No estás registrado como técnico activo o tu cuenta no está vinculada.";
                }

                // Etapa 4: un botón "Aceptar" viejo no debe reabrir un ticket ya terminado o anulado
                var actual = ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == idIncidencia);
                if (actual != null && (actual.NombreEstado == ESTADO_RESUELTO || actual.NombreEstado == ESTADO_CERRADO || actual.NombreEstado == ESTADO_ANULADO))
                    return $"⚠️ Este ticket ya está {actual.NombreEstado}.";

                int idEnProceso = ObtenerIdEstadoPorNombre(ESTADO_EN_PROCESO);
                bool asignado = IncidenciaCD.AsignarTecnicoTelegram(idIncidencia, tecnico.IdUsuario, idEnProceso);

                if (asignado)
                {
                    new AuditoriaLN().Registrar(
                        tecnico.IdUsuario,
                        $"{tecnico.Nombre} {tecnico.Apellido}",
                        "Asignar",
                        "Incidencia",
                        idIncidencia,
                        "Aceptó el ticket desde Telegram"
                    );
                    return "SUCCESS";
                }
                else return "⚠️ Lo sentimos, esta incidencia ya fue tomada por otro técnico.";
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al procesar la aceptación de la incidencia", ex);
            }
        }

        public string CambiarEstadoPorTelegram(int idIncidencia, long chatIdTelegram, string nuevoEstadoNombre, string observacion)
        {
            try
            {
                Usuario tecnico = new UsuarioLN().BuscarPorChatId(chatIdTelegram);
                if (tecnico == null) return "❌ Usuario no encontrado o no vinculado.";

                var incidenciaActual = ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == idIncidencia);
                if (incidenciaActual != null && (incidenciaActual.NombreEstado == ESTADO_RESUELTO || incidenciaActual.NombreEstado == ESTADO_CERRADO || incidenciaActual.NombreEstado == ESTADO_ANULADO))
                {
                    return $"⚠️ Este ticket ya estaba marcado como '{incidenciaActual.NombreEstado}'. No se repitió la acción.";
                }

                int nuevoIdEstado = ObtenerIdEstadoPorNombre(nuevoEstadoNombre);
                bool actualizado = IncidenciaCD.ActualizarEstadoTelegram(idIncidencia, tecnico.IdUsuario, nuevoIdEstado, observacion);

                if (actualizado)
                {
                    new AuditoriaLN().Registrar(
                        tecnico.IdUsuario,
                        $"{tecnico.Nombre} {tecnico.Apellido}",
                        "Modificar",
                        "Incidencia",
                        idIncidencia,
                        $"Cambió el estado a '{nuevoEstadoNombre}' desde Telegram. Observación: {observacion}"
                    );
                    return $"SUCCESS_{nuevoEstadoNombre}";
                }
                else return "⛔ No tienes permiso para modificar esta incidencia (no está asignada a ti o no existe).";
            }
            catch (Exception ex)
            {
                throw new LogicaExcepciones("Error al cambiar el estado de la incidencia por Telegram", ex);
            }
        }

        // 1. Creamos una clase propia en la capa Lógica que el Bot sí puede ver
        public class MensajeBot
        {
            public long ChatId { get; set; }
            public int MessageId { get; set; }
        }

        public void RegistrarMensajeTelegram(int idIncidencia, long chatId, int messageId)
        {
            IncidenciaCD.RegistrarMensajeTelegram(idIncidencia, chatId, messageId);
        }

        // 2. Cambiamos el tipo de retorno a MensajeBot y transformamos la lista
        public List<MensajeBot> ObtenerMensajesTelegram(int idIncidencia)
        {
            var listaDatos = IncidenciaCD.ObtenerMensajesTelegram(idIncidencia);

            return listaDatos.Select(m => new MensajeBot
            {
                ChatId = m.ChatId,
                MessageId = m.MessageId
            }).ToList();
        }
    }
}