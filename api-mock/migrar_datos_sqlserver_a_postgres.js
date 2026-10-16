/*
 * Copia todos los datos de la base SQL Server actual a la nueva base PostgreSQL.
 * Se ejecuta UNA sola vez, después de crear las tablas con BD_Completa.sql.
 *
 *   1. En el .env deja los datos de PostgreSQL (DB_HOST, DB_PORT, DB_USER...) y agrega
 *      los de SQL Server con prefijo SQLSERVER_ (ver .env.example).
 *   2. node migrar_datos_sqlserver_a_postgres.js
 *
 * - Conserva los Id originales y luego ajusta las secuencias IDENTITY.
 * - Todo va en una transacción: si algo falla, PostgreSQL queda vacío como estaba.
 * - Se niega a correr si las tablas de PostgreSQL ya tienen datos.
 */
require('dotenv').config();
const { pool } = require('./db_postgres');

// [tabla, columnas (sin NumeroTicket, que es calculada, ni FilaVersion), columna identity]
const TABLAS = [
  ['Areas', ['IdArea', 'NombreArea'], 'IdArea'],
  ['Estados', ['IdEstado', 'Nombre'], 'IdEstado'],
  ['Prioridades', ['IdPrioridad', 'Nombre'], 'IdPrioridad'],
  ['Guias', ['IdGuia', 'Titulo', 'Problema', 'Solucion'], 'IdGuia'],
  ['Usuarios', ['IdUsuario', 'Nombre', 'Apellido', 'Correo', 'Usuario', 'Password', 'Rol', 'Estado',
    'TelegramChatId', 'IntentosFallidos', 'BloqueadoHasta', 'FotoPerfil'], 'IdUsuario'],
  ['Incidencias', ['IdIncidencia', 'Fecha', 'Empleado', 'IdArea', 'TipoIncidencia', 'Descripcion',
    'IdPrioridad', 'IdEstado', 'IdTecnicoAsignado', 'FechaSolucion', 'Observaciones', 'EscaladoSLA'], 'IdIncidencia'],
  ['Auditoria', ['IdAuditoria', 'Fecha', 'IdUsuario', 'NombreUsuario', 'Accion', 'Entidad', 'EntidadId', 'Detalle'], 'IdAuditoria'],
  ['ReportesMensualesEnviados', ['IdReporte', 'Anio', 'Mes', 'FechaEnvio'], 'IdReporte'],
  ['TelegramMensajes', ['IdIncidencia', 'ChatId', 'MessageId'], null]
];

/**
 * @param {(tabla: string, columnas: string[]) => Promise<object[]>} leerTabla  filas de origen
 * @param {import('pg').PoolClient} pg  cliente de PostgreSQL
 */
async function migrar(leerTabla, pg) {
  for (const [tabla] of TABLAS) {
    const { rows } = await pg.query(`SELECT COUNT(*)::int AS n FROM ${tabla}`);
    if (rows[0].n > 0) throw new Error(`La tabla ${tabla} de PostgreSQL ya tiene datos. Ejecuta la migración sobre una base recién creada.`);
  }

  await pg.query('BEGIN');
  try {
    for (const [tabla, columnas, identity] of TABLAS) {
      const filas = await leerTabla(tabla, columnas);
      const marcadores = columnas.map((_, i) => `$${i + 1}`).join(', ');
      const insert = `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`;
      for (const fila of filas) {
        await pg.query(insert, columnas.map((c) => (fila[c] === undefined ? null : fila[c])));
      }
      if (identity) {
        await pg.query(
          `SELECT setval(pg_get_serial_sequence('${tabla.toLowerCase()}', '${identity.toLowerCase()}'),
                         COALESCE(MAX(${identity}), 1), MAX(${identity}) IS NOT NULL) FROM ${tabla}`);
      }
      console.log(`  ${tabla}: ${filas.length} fila(s)`);
    }
    await pg.query('COMMIT');
  } catch (err) {
    await pg.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const mssql = require('mssql');
  const origen = await new mssql.ConnectionPool({
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    database: process.env.SQLSERVER_NAME || 'DBIncidencias',
    server: process.env.SQLSERVER_HOST,
    port: parseInt(process.env.SQLSERVER_PORT || '1433', 10),
    // useUTC=false: las fechas se leen y se escriben con la misma hora local, sin desfases
    options: { encrypt: true, trustServerCertificate: true, useUTC: false }
  }).connect();

  const leerTabla = async (tabla, columnas) =>
    (await origen.request().query(`SELECT ${columnas.join(', ')} FROM dbo.${tabla}`)).recordset;

  const pg = await pool.connect();
  try {
    console.log('Migrando datos de SQL Server a PostgreSQL...');
    await migrar(leerTabla, pg);
    console.log('Migración completada.');
  } finally {
    pg.release();
    await origen.close();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('La migración falló, no se guardó nada:', err.message);
    process.exit(1);
  });
}

module.exports = { migrar, TABLAS };
