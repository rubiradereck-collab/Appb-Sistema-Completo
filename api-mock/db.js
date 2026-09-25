const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function getDb() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  return db;
}

async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Usuarios (
      IdUsuario INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre TEXT,
      Apellido TEXT,
      Correo TEXT,
      UsuarioLogin TEXT,
      Password TEXT,
      Rol TEXT,
      Estado BOOLEAN,
      TelegramChatId INTEGER,
      FotoPerfil BLOB
    );

    CREATE TABLE IF NOT EXISTS Areas (
      IdArea INTEGER PRIMARY KEY AUTOINCREMENT,
      NombreArea TEXT
    );

    CREATE TABLE IF NOT EXISTS Prioridades (
      IdPrioridad INTEGER PRIMARY KEY AUTOINCREMENT,
      NombrePrioridad TEXT
    );

    CREATE TABLE IF NOT EXISTS Estados (
      IdEstado INTEGER PRIMARY KEY AUTOINCREMENT,
      NombreEstado TEXT
    );

    CREATE TABLE IF NOT EXISTS Incidencias (
      IdIncidencia INTEGER PRIMARY KEY AUTOINCREMENT,
      NumeroTicket TEXT,
      Fecha DATETIME,
      Empleado TEXT,
      IdArea INTEGER,
      TipoIncidencia TEXT,
      Descripcion TEXT,
      IdPrioridad INTEGER,
      IdEstado INTEGER,
      IdTecnicoAsignado INTEGER,
      FechaSolucion DATETIME,
      Observaciones TEXT
    );

    CREATE TABLE IF NOT EXISTS Guias (
      IdGuia INTEGER PRIMARY KEY AUTOINCREMENT,
      Titulo TEXT,
      Problema TEXT,
      Solucion TEXT
    );

    CREATE TABLE IF NOT EXISTS Auditoria (
      IdAuditoria INTEGER PRIMARY KEY AUTOINCREMENT,
      IdUsuario INTEGER,
      NombreCompleto TEXT,
      Accion TEXT,
      Entidad TEXT,
      IdEntidad INTEGER,
      Detalle TEXT,
      Fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Data
  const countUsuarios = await db.get('SELECT COUNT(*) as count FROM Usuarios');
  if (countUsuarios.count === 0) {
    const bcrypt = require('bcryptjs');
    const adminPass = await bcrypt.hash('admin123', 10);
    const tecPass = await bcrypt.hash('tec123', 10);
    const userPass = await bcrypt.hash('user123', 10);

  // Seed Data - Usuarios
  await db.exec(`
    INSERT OR IGNORE INTO Usuarios (IdUsuario, Nombre, Apellido, Correo, UsuarioLogin, Password, Rol, Estado) 
    VALUES 
      (1, 'Admin', 'Sistema', 'admin@empresa.com', 'admin', '$2b$10$f96SjdxuWO0bDoaiWScSMuEoJK/FrPvO9x0Jg2I4sbXxv1msTypb2', 'Administrador', 1),
      (2, 'Juan', 'Técnico', 'tecnico@empresa.com', 'tec1', '$2b$10$f96SjdxuWO0bDoaiWScSMuEoJK/FrPvO9x0Jg2I4sbXxv1msTypb2', 'Técnico', 1),
      (3, 'María', 'Usuario', 'usuario@empresa.com', 'user', '$2b$10$f96SjdxuWO0bDoaiWScSMuEoJK/FrPvO9x0Jg2I4sbXxv1msTypb2', 'Usuario', 1);
  `);

  // Seed Data - Catálogos (Asegurar que coinciden con C#)
  await db.exec(`
    INSERT OR IGNORE INTO Areas (IdArea, NombreArea) VALUES 
      (1, 'Sistemas'), (2, 'Contabilidad'), (3, 'Recursos Humanos'), (4, 'Ventas');

    INSERT OR IGNORE INTO Prioridades (IdPrioridad, NombrePrioridad) VALUES 
      (1, 'Alta'), (2, 'Media'), (3, 'Baja');

    INSERT OR IGNORE INTO Estados (IdEstado, NombreEstado) VALUES 
      (1, 'Pendiente'), (2, 'En Proceso'), (3, 'Resuelto'), (4, 'Cerrado');
  `);

  // Seed Data - Incidencias
  const countInc = await db.get('SELECT COUNT(*) as c FROM Incidencias');
  if (countInc.c === 0) {
    await db.exec(`
      INSERT INTO Incidencias (IdIncidencia, NumeroTicket, Fecha, Empleado, IdArea, TipoIncidencia, Descripcion, IdPrioridad, IdEstado, IdTecnicoAsignado)
      VALUES 
        (1, 'INC-001', datetime('now', '-3 days'), 'María Usuario', 2, 'No imprime', 'La impresora de contabilidad no responde desde ayer.', 2, 1, NULL),
        (2, 'INC-002', datetime('now', '-1 hours'), 'Carlos Ventas', 4, 'Sin internet', 'No hay conexión a internet en la oficina 3.', 1, 1, NULL),
        (3, 'INC-003', datetime('now', '-5 days'), 'Ana RH', 3, 'Software contable', 'No puedo abrir el sistema de nóminas, da error de conexión.', 1, 2, 2),
        (4, 'INC-004', datetime('now', '-10 days'), 'Pedro Gerencia', 1, 'Cambio de mouse', 'El click derecho no funciona bien.', 3, 3, 2);
    `);
  }


    await db.run(`INSERT INTO Incidencias (NumeroTicket, Fecha, Empleado, IdArea, TipoIncidencia, Descripcion, IdPrioridad, IdEstado, IdTecnicoAsignado, Observaciones) VALUES
      ('INC-001', datetime('now'), 'Juan Perez', 1, 'Hardware', 'El monitor no enciende', 2, 1, null, ''),
      ('INC-002', datetime('now'), 'Maria Lopez', 2, 'Software', 'No puedo acceder al ERP', 1, 2, 2, 'Revisando permisos')
    `);

    await db.run(`INSERT INTO Guias (Titulo, Problema, Solucion) VALUES
      ('Impresora no imprime', 'Los trabajos de impresión quedan en cola sin imprimirse.', 'Reiniciar el spooler de impresión desde Servicios de Windows. Verificar que la impresora esté encendida y con papel/tóner.'),
      ('No enciende el monitor', 'El monitor está en negro y no da señal.', 'Verificar que el cable de poder y el cable HDMI/DisplayPort estén bien conectados a la CPU.'),
      ('No hay acceso a internet', 'El equipo muestra el ícono del mundo desconectado.', 'Reiniciar el router/switch. Verificar conexión del cable de red o la clave de WiFi. Contactar al proveedor.'),
      ('Olvidé mi contraseña', 'El usuario no puede ingresar a su cuenta corporativa.', 'El administrador debe ingresar al módulo de Usuarios, seleccionar el usuario y asignarle una nueva contraseña temporal.')
    `);

    console.log('Database seeded!');
  } else {
    console.log('Database already initialized');
  }

  await db.close();
}

if (require.main === module) {
  initDb().catch(console.error);
}

module.exports = { getDb, initDb };
