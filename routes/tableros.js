const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// LIST tableros del usuario
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [tableros] = await db.query(
      `SELECT t.*, COUNT(tp.id) as total_pines FROM tableros t
       LEFT JOIN tablero_pines tp ON t.id = tp.tablero_id
       WHERE t.usuario_id = ?
       GROUP BY t.id ORDER BY t.creado_en DESC`,
      [req.session.user.id]
    );
    res.json({ tableros });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// GET tablero público de usuario
router.get('/usuario/:uid', async (req, res) => {
  try {
    const [tableros] = await db.query(
      `SELECT t.*, COUNT(tp.id) as total_pines FROM tableros t
       LEFT JOIN tablero_pines tp ON t.id = tp.tablero_id
       WHERE t.usuario_id = ? AND (t.privacidad='publico' OR t.usuario_id=?)
       GROUP BY t.id ORDER BY t.creado_en DESC`,
      [req.params.uid, req.session.user?.id || 0]
    );
    res.json({ tableros });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// GET pines de un tablero
router.get('/:id/pines', isAuthenticated, async (req, res) => {
  try {
    const [[tablero]] = await db.query('SELECT * FROM tableros WHERE id=?', [req.params.id]);
    if (!tablero) return res.status(404).json({ error: 'No encontrado' });
    if (tablero.privacidad === 'privado' && tablero.usuario_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Privado' });
    }
    const [pines] = await db.query(
      `SELECT tp.*, p.titulo as prod_titulo, p.imagen_principal, p.precio, p.precio_descuento
       FROM tablero_pines tp
       LEFT JOIN productos p ON tp.producto_id = p.id
       WHERE tp.tablero_id = ?
       ORDER BY tp.creado_en DESC`,
      [req.params.id]
    );
    res.json({ tablero, pines });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// CREATE tablero
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { nombre, descripcion, privacidad, color_portada, categoria } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    // Guardamos categoria en descripcion con prefijo si viene por separado
    const descFinal = categoria
      ? `[cat:${categoria}] ${descripcion || ''}`.trim()
      : (descripcion || '');
    const [r] = await db.query(
      'INSERT INTO tableros (usuario_id, nombre, descripcion, privacidad, color_portada) VALUES (?,?,?,?,?)',
      [req.session.user.id, nombre, descFinal, privacidad || 'privado', color_portada || '#e91e8c']
    );
    // ── Auto-publicar: si es público notificar a amigos ──
    if (privacidad === 'publico') {
      try {
        const [amigos] = await db.query(
          `SELECT CASE WHEN a.solicitante_id=? THEN a.receptor_id ELSE a.solicitante_id END AS amigo_id
           FROM amistades a WHERE a.estado='aceptada' AND (a.solicitante_id=? OR a.receptor_id=?)`,
          [req.session.user.id, req.session.user.id, req.session.user.id]
        );
        if (amigos.length > 0) {
          const vals = amigos.map(a => [
            a.amigo_id, 'noticia',
            `¡${req.session.user.nombre_visible || req.session.user.username} publicó un tablero!`,
            `Nuevo tablero público: "${nombre}"`,
            `/comunidad/tablero/${r.insertId}`,
            'bi-grid-3x3-gap-fill', '#e91e8c'
          ]);
          await db.query(
            'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,enlace,icono,color) VALUES ?',
            [vals]
          ).catch(() => {}); // no bloquear si falla (tabla podría no existir)
        }
      } catch(e) { /* notificaciones best-effort */ }
    }
    res.json({ success: true, id: r.insertId, esPublico: privacidad === 'publico' });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// UPDATE tablero
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { nombre, descripcion, privacidad, color_portada, categoria } = req.body;
    const [[t]] = await db.query('SELECT * FROM tableros WHERE id=? AND usuario_id=?', [req.params.id, req.session.user.id]);
    if (!t) return res.status(404).json({ error: 'No encontrado' });
    const descFinal = categoria
      ? `[cat:${categoria}] ${descripcion !== undefined ? descripcion : (t.descripcion||'')}`.trim()
      : (descripcion !== undefined ? descripcion : t.descripcion || '');
    const nuevoPriv = privacidad || t.privacidad;
    await db.query(
      'UPDATE tableros SET nombre=?, descripcion=?, privacidad=?, color_portada=? WHERE id=?',
      [nombre||t.nombre, descFinal, nuevoPriv, color_portada||t.color_portada, req.params.id]
    );
    // Auto-publicar: si recién se hizo público (antes era privado/grupal)
    const recienPublico = nuevoPriv === 'publico' && t.privacidad !== 'publico';
    if (recienPublico) {
      const [amigos] = await db.query(
        `SELECT CASE WHEN a.solicitante_id=? THEN a.receptor_id ELSE a.solicitante_id END AS amigo_id
         FROM amistades a WHERE a.estado='aceptada' AND (a.solicitante_id=? OR a.receptor_id=?)`,
        [req.session.user.id, req.session.user.id, req.session.user.id]
      ).catch(() => [[]]);
      if (amigos.length > 0) {
        const vals = amigos.map(a => [
          a.amigo_id, 'noticia',
          `¡${req.session.user.nombre_visible || req.session.user.username} publicó un tablero!`,
          `Tablero público: "${nombre||t.nombre}"`,
          `/comunidad/tablero/${req.params.id}`,
          'bi-grid-3x3-gap-fill', '#e91e8c'
        ]);
        await db.query(
          'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,enlace,icono,color) VALUES ?',
          [vals]
        ).catch(() => {});
      }
    }
    res.json({ success: true, recienPublico });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// DELETE tablero
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await db.query('DELETE FROM tableros WHERE id=? AND usuario_id=?', [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ADD pin
router.post('/:id/pines', isAuthenticated, async (req, res) => {
  try {
    const { producto_id, imagen_url, titulo, descripcion, url_externa, tipo } = req.body;
    const [[t]] = await db.query('SELECT * FROM tableros WHERE id=? AND usuario_id=?', [req.params.id, req.session.user.id]);
    if (!t) return res.status(404).json({ error: 'No encontrado' });
    const [r] = await db.query(
      'INSERT INTO tablero_pines (tablero_id, producto_id, imagen_url, titulo, descripcion, url_externa, tipo) VALUES (?,?,?,?,?,?,?)',
      [req.params.id, producto_id||null, imagen_url||null, titulo||null, descripcion||null, url_externa||null, tipo||'producto']
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// REMOVE pin
router.delete('/:tableroId/pines/:pinId', isAuthenticated, async (req, res) => {
  try {
    const [[t]] = await db.query('SELECT * FROM tableros WHERE id=? AND usuario_id=?', [req.params.tableroId, req.session.user.id]);
    if (!t) return res.status(403).json({ error: 'Sin permisos' });
    await db.query('DELETE FROM tablero_pines WHERE id=? AND tablero_id=?', [req.params.pinId, req.params.tableroId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ADD miembro (para tablero grupal)
router.post('/:id/miembros', isAuthenticated, async (req, res) => {
  try {
    const { username } = req.body;
    const [[t]] = await db.query('SELECT * FROM tableros WHERE id=? AND usuario_id=?', [req.params.id, req.session.user.id]);
    if (!t) return res.status(404).json({ error: 'No encontrado' });
    const [[u]] = await db.query('SELECT id FROM usuarios WHERE username=?', [username]);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    await db.query(
      'INSERT IGNORE INTO tablero_miembros (tablero_id, usuario_id) VALUES (?,?)',
      [req.params.id, u.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

module.exports = router;
