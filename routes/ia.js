const express = require('express');
const router = express.Router();
const db = require('../config/database');
const fetch = require('node-fetch');

// ─── GEMINI FREE API HELPER ─────────────────────────────────────
// Google Gemini API - GRATUITA, sin tarjeta de credito
// Obtener key gratis en: https://aistudio.google.com/apikey
// Modelo: gemini-2.5-flash (10 RPM, 250 req/dia gratis)
async function geminiChat(prompt, systemPrompt, historial) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = [];

  // Historial previo
  if (historial && Array.isArray(historial)) {
    historial.slice(-8).forEach(function(m) {
      if (m.rol && m.contenido) {
        contents.push({
          role: m.rol === 'user' ? 'user' : 'model',
          parts: [{ text: m.contenido }]
        });
      }
    });
  }
  // Mensaje actual
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// Gemini rapido (Flash-Lite para tareas simples)
async function geminiQuick(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.5 }
      })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ─── CHAT PAGE ───────────────────────────────────────────────────
router.get('/chat', async (req, res) => {
  res.render('ia/chat', { title: 'Asistente IA Mantiz' });
});

// ─── CHAT API ────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { mensaje, historial } = req.body;
  if (!mensaje || !mensaje.trim()) return res.status(400).json({ error: 'Mensaje vacio' });

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      respuesta: 'Hola! Soy el asistente de Mantiz. Para activar la IA gratuita, agrega tu GEMINI_API_KEY en el .env (obtenla gratis en aistudio.google.com/apikey). Sin costo, sin tarjeta!'
    });
  }

  // Contexto de productos para el asistente
  let contextProductos = '';
  try {
    const [prods] = await db.query(
      'SELECT titulo, categoria, precio, precio_descuento, descripcion FROM productos WHERE activo=1 LIMIT 20'
    );
    contextProductos = prods.map(p =>
      `- ${p.titulo} (${p.categoria}): $${(p.precio_descuento || p.precio).toLocaleString('es-CO')}`
    ).join('\n');
  } catch(e) {}

  const systemPrompt = `Eres el asistente virtual de Mantiz, tienda de ropa urbana moderna. Eres amable, directo y util.

Productos disponibles:
${contextProductos || 'Catalogo cargando...'}

Puedes ayudar con: recomendaciones de ropa, tallas, pedidos, envios ($8.99, 3-7 dias habiles), devoluciones (7 dias), pagos (tarjeta, Nequi, Daviplata, contraentrega).

Responde siempre en espanol colombiano, de forma breve y amigable. Maximo 3 oraciones por respuesta. Si no sabes algo especifico, orienta al usuario.`;

  try {
    const respuesta = await geminiChat(mensaje, systemPrompt, historial);
    if (!respuesta) throw new Error('Sin respuesta');

    // Guardar en BD si hay usuario logueado
    if (req.session.user) {
      try {
        let sesionId = req.session.chatIaId;
        if (!sesionId) {
          const [ins] = await db.query(
            'INSERT INTO chat_ia_sesiones (usuario_id, session_id) VALUES (?,?)',
            [req.session.user.id, req.sessionID]
          );
          sesionId = ins.insertId;
          req.session.chatIaId = sesionId;
        }
        await db.query('INSERT INTO chat_ia_mensajes (sesion_id, rol, contenido) VALUES (?,?,?)', [sesionId, 'user', mensaje]);
        await db.query('INSERT INTO chat_ia_mensajes (sesion_id, rol, contenido) VALUES (?,?,?)', [sesionId, 'assistant', respuesta]);
      } catch(e) { /* no bloquear */ }
    }

    res.json({ respuesta });
  } catch(e) {
    console.error('Gemini IA error:', e.message);
    res.json({
      respuesta: 'Estoy teniendo problemas en este momento. Por favor intenta de nuevo en unos segundos.'
    });
  }
});

// ─── BUSQUEDA INTELIGENTE ─────────────────────────────────────────
router.post('/busqueda-inteligente', async (req, res) => {
  const { q } = req.body;
  if (!q || !process.env.GEMINI_API_KEY) return res.json({ sugerencias: [] });

  try {
    const [prods] = await db.query('SELECT titulo, categoria FROM productos WHERE activo=1 LIMIT 60');
    const catalog = prods.map(p => `${p.titulo} (${p.categoria})`).join(', ');

    const prompt = `Catalogo de ropa: ${catalog}.
Busqueda del usuario: "${q}".
Lista los 3-5 nombres de productos del catalogo mas relevantes para esta busqueda.
Responde SOLO con los nombres separados por coma, sin explicacion ni puntos.`;

    const text = await geminiQuick(prompt);
    if (!text) return res.json({ sugerencias: [] });

    const sugerencias = text.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
    res.json({ sugerencias });
  } catch(e) {
    res.json({ sugerencias: [] });
  }
});

// ─── RECOMENDACIONES PARA INICIO ──────────────────────────────────
router.get('/recomendaciones', async (req, res) => {
  if (!req.session.user || !process.env.GEMINI_API_KEY) return res.json({ ids: [] });

  try {
    // Obtener likes del usuario
    const [likes] = await db.query(
      `SELECT p.titulo, p.categoria, p.tags FROM producto_likes pl
       JOIN productos p ON pl.producto_id=p.id
       WHERE pl.usuario_id=? ORDER BY pl.creado_en DESC LIMIT 5`,
      [req.session.user.id]
    );
    if (!likes.length) return res.json({ ids: [] });

    const [catalogo] = await db.query(
      'SELECT id, titulo, categoria, tags FROM productos WHERE activo=1 LIMIT 40'
    );

    const gustos = likes.map(l => `${l.titulo} (${l.categoria})`).join(', ');
    const catalogoStr = catalogo.map(p => `[${p.id}] ${p.titulo} (${p.categoria})`).join('\n');

    const prompt = `El usuario le gusto: ${gustos}.
Catalogo disponible:
${catalogoStr}

Selecciona los 4 IDs de productos mas similares a los gustos del usuario.
Responde SOLO con los IDs separados por coma, ej: 3,7,12,4. Nada mas.`;

    const text = await geminiQuick(prompt);
    if (!text) return res.json({ ids: [] });

    const ids = text.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)).slice(0, 4);
    res.json({ ids });
  } catch(e) {
    res.json({ ids: [] });
  }
});

module.exports = router;
