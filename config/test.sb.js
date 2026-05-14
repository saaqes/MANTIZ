require('dotenv').config();
const mysql = require('mysql2');

const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tienda_ropa'
});

conn.connect(err => {
  if (err) {
    console.error('❌ Error:', err.message);
    console.error('Código:', err.code);
    return;
  }
  console.log('✅ Conexión exitosa');
  conn.end();
});