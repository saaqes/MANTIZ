/**
 * routes/push.js
 * Notificaciones push reales (Web Push API + VAPID).
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const webpush = require('web-push');
const { isAuthenticated } = require('../middleware/auth');

// Claves VAPID — en producción deben venir de variables de entorno.
// Se generan automáticamente al arrancar si no existen en .env, para que
// el sistema funcione "out of the box" sin configuración manual previa.
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BAizdTOm5bqrV0sHvJwUAaB99a3gNANF9NgvA8eHJxY6v7MXzWI2XRtBtuUvUkVM3DTLfa2b2iVe3OVzclNEy0U';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'YxI7i1qMOl6XSoteiN1pjzeDpj8ghxMwWyjeULUGkS8';

webpush.setVapidDetails('mailto:soporte@mantiz.com', VAPID_PUBLIC, VAPID_PRIVATE);

// ── GET /push/vapid-public-key — el frontend la necesita para suscribirse ──
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

// ── POST /push/suscribir — guarda la suscripción del navegador actual ─────
router.post('/suscribir', isAuthenticated, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.json({ success: false, error: 'Suscripción inválida' });
  }
  try {
    await db.query(
      `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth), usuario_id=VALUES(usuario_id)`,
      [req.session.user.id, endpoint, keys.p256dh, keys.auth, (req.headers['user-agent'] || '').substring(0, 250)]
    );
    await db.query('UPDATE usuarios SET notificaciones_push=1 WHERE id=?', [req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('[push/suscribir]', e.message);
    res.json({ success: false, error: e.message });
  }
});

// ── POST /push/desuscribir — elimina la suscripción de este navegador ─────
router.post('/desuscribir', isAuthenticated, async (req, res) => {
  const { endpoint } = req.body;
  try {
    if (endpoint) {
      await db.query('DELETE FROM push_subscriptions WHERE endpoint=? AND usuario_id=?', [endpoint, req.session.user.id]);
    } else {
      // Sin endpoint específico: el usuario apagó la preferencia general
      await db.query('DELETE FROM push_subscriptions WHERE usuario_id=?', [req.session.user.id]);
    }
    await db.query('UPDATE usuarios SET notificaciones_push=0 WHERE id=?', [req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST /push/preferencia — togglear preferencia sin tocar suscripciones ──
router.post('/preferencia', isAuthenticated, async (req, res) => {
  const { activo } = req.body;
  try {
    await db.query('UPDATE usuarios SET notificaciones_push=? WHERE id=?', [activo ? 1 : 0, req.session.user.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST /push/test — envía una notificación de prueba al propio usuario ──
// Útil para que el usuario confirme que las notificaciones realmente llegan.
router.post('/test', isAuthenticated, async (req, res) => {
  try {
    const enviados = await enviarPushAUsuario(req.session.user.id, {
      titulo: 'MANTIZ', mensaje: '¡Las notificaciones están funcionando! 🎉', url: '/perfil#configuracion'
    });
    res.json({ success: true, enviados });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

/**
 * Envía una notificación push real a TODAS las suscripciones activas de un
 * usuario (puede tener varias: celular + computador). Limpia automáticamente
 * las suscripciones caducadas/inválidas (HTTP 410/404 del navegador).
 * Exportada para que otras rutas (chat, pedidos, etc.) puedan notificar.
 */
async function enviarPushAUsuario(usuarioId, payload) {
  const [[u]] = await db.query('SELECT notificaciones_push FROM usuarios WHERE id=?', [usuarioId]);
  if (!u || u.notificaciones_push === 0) return 0;

  const [subs] = await db.query('SELECT * FROM push_subscriptions WHERE usuario_id=?', [usuarioId]);
  let enviados = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      enviados++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        // Suscripción caducada/inválida: limpiar
        await db.query('DELETE FROM push_subscriptions WHERE id=?', [sub.id]).catch(() => {});
      } else {
        console.error('[push] error enviando a', sub.id, e.message);
      }
    }
  }
  return enviados;
}

module.exports = router;
module.exports.enviarPushAUsuario = enviarPushAUsuario;
