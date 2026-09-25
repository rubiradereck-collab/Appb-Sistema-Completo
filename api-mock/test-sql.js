
const sql = require("mssql");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "1433", 10),
  options: { encrypt: true, trustServerCertificate: true }
};
sql.connect(config).then(async pool => {
  const hash = await bcrypt.hash("admin123", 10);
  return pool.request().input("Password", sql.VarChar, hash).query("UPDATE Usuarios SET Password = @Password WHERE Usuario = 'admin'");
}).then(result => {
  console.log("Admin password reset to admin123");
  process.exit(0);
}).catch(console.error);

