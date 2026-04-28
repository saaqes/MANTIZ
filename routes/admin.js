const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { uploadProduct, uploadCarousel, uploadLogo } = require('../config/multer');

// DASHBOARD
router.get('/', isAdmin, async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE rol='cliente') as clientes,
        (SELECT COUNT(*) FROM usuarios WHERE rol='cliente' AND DATE(creado_en) >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as clientes_nuevos,
        (SELECT COUNT(*) FROM productos WHERE activo=1) as productos,
        (SELECT COUNT(*) FROM pedidos) as pedidos,
        (SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado_pago='pagado') as ingresos,
        (SELECT COUNT(*) FROM pedidos WHERE estado IN ('pendiente','confirmado')) as pedidos_activos,
        (SELECT COUNT(*) FROM comentarios WHERE activo=1) as comentarios,
        (SELECT COUNT(*) FROM visitas WHERE DATE(creado_en) = CURDATE()) as visitas_hoy,
        (SELECT COUNT(*) FROM visitas WHERE DATE(creado_en) >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as visitas_semana,
        (SELECT COUNT(*) FROM producto_likes) as total_likes,
        (SELECT COALESCE(AVG(duracion_seg),0) FROM sesiones_stats WHERE duracion_seg > 0) as tiempo_medio_seg
    `);

    const [pedidosRecientes] = await db.query(
      `SELECT p.*, u.nombre_visible, u.email FROM pedidos p
       JOIN usuarios u ON p.usuario_id = u.id
       ORDER BY p.creado_en DESC LIMIT 10`
    );

    const [topProductos] = await db.query(
      `SELECT p.*, COUNT(pl.id) as total_likes_count
       FROM productos p LEFT JOIN producto_likes pl ON p.id=pl.producto_id
       WHERE p.activo=1 GROUP BY p.id ORDER BY total_visitas DESC LIMIT 5`
    );

    const [topLikes] = await db.query(
      `SELECT p.id, p.titulo, p.imagen_principal, COUNT(pl.id) as likes_count
       FROM producto_likes pl JOIN productos p ON pl.producto_id=p.id
       GROUP BY p.id ORDER BY likes_count DESC LIMIT 5`
    );

    // Visitas por dia (ultimos 7 dias)
    const [visitasDia] = await db.query(
      `SELECT DATE(creado_en) as dia, COUNT(*) as total
       FROM visitas WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY dia ORDER BY dia ASC`
    );

    // Nuevos usuarios por dia
    const [usuariosDia] = await db.query(
      `SELECT DATE(creado_en) as dia, COUNT(*) as total
       FROM usuarios WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY dia ORDER BY dia ASC`
    );

    res.render('admin/dashboard', { isAdmin: true,
      title: 'Dashboard', stats, pedidosRecientes, topProductos, topLikes, visitasDia, usuariosDia
    });
  } catch(e) {
    console.error(e);
    res.render('admin/dashboard', { title: 'Dashboard', stats: {}, pedidosRecientes: [], topProductos: [], topLikes: [], visitasDia: [], usuariosDia: [], isAdmin: true });
  }
});

// ESTADISTICAS
router.get('/estadisticas', isAdmin, async (req, res) => {
  try {
    const [[statsGen]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE rol='cliente') as clientes,
        (SELECT COUNT(*) FROM productos WHERE activo=1) as productos,
        (SELECT COUNT(*) FROM pedidos) as pedidos,
        (SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado_pago='pagado') as ingresos,
        (SELECT COUNT(*) FROM pedidos WHERE estado IN ('pendiente','confirmado')) as pedidos_activos,
        (SELECT COUNT(*) FROM visitas) as total_visitas,
        (SELECT COUNT(*) FROM producto_likes) as total_likes
    `);

    const [topProductos] = await db.query(
      `SELECT p.id, p.titulo, p.imagen_principal, p.categoria, p.precio, p.precio_descuento, p.activo,
              COALESCE(p.total_visitas,0) as total_visitas,
              COUNT(pl.id) as likes_count
       FROM productos p LEFT JOIN producto_likes pl ON p.id=pl.producto_id
       WHERE p.activo=1 GROUP BY p.id ORDER BY p.total_visitas DESC LIMIT 10`
    );

    const [ingresosDiarios] = await db.query(
      `SELECT DATE(creado_en) as fecha, SUM(total) as total
       FROM pedidos WHERE estado_pago='pagado' AND creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(creado_en) ORDER BY fecha ASC`
    );

    const [pedidosPorEstado] = await db.query(
      `SELECT estado, COUNT(*) as cantidad FROM pedidos GROUP BY estado ORDER BY cantidad DESC`
    );

    const [usuariosRecientes] = await db.query(
      `SELECT DATE(creado_en) as fecha, COUNT(*) as cantidad
       FROM usuarios WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(creado_en) ORDER BY fecha ASC`
    );

    const [topCategorias] = await db.query(
      `SELECT p.categoria, COUNT(v.id) as visitas
       FROM visitas v JOIN productos p ON v.producto_id = p.id
       WHERE p.categoria IS NOT NULL GROUP BY p.categoria ORDER BY visitas DESC LIMIT 8`
    );

    const [topLikesDetalle] = await db.query(
      `SELECT p.id, p.titulo, p.imagen_principal, p.categoria, COUNT(pl.id) as likes_count
       FROM producto_likes pl JOIN productos p ON pl.producto_id=p.id
       GROUP BY p.id ORDER BY likes_count DESC LIMIT 10`
    );

    const [[conversionStats]] = await db.query(
      `SELECT
        (SELECT COUNT(DISTINCT usuario_id) FROM carrito) as usuarios_con_carrito,
        (SELECT COUNT(DISTINCT usuario_id) FROM pedidos) as usuarios_con_pedido,
        (SELECT COUNT(*) FROM pedidos WHERE estado_pago='pagado') as pedidos_pagados,
        (SELECT COUNT(*) FROM pedidos) as pedidos_total`
    );

    res.render('admin/estadisticas', {
      title: 'Estadísticas', isAdmin: true, stats: statsGen,
      topProductos, ingresosDiarios, pedidosPorEstado,
      usuariosRecientes, topCategorias, topLikesDetalle, conversionStats
    });
  } catch(e) {
    console.error('estadisticas error:', e);
    res.render('admin/estadisticas', {
      title: 'Estadísticas', isAdmin: true, stats: {},
      topProductos: [], ingresosDiarios: [], pedidosPorEstado: [],
      usuariosRecientes: [], topCategorias: [], topLikesDetalle: [], conversionStats: {}
    });
  }
});

// API: likes por producto
router.get('/estadisticas/likes/:id', isAdmin, async (req, res) => {
  const [likers] = await db.query(
    `SELECT u.username, u.nombre_visible, pl.creado_en
     FROM producto_likes pl JOIN usuarios u ON pl.usuario_id=u.id
     WHERE pl.producto_id=? ORDER BY pl.creado_en DESC`,
    [req.params.id]
  );
  res.json({ likers });
});

// PRODUCTOS
router.get('/productos', isAdmin, async (req, res) => {
  const [productos] = await db.query(
    `SELECT p.*, COUNT(pl.id) as total_likes_count FROM productos p
     LEFT JOIN producto_likes pl ON p.id=pl.producto_id
     GROUP BY p.id ORDER BY p.creado_en DESC`
  );
  res.render('admin/productos/lista', { title: 'Admin - Productos', productos, isAdmin: true });
});

router.get('/productos/nuevo', isAdmin, (req, res) => {
  res.render('admin/productos/form', { title: 'Nuevo Producto', producto: null, tallas: [], isAdmin: true });
});

router.post('/productos/nuevo', isAdmin, uploadProduct.fields([
  { name: 'imagen_principal', maxCount: 1 },
  { name: 'imagenes_extra', maxCount: 8 }
]), async (req, res) => {
  const { titulo, descripcion, precio, precio_descuento, categoria, tags, en_inicio, activo, tallas, stocks } = req.body;
  try {
    const imgPrincipal = req.files?.imagen_principal?.[0]?.filename || null;
    const [result] = await db.query(
      `INSERT INTO productos (titulo, descripcion, precio, precio_descuento, imagen_principal, categoria, tags, en_inicio, activo)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [titulo, descripcion, precio, precio_descuento || null, imgPrincipal, categoria, tags || '', en_inicio ? 1 : 0, activo ? 1 : 0]
    );
    const prodId = result.insertId;
    if (tallas && Array.isArray(tallas)) {
      for (let i = 0; i < tallas.length; i++) {
        if (tallas[i]) await db.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES (?,?,?)', [prodId, tallas[i], stocks?.[i] || 0]);
      }
    }
    if (req.files?.imagenes_extra) {
      for (let i = 0; i < req.files.imagenes_extra.length; i++) {
        await db.query('INSERT INTO producto_imagenes (producto_id, imagen, orden) VALUES (?,?,?)', [prodId, req.files.imagenes_extra[i].filename, i + 1]);
      }
    }
    req.flash('success', 'Producto creado');
    res.redirect('/admin/productos');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
    res.redirect('/admin/productos/nuevo');
  }
});

router.get('/productos/:id/editar', isAdmin, async (req, res) => {
  const [[producto]] = await db.query('SELECT * FROM productos WHERE id=?', [req.params.id]);
  const [tallas] = await db.query('SELECT * FROM producto_tallas WHERE producto_id=?', [req.params.id]);
  if (!producto) return res.redirect('/admin/productos');
  res.render('admin/productos/form', { title: 'Editar Producto', producto, tallas, isAdmin: true });
});

router.post('/productos/:id/editar', isAdmin, uploadProduct.fields([
  { name: 'imagen_principal', maxCount: 1 },
  { name: 'imagenes_extra', maxCount: 8 }
]), async (req, res) => {
  const { titulo, descripcion, precio, precio_descuento, categoria, tags, en_inicio, activo } = req.body;
  try {
    const updates = { titulo, descripcion, precio, precio_descuento: precio_descuento || null, categoria, tags: tags || '', en_inicio: en_inicio ? 1 : 0, activo: activo ? 1 : 0 };
    if (req.files?.imagen_principal?.[0]) updates.imagen_principal = req.files.imagen_principal[0].filename;
    const setClause = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.query(`UPDATE productos SET ${setClause} WHERE id=?`, [...Object.values(updates), req.params.id]);
    req.flash('success', 'Producto actualizado');
    res.redirect('/admin/productos');
  } catch(e) {
    req.flash('error', 'Error: ' + e.message);
    res.redirect(`/admin/productos/${req.params.id}/editar`);
  }
});

router.post('/productos/:id/eliminar', isAdmin, async (req, res) => {
  await db.query('UPDATE productos SET activo=0 WHERE id=?', [req.params.id]);
  req.flash('success', 'Producto desactivado');
  res.redirect('/admin/productos');
});

// CARRUSEL
router.get('/carrusel', isAdmin, async (req, res) => {
  const [carrusel] = await db.query('SELECT * FROM carrusel ORDER BY orden ASC');
  let carruselMarca = [];
  try { [carruselMarca] = await db.query('SELECT * FROM carrusel_marca ORDER BY orden ASC'); } catch(e) {}
  res.render('admin/carrusel', { title: 'Admin - Carrusel', carrusel, slides: carrusel, carruselMarca, isAdmin: true });
});

router.post('/carrusel/nuevo', isAdmin, (req, res, next) => {
  uploadCarousel.single('imagen')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'Imagen demasiado grande. Maximo 20MB.');
      } else {
        req.flash('error', 'Error al subir imagen: ' + err.message);
      }
      return res.redirect('/admin/carrusel');
    }
    next();
  });
}, async (req, res) => {
  const { titulo, subtitulo, activo } = req.body;
  if (!req.file) { req.flash('error', 'Imagen requerida'); return res.redirect('/admin/carrusel'); }
  try {
    const [[maxOrden]] = await db.query('SELECT COALESCE(MAX(orden),0) as m FROM carrusel');
    const { content_type, mostrar_boton, boton_texto, countdown_fecha, url_destino } = req.body;
    // Build safe INSERT based on available columns
    try {
      await db.query(
        'INSERT INTO carrusel (imagen, titulo, subtitulo, orden, activo, content_type, mostrar_boton, boton_texto, countdown_fecha) VALUES (?,?,?,?,?,?,?,?,?)',
        [req.file.filename, titulo||'', subtitulo||'', maxOrden.m + 1, activo ? 1 : 0,
         content_type||'texto', mostrar_boton!=='0'?1:0, boton_texto||'EXPLORAR',
         countdown_fecha||null]
      );
    } catch(e2) {
      // Fallback without new columns if they don't exist yet
      await db.query(
        'INSERT INTO carrusel (imagen, titulo, subtitulo, orden, activo) VALUES (?,?,?,?,?)',
        [req.file.filename, titulo||'', subtitulo||'', maxOrden.m + 1, activo ? 1 : 0]
      );
    }
    req.flash('success', 'Banner agregado');
  } catch(e) {
    req.flash('error', 'Error al guardar: ' + e.message);
  }
  res.redirect('/admin/carrusel');
});

router.post('/carrusel/:id/eliminar', isAdmin, async (req, res) => {
  await db.query('DELETE FROM carrusel WHERE id=?', [req.params.id]);
  req.flash('success', 'Banner eliminado');
  res.redirect('/admin/carrusel');
});

// USUARIOS
router.get('/usuarios', isAdmin, async (req, res) => {
  const [usuarios] = await db.query(
    `SELECT u.*, COUNT(pl.id) as total_likes, COUNT(DISTINCT p.id) as total_pedidos
     FROM usuarios u
     LEFT JOIN producto_likes pl ON u.id=pl.usuario_id
     LEFT JOIN pedidos p ON u.id=p.usuario_id
     GROUP BY u.id ORDER BY u.creado_en DESC`
  );
  res.render('admin/usuarios', { title: 'Admin - Usuarios', usuarios, isAdmin: true });
});

router.post('/usuarios/:id/toggle', isAdmin, async (req, res) => {
  const [[u]] = await db.query('SELECT activo FROM usuarios WHERE id=?', [req.params.id]);
  await db.query('UPDATE usuarios SET activo=? WHERE id=?', [u.activo ? 0 : 1, req.params.id]);
  res.json({ success: true, activo: !u.activo });
});

router.post('/usuarios/:id/rol', isAdmin, async (req, res) => {
  const { rol } = req.body;
  await db.query('UPDATE usuarios SET rol=? WHERE id=?', [rol, req.params.id]);
  req.flash('success', 'Rol actualizado');
  res.redirect('/admin/usuarios');
});

// COMENTARIOS
router.get('/comentarios', isAdmin, async (req, res) => {
  const [comentarios] = await db.query(
    `SELECT c.*, u.nombre_visible, u.username, p.titulo as producto_titulo
     FROM comentarios c
     JOIN usuarios u ON c.usuario_id=u.id
     JOIN productos p ON c.producto_id=p.id
     ORDER BY c.creado_en DESC LIMIT 100`
  );
  res.render('admin/comentarios', { title: 'Admin - Comentarios', comentarios, isAdmin: true });
});

router.post('/comentarios/:id/toggle', isAdmin, async (req, res) => {
  const [[c]] = await db.query('SELECT activo FROM comentarios WHERE id=?', [req.params.id]);
  await db.query('UPDATE comentarios SET activo=? WHERE id=?', [c.activo ? 0 : 1, req.params.id]);
  res.json({ success: true });
});

// CONFIGURACION
router.get('/configuracion', isAdmin, async (req, res) => {
  const [config] = await db.query('SELECT * FROM configuracion_sitio ORDER BY clave ASC');
  res.render('admin/configuracion', { title: 'Admin - Configuracion', config, isAdmin: true });
});

router.post('/configuracion', isAdmin, uploadLogo.single('logo_file'), async (req, res) => {
  const updates = req.body;
  for (const [clave, valor] of Object.entries(updates)) {
    await db.query('UPDATE configuracion_sitio SET valor=? WHERE clave=?', [valor, clave]).catch(() => {});
  }
  if (req.file) {
    await db.query('UPDATE configuracion_sitio SET valor=? WHERE clave="logo"', [req.file.filename]).catch(() => {});
  }
  req.flash('success', 'Configuracion guardada');
  res.redirect('/admin/configuracion');
});

module.exports = router;

// CARRUSEL toggle activo
router.post('/carrusel/:id/toggle', isAdmin, async (req, res) => {
  const [[s]] = await db.query('SELECT activo FROM carrusel WHERE id=?', [req.params.id]);
  if (s) await db.query('UPDATE carrusel SET activo=? WHERE id=?', [s.activo ? 0 : 1, req.params.id]);
  res.json({ success: true });
});

// CARRUSEL editar
router.post('/carrusel/:id/editar', isAdmin, (req, res, next) => {
  uploadCarousel.single('imagen')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'Imagen demasiado grande. Maximo 20MB.');
      } else {
        req.flash('error', 'Error al subir imagen: ' + err.message);
      }
      return res.redirect('/admin/carrusel');
    }
    next();
  });
}, async (req, res) => {
  const { titulo, subtitulo, orden, activo, content_type, mostrar_boton, boton_texto, countdown_fecha } = req.body;
  try {
    const updates = {
      titulo: titulo||'', subtitulo: subtitulo||'',
      orden: parseInt(orden)||1, activo: activo ? 1 : 0
    };
    if (req.file) updates.imagen = req.file.filename;

    // Try with new columns, fallback without
    try {
      updates.content_type = content_type || 'texto';
      updates.mostrar_boton = mostrar_boton !== '0' ? 1 : 0;
      updates.boton_texto = boton_texto || 'EXPLORAR';
      updates.countdown_fecha = countdown_fecha || null;
    } catch(e) {}

    const setCols = Object.keys(updates).map(k => k+'=?').join(',');
    await db.query('UPDATE carrusel SET '+setCols+' WHERE id=?', [...Object.values(updates), req.params.id]);
    req.flash('success', 'Slide actualizado');
  } catch(e) {
    req.flash('error', 'Error: '+e.message);
  }
  res.redirect('/admin/carrusel');
});
