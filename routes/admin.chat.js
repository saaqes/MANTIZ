/**
 * routes/admin.chat.js
 * Panel admin del chat de soporte — el admin puede hablar con cualquier usuario.
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

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

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  res.redirect('/auth/login');
}

// Mensajes rápidos predefinidos (requisito: "Mensajes automáticos rápidos")
const MENSAJES_RAPIDOS = [
  '¡Hola! ¿En qué puedo ayudarte hoy?',
  'Gracias por escribirnos, en un momento te atendemos.',
  'Tu pedido está siendo procesado, te avisaremos cuando sea despachado.',
  '¿Podrías indicarnos el número de tu pedido?',
  'Listo, hemos resuelto tu solicitud. ¿Necesitas algo más?',
  'Gracias por tu compra en MANTIZ 💖'
];

// ── GET /admin/chat — lista de conversaciones ─────────────────────────────
router.get('/', isAdmin, async (req, res) => {
  const filtro = req.query.filtro || 'todas';
  try {
    let where = '';
    if (filtro === 'pendiente')  where = "WHERE c.estado = 'pendiente'";
    if (filtro === 'resuelta')   where = "WHERE c.estado = 'resuelta'";
    if (filtro === 'no_leidas')  where = "WHERE c.no_leidos_adm > 0";

    const [convs] = await db.query(
      `SELECT c.*, u.nombre_visible, u.username, u.email, u.foto_perfil_tipo, u.foto_perfil_preset, u.foto_perfil
       FROM conversaciones_soporte c JOIN usuarios u ON c.usuario_id = u.id
       ${where} ORDER BY c.no_leidos_adm DESC, c.actualizado_en DESC`
    );
    const [[stats]] = await db.query(
      `SELECT COUNT(*) as total, SUM(estado='pendiente') as pendientes, SUM(no_leidos_adm>0) as no_leidas
       FROM conversaciones_soporte`
    );

    res.render('admin/chat', {
      title: 'Chat de Soporte — Admin', convs, stats, filtro, isAdmin: true,
      convActiva: null, mensajes: [], mensajesRapidos: MENSAJES_RAPIDOS
    });
  } catch (e) {
    console.error('[admin/chat]', e.message);
    res.render('admin/chat', { title: 'Chat de Soporte', convs: [], stats: {}, filtro, isAdmin: true, convActiva: null, mensajes: [], mensajesRapidos: MENSAJES_RAPIDOS });
  }
});

// ── GET /admin/chat/:id — abrir conversación con un usuario específico ───
router.get('/:id', isAdmin, async (req, res) => {
  const filtro = req.query.filtro || 'todas';
  try {
    const [convs] = await db.query(
      `SELECT c.*, u.nombre_visible, u.username, u.email, u.foto_perfil_tipo, u.foto_perfil_preset, u.foto_perfil
       FROM conversaciones_soporte c JOIN usuarios u ON c.usuario_id = u.id
       ORDER BY c.no_leidos_adm DESC, c.actualizado_en DESC`
    );
    const [[convActiva]] = await db.query(
      `SELECT c.*, u.nombre_visible, u.username, u.email, u.foto_perfil_tipo, u.foto_perfil_preset, u.foto_perfil, u.creado_en as usuario_desde
       FROM conversaciones_soporte c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id=?`,
      [req.params.id]
    );
    if (!convActiva) return res.redirect('/admin/chat');

    const [mensajes] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id
       WHERE m.conversacion_id=? ORDER BY m.creado_en ASC LIMIT 500`,
      [req.params.id]
    );

    await db.query(
      `UPDATE mensajes_soporte SET estado='leido', leido_en=NOW()
       WHERE conversacion_id=? AND remitente_id!=? AND estado!='leido'`,
      [req.params.id, req.session.user.id]
    );
    await db.query('UPDATE conversaciones_soporte SET no_leidos_adm=0, admin_id=? WHERE id=?', [req.session.user.id, req.params.id]);

    const [[stats]] = await db.query(
      `SELECT COUNT(*) as total, SUM(estado='pendiente') as pendientes, SUM(no_leidos_adm>0) as no_leidas FROM conversaciones_soporte`
    );

    res.render('admin/chat', {
      title: 'Chat de Soporte — Admin', convs, stats, filtro, isAdmin: true,
      convActiva, mensajes, mensajesRapidos: MENSAJES_RAPIDOS
    });
  } catch (e) {
    console.error('[admin/chat/:id]', e.message);
    res.redirect('/admin/chat');
  }
});

// ── POST /admin/chat/:id/enviar ────────────────────────────────────────────
router.post('/:id/enviar', isAdmin, upload.single('archivo'), async (req, res) => {
  const adminId = req.session.user.id;
  const convId  = req.params.id;
  const { contenido } = req.body;
  try {
    let tipo = 'texto', archivoUrl = null, archivoNombre = null;
    if (req.file) {
      tipo = req.file.mimetype.startsWith('image/') ? 'imagen' : 'archivo';
      archivoUrl = '/uploads/chat/' + req.file.filename;
      archivoNombre = req.file.originalname;
    }
    if (!contenido && !req.file) return res.json({ success: false, error: 'Vacío' });

    const [result] = await db.query(
      `INSERT INTO mensajes_soporte (conversacion_id, remitente_id, tipo, contenido, archivo_url, archivo_nombre, estado)
       VALUES (?,?,?,?,?,?,'enviado')`,
      [convId, adminId, tipo, contenido || '', archivoUrl, archivoNombre]
    );
    await db.query(
      `UPDATE conversaciones_soporte SET ultimo_msg=?, ultimo_msg_en=NOW(), no_leidos_usr=no_leidos_usr+1, admin_id=?, actualizado_en=NOW() WHERE id=?`,
      [contenido || '[Archivo]', adminId, convId]
    );
    const [[msg]] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id WHERE m.id=?`,
      [result.insertId]
    );

    // Notificación push real al usuario (no bloquea la respuesta HTTP)
    try {
      const [[conv]] = await db.query('SELECT usuario_id FROM conversaciones_soporte WHERE id=?', [convId]);
      if (conv) {
        const { enviarPushAUsuario } = require('./push');
        enviarPushAUsuario(conv.usuario_id, {
          titulo: 'Soporte MANTIZ',
          mensaje: contenido ? contenido.substring(0, 100) : 'Te enviaron un archivo',
          url: '/chat'
        }).catch(() => {});
      }
    } catch (e) {}

    res.json({ success: true, msg });
  } catch (e) {
    console.error('[admin/chat/enviar]', e.message);
    res.json({ success: false, error: e.message });
  }
});

// ── POST /admin/chat/:id/estado ───────────────────────────────────────────
router.post('/:id/estado', isAdmin, async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente', 'activa', 'resuelta'].includes(estado)) return res.json({ success: false });
  try {
    await db.query('UPDATE conversaciones_soporte SET estado=? WHERE id=?', [estado, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── GET /admin/chat/:id/mensajes — polling ────────────────────────────────
router.get('/:id/mensajes', isAdmin, async (req, res) => {
  const desde = req.query.desde || '2000-01-01';
  try {
    const [mensajes] = await db.query(
      `SELECT m.*, u.nombre_visible, u.foto_perfil_tipo, u.foto_perfil_preset, u.rol
       FROM mensajes_soporte m JOIN usuarios u ON m.remitente_id = u.id
       WHERE m.conversacion_id=? AND m.creado_en > ? ORDER BY m.creado_en ASC`,
      [req.params.id, desde]
    );
    await db.query(
      `UPDATE mensajes_soporte SET estado='leido', leido_en=NOW()
       WHERE conversacion_id=? AND remitente_id!=? AND estado!='leido'`,
      [req.params.id, req.session.user.id]
    );
    await db.query('UPDATE conversaciones_soporte SET no_leidos_adm=0 WHERE id=?', [req.params.id]);
    res.json({ success: true, mensajes });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// ── GET /admin/chat/api/no-leidos — badge del sidebar ─────────────────────
router.get('/api/no-leidos', isAdmin, async (req, res) => {
  try {
    const [[r]] = await db.query('SELECT COALESCE(SUM(no_leidos_adm),0) as total FROM conversaciones_soporte');
    res.json({ total: r.total || 0 });
  } catch (e) { res.json({ total: 0 }); }
});

module.exports = router;
