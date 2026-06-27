-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 003 — Vistas SQL útiles
-- ════════════════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE VIEW es idempotente y no afecta tablas existentes.
-- Estas vistas sirven de base para futuras pantallas (directorio de
-- usuarios, categorías "Más vendidos"/"Destacados" del catálogo).
-- ════════════════════════════════════════════════════════════════════════════

-- Resumen de perfil: amigos, tableros públicos, logros desbloqueados.
-- Útil para el "Directorio de usuarios" (tarjetas con estadísticas).
CREATE OR REPLACE VIEW vw_perfil_resumen AS
SELECT
  u.id AS usuario_id,
  u.username,
  u.nombre_visible,
  u.foto_perfil,
  u.foto_perfil_tipo,
  u.foto_perfil_preset,
  (SELECT COUNT(*) FROM amistades a
     WHERE a.estado='aceptada' AND (a.solicitante_id=u.id OR a.receptor_id=u.id)) AS total_amigos,
  (SELECT COUNT(*) FROM tableros t WHERE t.usuario_id=u.id AND t.privacidad='publico') AS total_tableros_publicos,
  (SELECT COUNT(*) FROM usuario_logros ul WHERE ul.usuario_id=u.id AND ul.desbloqueado=1) AS total_logros
FROM usuarios u
WHERE u.activo=1;

-- Productos populares: combina likes, visitas y calificación en un solo
-- score, para alimentar categorías "Más vendidos" / "Destacados" / "Cerca de ti".
CREATE OR REPLACE VIEW vw_productos_populares AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM visitas v WHERE v.producto_id=p.id) AS total_visitas_real,
  (p.total_likes * 3 + p.total_visitas + p.total_calificaciones * 2) AS score_popularidad
FROM productos p
WHERE p.activo=1;
