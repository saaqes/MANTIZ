-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 007 — Corrección y mejoras completas del sistema
-- ════════════════════════════════════════════════════════════════════════════
-- Se ejecuta automáticamente al iniciar el servidor (database_v2/migrate.js).
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / INSERT IGNORE,
-- por lo que es seguro en bases de datos ya pobladas.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. IMAGEN HOVER EN PRODUCTOS (efecto al pasar el mouse en las cards) ────
-- El CSS y las vistas ya esperaban `imagen_hover` (.pc-img-hover en header.ejs
-- y product-card en /productos), pero la columna nunca existió en la BD.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_hover VARCHAR(255) DEFAULT NULL;

-- ── 2. BANNER SECUNDARIO — paridad con el editor principal ─────────────────
-- carrusel_marca solo tenía imagen/titulo/subtitulo/orden/activo. El editor
-- principal (`carrusel`) ya soporta botón+destino+color desde la migración
-- 005; ahora el secundario tiene las mismas capacidades.
ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS boton_texto VARCHAR(80) DEFAULT NULL;
ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS boton_url VARCHAR(255) DEFAULT '/productos';
ALTER TABLE carrusel_marca ADD COLUMN IF NOT EXISTS color_acento VARCHAR(20) DEFAULT '#e91e8c';

-- ── 3. REDES SOCIALES (configurables desde el panel admin) ──────────────────
CREATE TABLE IF NOT EXISTS redes_sociales (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(50) NOT NULL,
  icono     VARCHAR(60) NOT NULL,        -- clase bootstrap-icons, p.ej. 'bi bi-instagram'
  url       VARCHAR(500) DEFAULT '',
  color     VARCHAR(20)  DEFAULT '#e91e8c',
  visible   TINYINT(1)   DEFAULT 1,
  orden     INT          DEFAULT 0,
  creado_en TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO redes_sociales (id, nombre, icono, url, color, visible, orden) VALUES
  (1, 'Facebook',  'bi bi-facebook',  '', '#1877f2', 1, 1),
  (2, 'Instagram', 'bi bi-instagram', '', '#e91e8c', 1, 2),
  (3, 'TikTok',    'bi bi-tiktok',    '', '#000000', 1, 3),
  (4, 'WhatsApp',  'bi bi-whatsapp',  '', '#25d366', 1, 4),
  (5, 'YouTube',   'bi bi-youtube',   '', '#ff0000', 1, 5),
  (6, 'X/Twitter', 'bi bi-twitter-x', '', '#000000', 0, 6),
  (7, 'LinkedIn',  'bi bi-linkedin',  '', '#0077b5', 0, 7);

-- ── 4. CONFIGURACIÓN DE FOOTER, PAGOS Y GENERAL (reusa configuracion_sitio) ──
-- Tabla clave-valor ya existente; solo se agregan las claves nuevas.
INSERT IGNORE INTO configuracion_sitio (clave, valor, tipo, descripcion) VALUES
  ('footer_descripcion',  'Tu tienda de moda con estilo urbano. Descubre las últimas tendencias.', 'texto', 'Descripción del footer'),
  ('footer_copyright',    '', 'texto', 'Texto de copyright (vacío = automático)'),
  ('footer_email',        '', 'texto', 'Email de contacto en footer'),
  ('footer_telefono',     '', 'texto', 'Teléfono de contacto en footer'),
  ('costo_envio',         '8.99', 'texto', 'Costo de envío mostrado en footer'),
  ('metodos_pago_json',   '["Tarjeta","Efectivo","PSE","Nequi","Daviplata"]', 'texto', 'Métodos de pago habilitados (JSON array)');

-- ── 5. MÉTODOS DE PAGO GUARDADOS POR USUARIO (cuentas bancarias) ────────────
CREATE TABLE IF NOT EXISTS metodos_pago_usuario (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NOT NULL,
  tipo            ENUM('cuenta_bancaria','tarjeta') DEFAULT 'cuenta_bancaria',
  banco           VARCHAR(100),
  titular         VARCHAR(150),
  numero_cuenta   VARCHAR(60),
  tipo_cuenta     ENUM('ahorros','corriente') DEFAULT 'ahorros',
  info_adicional  TEXT,
  predeterminado  TINYINT(1) DEFAULT 0,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. CHAT DE SOPORTE (admin ↔ usuario, separado del chat_social usuario↔usuario) ──
CREATE TABLE IF NOT EXISTS conversaciones_soporte (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT NOT NULL,
  admin_id       INT DEFAULT NULL,
  estado         ENUM('pendiente','activa','resuelta') DEFAULT 'pendiente',
  ultimo_msg     TEXT,
  ultimo_msg_en  DATETIME DEFAULT NULL,
  no_leidos_usr  INT DEFAULT 0,
  no_leidos_adm  INT DEFAULT 0,
  creado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_cs_usuario (usuario_id),
  INDEX idx_cs_estado  (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mensajes_soporte (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conversacion_id  INT NOT NULL,
  remitente_id     INT NOT NULL,
  tipo             ENUM('texto','imagen','archivo','rapido') DEFAULT 'texto',
  contenido        TEXT,
  archivo_url      VARCHAR(500) DEFAULT NULL,
  archivo_nombre   VARCHAR(255) DEFAULT NULL,
  estado           ENUM('enviado','leido') DEFAULT 'enviado',
  leido_en         DATETIME DEFAULT NULL,
  creado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversacion_id) REFERENCES conversaciones_soporte(id) ON DELETE CASCADE,
  INDEX idx_ms_conv (conversacion_id),
  INDEX idx_ms_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. MAPA DE PEDIDOS — asegurar columnas de ciudad/depto en direcciones ───
-- (ya existían lat/lng en algunas instalaciones; nos asegura que también
-- exista ciudad/departamento como columnas individuales reutilizables desde
-- el pedido, no solo dentro de direcciones_entrega)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_lat DECIMAL(10,7) DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_lng DECIMAL(10,7) DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_direccion VARCHAR(255) DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_ciudad VARCHAR(100) DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_departamento VARCHAR(100) DEFAULT NULL;
