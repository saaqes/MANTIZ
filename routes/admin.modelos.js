const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { uploadModel3d } = require('../config/multer');
const fs = require('fs');
const path = require('path');

// LIST models
router.get('/', isAdmin, async (req, res) => {
  const [modelos] = await db.query(
    `SELECT m.*, p.titulo as producto_titulo FROM modelos_3d m
     LEFT JOIN productos p ON m.producto_id = p.id
     ORDER BY m.es_principal DESC, m.creado_en DESC`
  );
  const [productos] = await db.query('SELECT id, titulo FROM productos WHERE activo=1 ORDER BY titulo');
  // Scan physical files in /public/models
  const modelsDir = path.join(__dirname, '../public/models');
  let archivosDir = [];
  try { archivosDir = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb') || f.endsWith('.gltf')); } catch(e) {}

  res.render('admin/modelos', { title: 'Admin - Modelos 3D', modelos, productos, archivosDir, isAdmin: true });
});

// UPLOAD new model
router.post('/subir', isAdmin, uploadModel3d.single('modelo'), async (req, res) => {
  if (!req.file) { req.flash('error', 'Selecciona un archivo .glb o .gltf'); return res.redirect('/admin/modelos'); }
  const { nombre, producto_id } = req.body;
  try {
    await db.query(
      'INSERT INTO modelos_3d (nombre, archivo, producto_id) VALUES (?,?,?)',
      [nombre || req.file.filename, req.file.filename, producto_id || null]
    );
    req.flash('success', 'Modelo 3D subido correctamente');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/modelos');
});

// REGISTER existing file (already in /public/models)
router.post('/registrar', isAdmin, async (req, res) => {
  const { nombre, archivo, producto_id } = req.body;
  if (!archivo) { req.flash('error', 'Selecciona un archivo'); return res.redirect('/admin/modelos'); }
  // Check file exists
  const filePath = path.join(__dirname, '../public/models', archivo);
  if (!fs.existsSync(filePath)) { req.flash('error', 'Archivo no encontrado en /public/models'); return res.redirect('/admin/modelos'); }
  try {
    await db.query(
      'INSERT IGNORE INTO modelos_3d (nombre, archivo, producto_id) VALUES (?,?,?)',
      [nombre || archivo, archivo, producto_id || null]
    );
    req.flash('success', 'Modelo registrado');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/modelos');
});

// UPDATE model
router.post('/:id/editar', isAdmin, uploadModel3d.single('modelo'), async (req, res) => {
  const { nombre, producto_id, activo, escala, pos_y } = req.body;
  try {
    const updates = {
      nombre: nombre || 'Modelo',
      producto_id: producto_id || null,
      activo: activo ? 1 : 0,
      escala: parseFloat(escala) || 1,
      pos_y: parseFloat(pos_y) || 0
    };
    // If new file uploaded, update archivo
    if (req.file) updates.archivo = req.file.filename;
    const setCols = Object.keys(updates).map(k => k + '=?').join(',');
    await db.query('UPDATE modelos_3d SET ' + setCols + ' WHERE id=?', [...Object.values(updates), req.params.id]);
    req.flash('success', 'Modelo actualizado');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/modelos');
});

// SET as principal (used in 3D viewer on homepage)
router.post('/:id/principal', isAdmin, async (req, res) => {
  await db.query('UPDATE modelos_3d SET es_principal=0');
  await db.query('UPDATE modelos_3d SET es_principal=1 WHERE id=?', [req.params.id]);
  // Also update homepage_config
  await db.query('INSERT INTO homepage_config (clave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
    ['viewer3d_modelo_id', req.params.id]);
  req.flash('success', 'Modelo establecido como principal en el inicio');
  res.redirect('/admin/modelos');
});

// DELETE model
router.post('/:id/eliminar', isAdmin, async (req, res) => {
  const [[m]] = await db.query('SELECT * FROM modelos_3d WHERE id=?', [req.params.id]);
  if (!m) { req.flash('error', 'No encontrado'); return res.redirect('/admin/modelos'); }
  // Only delete file if not a default model
  const defaults = ['susan.glb', 'stella.glb', 't_shirt.glb'];
  if (!defaults.includes(m.archivo)) {
    const fp = path.join(__dirname, '../public/models', m.archivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await db.query('DELETE FROM modelos_3d WHERE id=?', [req.params.id]);
  req.flash('success', 'Modelo eliminado');
  res.redirect('/admin/modelos');
});

// API: get active model for homepage
router.get('/activo', async (req, res) => {
  const [[m]] = await db.query('SELECT * FROM modelos_3d WHERE es_principal=1 AND activo=1 LIMIT 1');
  if (m) return res.json({ archivo: '/models/' + m.archivo, nombre: m.nombre, id: m.id });
  // Fallback to first available
  const [[first]] = await db.query('SELECT * FROM modelos_3d WHERE activo=1 LIMIT 1');
  if (first) return res.json({ archivo: '/models/' + first.archivo, nombre: first.nombre, id: first.id });
  res.json({ archivo: '/models/susan.glb', nombre: 'Default', id: null });
});

module.exports = router;
