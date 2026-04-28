const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');

// LISTA PROVEEDORES
router.get('/', isAdmin, async (req, res) => {
  const [proveedores] = await db.query('SELECT * FROM proveedores ORDER BY tipo, nombre');
  res.render('admin/proveedores/lista', { title: 'Admin - Proveedores', proveedores });
});

// CREAR
router.post('/nuevo', isAdmin, async (req, res) => {
  const { nombre, tipo, telefono, email, ciudad } = req.body;
  try {
    await db.query(
      'INSERT INTO proveedores (nombre,tipo,telefono,email,ciudad) VALUES (?,?,?,?,?)',
      [nombre, tipo, telefono, email, ciudad]
    );
    req.flash('success', 'Proveedor creado');
    res.redirect('/admin/proveedores');
  } catch(e) {
    req.flash('error', e.message);
    res.redirect('/admin/proveedores');
  }
});

// EDITAR
router.post('/:id/editar', isAdmin, async (req, res) => {
  const { nombre, tipo, telefono, email, ciudad, activo } = req.body;
  try {
    await db.query(
      'UPDATE proveedores SET nombre=?,tipo=?,telefono=?,email=?,ciudad=?,activo=? WHERE id=?',
      [nombre, tipo, telefono, email, ciudad, activo ? 1 : 0, req.params.id]
    );
    req.flash('success', 'Proveedor actualizado');
    res.redirect('/admin/proveedores');
  } catch(e) {
    req.flash('error', e.message);
    res.redirect('/admin/proveedores');
  }
});

// ELIMINAR
router.post('/:id/eliminar', isAdmin, async (req, res) => {
  await db.query('DELETE FROM proveedores WHERE id=?', [req.params.id]);
  req.flash('success', 'Proveedor eliminado');
  res.redirect('/admin/proveedores');
});

module.exports = router;
