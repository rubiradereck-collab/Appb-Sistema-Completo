using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Configuration;

namespace Datos.Base_de_Datos
{
    /// <summary>
    /// Acceso a PostgreSQL con Npgsql. Reemplaza al BDIncidenciasDataContext de LINQ to SQL,
    /// que solo funcionaba con SQL Server.
    /// La cadena de conexión se sigue leyendo del App.config con el mismo nombre de antes,
    /// así que solo hay que cambiar su valor (ver App.config.example).
    /// </summary>
    internal static class Conexion
    {
        internal const string NombreCadena = "Datos.Properties.Settings.DBIncidenciasConnectionString2";

        internal static NpgsqlConnection Abrir()
        {
            ConnectionStringSettings cs = ConfigurationManager.ConnectionStrings[NombreCadena];
            if (cs == null || string.IsNullOrWhiteSpace(cs.ConnectionString))
                throw new InvalidOperationException(
                    "No se encontró la cadena de conexión '" + NombreCadena + "' en el App.config.");

            NpgsqlConnection cn = new NpgsqlConnection(cs.ConnectionString);
            cn.Open();
            return cn;
        }

        /// <summary>Crea un parámetro tipado; null se envía como NULL de base de datos.</summary>
        internal static NpgsqlParameter P(string nombre, NpgsqlDbType tipo, object valor)
        {
            return new NpgsqlParameter(nombre, tipo) { Value = valor ?? DBNull.Value };
        }

        internal static List<T> Listar<T>(string sql, Func<NpgsqlDataReader, T> mapear, params NpgsqlParameter[] parametros)
        {
            List<T> lista = new List<T>();
            using (NpgsqlConnection cn = Abrir())
            using (NpgsqlCommand cmd = Comando(cn, sql, parametros))
            using (NpgsqlDataReader dr = cmd.ExecuteReader())
            {
                while (dr.Read())
                    lista.Add(mapear(dr));
            }
            return lista;
        }

        internal static int Ejecutar(string sql, params NpgsqlParameter[] parametros)
        {
            using (NpgsqlConnection cn = Abrir())
            using (NpgsqlCommand cmd = Comando(cn, sql, parametros))
            {
                return cmd.ExecuteNonQuery();
            }
        }

        /// <summary>Devuelve la primera columna de la primera fila como entero (0 si es NULL).</summary>
        internal static int EscalarEntero(string sql, params NpgsqlParameter[] parametros)
        {
            using (NpgsqlConnection cn = Abrir())
            using (NpgsqlCommand cmd = Comando(cn, sql, parametros))
            {
                object valor = cmd.ExecuteScalar();
                return valor == null || valor == DBNull.Value ? 0 : Convert.ToInt32(valor);
            }
        }

        private static NpgsqlCommand Comando(NpgsqlConnection cn, string sql, NpgsqlParameter[] parametros)
        {
            NpgsqlCommand cmd = new NpgsqlCommand(sql, cn);
            if (parametros != null)
                cmd.Parameters.AddRange(parametros);
            return cmd;
        }

        // ---- Lectura de columnas (PostgreSQL devuelve los nombres en minúsculas) ----

        internal static string Texto(NpgsqlDataReader dr, string col)
        {
            int i = dr.GetOrdinal(col);
            return dr.IsDBNull(i) ? null : dr.GetString(i);
        }

        internal static int Entero(NpgsqlDataReader dr, string col)
        {
            return dr.GetInt32(dr.GetOrdinal(col));
        }

        internal static int? EnteroNulo(NpgsqlDataReader dr, string col)
        {
            int i = dr.GetOrdinal(col);
            return dr.IsDBNull(i) ? (int?)null : dr.GetInt32(i);
        }

        internal static long? LargoNulo(NpgsqlDataReader dr, string col)
        {
            int i = dr.GetOrdinal(col);
            return dr.IsDBNull(i) ? (long?)null : dr.GetInt64(i);
        }

        internal static bool Logico(NpgsqlDataReader dr, string col)
        {
            return dr.GetBoolean(dr.GetOrdinal(col));
        }

        internal static DateTime Fecha(NpgsqlDataReader dr, string col)
        {
            return dr.GetDateTime(dr.GetOrdinal(col));
        }

        internal static DateTime? FechaNula(NpgsqlDataReader dr, string col)
        {
            int i = dr.GetOrdinal(col);
            return dr.IsDBNull(i) ? (DateTime?)null : dr.GetDateTime(i);
        }

        internal static byte[] Bytes(NpgsqlDataReader dr, string col)
        {
            int i = dr.GetOrdinal(col);
            return dr.IsDBNull(i) ? null : (byte[])dr.GetValue(i);
        }
    }
}
