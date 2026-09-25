require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { getSqlServerDb, sql } = require("./db_sqlserver");

const app = express();
app.use((req,res,next)=>{console.log('['+new Date().toLocaleTimeString()+'] '+req.method+' '+req.url);next();});
app.use(cors());


app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_12345";

// ConfiguraciÃ³n Nodemailer
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "test@gmail.com",
      pass: process.env.SMTP_PASS || "pass123",
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await getSqlServerDb();
    const result = await pool.request().query("SELECT 1 AS TestStatus");
    res.json({ success: true, message: "ConexiÃ³n a SQL Server exitosa", data: result.recordset });
  } catch (err) {
    console.error("Test DB fallÃ³:", err);
    res.status(500).json({ success: false, error: err.message });
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
  if (req.path.startsWith('/api/reportes/incidencias/')) return next();
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token requerido" });

  jwt.verify(token, process.env.JWT_SECRET || "super_secret_key_12345", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token invÃ¡lido o expirado" });
    req.user = decoded;
    next();
  });
};
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
      
    if (result.recordset.length === 0) return res.status(404).json({ error: "GuÃ­a no encontrada" });
    const guia = result.recordset[0];
    
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Sistema de Incidencias APPB" <${process.env.SMTP_USER || "noreply@appb.com"}>`,
        to: correoDestino,
        subject: `GuÃ­as de Ayuda - Sistema de Incidencias APPB`,
        html: `
          <h2 style="color: #2b6b9a;">${guia.Titulo}</h2>
          <hr />
          <h4 style="color: #153250;">Problema:</h4>
          <p>${guia.Problema.replace(/\n/g, '<br/>')}</p>
          <br/>
          <h4 style="color: #153250;">SoluciÃ³n recomendada:</h4>
          <p>${guia.Solucion.replace(/\n/g, '<br/>')}</p>
          <hr />
          <p style="font-size: 12px; color: gray;">Generado por Sistema de GestiÃ³n de Incidencias APPB</p>
        `
      });
      res.json({ success: true, message: "Correo enviado exitosamente" });
    } catch (mailErr) {
      console.error("Error al enviar guÃ­a:", mailErr.message);
      res.status(500).json({ error: "No se pudo enviar el correo. Revisa la configuraciÃ³n SMTP." });
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
    const { nuevaPassword } = req.body;
    if (!nuevaPassword) return res.status(400).json({ error: "nuevaPassword es requerida" });
    const pool = await getSqlServerDb();
    
    // Check if user exists to get their email
    const usrRes = await pool.request()
      .input("IdUsuario", sql.Int, req.params.id)
      .query("SELECT Correo FROM Usuarios WHERE IdUsuario = @IdUsuario");
      
    if (usrRes.recordset.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const userEmail = usrRes.recordset[0].Correo;

    const hash = await bcrypt.hash(nuevaPassword, 10);
    await pool.request()
      .input("IdUsuario", sql.Int, req.params.id)
      .input("Password", sql.VarChar, hash)
      .query("UPDATE Usuarios SET Password = @Password, IntentosFallidos = 0, BloqueadoHasta = NULL WHERE IdUsuario = @IdUsuario");

    // Intentar enviar correo (no bloquea si falla, solo loguea)
    if (userEmail) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"Sistema de Incidencias APPB" <${process.env.SMTP_USER || "noreply@appb.com"}>`,
          to: userEmail,
          subject: "RecuperaciÃ³n de contraseÃ±a - Sistema de Incidencias APPB",
          text: `Hola,\n\nTu contraseÃ±a temporal ha sido generada exitosamente.\n\nNueva contraseÃ±a: ${nuevaPassword}\n\nPor favor, ingresa al sistema y cÃ¡mbiala lo antes posible.\n\nSaludos,\nSistema de Incidencias APPB`
        });
      } catch (mailErr) {
        console.error("No se pudo enviar el correo de reset:", mailErr.message);
      }
    }

    res.json({ success: true, message: "ContraseÃ±a actualizada" });
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
    const { Descripcion, IdPrioridad, IdArea, Empleado, TipoIncidencia } = req.body;
    if (!Empleado || Empleado.length > 150) return res.status(400).json({ message: "Empleado invÃ¡lido" });
    if (!TipoIncidencia || TipoIncidencia.length > 100) return res.status(400).json({ message: "Tipo invÃ¡lido" });
    if (!Descripcion || Descripcion.trim().length < 10) return res.status(400).json({ message: "DescripciÃ³n muy corta" });

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
    await registrarAuditoria(pool, req, "Crear", newId, "CreÃ³ la incidencia");
    
    const newIn = await pool.request().input("IdIncidencia", sql.Int, newId).query("SELECT * FROM Incidencias WHERE IdIncidencia = @IdIncidencia");
    res.status(201).json(newIn.recordset[0]);
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
         if (!tecFinal) return res.status(400).json({ message: "Requiere tÃ©cnico asignado" });
         if (!actual.FechaSolucion) setClauses.push("FechaSolucion = GETDATE()");
      }
      accionesAuditoria.push("CambiÃ³ estado");
    }

    if (IdTecnicoAsignado !== undefined && IdTecnicoAsignado !== actual.IdTecnicoAsignado) {
      setClauses.push("IdTecnicoAsignado = @IdTecnicoAsignado");
      request.input("IdTecnicoAsignado", sql.Int, IdTecnicoAsignado);
      accionesAuditoria.push(IdTecnicoAsignado ? "Se asignÃ³ el ticket" : "Se desasignÃ³");
    }

    if (Observaciones !== undefined && Observaciones !== actual.Observaciones) {
      setClauses.push("Observaciones = @Observaciones");
      request.input("Observaciones", sql.VarChar, Observaciones);
      accionesAuditoria.push("ModificÃ³ observaciones");
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
    await registrarAuditoria(pool, req, "Eliminar", req.params.id, "EliminÃ³ el ticket permanentemente");
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



