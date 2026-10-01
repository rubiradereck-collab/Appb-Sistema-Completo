const fs = require('fs');
let content = fs.readFileSync('api-mock/index.js', 'utf8');

// Replace all occurrences of const transporter = getTransporter(); with a check, except the ones we already handled.
content = content.replace(/const transporter = getTransporter\(\);\s+await transporter.sendMail\(\{/g, `const transporter = getTransporter();
      if (!transporter) return res.status(503).json({ error: 'Servicio de correo no configurado' });
      await transporter.sendMail({`);

fs.writeFileSync('api-mock/index.js', content, 'utf8');
