/**
 * routes/notificaciones.js
 * Sistema completo de notificaciones + like a comentarios + amistades
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ─── GET mis notificaciones ──────────────────────────────────────────────────
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [nots] = await db.query(
      `SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 50`,
      [req.session.user.id]
    );
    res.json({ notificaciones: nots });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET conteo no leídas (para el badge del navbar) ────────────────────────
router.get('/count', isAuthenticated, async (req, res) => {
  try {
    const [[r]] = await db.query(
      'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id=? AND leida=0',
      [req.session.user.id]
    );
    res.json({ count: r.total });
  } catch(e) { res.json({ count: 0 }); }
});

// ─── MARCAR leída ────────────────────────────────────────────────────────────
router.post('/:id/leer', isAuthenticated, async (req, res) => {
  await db.query('UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?',
    [req.params.id, req.session.user.id]);
  res.json({ success: true });
});

// ─── MARCAR TODAS como leídas ────────────────────────────────────────────────
router.post('/leer-todas', isAuthenticated, async (req, res) => {
  await db.query('UPDATE notificaciones SET leida=1 WHERE usuario_id=?',
    [req.session.user.id]);
  res.json({ success: true });
});

// ─── ADMIN: enviar notificación masiva ───────────────────────────────────────
router.post('/admin/broadcast', isAdmin, async (req, res) => {
  const { titulo, mensaje, tipo, enlace, icono, color } = req.body;
  try {
    const [usuarios] = await db.query('SELECT id FROM usuarios WHERE activo=1');
    const inserts = usuarios.map(u => [u.id, tipo||'noticia', titulo, mensaje, enlace||null, icono||'bi-megaphone', color||'#e91e8c']);
    if (inserts.length > 0) {
      await db.query(
        'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,enlace,icono,color) VALUES ?',
        [inserts]
      );
    }
    res.json({ success: true, enviadas: inserts.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── LIKE A COMENTARIO (fix 404) ─────────────────────────────────────────────
router.post('/comentario/:id/like', isAuthenticated, async (req, res) => {
  const cid = req.params.id;
  const uid = req.session.user.id;
  try {
    const [[com]] = await db.query('SELECT * FROM comentarios WHERE id=? AND activo=1', [cid]);
    if (!com) return res.status(404).json({ error: 'Comentario no encontrado' });

    const [[reaccion]] = await db.query(
      'SELECT * FROM comentario_reacciones WHERE comentario_id=? AND usuario_id=?', [cid, uid]
    );

    if (reaccion) {
      if (reaccion.tipo === 'like') {
        // quitar like
        await db.query('DELETE FROM comentario_reacciones WHERE id=?', [reaccion.id]);
        await db.query('UPDATE comentarios SET likes=GREATEST(likes-1,0) WHERE id=?', [cid]);
        return res.json({ liked: false, likes: Math.max(0, com.likes - 1) });
      } else {
        // cambiar dislike→like
        await db.query('UPDATE comentario_reacciones SET tipo=? WHERE id=?', ['like', reaccion.id]);
        await db.query('UPDATE comentarios SET likes=likes+1, dislikes=GREATEST(dislikes-1,0) WHERE id=?', [cid]);
        const [[updated]] = await db.query('SELECT likes,dislikes FROM comentarios WHERE id=?', [cid]);
        return res.json({ liked: true, ...updated });
      }
    } else {
      await db.query('INSERT INTO comentario_reacciones (comentario_id,usuario_id,tipo) VALUES (?,?,?)', [cid, uid, 'like']);
      await db.query('UPDATE comentarios SET likes=likes+1 WHERE id=?', [cid]);
      // Notificar al autor del comentario (si no es el mismo)
      if (com.usuario_id !== uid) {
        const [[liker]] = await db.query('SELECT nombre_visible FROM usuarios WHERE id=?', [uid]);
        await db.query(
          'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,icono,color) VALUES (?,?,?,?,?,?)',
          [com.usuario_id, 'reaccion', '¡Le dieron like a tu comentario!',
           `${liker.nombre_visible} le dio like a tu comentario`, 'bi-hand-thumbs-up-fill', '#e91e8c']
        );
      }
      return res.json({ liked: true, likes: com.likes + 1 });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ─── ADMIN: página de gestión de notificaciones ──────────────────────────────
router.get('/admin', isAdmin, async (req, res) => {
  try {
    const [pendStickers] = await db.query(
      'SELECT s.*, u.nombre_visible FROM stickers s LEFT JOIN usuarios u ON s.subido_por=u.id WHERE s.moderado=0 ORDER BY s.creado_en DESC'
    );
    const [encuestas] = await db.query(
      `SELECT e.*, u.nombre_visible as creador,
        (SELECT COUNT(*) FROM encuesta_votos WHERE encuesta_id=e.id) as total_votos
       FROM encuestas e JOIN usuarios u ON e.creado_por=u.id ORDER BY e.creado_en DESC LIMIT 20`
    );
    res.render('admin/notificaciones', {
      title: 'Admin - Notificaciones',
      pendStickers, encuestas, isAdmin: true
    });
  } catch(e) {
    res.status(500).render('error', { title: 'Error', message: e.message });
  }
});

// ─── ADMIN: stickers pendientes API ──────────────────────────────────────────
router.get('/admin/stickers', isAdmin, async (req, res) => {
  try {
    const [stickers] = await db.query(
      'SELECT s.*, u.nombre_visible FROM stickers s LEFT JOIN usuarios u ON s.subido_por=u.id WHERE s.moderado=0'
    );
    res.json({ stickers });
  } catch(e) { res.json({ stickers: [] }); }
});

// ─── ADMIN: rechazar/eliminar sticker ────────────────────────────────────────
router.post('/admin/stickers/:id/rechazar', isAdmin, async (req, res) => {
  await db.query('DELETE FROM stickers WHERE id=?', [req.params.id]);
  res.json({ success: true });
});
