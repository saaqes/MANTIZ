const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { attachProductGalleries } = require('../utils/productGallery');

// ── Carrusel: SELECT resiliente con fallback en cascada ──────────────────────
// Las columnas boton_url/destino_tipo/destino_valor/animacion/posicion_texto
// vienen de la migración 005 (database_v2). Si esa migración aún no corrió en
// un entorno dado, un SELECT que las incluya fallaría con ER_BAD_FIELD_ERROR.
// En vez de dejar que el carrusel completo desaparezca (lo que pasó antes con
// un .catch(()=>[[]]) ciego), se intenta primero con todas las columnas y,
// si falla, se cae a un subconjunto que sí existe siempre.
async function fetchCarruselSafe() {
  try {
    const [rows] = await db.query(`
      SELECT id,imagen,titulo,subtitulo,content_type,mostrar_boton,boton_texto,
             countdown_fecha,boton_url,destino_tipo,destino_valor,animacion,posicion_texto
      FROM carrusel WHERE activo=1 ORDER BY orden ASC
    `);
    return rows;
  } catch (e) {
    try {
      const [rows] = await db.query(`
        SELECT id,imagen,titulo,subtitulo,content_type,mostrar_boton,boton_texto,countdown_fecha
        FROM carrusel WHERE activo=1 ORDER BY orden ASC
      `);
      return rows;
    } catch (e2) {
      try {
        const [rows] = await db.query('SELECT id,imagen,titulo,subtitulo FROM carrusel WHERE activo=1 ORDER BY orden ASC');
        return rows;
      } catch (e3) {
        console.error('[home] fetchCarruselSafe falló en los 3 niveles:', e3.message);
        return [];
      }
    }
  }
}

// HOME — optimizada con Promise.all para queries paralelas
router.get('/', async (req, res) => {
  try {
    // Registrar sesión de forma totalmente paralela (fire-and-forget, no bloquea el render)
    if (req.session.user) {
      db.query(
        'INSERT IGNORE INTO sesiones_stats (usuario_id, session_id, pagina_inicio, ip) VALUES (?,?,?,?)',
        [req.session.user.id, req.sessionID, '/', req.ip]
      ).catch(() => {});
    }

    // ── FASE 1: config + carruseles en paralelo ───────────────────────────
    // Antes: 3 awaits secuenciales (~150-300ms total).
    // Ahora: 1 Promise.all (~50-100ms, el tiempo del más lento).
    const [cfgResult, carrusel, marcaResult] = await Promise.all([
      db.query('SELECT clave, valor FROM homepage_config').catch(() => [[]]),
      fetchCarruselSafe(),
      db.query('SELECT * FROM carrusel_marca WHERE activo=1 ORDER BY orden ASC').catch(() => [[]])
    ]);

    const cfgRows = cfgResult[0] || [];
    const hcfg   = {};
    cfgRows.forEach(r => { hcfg[r.clave] = r.valor; });
    const carruselMarca = marcaResult[0] || [];

    const productosQty   = parseInt(hcfg.productos_cantidad)   || 8;
    const bestsellersQty = parseInt(hcfg.bestsellers_cantidad)  || 4;
    const seccionOrden   = (hcfg.seccion_orden || 'hero,productos,bestsellers,carrusel_marca').split(',');

    // ── FASE 2: productos + modelo 3D + recomendaciones en paralelo ───────
    // Antes: 4-5 awaits secuenciales con condicionales dentro.
    // Ahora: queries independientes en paralelo; solo la de recomendaciones
    // depende del usuario, pero puede ejecutarse junto a las demás.
    const [productosResult, modeloResult, viewerResult, recsResult] = await Promise.all([
      // Productos del home (solo columnas necesarias para la tarjeta)
      db.query(
        `SELECT p.id, p.titulo, p.precio, p.precio_descuento, p.imagen_principal, p.imagen_hover,
                p.categoria, p.total_likes, p.calificacion_promedio,
                COALESCE(p.precio_descuento, p.precio) AS precio_final
         FROM productos p WHERE p.en_inicio=1 AND p.activo=1
         ORDER BY p.total_likes DESC LIMIT ?`,
        [productosQty]
      ).catch(() => [[]]),

      // Modelo 3D principal
      db.query(
        'SELECT id, nombre, archivo, producto_id FROM modelos_3d WHERE es_principal=1 AND activo=1 LIMIT 1'
      ).catch(() => [[]]),

      // Producto destacado para el viewer 3D (más likes, con imagen)
      db.query(
        `SELECT id, titulo, precio, precio_descuento, imagen_principal, categoria,
                COALESCE(precio_descuento, precio) AS precio_final
         FROM productos WHERE activo=1 AND imagen_principal IS NOT NULL
         ORDER BY total_likes DESC LIMIT 1`
      ).catch(() => [[]]),

      // Recomendaciones: personalizada si hay sesión, genérica si no
      req.session.user
        ? db.query(
            `SELECT p.id, p.titulo, p.precio, p.precio_descuento, p.imagen_principal, p.imagen_hover,
                    p.categoria, p.total_likes, COALESCE(p.precio_descuento, p.precio) AS precio_final
             FROM producto_likes pl
             JOIN productos p ON pl.producto_id = p.id
             WHERE pl.usuario_id = ? AND p.activo = 1
             ORDER BY pl.creado_en DESC LIMIT 10`,
            [req.session.user.id]
          ).catch(() => [[]])
        : Promise.resolve([[]])
    ]);

    const productosRaw = productosResult[0] || [];
    const productos = await attachProductGalleries(productosRaw);
    const modeloRows  = modeloResult[0]    || [];
    const viewerRows  = viewerResult[0]    || [];
    const likedRows   = recsResult[0]      || [];

    // Construir modelo activo
    let modeloActivo = null;
    const modeloRow  = modeloRows[0];
    if (modeloRow) {
      modeloActivo = { archivo: '/models/' + modeloRow.archivo, nombre: modeloRow.nombre, id: modeloRow.id };
    } else {
      // Fallback al primer modelo disponible (solo si no hay principal)
      const [[fb]] = await db.query('SELECT id,nombre,archivo FROM modelos_3d WHERE activo=1 LIMIT 1').catch(() => [[]]);
      if (fb) modeloActivo = { archivo: '/models/' + fb.archivo, nombre: fb.nombre, id: fb.id };
    }

    // Viewer 3D: producto vinculado al modelo O el más vendido
    let viewer3d = viewerRows[0] || null;

    // Recomendaciones personalizadas
    let recomendados = [], recomendadosLabel = 'LO MAS VENDIDO', hasPersonalized = false;
    if (likedRows.length > 0) {
      hasPersonalized  = true;
      recomendadosLabel = 'RECOMENDADO PARA TI';
      const likedIds   = likedRows.map(l => l.id);
      const cats       = [...new Set(likedRows.map(l => l.categoria))];
      const ph         = likedIds.map(() => '?').join(',');
      const cph        = cats.map(() => '?').join(',');
      const [recs]     = await db.query(
        `SELECT id, titulo, precio, precio_descuento, imagen_principal, imagen_hover, categoria, total_likes,
                COALESCE(precio_descuento, precio) AS precio_final
         FROM productos WHERE activo=1 AND id NOT IN (${ph}) AND categoria IN (${cph})
         ORDER BY total_likes DESC LIMIT ?`,
        [...likedIds, ...cats, bestsellersQty]
      ).catch(() => [[]]);
      recomendados = recs || [];
    }
    if (recomendados.length === 0) {
      const [top] = await db.query(
        `SELECT id, titulo, precio, precio_descuento, imagen_principal, imagen_hover, categoria, total_likes,
                COALESCE(precio_descuento, precio) AS precio_final
         FROM productos WHERE activo=1 ORDER BY total_likes DESC LIMIT ?`,
        [bestsellersQty]
      ).catch(() => [[]]);
      recomendados = top || [];
    }
    recomendados = await attachProductGalleries(recomendados);

    // SEO: usar la imagen del primer slide del hero como og:image (más
    // relevante para compartir en redes que un genérico estático)
    const homeOgImage = (carrusel[0] && carrusel[0].imagen) ? `/uploads/banners/${carrusel[0].imagen}`
      : (productos[0] && productos[0].imagen_principal) ? `/uploads/products/${productos[0].imagen_principal}`
      : undefined;

    res.render('index', {
      title: 'Inicio', productos, carrusel, recomendados,
      recomendadosLabel, hasPersonalized, viewer3d,
      modeloActivo, hcfg, seccionOrden, carruselMarca,
      hideChatFab: true, ogImage: homeOgImage
    });
  } catch(e) {
    console.error('[home]', e.message);
    res.render('index', {
      title: 'Inicio', productos: [], carrusel: [], recomendados: [],
      recomendadosLabel: 'LO MAS VENDIDO', hasPersonalized: false,
      viewer3d: null, modeloActivo: null,
      hcfg: {}, seccionOrden: ['hero','productos','bestsellers','carrusel_marca'], carruselMarca: [],
      hideChatFab: true
    });
  }
});

// Session ping
router.post('/stats/ping', async (req, res) => {
  if (!req.session.user) return res.json({ ok: true });
  await db.query(
    'UPDATE sesiones_stats SET fin=NOW(), duracion_seg=TIMESTAMPDIFF(SECOND,inicio,NOW()) WHERE session_id=? AND usuario_id=? AND fin IS NULL',
    [req.sessionID, req.session.user.id]
  ).catch(() => {});
  res.json({ ok: true });
});

// Autocomplete (products + users)
router.get('/buscar/sugerencias', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const [prods] = await db.query(
      `SELECT id, titulo as nombre, categoria as sub, 'producto' as tipo, imagen_principal as img
       FROM productos WHERE (titulo LIKE ? OR categoria LIKE ?) AND activo=1 LIMIT 5`,
      [`%${q}%`, `%${q}%`]
    );
    const [users] = await db.query(
      `SELECT id, nombre_visible as nombre, username as sub, 'usuario' as tipo,
              CONCAT(IFNULL(foto_perfil_tipo,'preset'),'|',IFNULL(foto_perfil_preset,'avatar1.png'),'|',IFNULL(foto_perfil,'')) as img
       FROM usuarios WHERE (username LIKE ? OR nombre_visible LIKE ?) AND activo=1 LIMIT 3`,
      [`%${q}%`, `%${q}%`]
    );
    res.json([...prods, ...users]);
  } catch(e) { res.json([]); }
});

// Full search
router.get('/buscar', async (req, res) => {
  const q = req.query.q || '';
  const tipo = req.query.tipo || 'todo';
  const orden = req.query.orden || 'relevancia';
  try {
    let productos = [], usuarios = [];
    if (tipo !== 'usuarios') {
      let sql = `SELECT p.*, COALESCE(p.precio_descuento, p.precio) as precio_final, (SELECT imagen FROM producto_imagenes WHERE producto_id=p.id ORDER BY orden ASC LIMIT 1) as imagen_hover FROM productos p WHERE p.activo=1`;
      const params = [];
      if (q) { sql += ` AND (p.titulo LIKE ? OR p.descripcion LIKE ? OR p.categoria LIKE ? OR p.tags LIKE ?)`; params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
      if (orden === 'precio_asc') sql += ' ORDER BY p.precio ASC';
      else if (orden === 'precio_desc') sql += ' ORDER BY p.precio DESC';
      else if (orden === 'nuevo') sql += ' ORDER BY p.creado_en DESC';
      else sql += ' ORDER BY p.total_likes DESC';
      sql += ' LIMIT 40';
      const [r] = await db.query(sql, params);
      productos = r;
    }
    if (tipo !== 'productos' && q) {
      const [u] = await db.query(
        `SELECT u.id, u.username, u.nombre_visible, u.bio, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset,
                COUNT(DISTINCT pl.id) as total_likes, COUNT(DISTINCT t.id) as total_tableros
         FROM usuarios u LEFT JOIN producto_likes pl ON pl.usuario_id=u.id
         LEFT JOIN tableros t ON t.usuario_id=u.id AND t.privacidad='publico'
         WHERE (u.username LIKE ? OR u.nombre_visible LIKE ?) AND u.activo=1 GROUP BY u.id LIMIT 10`,
        [`%${q}%`, `%${q}%`]
      );
      usuarios = u;
    }
    const [categorias] = await db.query('SELECT DISTINCT categoria FROM productos WHERE activo=1');
    if (req.session.user && q) {
      await db.query('INSERT INTO visitas (usuario_id, pagina, ip) VALUES (?,?,?)',
        [req.session.user.id, `/buscar?q=${q}`, req.ip]).catch(() => {});
    }
    res.render('buscar', { title: `Busqueda: ${q}`, productos, usuarios, q, tipo, orden, categorias });
  } catch(e) {
    console.error(e);
    res.render('buscar', { title: 'Busqueda', productos: [], usuarios: [], q, tipo, orden, categorias: [] });
  }
});

// Centro de ayuda
router.get('/ayuda', (req, res) => {
  res.render('ayuda', { title: 'Centro de Ayuda' });
});

// ── ROBOTS.TXT ────────────────────────────────────────────────────────────
// Permite indexar el catálogo público, bloquea áreas privadas/transaccionales
// (carrito, checkout, auth, admin, perfil propio) que no aportan valor SEO y
// podrían filtrar información de sesión en resultados de búsqueda.
router.get('/robots.txt', (req, res) => {
  const base = res.locals.baseUrl;
  res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /carrito
Disallow: /pedidos/checkout
Disallow: /auth/
Disallow: /perfil
Disallow: /notificaciones
Disallow: /amigos
Disallow: /api/
Disallow: /usuarios/api

Sitemap: ${base}/sitemap.xml`
  );
});

// ── SITEMAP.XML (dinámico) ────────────────────────────────────────────────
// Generado a partir de la base de datos real (productos activos, categorías,
// páginas estáticas públicas) en vez de un archivo fijo que se desactualiza.
router.get('/sitemap.xml', async (req, res) => {
  const base = res.locals.baseUrl;
  const db = require('../config/database');
  const urls = [];

  // Páginas estáticas principales
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/productos', priority: '0.9', changefreq: 'daily' },
    { loc: '/comunidad', priority: '0.7', changefreq: 'daily' },
    { loc: '/opiniones', priority: '0.6', changefreq: 'weekly' },
    { loc: '/usuarios', priority: '0.5', changefreq: 'weekly' },
    { loc: '/tiendas', priority: '0.6', changefreq: 'monthly' },
    { loc: '/ayuda', priority: '0.4', changefreq: 'monthly' },
    { loc: '/auth/login', priority: '0.3', changefreq: 'yearly' },
    { loc: '/auth/registro', priority: '0.3', changefreq: 'yearly' },
  ];
  staticPages.forEach(p => urls.push(Object.assign({}, p, { loc: base + p.loc })));

  try {
    const [productos] = await db.query(
      'SELECT id, creado_en FROM productos WHERE activo=1 ORDER BY creado_en DESC LIMIT 5000'
    );
    productos.forEach(p => urls.push({
      loc: base + '/productos/' + p.id,
      priority: '0.8', changefreq: 'weekly',
      lastmod: p.creado_en ? new Date(p.creado_en).toISOString().split('T')[0] : undefined
    }));
  } catch (e) { console.error('[sitemap] productos:', e.message); }

  try {
    const [categorias] = await db.query(
      'SELECT DISTINCT categoria FROM productos WHERE activo=1 AND categoria IS NOT NULL'
    );
    categorias.forEach(c => urls.push({
      loc: base + '/productos?categoria=' + encodeURIComponent(c.categoria),
      priority: '0.6', changefreq: 'weekly'
    }));
  } catch (e) { console.error('[sitemap] categorias:', e.message); }

  try {
    const [tableros] = await db.query(
      "SELECT id, creado_en FROM tableros WHERE privacidad='publico' ORDER BY creado_en DESC LIMIT 1000"
    );
    tableros.forEach(t => urls.push({
      loc: base + '/comunidad/tablero/' + t.id,
      priority: '0.5', changefreq: 'weekly',
      lastmod: t.creado_en ? new Date(t.creado_en).toISOString().split('T')[0] : undefined
    }));
  } catch (e) { /* tabla puede no existir en instalaciones antiguas */ }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function(u) {
      return '  <url>\n' +
        '    <loc>' + u.loc.replace(/&/g, '&amp;') + '</loc>\n' +
        (u.lastmod ? '    <lastmod>' + u.lastmod + '</lastmod>\n' : '') +
        '    <changefreq>' + u.changefreq + '</changefreq>\n' +
        '    <priority>' + u.priority + '</priority>\n' +
        '  </url>';
    }).join('\n') +
    '\n</urlset>';

  res.type('application/xml').send(xml);
});

module.exports = router;
