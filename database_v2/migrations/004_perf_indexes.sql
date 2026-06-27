-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 004 — Índices de rendimiento para las queries más frecuentes
-- ════════════════════════════════════════════════════════════════════════════
-- Todas las sentencias usan ADD INDEX IF NOT EXISTS (MariaDB ≥10.5 / MySQL 8+)
-- para ser idempotentes y seguras de re-ejecutar.
-- Impacto estimado por tabla/query:
--
-- productos (activo, en_inicio, total_likes)
--   → Home page: "SELECT ... WHERE en_inicio=1 AND activo=1 ORDER BY total_likes DESC"
--   → Sin índice: table scan sobre toda la tabla de productos.
--
-- productos (activo, categoria, total_likes)
--   → Catálogo filtrado: "WHERE activo=1 AND categoria=? ORDER BY total_likes DESC"
--   → Sin índice: table scan + filesort.
--
-- producto_likes (usuario_id, creado_en)
--   → Recomendaciones: "WHERE usuario_id=? ORDER BY creado_en DESC LIMIT 10"
--   → Ya existe (usuario_id, producto_id) UNIQUE, pero agregar creado_en
--     permite filesort-free ORDER BY en la misma consulta.
--
-- comentarios (producto_id, activo, creado_en)
--   → Detalle de producto: "WHERE producto_id=? AND activo=1 ORDER BY creado_en DESC"
--   → Sin índice compuesto: usa solo el índice de producto_id (partial).
--
-- visitas (usuario_id, creado_en)
--   → Analítica y recomendaciones por comportamiento reciente.
--   → Ya existe idx_visitas_creado (creado_en) de migración 002;
--     agregamos el compuesto (usuario_id, creado_en) para las queries de usuario.
-- ════════════════════════════════════════════════════════════════════════════

-- Home page query (en_inicio + activo + orden por likes)
ALTER TABLE productos
  ADD INDEX IF NOT EXISTS idx_prod_inicio_likes (activo, en_inicio, total_likes);

-- Catálogo filtrado por categoría
ALTER TABLE productos
  ADD INDEX IF NOT EXISTS idx_prod_cat_likes (activo, categoria, total_likes);

-- Búsqueda por texto (LIKE): solo parcialmente aprovechable, mejora el filtro previo
ALTER TABLE productos
  ADD INDEX IF NOT EXISTS idx_prod_activo_creado (activo, creado_en);

-- Detalle de producto: comentarios del producto, activos, ordenados por fecha
ALTER TABLE comentarios
  ADD INDEX IF NOT EXISTS idx_com_prod_activo_fecha (producto_id, activo, creado_en);

-- Recomendaciones por usuario: likes recientes
ALTER TABLE producto_likes
  ADD INDEX IF NOT EXISTS idx_likes_uid_fecha (usuario_id, creado_en);

-- Perfil público: tableros públicos de un usuario
ALTER TABLE tableros
  ADD INDEX IF NOT EXISTS idx_tab_uid_priv (usuario_id, privacidad);

-- Notificaciones: count de no leídas (muy frecuente: se consulta en cada página)
-- El índice (usuario_id, leida) ya existe en 001_social_v4.sql — este es redundante,
-- pero ADD INDEX IF NOT EXISTS lo ignora si ya existe.
ALTER TABLE notificaciones
  ADD INDEX IF NOT EXISTS idx_notif_uid_leida (usuario_id, leida);

-- Amistades: listar amigos de un usuario (ambas direcciones)
ALTER TABLE amistades
  ADD INDEX IF NOT EXISTS idx_am_receptor_estado (receptor_id, estado),
  ADD INDEX IF NOT EXISTS idx_am_solicitante_estado (solicitante_id, estado);
