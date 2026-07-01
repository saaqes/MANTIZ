const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { attachProductGalleries } = require('../utils/productGallery');
const { isAuthenticated } = require('../middleware/auth');

// LISTA DE PRODUCTOS — con paginación server-side
router.get('/', async (req, res) => {
  const cat      = req.query.categoria || '';
  const orden    = req.query.orden     || 'nuevo';
  const precioMin = parseFloat(req.query.precio_min) || 0;
  const precioMax = parseFloat(req.query.precio_max) || 999999;
  const page      = Math.max(1, parseInt(req.query.page) || 1);
  const PER_PAGE  = 24;
  const offset    = (page - 1) * PER_PAGE;

  try {
    let where  = 'activo = 1 AND COALESCE(precio_descuento,precio) >= ? AND COALESCE(precio_descuento,precio) <= ?';
    const wParams = [precioMin, precioMax];
    if (cat) { where += ' AND categoria = ?'; wParams.push(cat); }

    let orderBy = 'creado_en DESC';
    if (orden === 'precio_asc')   orderBy = 'COALESCE(precio_descuento,precio) ASC';
    else if (orden === 'precio_desc') orderBy = 'COALESCE(precio_descuento,precio) DESC';
    else if (orden === 'populares')   orderBy = 'total_likes DESC';
    else if (orden === 'calificacion') orderBy = 'calificacion_promedio DESC';

    // Queries en paralelo: productos de la página + total para paginación + categorías
    const [prodResult, countResult, catResult] = await Promise.all([
      db.query(
        `SELECT id, titulo, precio, precio_descuento, imagen_principal, imagen_hover, categoria,
                total_likes, calificacion_promedio,
                COALESCE(precio_descuento,precio) AS precio_final
         FROM productos WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...wParams, PER_PAGE, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM productos WHERE ${where}`, wParams),
      db.query('SELECT DISTINCT categoria FROM productos WHERE activo=1 AND categoria IS NOT NULL ORDER BY categoria')
    ]);

    const productos = await attachProductGalleries(prodResult[0] || []);
    const total      = (countResult[0][0] || {}).total || 0;
    const categorias = catResult[0]   || [];
    const totalPages = Math.ceil(total / PER_PAGE);

    // SEO: título/descripción específicos por categoría filtrada
    const pageTitle = cat ? `${cat} — Productos` : 'Productos';
    const metaDescription = cat
      ? `Compra ${cat.toLowerCase()} en MANTIZ. ${total} producto${total===1?'':'s'} disponible${total===1?'':'s'} con envío a toda Colombia.`
      : `Explora todo el catálogo MANTIZ: moda urbana, streetwear Y2K y piezas exclusivas. ${total} productos disponibles.`;

    res.render('productos/lista', {
      title: pageTitle, productos, categorias, cat, orden,
      precioMin, precioMax, page, totalPages, total, metaDescription
    });
  } catch(e) {
    console.error('[productos]', e.message);
    res.render('productos/lista', {
      title: 'Productos', productos: [], categorias: [], cat, orden,
      precioMin: 0, precioMax: 999999, page: 1, totalPages: 1, total: 0
    });
  }
});

// DETALLE DE PRODUCTO
// API para recomendaciones IA
router.get('/api/:id', async (req, res) => {
  try {
    const [[p]] = await db.query(
      'SELECT id, titulo, imagen_principal, precio, precio_descuento, categoria FROM productos WHERE id=? AND activo=1',
      [req.params.id]
    );
    if (!p) return res.status(404).json({ error: 'No encontrado' });
    res.json(p);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [[producto]] = await db.query(
      'SELECT * FROM productos WHERE id = ? AND activo = 1',
      [req.params.id]
    );
    if (!producto) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/productos');
    }

    const [tallas] = await db.query(
      'SELECT * FROM producto_tallas WHERE producto_id = ? AND stock > 0 ORDER BY id ASC',
      [producto.id]
    );
    const [imagenes] = await db.query(
      'SELECT * FROM producto_imagenes WHERE producto_id = ? ORDER BY orden ASC',
      [producto.id]
    );
    const [comentarios] = await db.query(
      `SELECT c.*, u.nombre_visible, u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.producto_id = ? AND c.activo = 1
       ORDER BY c.creado_en DESC`,
      [producto.id]
    );

    // Distribución de calificaciones
    const [distCalif] = await db.query(
      `SELECT calificacion, COUNT(*) as total FROM comentarios 
       WHERE producto_id = ? AND calificacion IS NOT NULL AND activo = 1 
       GROUP BY calificacion ORDER BY calificacion DESC`,
      [producto.id]
    );

    // Productos relacionados - misma categoría + tags similares
    const tags = (producto.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    let relSQL = `SELECT * FROM productos WHERE activo = 1 AND id != ? AND (categoria = ?`;
    const relParams = [producto.id, producto.categoria];
    if (tags.length > 0) {
      tags.slice(0, 3).forEach(tag => { relSQL += ` OR tags LIKE ?`; relParams.push(`%${tag}%`); });
    }
    relSQL += `) ORDER BY total_likes DESC LIMIT 6`;
    const [relacionados] = await db.query(relSQL, relParams);

    // También mostrar más vendidos globales si hay pocos relacionados
    let masVendidos = [];
    if (relacionados.length < 4) {
      const [mv] = await db.query(
        `SELECT * FROM productos WHERE activo = 1 AND id != ? AND id NOT IN (${relacionados.length > 0 ? relacionados.map(()=>'?').join(',') : '0'}) ORDER BY total_likes DESC LIMIT 4`,
        [producto.id, ...relacionados.map(r => r.id)]
      );
      masVendidos = mv;
    }

    let userLiked = false, userComento = false;
    if (req.session.user) {
      const [[liked]] = await db.query(
        'SELECT id FROM producto_likes WHERE usuario_id = ? AND producto_id = ?',
        [req.session.user.id, producto.id]
      );
      userLiked = !!liked;
      const [[comentado]] = await db.query(
        'SELECT id FROM comentarios WHERE usuario_id = ? AND producto_id = ? AND activo = 1',
        [req.session.user.id, producto.id]
      );
      userComento = !!comentado;
      await db.query(
        'INSERT INTO visitas (usuario_id, pagina, producto_id, ip) VALUES (?,?,?,?)',
        [req.session.user.id, `/productos/${producto.id}`, producto.id, req.ip]
      ).catch(() => {});
    }

    await db.query('UPDATE productos SET total_visitas = total_visitas + 1 WHERE id = ?', [producto.id]).catch(() => {});

    // Modelo 3D: primero buscar el específico del producto, luego el principal activo
    let modelo3d = null;
    try {
      const [[mEspecifico]] = await db.query(
        'SELECT id, nombre, archivo, escala, pos_y FROM modelos_3d WHERE producto_id = ? AND activo = 1 LIMIT 1',
        [producto.id]
      );
      if (mEspecifico) {
        modelo3d = mEspecifico;
      } else {
        const [[mPrincipal]] = await db.query(
          'SELECT id, nombre, archivo, escala, pos_y FROM modelos_3d WHERE es_principal = 1 AND activo = 1 LIMIT 1'
        );
        if (mPrincipal) modelo3d = mPrincipal;
      }
    } catch(e) { /* tabla puede no existir en instalaciones antiguas */ }

    // ── SEO: descripción + imagen + JSON-LD Product específicos de este producto ──
    // Sin esto, compartir un link de producto en WhatsApp/redes mostraba el
    // título/imagen genéricos del sitio en vez de los del producto real.
    const metaDescription = (producto.descripcion || '').replace(/\s+/g, ' ').trim().slice(0, 155)
      || `${producto.titulo} — disponible en MANTIZ desde $${parseFloat(producto.precio).toLocaleString('es-CO')}`;
    const ogImage = producto.imagen_principal ? `/uploads/products/${producto.imagen_principal}` : undefined;
    const precioFinal = parseFloat(producto.precio_descuento || producto.precio);
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: producto.titulo,
      description: metaDescription,
      image: ogImage ? `${res.locals.baseUrl}${ogImage}` : undefined,
      sku: String(producto.id),
      category: producto.categoria || undefined,
      aggregateRating: (producto.calificacion_promedio && producto.total_calificaciones)
        ? { '@type': 'AggregateRating', ratingValue: String(producto.calificacion_promedio), reviewCount: String(producto.total_calificaciones) }
        : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'COP',
        price: String(precioFinal),
        availability: tallas.some(t => t.stock > 0) || tallas.length === 0
          ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: res.locals.canonicalUrl
      }
    };

    res.render('productos/detalle', {
      title: producto.titulo,
      producto, tallas, imagenes, comentarios, relacionados, masVendidos,
      distCalif, userLiked, userComento, modelo3d,
      metaDescription, ogImage, ogType: 'product', ogPrice: precioFinal, jsonLd
    });
  } catch(e) {
    console.error(e);
    req.flash('error', 'Error al cargar el producto');
    res.redirect('/productos');
  }
});

// COMENTAR
router.post('/:id/comentar', isAuthenticated, async (req, res) => {
  const productoId = req.params.id;
  const { contenido, calificacion } = req.body;
  const usuarioId = req.session.user.id;

  if (!contenido || contenido.trim().length < 3) {
    if (req.headers.accept?.includes('application/json')) return res.status(400).json({ error: 'El comentario es muy corto' });
    req.flash('error', 'El comentario debe tener al menos 3 caracteres');
    return res.redirect(`/productos/${productoId}`);
  }

  const cal = calificacion && !isNaN(calificacion) ? parseInt(calificacion) : null;

  try {
    const [[prod]] = await db.query('SELECT id FROM productos WHERE id = ? AND activo=1', [productoId]);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const [[yaComento]] = await db.query(
      'SELECT id FROM comentarios WHERE usuario_id = ? AND producto_id = ? AND activo = 1',
      [usuarioId, productoId]
    );

    if (yaComento) {
      await db.query('UPDATE comentarios SET contenido = ?, calificacion = ?, actualizado_en = NOW() WHERE id = ?',
        [contenido.trim(), cal, yaComento.id]);
    } else {
      await db.query('INSERT INTO comentarios (producto_id, usuario_id, contenido, calificacion) VALUES (?, ?, ?, ?)',
        [productoId, usuarioId, contenido.trim(), cal]);
    }

    // Recalcular promedio
    await db.query(
      `UPDATE productos SET
        calificacion_promedio = COALESCE((SELECT AVG(calificacion) FROM comentarios WHERE producto_id = ? AND calificacion IS NOT NULL AND activo = 1), 0),
        total_calificaciones = (SELECT COUNT(*) FROM comentarios WHERE producto_id = ? AND calificacion IS NOT NULL AND activo = 1)
       WHERE id = ?`,
      [productoId, productoId, productoId]
    );

    if (req.headers.accept?.includes('application/json') || req.xhr) {
      const [[nuevoComentario]] = await db.query(
        `SELECT c.*, u.nombre_visible, u.foto_perfil_preset, u.foto_perfil_tipo, u.foto_perfil FROM comentarios c
         JOIN usuarios u ON c.usuario_id = u.id
         WHERE c.usuario_id = ? AND c.producto_id = ? AND c.activo = 1
         ORDER BY c.creado_en DESC LIMIT 1`,
        [usuarioId, productoId]
      );
      return res.json({ success: true, comentario: nuevoComentario });
    }
    req.flash('success', 'Reseña publicada');
    res.redirect(`/productos/${productoId}`);
  } catch(e) {
    console.error('Error comentar:', e);
    if (req.headers.accept?.includes('application/json')) return res.status(500).json({ error: e.message });
    req.flash('error', 'Error al publicar');
    res.redirect(`/productos/${productoId}`);
  }
});

// LIKE / FAVORITO
router.post('/:id/like', isAuthenticated, async (req, res) => {
  const productoId = req.params.id;
  const usuarioId = req.session.user.id;
  try {
    const [[liked]] = await db.query(
      'SELECT id FROM producto_likes WHERE usuario_id = ? AND producto_id = ?',
      [usuarioId, productoId]
    );
    if (liked) {
      await db.query('DELETE FROM producto_likes WHERE usuario_id = ? AND producto_id = ?', [usuarioId, productoId]);
      await db.query('UPDATE productos SET total_likes = GREATEST(total_likes-1,0) WHERE id = ?', [productoId]);
      return res.json({ liked: false });
    } else {
      await db.query('INSERT INTO producto_likes (usuario_id, producto_id) VALUES (?,?)', [usuarioId, productoId]);
      await db.query('UPDATE productos SET total_likes = total_likes+1 WHERE id = ?', [productoId]);
      return res.json({ liked: true });
    }
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error al procesar like' });
  }
});

// TALLAS API (para el modal del master)
router.get('/:id/tallas', async (req, res) => {
  try {
    const [tallas] = await db.query(
      'SELECT talla, stock FROM producto_tallas WHERE producto_id = ? ORDER BY id ASC',
      [req.params.id]
    );
    res.json({ tallas });
  } catch(e) {
    res.json({ tallas: [] });
  }
});


// DESTACAR producto -> guardar en tablero de pines
router.post('/:id/destacar', isAuthenticated, async (req, res) => {
  const { tablero_id } = req.body;
  const productoId = req.params.id;
  try {
    const [[prod]] = await db.query('SELECT * FROM productos WHERE id=? AND activo=1', [productoId]);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    if (tablero_id) {
      // Add to existing board
      const [[t]] = await db.query('SELECT * FROM tableros WHERE id=? AND usuario_id=?', [tablero_id, req.session.user.id]);
      if (!t) return res.status(403).json({ error: 'Tablero no encontrado' });
      await db.query(
        'INSERT INTO tablero_pines (tablero_id, producto_id, titulo, imagen_url, tipo) VALUES (?,?,?,?,?)',
        [tablero_id, productoId, prod.titulo, '/uploads/products/'+prod.imagen_principal, 'producto']
      );
      res.json({ success: true, message: 'Guardado en ' + t.nombre });
    } else {
      // Return user's boards so they can pick / create
      const [tableros] = await db.query(
        'SELECT id, nombre, color_portada FROM tableros WHERE usuario_id=? ORDER BY creado_en DESC',
        [req.session.user.id]
      );
      res.json({ needsBoard: true, tableros, producto: { id: prod.id, titulo: prod.titulo, imagen: prod.imagen_principal } });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// CREATE tablero and add product in one step
router.post('/:id/destacar/nuevo-tablero', isAuthenticated, async (req, res) => {
  const { nombre, privacidad } = req.body;
  const productoId = req.params.id;
  try {
    const [[prod]] = await db.query('SELECT * FROM productos WHERE id=? AND activo=1', [productoId]);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    const [r] = await db.query(
      'INSERT INTO tableros (usuario_id, nombre, privacidad, color_portada) VALUES (?,?,?,?)',
      [req.session.user.id, nombre||'Mi tablero', privacidad||'privado', '#e91e8c']
    );
    await db.query(
      'INSERT INTO tablero_pines (tablero_id, producto_id, titulo, imagen_url, tipo) VALUES (?,?,?,?,?)',
      [r.insertId, productoId, prod.titulo, '/uploads/products/'+prod.imagen_principal, 'producto']
    );
    res.json({ success: true, tableroId: r.insertId, message: 'Tablero creado y producto guardado' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── LIKE A COMENTARIO (fix 404) ─────────────────────────────────────────────
router.post('/comentario/:id/like', isAuthenticated, async (req, res) => {
  const cid = req.params.id;
  const uid = req.session.user.id;
  try {
    const [[com]] = await db.query('SELECT * FROM comentarios WHERE id=? AND activo=1', [cid]);
    if (!com) return res.status(404).json({ error: 'Comentario no encontrado' });
    const [[reaccion]] = await db.query(
      'SELECT * FROM comentario_reacciones WHERE comentario_id=? AND usuario_id=?', [cid, uid]
    );
    if (reaccion) {
      if (reaccion.tipo === 'like') {
        await db.query('DELETE FROM comentario_reacciones WHERE id=?', [reaccion.id]);
        await db.query('UPDATE comentarios SET likes=GREATEST(likes-1,0) WHERE id=?', [cid]);
        const [[updated]] = await db.query('SELECT likes FROM comentarios WHERE id=?', [cid]);
        return res.json({ liked: false, likes: updated.likes });
      } else {
        await db.query('UPDATE comentario_reacciones SET tipo="like" WHERE id=?', [reaccion.id]);
        await db.query('UPDATE comentarios SET likes=likes+1, dislikes=GREATEST(dislikes-1,0) WHERE id=?', [cid]);
      }
    } else {
      await db.query('INSERT INTO comentario_reacciones (comentario_id,usuario_id,tipo) VALUES (?,?,"like")', [cid, uid]);
      await db.query('UPDATE comentarios SET likes=likes+1 WHERE id=?', [cid]);
      // Notificar al autor si no es el mismo usuario
      if (com.usuario_id !== uid) {
        const [[liker]] = await db.query('SELECT nombre_visible FROM usuarios WHERE id=?', [uid]);
        await db.query(
          'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,icono,color) VALUES (?,?,?,?,?,?) ',
          [com.usuario_id, 'reaccion', '¡Le gustó tu comentario!',
           `${liker.nombre_visible} le dio like a tu comentario`, 'bi-hand-thumbs-up-fill', '#e91e8c']
        ).catch(() => {}); // ignore if notificaciones table doesn't exist yet
      }
    }
    const [[updated]] = await db.query('SELECT likes FROM comentarios WHERE id=?', [cid]);
    return res.json({ liked: true, likes: updated.likes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
