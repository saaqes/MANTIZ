/**
 * routes/opiniones.js
 * Encuestas y votaciones: admin crea, usuarios responden y sugieren
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ─── GET lista de encuestas activas ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const uid = req.session.user?.id || null;
    const [encuestas] = await db.query(
      `SELECT e.*, u.nombre_visible as creador,
              (SELECT COUNT(*) FROM encuesta_votos WHERE encuesta_id=e.id) as total_votos,
              (SELECT COUNT(*) FROM encuesta_opciones WHERE encuesta_id=e.id) as total_opciones
       FROM encuestas e JOIN usuarios u ON e.creado_por=u.id
       WHERE e.activa=1 AND (e.fecha_cierre IS NULL OR e.fecha_cierre >= CURDATE())
       ORDER BY e.creado_en DESC`
    );

    let misVotos = {};
    if (uid) {
      const [votos] = await db.query(
        'SELECT encuesta_id, opcion_id FROM encuesta_votos WHERE usuario_id=?', [uid]
      );
      votos.forEach(v => { misVotos[v.encuesta_id] = v.opcion_id; });
    }

    // Cargar opciones para cada encuesta
    for (const enc of encuestas) {
      const [opciones] = await db.query(
        'SELECT * FROM encuesta_opciones WHERE encuesta_id=? ORDER BY orden, id',
        [enc.id]
      );
      enc.opciones = opciones;
      enc.mi_voto = misVotos[enc.id] || null;
    }

    res.render('opiniones/index', { title: 'Opiniones', encuestas, uid });
  } catch(e) {
    console.error(e);
    res.render('opiniones/index', { title: 'Opiniones', encuestas: [], uid: null });
  }
});

// ─── Votar en encuesta ────────────────────────────────────────────────────────
router.post('/:id/votar', isAuthenticated, async (req, res) => {
  const { opcion_id, sugerencia } = req.body;
  const uid = req.session.user.id;
  try {
    const [[enc]] = await db.query(
      'SELECT * FROM encuestas WHERE id=? AND activa=1 AND (fecha_cierre IS NULL OR fecha_cierre >= CURDATE())',
      [req.params.id]
    );
    if (!enc) return res.status(404).json({ error: 'Encuesta no disponible' });

    const [[opcion]] = await db.query(
      'SELECT * FROM encuesta_opciones WHERE id=? AND encuesta_id=?',
      [opcion_id, req.params.id]
    );
    if (!opcion) return res.status(400).json({ error: 'Opción inválida' });

    // Si ya votó, actualizar
    const [[yaVoto]] = await db.query(
      'SELECT * FROM encuesta_votos WHERE encuesta_id=? AND usuario_id=?', [req.params.id, uid]
    );
    if (yaVoto) {
      // Restar voto anterior
      await db.query('UPDATE encuesta_opciones SET votos=GREATEST(votos-1,0) WHERE id=?', [yaVoto.opcion_id]);
      await db.query('UPDATE encuesta_votos SET opcion_id=?, sugerencia=? WHERE id=?',
        [opcion_id, sugerencia || null, yaVoto.id]);
    } else {
      await db.query(
        'INSERT INTO encuesta_votos (encuesta_id, opcion_id, usuario_id, sugerencia) VALUES (?,?,?,?)',
        [req.params.id, opcion_id, uid, sugerencia || null]
      );
      // Logro: encuesta respondida
      await actualizarLogro(uid, 'voz_activa', db);
    }
    // Sumar voto nuevo
    await db.query('UPDATE encuesta_opciones SET votos=votos+1 WHERE id=?', [opcion_id]);

    // Retornar opciones actualizadas con % 
    const [opciones] = await db.query(
      'SELECT * FROM encuesta_opciones WHERE encuesta_id=? ORDER BY orden, id', [req.params.id]
    );
    const totalVotos = opciones.reduce((s, o) => s + o.votos, 0);
    const resultados = opciones.map(o => ({
      ...o,
      porcentaje: totalVotos > 0 ? Math.round((o.votos / totalVotos) * 100) : 0
    }));

    res.json({ success: true, resultados, total_votos: totalVotos });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: crear encuesta ────────────────────────────────────────────────────
router.post('/crear', isAdmin, async (req, res) => {
  const { titulo, descripcion, tipo_respuesta, permite_sugerencias, fecha_cierre, opciones } = req.body;
  try {
    const [r] = await db.query(
      'INSERT INTO encuestas (titulo, descripcion, tipo_respuesta, permite_sugerencias, fecha_cierre, creado_por) VALUES (?,?,?,?,?,?)',
      [titulo, descripcion||'', tipo_respuesta||'botones',
       permite_sugerencias ? 1 : 0, fecha_cierre || null, req.session.user.id]
    );
    const encId = r.insertId;

    // Insertar opciones
    const opcionesArr = Array.isArray(opciones) ? opciones : [opciones].filter(Boolean);
    for (let i = 0; i < opcionesArr.length; i++) {
      const op = opcionesArr[i];
      if (typeof op === 'string') {
        await db.query('INSERT INTO encuesta_opciones (encuesta_id, texto, orden) VALUES (?,?,?)', [encId, op, i]);
      } else if (op && op.texto) {
        await db.query('INSERT INTO encuesta_opciones (encuesta_id, texto, color, orden) VALUES (?,?,?,?)',
          [encId, op.texto, op.color||null, i]);
      }
    }

    res.json({ success: true, id: encId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: cerrar/abrir encuesta ────────────────────────────────────────────
router.post('/:id/toggle', isAdmin, async (req, res) => {
  const [[e]] = await db.query('SELECT activa FROM encuestas WHERE id=?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  await db.query('UPDATE encuestas SET activa=? WHERE id=?', [e.activa ? 0 : 1, req.params.id]);
  res.json({ success: true, activa: !e.activa });
});

// ─── Admin: eliminar encuesta ─────────────────────────────────────────────────
router.delete('/:id', isAdmin, async (req, res) => {
  await db.query('DELETE FROM encuestas WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ─── Helper: actualizar progreso de logros ────────────────────────────────────
async function actualizarLogro(userId, clave, db) {
  try {
    const [[logro]] = await db.query('SELECT * FROM logros WHERE clave=?', [clave]);
    if (!logro) return;
    const [[ul]] = await db.query(
      'SELECT * FROM usuario_logros WHERE usuario_id=? AND logro_id=?', [userId, logro.id]
    );
    if (ul && ul.desbloqueado) return; // ya desbloqueado

    const nuevoProg = (ul?.progreso || 0) + 1;
    const desbloqueado = nuevoProg >= logro.umbral;

    await db.query(
      `INSERT INTO usuario_logros (usuario_id, logro_id, progreso, desbloqueado, fecha_desbloqueo)
       VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE progreso=VALUES(progreso),
       desbloqueado=VALUES(desbloqueado), fecha_desbloqueo=VALUES(fecha_desbloqueo)`,
      [userId, logro.id, nuevoProg, desbloqueado ? 1 : 0, desbloqueado ? new Date() : null]
    );

    if (desbloqueado) {
      await db.query(
        'INSERT INTO notificaciones (usuario_id,tipo,titulo,mensaje,icono,color) VALUES (?,?,?,?,?,?)',
        [userId, 'noticia', `¡Logro desbloqueado: ${logro.nombre}!`,
         logro.descripcion, logro.icono || '🏆', '#ffd700']
      );
    }
  } catch(e) { console.error('Error logro:', e.message); }
}

module.exports = router;
module.exports.actualizarLogro = actualizarLogro;
