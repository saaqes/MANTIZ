const express = require('express');
const router = express.Router();
const db = require('../config/database');

// HOME
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      await db.query(
        'INSERT IGNORE INTO sesiones_stats (usuario_id, session_id, pagina_inicio, ip) VALUES (?,?,?,?)',
        [req.session.user.id, req.sessionID, '/', req.ip]
      ).catch(() => {});
    }

    // Homepage layout config
    const [cfgRows] = await db.query('SELECT clave, valor FROM homepage_config');
    const hcfg = {};
    cfgRows.forEach(r => hcfg[r.clave] = r.valor);

    const productosQty  = parseInt(hcfg.productos_cantidad)  || 8;
    const bestsellersQty = parseInt(hcfg.bestsellers_cantidad) || 4;
    const seccionOrden  = (hcfg.seccion_orden || 'hero,productos,bestsellers,carrusel_marca').split(',');

    const [carrusel] = await db.query('SELECT * FROM carrusel WHERE activo=1 ORDER BY orden ASC');
    // Brand carousel (completely separate from hero images)
    let carruselMarca = [];
    try {
      const [marcaRows] = await db.query('SELECT * FROM carrusel_marca WHERE activo=1 ORDER BY orden ASC');
      carruselMarca = marcaRows; // NO fallback - empty means section is hidden
    } catch(e) {
      // carrusel_marca table may not exist yet - ignore silently
      carruselMarca = [];
    }

    const [productos] = await db.query(
      `SELECT p.*, COALESCE(p.precio_descuento, p.precio) as precio_final,
              (SELECT imagen FROM producto_imagenes WHERE producto_id=p.id ORDER BY orden ASC LIMIT 1) as imagen_hover
       FROM productos p WHERE p.en_inicio=1 AND p.activo=1
       ORDER BY p.total_likes DESC LIMIT ?`,
      [productosQty]
    );

    // Smart recommendations
    let recomendados = [], recomendadosLabel = 'LO MAS VENDIDO', hasPersonalized = false;
    if (req.session.user) {
      const [likes] = await db.query(
        `SELECT p.categoria, p.tags, pl.producto_id FROM producto_likes pl
         JOIN productos p ON pl.producto_id=p.id
         WHERE pl.usuario_id=? ORDER BY pl.creado_en DESC LIMIT 10`,
        [req.session.user.id]
      );
      if (likes.length > 0) {
        hasPersonalized = true;
        recomendadosLabel = 'RECOMENDADO PARA TI';
        const likedIds = likes.map(l => l.producto_id);
        const cats = [...new Set(likes.map(l => l.categoria))];
        let sql = `SELECT p.*, COALESCE(p.precio_descuento, p.precio) as precio_final
                   FROM productos p WHERE p.activo=1 AND p.id NOT IN (${likedIds.map(()=>'?').join(',')})
                   AND p.categoria IN (${cats.map(()=>'?').join(',')})
                   ORDER BY p.total_likes DESC LIMIT ?`;
        const [recs] = await db.query(sql, [...likedIds, ...cats, bestsellersQty]);
        recomendados = recs;
      }
    }
    if (recomendados.length === 0) {
      const [top] = await db.query(
        `SELECT p.*, COALESCE(p.precio_descuento, p.precio) as precio_final,
              (SELECT imagen FROM producto_imagenes WHERE producto_id=p.id ORDER BY orden ASC LIMIT 1) as imagen_hover
         FROM productos p WHERE p.activo=1 ORDER BY p.total_likes DESC LIMIT ?`,
        [bestsellersQty]
      );
      recomendados = top;
    }

    // Active 3D model (from admin settings)
    let modeloActivo = null;
    const [[modeloRow]] = await db.query('SELECT * FROM modelos_3d WHERE es_principal=1 AND activo=1 LIMIT 1');
    if (modeloRow) {
      modeloActivo = { archivo: '/models/' + modeloRow.archivo, nombre: modeloRow.nombre, id: modeloRow.id };
      // Load linked product info if any
      if (modeloRow.producto_id) {
        const [[prod]] = await db.query(
          'SELECT * FROM productos WHERE id=? AND activo=1', [modeloRow.producto_id]
        );
        if (prod) modeloActivo.producto = prod;
      }
    } else {
      // Fallback to first available model
      const [[fallback]] = await db.query('SELECT * FROM modelos_3d WHERE activo=1 LIMIT 1');
      if (fallback) modeloActivo = { archivo: '/models/' + fallback.archivo, nombre: fallback.nombre, id: fallback.id };
    }

    // viewer3d product: from model's linked product OR most liked
    let viewer3d = modeloActivo?.producto || null;
    if (!viewer3d) {
      const [[vp]] = await db.query(
        'SELECT p.*, COALESCE(p.precio_descuento, p.precio) as precio_final FROM productos p WHERE p.activo=1 AND p.imagen_principal IS NOT NULL ORDER BY p.total_likes DESC LIMIT 1'
      );
      viewer3d = vp || null;
    }

    res.render('index', {
      title: 'Inicio', productos, carrusel, recomendados,
      recomendadosLabel, hasPersonalized, viewer3d,
      modeloActivo, hcfg, seccionOrden, carruselMarca
    });
  } catch(e) {
    console.error(e);
    res.render('index', {
      title: 'Inicio', productos: [], carrusel: [], recomendados: [],
      recomendadosLabel: 'LO MAS VENDIDO', hasPersonalized: false,
      viewer3d: null, modeloActivo: null,
      hcfg: {}, seccionOrden: ['hero','productos','bestsellers','carrusel_marca'], carruselMarca: []
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

module.exports = router;
