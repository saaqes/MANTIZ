const db = require('../config/database');

async function attachProductGalleries(products) {
  if (!products || !products.length) return products || [];
  const ids = products.map(p => p.id).filter(Boolean);
  if (!ids.length) return products;

  let extraRows = [];
  try {
    const [rows] = await db.query(
      `SELECT producto_id, imagen FROM producto_imagenes
       WHERE producto_id IN (${ids.map(() => '?').join(',')})
       ORDER BY producto_id, orden ASC`,
      ids
    );
    extraRows = rows || [];
  } catch (e) {
    return products.map(p => ({ ...p, galeria: buildGallery(p, []) }));
  }

  const byProduct = {};
  extraRows.forEach(r => {
    if (!byProduct[r.producto_id]) byProduct[r.producto_id] = [];
    byProduct[r.producto_id].push(r.imagen);
  });

  return products.map(p => ({
    ...p,
    galeria: buildGallery(p, byProduct[p.id] || [])
  }));
}

function buildGallery(producto, extras) {
  const gallery = [];
  const add = (img) => {
    if (img && !gallery.includes(img)) gallery.push(img);
  };
  add(producto.imagen_principal);
  (extras || []).forEach(add);
  add(producto.imagen_hover);
  return gallery.length ? gallery : (producto.imagen_principal ? [producto.imagen_principal] : []);
}

module.exports = { attachProductGalleries, buildGallery };
