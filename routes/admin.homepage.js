const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { uploadCarousel } = require('../config/multer');

// ── GET: página principal de configuración ────────────────────────────────────
router.get('/', isAdmin, async (req, res) => {
  try {
    const [cfgRows] = await db.query('SELECT * FROM homepage_config');
    const cfg = {};
    cfgRows.forEach(r => cfg[r.clave] = r.valor);

    const [carrusel]  = await db.query('SELECT * FROM carrusel ORDER BY orden ASC');
    const [modelos]   = await db.query(
      'SELECT * FROM modelos_3d WHERE activo=1 ORDER BY es_principal DESC, nombre ASC'
    );
    let carruselMarca = [];
    try { [carruselMarca] = await db.query('SELECT * FROM carrusel_marca ORDER BY orden ASC'); } catch(e) {}

    res.render('admin/homepage', {
      title: 'Admin - Estructura Inicio',
      cfg, carrusel, carruselMarca, modelos, isAdmin: true
    });
  } catch(e) {
    req.flash('error', 'Error al cargar: ' + e.message);
    res.redirect('/admin');
  }
});

// ── POST: guardar configuración de layout ─────────────────────────────────────
router.post('/guardar', isAdmin, async (req, res) => {
  try {
    const campos = [
      'mostrar_hero', 'mostrar_productos', 'mostrar_bestsellers', 'mostrar_carrusel_marca',
      'productos_cantidad', 'bestsellers_cantidad', 'carrusel_marca_titulo'
    ];
    for (const c of campos) {
      const val = req.body[c] !== undefined ? req.body[c] : '0';
      await db.query(
        'INSERT INTO homepage_config (clave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
        [c, val]
      );
    }
    if (req.body.seccion_orden) {
      await db.query(
        'INSERT INTO homepage_config (clave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)',
        ['seccion_orden', req.body.seccion_orden]
      );
    }
    req.flash('success', 'Configuración guardada correctamente');
  } catch(e) {
    req.flash('error', 'Error al guardar: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// ════════════════════════════════════════════════════════════════════════════════
// CARRUSEL PRINCIPAL (HERO)
// ════════════════════════════════════════════════════════════════════════════════

// POST: nuevo slide del hero
router.post('/carrusel/nuevo', isAdmin, uploadCarousel.single('imagen'), async (req, res) => {
  if (!req.file) {
    req.flash('error', 'Debes seleccionar una imagen');
    return res.redirect('/admin/homepage');
  }
  try {
    const { titulo, subtitulo } = req.body;
    const [[max]] = await db.query('SELECT COALESCE(MAX(orden),0) AS m FROM carrusel');
    await db.query(
      'INSERT INTO carrusel (imagen, titulo, subtitulo, orden, activo) VALUES (?,?,?,?,1)',
      [req.file.filename, titulo || '', subtitulo || '', (max.m || 0) + 1]
    );
    req.flash('success', 'Slide agregado correctamente');
  } catch(e) {
    req.flash('error', 'Error al guardar slide: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// POST: editar slide del hero
router.post('/carrusel/:id/editar', isAdmin, async (req, res) => {
  try {
    const { titulo, subtitulo, activo } = req.body;
    await db.query(
      'UPDATE carrusel SET titulo=?, subtitulo=?, activo=? WHERE id=?',
      [titulo || '', subtitulo || '', activo ? 1 : 0, req.params.id]
    );
    req.flash('success', 'Slide actualizado');
  } catch(e) {
    req.flash('error', 'Error al editar slide: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// POST: toggle visibilidad slide del hero (responde JSON para fetch)
router.post('/carrusel/:id/toggle', isAdmin, async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT activo FROM carrusel WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ success: false, error: 'No encontrado' });
    await db.query('UPDATE carrusel SET activo=? WHERE id=?', [s.activo ? 0 : 1, req.params.id]);
    res.json({ success: true, activo: s.activo ? 0 : 1 });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST: eliminar slide del hero
router.post('/carrusel/:id/eliminar', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM carrusel WHERE id=?', [req.params.id]);
    req.flash('success', 'Slide eliminado');
  } catch(e) {
    req.flash('error', 'Error al eliminar: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// ════════════════════════════════════════════════════════════════════════════════
// CARRUSEL DE MARCA (sección inferior)
// ════════════════════════════════════════════════════════════════════════════════

// POST: nueva imagen de marca
router.post('/carrusel-marca/nuevo', isAdmin, uploadCarousel.single('imagen'), async (req, res) => {
  if (!req.file) {
    req.flash('error', 'Debes seleccionar una imagen');
    return res.redirect('/admin/homepage');
  }
  try {
    const { titulo, subtitulo, boton_texto, boton_url, color_acento } = req.body;
    const [[max]] = await db.query('SELECT COALESCE(MAX(orden),0) AS m FROM carrusel_marca');
    await db.query(
      'INSERT INTO carrusel_marca (imagen, titulo, subtitulo, orden, activo, boton_texto, boton_url, color_acento) VALUES (?,?,?,?,1,?,?,?)',
      [req.file.filename, titulo || '', subtitulo || '', (max.m || 0) + 1, boton_texto || null, boton_url || '/productos', color_acento || '#e91e8c']
    );
    req.flash('success', 'Imagen de marca agregada');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// POST: editar imagen de marca
router.post('/carrusel-marca/:id/editar', isAdmin, uploadCarousel.single('imagen'), async (req, res) => {
  try {
    const { titulo, subtitulo, activo, boton_texto, boton_url, color_acento } = req.body;
    const updates = {
      titulo: titulo || '', subtitulo: subtitulo || '', activo: activo ? 1 : 0,
      boton_texto: boton_texto || null, boton_url: boton_url || '/productos',
      color_acento: color_acento || '#e91e8c'
    };
    if (req.file) updates.imagen = req.file.filename;
    const setClause = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.query(`UPDATE carrusel_marca SET ${setClause} WHERE id=?`, [...Object.values(updates), req.params.id]);
    req.flash('success', 'Imagen de marca actualizada');
  } catch(e) {
    req.flash('error', 'Error al editar: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

// POST: toggle visibilidad imagen de marca (responde JSON para fetch)
router.post('/carrusel-marca/:id/toggle', isAdmin, async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT activo FROM carrusel_marca WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ success: false, error: 'No encontrado' });
    await db.query('UPDATE carrusel_marca SET activo=? WHERE id=?', [s.activo ? 0 : 1, req.params.id]);
    res.json({ success: true, activo: s.activo ? 0 : 1 });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST: eliminar imagen de marca
router.post('/carrusel-marca/:id/eliminar', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM carrusel_marca WHERE id=?', [req.params.id]);
    req.flash('success', 'Imagen eliminada');
  } catch(e) {
    req.flash('error', 'Error al eliminar: ' + e.message);
  }
  res.redirect('/admin/homepage');
});

module.exports = router;
