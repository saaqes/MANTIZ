const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'tienda_ropa',
  port: process.env.DB_PORT || 3306,
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,          // antes: 0 (ilimitado → riesgo de OOM bajo carga)
  charset: 'utf8mb4',
  connectTimeout: 10000,
  enableKeepAlive: true,   // evita "connection lost" por inactividad en Render/Neon
  keepAliveInitialDelay: 30000, // ping cada 30s tras el primer paquete
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MariaDB:', err.message);
    return;
  }
  console.log('✅ Conectado a MariaDB correctamente');
  connection.release();
});

// ── Mensajes de error seguros ────────────────────────────────────────────────
// Nunca se debe exponer un mensaje SQL crudo (e.message) al usuario final.
// Esta función traduce los errores más comunes a mensajes amigables y deja
// el detalle real solo en los logs del servidor.
function friendlyDbError(e) {
  console.error('[DB ERROR]', e && e.code, e && e.message);
  if (!e || !e.code) return 'Ocurrió un error procesando tu solicitud. Intenta de nuevo.';
  switch (e.code) {
    case 'ER_NO_SUCH_TABLE':
      return 'Esta función no está disponible por el momento.';
    case 'ER_BAD_FIELD_ERROR':
      return 'Esta función no está disponible por el momento.';
    case 'ER_DUP_ENTRY':
      return 'Ya existe un registro con esos datos.';
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_ROW_IS_REFERENCED_2':
      return 'No se pudo completar la operación por una relación de datos.';
    default:
      return 'Ocurrió un error procesando tu solicitud. Intenta de nuevo.';
  }
}

const promisePool = pool.promise();
promisePool.friendlyDbError = friendlyDbError;
promisePool.dbConfig = dbConfig;

async function ensureCarruselMarcaSchema() {
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS carrusel_marca (
        id INT AUTO_INCREMENT PRIMARY KEY,
        imagen VARCHAR(255) NOT NULL,
        titulo VARCHAR(200) DEFAULT '',
        subtitulo VARCHAR(300) DEFAULT '',
        orden INT DEFAULT 0,
        activo TINYINT(1) DEFAULT 1,
        boton_texto VARCHAR(80) DEFAULT NULL,
        boton_url VARCHAR(255) DEFAULT '/productos',
        color_acento VARCHAR(20) DEFAULT '#e91e8c',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const alters = [
      "ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS boton_texto VARCHAR(80) DEFAULT NULL",
      "ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS boton_url VARCHAR(255) DEFAULT '/productos'",
      "ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS color_acento VARCHAR(20) DEFAULT '#e91e8c'"
    ];
    for (const sql of alters) {
      try { await promisePool.query(sql); } catch (e) { /* ok */ }
    }
  } catch (e) {
    console.error('[DB] carrusel_marca schema:', e.message);
  }
}
ensureCarruselMarcaSchema();

// ── Recuperación de contraseña ───────────────────────────────────────────────
// Guarda solo el HASH del token (no el token en texto plano) por seguridad.
// expires_at define la validez del enlace (1 hora, se define en routes/auth.js).
async function ensurePasswordResetsSchema() {
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token_hash (token_hash),
        INDEX idx_usuario_id (usuario_id),
        CONSTRAINT fk_password_resets_usuario FOREIGN KEY (usuario_id)
          REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.error('[DB] password_resets schema:', e.message);
  }
}
ensurePasswordResetsSchema();

module.exports = promisePool;