const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { uploadCarousel } = require('../config/multer');

// GET homepage config
router.get('/', isAdmin, async (req, res) => {
  const [cfgRows] = await db.query('SELECT * FROM homepage_config');
  const cfg = {};
  cfgRows.forEach(r => cfg[r.clave] = r.valor);

  const [carrusel] = await db.query('SELECT * FROM carrusel ORDER BY orden ASC');
  const [modelos] = await db.query('SELECT * FROM modelos_3d WHERE activo=1');
  let carruselMarca = [];
  try { [carruselMarca] = await db.query('SELECT * FROM carrusel_marca ORDER BY orden ASC'); } catch(e) {}

  res.render('admin/homepage', {
    title: 'Admin - Estructura Inicio',
    cfg, carrusel, carruselMarca, modelos, isAdmin: true
  });
});

// SAVE homepage layout config
router.post('/guardar', isAdmin, async (req, res) => {
  const campos = [
    'mostrar_hero','mostrar_productos','mostrar_bestsellers','mostrar_carrusel_marca',
    'productos_cantidad','bestsellers_cantidad','carrusel_marca_titulo'
  ];
  for (const c of campos) {
    const val = req.body[c] !== undefined ? req.body[c] : '0';
    await db.query(
      'INSERT INTO homepage_config (clave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
      [c, val]
    );
  }
  // Section order
  if (req.body.seccion_orden) {
    await db.query(
      'INSERT INTO homepage_config (clave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
      ['seccion_orden', req.body.seccion_orden]
    );
  }
  req.flash('success', 'Configuracion del inicio guardada');
  res.redirect('/admin/homepage');
});

// Add banner to marca carousel (separate from main hero carousel)
router.post('/carrusel-marca/nuevo', isAdmin, uploadCarousel.single('imagen'), async (req, res) => {
  if (!req.file) { req.flash('error', 'Imagen requerida'); return res.redirect('/admin/homepage'); }
  const { titulo, subtitulo } = req.body;
  try {
    const [max] = await db.query('SELECT COALESCE(MAX(orden),0) as m FROM carrusel_marca');
    await db.query('INSERT INTO carrusel_marca (imagen, titulo, subtitulo, orden, activo) VALUES (?,?,?,?,1)',
      [req.file.filename, titulo||'', subtitulo||'', (max[0]?.m||0)+1]);
    req.flash('success', 'Imagen de marca agregada');
  } catch(e) { req.flash('error', 'Error: '+e.message); }
  res.redirect('/admin/homepage');
});

router.post('/carrusel-marca/:id/eliminar', isAdmin, async (req, res) => {
  await db.query('DELETE FROM carrusel_marca WHERE id=?', [req.params.id]);
  req.flash('success', 'Imagen eliminada');
  res.redirect('/admin/homepage');
});

router.post('/carrusel-marca/:id/toggle', isAdmin, async (req, res) => {
  const [[s]] = await db.query('SELECT activo FROM carrusel_marca WHERE id=?', [req.params.id]);
  if (s) await db.query('UPDATE carrusel_marca SET activo=? WHERE id=?', [s.activo?0:1, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
