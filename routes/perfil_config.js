const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const fetch = require('node-fetch');

// GET config
router.get('/', isAuthenticated, async (req, res) => {
  const [[cfg]] = await db.query('SELECT * FROM perfil_config WHERE usuario_id=?', [req.session.user.id]);
  res.json(cfg || {});
});

// SAVE config
router.post('/', isAuthenticated, async (req, res) => {
  const { color_primario, tema, fondo_tipo, fondo_valor, fondo_blur, pais, idioma, metodo_pago_pref } = req.body;
  try {
    await db.query(
      `INSERT INTO perfil_config (usuario_id,color_primario,tema,fondo_tipo,fondo_valor,fondo_blur,pais,idioma,metodo_pago_pref)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         color_primario=VALUES(color_primario),tema=VALUES(tema),
         fondo_tipo=VALUES(fondo_tipo),fondo_valor=VALUES(fondo_valor),
         fondo_blur=VALUES(fondo_blur),pais=VALUES(pais),
         idioma=VALUES(idioma),metodo_pago_pref=VALUES(metodo_pago_pref)`,
      [req.session.user.id, color_primario||'#e91e8c', tema||'oscuro', fondo_tipo||'color',
       fondo_valor||'#0a0a0a', fondo_blur||0, pais||'Colombia', idioma||'es', metodo_pago_pref||'tarjeta']
    );
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET widgets
router.get('/widgets', isAuthenticated, async (req, res) => {
  const [widgets] = await db.query('SELECT * FROM perfil_widgets WHERE usuario_id=? ORDER BY orden', [req.session.user.id]);
  res.json({ widgets });
});

// ADD widget
router.post('/widgets', isAuthenticated, async (req, res) => {
  const { tipo, titulo, subtitulo, imagen_url, color_acento } = req.body;
  const [existing] = await db.query('SELECT id FROM perfil_widgets WHERE usuario_id=?', [req.session.user.id]);
  if (existing.length >= 3) return res.status(400).json({ error: 'Maximo 3 widgets' });
  const [r] = await db.query(
    'INSERT INTO perfil_widgets (usuario_id,tipo,titulo,subtitulo,imagen_url,color_acento,orden) VALUES (?,?,?,?,?,?,?)',
    [req.session.user.id, tipo, titulo, subtitulo||'', imagen_url||'', color_acento||'#e91e8c', existing.length]
  );
  res.json({ success: true, id: r.insertId });
});

// DELETE widget
router.delete('/widgets/:id', isAuthenticated, async (req, res) => {
  await db.query('DELETE FROM perfil_widgets WHERE id=? AND usuario_id=?', [req.params.id, req.session.user.id]);
  res.json({ success: true });
});

// SEARCH widget via Gemini (GRATIS)
router.post('/widgets/buscar', isAuthenticated, async (req, res) => {
  const { query, tipo } = req.body;
  if (!query || !tipo) return res.status(400).json({ error: 'Faltan datos' });

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Fallback sin IA - retorna placeholder
    return res.json({
      results: [{
        titulo: query,
        subtitulo: tipo === 'juego' ? 'Videojuego' : tipo === 'musica' ? 'Artista' : 'Pelicula',
        imagen_url: `https://via.placeholder.com/80x80/111/e91e8c?text=${encodeURIComponent(query.charAt(0).toUpperCase())}`,
        descripcion: query
      }]
    });
  }

  try {
    const tipoLabels = { juego: 'videogame', musica: 'music album or artist', pelicula: 'movie or TV show' };
    const prompt = `Search information about "${query}" as a ${tipoLabels[tipo] || tipo}.
Return ONLY valid JSON, no markdown, no explanation:
{"results":[{"titulo":"exact official name","subtitulo":"developer/artist/director","imagen_url":"real working cover image URL from internet","descripcion":"one sentence description"}]}
Return 1 to 3 results maximum. Only JSON.`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.3 }
        })
      }
    );
    const data = await r.json();
    if (data.error) throw new Error(data.error.message);

    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '{"results":[]}')
      .replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch(e) {
      res.json({ results: [{ titulo: query, subtitulo: tipo, imagen_url: '', descripcion: '' }] });
    }
  } catch(e) {
    console.error('Widget search error:', e.message);
    res.json({ results: [] });
  }
});

module.exports = router;
