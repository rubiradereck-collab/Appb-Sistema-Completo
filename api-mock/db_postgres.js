require('dotenv').config();
const { Pool, types } = require('pg');

/*
 * Conexión a PostgreSQL con 'pg'.
 *
 * Para no reescribir todas las rutas, este módulo imita la forma de uso que tenía
 * 'mssql':   pool.request().input('Id', sql.Int, 5).query('... WHERE Id = @Id')
 * y devuelve { recordset, rowsAffected } igual que antes.
 *
 *  - Los parámetros @Nombre se convierten a $1, $2... de PostgreSQL.
 *  - PostgreSQL devuelve los nombres de columna en minúsculas (idincidencia);
 *    se vuelven a poner en PascalCase (IdIncidencia) para que el JSON que recibe
 *    la app móvil no cambie.
 */

// Las columnas TIMESTAMP guardan hora local de Ecuador (igual que GETDATE() en SQL Server).
// Se interpretan con ese desfase para que el JSON salga con la hora UTC correcta.
const DB_TZ_OFFSET = process.env.DB_TZ_OFFSET || '-05:00';
types.setTypeParser(1114, (valor) => (valor === null ? null : new Date(valor.replace(' ', 'T') + DB_TZ_OFFSET)));

// Nombres en PascalCase de todas las columnas y alias que usa la API
const NOMBRES_COLUMNAS = [
  // Tablas
  'IdArea', 'NombreArea',
  'IdAuditoria', 'Fecha', 'IdUsuario', 'NombreUsuario', 'Accion', 'Entidad', 'EntidadId', 'Detalle',
  'IdEstado', 'Nombre',
  'IdGuia', 'Titulo', 'Problema', 'Solucion',
  'IdIncidencia', 'Empleado', 'TipoIncidencia', 'Descripcion', 'IdPrioridad', 'IdTecnicoAsignado',
  'FechaSolucion', 'Observaciones', 'NumeroTicket', 'EscaladoSLA', 'FilaVersion',
  'IdReporte', 'Anio', 'Mes', 'FechaEnvio',
  'ChatId', 'MessageId',
  'Apellido', 'Correo', 'Usuario', 'Password', 'Rol', 'Estado', 'TelegramChatId',
  'IntentosFallidos', 'BloqueadoHasta', 'FotoPerfil',
  // Etapa 2
  'IdTipoIncidencia', 'IdUsuarioReporta', 'FechaAsignacion', 'FechaPrimeraRespuesta', 'EscaladoSLAProceso',
  'Activo', 'TotalIncidencias', 'NombreUsuarioReporta',
  // Etapa 3
  'Calificacion', 'FechaCalificacion', 'NombreTipo', 'IdEnvio', 'Canal', 'TipoDestino', 'Destinatarios',
  'TotalDestinatarios', 'TotalGuias', 'Guias', 'Resultado',
  // Alias usados en las consultas
  'NombreEstado', 'NombrePrioridad', 'NombreTecnicoAsignado', 'TecnicoAsignado', 'TestStatus', 'Total'
];
const MAPA_COLUMNAS = Object.fromEntries(NOMBRES_COLUMNAS.map((n) => [n.toLowerCase(), n]));

const aPascalCase = (fila) => {
  const salida = {};
  for (const [clave, valor] of Object.entries(fila)) {
    salida[MAPA_COLUMNAS[clave] || clave] = valor;
  }
  return salida;
};

// Marcadores de tipo para que el código existente (sql.Int, sql.VarChar...) siga funcionando.
// 'pg' infiere el tipo a partir del valor y de la columna, así que solo son informativos.
const sql = {
  Int: 'int', BigInt: 'bigint', Bit: 'boolean', VarChar: 'varchar', NVarChar: 'varchar',
  Text: 'text', DateTime: 'timestamp', VarBinary: 'bytea'
};

class Request {
  constructor(pool) {
    this.pool = pool;
    this.parametros = {};
  }

  input(nombre, tipo, valor) {
    if (arguments.length === 2) valor = tipo;
    this.parametros[nombre.toLowerCase()] = valor === undefined ? null : valor;
    return this;
  }

  async query(texto) {
    const valores = [];
    const posiciones = {};
    const consulta = texto.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, nombre) => {
      const clave = nombre.toLowerCase();
      if (!(clave in this.parametros)) throw new Error(`Parámetro SQL no definido: @${nombre}`);
      if (!(clave in posiciones)) {
        valores.push(this.parametros[clave]);
        posiciones[clave] = valores.length;
      }
      return `$${posiciones[clave]}`;
    });

    const resultado = await this.pool.query(consulta, valores);
    return {
      recordset: resultado.rows.map(aPascalCase),
      rowsAffected: [resultado.rowCount]
    };
  }
}

const usarSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: usarSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
});

pool.on('error', (err) => console.error('Error inesperado en el pool de PostgreSQL:', err.message));

const poolCompatible = {
  request: () => new Request(pool),
  query: (texto, valores) => pool.query(texto, valores),
  end: () => pool.end()
};

const getDb = async () => poolCompatible;

module.exports = { sql, getDb, pool };
