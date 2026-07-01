-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 010 — Sistema de cupones (vinculados a logros/trofeos)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cupones_usuario (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  logro_id      INT DEFAULT NULL,           -- qué logro lo generó (nullable)
  codigo        VARCHAR(30) NOT NULL UNIQUE, -- ej: CUP-AXB12-5PCT
  descuento     TINYINT NOT NULL DEFAULT 5, -- porcentaje: 5, 15 o 20
  descripcion   VARCHAR(255) DEFAULT '',
  usado         TINYINT(1) DEFAULT 0,
  usado_en      TIMESTAMP NULL DEFAULT NULL,
  pedido_id     INT DEFAULT NULL,           -- pedido donde se aplicó
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_cupones_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
