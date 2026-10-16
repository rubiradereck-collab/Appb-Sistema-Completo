using Datos.Base_de_Datos;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class IncidenciaCD
    {
        public static List<sp_Incidencias_ListarResult> ListarIncidencias()
        {
            return ManejoErrores.Intentar(() => Listar(
                "SELECT * FROM sp_incidencias_listar()",
                dr => new sp_Incidencias_ListarResult
                {
                    IdIncidencia = Entero(dr, "idincidencia"),
                    NumeroTicket = Texto(dr, "numeroticket"),
                    Fecha = Fecha(dr, "fecha"),
                    Empleado = Texto(dr, "empleado"),
                    IdArea = Entero(dr, "idarea"),
                    NombreArea = Texto(dr, "nombrearea"),
                    TipoIncidencia = Texto(dr, "tipoincidencia"),
                    Descripcion = Texto(dr, "descripcion"),
                    IdPrioridad = Entero(dr, "idprioridad"),
                    NombrePrioridad = Texto(dr, "nombreprioridad"),
                    IdEstado = Entero(dr, "idestado"),
                    NombreEstado = Texto(dr, "nombreestado"),
                    IdTecnicoAsignado = EnteroNulo(dr, "idtecnicoasignado"),
                    TecnicoAsignado = Texto(dr, "tecnicoasignado"),
                    FechaSolucion = FechaNula(dr, "fechasolucion"),
                    Observaciones = Texto(dr, "observaciones"),
                    FilaVersion = Bytes(dr, "filaversion"),
                    IdTipoIncidencia = EnteroNulo(dr, "idtipoincidencia"),
                    IdUsuarioReporta = EnteroNulo(dr, "idusuarioreporta"),
                    FechaAsignacion = FechaNula(dr, "fechaasignacion"),
                    FechaPrimeraRespuesta = FechaNula(dr, "fechaprimerarespuesta")
                }),
                "Error al ejecutar el procedimiento Listar incidencias");
        }

        /// <summary>Inserta la incidencia y devuelve el Id generado.</summary>
        public static int InsertarIncidencia(Entidades.Gestion_de_Entidades.Incidencia oc)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_incidencias_insertar(@empleado, @idarea, @tipo, @descripcion, @idprioridad, @idestado, @idtecnico, @observaciones, @idtipo, @idreporta)",
                P("empleado", NpgsqlDbType.Varchar, oc.Empleado),
                P("idarea", NpgsqlDbType.Integer, oc.IdArea),
                P("tipo", NpgsqlDbType.Varchar, oc.TipoIncidencia),
                P("descripcion", NpgsqlDbType.Text, oc.Descripcion),
                P("idprioridad", NpgsqlDbType.Integer, oc.IdPrioridad),
                P("idestado", NpgsqlDbType.Integer, oc.IdEstado),
                P("idtecnico", NpgsqlDbType.Integer, oc.IdTecnicoAsignado),
                P("observaciones", NpgsqlDbType.Text, oc.Observaciones),
                P("idtipo", NpgsqlDbType.Integer, oc.IdTipoIncidencia),
                P("idreporta", NpgsqlDbType.Integer, oc.IdUsuarioReporta)),
                "Error al insertar en la tabla Incidencias");
        }

        /// <summary>
        /// Devuelve false si nadie fue actualizado porque otra persona modificó la
        /// incidencia después de que se listó (FilaVersion distinta).
        /// </summary>
        public static bool ModificarIncidencia(Entidades.Gestion_de_Entidades.Incidencia oc)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_incidencias_modificar(@id, @empleado, @idarea, @tipo, @descripcion, @idprioridad, @idestado, @idtecnico, @fechasolucion, @observaciones, @filaversion, @idtipo)",
                P("id", NpgsqlDbType.Integer, oc.IdIncidencia),
                P("empleado", NpgsqlDbType.Varchar, oc.Empleado),
                P("idarea", NpgsqlDbType.Integer, oc.IdArea),
                P("tipo", NpgsqlDbType.Varchar, oc.TipoIncidencia),
                P("descripcion", NpgsqlDbType.Text, oc.Descripcion),
                P("idprioridad", NpgsqlDbType.Integer, oc.IdPrioridad),
                P("idestado", NpgsqlDbType.Integer, oc.IdEstado),
                P("idtecnico", NpgsqlDbType.Integer, oc.IdTecnicoAsignado),
                P("fechasolucion", NpgsqlDbType.Timestamp, oc.FechaSolucion),
                P("observaciones", NpgsqlDbType.Text, oc.Observaciones),
                P("filaversion", NpgsqlDbType.Bytea, oc.FilaVersion),
                P("idtipo", NpgsqlDbType.Integer, oc.IdTipoIncidencia)) > 0,
                "Error al modificar en la tabla Incidencias");
        }

        public static void EliminarIncidencia(Entidades.Gestion_de_Entidades.Incidencia oe)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_incidencias_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oe.IdIncidencia)),
                "Error al eliminar en la tabla Incidencias");
        }

        public static bool AsignarTecnicoTelegram(int idIncidencia, int idTecnico, int idEstadoEnProceso)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_incidencias_asignartecnicotelegram(@id, @idtecnico, @idestado)",
                P("id", NpgsqlDbType.Integer, idIncidencia),
                P("idtecnico", NpgsqlDbType.Integer, idTecnico),
                P("idestado", NpgsqlDbType.Integer, idEstadoEnProceso)) == 1,
                "Error al ejecutar procedimiento de asignación por Telegram");
        }

        public static bool ActualizarEstadoTelegram(int idIncidencia, int idTecnico, int idNuevoEstado, string observacion)
        {
            return ManejoErrores.Intentar(() => EscalarEntero(
                "SELECT sp_incidencias_actualizarestadotelegram(@id, @idtecnico, @idestado, @observaciones)",
                P("id", NpgsqlDbType.Integer, idIncidencia),
                P("idtecnico", NpgsqlDbType.Integer, idTecnico),
                P("idestado", NpgsqlDbType.Integer, idNuevoEstado),
                P("observaciones", NpgsqlDbType.Text, observacion)) == 1,
                "Error al ejecutar procedimiento de actualización de estado por Telegram");
        }

        public static void RegistrarMensajeTelegram(int idIncidencia, long chatId, int messageId)
        {
            try
            {
                Ejecutar(
                    "INSERT INTO telegrammensajes (idincidencia, chatid, messageid) VALUES (@id, @chatid, @messageid)",
                    P("id", NpgsqlDbType.Integer, idIncidencia),
                    P("chatid", NpgsqlDbType.Bigint, chatId),
                    P("messageid", NpgsqlDbType.Integer, messageId));
            }
            catch { /* Ignorar errores de bitácora */ }
        }

        public class MensajeTelegramDTO { public long ChatId { get; set; } public int MessageId { get; set; } }

        public static List<MensajeTelegramDTO> ObtenerMensajesTelegram(int idIncidencia)
        {
            try
            {
                return Listar(
                    "SELECT chatid, messageid FROM telegrammensajes WHERE idincidencia = @id",
                    dr => new MensajeTelegramDTO
                    {
                        ChatId = LargoNulo(dr, "chatid") ?? 0,
                        MessageId = Entero(dr, "messageid")
                    },
                    P("id", NpgsqlDbType.Integer, idIncidencia));
            }
            catch { return new List<MensajeTelegramDTO>(); }
        }
    }
}
