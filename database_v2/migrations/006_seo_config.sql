-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 006 — Configuración SEO por defecto
-- ════════════════════════════════════════════════════════════════════════════
-- `configuracion_sitio` ya es una tabla clave/valor genérica (usada para logo,
-- nombre_tienda, colores). El middleware global en app.js ya hace
-- `SELECT clave, valor FROM configuracion_sitio` en cada request y expone todo
-- como `sitio.*` — así que agregar estas claves nuevas NO requiere ningún
-- cambio de código en el middleware, solo estos INSERT IGNORE.
--
-- meta_descripcion — descripción global por defecto (se usa si una página no
--                     define una propia, p.ej. fichas de producto sí la
--                     generan dinámicamente a partir de su descripción real)
-- meta_keywords     — palabras clave globales por defecto
-- og_image          — imagen social por defecto (Open Graph / Twitter Card)
--                      cuando una página no tiene una imagen propia
-- ════════════════════════════════════════════════════════════════════════════

INSERT IGNORE INTO configuracion_sitio (clave, valor, tipo, descripcion) VALUES
  ('meta_descripcion', 'MANTIZ — Moda urbana y streetwear Y2K. Ropa, accesorios y piezas exclusivas con probador virtual y modelos 3D.', 'texto', 'Descripción SEO global del sitio (meta description)'),
  ('meta_keywords', 'mantiz, ropa y2k, streetwear, moda urbana, ropa online colombia, probador virtual', 'texto', 'Palabras clave SEO globales'),
  ('og_image', '', 'imagen', 'Imagen social por defecto (Open Graph / Twitter Card) cuando una página no define una propia');
