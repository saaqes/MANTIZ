const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// MIS PEDIDOS
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [pedidos] = await db.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as total_items,
        (SELECT pi2.imagen_principal FROM pedido_items pit JOIN productos pi2 ON pit.producto_id = pi2.id WHERE pit.pedido_id = p.id LIMIT 1) as imagen_preview
       FROM pedidos p 
       WHERE p.usuario_id = ? 
       ORDER BY p.creado_en DESC`,
      [req.session.user.id]
    );
    res.render('pedidos/lista', { title: 'Mis Pedidos', pedidos });
  } catch(e) {
    console.error(e);
    res.render('pedidos/lista', { title: 'Mis Pedidos', pedidos: [] });
  }
});

// CHECKOUT - PASO 1: Dirección y pago
router.get('/checkout', isAuthenticated, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT c.*, p.titulo, p.imagen_principal, COALESCE(p.precio_descuento, p.precio) as precio_final
       FROM carrito c JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?`,
      [req.session.user.id]
    );
    
    if (items.length === 0) {
      req.flash('error', 'Tu carrito está vacío');
      return res.redirect('/carrito');
    }
    
    const [direcciones] = await db.query(
      'SELECT * FROM direcciones_entrega WHERE usuario_id = ? ORDER BY predeterminada DESC',
      [req.session.user.id]
    );
    
    const subtotal = items.reduce((s, i) => s + (i.precio_final * i.cantidad), 0);
    const envio = 8.99;
    const total = subtotal + envio;
    
    res.render('pedidos/checkout', { title: 'Finalizar Compra', items, direcciones, subtotal, envio, total });
  } catch(e) {
    console.error(e);
    req.flash('error', 'Error al cargar checkout');
    res.redirect('/carrito');
  }
});

// CHECKOUT - PROCESAR PEDIDO (pago simulado)
router.post('/checkout', isAuthenticated, async (req, res) => {
  const { direccion_id, nueva_direccion, metodo_pago, notas } = req.body;
  const usuarioId = req.session.user.id;
  
  try {
    const [items] = await db.query(
      `SELECT c.*, p.titulo, COALESCE(p.precio_descuento, p.precio) as precio_final
       FROM carrito c JOIN productos p ON c.producto_id = p.id
       WHERE c.usuario_id = ?`,
      [usuarioId]
    );
    
    if (items.length === 0) {
      req.flash('error', 'El carrito está vacío');
      return res.redirect('/carrito');
    }
    
    let dirId = direccion_id;
    
    // Si viene dirección nueva, guardarla
    if (!dirId) {
      const { nombre_destinatario, ciudad, departamento, direccion, lat, lng } = req.body;
      if (direccion) {
        const [result] = await db.query(
          'INSERT INTO direcciones_entrega (usuario_id, alias, nombre_destinatario, ciudad, direccion, departamento, lat, lng) VALUES (?,?,?,?,?,?,?,?)',
          [usuarioId, 'Entrega', nombre_destinatario || 'Destinatario', ciudad || '', direccion, departamento || '', lat || null, lng || null]
        ).catch(async () => {
          // Fallback without lat/lng if columns don't exist
          const [r2] = await db.query(
            'INSERT INTO direcciones_entrega (usuario_id, alias, nombre_destinatario, ciudad, direccion, departamento) VALUES (?,?,?,?,?,?)',
            [usuarioId, 'Entrega', nombre_destinatario || 'Destinatario', ciudad || '', direccion, departamento || '']
          );
          return [r2];
        });
        dirId = result[0]?.insertId || result.insertId;
      }
      // Legacy nueva_direccion JSON format
      if (!dirId && req.body.nueva_direccion) {
        try {
          const nd = JSON.parse(req.body.nueva_direccion);
          const [r3] = await db.query(
            'INSERT INTO direcciones_entrega (usuario_id, alias, nombre_destinatario, ciudad, direccion, departamento) VALUES (?,?,?,?,?,?)',
            [usuarioId, nd.alias||'Casa', nd.nombre||'', nd.ciudad||'', nd.direccion||'', nd.departamento||'']
          );
          dirId = r3.insertId;
        } catch(e) {}
      }
    }
    
    const subtotal = items.reduce((s, i) => s + (i.precio_final * i.cantidad), 0);
    const envio = 8.99;
    const total = subtotal + envio;
    
    // Número de tracking único
    const tracking = 'MTZ-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random()*999);
    
    // Fecha estimada: 5-7 días hábiles
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + 7);
    
    // Crear pedido
    const [pedidoResult] = await db.query(
      `INSERT INTO pedidos (usuario_id, direccion_id, total, subtotal, costo_envio, metodo_pago, estado_pago, estado, numero_tracking, notas, fecha_estimada_entrega) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [usuarioId, dirId || null, total, subtotal, envio, metodo_pago || 'tarjeta', 'pagado', 'confirmado', tracking, notas || '', fechaEntrega.toISOString().split('T')[0]]
    );
    
    const pedidoId = pedidoResult.insertId;
    
    // Insertar items
    for (const item of items) {
      await db.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, talla, cantidad, precio_unitario, subtotal) VALUES (?,?,?,?,?,?)',
        [pedidoId, item.producto_id, item.talla, item.cantidad, item.precio_final, item.precio_final * item.cantidad]
      );
    }
    
    // Seguimiento inicial automático
    const pasosSeguimiento = [
      { estado: 'Pedido confirmado', desc: 'Tu pedido ha sido recibido y confirmado exitosamente.', tipo: 'almacen', lat: 4.6097100, lng: -74.0817500, ubicacion: 'Almacén Central Mantiz, Bogotá' },
    ];
    
    for (const paso of pasosSeguimiento) {
      await db.query(
        'INSERT INTO pedido_seguimiento (pedido_id, estado, descripcion, ubicacion, latitud, longitud, tipo_proveedor) VALUES (?,?,?,?,?,?,?)',
        [pedidoId, paso.estado, paso.desc, paso.ubicacion, paso.lat, paso.lng, paso.tipo]
      );
    }
    
    // Vaciar carrito
    await db.query('DELETE FROM carrito WHERE usuario_id = ?', [usuarioId]);
    
    req.flash('success', `¡Pedido realizado exitosamente! Tu número de seguimiento es: ${tracking}`);
    res.redirect(`/pedidos/${pedidoId}`);
  } catch(e) {
    console.error('Error checkout:', e);
    req.flash('error', 'Error al procesar el pedido: ' + e.message);
    res.redirect('/pedidos/checkout');
  }
});

// DETALLE DE PEDIDO CON SEGUIMIENTO
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const [[pedido]] = await db.query(
      `SELECT p.*, d.direccion, d.ciudad, d.departamento, d.pais, d.nombre_destinatario, d.telefono as tel_envio
       FROM pedidos p 
       LEFT JOIN direcciones_entrega d ON p.direccion_id = d.id
       WHERE p.id = ? AND p.usuario_id = ?`,
      [req.params.id, req.session.user.id]
    );
    
    if (!pedido) {
      req.flash('error', 'Pedido no encontrado');
      return res.redirect('/pedidos');
    }
    
    const [items] = await db.query(
      `SELECT pi.*, pr.titulo, pr.imagen_principal FROM pedido_items pi
       JOIN productos pr ON pi.producto_id = pr.id
       WHERE pi.pedido_id = ?`,
      [pedido.id]
    );
    
    const [seguimiento] = await db.query(
      `SELECT ps.*, prov.nombre as proveedor_nombre, prov.telefono as proveedor_tel, prov.email as proveedor_email
       FROM pedido_seguimiento ps
       LEFT JOIN proveedores prov ON ps.proveedor_id = prov.id
       WHERE ps.pedido_id = ? ORDER BY ps.fecha_hora ASC`,
      [pedido.id]
    );
    
    // Calcular progreso
    const estados = ['pendiente','confirmado','empaquetando','en_transito','en_aduana','con_conductor','entregado'];
    const progreso = Math.round(((estados.indexOf(pedido.estado) + 1) / estados.length) * 100);
    
    res.render('pedidos/detalle', { 
      title: `Pedido #${pedido.id}`, 
      pedido, items, seguimiento, progreso, estados
    });
  } catch(e) {
    console.error(e);
    req.flash('error', 'Error al cargar el pedido');
    res.redirect('/pedidos');
  }
});

// GUARDAR DIRECCIÓN
router.post('/direccion/guardar', isAuthenticated, async (req, res) => {
  const { alias, nombre_destinatario, telefono, pais, departamento, ciudad, direccion, codigo_postal, notas, predeterminada } = req.body;
  
  try {
    if (predeterminada) {
      await db.query('UPDATE direcciones_entrega SET predeterminada=0 WHERE usuario_id=?', [req.session.user.id]);
    }
    
    await db.query(
      'INSERT INTO direcciones_entrega (usuario_id,alias,nombre_destinatario,telefono,pais,departamento,ciudad,direccion,codigo_postal,notas,predeterminada) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [req.session.user.id, alias, nombre_destinatario, telefono, pais, departamento, ciudad, direccion, codigo_postal, notas, predeterminada ? 1 : 0]
    );
    
    req.flash('success', 'Dirección guardada');
    res.redirect('/perfil#direcciones');
  } catch(e) {
    req.flash('error', 'Error al guardar dirección');
    res.redirect('/perfil');
  }
});

module.exports = router;
