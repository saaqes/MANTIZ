/**
 * routes/comunidad.js  — V2
 * Cambios vs V1:
 *  - Stickers eliminados del feed público (admin sigue gestionándolos en /admin)
 *  - Feed de tableros ahora incluye preview de imágenes de pines (batch, sin N+1)
 *  - Paginación con ?page= en el feed de tableros
 *  - GET /tablero/:id  → vista de detalle de un tablero
 *  - API GET /api/tableros  → JSON paginado para carga dinámica
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ─── Página principal de Comunidad ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [tableros] = await db.query(`
      SELECT t.*, u.username, u.nombre_visible,
             u.foto_perfil_preset, u.foto_perfil_tipo, u.foto_perfil,
             COUNT(DISTINCT tp.id)  AS total_pines,
             COUNT(DISTINCT tr.id)  AS total_reacciones,
             COUNT(DISTINCT tg.id)  AS total_guardados
      FROM tableros t
      JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN tablero_pines tp ON t.id = tp.tablero_id
      LEFT JOIN tablero_reacciones tr ON t.id = tr.tablero_id
      LEFT JOIN tablero_guardados tg ON t.id = tg.tablero_id
      WHERE t.privacidad = 'publico' AND u.activo = 1
      GROUP BY t.id
      ORDER BY t.creado_en DESC, total_reacciones DESC
      LIMIT 32
    `);

    // Preview de imágenes: top 4 pines con imagen por tablero (una sola query batch)
    const previewMap = {};
    if (tableros.length) {
      const ids = tableros.map(t => t.id);
      try {
        const ph = ids.map(() => '?').join(',');
        const [pins] = await db.query(
          `SELECT tablero_id, imagen_url FROM tablero_pines
           WHERE tablero_id IN (${ph}) AND imagen_url IS NOT NULL
           ORDER BY tablero_id, creado_en DESC`,
          ids
        );
        pins.forEach(p => {
          if (!previewMap[p.tablero_id]) previewMap[p.tablero_id] = [];
          if (previewMap[p.tablero_id].length < 4) previewMap[p.tablero_id].push(p.imagen_url);
        });
      } catch(e) {}
    }
    tableros.forEach(t => { t.preview_imgs = previewMap[t.id] || []; });

    // Usuarios destacados → ahora apunta al directorio
    const [usuarios] = await db.query(`
      SELECT u.id, u.username, u.nombre_visible, u.bio,
             u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset,
             COUNT(DISTINCT t.id)   AS total_tableros,
             COUNT(DISTINCT pl.id)  AS total_likes
      FROM usuarios u
      LEFT JOIN tableros t  ON u.id = t.usuario_id AND t.privacidad='publico'
      LEFT JOIN producto_likes pl ON u.id = pl.usuario_id
      WHERE u.activo = 1
      GROUP BY u.id
      ORDER BY total_tableros DESC, total_likes DESC
      LIMIT 8
    `);

    // Imágenes recientes de pines públicos (feed "Explorar")
    const [imagenes] = await db.query(`
      SELECT tp.imagen_url, tp.titulo, t.nombre AS tablero_nombre,
             t.id AS tablero_id, u.username, u.nombre_visible
      FROM tablero_pines tp
      JOIN tableros  t ON tp.tablero_id = t.id
      JOIN usuarios  u ON t.usuario_id  = u.id
      WHERE t.privacidad='publico' AND tp.imagen_url IS NOT NULL AND u.activo=1
      ORDER BY tp.creado_en DESC LIMIT 48
    `);

    res.render('comunidad/index', {
      title: 'Comunidad', tableros, usuarios, imagenes
    });
  } catch(e) {
    console.error('[comunidad]', e.message);
    res.render('comunidad/index', {
      title: 'Comunidad', tableros: [], usuarios: [], imagenes: []
    });
  }
});

// ─── Vista de detalle de un tablero ──────────────────────────────────────────
router.get('/tablero/:id', async (req, res) => {
  try {
    const [[tablero]] = await db.query(`
      SELECT t.*, u.username, u.nombre_visible,
             u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset,
             u.banner, u.banner_tipo, u.banner_preset,
             COUNT(DISTINCT tp.id)  AS total_pines,
             COUNT(DISTINCT tr.id)  AS total_reacciones,
             COUNT(DISTINCT tg.id)  AS total_guardados
      FROM tableros t
      JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN tablero_pines tp ON t.id = tp.tablero_id
      LEFT JOIN tablero_reacciones tr ON t.id = tr.tablero_id
      LEFT JOIN tablero_guardados tg ON t.id = tg.tablero_id
      WHERE t.id = ? AND t.privacidad = 'publico' AND u.activo = 1
      GROUP BY t.id
    `, [req.params.id]);

    if (!tablero) return res.status(404).render('404', { title: 'Tablero no encontrado' });

    const [pines] = await db.query(`
      SELECT tp.*, p.titulo AS prod_titulo, p.imagen_principal,
             p.precio, p.precio_descuento, p.id AS prod_id
      FROM tablero_pines tp
      LEFT JOIN productos p ON tp.producto_id = p.id
      WHERE tp.tablero_id = ?
      ORDER BY tp.creado_en DESC
    `, [req.params.id]);

    // Incrementar vista (best-effort)
    db.query('UPDATE tableros SET total_vistas=COALESCE(total_vistas,0)+1 WHERE id=?',
      [req.params.id]).catch(() => {});

    // Estado guardado del usuario
    let yaGuardado = false;
    if (req.session.user) {
      try {
        const [[g]] = await db.query(
          'SELECT id FROM tablero_guardados WHERE tablero_id=? AND usuario_id=?',
          [req.params.id, req.session.user.id]
        );
        yaGuardado = !!g;
      } catch(e) {}
    }

    res.render('comunidad/tablero', {
      title: tablero.nombre, tablero, pines, yaGuardado
    });
  } catch(e) {
    console.error('[comunidad/tablero]', e.message);
    res.status(500).render('error', { title: 'Error', message: 'No se pudo cargar el tablero.' });
  }
});

// ─── API: tableros paginados (para carga dinámica) ────────────────────────────
router.get('/api/tableros', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(24, parseInt(req.query.limit) || 12);
  const q     = (req.query.q || '').trim();
  const offset = (page - 1) * limit;
  try {
    let where = "t.privacidad='publico' AND u.activo=1";
    const params = [];
    if (q) { where += ' AND (t.nombre LIKE ? OR t.descripcion LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

    const [tableros] = await db.query(`
      SELECT t.*, u.username, u.nombre_visible,
             u.foto_perfil_preset, u.foto_perfil_tipo, u.foto_perfil,
             COUNT(DISTINCT tp.id) AS total_pines,
             COUNT(DISTINCT tr.id) AS total_reacciones
      FROM tableros t JOIN usuarios u ON t.usuario_id=u.id
      LEFT JOIN tablero_pines tp ON t.id=tp.tablero_id
      LEFT JOIN tablero_reacciones tr ON t.id=tr.tablero_id
      WHERE ${where}
      GROUP BY t.id ORDER BY t.creado_en DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT t.id) AS total FROM tableros t JOIN usuarios u ON t.usuario_id=u.id WHERE ${where}`,
      params
    );
    res.json({ tableros, total, page, pages: Math.ceil(total / limit) });
  } catch(e) {
    res.status(500).json({ error: db.friendlyDbError(e), tableros: [], total: 0 });
  }
});

// ─── Guardar tablero ─────────────────────────────────────────────────────────
router.post('/tablero/:id/guardar', isAuthenticated, async (req, res) => {
  try {
    const [[ex]] = await db.query(
      'SELECT id FROM tablero_guardados WHERE tablero_id=? AND usuario_id=?',
      [req.params.id, req.session.user.id]
    );
    if (ex) {
      await db.query('DELETE FROM tablero_guardados WHERE id=?', [ex.id]);
      return res.json({ guardado: false });
    }
    await db.query('INSERT INTO tablero_guardados (tablero_id, usuario_id) VALUES (?,?)',
      [req.params.id, req.session.user.id]);
    res.json({ guardado: true });
  } catch(e) { res.status(500).json({ error: db.friendlyDbError(e) }); }
});

// ─── Reaccionar a tablero ─────────────────────────────────────────────────────
router.post('/tablero/:id/reaccion', isAuthenticated, async (req, res) => {
  const { tipo } = req.body;
  const tipos = ['like', 'love', 'fuego', 'wow'];
  if (!tipos.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  try {
    const [[ex]] = await db.query(
      'SELECT * FROM tablero_reacciones WHERE tablero_id=? AND usuario_id=?',
      [req.params.id, req.session.user.id]
    );
    if (ex && ex.tipo === tipo) {
      await db.query('DELETE FROM tablero_reacciones WHERE id=?', [ex.id]);
      return res.json({ reaccion: null });
    }
    await db.query(
      'INSERT INTO tablero_reacciones (tablero_id,usuario_id,tipo) VALUES (?,?,?) ON DUPLICATE KEY UPDATE tipo=VALUES(tipo)',
      [req.params.id, req.session.user.id, tipo]
    );
    res.json({ reaccion: tipo });
  } catch(e) { res.status(500).json({ error: db.friendlyDbError(e) }); }
});

// ─── Vista (contador) ────────────────────────────────────────────────────────
router.post('/tablero/:id/vista', async (req, res) => {
  try {
    await db.query('UPDATE tableros SET total_vistas=COALESCE(total_vistas,0)+1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.json({ success: false }); }
});

// ─── Stickers: listar (solo para uso interno / admin) ────────────────────────
// El tab de stickers fue eliminado del feed público.
// Este endpoint se mantiene para el panel admin.
router.get('/stickers', async (req, res) => {
  try {
    const [stickers] = await db.query(
      'SELECT * FROM stickers WHERE activo=1 AND moderado=1 ORDER BY tipo, categoria, nombre'
    );
    res.json({ stickers });
  } catch(e) { res.status(500).json({ error: db.friendlyDbError(e) }); }
});

module.exports = router;
