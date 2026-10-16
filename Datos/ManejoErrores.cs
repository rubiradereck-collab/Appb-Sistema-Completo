using Npgsql;
using System;

namespace Datos
{
    /// <summary>
    /// Ejecuta una operación de base de datos y envuelve cualquier error en DatosExcepciones,
    /// traduciendo antes los errores de PostgreSQL (UNIQUE, FOREIGN KEY) a mensajes amigables.
    /// </summary>
    internal static class ManejoErrores
    {
        internal static T Intentar<T>(Func<T> operacion, string mensajeError)
        {
            try
            {
                return operacion();
            }
            catch (PostgresException pgEx)
            {
                throw new DatosExcepciones(SqlErrorTraductor.Traducir(pgEx, mensajeError), pgEx);
            }
            catch (Exception ex)
            {
                throw new DatosExcepciones(mensajeError, ex);
            }
        }

        internal static void Intentar(Action operacion, string mensajeError)
        {
            Intentar<object>(() => { operacion(); return null; }, mensajeError);
        }
    }
}
