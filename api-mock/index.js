require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { getSqlServerDb, sql } = require("./db_sqlserver");

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
    let query = "SELECT TelegramChatId FROM Usuarios WHERE Rol = 'Técnico' AND Estado = 1 AND TelegramChatId IS NOT NULL";
    const req = pool.request();
    if (idTecnicoAsignado) {
       query += " AND IdUsuario = @IdTecnico";
       req.input('IdTecnico', require('mssql').Int, idTecnicoAsignado);
    }
    const tecnicos = await req.query(query);
    const mensaje = `🆕 Nueva Incidencia #${incidencia.IdIncidencia} (${origen})\nEmpleado: ${incidencia.Empleado}\nTipo: ${incidencia.TipoIncidencia}\nDescripción: ${incidencia.Descripcion}`;
    const reply_markup = idTecnicoAsignado ? null : { inline_keyboard: [[{ text: "Aceptar ticket", callback_data: `aceptar_${incidencia.IdIncidencia}` }]] };
    for (const t of tecnicos.recordset) {
      const messageId = await enviarTelegram(t.TelegramChatId, mensaje, reply_markup);
      if (messageId && !idTecnicoAsignado) {
         try {
           await pool.request()
              .input('IdIncidencia', require('mssql').Int, incidencia.IdIncidencia)
              .input('ChatId', require('mssql').BigInt, t.TelegramChatId)
              .input('MessageId', require('mssql').Int, messageId)
              .query("INSERT INTO TelegramMensajes (IdIncidencia, ChatId, MessageId) VALUES (@IdIncidencia, @ChatId, @MessageId)");
         } catch(dbErr) { console.error("DB Insert error TelegramMensajes", dbErr); }
      }
    }
  } catch (err) {
    console.error('Error al notificar nueva incidencia', err);
  }
};

const notificarActualizacionIncidencia = async (pool, incidenciaId, accion, tecnicoId, nuevoValor) => {
  try {
    if (!tecnicoId) return;
    const userRes = await pool.request().input('Id', require('mssql').Int, tecnicoId).query("SELECT TelegramChatId FROM Usuarios WHERE IdUsuario = @Id");
    const chatId = userRes.recordset[0]?.TelegramChatId;
    if (!chatId) return;

    let mensaje = '';
    if (accion === 'asignar') {
      mensaje = `ðŸ”” Se te ha asignado la Incidencia #${incidenciaId}`;
    } else if (accion === 'estado') {
      mensaje = `â„¹ï¸ Incidencia #${incidenciaId} marcada como ${nuevoValor}`;
    }
    
    if (mensaje) await enviarTelegram(chatId, mensaje);
  } catch (err) {
    console.error('Error al notificar actualizacion', err);
  }
};

const app = express();
app.use((req,res,next)=>{console.log('['+new Date().toLocaleTimeString()+'] '+req.method+' '+req.url);next();});
app.use(cors());
  app.use('/descargas', require('express').static(require('path').join(__dirname, 'public-descargas')));


app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_12345";

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
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT 1 AS TestStatus");
    res.json({ success: true, message: "Conexión a SQL Server exitosa", data: result.recordset });
  } catch (err) {
    console.error("Test DB falló:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/recuperar-password', async (req, res) => {
    try {
      const { Correo } = req.body;
      if (!Correo) return res.status(400).json({ message: 'Correo requerido' });
      
      const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ message: 'Servicio de correo no configurado' });

      const pool = await getSqlServerDb();
      const userRes = await pool.request()
        .input('Correo', sql.VarChar, Correo)
        .query('SELECT * FROM Usuarios WHERE Correo = @Correo AND Estado = 1');
  
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
    const pool = await getSqlServerDb();
    const result = await pool.request()
      .input("Usuario", sql.VarChar, username)
      .query("SELECT * FROM Usuarios WHERE Usuario = @Usuario");
      
    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: "Usuario no encontrado" });
    }
    if (user.Estado === false) {
      return res.status(401).json({ success: false, message: "Usuario inactivo" });
    }
    
    if (user.BloqueadoHasta && new Date(user.BloqueadoHasta) > new Date()) {
      return res.status(401).json({ success: false, message: "Cuenta bloqueada temporalmente" });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      const intentos = (user.IntentosFallidos || 0) + 1;
      let bloqueadoHasta = null;
      if (intentos >= 3) {
        bloqueadoHasta = new Date(Date.now() + 15 * 60000);
      }
      await pool.request()
        .input("IdUsuario", sql.Int, user.IdUsuario)
        .input("IntentosFallidos", sql.Int, intentos)
        .input("BloqueadoHasta", sql.DateTime, bloqueadoHasta)
        .query("UPDATE Usuarios SET IntentosFallidos = @IntentosFallidos, BloqueadoHasta = @BloqueadoHasta WHERE IdUsuario = @IdUsuario");
        
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    await pool.request()
      .input("IdUsuario", sql.Int, user.IdUsuario)
      .query("UPDATE Usuarios SET IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @IdUsuario");
      
    const token = jwt.sign(
      { IdUsuario: user.IdUsuario, Rol: user.Rol },
      process.env.JWT_SECRET || "super_secret_key_12345",
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

  jwt.verify(token, process.env.JWT_SECRET || "super_secret_key_12345", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token invlido o expirado" });
    req.user = decoded;
    next();
  });
};;
app.post('/api/interno/notificar', async (req, res) => {
  if (!process.env.INTERNAL_API_KEY || req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  try {
    const { tipoEvento, idIncidencia, idTecnicoAsignado, nuevoEstado, empleado, tipoIncidencia, descripcion, origen } = req.body;
    const pool = await getSqlServerDb();

    if (tipoEvento === 'nueva') {
      const mockIncidencia = { 
        IdIncidencia: idIncidencia, 
        Empleado: empleado || 'N/A', 
        TipoIncidencia: tipoIncidencia || 'N/A', 
        Descripcion: descripcion || '' 
      };
      await notificarNuevaIncidencia(pool, mockIncidencia, origen || 'Escritorio', idTecnicoAsignado);
    } else if (tipoEvento === 'asignar') {
      await notificarActualizacionIncidencia(pool, idIncidencia, 'asignar', idTecnicoAsignado, null);
    } else if (tipoEvento === 'estado') {
      await notificarActualizacionIncidencia(pool, idIncidencia, 'estado', idTecnicoAsignado, nuevoEstado);
    }
    
    return res.status(200).json({ message: 'Notificaciones enviadas' });
  } catch (err) {
    console.error('Error interno notificar:', err);
    return res.status(500).json({ message: 'Error enviando notificaciones' });
  }
});

app.use(verifyToken);

const requireAdmin = (req, res, next) => {
  if (req.user.Rol !== "Administrador") {
    return res.status(403).json({ message: "Acceso denegado: Se requiere rol de Administrador" });
  }
  next();
};

async function registrarAuditoria(pool, req, accion, idRef, detalles) {
  try {
    await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .input("FechaHora", sql.DateTime, new Date())
      .input("Accion", sql.VarChar, accion)
      .input("TablaReferencia", sql.VarChar, "Incidencias")
      .input("IdReferencia", sql.Int, idRef)
      .input("Detalles", sql.VarChar, detalles)
      .query("INSERT INTO Auditoria (IdUsuario, FechaHora, Accion, TablaReferencia, IdReferencia, Detalles) VALUES (@IdUsuario, @FechaHora, @Accion, @TablaReferencia, @IdReferencia, @Detalles)");
  } catch (err) {
    console.error("Error registrando auditoria:", err);
  }
}

app.get("/api/areas", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT * FROM Areas");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/areas", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request()
      .input("NombreArea", sql.VarChar, req.body.NombreArea)
      .query("INSERT INTO Areas (NombreArea) OUTPUT INSERTED.IdArea VALUES (@NombreArea)");
    res.status(201).json({ id: result.recordset[0].IdArea });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/areas/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdArea", sql.Int, req.params.id)
      .input("NombreArea", sql.VarChar, req.body.NombreArea)
      .query("UPDATE Areas SET NombreArea = @NombreArea WHERE IdArea = @IdArea");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/areas/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request().input("IdArea", sql.Int, req.params.id).query("DELETE FROM Areas WHERE IdArea = @IdArea");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/prioridades", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT IdPrioridad, Nombre AS NombrePrioridad FROM Prioridades");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/estados", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT IdEstado, Nombre AS NombreEstado FROM Estados");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/guias", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT * FROM Guias");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/guias/:id/enviar", async (req, res) => {
  try {
    const { correoDestino } = req.body;
    if (!correoDestino) return res.status(400).json({ error: "correoDestino es requerido" });
    
    const pool = await getSqlServerDb();
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/guias", requireAdmin, async (req, res) => {
  try {
    const { Titulo, Problema, Solucion } = req.body;
    const pool = await getSqlServerDb();
    await pool.request()
      .input("Titulo", sql.VarChar, Titulo)
      .input("Problema", sql.VarChar, Problema)
      .input("Solucion", sql.VarChar, Solucion)
      .query("INSERT INTO Guias (Titulo, Problema, Solucion) VALUES (@Titulo, @Problema, @Solucion)");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/guias/:id", requireAdmin, async (req, res) => {
  try {
    const { Titulo, Problema, Solucion } = req.body;
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdGuia", sql.Int, req.params.id)
      .input("Titulo", sql.VarChar, Titulo)
      .input("Problema", sql.VarChar, Problema)
      .input("Solucion", sql.VarChar, Solucion)
      .query("UPDATE Guias SET Titulo = @Titulo, Problema = @Problema, Solucion = @Solucion WHERE IdGuia = @IdGuia");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/guias/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdGuia", sql.Int, req.params.id)
      .query("DELETE FROM Guias WHERE IdGuia = @IdGuia");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/auditoria", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT * FROM Auditoria ORDER BY Fecha DESC");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/reportes/enviar", requireAdmin, async (req, res) => {
  try {
    const { pdfBase64, filename, email } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: "Falta el PDF" });
    if (!email) return res.status(400).json({ error: "Falta el correo destino" });
    
    const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ error: 'Servicio de correo no configurado' });
      await transporter.sendMail({
      from: `"Sistema APPB" <${process.env.SMTP_USER || "noreply@appb.com"}>`,
      to: email,
      subject: `Reporte Manual de Incidencias`,
      text: `Se adjunta el reporte general de incidencias solicitado desde el Dashboard.`,
      attachments: [
        {
          filename: filename || 'Reporte.pdf',
          content: pdfBase64.split("base64,")[1] || pdfBase64,
          encoding: 'base64'
        }
      ]
    });
    res.json({ success: true, message: `Reporte enviado exitosamente a ${email}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/usuarios", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT * FROM Usuarios");
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/usuarios", requireAdmin, async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.Password, 10);
    const pool = await getSqlServerDb();
    const result = await pool.request()
      .input("Nombre", sql.VarChar, req.body.Nombre)
      .input("Apellido", sql.VarChar, req.body.Apellido)
      .input("Correo", sql.VarChar, req.body.Correo)
      .input("Usuario", sql.VarChar, req.body.UsuarioLogin)
      .input("Password", sql.VarChar, hash)
      .input("Rol", sql.VarChar, req.body.Rol)
      .query("INSERT INTO Usuarios (Nombre, Apellido, Correo, Usuario, Password, Rol, Estado, IntentosFallidos) OUTPUT INSERTED.IdUsuario VALUES (@Nombre, @Apellido, @Correo, @Usuario, @Password, @Rol, 1, 0)");
    res.status(201).json({ id: result.recordset[0].IdUsuario });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/usuarios/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const pool = await getSqlServerDb();
      const userRes = await pool.request()
        .input('Id', require('mssql').Int, req.params.id)
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
        .input('Id', require('mssql').Int, req.params.id)
        .input('Hash', require('mssql').VarChar, hash)
        .query('UPDATE Usuarios SET Password = @Hash, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @Id');
  
      res.json({ success: true, message: "Contraseña actualizada y correo enviado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

app.put("/api/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const { Nombre, Apellido, Correo, UsuarioLogin, Usuario, Rol, Estado, TelegramChatId } = req.body;
    const usr = Usuario || UsuarioLogin;
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdUsuario", sql.Int, req.params.id)
      .input("Nombre", sql.VarChar, Nombre)
      .input("Apellido", sql.VarChar, Apellido)
      .input("Correo", sql.VarChar, Correo)
      .input("Usuario", sql.VarChar, usr)
      .input("Rol", sql.VarChar, Rol)
      .input("Estado", sql.Bit, Estado !== undefined ? Estado : 1)
      .input("TelegramChatId", sql.VarChar, TelegramChatId || null)
      .query(`UPDATE Usuarios 
              SET Nombre = @Nombre, Apellido = @Apellido, Correo = @Correo, 
                  Usuario = @Usuario, Rol = @Rol, Estado = @Estado, TelegramChatId = @TelegramChatId 
              WHERE IdUsuario = @IdUsuario`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/usuarios/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdUsuario", sql.Int, req.params.id)
      .query("DELETE FROM Usuarios WHERE IdUsuario = @IdUsuario");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/perfil", verifyToken, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/perfil/foto", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    // Convert data URL to raw bytes for SQL Server
    const base64Data = req.body.FotoPerfil.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    await pool.request()
      .input("FotoPerfil", sql.VarBinary, imageBuffer)
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("UPDATE Usuarios SET FotoPerfil = @FotoPerfil WHERE IdUsuario = @IdUsuario");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/perfil/foto", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request()
      .input("IdUsuario", sql.Int, req.user.IdUsuario)
      .query("UPDATE Usuarios SET FotoPerfil = NULL WHERE IdUsuario = @IdUsuario");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// INCIDENCIAS
app.get("/api/incidencias", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    let query = `
      SELECT i.*, 
             t.Nombre + ' ' + t.Apellido AS NombreTecnicoAsignado,
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
    // En la DB real no hay IdUsuarioReporta. Todo se filtra por Empleado si se requiere
    query += " ORDER BY i.Fecha DESC";
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/incidencias/:id", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const query = `
      SELECT i.*, 
             t.Nombre + ' ' + t.Apellido AS NombreTecnicoAsignado,
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
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/incidencias", async (req, res) => {
  try {
    const { Descripcion, IdPrioridad, IdArea, Empleado, TipoIncidencia, origen } = req.body;
    if (!Empleado || Empleado.length > 150) return res.status(400).json({ message: "Empleado inválido" });
    if (!TipoIncidencia || TipoIncidencia.length > 100) return res.status(400).json({ message: "Tipo inválido" });
    if (!Descripcion || Descripcion.trim().length < 10) return res.status(400).json({ message: "Descripción muy corta" });

    const pool = await getSqlServerDb();
    const estados = await pool.request().query("SELECT IdEstado FROM Estados WHERE Nombre = 'Pendiente'");
    const idEstado = estados.recordset[0].IdEstado;

    const result = await pool.request()
      .input("Descripcion", sql.VarChar, Descripcion)
      .input("IdPrioridad", sql.Int, IdPrioridad)
      .input("IdArea", sql.Int, IdArea)
      .input("IdEstado", sql.Int, idEstado)
      .input("Empleado", sql.VarChar, Empleado)
      .input("TipoIncidencia", sql.VarChar, TipoIncidencia)
      .input("Fecha", sql.DateTime, new Date())
      .input("EscaladoSLA", sql.Bit, 0)
      .query(`INSERT INTO Incidencias (Descripcion, IdPrioridad, IdArea, IdEstado, Empleado, TipoIncidencia, Fecha, EscaladoSLA)
              OUTPUT INSERTED.IdIncidencia 
              VALUES (@Descripcion, @IdPrioridad, @IdArea, @IdEstado, @Empleado, @TipoIncidencia, @Fecha, @EscaladoSLA)`);
              
    const newId = result.recordset[0].IdIncidencia;
    await registrarAuditoria(pool, req, "Crear", newId, "Creó la incidencia");
    
    const newIn = await pool.request().input("IdIncidencia", sql.Int, newId).query("SELECT * FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    res.status(201).json(newIn.recordset[0]);
      notificarNuevaIncidencia(pool, newIn.recordset[0], origen || 'App Móvil');
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.put("/api/incidencias/:id", async (req, res) => {
  if (req.user.Rol === "Usuario") return res.status(403).json({ message: "No puedes editar" });
  try {
    const { IdEstado, IdTecnicoAsignado, Observaciones } = req.body;
    const pool = await getSqlServerDb();
    const actualResult = await pool.request().input("IdIncidencia", sql.Int, req.params.id).query("SELECT * FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    const actual = actualResult.recordset[0];
    if (!actual) return res.status(404).json({ message: "No encontrada" });

    let setClauses = [];
    const request = pool.request();
    let accionesAuditoria = [];
    request.input("IdIncidencia", sql.Int, req.params.id);

    if (IdEstado !== undefined && IdEstado !== actual.IdEstado) {
      setClauses.push("IdEstado = @IdEstado");
      request.input("IdEstado", sql.Int, IdEstado);
      
      const estados = await pool.request().query("SELECT IdEstado, Nombre FROM Estados");
      const idResuelto = estados.recordset.find(e => e.Nombre === "Resuelto")?.IdEstado;
      const idCerrado = estados.recordset.find(e => e.Nombre === "Cerrado")?.IdEstado;
      if ((IdEstado === idResuelto || IdEstado === idCerrado)) {
         const tecFinal = IdTecnicoAsignado !== undefined ? IdTecnicoAsignado : actual.IdTecnicoAsignado;
         if (!tecFinal) return res.status(400).json({ message: "Requiere técnico asignado" });
         if (!actual.FechaSolucion) setClauses.push("FechaSolucion = GETDATE()");
      }
      accionesAuditoria.push("Cambió estado");
    }

    if (IdTecnicoAsignado !== undefined && IdTecnicoAsignado !== actual.IdTecnicoAsignado) {
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
      await request.query(`UPDATE Incidencias SET ${setClauses.join(", ")} WHERE IdIncidencia = @IdIncidencia`);
      const accion = accionesAuditoria.some(a => a.includes("asign")) ? "Asignar" : "Editar";
      await registrarAuditoria(pool, req, accion, req.params.id, accionesAuditoria.join(". "));
    }
    
    res.json({ success: true });
  } catch(err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.delete("/api/incidencias/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    await pool.request().input("IdIncidencia", sql.Int, req.params.id).query("DELETE FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    await registrarAuditoria(pool, req, "Eliminar", req.params.id, "Eliminó el ticket permanentemente");
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

const { generarPdfIncidencias, generarExcelIncidencias } = require('./reports');

app.get('/api/reportes/incidencias/pdf', async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query(`SELECT i.*, a.NombreArea, p.Nombre AS NombrePrioridad, e.Nombre AS NombreEstado, t.Nombre + ' ' + t.Apellido AS TecnicoAsignado FROM Incidencias i LEFT JOIN Areas a ON i.IdArea = a.IdArea LEFT JOIN Prioridades p ON i.IdPrioridad = p.IdPrioridad LEFT JOIN Estados e ON i.IdEstado = e.IdEstado LEFT JOIN Usuarios t ON i.IdTecnicoAsignado = t.IdUsuario`);
    const pdfBuffer = await generarPdfIncidencias(result.recordset);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Incidencias.pdf');
    res.send(pdfBuffer);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reportes/incidencias/excel', async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query(`SELECT i.*, a.NombreArea, p.Nombre AS NombrePrioridad, e.Nombre AS NombreEstado, t.Nombre + ' ' + t.Apellido AS TecnicoAsignado FROM Incidencias i LEFT JOIN Areas a ON i.IdArea = a.IdArea LEFT JOIN Prioridades p ON i.IdPrioridad = p.IdPrioridad LEFT JOIN Estados e ON i.IdEstado = e.IdEstado LEFT JOIN Usuarios t ON i.IdTecnicoAsignado = t.IdUsuario`);
    const excelBuffer = await generarExcelIncidencias(result.recordset);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Incidencias.xlsx');
    res.send(excelBuffer);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API (SQL Server backend) running on http://localhost:${PORT}`);
});








