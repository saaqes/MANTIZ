const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const { uploadProfile, uploadBanner } = require('../config/multer');

const AVATARES = ['avatar1.png','avatar2.png','avatar3.png','avatar4.png','avatar5.png','avatar6.png'];
const BANNERS  = ['banner1.jpg','banner2.jpg','banner3.jpg','banner4.jpg','banner5.jpg','banner6.jpg'];

// GET PERFIL
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [[usuario]]   = await db.query('SELECT * FROM usuarios WHERE id=?', [req.session.user.id]);
    const [direcciones] = await db.query('SELECT * FROM direcciones_entrega WHERE usuario_id=? ORDER BY predeterminada DESC', [req.session.user.id]);
    const [pedidos]     = await db.query('SELECT * FROM pedidos WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 10', [req.session.user.id]);
    const [favoritos]   = await db.query(
      `SELECT p.* FROM producto_likes pl JOIN productos p ON pl.producto_id=p.id
       WHERE pl.usuario_id=? AND p.activo=1 ORDER BY pl.creado_en DESC`,
      [req.session.user.id]
    );
    const [tableros] = await db.query(
      `SELECT t.*, COUNT(tp.id) as total_pines FROM tableros t
       LEFT JOIN tablero_pines tp ON t.id=tp.tablero_id
       WHERE t.usuario_id=? GROUP BY t.id ORDER BY t.creado_en DESC`,
      [req.session.user.id]
    );
    const [widgets] = await db.query('SELECT * FROM perfil_widgets WHERE usuario_id=? ORDER BY orden', [req.session.user.id]);
    const [[perfilConfig]] = await db.query('SELECT * FROM perfil_config WHERE usuario_id=?', [req.session.user.id]);

    res.render('user/perfil', {
      title: 'Mi Perfil', usuario, direcciones, pedidos, favoritos, tableros, widgets,
      perfilConfig: perfilConfig || null,
      avataresPreset: AVATARES, bannersPreset: BANNERS
    });
  } catch(e) {
    console.error(e);
    req.flash('error', 'Error al cargar perfil');
    res.redirect('/');
  }
});

// UPDATE INFO
router.post('/actualizar', isAuthenticated, async (req, res) => {
  const { nombre_visible, bio, telefono } = req.body;
  try {
    await db.query('UPDATE usuarios SET nombre_visible=?, bio=?, telefono=? WHERE id=?',
      [nombre_visible, bio, telefono, req.session.user.id]);
    req.session.user.nombre_visible = nombre_visible;
    req.flash('success', 'Perfil actualizado');
    res.redirect('/perfil#info');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
    res.redirect('/perfil');
  }
});

// CHANGE PASSWORD
router.post('/cambiar-password', isAuthenticated, async (req, res) => {
  const { password_actual, password_nuevo, password_confirm } = req.body;
  if (password_nuevo !== password_confirm) {
    req.flash('error', 'Las contrasenas no coinciden');
    return res.redirect('/perfil#seguridad');
  }
  if ((password_nuevo||'').length < 6) {
    req.flash('error', 'Minimo 6 caracteres');
    return res.redirect('/perfil#seguridad');
  }
  try {
    const [[u]] = await db.query('SELECT password FROM usuarios WHERE id=?', [req.session.user.id]);
    if (!await bcrypt.compare(password_actual, u.password)) {
      req.flash('error', 'Contrasena actual incorrecta');
      return res.redirect('/perfil#seguridad');
    }
    const hash = await bcrypt.hash(password_nuevo, 10);
    await db.query('UPDATE usuarios SET password=? WHERE id=?', [hash, req.session.user.id]);
    req.flash('success', 'Contrasena actualizada');
    res.redirect('/perfil#seguridad');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
    res.redirect('/perfil');
  }
});

// AVATAR PRESET
router.post('/avatar/preset', isAuthenticated, async (req, res) => {
  const { preset } = req.body;
  if (!AVATARES.includes(preset)) return res.status(400).json({ error: 'No valido' });
  await db.query('UPDATE usuarios SET foto_perfil_tipo=?,foto_perfil_preset=? WHERE id=?',
    ['preset', preset, req.session.user.id]);
  req.session.user.foto_perfil_tipo = 'preset';
  req.session.user.foto_perfil_preset = preset;
  res.redirect('/perfil#avatar');
});

// AVATAR UPLOAD
router.post('/avatar/upload', isAuthenticated, uploadProfile.single('foto_perfil'), async (req, res) => {
  if (!req.file) { req.flash('error', 'Selecciona una imagen'); return res.redirect('/perfil#avatar'); }
  await db.query('UPDATE usuarios SET foto_perfil=?,foto_perfil_tipo=? WHERE id=?',
    [req.file.filename, 'upload', req.session.user.id]);
  req.session.user.foto_perfil = req.file.filename;
  req.session.user.foto_perfil_tipo = 'upload';
  req.flash('success', 'Foto actualizada');
  res.redirect('/perfil#avatar');
});

// BANNER PRESET
router.post('/banner/preset', isAuthenticated, async (req, res) => {
  const { preset } = req.body;
  if (!BANNERS.includes(preset)) return res.status(400).json({ error: 'No valido' });
  await db.query('UPDATE usuarios SET banner_tipo=?,banner_preset=? WHERE id=?',
    ['preset', preset, req.session.user.id]);
  req.session.user.banner_tipo = 'preset';
  req.session.user.banner_preset = preset;
  res.redirect('/perfil#avatar');
});

// BANNER UPLOAD
router.post('/banner/upload', isAuthenticated, uploadBanner.single('banner'), async (req, res) => {
  if (!req.file) { req.flash('error', 'Selecciona una imagen'); return res.redirect('/perfil#avatar'); }
  await db.query('UPDATE usuarios SET banner=?,banner_tipo=? WHERE id=?',
    [req.file.filename, 'upload', req.session.user.id]);
  req.session.user.banner_tipo = 'upload';
  req.flash('success', 'Banner actualizado');
  res.redirect('/perfil#avatar');
});

// FAVORITO QUITAR
router.post('/favorito/quitar/:id', isAuthenticated, async (req, res) => {
  try {
    await db.query('DELETE FROM producto_likes WHERE usuario_id=? AND producto_id=?',
      [req.session.user.id, req.params.id]);
    await db.query('UPDATE productos SET total_likes=GREATEST(total_likes-1,0) WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ADD DIRECCION
router.post('/direcciones', isAuthenticated, async (req, res) => {
  const { alias, nombre_destinatario, ciudad, departamento, direccion } = req.body;
  try {
    await db.query(
      'INSERT INTO direcciones_entrega (usuario_id,alias,nombre_destinatario,ciudad,departamento,direccion) VALUES (?,?,?,?,?,?)',
      [req.session.user.id, alias||'Casa', nombre_destinatario, ciudad, departamento, direccion]
    );
    req.flash('success', 'Direccion agregada');
    res.redirect('/perfil#info');
  } catch(e) {
    req.flash('error', 'Error: '+e.message);
    res.redirect('/perfil');
  }
});

// DELETE DIRECCION
router.post('/direccion/eliminar/:id', isAuthenticated, async (req, res) => {
  await db.query('DELETE FROM direcciones_entrega WHERE id=? AND usuario_id=?',
    [req.params.id, req.session.user.id]);
  req.flash('success', 'Direccion eliminada');
  res.redirect('/perfil#info');
});

// PERFIL CONFIG (save via AJAX from perfil_config route - but also accept from perfil route)
router.post('/config', isAuthenticated, async (req, res) => {
  const { color_primario, tema, fondo_tipo, fondo_valor, fondo_blur, pais, idioma, metodo_pago_pref } = req.body;
  try {
    await db.query(
      `INSERT INTO perfil_config (usuario_id,color_primario,tema,fondo_tipo,fondo_valor,fondo_blur,pais,idioma,metodo_pago_pref)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         color_primario=VALUES(color_primario),tema=VALUES(tema),
         fondo_tipo=VALUES(fondo_tipo),fondo_valor=VALUES(fondo_valor),
         fondo_blur=VALUES(fondo_blur),pais=VALUES(pais),
         idioma=VALUES(idioma),metodo_pago_pref=VALUES(metodo_pago_pref)`,
      [req.session.user.id, color_primario||'#e91e8c', tema||'oscuro', fondo_tipo||'color',
       fondo_valor||'#0a0a0a', fondo_blur||0, pais||'Colombia', idioma||'es', metodo_pago_pref||'tarjeta']
    );
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
