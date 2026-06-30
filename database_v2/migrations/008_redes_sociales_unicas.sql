-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 008 — Redes sociales: lista fija de 9 plataformas, sin duplicados
-- ════════════════════════════════════════════════════════════════════════════
-- El sistema anterior (migración 007) permitía crear redes sociales con
-- nombre libre desde el admin, sin restricción de unicidad — un admin podía
-- crear "Instagram" dos veces por error. Esta migración:
--   1. Agrega las 2 plataformas que faltaban en el seed original (Discord,
--      Telegram) para completar la lista exacta de 9 requerida.
--   2. Añade un índice UNIQUE sobre `nombre` para que la base de datos
--      misma impida duplicados, sin importar qué haga el código de arriba.
-- ════════════════════════════════════════════════════════════════════════════

-- Completar las 9 plataformas (idempotente, no duplica las ya existentes)
INSERT IGNORE INTO redes_sociales (nombre, icono, url, color, visible, orden) VALUES
  ('Discord',  'bi bi-discord',  '', '#5865f2', 0, 8),
  ('Telegram', 'bi bi-telegram', '', '#26a5e4', 0, 9);

-- Des-duplicar registros existentes antes de aplicar la restricción única
-- (por si una instalación ya tenía duplicados creados con el sistema
-- anterior, que no tenía esta validación). Conserva el registro más
-- antiguo (MIN id) de cada nombre repetido y elimina el resto.
DELETE r1 FROM redes_sociales r1
INNER JOIN redes_sociales r2
  ON r1.nombre = r2.nombre AND r1.id > r2.id;

-- Restricción de unicidad real a nivel de base de datos: ningún nombre de
-- red social puede repetirse, sin importar la vía de inserción.
CREATE UNIQUE INDEX IF NOT EXISTS idx_redes_nombre_unico ON redes_sociales (nombre);
