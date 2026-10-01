const fs = require('fs');
let content = fs.readFileSync('api-mock/index.js', 'utf8');

const regexAdminReset = /app\.post\('\/api\/usuarios\/:id\/reset-password', verifyToken, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, message: "Contrase(?:.)+a actualizada" \}\);\s*\} catch \(err\) \{[\s\S]*?\}\s*\}\);/;

const newAdminReset = `app.post('/api/usuarios/:id/reset-password', verifyToken, async (req, res) => {
    try {
      if (req.user.Rol !== 'Administrador') return res.status(403).json({ message: 'No autorizado' });
      const pool = await getSqlServerDb();
      const userRes = await pool.request()
        .input('Id', sql.Int, req.params.id)
        .query('SELECT Correo FROM Usuarios WHERE IdUsuario = @Id');
      
      const userEmail = userRes.recordset[0]?.Correo;
      const nuevaPassword = Math.random().toString(36).slice(-8);
      const hash = await bcrypt.hash(nuevaPassword, 10);
      
      const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ message: 'Servicio de correo no configurado' });
  
      if (userEmail) {
        try {
          await transporter.sendMail({
            from: \`"Sistema de Incidencias APPB" <\${process.env.SMTP_USER || "noreply@appb.com"}>\`,
            to: userEmail,
            subject: "Recuperación de contraseña - Sistema de Incidencias APPB",
            text: \`Hola,\\n\\nTu contraseña temporal ha sido generada exitosamente.\\n\\nNueva contraseña: \${nuevaPassword}\\n\\nPor favor, ingresa al sistema y cámbiala lo antes posible.\\n\\nSaludos,\\nSistema de Incidencias APPB\`
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
  
      res.json({ success: true, message: "Contraseña actualizada y correo enviado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });`;

content = content.replace(regexAdminReset, newAdminReset);

fs.writeFileSync('api-mock/index.js', content, 'utf8');
