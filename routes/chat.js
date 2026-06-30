/**
 * routes/chat.js
 * Chat de soporte: usuario ↔ administrador (WhatsApp-like)
 * Separado de chat_social.js (que es chat usuario↔usuario, no se toca).
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { isAuthenticated } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads/chat');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── GET /chat — vista principal ───────────────────────────────────────────
router.get('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  try {
    let [[conv]] = await db.query(
      `SELECT c.*, u.nombre_visible as admin_nombre FROM conversaciones_soporte c
       LEFT JOIN usuarios u ON c.admin_id = u.id WHERE c.usuario_id = ? ORDER BY c.creado_en DESC LIMIT 1`,
      [userId]
    );

    if (!conv) {
      const [result] = await db.query(
        'INSERT INTO conversaciones_soporte (usuario_id, estado) VALUES (?, "pendiente")', [userId]
      );
      [[conv]] = await db.query('SELECT * FROM conversaciones_soporte WHERE id=?', [result.insertId]);
    }

    await db.query(
      `UPDATE mensajes_soporte SET estado='leido', leido_en=NOW()
       WHERE conversacion_id=? AND remitente_id!=? AND estado!='leido'`,
      [conv.id, userId]
    );
    await db.query('UPDATE conversaciones_soporte SET no_leidos_usr=0 WHERE id=?', [conv.id]);

    const [mensajes] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id
       WHERE m.conversacion_id = ? ORDER BY m.creado_en ASC LIMIT 300`,
      [conv.id]
    );

    res.render('chat/index', { title: 'Chat con soporte', conv, mensajes, userId, hideChatFab: true });
  } catch (e) {
    console.error('[chat]', e.message);
    res.render('chat/index', { title: 'Chat con soporte', conv: null, mensajes: [], userId, hideChatFab: true });
  }
});

// ── POST /chat/enviar ──────────────────────────────────────────────────────
router.post('/enviar', isAuthenticated, upload.single('archivo'), async (req, res) => {
  const userId = req.session.user.id;
  const { contenido, conversacion_id } = req.body;
  try {
    const [[conv]] = await db.query(
      'SELECT id FROM conversaciones_soporte WHERE id=? AND usuario_id=?', [conversacion_id, userId]
    );
    if (!conv) return res.json({ success: false, error: 'Conversación no encontrada' });

    let tipo = 'texto', archivoUrl = null, archivoNombre = null;
    if (req.file) {
      tipo = req.file.mimetype.startsWith('image/') ? 'imagen' : 'archivo';
      archivoUrl = '/uploads/chat/' + req.file.filename;
      archivoNombre = req.file.originalname;
    }
    if (!contenido && !req.file) return res.json({ success: false, error: 'Mensaje vacío' });

    const [result] = await db.query(
      `INSERT INTO mensajes_soporte (conversacion_id, remitente_id, tipo, contenido, archivo_url, archivo_nombre, estado)
       VALUES (?,?,?,?,?,?,'enviado')`,
      [conversacion_id, userId, tipo, contenido || '', archivoUrl, archivoNombre]
    );

    await db.query(
      `UPDATE conversaciones_soporte SET ultimo_msg=?, ultimo_msg_en=NOW(), no_leidos_adm=no_leidos_adm+1,
       estado=IF(estado='resuelta','pendiente',estado), actualizado_en=NOW() WHERE id=?`,
      [contenido || '[Archivo]', conversacion_id]
    );

    const [[msg]] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id WHERE m.id=?`,
      [result.insertId]
    );
    res.json({ success: true, msg });
  } catch (e) {
    console.error('[chat/enviar]', e.message);
    res.json({ success: false, error: e.message });
  }
});

// ── GET /chat/mensajes/:convId — polling cada 3s ──────────────────────────
router.get('/mensajes/:convId', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { convId } = req.params;
  const desde = req.query.desde || '2000-01-01';
  try {
    const [[conv]] = await db.query(
      'SELECT id FROM conversaciones_soporte WHERE id=? AND usuario_id=?', [convId, userId]
    );
    if (!conv) return res.json({ success: false });

    const [mensajes] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id
       WHERE m.conversacion_id=? AND m.creado_en > ? ORDER BY m.creado_en ASC`,
      [convId, desde]
    );
    await db.query(
      `UPDATE mensajes_soporte SET estado='leido', leido_en=NOW()
       WHERE conversacion_id=? AND remitente_id!=? AND estado!='leido'`,
      [convId, userId]
    );
    await db.query('UPDATE conversaciones_soporte SET no_leidos_usr=0 WHERE id=?', [convId]);
    res.json({ success: true, mensajes });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── GET /chat/api/no-leidos — para el badge del FAB ───────────────────────
router.get('/api/no-leidos', isAuthenticated, async (req, res) => {
  try {
    const [[r]] = await db.query(
      'SELECT COALESCE(SUM(no_leidos_usr),0) as total FROM conversaciones_soporte WHERE usuario_id=?',
      [req.session.user.id]
    );
    res.json({ total: r.total || 0 });
  } catch (e) { res.json({ total: 0 }); }
});

module.exports = router;
