using Datos.Base_de_Datos;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using static Datos.Base_de_Datos.Conexion;

namespace Datos.Gestion_de_Datos
{
    public class UsuarioCD
    {
        private const string ColumnasUsuario =
            "idusuario, nombre, apellido, correo, usuario, password, rol, estado, " +
            "telegramchatid, intentosfallidos, bloqueadohasta, fotoperfil, idarea, nombrearea";

        private static T LeerUsuario<T>(Npgsql.NpgsqlDataReader dr) where T : sp_Usuarios_ListarResult, new()
        {
            return new T
            {
                IdUsuario = Entero(dr, "idusuario"),
                Nombre = Texto(dr, "nombre"),
                Apellido = Texto(dr, "apellido"),
                Correo = Texto(dr, "correo"),
                Usuario = Texto(dr, "usuario"),
                Password = Texto(dr, "password"),
                Rol = Texto(dr, "rol"),
                Estado = Logico(dr, "estado"),
                TelegramChatId = LargoNulo(dr, "telegramchatid"),
                IntentosFallidos = Entero(dr, "intentosfallidos"),
                BloqueadoHasta = FechaNula(dr, "bloqueadohasta"),
                FotoPerfil = Bytes(dr, "fotoperfil"),
                IdArea = EnteroNulo(dr, "idarea"),
                NombreArea = Texto(dr, "nombrearea")
            };
        }

        public static List<sp_Usuarios_ListarResult> ListarUsuarios()
        {
            return ManejoErrores.Intentar(() => Listar<sp_Usuarios_ListarResult>(
                "SELECT " + ColumnasUsuario + " FROM sp_usuarios_listar()",
                LeerUsuario<sp_Usuarios_ListarResult>),
                "Error al ejecutar el procedimiento Listar usuarios");
        }

        public static sp_Usuarios_LoginResult BuscarPorUsuario(string usuario)
        {
            // sp_usuarios_login filtra por Usuario + Estado activo en el servidor.
            // No compara Password aquí: eso lo hace UsuarioLN con BCrypt.
            return ManejoErrores.Intentar(() => Listar<sp_Usuarios_LoginResult>(
                "SELECT " + ColumnasUsuario + " FROM sp_usuarios_login(@usuario::citext)",
                LeerUsuario<sp_Usuarios_LoginResult>,
                P("usuario", NpgsqlDbType.Text, usuario)).FirstOrDefault(),
                "Error al ejecutar el procedimiento Login de usuario");
        }

        public static void InsertarUsuario(Entidades.Gestion_de_Entidades.Usuario oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_insertar(@nombre, @apellido, @correo, @usuario, @password, @rol, @estado)",
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre),
                P("apellido", NpgsqlDbType.Varchar, oc.Apellido),
                P("correo", NpgsqlDbType.Varchar, oc.Correo),
                P("usuario", NpgsqlDbType.Varchar, oc.UsuarioLogin),
                P("password", NpgsqlDbType.Varchar, oc.Password),
                P("rol", NpgsqlDbType.Varchar, oc.Rol),
                P("estado", NpgsqlDbType.Boolean, oc.Estado)),
                "Error al insertar en la tabla Usuarios");
        }

        public static void ModificarUsuario(Entidades.Gestion_de_Entidades.Usuario oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_modificar(@id, @nombre, @apellido, @correo, @usuario, @password, @rol, @estado, @telegramchatid, @fotoperfil)",
                P("id", NpgsqlDbType.Integer, oc.IdUsuario),
                P("nombre", NpgsqlDbType.Varchar, oc.Nombre),
                P("apellido", NpgsqlDbType.Varchar, oc.Apellido),
                P("correo", NpgsqlDbType.Varchar, oc.Correo),
                P("usuario", NpgsqlDbType.Varchar, oc.UsuarioLogin),
                P("password", NpgsqlDbType.Varchar, oc.Password),
                P("rol", NpgsqlDbType.Varchar, oc.Rol),
                P("estado", NpgsqlDbType.Boolean, oc.Estado),
                P("telegramchatid", NpgsqlDbType.Bigint, oc.TelegramChatId),
                P("fotoperfil", NpgsqlDbType.Bytea, oc.FotoPerfil)),
                "Error al modificar en la tabla Usuarios");
        }

        /// <summary>Etapa 3: asigna (o quita, con null) el área del usuario.</summary>
        public static void AsignarArea(int idUsuario, int? idArea)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_asignararea(@id, @idarea)",
                P("id", NpgsqlDbType.Integer, idUsuario),
                P("idarea", NpgsqlDbType.Integer, idArea)),
                "Error al asignar el área del usuario");
        }

        public static void EliminarUsuario(Entidades.Gestion_de_Entidades.Usuario oc)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_eliminar(@id)",
                P("id", NpgsqlDbType.Integer, oc.IdUsuario)),
                "Error al eliminar en la tabla Usuarios");
        }

        public static void RegistrarIntentoFallido(int idUsuario)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_registrarintentofallido(@id)",
                P("id", NpgsqlDbType.Integer, idUsuario)),
                "Error al registrar intento fallido");
        }

        public static void ResetearIntentos(int idUsuario)
        {
            ManejoErrores.Intentar(() => Ejecutar(
                "SELECT sp_usuarios_resetearintentos(@id)",
                P("id", NpgsqlDbType.Integer, idUsuario)),
                "Error al resetear intentos de login");
        }
    }
}
