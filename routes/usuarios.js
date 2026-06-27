/**
 * routes/usuarios.js
 * Directorio de usuarios — página pública + API paginada
 */
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

// ── GET /usuarios — página del directorio ────────────────────────────────
router.get('/', (req, res) => {
  res.render('usuarios/directorio', { title: 'Directorio de Usuarios' });
});

// ── GET /usuarios/api — API paginada para el directorio ──────────────────
router.get('/api', async (req, res) => {
  const q      = (req.query.q      || '').trim();
  const filtro = req.query.filtro  || 'todos';
  const orden  = req.query.orden   || 'reciente';
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(40, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const sesionUid = req.session.user?.id || null;

  const params = [];
  let where = 'u.activo = 1';

  // Búsqueda por nombre o username
  if (q) {
    where += ' AND (u.username LIKE ? OR u.nombre_visible LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  // Filtros especiales
  if (filtro === 'con_logros') {
    where += ' AND (SELECT COUNT(*) FROM usuario_logros ul2 WHERE ul2.usuario_id=u.id AND ul2.desbloqueado=1) > 0';
  } else if (filtro === 'con_conexiones') {
    where += ' AND (SELECT COUNT(*) FROM perfil_conexiones pc2 WHERE pc2.usuario_id=u.id AND pc2.publico=1) > 0';
  }

  // Ordenamiento
  let orderBy;
  switch (orden) {
    case 'amigos':   orderBy = 'total_amigos DESC, u.creado_en DESC'; break;
    case 'logros':   orderBy = 'total_logros DESC, u.creado_en DESC'; break;
    case 'tableros': orderBy = 'total_tableros DESC, u.creado_en DESC'; break;
    default:         orderBy = 'u.creado_en DESC';
  }

  try {
    // Query principal con subqueries (más legible y portable que muchos JOINs con GROUP BY)
    const sql = `
      SELECT
        u.id, u.username, u.nombre_visible, u.bio, u.rol,
        u.foto_perfil, u.foto_perfil_tipo, u.foto_perfil_preset,
        u.banner, u.banner_tipo, u.banner_preset,
        COALESCE(pc.color_primario, '#e91e8c') AS color_primario,
        (SELECT COUNT(*) FROM amistades a
           WHERE a.estado='aceptada' AND (a.solicitante_id=u.id OR a.receptor_id=u.id)
        ) AS total_amigos,
        (SELECT COUNT(*) FROM tableros t
           WHERE t.usuario_id=u.id AND t.privacidad='publico'
        ) AS total_tableros,
        (SELECT COUNT(DISTINCT pl.id) FROM producto_likes pl WHERE pl.usuario_id=u.id) AS total_likes,
        (SELECT COUNT(*) FROM usuario_logros ul
           WHERE ul.usuario_id=u.id AND ul.desbloqueado=1
        ) AS total_logros
      FROM usuarios u
      LEFT JOIN perfil_config pc ON pc.usuario_id = u.id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(sql, [...params, limit, offset]);

    // Count total sin LIMIT
    const countSql = `SELECT COUNT(*) AS total FROM usuarios u WHERE ${where}`;
    const [[{ total }]] = await db.query(countSql, params);

    // Enriquecer cada usuario con sus conexiones y logros (batch para evitar N+1)
    const ids = rows.map(u => u.id);
    let conexMap = {}, logrosMap = {};

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');

      // Conexiones públicas
      try {
        const [conex] = await db.query(
          `SELECT usuario_id, plataforma, username FROM perfil_conexiones
           WHERE usuario_id IN (${placeholders}) AND publico=1 ORDER BY plataforma`,
          ids
        );
        conex.forEach(c => {
          if (!conexMap[c.usuario_id]) conexMap[c.usuario_id] = [];
          conexMap[c.usuario_id].push(c);
        });
      } catch(e) { /* tabla puede no existir en instalaciones antiguas */ }

      // Logros desbloqueados (top 5 por usuario)
      try {
        const [logros] = await db.query(
          `SELECT ul.usuario_id, l.icono, l.nombre, l.descripcion
           FROM usuario_logros ul
           JOIN logros l ON l.id = ul.logro_id
           WHERE ul.usuario_id IN (${placeholders}) AND ul.desbloqueado=1
           ORDER BY ul.fecha_desbloqueo DESC`,
          ids
        );
        logros.forEach(l => {
          if (!logrosMap[l.usuario_id]) logrosMap[l.usuario_id] = [];
          if (logrosMap[l.usuario_id].length < 5) logrosMap[l.usuario_id].push(l);
        });
      } catch(e) {}

      // Estado de amistad con el usuario de la sesión
      let amistadMap = {};
      if (sesionUid) {
        try {
          const [amistades] = await db.query(
            `SELECT
               CASE WHEN solicitante_id=? THEN receptor_id ELSE solicitante_id END AS otro_uid,
               estado,
               CASE WHEN solicitante_id=? THEN 'enviada' ELSE 'recibida' END AS direccion
             FROM amistades
             WHERE (solicitante_id=? AND receptor_id IN (${placeholders}))
                OR (receptor_id=? AND solicitante_id IN (${placeholders}))`,
            [sesionUid, sesionUid, sesionUid, ...ids, sesionUid, ...ids]
          );
          amistades.forEach(a => { amistadMap[a.otro_uid] = a.estado; });
        } catch(e) {}
      }

      rows.forEach(u => {
        u.conexiones     = conexMap[u.id] || [];
        u.logros         = logrosMap[u.id] || [];
        u.estado_amistad = sesionUid ? (amistadMap[u.id] || null) : null;
      });
    }

    res.json({ usuarios: rows, total, page, pages: Math.ceil(total / limit) });
  } catch(e) {
    console.error('[usuarios/api]', e.message);
    res.status(500).json({ error: db.friendlyDbError(e), usuarios: [], total: 0 });
  }
});

module.exports = router;
