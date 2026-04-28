/**
 * app.js — MANTIZ v4 (con nuevas rutas sociales)
 * Reemplaza el app.js existente con este archivo.
 * Cambios: +notificaciones, +amigos, +comunidad, +opiniones, +chat_social, +gamificacion
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mantiz-secret-2025-ultra-secure',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(flash());

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  try {
    const db = require('./config/database');
    const [config] = await db.query('SELECT clave, valor FROM configuracion_sitio');
    const cfg = {};
    config.forEach(c => cfg[c.clave] = c.valor);
    res.locals.sitio = cfg;
    if (req.session.user) {
      const [[cart]] = await db.query('SELECT SUM(cantidad) as total FROM carrito WHERE usuario_id=?', [req.session.user.id]);
      res.locals.carritoCount = cart.total || 0;
      const [[pcfg]] = await db.query('SELECT * FROM perfil_config WHERE usuario_id=?', [req.session.user.id]);
      res.locals.perfilConfig = pcfg || null;
    } else {
      res.locals.carritoCount = 0;
      res.locals.perfilConfig = null;
    }
  } catch(e) {
    res.locals.sitio = { nombre_tienda: 'MANTIZ', color_primario: '#e91e8c' };
    res.locals.carritoCount = 0;
    res.locals.perfilConfig = null;
  }
  next();
});

// ── RUTAS EXISTENTES ─────────────────────────────────────────────────────────
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/productos', require('./routes/productos'));
app.use('/carrito', require('./routes/carrito'));
app.use('/pedidos', require('./routes/pedidos'));
app.use('/perfil', require('./routes/perfil'));
app.use('/perfil/config', require('./routes/perfil_config'));
app.use('/tableros', require('./routes/tableros'));
app.use('/tiendas', require('./routes/tiendas'));
app.use('/ia', require('./routes/ia'));
app.use('/admin', require('./routes/admin'));
app.use('/admin/proveedores', require('./routes/admin.proveedores'));
app.use('/admin/tiendas', require('./routes/admin.tiendas'));
app.use('/admin/pedidos', require('./routes/admin.pedidos'));
app.use('/admin/modelos', require('./routes/admin.modelos'));
app.use('/admin/homepage', require('./routes/admin.homepage'));
app.use('/admin/notificaciones', require('./routes/notificaciones'));

// ── NUEVAS RUTAS v4 ───────────────────────────────────────────────────────────
app.use('/notificaciones', require('./routes/notificaciones'));
app.use('/amigos', require('./routes/amigos'));
app.use('/comunidad', require('./routes/comunidad'));
app.use('/opiniones', require('./routes/opiniones'));
app.use('/chat', require('./routes/chat_social'));
app.use('/gamificacion', require('./routes/gamificacion'));

// ── PERFIL PÚBLICO ────────────────────────────────────────────────────────────
app.get('/u/:username', async (req, res) => {
  try {
    const db = require('./config/database');
    const [[perfil]] = await db.query('SELECT * FROM usuarios WHERE username=? AND activo=1', [req.params.username]);
    if (!perfil) return res.status(404).render('404', { title: 'Usuario no encontrado' });

    const [tableros] = await db.query(
      'SELECT t.*, COUNT(tp.id) as total_pines FROM tableros t LEFT JOIN tablero_pines tp ON t.id=tp.tablero_id WHERE t.usuario_id=? AND t.privacidad="publico" GROUP BY t.id ORDER BY t.creado_en DESC',
      [perfil.id]
    );
    const [favoritos] = await db.query(
      'SELECT p.* FROM producto_likes pl JOIN productos p ON pl.producto_id=p.id WHERE pl.usuario_id=? AND p.activo=1 ORDER BY pl.creado_en DESC LIMIT 12',
      [perfil.id]
    );
    const [[pcfg]] = await db.query('SELECT * FROM perfil_config WHERE usuario_id=?', [perfil.id]);
    const [widgets] = await db.query('SELECT * FROM perfil_widgets WHERE usuario_id=? ORDER BY orden', [perfil.id]);

    // NUEVOS: logros y conexiones públicas
    let logros = [], conexiones = [];
    try {
      const [ls] = await db.query(
        'SELECT l.*, ul.fecha_desbloqueo FROM logros l JOIN usuario_logros ul ON l.id=ul.logro_id WHERE ul.usuario_id=? AND ul.desbloqueado=1 ORDER BY ul.fecha_desbloqueo DESC',
        [perfil.id]
      );
      logros = ls;
    } catch(e) {}
    try {
      const [cs] = await db.query('SELECT * FROM perfil_conexiones WHERE usuario_id=? AND publico=1', [perfil.id]);
      conexiones = cs;
    } catch(e) {}

    // Estado de amistad con el visitante
    let estadoAmistad = null;
    if (req.session.user && req.session.user.id !== perfil.id) {
      try {
        const [[rel]] = await db.query(
          'SELECT * FROM amistades WHERE (solicitante_id=? AND receptor_id=?) OR (solicitante_id=? AND receptor_id=?)',
          [req.session.user.id, perfil.id, perfil.id, req.session.user.id]
        );
        estadoAmistad = rel || null;
      } catch(e) {}
    }

    res.render('user/perfil_publico', {
      title: perfil.nombre_visible, perfil, tableros, favoritos,
      pcfg: pcfg||{}, widgets, logros, conexiones, estadoAmistad
    });
  } catch(e) {
    res.status(500).render('error', { title: 'Error', message: e.message });
  }
});

app.use((req, res) => res.status(404).render('404', { title: 'No encontrado' }));
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(413).json({ error: 'Archivo demasiado grande.' });
    }
    req.flash('error', 'Archivo demasiado grande.');
    return res.redirect('back');
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    req.flash('error', 'Campo de archivo inesperado: ' + err.field);
    return res.redirect('back');
  }
  console.error(err.stack);
  res.status(500).render('error', { title: 'Error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MANTIZ v4 en http://localhost:${PORT}`));
module.exports = app;
