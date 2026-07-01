/**
 * routes/notificaciones.js
 * Sistema completo de notificaciones + like a comentarios + amistades
 *
 * Este router se monta en DOS rutas (ver app.js):
 *   app.use('/admin/notificaciones', require('./routes/notificaciones'));
 *   app.use('/notificaciones', require('./routes/notificaciones'));
 *
 * IMPORTANTE: antes existían DOS handlers `GET '/'` distintos (uno para el
 * usuario normal y otro para el panel admin). Como Express ejecuta el
 * PRIMERO que matchee y ese siempre respondía sin llamar a next(), el
 * segundo (el panel admin de notificaciones/encuestas/stickers) era
 * inalcanzable SIEMPRE, sin importar la ruta. Se unificaron en un solo
 * handler que distingue por req.baseUrl.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ─── GET '/' — vista de usuario o panel admin según el mount path ───────────
router.get('/', isAuthenticated, async (req, res) => {
  if (req.baseUrl === '/admin/notificaciones') {
    if (!req.session.user || req.session.user.rol !== 'admin') {
      return res.status(403).render('error', { title: 'Acceso denegado', message: 'No tienes permisos de administrador.' });
    }
    let pendStickers = [], encuestas = [];
    try {
      [pendStickers] = await db.query(
        'SELECT s.*, u.nombre_visible FROM stickers s LEFT JOIN usuarios u ON s.subido_por=u.id WHERE s.moderado=0 ORDER BY s.creado_en DESC'
      );
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[admin/notificaciones] stickers:', e.message);
    }
    try {
      [encuestas] = await db.query(
        `SELECT e.*, u.nombre_visible as creador,
          (SELECT COUNT(*) FROM encuesta_votos WHERE encuesta_id=e.id) as total_votos
         FROM encuestas e JOIN usuarios u ON e.creado_por=u.id ORDER BY e.creado_en DESC LIMIT 20`
      );
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[admin/notificaciones] encuestas:', e.message);
    }
    return res.render('admin/notificaciones', {
      title: 'Admin - Notificaciones',
      pendStickers, encuestas, isAdmin: true
    });
  }

  // Vista normal: notificaciones del usuario logueado
  try {
    const [nots] = await db.query(
      `SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 50`,
      [req.session.user.id]
    );
    res.json({ notificaciones: nots });
  } catch (e) {
    // Si la tabla todavía no existe (antes de migrar), no es un error real
    // para el usuario: simplemente no tiene notificaciones todavía.
    if (e.code === 'ER_NO_SUCH_TABLE') return res.json({ notificaciones: [] });
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ─── GET conteo no leídas (para el badge del navbar) ────────────────────────
router.get('/count', isAuthenticated, async (req, res) => {
  try {
    const [[r]] = await db.query(
      'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id=? AND leida=0',
      [req.session.user.id]
    );
    res.json({ count: r.total });
  } catch (e) { res.json({ count: 0 }); }
});

// ─── MARCAR leída ────────────────────────────────────────────────────────────
router.post('/:id/leer', isAuthenticated, async (req, res) => {
  try {
    await db.query('UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?',
      [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true });
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ─── MARCAR TODAS como leídas ────────────────────────────────────────────────
router.post('/leer-todas', isAuthenticated, async (req, res) => {
  try {
    await db.query('UPDATE notificaciones SET leida=1 WHERE usuario_id=?',
      [req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true });
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ─── ADMIN: enviar notificación masiva ───────────────────────────────────────
router.post('/broadcast', isAdmin, async (req, res) => {
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

    // Disparar también notificaciones push reales (PWA) — no bloquea la
    // respuesta HTTP; cada envío respeta la preferencia individual del
    // usuario (notificaciones_push) y limpia suscripciones caducadas.
    try {
      const { enviarPushAUsuario } = require('./push');
      usuarios.forEach(u => {
        enviarPushAUsuario(u.id, { titulo, mensaje, url: enlace || '/' }).catch(() => {});
      });
    } catch(e) {}

    res.json({ success: true, enviadas: inserts.length });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
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
        await db.query('DELETE FROM comentario_reacciones WHERE id=?', [reaccion.id]);
        await db.query('UPDATE comentarios SET likes=GREATEST(likes-1,0) WHERE id=?', [cid]);
        return res.json({ liked: false, likes: Math.max(0, com.likes - 1) });
      } else {
        await db.query('UPDATE comentario_reacciones SET tipo=? WHERE id=?', ['like', reaccion.id]);
        await db.query('UPDATE comentarios SET likes=likes+1, dislikes=GREATEST(dislikes-1,0) WHERE id=?', [cid]);
        const [[updated]] = await db.query('SELECT likes,dislikes FROM comentarios WHERE id=?', [cid]);
        return res.json({ liked: true, ...updated });
      }
    } else {
      await db.query('INSERT INTO comentario_reacciones (comentario_id,usuario_id,tipo) VALUES (?,?,?)', [cid, uid, 'like']);
      await db.query('UPDATE comentarios SET likes=likes+1 WHERE id=?', [cid]);
      // Notificar al autor del comentario (si no es el mismo) — best-effort:
      // si la tabla notificaciones no existe todavía, no debe romper el like.
      if (com.usuario_id !== uid) {
        try {
          const [[liker]] = await db.query('SELECT nombre_visible FROM usuarios WHERE id=?', [uid]);
          await db.query(
            'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,icono,color) VALUES (?,?,?,?,?,?)',
            [com.usuario_id, 'reaccion', '¡Le dieron like a tu comentario!',
             `${liker.nombre_visible} le dio like a tu comentario`, 'bi-hand-thumbs-up-fill', '#e91e8c']
          );
        } catch (e) {
          if (e.code !== 'ER_NO_SUCH_TABLE') console.error('[notificaciones] insert notif like:', e.message);
        }
      }
      return res.json({ liked: true, likes: com.likes + 1 });
    }
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ─── ADMIN: stickers pendientes API ──────────────────────────────────────────
router.get('/stickers', isAdmin, async (req, res) => {
  try {
    const [stickers] = await db.query(
      'SELECT s.*, u.nombre_visible FROM stickers s LEFT JOIN usuarios u ON s.subido_por=u.id WHERE s.moderado=0'
    );
    res.json({ stickers });
  } catch (e) { res.json({ stickers: [] }); }
});

// ─── ADMIN: aprobar sticker ──────────────────────────────────────────────────
router.post('/stickers/:id/aprobar', isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE stickers SET moderado=1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

// ─── ADMIN: rechazar/eliminar sticker ────────────────────────────────────────
router.post('/stickers/:id/rechazar', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM stickers WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

module.exports = router;
