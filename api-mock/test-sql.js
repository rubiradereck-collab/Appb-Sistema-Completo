
// Restablece la contraseña del usuario 'admin' a 'admin123' (solo para pruebas)
const bcrypt = require("bcryptjs");
const { getDb, pool } = require("./db_postgres");

(async () => {
  const db = await getDb();
  const hash = await bcrypt.hash("admin123", 10);
  await db.request().input("Password", hash).query("UPDATE Usuarios SET Password = @Password WHERE Usuario = 'admin'");
  console.log("Admin password reset to admin123");
  await pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
