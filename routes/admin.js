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
  { name: 'imagen_hover', maxCount: 1 },
  { name: 'imagenes_extra', maxCount: 8 }
]), async (req, res) => {
  const { titulo, descripcion, precio, precio_descuento, categoria, tags, en_inicio, activo, tallas, stocks } = req.body;
  try {
    const imgPrincipal = req.files?.imagen_principal?.[0]?.filename || null;
    const imgHover = req.files?.imagen_hover?.[0]?.filename || null;
    const [result] = await db.query(
      `INSERT INTO productos (titulo, descripcion, precio, precio_descuento, imagen_principal, imagen_hover, categoria, tags, en_inicio, activo)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [titulo, descripcion, precio, precio_descuento || null, imgPrincipal, imgHover, categoria, tags || '', en_inicio ? 1 : 0, activo ? 1 : 0]
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
  { name: 'imagen_hover', maxCount: 1 },
  { name: 'imagenes_extra', maxCount: 8 }
]), async (req, res) => {
  const { titulo, descripcion, precio, precio_descuento, categoria, tags, en_inicio, activo } = req.body;
  try {
    const updates = { titulo, descripcion, precio, precio_descuento: precio_descuento || null, categoria, tags: tags || '', en_inicio: en_inicio ? 1 : 0, activo: activo ? 1 : 0 };
    if (req.files?.imagen_principal?.[0]) updates.imagen_principal = req.files.imagen_principal[0].filename;
    if (req.files?.imagen_hover?.[0]) updates.imagen_hover = req.files.imagen_hover[0].filename;
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
  // Listas para el selector de destino del botón CTA (Producto / Categoría)
  let productosLista = [], categoriasLista = [];
  try {
    [productosLista] = await db.query('SELECT id, titulo FROM productos WHERE activo=1 ORDER BY titulo ASC LIMIT 200');
  } catch(e) {}
  try {
    [categoriasLista] = await db.query('SELECT DISTINCT categoria FROM productos WHERE activo=1 AND categoria IS NOT NULL ORDER BY categoria ASC');
  } catch(e) {}
  res.render('admin/carrusel', {
    title: 'Admin - Carrusel', carrusel, slides: carrusel, carruselMarca,
    productosLista, categoriasLista, isAdmin: true
  });
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
    const {
      content_type, mostrar_boton, boton_texto, countdown_fecha,
      boton_url, destino_tipo, destino_valor, animacion, posicion_texto
    } = req.body;
    // Build safe INSERT based on available columns
    try {
      await db.query(
        `INSERT INTO carrusel
           (imagen, titulo, subtitulo, orden, activo, content_type, mostrar_boton, boton_texto,
            countdown_fecha, boton_url, destino_tipo, destino_valor, animacion, posicion_texto)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.file.filename, titulo||'', subtitulo||'', maxOrden.m + 1, activo ? 1 : 0,
         content_type||'texto', mostrar_boton!=='0'?1:0, boton_texto||'EXPLORAR',
         countdown_fecha||null, boton_url||'/productos', destino_tipo||'url',
         destino_valor||null, animacion||'fade-in', posicion_texto||'centro']
      );
    } catch(e2) {
      // Fallback sin las columnas nuevas si la migración 005 aún no corrió
      try {
        await db.query(
          'INSERT INTO carrusel (imagen, titulo, subtitulo, orden, activo, content_type, mostrar_boton, boton_texto, countdown_fecha) VALUES (?,?,?,?,?,?,?,?,?)',
          [req.file.filename, titulo||'', subtitulo||'', maxOrden.m + 1, activo ? 1 : 0,
           content_type||'texto', mostrar_boton!=='0'?1:0, boton_texto||'EXPLORAR', countdown_fecha||null]
        );
      } catch(e3) {
        await db.query(
          'INSERT INTO carrusel (imagen, titulo, subtitulo, orden, activo) VALUES (?,?,?,?,?)',
          [req.file.filename, titulo||'', subtitulo||'', maxOrden.m + 1, activo ? 1 : 0]
        );
      }
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

// "Mostrar información" — panel con foto, banner, stats completas, fecha registro/último acceso, historial
router.get('/usuarios/:id/info', isAdmin, async (req, res) => {
  try {
    const [[usuario]] = await db.query('SELECT * FROM usuarios WHERE id=?', [req.params.id]);
    if (!usuario) return res.json({ success: false, error: 'Usuario no encontrado' });

    const [[{ pedidos }]] = await db.query('SELECT COUNT(*) as pedidos FROM pedidos WHERE usuario_id=?', [req.params.id]);
    const [[{ tableros }]] = await db.query('SELECT COUNT(*) as tableros FROM tableros WHERE usuario_id=?', [req.params.id]);
    const [[{ guardados }]] = await db.query('SELECT COUNT(*) as guardados FROM producto_likes WHERE usuario_id=?', [req.params.id]);
    let logros = 0;
    try {
      const [[r]] = await db.query('SELECT COUNT(*) as logros FROM usuario_logros WHERE usuario_id=? AND desbloqueado=1', [req.params.id]);
      logros = r.logros;
    } catch(e) {}

    let ultimoAcceso = null;
    try {
      const [[r2]] = await db.query('SELECT MAX(inicio) as ultimo FROM sesiones_stats WHERE usuario_id=?', [req.params.id]);
      ultimoAcceso = r2.ultimo;
    } catch(e) {}

    const [historial] = await db.query(
      'SELECT id, total, estado, creado_en FROM pedidos WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 5',
      [req.params.id]
    );

    res.json({
      success: true, usuario,
      stats: { pedidos, tableros, guardados, logros },
      ultimoAcceso, historial
    });
  } catch(e) {
    console.error('[usuarios/info]', e.message);
    res.json({ success: false, error: e.message });
  }
});

router.post('/usuarios/:id/toggle', isAdmin, async (req, res) => {
  try {
    const [[u]] = await db.query('SELECT activo FROM usuarios WHERE id=?', [req.params.id]);
    if (!u) return res.json({ success: false, error: 'Usuario no encontrado' });
    await db.query('UPDATE usuarios SET activo=? WHERE id=?', [u.activo ? 0 : 1, req.params.id]);
    res.json({ success: true, activo: !u.activo });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

router.post('/usuarios/:id/rol', isAdmin, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['cliente','admin'].includes(rol)) return res.json({ success: false, error: 'Rol inválido' });
    await db.query('UPDATE usuarios SET rol=? WHERE id=?', [rol, req.params.id]);
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

router.post('/usuarios/nuevo', isAdmin, async (req, res) => {
  try {
    const { nombre_visible, email, password, rol } = req.body;
    if (!nombre_visible || !email || !password) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/usuarios');
    }
    let bcrypt;
    try { bcrypt = require('bcrypt'); } catch(e) { bcrypt = require('bcryptjs'); }
    const [[existe]] = await db.query('SELECT id FROM usuarios WHERE email=?', [email]);
    if (existe) { req.flash('error', 'Ya existe un usuario con ese email'); return res.redirect('/admin/usuarios'); }
    // Generar username único a partir del nombre
    let baseUsername = nombre_visible.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '').substring(0, 15) || 'user';
    let username = baseUsername;
    let counter = 1;
    while (true) {
      const [[taken]] = await db.query('SELECT id FROM usuarios WHERE username=?', [username]);
      if (!taken) break;
      username = baseUsername + counter++;
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO usuarios (nombre_visible, username, email, password, rol, activo) VALUES (?,?,?,?,?,1)',
      [nombre_visible, username, email, hash, rol || 'cliente']
    );
    req.flash('success', 'Usuario creado correctamente');
    res.redirect('/admin/usuarios');
  } catch(e) {
    console.error('Error crear usuario:', e);
    req.flash('error', 'Error al crear usuario: ' + e.message);
    res.redirect('/admin/usuarios');
  }
});

router.post('/usuarios/:id/editar', isAdmin, async (req, res) => {
  try {
    const { nombre_visible, email, password, rol } = req.body;
    let bcrypt;
    try { bcrypt = require('bcrypt'); } catch(e) { bcrypt = require('bcryptjs'); }
    const updates = { nombre_visible, email, rol: rol || 'cliente' };
    if (password && password.trim().length >= 6) {
      updates.password = await bcrypt.hash(password, 10);
    }
    const setClause = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.query(`UPDATE usuarios SET ${setClause} WHERE id=?`, [...Object.values(updates), req.params.id]);
    req.flash('success', 'Usuario actualizado');
    res.redirect('/admin/usuarios');
  } catch(e) {
    console.error('Error editar usuario:', e);
    req.flash('error', 'Error al editar usuario: ' + e.message);
    res.redirect('/admin/usuarios');
  }
});

router.post('/usuarios/:id/eliminar', isAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (parseInt(id) === req.session.user.id) {
      return res.json({ success: false, error: 'No puedes eliminarte a ti mismo' });
    }
    const [[u]] = await db.query('SELECT id FROM usuarios WHERE id=?', [id]);
    if (!u) return res.json({ success: false, error: 'Usuario no encontrado' });
    await db.query('DELETE FROM usuarios WHERE id=?', [id]);
    res.json({ success: true });
  } catch(e) {
    console.error('Error eliminar usuario:', e);
    res.json({ success: false, error: e.message });
  }
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
  try {
    const [[c]] = await db.query('SELECT activo FROM comentarios WHERE id=?', [req.params.id]);
    if (!c) return res.json({ success: false, error: 'Comentario no encontrado' });
    const nuevoEstado = c.activo ? 0 : 1;
    await db.query('UPDATE comentarios SET activo=? WHERE id=?', [nuevoEstado, req.params.id]);
    res.json({ success: true, activo: nuevoEstado === 1 });
  } catch(e) {
    console.error('Error toggle comentario:', e);
    res.json({ success: false, error: e.message });
  }
});

router.post('/comentarios/:id/eliminar', isAdmin, async (req, res) => {
  try {
    const [[c]] = await db.query('SELECT id FROM comentarios WHERE id=?', [req.params.id]);
    if (!c) return res.json({ success: false, error: 'Comentario no encontrado' });
    await db.query('DELETE FROM comentarios WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) {
    console.error('Error eliminar comentario:', e);
    res.json({ success: false, error: e.message });
  }
});

// CONFIGURACION
router.get('/configuracion', isAdmin, async (req, res) => {
  const [config] = await db.query('SELECT * FROM configuracion_sitio ORDER BY clave ASC');
  let redesConfig = [];
  try { [redesConfig] = await db.query('SELECT * FROM redes_sociales ORDER BY orden ASC'); } catch(e) {}
  res.render('admin/configuracion', { title: 'Admin - Configuracion', config, redesConfig, isAdmin: true });
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

// Sincroniza la lista completa de redes sociales (recibida desde el form vía AJAX
// antes del submit principal). Estrategia simple: borrar todas las existentes que
// no vinieron en el payload, actualizar las que sí (por id), insertar las nuevas.
router.post('/configuracion/redes', isAdmin, async (req, res) => {
  const redes = Array.isArray(req.body.redes) ? req.body.redes : [];
  try {
    const idsRecibidos = redes.filter(r => r.id).map(r => parseInt(r.id));
    if (idsRecibidos.length > 0) {
      await db.query(`DELETE FROM redes_sociales WHERE id NOT IN (${idsRecibidos.map(()=>'?').join(',')})`, idsRecibidos);
    } else {
      await db.query('DELETE FROM redes_sociales');
    }
    for (const r of redes) {
      if (r.id) {
        await db.query(
          'UPDATE redes_sociales SET nombre=?, icono=?, url=?, color=?, visible=?, orden=? WHERE id=?',
          [r.nombre, r.icono, r.url, r.color, r.visible ? 1 : 0, r.orden || 0, r.id]
        );
      } else {
        await db.query(
          'INSERT INTO redes_sociales (nombre, icono, url, color, visible, orden) VALUES (?,?,?,?,?,?)',
          [r.nombre, r.icono, r.url, r.color, r.visible ? 1 : 0, r.orden || 0]
        );
      }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[configuracion/redes]', e.message);
    res.json({ success: false, error: e.message });
  }
});



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
  const {
    titulo, subtitulo, orden, activo, content_type, mostrar_boton, boton_texto, countdown_fecha,
    boton_url, destino_tipo, destino_valor, animacion, posicion_texto
  } = req.body;
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
      updates.boton_url = boton_url || '/productos';
      updates.destino_tipo = destino_tipo || 'url';
      updates.destino_valor = destino_valor || null;
      updates.animacion = animacion || 'fade-in';
      updates.posicion_texto = posicion_texto || 'centro';
    } catch(e) {}

    const setCols = Object.keys(updates).map(k => k+'=?').join(',');
    try {
      await db.query('UPDATE carrusel SET '+setCols+' WHERE id=?', [...Object.values(updates), req.params.id]);
    } catch(e2) {
      // Fallback: la migración 005 podría no haber corrido aún (columnas nuevas no existen)
      delete updates.boton_url; delete updates.destino_tipo; delete updates.destino_valor;
      delete updates.animacion; delete updates.posicion_texto;
      const setCols2 = Object.keys(updates).map(k => k+'=?').join(',');
      await db.query('UPDATE carrusel SET '+setCols2+' WHERE id=?', [...Object.values(updates), req.params.id]);
    }
    req.flash('success', 'Slide actualizado');
  } catch(e) {
    req.flash('error', 'Error: '+e.message);
  }
  res.redirect('/admin/carrusel');
});

module.exports = router;
