-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 002 — Índices de rendimiento
-- ════════════════════════════════════════════════════════════════════════════
-- `visitas` se usa para "más vendidos", "populares", "cerca de ti" y
-- analítica, pero no tenía índices en las columnas por las que se filtra/agrupa
-- (producto_id, creado_en, pagina). Sin estos índices, esas consultas hacen
-- table scan completo a medida que crece la tabla.
-- ADD INDEX IF NOT EXISTS es seguro de re-ejecutar (MariaDB 10.5+/MySQL 8.0.29+,
-- igual que ADD COLUMN IF NOT EXISTS ya usado en 000_schema_base.sql).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE visitas
  ADD INDEX IF NOT EXISTS idx_visitas_producto (producto_id),
  ADD INDEX IF NOT EXISTS idx_visitas_creado (creado_en),
  ADD INDEX IF NOT EXISTS idx_visitas_pagina (pagina);
