-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 010 — Notificación visual de logros (estilo trofeo PlayStation)
-- ════════════════════════════════════════════════════════════════════════════
-- Separa "ya existe como notificación en la campana" (que ya funcionaba) de
-- "ya se mostró el popup visual deslizante" (nuevo) — son dos cosas distintas:
-- el popup debe aparecer UNA sola vez justo al desbloquear, mientras que la
-- notificación de campana queda guardada para consulta posterior indefinida.

ALTER TABLE usuario_logros ADD COLUMN IF NOT EXISTS popup_mostrado TINYINT(1) DEFAULT 0;
