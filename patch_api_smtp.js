const fs = require('fs');
let content = fs.readFileSync('api-mock/index.js', 'utf8');

// 1. Rewrite getTransporter
const oldTransporterRegex = /const getTransporter = \(\) => \{[\s\S]*?\}\s*\};\s*/;
const newTransporter = `let smtpConfigured = false;
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
`;
content = content.replace(oldTransporterRegex, newTransporter);

// 2. Rewrite /api/auth/recuperar-password
const oldRecuperarRegex = /app\.post\('\/api\/auth\/recuperar-password', async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ message: 'Si el correo existe, se han enviado las instrucciones\.' \}\);\s*\} catch \(err\) \{[\s\S]*?\}\s*\}\);/;
const newRecuperar = `app.post('/api/auth/recuperar-password', async (req, res) => {
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
          from: \`"APPB Soporte" <\${process.env.SMTP_USER}>\`,
          to: Correo,
          subject: 'Recuperación de Contraseña - APPB',
          html: \`
            <h3>Hola, \${usuario.Nombre}</h3>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Tu nueva contraseña temporal es: <strong>\${nuevaClave}</strong></p>
            <p>Te recomendamos cambiarla inmediatamente después de iniciar sesión en el apartado de Perfil.</p>
            <br/>
            <p>Atentamente,<br/>Equipo de Soporte APPB</p>
          \`
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
  });`;
content = content.replace(oldRecuperarRegex, newRecuperar);

fs.writeFileSync('api-mock/index.js', content, 'utf8');
