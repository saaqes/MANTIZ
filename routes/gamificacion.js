/**
 * routes/gamificacion.js
 * Logros, medallas, tiempo en web, conexiones de perfil
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// ─── GET logros del usuario ───────────────────────────────────────────────────
router.get('/logros', isAuthenticated, async (req, res) => {
  try {
    const [logros] = await db.query(
      `SELECT l.*, ul.progreso, ul.desbloqueado, ul.fecha_desbloqueo
       FROM logros l
       LEFT JOIN usuario_logros ul ON l.id=ul.logro_id AND ul.usuario_id=?
       ORDER BY ul.desbloqueado DESC, l.tipo, l.umbral`,
      [req.session.user.id]
    );
    res.json({ logros });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET logros de un usuario público ────────────────────────────────────────
router.get('/logros/:uid', async (req, res) => {
  try {
    const [logros] = await db.query(
      `SELECT l.*, ul.progreso, ul.desbloqueado, ul.fecha_desbloqueo
       FROM logros l
       LEFT JOIN usuario_logros ul ON l.id=ul.logro_id AND ul.usuario_id=?
       WHERE ul.desbloqueado=1
       ORDER BY ul.fecha_desbloqueo DESC`,
      [req.params.uid]
    );
    res.json({ logros });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST registrar tiempo de sesión ─────────────────────────────────────────
// Llamar periódicamente cada 60s desde el frontend
router.post('/ping-tiempo', isAuthenticated, async (req, res) => {
  const uid = req.session.user.id;
  const segundos = 60; // ping cada 60s = sumar 60
  try {
    await db.query(
      `INSERT INTO perfil_config (usuario_id, tiempo_total_seg) VALUES (?,?)
       ON DUPLICATE KEY UPDATE tiempo_total_seg = COALESCE(tiempo_total_seg,0) + ?`,
      [uid, segundos, segundos]
    );

    // Verificar logro de tiempo
    const [[cfg]] = await db.query('SELECT tiempo_total_seg FROM perfil_config WHERE usuario_id=?', [uid]);
    const { actualizarLogro } = require('./opiniones');

    if (cfg && cfg.tiempo_total_seg >= 3600) {
      await actualizarLogro(uid, 'hora_conectado', db);
    }

    res.json({ success: true, total: cfg?.tiempo_total_seg || 0 });
  } catch(e) { res.json({ success: false }); }
});

// ─── GET tiempo total del usuario ────────────────────────────────────────────
router.get('/tiempo', isAuthenticated, async (req, res) => {
  try {
    const [[cfg]] = await db.query('SELECT tiempo_total_seg FROM perfil_config WHERE usuario_id=?', [req.session.user.id]);
    const seg = cfg?.tiempo_total_seg || 0;
    const horas = Math.floor(seg / 3600);
    const min = Math.floor((seg % 3600) / 60);
    res.json({ segundos: seg, horas, minutos: min, formato: `${horas}h ${min}m` });
  } catch(e) { res.json({ segundos: 0, horas: 0, minutos: 0, formato: '0h 0m' }); }
});

// ─── CONEXIONES DE PERFIL (Steam, PlayStation, etc.) ─────────────────────────

// GET conexiones del usuario
router.get('/conexiones', isAuthenticated, async (req, res) => {
  try {
    const [conexiones] = await db.query(
      'SELECT * FROM perfil_conexiones WHERE usuario_id=? ORDER BY plataforma',
      [req.session.user.id]
    );
    res.json({ conexiones });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET conexiones públicas de un usuario
router.get('/conexiones/:uid', async (req, res) => {
  try {
    const [conexiones] = await db.query(
      'SELECT * FROM perfil_conexiones WHERE usuario_id=? AND publico=1',
      [req.params.uid]
    );
    res.json({ conexiones });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST guardar/actualizar conexión
router.post('/conexiones', isAuthenticated, async (req, res) => {
  const { plataforma, username, publico, url } = req.body;
  const plataformas = ['playstation','xbox','steam','github','tiktok','spotify','twitch','discord'];
  if (!plataformas.includes(plataforma)) return res.status(400).json({ error: 'Plataforma inválida' });
  if (!username || username.trim().length === 0) return res.status(400).json({ error: 'Username requerido' });

  try {
    await db.query(
      `INSERT INTO perfil_conexiones (usuario_id, plataforma, username, publico, url)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE username=VALUES(username), publico=VALUES(publico), url=VALUES(url), actualizado_en=NOW()`,
      [req.session.user.id, plataforma, username.trim(), publico ? 1 : 0, url || null]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE quitar conexión
router.delete('/conexiones/:plataforma', isAuthenticated, async (req, res) => {
  await db.query('DELETE FROM perfil_conexiones WHERE usuario_id=? AND plataforma=?',
    [req.session.user.id, req.params.plataforma]);
  res.json({ success: true });
});

module.exports = router;
