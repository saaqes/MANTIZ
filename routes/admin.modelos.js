const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { uploadModel3d } = require('../config/multer');
const { uploadFile } = require('../config/storage');

// LIST
router.get('/', isAdmin, async (req, res) => {
  const [modelos] = await db.query(
    `SELECT m.*, p.titulo as producto_titulo FROM modelos_3d m
     LEFT JOIN productos p ON m.producto_id = p.id
     ORDER BY m.es_principal DESC, m.creado_en DESC`
  );
  const [productos] = await db.query('SELECT id, titulo FROM productos WHERE activo=1 ORDER BY titulo');
  res.render('admin/modelos', { title: 'Admin - Modelos 3D', modelos, productos, archivosDir: [], isAdmin: true });
});

// UPLOAD → R2
router.post('/subir', isAdmin, uploadModel3d.single('modelo'), async (req, res) => {
  if (!req.file) { req.flash('error', 'Selecciona un archivo .glb o .gltf'); return res.redirect('/admin/modelos'); }
  const { nombre, producto_id } = req.body;
  try {
    const modelUrl = await uploadFile(req.file.buffer, req.file.originalname, 'models', 'model/gltf-binary');
    await db.query(
      'INSERT INTO modelos_3d (nombre, archivo, producto_id) VALUES (?,?,?)',
      [nombre || req.file.originalname, modelUrl, producto_id || null]
    );
    req.flash('success', 'Modelo 3D subido a R2 correctamente');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/modelos');
});

// UPDATE
router.post('/:id/editar', isAdmin, uploadModel3d.single('modelo'), async (req, res) => {
  const { nombre, producto_id, activo, escala, pos_y } = req.body;
  try {
    const updates = {
      nombre: nombre || 'Modelo',
      producto_id: producto_id || null,
      activo: activo ? 1 : 0,
      escala: parseFloat(escala) || 1,
      pos_y: parseFloat(pos_y) || 0,
    };
    if (req.file) {
      updates.archivo = await uploadFile(req.file.buffer, req.file.originalname, 'models', 'model/gltf-binary');
    }
    const setCols = Object.keys(updates).map(k => k + '=?').join(',');
    await db.query('UPDATE modelos_3d SET ' + setCols + ' WHERE id=?', [...Object.values(updates), req.params.id]);
    req.flash('success', 'Modelo actualizado');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/modelos');
});

// SET as principal
router.post('/:id/principal', isAdmin, async (req, res) => {
  await db.query('UPDATE modelos_3d SET es_principal=0');
  await db.query('UPDATE modelos_3d SET es_principal=1 WHERE id=?', [req.params.id]);
  await db.query(
    'INSERT INTO homepage_config (clave, valor) VALUES (?,?) ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor',
    ['viewer3d_modelo_id', req.params.id]
  );
  req.flash('success', 'Modelo establecido como principal');
  const dest = req.body.returnTo === '/admin/homepage' ? '/admin/homepage' : '/admin/modelos';
  res.redirect(dest);
});

// DELETE
router.post('/:id/eliminar', isAdmin, async (req, res) => {
  await db.query('DELETE FROM modelos_3d WHERE id=?', [req.params.id]);
  req.flash('success', 'Modelo eliminado');
  res.redirect('/admin/modelos');
});

// API: get active model
router.get('/activo', async (req, res) => {
  const [[m]] = await db.query('SELECT * FROM modelos_3d WHERE es_principal=1 AND activo=1 LIMIT 1');
  if (m) return res.json({ archivo: m.archivo, nombre: m.nombre, id: m.id });
  const [[first]] = await db.query('SELECT * FROM modelos_3d WHERE activo=1 LIMIT 1');
  if (first) return res.json({ archivo: first.archivo, nombre: first.nombre, id: first.id });
  res.json({ archivo: null, nombre: 'Default', id: null });
});

module.exports = router;
