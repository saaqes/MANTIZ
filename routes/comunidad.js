/**
 * routes/comunidad.js
 * Sección comunidad: tableros públicos globales, usuarios, stickers
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { uploadSticker } = require('../config/multer'); // definir en multer.js

// ─── Página principal de Comunidad ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Tableros públicos más vistos
    const [tableros] = await db.query(
      `SELECT t.*, u.username, u.nombre_visible, u.foto_perfil_preset, u.foto_perfil_tipo, u.foto_perfil,
              COUNT(DISTINCT tp.id) as total_pines,
              COUNT(DISTINCT tr.id) as total_reacciones,
              COUNT(DISTINCT tg.id) as total_guardados
       FROM tableros t
       JOIN usuarios u ON t.usuario_id = u.id
       LEFT JOIN tablero_pines tp ON t.id = tp.tablero_id
       LEFT JOIN tablero_reacciones tr ON t.id = tr.tablero_id
       LEFT JOIN tablero_guardados tg ON t.id = tg.tablero_id
       WHERE t.privacidad = 'publico' AND u.activo = 1
       GROUP BY t.id
       ORDER BY t.total_vistas DESC, total_reacciones DESC
       LIMIT 24`,
      []
    );

    // Usuarios destacados (más tableros públicos)
    const [usuarios] = await db.query(
      `SELECT u.id, u.username, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset, u.bio,
              COUNT(DISTINCT t.id) as total_tableros,
              COUNT(DISTINCT pl.id) as total_likes
       FROM usuarios u
       LEFT JOIN tableros t ON u.id = t.usuario_id AND t.privacidad='publico'
       LEFT JOIN producto_likes pl ON u.id = pl.usuario_id
       WHERE u.activo = 1
       GROUP BY u.id
       ORDER BY total_tableros DESC, total_likes DESC
       LIMIT 12`,
      []
    );

    // Stickers disponibles
    const [stickers] = await db.query(
      'SELECT * FROM stickers WHERE activo=1 AND moderado=1 ORDER BY tipo, nombre'
    );

    // Imágenes recientes de pines públicos
    const [imagenes] = await db.query(
      `SELECT tp.imagen_url, tp.titulo, t.nombre as tablero_nombre, u.username, u.nombre_visible
       FROM tablero_pines tp
       JOIN tableros t ON tp.tablero_id = t.id
       JOIN usuarios u ON t.usuario_id = u.id
       WHERE t.privacidad='publico' AND tp.imagen_url IS NOT NULL AND u.activo=1
       ORDER BY tp.creado_en DESC LIMIT 32`
    );

    res.render('comunidad/index', {
      title: 'Comunidad',
      tableros, usuarios, stickers, imagenes
    });
  } catch(e) {
    console.error(e);
    res.render('comunidad/index', { title: 'Comunidad', tableros:[], usuarios:[], stickers:[], imagenes:[] });
  }
});

// ─── Guardar tablero de otro usuario ─────────────────────────────────────────
router.post('/tablero/:id/guardar', isAuthenticated, async (req, res) => {
  try {
    const [[existente]] = await db.query(
      'SELECT id FROM tablero_guardados WHERE tablero_id=? AND usuario_id=?',
      [req.params.id, req.session.user.id]
    );
    if (existente) {
      await db.query('DELETE FROM tablero_guardados WHERE id=?', [existente.id]);
      return res.json({ guardado: false });
    }
    await db.query('INSERT INTO tablero_guardados (tablero_id, usuario_id) VALUES (?,?)',
      [req.params.id, req.session.user.id]);
    res.json({ guardado: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Reaccionar a tablero ─────────────────────────────────────────────────────
router.post('/tablero/:id/reaccion', isAuthenticated, async (req, res) => {
  const { tipo } = req.body; // 'like','love','fuego','wow'
  const tipos = ['like','love','fuego','wow'];
  if (!tipos.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  try {
    const [[existente]] = await db.query(
      'SELECT * FROM tablero_reacciones WHERE tablero_id=? AND usuario_id=?',
      [req.params.id, req.session.user.id]
    );
    if (existente && existente.tipo === tipo) {
      await db.query('DELETE FROM tablero_reacciones WHERE id=?', [existente.id]);
      return res.json({ reaccion: null });
    }
    await db.query(
      'INSERT INTO tablero_reacciones (tablero_id,usuario_id,tipo) VALUES (?,?,?) ON DUPLICATE KEY UPDATE tipo=VALUES(tipo)',
      [req.params.id, req.session.user.id, tipo]
    );
    res.json({ reaccion: tipo });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Incrementar vista de tablero ────────────────────────────────────────────
router.post('/tablero/:id/vista', async (req, res) => {
  try {
    await db.query('UPDATE tableros SET total_vistas=COALESCE(total_vistas,0)+1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.json({ success: false }); }
});

// ─── Stickers: listar ────────────────────────────────────────────────────────
router.get('/stickers', async (req, res) => {
  try {
    const [stickers] = await db.query(
      'SELECT * FROM stickers WHERE activo=1 AND moderado=1 ORDER BY tipo, categoria, nombre'
    );
    res.json({ stickers });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Stickers: subir (usuarios) ──────────────────────────────────────────────
router.post('/stickers/subir', isAuthenticated, (req, res, next) => {
  // Intentar usar uploadSticker si existe, sino manejar sin archivo
  try {
    const multerMid = require('../config/multer').uploadSticker;
    if (multerMid) return multerMid.single('sticker')(req, res, next);
  } catch(e) {}
  next();
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  const { nombre, categoria } = req.body;
  try {
    await db.query(
      'INSERT INTO stickers (nombre, archivo, tipo, subido_por, moderado, categoria) VALUES (?,?,?,?,?,?)',
      [nombre || 'Mi sticker', req.file.filename, 'usuario', req.session.user.id, 0, categoria || 'general']
    );
    res.json({ success: true, mensaje: 'Sticker enviado para moderación' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Stickers: moderar (admin) ────────────────────────────────────────────────
router.post('/stickers/:id/aprobar', isAdmin, async (req, res) => {
  await db.query('UPDATE stickers SET moderado=1, activo=1 WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
