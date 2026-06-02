/**
 * setup.js — Inicializar la base de datos PostgreSQL en Neon
 * 
 * Uso: node setup.js
 * 
 * Lee database.pg.sql y ejecuta todas las instrucciones DDL + seed data.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setup() {
  console.log('🚀 Iniciando setup de MANTIZ en PostgreSQL / Neon...');
  const sql = fs.readFileSync(path.join(__dirname, 'database.pg.sql'), 'utf8');
  
  // Dividir en statements individuales (separados por ;)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let ok = 0, errors = 0;
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    try {
      await pool.query(stmt);
      ok++;
    } catch (e) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.error('❌', e.message.split('\n')[0].slice(0, 120));
        errors++;
      }
    }
  }
  
  await pool.end();
  console.log(`✅ Setup completado: ${ok} OK, ${errors} errores`);
  console.log('');
  console.log('Admin: admin@mantiz.co / Admin1234!');
}

setup().catch(e => { console.error('Setup fatal:', e); process.exit(1); });
