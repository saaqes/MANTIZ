/**
 * database_v2/migrate.js
 * Runner de migraciones idempotente para MANTIZ.
 *
 * - Crea (si no existe) la tabla `_migrations` para registrar qué scripts
 *   ya se aplicaron.
 * - Recorre database_v2/migrations/*.sql en orden alfabético (000, 001, ...).
 * - Salta migraciones marcadas como MANUAL_ONLY (usan `DELIMITER`/procedimientos,
 *   solo soportado por el cliente `mysql`, no por mysql2).
 * - Cada migración pendiente se ejecuta en una conexión dedicada con
 *   multipleStatements:true (NO se activa en el pool principal de la app).
 * - Si una migración falla, se registra el error pero NO se detiene el
 *   arranque del servidor ni se marca como aplicada (se reintentará en el
 *   próximo arranque).
 *
 * Uso:
 *   node database_v2/migrate.js          → ejecuta migraciones pendientes
 *   require('./database_v2/migrate')()   → igual, desde código (ver app.js)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Migraciones que NO se ejecutan automáticamente (ver encabezado de cada archivo).
const MANUAL_ONLY = new Set(['000_schema_base.sql']);

function getConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'tienda_ropa',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
    charset: 'utf8mb4',
  };
}

async function runMigrations() {
  let conn;
  try {
    conn = await mysql.createConnection(getConfig());
  } catch (e) {
    console.error('⚠️  [migrate] No se pudo conectar a la BD para ejecutar migraciones:', e.message);
    return { ok: false, error: e.message, results: [] };
  }

  const results = [];
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        aplicada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await conn.query('SELECT nombre FROM _migrations');
    const applied = new Set(rows.map(r => r.nombre));

    let files = [];
    try {
      files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    } catch (e) {
      console.error('⚠️  [migrate] No se encontró la carpeta de migraciones:', e.message);
      return { ok: false, error: e.message, results };
    }

    for (const file of files) {
      if (MANUAL_ONLY.has(file)) {
        results.push({ file, status: 'omitida (manual)' });
        continue;
      }
      if (applied.has(file)) {
        results.push({ file, status: 'ya aplicada' });
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await conn.query(sql);
        await conn.query('INSERT INTO _migrations (nombre) VALUES (?)', [file]);
        results.push({ file, status: 'aplicada' });
        console.log(`✅ [migrate] ${file} aplicada correctamente`);
      } catch (e) {
        results.push({ file, status: `error: ${e.message}` });
        console.error(`❌ [migrate] ${file} falló (no se detiene el servidor):`, e.message);
      }
    }
    return { ok: true, results };
  } catch (e) {
    console.error('⚠️  [migrate] Error general ejecutando migraciones:', e.message);
    return { ok: false, error: e.message, results };
  } finally {
    await conn.end().catch(() => {});
  }
}

module.exports = runMigrations;

if (require.main === module) {
  runMigrations().then(r => {
    console.log('\n=== Resultado de migraciones ===');
    (r.results || []).forEach(x => console.log(`  ${x.file}: ${x.status}`));
    if (r.error) console.error('Error general:', r.error);
    process.exit(r.ok ? 0 : 1);
  });
}
