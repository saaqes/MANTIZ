const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// VER CARRITO
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT c.*, p.titulo, p.imagen_principal, p.precio, p.precio_descuento,
              COALESCE(p.precio_descuento, p.precio) as precio_final
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?
       ORDER BY c.creado_en DESC`,
      [req.session.user.id]
    );
    
    const subtotal = items.reduce((sum, i) => sum + (i.precio_final * i.cantidad), 0);
    const envio = subtotal > 0 ? 8.99 : 0;
    const total = subtotal + envio;
    
    res.render('carrito/index', { title: 'Mi Carrito', items, subtotal, envio, total });
  } catch(e) {
    console.error(e);
    res.render('carrito/index', { title: 'Mi Carrito', items: [], subtotal: 0, envio: 0, total: 0 });
  }
});

// AGREGAR AL CARRITO
router.post('/agregar', async (req, res) => {
  if (!req.session.user) {
    return res.json({ redirect: '/auth/login' });
  }
  const { producto_id, talla, cantidad } = req.body;
  const usuarioId = req.session.user.id;
  const cant = parseInt(cantidad) || 1;
  const tallaVal = (talla && talla.trim() !== '') ? talla.trim() : '';

  if (!producto_id) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  try {
    // Verificar stock solo si el producto maneja tallas
    let stockDisponible = null;
    if (tallaVal !== '') {
      const [[tallaInfo]] = await db.query(
        'SELECT stock FROM producto_tallas WHERE producto_id = ? AND talla = ?',
        [producto_id, tallaVal]
      );
      if (!tallaInfo) {
        return res.status(400).json({ error: 'Talla no disponible para este producto' });
      }
      stockDisponible = tallaInfo.stock;
      if (stockDisponible < cant) {
        return res.status(400).json({ error: `Stock insuficiente. Solo quedan ${stockDisponible} unidades` });
      }
    }

    // Buscar si ya existe en el carrito
    const [[existing]] = await db.query(
      'SELECT id, cantidad FROM carrito WHERE usuario_id = ? AND producto_id = ? AND talla = ?',
      [usuarioId, producto_id, tallaVal]
    );

    if (existing) {
      const nuevaCant = existing.cantidad + cant;
      // Solo validar stock si el producto tiene tallas
      if (stockDisponible !== null && nuevaCant > stockDisponible) {
        return res.status(400).json({ error: `No puedes agregar más. Stock disponible: ${stockDisponible}` });
      }
      await db.query(
        'UPDATE carrito SET cantidad = ?, actualizado_en = NOW() WHERE id = ?',
        [nuevaCant, existing.id]
      );
    } else {
      await db.query(
        'INSERT INTO carrito (usuario_id, producto_id, talla, cantidad) VALUES (?,?,?,?)',
        [usuarioId, producto_id, tallaVal, cant]
      );
    }

    // Contar total items
    const [[count]] = await db.query(
      'SELECT SUM(cantidad) as total FROM carrito WHERE usuario_id = ?',
      [usuarioId]
    );

    res.json({ success: true, carritoCount: count.total || 0, message: '¡Producto añadido al carrito!' });
  } catch(e) {
    console.error('Error carrito:', e);
    res.status(500).json({ error: 'Error al agregar al carrito: ' + e.message });
  }
});

// ACTUALIZAR CANTIDAD
router.post('/actualizar', isAuthenticated, async (req, res) => {
  const { item_id, cantidad } = req.body;
  const cant = parseInt(cantidad);

  if (cant < 1) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }

  try {
    // Buscar item y verificar stock si tiene talla
    const [[item]] = await db.query(
      `SELECT c.*,
              COALESCE(pt.stock, 9999) as stock
       FROM carrito c
       LEFT JOIN producto_tallas pt ON pt.producto_id = c.producto_id AND pt.talla = c.talla
       WHERE c.id = ? AND c.usuario_id = ?`,
      [item_id, req.session.user.id]
    );

    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    if (cant > item.stock) return res.status(400).json({ error: `Stock máximo: ${item.stock}` });

    await db.query('UPDATE carrito SET cantidad = ? WHERE id = ?', [cant, item_id]);
    res.json({ success: true });
  } catch(e) {
    console.error('Error actualizar carrito:', e);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// ELIMINAR DEL CARRITO
router.post('/eliminar/:id', isAuthenticated, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM carrito WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.session.user.id]
    );
    // Si viene de fetch (JSON), responder JSON; si viene de form, redirigir
    const isJson = req.headers['content-type']?.includes('application/json') || req.headers.accept?.includes('application/json');
    if (isJson) return res.json({ success: true });
    req.flash('success', 'Producto eliminado del carrito');
    res.redirect('/carrito');
  } catch(e) {
    req.flash('error', 'Error al eliminar');
    res.redirect('/carrito');
  }
});

// VACIAR CARRITO
router.post('/vaciar', isAuthenticated, async (req, res) => {
  try {
    await db.query('DELETE FROM carrito WHERE usuario_id = ?', [req.session.user.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Error' });
  }
});

// PANEL CARRITO (API para el sidebar del master)
router.get('/panel', async (req, res) => {
  if (!req.session.user) {
    return res.json({ items: [] });
  }
  try {
    const [items] = await db.query(
      `SELECT c.id, c.cantidad, c.talla, p.titulo, p.imagen_principal,
              COALESCE(p.precio_descuento, p.precio) as precio
       FROM carrito c
       JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?
       ORDER BY c.creado_en DESC`,
      [req.session.user.id]
    );
    res.json({ items });
  } catch(e) {
    res.json({ items: [] });
  }
});

module.exports = router;