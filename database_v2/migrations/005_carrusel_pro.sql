-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 005 — Editor de banners profesional: columnas faltantes
-- ════════════════════════════════════════════════════════════════════════════
-- Auditoría encontró que el formulario de admin/carrusel.ejs ya recolectaba
-- `boton_url` pero esa columna NUNCA existió en la tabla `carrusel` (a
-- diferencia de content_type/mostrar_boton/boton_texto/countdown_fecha, que
-- sí se agregaron en database.sql). El botón del hero público estaba
-- hardcodeado a "/productos" sin importar lo que el admin configurara.
--
-- Esta migración agrega:
--   boton_url       — destino del botón CTA (ya esperado por el form, faltaba)
--   destino_tipo    — tipo de destino: url personalizada / producto / categoría / página
--   destino_valor   — el id de producto, slug de categoría, o path de página
--   animacion       — animación de entrada del slide (fade-in, fade-up, zoom-in, etc.)
--   posicion_texto  — alineación del texto (izquierda/centro/derecha)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS boton_url VARCHAR(255) DEFAULT '/productos';
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS destino_tipo ENUM('url','producto','categoria','pagina') DEFAULT 'url';
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS destino_valor VARCHAR(255) DEFAULT NULL;
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS animacion ENUM('fade-in','fade-up','fade-left','fade-right','zoom-in','zoom-out','scale','slide','ninguna') DEFAULT 'fade-in';
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS posicion_texto ENUM('izquierda','centro','derecha') DEFAULT 'centro';
