const express = require('express');
const router = express.Router();
const db = require('../config/database');

// MAPA DE TIENDAS (público)
router.get('/', async (req, res) => {
  try {
    const [tiendas] = await db.query('SELECT * FROM tiendas WHERE activa = 1 ORDER BY ciudad');
    res.render('tiendas/mapa', { title: 'Nuestras Tiendas', tiendas });
  } catch(e) {
    console.error(e);
    res.render('tiendas/mapa', { title: 'Nuestras Tiendas', tiendas: [] });
  }
});

// API: obtener tiendas JSON
router.get('/api', async (req, res) => {
  try {
    const [tiendas] = await db.query('SELECT * FROM tiendas WHERE activa = 1');
    res.json(tiendas);
  } catch(e) {
    res.status(500).json({ error: 'Error al obtener tiendas' });
  }
});

module.exports = router;
