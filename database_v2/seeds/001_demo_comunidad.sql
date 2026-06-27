-- ════════════════════════════════════════════════════════════════════════════
-- SEED OPCIONAL — Datos de ejemplo para probar Comunidad/Opiniones en local
-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ Ejecución MANUAL únicamente (no la corre migrate.js):
--   mysql -u <user> -p <db> < database_v2/seeds/001_demo_comunidad.sql
--
-- No usa INSERT IGNORE con UNIQUE (encuestas no tiene clave única natural),
-- así que si lo corres más de una vez creará encuestas duplicadas. Pensado
-- para una sola vez en un entorno de desarrollo vacío.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO encuestas (titulo, descripcion, tipo_respuesta, activa, permite_sugerencias, creado_por)
SELECT '¿Qué categoría te gustaría ver más?', 'Ayúdanos a priorizar el catálogo', 'single', 1, 1, id
FROM usuarios WHERE rol='admin' LIMIT 1;

SET @encuesta_id = LAST_INSERT_ID();

INSERT INTO encuesta_opciones (encuesta_id, texto, orden) VALUES
  (@encuesta_id, 'Streetwear Y2K', 1),
  (@encuesta_id, 'Accesorios', 2),
  (@encuesta_id, 'Ediciones limitadas / 3D', 3);
