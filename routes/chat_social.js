/**
 * routes/chat_social.js
 * Chat entre usuarios (polling + SSE para tiempo real)
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Clientes SSE conectados: Map<userId, res[]>
const sseClients = new Map();

// ─── SSE: escuchar nuevos mensajes en tiempo real ─────────────────────────────
router.get('/stream', isAuthenticated, (req, res) => {
  const uid = req.session.user.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('data: {"tipo":"conectado"}\n\n');

  if (!sseClients.has(uid)) sseClients.set(uid, []);
  sseClients.get(uid).push(res);

  req.on('close', () => {
    const arr = sseClients.get(uid) || [];
    const idx = arr.indexOf(res);
    if (idx > -1) arr.splice(idx, 1);
  });
});

// Función helper: notificar por SSE
function notificarUsuario(uid, datos) {
  const clientes = sseClients.get(uid) || [];
  clientes.forEach(c => {
    try { c.write(`data: ${JSON.stringify(datos)}\n\n`); } catch(e) {}
  });
}
module.exports.notificarUsuario = notificarUsuario;

// ─── GET lista de conversaciones ─────────────────────────────────────────────
router.get('/conversaciones', isAuthenticated, async (req, res) => {
  const uid = req.session.user.id;
  try {
    const [convs] = await db.query(
      `SELECT 
         CASE WHEN m.emisor_id=? THEN m.receptor_id ELSE m.emisor_id END as otro_id,
         u.username, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset,
         (SELECT contenido FROM mensajes_chat WHERE 
            (emisor_id=? AND receptor_id=otro_id) OR (emisor_id=otro_id AND receptor_id=?)
            ORDER BY creado_en DESC LIMIT 1) as ultimo_mensaje,
         (SELECT creado_en FROM mensajes_chat WHERE 
            (emisor_id=? AND receptor_id=otro_id) OR (emisor_id=otro_id AND receptor_id=?)
            ORDER BY creado_en DESC LIMIT 1) as ultimo_en,
         (SELECT COUNT(*) FROM mensajes_chat WHERE emisor_id=otro_id AND receptor_id=? AND leido=0) as no_leidos
       FROM mensajes_chat m
       JOIN usuarios u ON u.id = CASE WHEN m.emisor_id=? THEN m.receptor_id ELSE m.emisor_id END
       WHERE (m.emisor_id=? OR m.receptor_id=?) AND u.activo=1
       GROUP BY otro_id
       ORDER BY ultimo_en DESC`,
      [uid, uid, uid, uid, uid, uid, uid, uid, uid]
    );
    res.json({ conversaciones: convs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET mensajes con un usuario ─────────────────────────────────────────────
router.get('/:uid', isAuthenticated, async (req, res) => {
  const uid = req.session.user.id;
  const otroId = req.params.uid;
  try {
    const [mensajes] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset
       FROM mensajes_chat m JOIN usuarios u ON m.emisor_id = u.id
       WHERE (m.emisor_id=? AND m.receptor_id=?) OR (m.emisor_id=? AND m.receptor_id=?)
       ORDER BY m.creado_en ASC LIMIT 100`,
      [uid, otroId, otroId, uid]
    );
    // Marcar como leídos
    await db.query('UPDATE mensajes_chat SET leido=1 WHERE emisor_id=? AND receptor_id=? AND leido=0',
      [otroId, uid]);
    res.json({ mensajes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST enviar mensaje ─────────────────────────────────────────────────────
router.post('/:uid', isAuthenticated, async (req, res) => {
  const emisorId = req.session.user.id;
  const receptorId = req.params.uid;
  const { contenido, tipo } = req.body;

  if (!contenido || contenido.trim().length === 0) {
    return res.status(400).json({ error: 'Mensaje vacío' });
  }
  if (contenido.length > 2000) return res.status(400).json({ error: 'Mensaje muy largo' });

  try {
    const [[receptor]] = await db.query('SELECT id,nombre_visible FROM usuarios WHERE id=? AND activo=1', [receptorId]);
    if (!receptor) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [r] = await db.query(
      'INSERT INTO mensajes_chat (emisor_id, receptor_id, contenido, tipo) VALUES (?,?,?,?)',
      [emisorId, receptorId, contenido.trim(), tipo || 'texto']
    );

    const [[msg]] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset
       FROM mensajes_chat m JOIN usuarios u ON m.emisor_id=u.id WHERE m.id=?`,
      [r.insertId]
    );

    // Notificar en tiempo real via SSE
    notificarUsuario(parseInt(receptorId), { tipo: 'mensaje', mensaje: msg });

    res.json({ success: true, mensaje: msg });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST compartir producto por chat ─────────────────────────────────────────
router.post('/:uid/producto/:pid', isAuthenticated, async (req, res) => {
  const emisorId = req.session.user.id;
  const receptorId = req.params.uid;
  const productoId = req.params.pid;
  try {
    const [[prod]] = await db.query('SELECT id,titulo FROM productos WHERE id=? AND activo=1', [productoId]);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    const contenido = `🛍️ Te comparto: ${prod.titulo} — ${process.env.BASE_URL || ''}/productos/${prod.id}`;
    await db.query('INSERT INTO mensajes_chat (emisor_id,receptor_id,contenido,tipo,producto_id) VALUES (?,?,?,?,?)',
      [emisorId, receptorId, contenido, 'producto', productoId]);
    notificarUsuario(parseInt(receptorId), { tipo: 'mensaje_producto', producto_id: productoId });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
