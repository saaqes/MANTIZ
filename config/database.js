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
module.exports = promisePool;
