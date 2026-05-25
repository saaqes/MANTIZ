const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');

// LISTA DE PEDIDOS (admin)
router.get('/', isAdmin, async (req, res) => {
  const estado = req.query.estado || '';
  
  let sql = `SELECT p.*, u.nombre_visible, u.email,
    d.ciudad as ciudad_entrega, d.direccion as dir_entrega
   FROM pedidos p 
   JOIN usuarios u ON p.usuario_id = u.id 
   LEFT JOIN direcciones_entrega d ON p.direccion_id = d.id`;
  const params = [];
  
  if (estado) {
    sql += ' WHERE p.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY p.creado_en DESC';
  
  const [pedidos] = await db.query(sql, params);
  const [proveedores] = await db.query('SELECT * FROM proveedores WHERE activo=1');
  
  res.render('admin/pedidos/lista', { title: 'Admin - Pedidos', pedidos, proveedores, estado });
});

// DETALLE PEDIDO (admin)
router.get('/:id', isAdmin, async (req, res) => {
  const [[pedido]] = await db.query(
    `SELECT p.*, u.nombre_visible, u.email,
      d.direccion, d.ciudad, d.departamento, d.pais, d.nombre_destinatario, d.telefono as tel_envio
     FROM pedidos p 
     JOIN usuarios u ON p.usuario_id = u.id
     LEFT JOIN direcciones_entrega d ON p.direccion_id = d.id
     WHERE p.id = ?`,
    [req.params.id]
  );
  
  if (!pedido) { req.flash('error', 'Pedido no encontrado'); return res.redirect('/admin/pedidos'); }
  
  const [items] = await db.query(
    `SELECT pi.*, pr.titulo, pr.imagen_principal FROM pedido_items pi
     JOIN productos pr ON pi.producto_id = pr.id WHERE pi.pedido_id = ?`,
    [pedido.id]
  );
  
  const [seguimiento] = await db.query(
    `SELECT ps.*, prov.nombre as proveedor_nombre, prov.tipo as proveedor_tipo,
            prov.telefono as prov_tel, prov.email as prov_email
     FROM pedido_seguimiento ps
     LEFT JOIN proveedores prov ON ps.proveedor_id = prov.id
     WHERE ps.pedido_id = ? ORDER BY ps.fecha_hora ASC`,
    [pedido.id]
  );
  
  const [proveedores] = await db.query('SELECT * FROM proveedores WHERE activo=1 ORDER BY tipo');
  const estados = ['pendiente','confirmado','empaquetando','en_transito','en_aduana','con_conductor','entregado','cancelado'];
  const progreso = Math.round(((estados.indexOf(pedido.estado) + 1) / (estados.length - 1)) * 100);
  
  res.render('admin/pedidos/detalle', { 
    title: `Pedido #${pedido.id}`, pedido, items, seguimiento, proveedores, estados, progreso
  });
});

// ACTUALIZAR ESTADO PEDIDO
router.post('/:id/estado', isAdmin, async (req, res) => {
  const { estado } = req.body;
  await db.query('UPDATE pedidos SET estado=?, actualizado_en=NOW() WHERE id=?', [estado, req.params.id]);
  res.json({ success: true });
});

// AGREGAR ACTUALIZACIÓN DE SEGUIMIENTO (admin/proveedor)
router.post('/:id/seguimiento', isAdmin, async (req, res) => {
  const { estado, descripcion, ubicacion, latitud, longitud, proveedor_id, tipo_proveedor, actualizar_estado_pedido } = req.body;
  
  try {
    await db.query(
      `INSERT INTO pedido_seguimiento (pedido_id, estado, descripcion, ubicacion, latitud, longitud, proveedor_id, tipo_proveedor)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.params.id, estado, descripcion, ubicacion, latitud || null, longitud || null, proveedor_id || null, tipo_proveedor || 'almacen']
    );
    
    if (actualizar_estado_pedido) {
      // Mapear tipo a estado pedido
      const mapaEstados = {
        'almacen': 'confirmado',
        'empaquetador': 'empaquetando',
        'transporte': 'en_transito',
        'aduana': 'en_aduana',
        'entrega': 'con_conductor'
      };
      const nuevoEstado = mapaEstados[tipo_proveedor] || null;
      if (nuevoEstado) {
        await db.query('UPDATE pedidos SET estado=?,actualizado_en=NOW() WHERE id=?', [nuevoEstado, req.params.id]);
      }
    }
    
    const [[seg]] = await db.query(
      `SELECT ps.*, prov.nombre as proveedor_nombre FROM pedido_seguimiento ps
       LEFT JOIN proveedores prov ON ps.proveedor_id = prov.id
       WHERE ps.pedido_id = ? ORDER BY ps.fecha_hora DESC LIMIT 1`,
      [req.params.id]
    );
    
    res.json({ success: true, seguimiento: seg });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
