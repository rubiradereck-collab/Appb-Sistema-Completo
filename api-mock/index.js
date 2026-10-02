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
        let bccList = [];
      let toEmail = email;
      let pool = await getSqlServerDb();
      if (sendToAll) {
         const result = await pool.request().query("SELECT Correo FROM Usuarios WHERE Rol = 'Usuario' AND Estado = 1");
         bccList = result.recordset.map(u => u.Correo).filter(c => c);
         toEmail = process.env.SMTP_USER || "noreply@appb.com";
      }

      await transporter.sendMail({
        from: `"Sistema APPB" <${process.env.SMTP_USER || "noreply@appb.com"}>`,
        to: toEmail,
        bcc: bccList,
        subject: `Reporte de APPB`,
        text: `Se adjunta el reporte solicitado.`,
        attachments: [
          {
            filename: filename || 'Reporte.pdf',
            content: pdfBase64.split("base64,")[1] || pdfBase64,
            encoding: 'base64'
          }
        ]
      });
      
      if (sendToAll) {
         await registrarAuditoria(pool, req, "Enviar correo masivo", "Guias", `Enviadas guias a ${bccList.length} destinatarios`);
      }
    res.json({ success: true, message: `Reporte enviado exitosamente a ${email}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/adopcion", async (req, res) => {
    try {
      const pool = await getSqlServerDb();
      const result = await pool.request().query("SELECT COUNT(*) AS Total FROM Usuarios WHERE Rol = 'Usuario' AND Estado = 1");
      res.json({ totalUsuariosActivos: result.recordset[0].Total || 1 });
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








