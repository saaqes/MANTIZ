-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 009 — Notificaciones Push reales (PWA)
-- ════════════════════════════════════════════════════════════════════════════

-- Suscripciones push del navegador, una fila por dispositivo/navegador en el
-- que el usuario aceptó recibir notificaciones (un usuario puede tener varias:
-- celular + computador, por ejemplo).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  endpoint    VARCHAR(700) NOT NULL,
  p256dh      VARCHAR(255) NOT NULL,
  auth        VARCHAR(255) NOT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_endpoint (endpoint(255)),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_push_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preferencia explícita del usuario (independiente del permiso del navegador):
-- permite que el usuario desactive las notificaciones desde la app sin tener
-- que revocar el permiso a nivel de navegador.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notificaciones_push TINYINT(1) DEFAULT 1;
