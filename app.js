/**
 * app.js — MANTIZ v4 (con nuevas rutas sociales)
 * Reemplaza el app.js existente con este archivo.
 * Cambios: +notificaciones, +amigos, +comunidad, +opiniones, +chat_social, +gamificacion
 */
require('dotenv').config();
const express    = require('express');
require('express-async-errors');
const compression = require('compression');
const session    = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// ── PERFORMANCE MIDDLEWARE ────────────────────────────────────────────────────
// Gzip/Brotli: reduce HTML/CSS/JSON ~70%. Va ANTES de express.static.
app.use(compression({ level: 6, threshold: 1024 }));

// Eliminar cabecera X-Powered-By (leve mejora de seguridad)
app.disable('x-powered-by');

// Archivos estáticos con cache diferenciado:
// - /public/uploads/ → sin cache (el usuario puede actualizar su foto en cualquier momento)
// - /public/img/, /public/css/, /public/js/ → cache larga (assets versionados)
// - /public/models/ → cache media (los modelos 3D no cambian frecuentemente)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  etag: true, lastModified: true,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, must-revalidate')
}));
app.use('/models', express.static(path.join(__dirname, 'public/models'), {
  maxAge: '7d', etag: true
}));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true, lastModified: true,
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400'); // 7d
    } else if (/\.(woff2?|ttf|otf|eot)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 año
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400'); // 7d
    }
  }
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mantiz-secret-2025-ultra-secure',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(flash());

// ── DEFAULTS + TIMEOUT GLOBAL DE PETICIONES ───────────────────────────────────
// Garantiza que ninguna petición/página se quede "cargando" para siempre.
// Si después de REQUEST_TIMEOUT_MS no se envió respuesta (p.ej. el middleware
// de abajo se queda esperando una conexión de BD que nunca llega, o algún
// handler nunca responde), se corta con un error controlado en vez de dejar
// la conexión abierta indefinidamente.
// Se excluye /chat/stream porque es una conexión SSE diseñada para permanecer abierta.
// También define valores por defecto para los locals que usan header/footer,
// así la página de error puede renderizarse aunque el middleware de
// configuración (siguiente) no haya terminado.
const REQUEST_TIMEOUT_MS = 30000;
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = [];
  res.locals.error = [];
  res.locals.sitio = { nombre_tienda: 'MANTIZ', color_primario: '#e91e8c' };
  res.locals.carritoCount = 0;
  res.locals.perfilConfig = null;
  const earlyProto = req.headers['x-forwarded-proto'] || req.protocol;
  res.locals.baseUrl = `${earlyProto}://${req.get('host')}`;
  res.locals.canonicalUrl = `${res.locals.baseUrl}${req.originalUrl.split('?')[0]}`;

  if (req.path === '/chat/stream') return next();

  const timer = setTimeout(() => {
    if (res.headersSent) return;
    console.error(`⏱️  Timeout (${REQUEST_TIMEOUT_MS}ms) sin respuesta en ${req.method} ${req.originalUrl}`);
    const wantsJson = req.xhr
      || (req.headers.accept || '').includes('application/json')
      || (req.headers['content-type'] || '').includes('application/json');
    if (wantsJson) {
      res.status(503).json({ error: 'La solicitud tardó demasiado en responder. Intenta de nuevo.' });
    } else {
      res.status(503).render('error', {
        title: 'Tiempo de espera agotado',
        message: 'La página tardó demasiado en responder. Por favor, intenta de nuevo.'
      });
    }
  }, REQUEST_TIMEOUT_MS);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');

  // ── SEO: baseUrl/canonicalUrl disponibles en TODAS las vistas ───────────
  // Open Graph y <link rel="canonical"> requieren URLs absolutas, no rutas
  // relativas. Se calculan una sola vez aquí en vez de repetir esta lógica
  // en cada controlador. Cada vista puede sobreescribir `canonicalUrl` si
  // necesita una URL distinta a la ruta actual (poco común).
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  res.locals.baseUrl = `${proto}://${req.get('host')}`;
  res.locals.canonicalUrl = `${res.locals.baseUrl}${req.originalUrl.split('?')[0]}`;

  try {
    const db = require('./config/database');
    const [config] = await db.query('SELECT clave, valor FROM configuracion_sitio');
    const cfg = {};
    config.forEach(c => cfg[c.clave] = c.valor);
    res.locals.sitio = cfg;
    // Redes sociales para el footer (tabla redes_sociales, migración 007)
    try {
      const [redes] = await db.query('SELECT * FROM redes_sociales WHERE visible=1 ORDER BY orden ASC');
      res.locals.redesSociales = redes;
    } catch(e) { res.locals.redesSociales = []; }
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
app.use('/ia', require('./routes/ia')); // Asistente IA: chat con Gemini, productos nuevos y ofertas
app.use('/admin', require('./routes/admin'));
app.use('/admin/proveedores', require('./routes/admin.proveedores'));
app.use('/admin/tiendas', require('./routes/admin.tiendas'));
app.use('/admin/pedidos', require('./routes/admin.pedidos'));
app.use('/admin/modelos', require('./routes/admin.modelos'));
app.use('/admin/homepage', require('./routes/admin.homepage'));
app.use('/admin/notificaciones', require('./routes/notificaciones'));
app.use('/chat',       require('./routes/chat'));        // chat de soporte usuario↔admin (nuevo)
app.use('/admin/chat', require('./routes/admin.chat'));   // panel admin del chat de soporte (nuevo)
app.use('/push', require('./routes/push'));                // notificaciones push reales (PWA, nuevo)

// ── DIRECTORIO DE USUARIOS ────────────────────────────────────────────────────
app.use('/usuarios', require('./routes/usuarios'));

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

    // total amigos (para stat bar)
    let totalAmigos = 0;
    try {
      const [[ta]] = await db.query(
        'SELECT COUNT(*) as total FROM amistades WHERE estado=\'aceptada\' AND (solicitante_id=? OR receptor_id=?)',
        [perfil.id, perfil.id]
      );
      totalAmigos = ta.total || 0;
    } catch(e) {}

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
      pcfg: pcfg||{}, widgets, logros, conexiones, estadoAmistad, totalAmigos
    });
  } catch(e) {
    res.status(500).render('error', { title: 'Error', message: e.message });
  }
});

app.use((req, res) => res.status(404).render('404', { title: 'No encontrado' }));
app.use((err, req, res, next) => {
  // Si ya se envió una respuesta (p.ej. el timeout global ya respondió),
  // no intentar enviar otra: solo cerrar/registrar.
  if (res.headersSent) {
    console.error('Error tras respuesta ya enviada:', err && err.message);
    return next(err);
  }

  const wantsJson = req.xhr
    || (req.headers.accept || '').includes('application/json')
    || (req.headers['content-type'] || '').includes('application/json');

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    if (wantsJson) return res.status(413).json({ error: 'Archivo demasiado grande.' });
    req.flash('error', 'Archivo demasiado grande.');
    return res.redirect('back');
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    if (wantsJson) return res.status(400).json({ error: 'Campo de archivo inesperado: ' + err.field });
    req.flash('error', 'Campo de archivo inesperado: ' + err.field);
    return res.redirect('back');
  }

  console.error(err.stack);
  // Si es un error de la BD (tiene .code, p.ej. ER_NO_SUCH_TABLE), nunca
  // mostrar el mensaje SQL crudo. Si es un error "a mano" (throw new
  // Error('Nombre requerido')) sin .code, se respeta su mensaje.
  const db = require('./config/database');
  const safeMessage = err.code ? db.friendlyDbError(err) : (err.message || 'Error interno del servidor');
  if (wantsJson) {
    return res.status(err.status || 500).json({ error: safeMessage });
  }
  res.status(err.status || 500).render('error', { title: 'Error', message: safeMessage });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MANTIZ v4 en http://localhost:${PORT}`));

// Ejecuta migraciones pendientes (crea notificaciones, amistades, logros, etc.
// si faltan). No bloquea ni detiene el arranque si falla: solo registra el
// error en consola y el servidor sigue funcionando igual que antes.
require('./database_v2/migrate')()
  .then(r => {
    if (r.ok) {
      const pendientes = (r.results || []).filter(x => x.status === 'aplicada');
      if (pendientes.length) console.log(`🗄️  [migrate] ${pendientes.length} migración(es) aplicada(s):`, pendientes.map(x => x.file).join(', '));
    }
  })
  .catch(e => console.error('⚠️  [migrate] No se pudieron ejecutar las migraciones:', e.message));

module.exports = app;
