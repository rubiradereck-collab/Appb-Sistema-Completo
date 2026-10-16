require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { getDb, sql } = require("./db_postgres");

const axios = require('axios');

const enviarTelegram = async (chatId, text, reply_markup = null) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return null;
  try {
    const payload = { chat_id: chatId, text: text };
    if (reply_markup) payload.reply_markup = reply_markup;
    const res = await require('axios').post(`https://api.telegram.org/bot${token}/sendMessage`, payload);
    return res.data.result.message_id;
  } catch (err) {
    console.error('Error al enviar Telegram:', err.message);
    return null;
  }
};

const notificarNuevaIncidencia = async (pool, incidencia, origen = "App Móvil", idTecnicoAsignado = null) => {
  try {
    let query = "SELECT TelegramChatId FROM Usuarios WHERE Rol = 'Técnico' AND Estado = TRUE AND TelegramChatId IS NOT NULL";
    const req = pool.request();
    if (idTecnicoAsignado) {
       query += " AND IdUsuario = @IdTecnico";
       req.input('IdTecnico', sql.Int, idTecnicoAsignado);
    }
    const tecnicos = await req.query(query);
    const ticket = incidencia.NumeroTicket || `#${incidencia.IdIncidencia}`;
    const mensaje = `🆕 Nueva incidencia ${ticket} (${origen})\nEmpleado: ${incidencia.Empleado}\nTipo: ${incidencia.TipoIncidencia}\nDescripción: ${incidencia.Descripcion}`;
    const reply_markup = idTecnicoAsignado ? null : { inline_keyboard: [[{ text: "Aceptar ticket", callback_data: `aceptar_${incidencia.IdIncidencia}` }]] };
    for (const t of tecnicos.recordset) {
      const messageId = await enviarTelegram(t.TelegramChatId, mensaje, reply_markup);
      if (messageId && !idTecnicoAsignado) {
         try {
           await pool.request()
              .input('IdIncidencia', sql.Int, incidencia.IdIncidencia)
              .input('ChatId', sql.BigInt, t.TelegramChatId)
              .input('MessageId', sql.Int, messageId)
              .query("INSERT INTO TelegramMensajes (IdIncidencia, ChatId, MessageId) VALUES (@IdIncidencia, @ChatId, @MessageId)");
         } catch(dbErr) { console.error("DB Insert error TelegramMensajes", dbErr); }
      }
    }
  } catch (err) {
    console.error('Error al notificar nueva incidencia', err);
  }
};

// Etapa 2: al asignar se avisa al técnico y a quien reportó; al cambiar de estado,
// al técnico asignado y a quien reportó. Nunca se avisa a quien hizo el cambio.
// Los mensajes van en texto plano (sin parse_mode), así que no hace falta escapar nada.
const notificarActualizacionIncidencia = async (pool, incidenciaId, accion, _tecnicoId, _nuevoValor, idActor = null) => {
  try {
    const r = await pool.request().input('Id', sql.Int, incidenciaId).query(`
      SELECT i.NumeroTicket, e.Nombre AS NombreEstado, i.Observaciones,
             t.IdUsuario AS IdTecnico, t.Nombre || ' ' || t.Apellido AS NombreTecnico,
             CASE WHEN t.Estado THEN t.TelegramChatId END AS ChatTecnico,
             u.IdUsuario AS IdReporta,
             CASE WHEN u.Estado THEN u.TelegramChatId END AS ChatReporta
      FROM Incidencias i
      JOIN Estados e ON e.IdEstado = i.IdEstado
      LEFT JOIN Usuarios t ON t.IdUsuario = i.IdTecnicoAsignado
      LEFT JOIN Usuarios u ON u.IdUsuario = i.IdUsuarioReporta
      WHERE i.IdIncidencia = @Id`);
    const inc = r.recordset[0];
    if (!inc) return;
    // Nombres en minúsculas porque los alias de esta consulta no están en el mapa de columnas
    const ticket = inc.NumeroTicket;
    const estado = inc.NombreEstado;
    const tecnico = { id: inc.idtecnico, nombre: inc.nombretecnico, chat: inc.chattecnico };
    const reporta = { id: inc.idreporta, chat: inc.chatreporta };

    const avisos = [];
    if (accion === 'asignar') {
      avisos.push([tecnico, `🔔 Se te asignó la ${ticket}.`]);
      avisos.push([reporta, `🔔 Tu ${ticket} fue asignada a ${tecnico.nombre || 'un técnico'}.`]);
    } else if (accion === 'estado') {
      avisos.push([tecnico, `ℹ️ La ${ticket} ahora está ${estado}.`]);
      const obs = inc.Observaciones ? `\nObservación: ${inc.Observaciones}` : '';
      avisos.push([reporta, `ℹ️ Tu ${ticket} ahora está ${estado}.${obs}`]);
    }

    const enviados = new Set();
    for (const [destino, texto] of avisos) {
      if (!destino.chat || destino.id === idActor || enviados.has(String(destino.chat))) continue;
      enviados.add(String(destino.chat));
      await enviarTelegram(destino.chat, texto);
    }
  } catch (err) {
    console.error('Error al notificar actualizacion', err);
  }
};

const app = express();
app.use((req,res,next)=>{console.log('['+new Date().toLocaleTimeString()+'] '+req.method+' '+req.url.replace(/token=[^&]+/i,'token=***'));next();});
app.use(cors());
  app.use('/descargas', require('express').static(require('path').join(__dirname, 'public-descargas')));


app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET no esta definido en .env o tiene menos de 32 caracteres. El servidor no puede iniciar.");
  process.exit(1);
}

// Configuración Nodemailer
let smtpConfigured = false;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpConfigured = true;
} else {
  console.log('SMTP no configurado');
}

const getTransporter = () => {
  if (!smtpConfigured) return null;
  const tlsOptions = {};
  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
     tlsOptions.rejectUnauthorized = false;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: Object.keys(tlsOptions).length ? tlsOptions : undefined
  });
};

app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT 1 AS TestStatus");
    res.json({ success: true, message: "Conexión a PostgreSQL exitosa", data: result.recordset });
  } catch (err) {
    console.error("Test DB falló:", err);
    res.status(500).json({ success: false, message: "No se pudo conectar a la base de datos" });
  }
});

app.post('/api/auth/recuperar-password', async (req, res) => {
    try {
      const { Correo } = req.body;
      if (!Correo) return res.status(400).json({ message: 'Correo requerido' });
      
      const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ message: 'Servicio de correo no configurado' });

      const pool = await getDb();
      const userRes = await pool.request()
        .input('Correo', sql.VarChar, Correo)
        .query('SELECT * FROM Usuarios WHERE Correo = @Correo AND Estado = TRUE');
  
      if (userRes.recordset.length === 0) {
        return res.status(200).json({ message: 'Si el correo existe, se han enviado las instrucciones.' });
      }
  
      const usuario = userRes.recordset[0];
      const nuevaClave = Math.random().toString(36).slice(-8); 
      const hash = await bcrypt.hash(nuevaClave, 10);
      
      // SEND EMAIL FIRST
      try {
        await transporter.sendMail({
          from: `"APPB Soporte" <${process.env.SMTP_USER}>`,
          to: Correo,
          subject: 'Recuperación de Contraseña - APPB',
          html: `
            <h3>Hola, ${usuario.Nombre}</h3>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Tu nueva contraseña temporal es: <strong>${nuevaClave}</strong></p>
            <p>Te recomendamos cambiarla inmediatamente después de iniciar sesión en el apartado de Perfil.</p>
            <br/>
            <p>Atentamente,<br/>Equipo de Soporte APPB</p>
          `
        });
      } catch (mailErr) {
        console.error("Error enviando correo de recuperacion:", mailErr.message);
        return res.status(500).json({ message: "No se pudo enviar el correo con la nueva contraseña. No se han guardado cambios." });
      }
  
      // UPDATE ONLY IF MAIL SUCCEEDED
      await pool.request()
        .input('Id', sql.Int, usuario.IdUsuario)
        .input('Hash', sql.VarChar, hash)
        .query('UPDATE Usuarios SET Password = @Hash, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @Id');
  
      res.status(200).json({ message: 'Si el correo existe, se han enviado las instrucciones.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("Usuario", sql.VarChar, username)
      .query("SELECT * FROM Usuarios WHERE Usuario = @Usuario");
      
    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
    if (user.Estado === false) {
      return res.status(401).json({ success: false, message: "Usuario inactivo" });
    }
    
    if (user.BloqueadoHasta && new Date(user.BloqueadoHasta) > new Date()) {
      const faltan = Math.ceil((new Date(user.BloqueadoHasta) - new Date()) / 60000);
        return res.status(401).json({ success: false, message: "Cuenta bloqueada. Intenta de nuevo en " + faltan + " minuto(s)." });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      const intentos = (user.IntentosFallidos || 0) + 1;
      // 3 intentos fallidos => bloqueo de 15 minutos (la hora la calcula PostgreSQL)
      await pool.request()
        .input("IdUsuario", sql.Int, user.IdUsuario)
        .input("IntentosFallidos", sql.Int, intentos)
        .input("Bloquear", sql.Bit, intentos >= 3)
        .query("UPDATE Usuarios SET IntentosFallidos = @IntentosFallidos, BloqueadoHasta = CASE WHEN @Bloquear THEN LOCALTIMESTAMP + INTERVAL '15 minutes' ELSE NULL END WHERE IdUsuario = @IdUsuario");
        
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    await pool.request()
      .input("IdUsuario", sql.Int, user.IdUsuario)
      .query("UPDATE Usuarios SET IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @IdUsuario");
      
    const token = jwt.sign(
      { IdUsuario: user.IdUsuario, Rol: user.Rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    const userSafe = { ...user };
    delete userSafe.Password;
    if (userSafe.FotoPerfil && Buffer.isBuffer(userSafe.FotoPerfil)) {
      userSafe.FotoPerfil = `data:image/jpeg;base64,${userSafe.FotoPerfil.toString('base64')}`;
    }
    res.json({ success: true, token, user: userSafe });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  
  // Soporte para token por query string (ej: para descargas desde el navegador)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ message: "Token requerido" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token inválido o expirado" });
    req.user = decoded;
    next();
  });
};;
app.post('/api/interno/notificar', async (req, res) => {
  if (!process.env.INTERNAL_API_KEY || req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  try {
    const { tipoEvento, idIncidencia, idTecnicoAsignado, nuevoEstado, empleado, tipoIncidencia, descripcion, origen, idActor } = req.body;
    const pool = await getDb();

    if (tipoEvento === 'nueva') {
      const mockIncidencia = { 
        IdIncidencia: idIncidencia, 
        Empleado: empleado || 'N/A', 
        TipoIncidencia: tipoIncidencia || 'N/A', 
        Descripcion: descripcion || '' 
      };
      await notificarNuevaIncidencia(pool, mockIncidencia, origen || 'Escritorio', idTecnicoAsignado);
    } else if (tipoEvento === 'asignar') {
      await notificarActualizacionIncidencia(pool, idIncidencia, 'asignar', idTecnicoAsignado, null, idActor || null);
    } else if (tipoEvento === 'estado') {
      await notificarActualizacionIncidencia(pool, idIncidencia, 'estado', idTecnicoAsignado, nuevoEstado, idActor || null);
    }
    
    return res.status(200).json({ message: 'Notificaciones enviadas' });
  } catch (err) {
    console.error('Error interno notificar:', err);
    return res.status(500).json({ message: 'Error enviando notificaciones' });
  }
});

app.use(verifyToken);

// Error 500 sin exponer detalles internos (SQL, rutas) al cliente
const responderError = (res, err) => {
  console.error(err);
  return res.status(500).json({ message: "Error interno del servidor" });
};

const requireAdmin = (req, res, next) => {
  if (req.user.Rol !== "Administrador") {
    return res.status(403).json({ message: "Acceso denegado: Se requiere rol de Administrador" });
  }
  next();
};

// Nombre completo del usuario autenticado (para filtrar incidencias del rol Usuario por Empleado)
async function obtenerNombreCompleto(pool, idUsuario) {
  const r = await pool.request()
    .input("Id", sql.Int, idUsuario)
    .query("SELECT Nombre, Apellido FROM Usuarios WHERE IdUsuario = @Id");
  if (!r.recordset[0]) return null;
  return `${(r.recordset[0].Nombre || "").trim()} ${(r.recordset[0].Apellido || "").trim()}`.trim();
}

async function registrarAuditoria(pool, req, accion, idRef, detalles, entidad = "Incidencia") {
  try {
    const u = await pool.request()
      .input("Id", sql.Int, req.user.IdUsuario)
      .query("SELECT Nombre, Apellido FROM Usuarios WHERE IdUsuario = @Id");
    const nombre = u.recordset[0] ? `${u.recordset[0].Nombre} ${u.recordset[0].Apellido}` : "Desconocido";
    await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .input("NombreUsuario", sql.VarChar, nombre)
      .input("Accion", sql.VarChar, accion)
      .input("Entidad", sql.VarChar, entidad)
      .input("EntidadId", sql.Int, idRef ? parseInt(idRef, 10) : null)
      .input("Detalle", sql.VarChar, detalles)
      .query("INSERT INTO Auditoria (IdUsuario, NombreUsuario, Accion, Entidad, EntidadId, Detalle) VALUES (@IdUsuario, @NombreUsuario, @Accion, @Entidad, @EntidadId, @Detalle)");
  } catch (err) {
    console.error("Error registrando auditoria:", err.message);
  }
}

// ===== Etapa 2: reglas compartidas =====
const ROLES_VALIDOS = ["Administrador", "Técnico", "Usuario"];

// Condición SQL "esta incidencia la reportó el usuario autenticado": por IdUsuarioReporta y,
// en tickets antiguos sin ese dato, por el nombre (como antes). Agrega los parámetros al request.
async function filtroReportante(pool, request, req, alias = "i") {
  const nombre = await obtenerNombreCompleto(pool, req.user.IdUsuario);
  request.input("IdYo", sql.Int, req.user.IdUsuario);
  request.input("NombreCompleto", sql.VarChar, (nombre || "").toLowerCase());
  return `(${alias}.IdUsuarioReporta = @IdYo OR (${alias}.IdUsuarioReporta IS NULL AND LOWER(LTRIM(RTRIM(${alias}.Empleado))) = @NombreCompleto))`;
}

async function obtenerEstados(pool) {
  const r = await pool.request().query("SELECT IdEstado, Nombre FROM Estados");
  const porNombre = (n) => r.recordset.find(e => e.Nombre === n)?.IdEstado;
  return { lista: r.recordset, porNombre };
}

const aEntero = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? NaN : n;
};

app.get("/api/areas", async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT * FROM Areas");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

app.post("/api/areas", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("NombreArea", sql.VarChar, req.body.NombreArea)
      .query("INSERT INTO Areas (NombreArea) VALUES (@NombreArea) RETURNING IdArea");
    res.status(201).json({ id: result.recordset[0].IdArea });
  } catch (err) { responderError(res, err); }
});

app.put("/api/areas/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    await pool.request()
      .input("IdArea", sql.Int, req.params.id)
      .input("NombreArea", sql.VarChar, req.body.NombreArea)
      .query("UPDATE Areas SET NombreArea = @NombreArea WHERE IdArea = @IdArea");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.delete("/api/areas/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    await pool.request().input("IdArea", sql.Int, req.params.id).query("DELETE FROM Areas WHERE IdArea = @IdArea");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.get("/api/prioridades", async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT IdPrioridad, Nombre AS NombrePrioridad FROM Prioridades ORDER BY IdPrioridad");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

app.get("/api/estados", async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT IdEstado, Nombre AS NombreEstado FROM Estados ORDER BY IdEstado");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

// ===== Catálogo de tipos de incidencia (Etapa 2) =====
// ?activos=1 devuelve solo los que se ofrecen al reportar
app.get("/api/tipos-incidencia", async (req, res) => {
  try {
    const pool = await getDb();
    const r = await pool.request()
      .input("Solo", sql.Bit, req.query.activos === "1" || req.query.activos === "true")
      .query("SELECT * FROM sp_tiposincidencia_listar(@Solo)");
    res.json(r.recordset);
  } catch (err) { responderError(res, err); }
});

const validarNombreTipo = (nombre) => {
  const n = (nombre || "").trim();
  if (!n || n.length > 100) return null;
  return n;
};

app.post("/api/tipos-incidencia", requireAdmin, async (req, res) => {
  try {
    const nombre = validarNombreTipo(req.body.Nombre);
    if (!nombre) return res.status(400).json({ message: "El nombre del tipo es obligatorio (máximo 100 caracteres)." });
    const activo = req.body.Activo === undefined ? true : !!req.body.Activo;
    const pool = await getDb();
    let id;
    try {
      const r = await pool.request().input("Nombre", sql.VarChar, nombre).input("Activo", sql.Bit, activo)
        .query("SELECT sp_tiposincidencia_insertar(@Nombre, @Activo) AS Id");
      id = r.recordset[0].Id ?? r.recordset[0].id;
    } catch (dbErr) {
      if (dbErr.code === "23505") return res.status(409).json({ message: "Ya existe un tipo con ese nombre." });
      throw dbErr;
    }
    await registrarAuditoria(pool, req, "Crear", id, `Tipo: ${nombre}`, "TipoIncidencia");
    res.status(201).json({ id });
  } catch (err) { responderError(res, err); }
});

app.put("/api/tipos-incidencia/:id", requireAdmin, async (req, res) => {
  try {
    const id = aEntero(req.params.id);
    const nombre = validarNombreTipo(req.body.Nombre);
    if (!id) return res.status(400).json({ message: "Id inválido." });
    if (!nombre) return res.status(400).json({ message: "El nombre del tipo es obligatorio (máximo 100 caracteres)." });
    const pool = await getDb();
    const actual = (await pool.request().input("Id", sql.Int, id)
      .query("SELECT Nombre, Activo FROM TiposIncidencia WHERE IdTipoIncidencia = @Id")).recordset[0];
    if (!actual) return res.status(404).json({ message: "Tipo no encontrado." });
    const activo = req.body.Activo === undefined ? actual.Activo : !!req.body.Activo;
    if (!activo) {
      const otros = await pool.request().input("Id", sql.Int, id)
        .query("SELECT COUNT(*)::int AS Total FROM TiposIncidencia WHERE Activo AND IdTipoIncidencia <> @Id");
      if (otros.recordset[0].Total === 0) return res.status(400).json({ message: "Debe quedar al menos un tipo activo." });
    }
    try {
      await pool.request().input("Id", sql.Int, id).input("Nombre", sql.VarChar, nombre).input("Activo", sql.Bit, activo)
        .query("SELECT sp_tiposincidencia_modificar(@Id, @Nombre, @Activo)");
    } catch (dbErr) {
      if (dbErr.code === "23505") return res.status(409).json({ message: "Ya existe un tipo con ese nombre." });
      throw dbErr;
    }
    await registrarAuditoria(pool, req, "Modificar", id,
      `Tipo: ${actual.Nombre} → ${nombre} | Activo: ${actual.Activo ? "Sí" : "No"} → ${activo ? "Sí" : "No"}`, "TipoIncidencia");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

// Si el tipo ya tiene tickets no se borra: se desactiva (eliminado = false)
app.delete("/api/tipos-incidencia/:id", requireAdmin, async (req, res) => {
  try {
    const id = aEntero(req.params.id);
    if (!id) return res.status(400).json({ message: "Id inválido." });
    const pool = await getDb();
    const actual = (await pool.request().input("Id", sql.Int, id)
      .query("SELECT Nombre FROM TiposIncidencia WHERE IdTipoIncidencia = @Id")).recordset[0];
    if (!actual) return res.status(404).json({ message: "Tipo no encontrado." });
    const otros = await pool.request().input("Id", sql.Int, id)
      .query("SELECT COUNT(*)::int AS Total FROM TiposIncidencia WHERE Activo AND IdTipoIncidencia <> @Id");
    if (otros.recordset[0].Total === 0) return res.status(400).json({ message: "Debe quedar al menos un tipo activo." });

    const r = await pool.request().input("Id", sql.Int, id).query("SELECT sp_tiposincidencia_eliminar(@Id) AS Resultado");
    const eliminado = (r.recordset[0].Resultado ?? r.recordset[0].resultado) === 1;
    await registrarAuditoria(pool, req, eliminado ? "Eliminar" : "Desactivar", id, `Tipo: ${actual.Nombre}`, "TipoIncidencia");
    res.json({ success: true, eliminado });
  } catch (err) { responderError(res, err); }
});

app.get("/api/guias", async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT * FROM Guias");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

app.post("/api/guias/:id/enviar", async (req, res) => {
  try {
    const { correoDestino } = req.body;
    if (!correoDestino) return res.status(400).json({ error: "correoDestino es requerido" });
    
    const pool = await getDb();
    const result = await pool.request()
      .input("IdGuia", sql.Int, req.params.id)
      .query("SELECT * FROM Guias WHERE IdGuia = @IdGuia");
      
    if (result.recordset.length === 0) return res.status(404).json({ error: "Guía no encontrada" });
    const guia = result.recordset[0];
    
    try {
      const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ error: 'Servicio de correo no configurado' });
      await transporter.sendMail({
        from: `"Sistema de Incidencias APPB" <${process.env.SMTP_USER || "noreply@appb.com"}>`,
        to: correoDestino,
        subject: `Guías de Ayuda - Sistema de Incidencias APPB`,
        html: `
          <h2 style="color: #2b6b9a;">${guia.Titulo}</h2>
          <hr />
          <h4 style="color: #153250;">Problema:</h4>
          <p>${guia.Problema.replace(/\n/g, '<br/>')}</p>
          <br/>
          <h4 style="color: #153250;">Solución recomendada:</h4>
          <p>${guia.Solucion.replace(/\n/g, '<br/>')}</p>
          <hr />
          <p style="font-size: 12px; color: gray;">Generado por Sistema de Gestión de Incidencias APPB</p>
        `
      });
      res.json({ success: true, message: "Correo enviado exitosamente" });
    } catch (mailErr) {
      console.error("Error al enviar guía:", mailErr.message);
      res.status(500).json({ error: "No se pudo enviar el correo. Revisa la configuración SMTP." });
    }
  } catch (err) { responderError(res, err); }
});

app.post("/api/guias", requireAdmin, async (req, res) => {
  try {
    const { Titulo, Problema, Solucion } = req.body;
    const pool = await getDb();
    await pool.request()
      .input("Titulo", sql.VarChar, Titulo)
      .input("Problema", sql.VarChar, Problema)
      .input("Solucion", sql.VarChar, Solucion)
      .query("INSERT INTO Guias (Titulo, Problema, Solucion) VALUES (@Titulo, @Problema, @Solucion)");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.put("/api/guias/:id", requireAdmin, async (req, res) => {
  try {
    const { Titulo, Problema, Solucion } = req.body;
    const pool = await getDb();
    await pool.request()
      .input("IdGuia", sql.Int, req.params.id)
      .input("Titulo", sql.VarChar, Titulo)
      .input("Problema", sql.VarChar, Problema)
      .input("Solucion", sql.VarChar, Solucion)
      .query("UPDATE Guias SET Titulo = @Titulo, Problema = @Problema, Solucion = @Solucion WHERE IdGuia = @IdGuia");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.delete("/api/guias/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    await pool.request()
      .input("IdGuia", sql.Int, req.params.id)
      .query("DELETE FROM Guias WHERE IdGuia = @IdGuia");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.get("/api/auditoria", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request().query("SELECT * FROM Auditoria ORDER BY Fecha DESC");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

app.post("/api/reportes/enviar", requireAdmin, async (req, res) => {
  try {
    const { pdfBase64, filename, email, sendToAll, asunto, mensaje } = req.body;
    if (!pdfBase64) return res.status(400).json({ message: "Falta el PDF" });
    if (!sendToAll && !email) return res.status(400).json({ message: "Falta el correo destino" });

    const transporter = getTransporter();
    if (!transporter) return res.status(503).json({ message: "Servicio de correo no configurado" });

    const adjunto = {
      filename: filename || "Reporte.pdf",
      content: pdfBase64.split("base64,")[1] || pdfBase64,
      encoding: "base64"
    };
    const remitente = `"Sistema de Incidencias APPB" <${process.env.SMTP_USER}>`;
    const subject = asunto || (sendToAll ? "Guías de Ayuda - Sistema de Incidencias APPB" : "Reporte de Incidencias - Sistema APPB");
    const text = mensaje || (sendToAll
      ? "Adjunto encontrará el catálogo de guías rápidas de solución a problemas frecuentes."
      : "Adjunto encontrará el reporte generado desde el Sistema de Incidencias APPB.");

    const pool = await getDb();

    if (sendToAll) {
      // Todos los usuarios activos con correo, en copia oculta y por lotes de 50
      const r = await pool.request().query("SELECT Correo FROM Usuarios WHERE Estado = TRUE AND Correo IS NOT NULL AND LTRIM(RTRIM(Correo)) <> ''");
      const destinatarios = r.recordset.map(u => u.Correo.trim());
      if (destinatarios.length === 0) return res.status(400).json({ message: "No hay usuarios activos con correo" });

      for (let i = 0; i < destinatarios.length; i += 50) {
        await transporter.sendMail({
          from: remitente,
          to: process.env.SMTP_USER,
          bcc: destinatarios.slice(i, i + 50),
          subject, text,
          attachments: [adjunto]
        });
      }
      await registrarAuditoria(pool, req, "Enviar correo masivo", null, `${adjunto.filename} enviado a ${destinatarios.length} destinatarios (BCC)`, "Correo");
      return res.json({ success: true, message: `Correo enviado a ${destinatarios.length} usuarios.` });
    }

    await transporter.sendMail({ from: remitente, to: email, subject, text, attachments: [adjunto] });
    await registrarAuditoria(pool, req, "Enviar correo", null, `${adjunto.filename} enviado a ${email}`, "Correo");
    res.json({ success: true, message: `Correo enviado exitosamente a ${email}` });
  } catch (err) {
    console.error("Error enviando correo:", err.message);
    res.status(500).json({ message: "No se pudo enviar el correo: " + err.message });
  }
});

app.get("/api/adopcion", async (req, res) => {
  try {
    const pool = await getDb();
    const usr = await pool.request().query("SELECT Nombre, Apellido FROM Usuarios WHERE Rol = 'Usuario' AND Estado = TRUE");
    const nombresValidos = new Set(usr.recordset.map(u => `${(u.Nombre || '').trim()} ${(u.Apellido || '').trim()}`.toLowerCase()));
    const totalUsuariosActivos = nombresValidos.size;

    const inc = await pool.request().query("SELECT DISTINCT LOWER(LTRIM(RTRIM(Empleado))) AS Empleado FROM Incidencias WHERE Empleado IS NOT NULL");
    const reportan = inc.recordset.filter(i => nombresValidos.has(i.Empleado)).length;

    const corr = await pool.request().query("SELECT COUNT(*)::int AS Total FROM Usuarios WHERE Estado = TRUE AND Correo IS NOT NULL AND LTRIM(RTRIM(Correo)) <> ''");

    const adopcionPorcentaje = totalUsuariosActivos > 0 ? Math.min(100, (reportan / totalUsuariosActivos) * 100) : 0;
    res.json({ adopcionPorcentaje, totalUsuariosActivos, usuariosQueReportan: reportan, totalDestinatariosCorreo: corr.recordset[0].Total });
  } catch (err) {
    responderError(res, err);
  }
});

app.get("/api/usuarios", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    // Sin Password (hash) ni FotoPerfil: el listado no los necesita y no deben salir del servidor
    const result = await pool.request().query(
      "SELECT IdUsuario, Nombre, Apellido, Correo, Usuario, Rol, Estado, TelegramChatId, IntentosFallidos, BloqueadoHasta FROM Usuarios ORDER BY Apellido, Nombre");
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

// Mismas reglas que UsuarioLN del escritorio. Devuelve el mensaje de error o null.
function validarDatosUsuario({ Nombre, Apellido, Correo, Usuario, Rol }) {
  if (!Nombre || !Nombre.trim() || Nombre.trim().length > 100) return "El nombre es obligatorio (máximo 100 caracteres).";
  if (!Apellido || !Apellido.trim() || Apellido.trim().length > 100) return "El apellido es obligatorio (máximo 100 caracteres).";
  if (!Correo || Correo.trim().length > 150 || !REGEX_CORREO.test(Correo.trim())) return "El correo no tiene un formato válido.";
  if (!Usuario || !Usuario.trim() || Usuario.trim().length > 50 || /\s/.test(Usuario.trim())) return "El usuario es obligatorio, sin espacios (máximo 50 caracteres).";
  if (!ROLES_VALIDOS.includes(Rol)) return `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(", ")}.`;
  return null;
}

function mensajeErrorUsuarioBD(dbErr) {
  if (dbErr.code === "23505") return "Ya existe un usuario con ese nombre de usuario o correo.";
  if (dbErr.code === "23503") return "No se puede eliminar: el usuario tiene incidencias o registros de auditoría asociados. Desactívalo en su lugar.";
  return null;
}

app.post("/api/usuarios", requireAdmin, async (req, res) => {
  try {
    const datos = {
      Nombre: req.body.Nombre, Apellido: req.body.Apellido, Correo: req.body.Correo,
      Usuario: req.body.UsuarioLogin || req.body.Usuario, Rol: req.body.Rol
    };
    const error = validarDatosUsuario(datos);
    if (error) return res.status(400).json({ message: error });
    if (!req.body.Password || req.body.Password.length < 6) return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });

    const hash = await bcrypt.hash(req.body.Password, 10);
    const pool = await getDb();
    let result;
    try {
      result = await pool.request()
        .input("Nombre", sql.VarChar, datos.Nombre.trim())
        .input("Apellido", sql.VarChar, datos.Apellido.trim())
        .input("Correo", sql.VarChar, datos.Correo.trim())
        .input("Usuario", sql.VarChar, datos.Usuario.trim())
        .input("Password", sql.VarChar, hash)
        .input("Rol", sql.VarChar, datos.Rol)
        .query("INSERT INTO Usuarios (Nombre, Apellido, Correo, Usuario, Password, Rol, Estado, IntentosFallidos) VALUES (@Nombre, @Apellido, @Correo, @Usuario, @Password, @Rol, TRUE, 0) RETURNING IdUsuario");
    } catch (dbErr) {
      const msg = mensajeErrorUsuarioBD(dbErr);
      if (msg) return res.status(409).json({ message: msg });
      throw dbErr;
    }
    const id = result.recordset[0].IdUsuario;
    await registrarAuditoria(pool, req, "Crear", id, `Usuario: ${datos.Usuario.trim()} | Rol: ${datos.Rol}`, "Usuario");
    res.status(201).json({ id });
  } catch (err) { responderError(res, err); }
});

app.post("/api/usuarios/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const pool = await getDb();
      const userRes = await pool.request()
        .input('Id', sql.Int, req.params.id)
        .query('SELECT Correo FROM Usuarios WHERE IdUsuario = @Id');
      
      const userEmail = userRes.recordset[0]?.Correo;
      const nuevaPassword = Math.random().toString(36).slice(-8);
      const hash = await require('bcryptjs').hash(nuevaPassword, 10);
      
      const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ message: 'Servicio de correo no configurado' });
  
      if (userEmail) {
        try {
          await transporter.sendMail({
            from: `"Sistema de Incidencias APPB" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: "Recuperación de contraseña - Sistema de Incidencias APPB",
            text: `Hola,\n\nTu contraseña temporal ha sido generada exitosamente.\n\nNueva contraseña: ${nuevaPassword}\n\nPor favor, ingresa al sistema y cámbiala lo antes posible.\n\nSaludos,\nSistema de Incidencias APPB`
          });
        } catch (mailErr) {
          console.error("No se pudo enviar el correo de reset:", mailErr.message);
          return res.status(500).json({ message: 'No se pudo enviar el correo al usuario. No se ha modificado la contraseña.' });
        }
      } else {
          return res.status(400).json({ message: 'El usuario no tiene correo registrado.' });
      }

      await pool.request()
        .input('Id', sql.Int, req.params.id)
        .input('Hash', sql.VarChar, hash)
        .query('UPDATE Usuarios SET Password = @Hash, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @Id');
      await registrarAuditoria(pool, req, "Restablecer contraseña", req.params.id, `Contraseña temporal enviada a ${userEmail}`, "Usuario");
  
      res.json({ success: true, message: "Contraseña actualizada y correo enviado" });
    } catch (err) { responderError(res, err); }
  });

app.put("/api/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const id = aEntero(req.params.id);
    if (!id) return res.status(400).json({ message: "Id inválido." });
    const { Nombre, Apellido, Correo, UsuarioLogin, Usuario, Rol, Estado, TelegramChatId } = req.body;
    const datos = { Nombre, Apellido, Correo, Usuario: Usuario || UsuarioLogin, Rol };
    const error = validarDatosUsuario(datos);
    if (error) return res.status(400).json({ message: error });

    const pool = await getDb();
    const actual = (await pool.request().input("Id", sql.Int, id)
      .query("SELECT Nombre, Apellido, Correo, Usuario, Rol, Estado, TelegramChatId FROM Usuarios WHERE IdUsuario = @Id")).recordset[0];
    if (!actual) return res.status(404).json({ message: "Usuario no encontrado." });

    const estadoNuevo = Estado !== undefined ? !!Estado : true;
    // Un administrador no puede quitarse a sí mismo el acceso ni el rol
    if (id === req.user.IdUsuario && (!estadoNuevo || Rol !== "Administrador")) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta ni quitarte el rol de Administrador." });
    }
    // No puede pasar a "Usuario" un técnico con tickets abiertos asignados
    if (actual.Rol === "Técnico" && Rol !== "Técnico") {
      const abiertos = await pool.request().input("Id", sql.Int, id).query(`
        SELECT COUNT(*)::int AS Total FROM Incidencias i JOIN Estados e ON e.IdEstado = i.IdEstado
        WHERE i.IdTecnicoAsignado = @Id AND e.Nombre IN ('Pendiente', 'En Proceso')`);
      if (abiertos.recordset[0].Total > 0) {
        return res.status(400).json({ message: `Este técnico tiene ${abiertos.recordset[0].Total} ticket(s) abierto(s). Reasígnalos antes de cambiar su rol.` });
      }
    }

    try {
      await pool.request()
        .input("IdUsuario", sql.Int, id)
        .input("Nombre", sql.VarChar, Nombre.trim())
        .input("Apellido", sql.VarChar, Apellido.trim())
        .input("Correo", sql.VarChar, Correo.trim())
        .input("Usuario", sql.VarChar, datos.Usuario.trim())
        .input("Rol", sql.VarChar, Rol)
        .input("Estado", sql.Bit, estadoNuevo)
        .input("TelegramChatId", sql.BigInt, TelegramChatId || null)
        .query(`UPDATE Usuarios 
                SET Nombre = @Nombre, Apellido = @Apellido, Correo = @Correo, 
                    Usuario = @Usuario, Rol = @Rol, Estado = @Estado, TelegramChatId = @TelegramChatId 
                WHERE IdUsuario = @IdUsuario`);
    } catch (dbErr) {
      const msg = mensajeErrorUsuarioBD(dbErr);
      if (msg) return res.status(409).json({ message: msg });
      throw dbErr;
    }

    // Auditoría: solo los campos que cambiaron
    const cambios = [];
    const comparar = (etiqueta, antes, despues) => {
      if (String(antes ?? "") !== String(despues ?? "")) cambios.push(`${etiqueta}: ${antes ?? "—"} → ${despues ?? "—"}`);
    };
    comparar("Nombre", actual.Nombre, Nombre.trim());
    comparar("Apellido", actual.Apellido, Apellido.trim());
    comparar("Correo", actual.Correo, Correo.trim());
    comparar("Usuario", actual.Usuario, datos.Usuario.trim());
    comparar("Rol", actual.Rol, Rol);
    comparar("Activo", actual.Estado ? "Sí" : "No", estadoNuevo ? "Sí" : "No");
    comparar("Telegram", actual.TelegramChatId ? "vinculado" : "sin vincular", TelegramChatId ? "vinculado" : "sin vincular");
    if (cambios.length > 0) {
      await registrarAuditoria(pool, req, "Modificar", id, cambios.join(" | "), "Usuario");
    }
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.delete("/api/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const id = aEntero(req.params.id);
    if (!id) return res.status(400).json({ message: "Id inválido." });
    if (id === req.user.IdUsuario) return res.status(400).json({ message: "No puedes eliminar tu propia cuenta." });
    const pool = await getDb();
    const actual = (await pool.request().input("Id", sql.Int, id)
      .query("SELECT Usuario, Rol FROM Usuarios WHERE IdUsuario = @Id")).recordset[0];
    if (!actual) return res.status(404).json({ message: "Usuario no encontrado." });
    try {
      await pool.request()
        .input("IdUsuario", sql.Int, id)
        .query("DELETE FROM Usuarios WHERE IdUsuario = @IdUsuario");
    } catch (dbErr) {
      const msg = mensajeErrorUsuarioBD(dbErr);
      if (msg) return res.status(409).json({ message: msg });
      throw dbErr;
    }
    await registrarAuditoria(pool, req, "Eliminar", id, `Usuario: ${actual.Usuario} | Rol: ${actual.Rol}`, "Usuario");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.get("/api/perfil", verifyToken, async (req, res) => {
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("SELECT * FROM Usuarios WHERE IdUsuario = @IdUsuario");
    const user = result.recordset[0];
    if (user) {
      delete user.Password;
      if (user.FotoPerfil) {
        user.FotoPerfil = `data:image/jpeg;base64,${user.FotoPerfil.toString("base64")}`;
      }
      res.json(user);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (err) { responderError(res, err); }
});

// Editar los datos propios (mismas reglas que el perfil del escritorio)
const REGEX_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
app.put("/api/perfil", async (req, res) => {
  try {
    const Nombre = (req.body.Nombre || "").trim();
    const Apellido = (req.body.Apellido || "").trim();
    const Correo = (req.body.Correo || "").trim();
    if (!Nombre || Nombre.length > 100) return res.status(400).json({ message: "El nombre es obligatorio (máximo 100 caracteres)." });
    if (!Apellido || Apellido.length > 100) return res.status(400).json({ message: "El apellido es obligatorio (máximo 100 caracteres)." });
    if (!Correo || Correo.length > 150 || !REGEX_CORREO.test(Correo)) return res.status(400).json({ message: "El correo no tiene un formato válido." });

    const pool = await getDb();
    try {
      await pool.request()
        .input("IdUsuario", sql.Int, req.user.IdUsuario)
        .input("Nombre", sql.VarChar, Nombre)
        .input("Apellido", sql.VarChar, Apellido)
        .input("Correo", sql.VarChar, Correo)
        .query("UPDATE Usuarios SET Nombre = @Nombre, Apellido = @Apellido, Correo = @Correo WHERE IdUsuario = @IdUsuario");
    } catch (dbErr) {
      if (dbErr.code === "23505") return res.status(409).json({ message: "Ya existe un usuario registrado con ese correo." });
      throw dbErr;
    }
    await registrarAuditoria(pool, req, "Modificar", req.user.IdUsuario, "Actualizó sus datos de perfil", "Usuario");
    res.json({ success: true, Nombre, Apellido, Correo });
  } catch (err) { responderError(res, err); }
});

// Cambiar la contraseña propia: exige la actual (igual que el escritorio)
app.put("/api/perfil/password", async (req, res) => {
  try {
    const { PasswordActual, PasswordNueva } = req.body;
    if (!PasswordActual) return res.status(400).json({ message: "Ingresa tu contraseña actual." });
    if (!PasswordNueva || PasswordNueva.length < 6) return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });

    const pool = await getDb();
    const r = await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("SELECT Password FROM Usuarios WHERE IdUsuario = @IdUsuario AND Estado = TRUE");
    const usuario = r.recordset[0];
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado o inactivo." });

    // 400 y no 401: un 401 cerraría la sesión en la app
    const coincide = await bcrypt.compare(PasswordActual, usuario.Password);
    if (!coincide) return res.status(400).json({ message: "La contraseña actual no es correcta." });

    const hash = await bcrypt.hash(PasswordNueva, 10);
    await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .input("Hash", sql.VarChar, hash)
      .query("UPDATE Usuarios SET Password = @Hash, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @IdUsuario");
    await registrarAuditoria(pool, req, "Cambiar contraseña", req.user.IdUsuario, "Cambió su contraseña desde la app móvil", "Usuario");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.post("/api/perfil/foto", async (req, res) => {
  try {
    const pool = await getDb();
    // Convert data URL to raw bytes for PostgreSQL (bytea)
    const base64Data = req.body.FotoPerfil.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    await pool.request()
      .input("FotoPerfil", sql.VarBinary, imageBuffer)
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("UPDATE Usuarios SET FotoPerfil = @FotoPerfil WHERE IdUsuario = @IdUsuario");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

app.delete("/api/perfil/foto", async (req, res) => {
  try {
    const pool = await getDb();
    await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("UPDATE Usuarios SET FotoPerfil = NULL WHERE IdUsuario = @IdUsuario");
    res.json({ success: true });
  } catch (err) { responderError(res, err); }
});

// INCIDENCIAS
app.get("/api/incidencias", async (req, res) => {
  try {
    const pool = await getDb();
    let query = `
      SELECT i.*, 
             t.Nombre || ' ' || t.Apellido AS NombreTecnicoAsignado,
             e.Nombre AS NombreEstado,
             p.Nombre AS NombrePrioridad,
             a.NombreArea
      FROM Incidencias i
      LEFT JOIN Usuarios t ON i.IdTecnicoAsignado = t.IdUsuario
      JOIN Estados e ON i.IdEstado = e.IdEstado
      JOIN Prioridades p ON i.IdPrioridad = p.IdPrioridad
      JOIN Areas a ON i.IdArea = a.IdArea
    `;
    
    const request = pool.request();
    // El rol Usuario solo ve sus propias incidencias (misma regla que la app de escritorio)
    if (req.user.Rol === "Usuario") {
      query += " WHERE " + await filtroReportante(pool, request, req);
    }
    query += " ORDER BY i.Fecha DESC";
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) { responderError(res, err); }
});

app.get("/api/incidencias/:id", async (req, res) => {
  try {
    const pool = await getDb();
    const query = `
      SELECT i.*, 
             t.Nombre || ' ' || t.Apellido AS NombreTecnicoAsignado,
             e.Nombre AS NombreEstado,
             p.Nombre AS NombrePrioridad,
             a.NombreArea
      FROM Incidencias i
      LEFT JOIN Usuarios t ON i.IdTecnicoAsignado = t.IdUsuario
      JOIN Estados e ON i.IdEstado = e.IdEstado
      JOIN Prioridades p ON i.IdPrioridad = p.IdPrioridad
      JOIN Areas a ON i.IdArea = a.IdArea
      WHERE i.IdIncidencia = @IdIncidencia
    `;
    const result = await pool.request()
      .input("IdIncidencia", sql.Int, req.params.id)
      .query(query);
      
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No encontrada" });
    }
    if (req.user.Rol === "Usuario") {
      const inc = result.recordset[0];
      let esSuya;
      if (inc.IdUsuarioReporta) {
        esSuya = inc.IdUsuarioReporta === req.user.IdUsuario;
      } else {
        const nombre = (await obtenerNombreCompleto(pool, req.user.IdUsuario) || "").toLowerCase();
        esSuya = (inc.Empleado || "").trim().toLowerCase() === nombre;
      }
      if (!esSuya) return res.status(403).json({ message: "No tienes acceso a esta incidencia" });
    }
    res.json(result.recordset[0]);
  } catch (err) { responderError(res, err); }
});

app.post("/api/incidencias", async (req, res) => {
  try {
    const { origen } = req.body;
    let { Descripcion, Empleado, TipoIncidencia } = req.body;
    const IdPrioridad = aEntero(req.body.IdPrioridad);
    const IdArea = aEntero(req.body.IdArea);
    const IdTipoIncidencia = aEntero(req.body.IdTipoIncidencia);
    const pool = await getDb();

    let idUsuarioReporta = null;
    if (req.user.Rol === "Usuario") {
      // Un Usuario solo puede reportar a su propio nombre
      Empleado = await obtenerNombreCompleto(pool, req.user.IdUsuario);
      idUsuarioReporta = req.user.IdUsuario;
    } else if (Empleado) {
      // Admin o técnico registrando por otra persona: se enlaza si el nombre es de UN solo usuario
      const r = await pool.request().input("Nombre", sql.VarChar, Empleado.trim().toLowerCase())
        .query("SELECT IdUsuario FROM Usuarios WHERE LOWER(LTRIM(RTRIM(Nombre)) || ' ' || LTRIM(RTRIM(Apellido))) = @Nombre");
      if (r.recordset.length === 1) idUsuarioReporta = r.recordset[0].IdUsuario;
    }
    if (!Empleado || !Empleado.trim() || Empleado.length > 150) return res.status(400).json({ message: "Empleado inválido" });
    if (!Descripcion || Descripcion.trim().length < 10) return res.status(400).json({ message: "Descripción muy corta" });
    if (!IdArea || Number.isNaN(IdArea)) return res.status(400).json({ message: "Selecciona un área válida." });
    if (!IdPrioridad || Number.isNaN(IdPrioridad)) return res.status(400).json({ message: "Selecciona una prioridad válida." });

    const existen = await pool.request().input("IdArea", sql.Int, IdArea).input("IdPrioridad", sql.Int, IdPrioridad).query(
      "SELECT (SELECT COUNT(*)::int FROM Areas WHERE IdArea = @IdArea) AS Areas, (SELECT COUNT(*)::int FROM Prioridades WHERE IdPrioridad = @IdPrioridad) AS Prioridades");
    if (!existen.recordset[0].areas) return res.status(400).json({ message: "El área no existe." });
    if (!existen.recordset[0].prioridades) return res.status(400).json({ message: "La prioridad no existe." });

    // Tipo: del catálogo (app nueva). La app anterior manda texto libre: si coincide con
    // un tipo activo se enlaza; si no, va como "Otro" y el texto se agrega a la descripción.
    let idTipo = null;
    if (IdTipoIncidencia) {
      const t = await pool.request().input("Id", sql.Int, IdTipoIncidencia)
        .query("SELECT IdTipoIncidencia, Nombre FROM TiposIncidencia WHERE IdTipoIncidencia = @Id AND Activo");
      if (!t.recordset[0]) return res.status(400).json({ message: "El tipo de incidencia no existe o está desactivado." });
      idTipo = t.recordset[0].IdTipoIncidencia;
      TipoIncidencia = t.recordset[0].Nombre;
    } else {
      if (!TipoIncidencia || !TipoIncidencia.trim() || TipoIncidencia.length > 100) return res.status(400).json({ message: "Selecciona el tipo de incidencia." });
      const t = await pool.request().input("Nombre", sql.VarChar, TipoIncidencia.trim())
        .query("SELECT IdTipoIncidencia, Nombre FROM TiposIncidencia WHERE Nombre = @Nombre::citext AND Activo");
      if (t.recordset[0]) {
        idTipo = t.recordset[0].IdTipoIncidencia;
        TipoIncidencia = t.recordset[0].Nombre;
      } else {
        const otro = await pool.request().query("SELECT IdTipoIncidencia, Nombre FROM TiposIncidencia WHERE Nombre = 'Otro'");
        if (otro.recordset[0]) {
          Descripcion = `[Tipo indicado: ${TipoIncidencia.trim()}] ${Descripcion}`;
          idTipo = otro.recordset[0].IdTipoIncidencia;
          TipoIncidencia = otro.recordset[0].Nombre;
        }
      }
    }

    const estados = await pool.request().query("SELECT IdEstado FROM Estados WHERE Nombre = 'Pendiente'");
    const idEstado = estados.recordset[0].IdEstado;

    const result = await pool.request()
      .input("Descripcion", sql.VarChar, Descripcion)
      .input("IdPrioridad", sql.Int, IdPrioridad)
      .input("IdArea", sql.Int, IdArea)
      .input("IdEstado", sql.Int, idEstado)
      .input("Empleado", sql.VarChar, Empleado.trim())
      .input("TipoIncidencia", sql.VarChar, TipoIncidencia)
      .input("IdTipoIncidencia", sql.Int, idTipo)
      .input("IdUsuarioReporta", sql.Int, idUsuarioReporta)
      .query(`INSERT INTO Incidencias (Descripcion, IdPrioridad, IdArea, IdEstado, Empleado, TipoIncidencia, IdTipoIncidencia, IdUsuarioReporta, Fecha, EscaladoSLA)
              VALUES (@Descripcion, @IdPrioridad, @IdArea, @IdEstado, @Empleado, @TipoIncidencia, @IdTipoIncidencia, @IdUsuarioReporta, LOCALTIMESTAMP, FALSE)
              RETURNING IdIncidencia`);
              
    const newId = result.recordset[0].IdIncidencia;
    await registrarAuditoria(pool, req, "Crear", newId, "Creó la incidencia");
    
    const newIn = await pool.request().input("IdIncidencia", sql.Int, newId).query("SELECT * FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    res.status(201).json(newIn.recordset[0]);
      notificarNuevaIncidencia(pool, newIn.recordset[0], origen || 'App Móvil');
  } catch (err) { console.error(err); responderError(res, err); }
});

// Reglas (Etapa 2, iguales a las del escritorio):
// - Usuario: no edita.
// - Técnico: solo puede tomar un ticket sin asignar (para sí mismo), solo cambia el estado de
//   los tickets asignados a él y no puede anular.
// - Solo se asignan usuarios activos con rol Técnico.
// - Resuelto/Cerrado requieren técnico. La fecha de solución, de asignación y de primera
//   respuesta las pone la base de datos (trigger), también al reabrir.
app.put("/api/incidencias/:id", async (req, res) => {
  if (req.user.Rol === "Usuario") return res.status(403).json({ message: "No puedes editar" });
  try {
    const id = aEntero(req.params.id);
    if (!id) return res.status(400).json({ message: "Id inválido." });
    const { Observaciones } = req.body;
    const IdEstado = req.body.IdEstado === undefined ? undefined : aEntero(req.body.IdEstado);
    const IdTecnicoAsignado = req.body.IdTecnicoAsignado === undefined ? undefined : aEntero(req.body.IdTecnicoAsignado);
    if (Number.isNaN(IdEstado) || IdEstado === null) return res.status(400).json({ message: "Estado inválido." });
    if (Number.isNaN(IdTecnicoAsignado)) return res.status(400).json({ message: "Técnico inválido." });

    const pool = await getDb();
    const actualResult = await pool.request().input("IdIncidencia", sql.Int, id).query("SELECT * FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    const actual = actualResult.recordset[0];
    if (!actual) return res.status(404).json({ message: "No encontrada" });

    const esAdmin = req.user.Rol === "Administrador";
    const cambiaTecnico = IdTecnicoAsignado !== undefined && IdTecnicoAsignado !== actual.IdTecnicoAsignado;
    const cambiaEstado = IdEstado !== undefined && IdEstado !== actual.IdEstado;
    const tecnicoFinal = cambiaTecnico ? IdTecnicoAsignado : actual.IdTecnicoAsignado;
    const esAutoAsignacion = cambiaTecnico && IdTecnicoAsignado === req.user.IdUsuario && !actual.IdTecnicoAsignado;

    if (!esAdmin && req.user.Rol !== "Técnico") return res.status(403).json({ message: "Rol no autorizado." });

    // Un Técnico solo puede asignarse a sí mismo una incidencia sin técnico (botón "Aceptar")
    if (!esAdmin && cambiaTecnico && !esAutoAsignacion) {
      return res.status(403).json({ message: "Solo un administrador puede asignar o reasignar incidencias" });
    }

    // Solo técnicos activos
    if (cambiaTecnico && IdTecnicoAsignado !== null) {
      const t = await pool.request().input("Id", sql.Int, IdTecnicoAsignado).query("SELECT Rol, Estado FROM Usuarios WHERE IdUsuario = @Id");
      const tec = t.recordset[0];
      if (!tec) return res.status(400).json({ message: "El técnico no existe." });
      if (tec.Rol !== "Técnico") return res.status(400).json({ message: "Solo se pueden asignar usuarios con rol Técnico." });
      if (!tec.Estado) return res.status(400).json({ message: "El técnico está inactivo." });
    }

    const { lista: estados, porNombre } = await obtenerEstados(pool);
    let nombreEstadoNuevo = null;
    if (cambiaEstado) {
      const estadoNuevo = estados.find(e => e.IdEstado === IdEstado);
      if (!estadoNuevo) return res.status(400).json({ message: "El estado no existe." });
      nombreEstadoNuevo = estadoNuevo.Nombre;

      if (!esAdmin) {
        if (tecnicoFinal !== req.user.IdUsuario) {
          return res.status(403).json({ message: "Solo el técnico asignado puede cambiar el estado de esta incidencia." });
        }
        if (IdEstado === porNombre("Anulado")) {
          return res.status(403).json({ message: "Solo un administrador puede anular una incidencia." });
        }
      }
      if ((IdEstado === porNombre("Resuelto") || IdEstado === porNombre("Cerrado")) && !tecnicoFinal) {
        return res.status(400).json({ message: "Requiere técnico asignado" });
      }
    }

    let setClauses = [];
    const request = pool.request();
    let accionesAuditoria = [];
    request.input("IdIncidencia", sql.Int, id);

    if (cambiaEstado) {
      setClauses.push("IdEstado = @IdEstado");
      request.input("IdEstado", sql.Int, IdEstado);
      const anterior = estados.find(e => e.IdEstado === actual.IdEstado)?.Nombre;
      accionesAuditoria.push(`Estado: ${anterior} → ${nombreEstadoNuevo}`);
    }

    if (cambiaTecnico) {
      setClauses.push("IdTecnicoAsignado = @IdTecnicoAsignado");
      request.input("IdTecnicoAsignado", sql.Int, IdTecnicoAsignado);
      accionesAuditoria.push(IdTecnicoAsignado ? "Se asignó el ticket" : "Se desasignó");
    }

    if (Observaciones !== undefined && Observaciones !== actual.Observaciones) {
      setClauses.push("Observaciones = @Observaciones");
      request.input("Observaciones", sql.VarChar, Observaciones);
      accionesAuditoria.push("Modificó observaciones");
    }

    if (setClauses.length > 0) {
      // Al "Aceptar", solo si nadie lo tomó en el mismo instante
      const condicion = esAutoAsignacion ? " AND IdTecnicoAsignado IS NULL" : "";
      const upd = await request.query(`UPDATE Incidencias SET ${setClauses.join(", ")} WHERE IdIncidencia = @IdIncidencia${condicion}`);
      if (upd.rowsAffected[0] === 0) {
        return res.status(409).json({ message: "Otro técnico tomó este ticket hace un momento." });
      }
      const accion = cambiaTecnico ? "Asignar" : "Editar";
      await registrarAuditoria(pool, req, accion, id, accionesAuditoria.join(". "));

      // Avisos por Telegram (sin esperar, para no demorar la respuesta)
      // (al "Aceptar" cambian ambos: basta con el aviso de asignación)
      if (cambiaTecnico && IdTecnicoAsignado) notificarActualizacionIncidencia(pool, id, 'asignar', null, null, req.user.IdUsuario);
      else if (cambiaEstado) notificarActualizacionIncidencia(pool, id, 'estado', null, null, req.user.IdUsuario);
    }
    
    res.json({ success: true });
  } catch(err) { console.error(err); responderError(res, err); }
});

app.delete("/api/incidencias/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getDb();
    await pool.request().input("IdIncidencia", sql.Int, req.params.id).query("DELETE FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    await registrarAuditoria(pool, req, "Eliminar", req.params.id, "Eliminó el ticket permanentemente");
    res.json({ success: true });
  } catch(err) { responderError(res, err); }
});

const { generarPdfIncidencias, generarExcelIncidencias } = require('./reports');

// Consulta para los reportes PDF/Excel; el rol Usuario solo recibe sus incidencias
async function consultarIncidenciasReporte(pool, req) {
  const request = pool.request();
  let query = `SELECT i.*, a.NombreArea, p.Nombre AS NombrePrioridad, e.Nombre AS NombreEstado, t.Nombre || ' ' || t.Apellido AS TecnicoAsignado FROM Incidencias i LEFT JOIN Areas a ON i.IdArea = a.IdArea LEFT JOIN Prioridades p ON i.IdPrioridad = p.IdPrioridad LEFT JOIN Estados e ON i.IdEstado = e.IdEstado LEFT JOIN Usuarios t ON i.IdTecnicoAsignado = t.IdUsuario`;
  if (req.user.Rol === "Usuario") {
    query += " WHERE " + await filtroReportante(pool, request, req);
  }
  query += " ORDER BY i.Fecha DESC";
  return request.query(query);
}

app.get('/api/reportes/incidencias/pdf', async (req, res) => {
  try {
    const pool = await getDb();
    const result = await consultarIncidenciasReporte(pool, req);
    const pdfBuffer = await generarPdfIncidencias(result.recordset);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Incidencias.pdf');
    res.send(pdfBuffer);
  } catch(err) { responderError(res, err); }
});

app.get('/api/reportes/incidencias/excel', async (req, res) => {
  try {
    const pool = await getDb();
    const result = await consultarIncidenciasReporte(pool, req);
    const excelBuffer = await generarExcelIncidencias(result.recordset);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Incidencias.xlsx');
    res.send(excelBuffer);
  } catch(err) { responderError(res, err); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API (PostgreSQL backend) running on http://localhost:${PORT}`);
});








