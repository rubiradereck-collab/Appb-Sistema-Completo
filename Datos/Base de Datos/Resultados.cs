using System;

namespace Datos.Base_de_Datos
{
    // Clases de resultado de las funciones sp_*_Listar. Conservan los mismos nombres y
    // propiedades que generaba LINQ to SQL para que la capa Lógica no tenga que cambiar.
    // Única diferencia: los campos binarios ahora son byte[] en vez de System.Data.Linq.Binary.

    public class sp_Areas_ListarResult
    {
        public int IdArea { get; set; }
        public string NombreArea { get; set; }
    }

    public class sp_Estados_ListarResult
    {
        public int IdEstado { get; set; }
        public string Nombre { get; set; }
    }

    public class sp_Prioridades_ListarResult
    {
        public int IdPrioridad { get; set; }
        public string Nombre { get; set; }
    }

    public class sp_Guias_ListarResult
    {
        public int IdGuia { get; set; }
        public string Titulo { get; set; }
        public string Problema { get; set; }
        public string Solucion { get; set; }
        public int? IdTipoIncidencia { get; set; }
        public string NombreTipo { get; set; }
    }

    public class sp_Auditoria_ListarResult
    {
        public int IdAuditoria { get; set; }
        public DateTime Fecha { get; set; }
        public int? IdUsuario { get; set; }
        public string NombreUsuario { get; set; }
        public string Accion { get; set; }
        public string Entidad { get; set; }
        public int? EntidadId { get; set; }
        public string Detalle { get; set; }
    }

    public class sp_Incidencias_ListarResult
    {
        public int IdIncidencia { get; set; }
        public string NumeroTicket { get; set; }
        public DateTime Fecha { get; set; }
        public string Empleado { get; set; }
        public int IdArea { get; set; }
        public string NombreArea { get; set; }
        public string TipoIncidencia { get; set; }
        public string Descripcion { get; set; }
        public int IdPrioridad { get; set; }
        public string NombrePrioridad { get; set; }
        public int IdEstado { get; set; }
        public string NombreEstado { get; set; }
        public int? IdTecnicoAsignado { get; set; }
        public string TecnicoAsignado { get; set; }
        public DateTime? FechaSolucion { get; set; }
        public string Observaciones { get; set; }
        public byte[] FilaVersion { get; set; }
        public int? IdTipoIncidencia { get; set; }
        public int? IdUsuarioReporta { get; set; }
        public DateTime? FechaAsignacion { get; set; }
        public DateTime? FechaPrimeraRespuesta { get; set; }
        public int? Calificacion { get; set; }
        public DateTime? FechaCalificacion { get; set; }
    }

    public class sp_TiposIncidencia_ListarResult
    {
        public int IdTipoIncidencia { get; set; }
        public string Nombre { get; set; }
        public bool Activo { get; set; }
        public int TotalIncidencias { get; set; }
    }

    public class sp_Usuarios_ListarResult
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public string Correo { get; set; }
        public string Usuario { get; set; }
        public string Password { get; set; }
        public string Rol { get; set; }
        public bool Estado { get; set; }
        public long? TelegramChatId { get; set; }
        public int IntentosFallidos { get; set; }
        public DateTime? BloqueadoHasta { get; set; }
        public byte[] FotoPerfil { get; set; }
        public int? IdArea { get; set; }
        public string NombreArea { get; set; }
    }

    // sp_usuarios_login devuelve las mismas columnas que sp_usuarios_listar
    public class sp_Usuarios_LoginResult : sp_Usuarios_ListarResult
    {
    }
}
