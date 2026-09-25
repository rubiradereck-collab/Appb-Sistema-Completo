require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // true para Azure, false para desarrollo local si no hay certificado
    trustServerCertificate: true // Importante habilitar en entornos locales sin certificado válido
  }
};

let poolPromise = null;

const getSqlServerDb = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
    }
    const pool = await poolPromise;
    return pool;
  } catch (err) {
    console.error('Error al conectar a SQL Server:', err);
    poolPromise = null; // Reseteamos el pool si falla para intentar de nuevo
    throw err;
  }
};

module.exports = {
  sql, // Exportamos sql por si ocupamos tipos como sql.Int, sql.NVarChar, etc.
  getSqlServerDb
};
