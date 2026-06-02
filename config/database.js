/**
 * config/database.js — PostgreSQL (Neon) con wrapper compatible con mysql2
 * 
 * ✅ Convierte automáticamente:
 *   ? → $1, $2, $N (parámetros posicionales PG)
 *   IFNULL(a,b)     → COALESCE(a,b)
 *   DATE_SUB(NOW(), INTERVAL N DAY) → NOW() - INTERVAL 'N days'
 *   CURDATE()       → CURRENT_DATE
 *   TIMESTAMPDIFF(SECOND, col, NOW()) → EXTRACT(EPOCH FROM NOW()-col)::INT
 *   INSERT IGNORE INTO → INSERT INTO ... ON CONFLICT DO NOTHING
 *   Backticks       → eliminados
 *   INSERT          → auto-agrega RETURNING id
 * 
 * 🔄 Para ON DUPLICATE KEY UPDATE → actualizar manualmente en cada ruta.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => console.log('✅ Conectado a PostgreSQL / Neon'));
pool.on('error', (err) => console.error('❌ Error en pool PG:', err.message));

function mysqlToPg(sql) {
  const wasInsertIgnore = /INSERT\s+IGNORE\s+INTO/i.test(sql);

  let s = sql
    .replace(/`/g, '')
    .replace(/\bIFNULL\s*\(/gi, 'COALESCE(')
    .replace(/\bDATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
             (_, n) => `NOW() - INTERVAL '${n} days'`)
    .replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE')
    .replace(/TIMESTAMPDIFF\s*\(\s*SECOND\s*,\s*([\w.]+)\s*,\s*NOW\s*\(\s*\)\s*\)/gi,
             (_, col) => `EXTRACT(EPOCH FROM NOW()-${col})::INT`)
    .replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');

  // Convert ? → $N (after all replacements)
  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);

  // Auto RETURNING id for INSERTs
  const isInsert = /^\s*INSERT\s+/i.test(s);
  if (isInsert && !/RETURNING/i.test(s)) {
    s = s.trimEnd().replace(/;\s*$/, '') + ' RETURNING id';
  }

  // ON CONFLICT DO NOTHING for INSERT IGNORE
  if (wasInsertIgnore && !/ON CONFLICT/i.test(s)) {
    s = s.replace(/RETURNING\s+id\s*$/i, 'ON CONFLICT DO NOTHING RETURNING id');
    if (!/ON CONFLICT/i.test(s)) s += ' ON CONFLICT DO NOTHING';
  }

  return s;
}

const db = {
  query: async (sql, params = []) => {
    const pgSql = mysqlToPg(sql);
    const isInsert = /^\s*INSERT\s+/i.test(pgSql);
    try {
      const result = await pool.query(pgSql, params && params.length ? params : undefined);
      if (isInsert) {
        const insertId = result.rows[0]?.id ?? null;
        return [{ insertId, rows: result.rows, rowCount: result.rowCount }];
      }
      return [result.rows];
    } catch (e) {
      console.error('❌ DB Error:', e.message.split('\n')[0]);
      console.error('   SQL:', pgSql.slice(0, 200));
      throw e;
    }
  },
  // Exponer el pool para connect-pg-simple
  pool,
};

module.exports = db;
