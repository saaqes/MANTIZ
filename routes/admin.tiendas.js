const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');

// MAPA DE TIENDAS (admin)
router.get('/', isAdmin, async (req, res) => {
  const [tiendas] = await db.query('SELECT * FROM tiendas ORDER BY ciudad');
  res.render('admin/tiendas/mapa', { title: 'Admin - Tiendas', tiendas });
});

// CREAR TIENDA
router.post('/nueva', isAdmin, async (req, res) => {
  const { nombre, direccion, ciudad, pais, latitud, longitud, telefono, email, horario } = req.body;
  
  try {
    await db.query(
      'INSERT INTO tiendas (nombre,direccion,ciudad,pais,latitud,longitud,telefono,email,horario) VALUES (?,?,?,?,?,?,?,?,?)',
      [nombre, direccion, ciudad, pais || 'Colombia', latitud, longitud, telefono, email, horario]
    );
    res.json({ success: true, message: 'Tienda creada exitosamente' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// OBTENER TIENDA
router.get('/:id', isAdmin, async (req, res) => {
  const [[tienda]] = await db.query('SELECT * FROM tiendas WHERE id=?', [req.params.id]);
  if (!tienda) return res.status(404).json({ error: 'No encontrada' });
  res.json(tienda);
});

// ACTUALIZAR TIENDA
router.post('/:id/editar', isAdmin, async (req, res) => {
  const { nombre, direccion, ciudad, pais, latitud, longitud, telefono, email, horario, activa } = req.body;
  
  try {
    await db.query(
      'UPDATE tiendas SET nombre=?,direccion=?,ciudad=?,pais=?,latitud=?,longitud=?,telefono=?,email=?,horario=?,activa=?,actualizado_en=NOW() WHERE id=?',
      [nombre, direccion, ciudad, pais || 'Colombia', latitud, longitud, telefono, email, horario, activa ? 1 : 0, req.params.id]
    );
    res.json({ success: true, message: 'Tienda actualizada' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ELIMINAR TIENDA
router.post('/:id/eliminar', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM tiendas WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Tienda eliminada' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/toggle', isAdmin, async (req, res) => {
  try {
    const [[t]] = await db.query('SELECT activa FROM tiendas WHERE id=?', [req.params.id]);
    await db.query('UPDATE tiendas SET activa=? WHERE id=?', [t.activa ? 0 : 1, req.params.id]);
    res.json({ success: true, activa: !t.activa });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
