/**
 * routes/amigos.js
 * Sistema de amigos: solicitudes, aceptar/rechazar, lista
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// ─── Enviar solicitud de amistad ─────────────────────────────────────────────
router.post('/solicitud/:uid', isAuthenticated, async (req, res) => {
  const receptorId = req.params.uid;
  const solicitanteId = req.session.user.id;
  if (solicitanteId == receptorId) return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });

  try {
    const [[existente]] = await db.query(
      'SELECT * FROM amistades WHERE (solicitante_id=? AND receptor_id=?) OR (solicitante_id=? AND receptor_id=?)',
      [solicitanteId, receptorId, receptorId, solicitanteId]
    );
    if (existente) {
      if (existente.estado === 'aceptada') return res.json({ estado: 'ya_amigos' });
      if (existente.estado === 'pendiente') return res.json({ estado: 'pendiente' });
    }

    await db.query(
      'INSERT INTO amistades (solicitante_id, receptor_id, estado) VALUES (?,?,?) ON DUPLICATE KEY UPDATE estado="pendiente", actualizado_en=NOW()',
      [solicitanteId, receptorId, 'pendiente']
    );

    // Notificar al receptor
    const [[solicitante]] = await db.query('SELECT nombre_visible FROM usuarios WHERE id=?', [solicitanteId]);
    await db.query(
      'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,enlace,icono,color) VALUES (?,?,?,?,?,?,?)',
      [receptorId, 'amistad', '¡Nueva solicitud de amistad!',
       `${solicitante.nombre_visible} quiere ser tu amigo en MANTIZ`,
       `/u/${req.session.user.username || req.session.user.id}`,
       'bi-person-plus-fill', '#e91e8c']
    );

    res.json({ success: true, estado: 'pendiente' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Aceptar/Rechazar solicitud ───────────────────────────────────────────────
router.post('/responder/:uid', isAuthenticated, async (req, res) => {
  const { accion } = req.body; // 'aceptar' | 'rechazar'
  const solicitanteId = req.params.uid;
  const receptorId = req.session.user.id;

  try {
    const [[amistad]] = await db.query(
      'SELECT * FROM amistades WHERE solicitante_id=? AND receptor_id=? AND estado="pendiente"',
      [solicitanteId, receptorId]
    );
    if (!amistad) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'rechazada';
    await db.query('UPDATE amistades SET estado=?, actualizado_en=NOW() WHERE id=?', [nuevoEstado, amistad.id]);

    if (accion === 'aceptar') {
      const [[receptor]] = await db.query('SELECT nombre_visible FROM usuarios WHERE id=?', [receptorId]);
      await db.query(
        'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,icono,color) VALUES (?,?,?,?,?,?)',
        [solicitanteId, 'amistad', '¡Solicitud aceptada!',
         `${receptor.nombre_visible} aceptó tu solicitud de amistad`, 'bi-person-check-fill', '#00c853']
      );
    }

    res.json({ success: true, estado: nuevoEstado });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Lista de amigos del usuario actual ──────────────────────────────────────
router.get('/lista', isAuthenticated, async (req, res) => {
  try {
    const [amigos] = await db.query(
      `SELECT u.id, u.username, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset, a.creado_en
       FROM amistades a
       JOIN usuarios u ON (CASE WHEN a.solicitante_id=? THEN a.receptor_id ELSE a.solicitante_id END) = u.id
       WHERE (a.solicitante_id=? OR a.receptor_id=?) AND a.estado='aceptada' AND u.activo=1`,
      [req.session.user.id, req.session.user.id, req.session.user.id]
    );
    res.json({ amigos });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Solicitudes pendientes RECIBIDAS ────────────────────────────────────────
router.get('/pendientes', isAuthenticated, async (req, res) => {
  try {
    const [pendientes] = await db.query(
      `SELECT u.id, u.username, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset, a.id as amistad_id, a.creado_en
       FROM amistades a JOIN usuarios u ON a.solicitante_id=u.id
       WHERE a.receptor_id=? AND a.estado='pendiente' AND u.activo=1
       ORDER BY a.creado_en DESC`,
      [req.session.user.id]
    );
    res.json({ pendientes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Estado de amistad con un usuario ────────────────────────────────────────
router.get('/estado/:uid', isAuthenticated, async (req, res) => {
  try {
    const [[rel]] = await db.query(
      `SELECT *, 
        CASE WHEN solicitante_id=? THEN 'enviada' ELSE 'recibida' END as direccion
       FROM amistades 
       WHERE (solicitante_id=? AND receptor_id=?) OR (solicitante_id=? AND receptor_id=?)`,
      [req.session.user.id, req.session.user.id, req.params.uid, req.params.uid, req.session.user.id]
    );
    res.json({ relacion: rel || null });
  } catch(e) { res.json({ relacion: null }); }
});

module.exports = router;
