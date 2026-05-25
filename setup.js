/**
 * MANTIZ - Setup: genera hashes y puede resetear la password del admin
 * 
 * Uso:
 *   node setup.js                  → genera hash de Admin1234!
 *   node setup.js MiPassword123    → genera hash de MiPassword123
 *   node setup.js --reset          → resetea admin a Admin1234! en la DB
 *   node setup.js --reset MiPass  → resetea admin a MiPass en la DB
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  const doReset = args.includes('--reset');
  const passArg = args.find(a => !a.startsWith('--'));
  const targetPass = passArg || 'Admin1234!';

  console.log('\n=== MANTIZ Setup ===\n');

  const hash = await bcrypt.hash(targetPass, 10);
  const verify = await bcrypt.compare(targetPass, hash);

  console.log('Password:   ', targetPass);
  console.log('Hash:       ', hash);
  console.log('Verificado: ', verify ? 'SI' : 'NO (ERROR!)');
  console.log('');
  console.log('SQL para actualizar manualmente:');
  console.log(`  UPDATE usuarios SET password='${hash}' WHERE email='admin@tienda.com';`);
  console.log('');

  if (doReset) {
    try {
      const db = require('./config/database');
      const [result] = await db.query(
        'UPDATE usuarios SET password = ? WHERE email = ?',
        [hash, 'admin@tienda.com']
      );
      if (result.affectedRows > 0) {
        console.log('Password del admin actualizada correctamente en la BD.');
        console.log('Email: admin@tienda.com');
        console.log('Pass:  ' + targetPass);
      } else {
        console.log('No se encontro el usuario admin@tienda.com en la BD.');
        console.log('Asegurate de haber importado database.sql primero.');
      }
      process.exit(0);
    } catch(e) {
      console.error('Error conectando a la BD:', e.message);
      console.log('Usa el SQL de arriba para actualizar manualmente.');
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
