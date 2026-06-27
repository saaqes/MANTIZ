const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

// ── MAPA DE TIENDAS (público, solo lectura) ─────────────────────────────
// Antes mostraba solo activa=1. Ahora muestra TODAS (activas e inactivas)
// para que el usuario sepa qué sucursales existen aunque estén cerradas.
// El mapa las distingue visualmente: pin rosa = abierta, pin gris = cerrada.
router.get('/', async (req, res) => {
  try {
    const [tiendas] = await db.query(
      'SELECT * FROM tiendas ORDER BY activa DESC, ciudad ASC'
    );
    res.render('tiendas/mapa', { title: 'Nuestras Sucursales', tiendas });
  } catch (e) {
    console.error('[tiendas/mapa]', e.message);
    res.render('tiendas/mapa', { title: 'Nuestras Sucursales', tiendas: [] });
  }
});

// ── API JSON (para búsqueda AJAX u otras vistas) ─────────────────────────
router.get('/api', async (req, res) => {
  try {
    const [tiendas] = await db.query('SELECT * FROM tiendas WHERE activa = 1 ORDER BY ciudad');
    res.json({ tiendas });
  } catch (e) {
    res.status(500).json({ error: db.friendlyDbError(e) });
  }
});

module.exports = router;
