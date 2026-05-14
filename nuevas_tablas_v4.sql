-- =============================================
-- MANTIZ - NUEVAS TABLAS v4
-- Ejecutar DESPUÉS de la base de datos existente
-- =============================================

USE tienda_ropa;

-- ─────────────────────────────────────────────
-- 1. PREFERENCIAS DE TEMA (modo oscuro/claro)
-- ─────────────────────────────────────────────
ALTER TABLE perfil_config
  ADD COLUMN IF NOT EXISTS tema_global ENUM('oscuro','claro') DEFAULT 'oscuro',
  ADD COLUMN IF NOT EXISTS ubicacion_ciudad VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_depto  VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_pais   VARCHAR(80)  DEFAULT 'Colombia',
  ADD COLUMN IF NOT EXISTS tiempo_total_seg INT UNSIGNED DEFAULT 0;

-- ─────────────────────────────────────────────
-- 2. SISTEMA DE AMIGOS / SEGUIDORES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amistades (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  solicitante_id INT NOT NULL,
  receptor_id    INT NOT NULL,
  estado      ENUM('pendiente','aceptada','rechazada','bloqueada') DEFAULT 'pendiente',
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_amistad (solicitante_id, receptor_id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (receptor_id)    REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 3. NOTIFICACIONES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  tipo        ENUM('amistad','descuento','mantenimiento','noticia','reaccion','mencion','pedido') DEFAULT 'noticia',
  titulo      VARCHAR(150) NOT NULL,
  mensaje     TEXT,
  enlace      VARCHAR(255) DEFAULT NULL,
  leida       TINYINT(1) DEFAULT 0,
  icono       VARCHAR(50) DEFAULT 'bi-bell',
  color       VARCHAR(20) DEFAULT '#e91e8c',
  datos_extra JSON DEFAULT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_leida (usuario_id, leida),
  INDEX idx_creado (creado_en)
);

-- ─────────────────────────────────────────────
-- 4. ENCUESTAS / OPINIONES (admin crea, users responden)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encuestas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  titulo      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo_respuesta ENUM('botones','imagenes','banners','estrellas') DEFAULT 'botones',
  activa      TINYINT(1) DEFAULT 1,
  permite_sugerencias TINYINT(1) DEFAULT 0,
  fecha_cierre DATE DEFAULT NULL,
  creado_por  INT NOT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encuesta_opciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  encuesta_id INT NOT NULL,
  texto       VARCHAR(200) NOT NULL,
  imagen      VARCHAR(255) DEFAULT NULL,
  color       VARCHAR(20)  DEFAULT NULL,
  votos       INT UNSIGNED DEFAULT 0,
  orden       INT DEFAULT 0,
  FOREIGN KEY (encuesta_id) REFERENCES encuestas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encuesta_votos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  encuesta_id INT NOT NULL,
  opcion_id   INT NOT NULL,
  usuario_id  INT NOT NULL,
  sugerencia  TEXT DEFAULT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_voto (encuesta_id, usuario_id),
  FOREIGN KEY (encuesta_id) REFERENCES encuestas(id) ON DELETE CASCADE,
  FOREIGN KEY (opcion_id)   REFERENCES encuesta_opciones(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 5. GAMIFICACIÓN — MEDALLAS Y PROGRESO
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logros (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  clave       VARCHAR(60) UNIQUE NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono       VARCHAR(50) DEFAULT '🏆',
  tipo        ENUM('tiempo','tableros','pines','compras','social','encuestas') DEFAULT 'social',
  umbral      INT DEFAULT 1,           -- valor requerido para desbloquear
  recompensa  VARCHAR(50) DEFAULT NULL -- 'marco_dorado', 'animacion_fuego', etc.
);

CREATE TABLE IF NOT EXISTS usuario_logros (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  logro_id    INT NOT NULL,
  progreso    INT UNSIGNED DEFAULT 0,
  desbloqueado TINYINT(1) DEFAULT 0,
  fecha_desbloqueo TIMESTAMP NULL,
  UNIQUE KEY unique_logro (usuario_id, logro_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (logro_id)   REFERENCES logros(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 6. STICKERS PARA COMENTARIOS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stickers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80) NOT NULL,
  archivo     VARCHAR(255) NOT NULL,
  tipo        ENUM('predeterminado','admin','usuario') DEFAULT 'predeterminado',
  subido_por  INT DEFAULT NULL,
  moderado    TINYINT(1) DEFAULT 1,  -- 0=pendiente moderación
  activo      TINYINT(1) DEFAULT 1,
  categoria   VARCHAR(50) DEFAULT 'general',
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comentario_stickers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  comentario_id INT NOT NULL,
  sticker_id    INT NOT NULL,
  usuario_id    INT NOT NULL,
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comentario_id) REFERENCES comentarios(id) ON DELETE CASCADE,
  FOREIGN KEY (sticker_id)    REFERENCES stickers(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)    REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 7. TABLEROS — STATS (vistas, reacciones)
-- ─────────────────────────────────────────────
ALTER TABLE tableros
  ADD COLUMN IF NOT EXISTS total_vistas INT UNSIGNED DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imagen_portada VARCHAR(255) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS tablero_reacciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tablero_id  INT NOT NULL,
  usuario_id  INT NOT NULL,
  tipo        ENUM('like','love','fuego','wow') DEFAULT 'like',
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaccion (tablero_id, usuario_id),
  FOREIGN KEY (tablero_id) REFERENCES tableros(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tablero_guardados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tablero_id  INT NOT NULL,
  usuario_id  INT NOT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_guardado (tablero_id, usuario_id),
  FOREIGN KEY (tablero_id) REFERENCES tableros(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 8. CHAT SOCIAL (entre usuarios)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  emisor_id   INT NOT NULL,
  receptor_id INT NOT NULL,
  contenido   TEXT NOT NULL,
  tipo        ENUM('texto','sticker','producto') DEFAULT 'texto',
  sticker_id  INT DEFAULT NULL,
  producto_id INT DEFAULT NULL,
  leido       TINYINT(1) DEFAULT 0,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conv (emisor_id, receptor_id),
  INDEX idx_receptor (receptor_id, leido),
  FOREIGN KEY (emisor_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 9. CONEXIONES DE PERFIL (Steam, GitHub, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfil_conexiones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  plataforma  ENUM('playstation','xbox','steam','github','tiktok','spotify','twitch','discord') NOT NULL,
  username    VARCHAR(100) NOT NULL,
  publico     TINYINT(1) DEFAULT 1,
  url         VARCHAR(255) DEFAULT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conexion (usuario_id, plataforma),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- 10. SEED — LOGROS INICIALES
-- ─────────────────────────────────────────────
INSERT IGNORE INTO logros (clave, nombre, descripcion, icono, tipo, umbral, recompensa) VALUES
  ('primer_pin',       'Primer Pin',         'Guardaste tu primer pin',             '📌', 'pines',    1,   NULL),
  ('coleccionista',    'Coleccionista',       'Tienes 10 pines guardados',           '🗂️', 'pines',    10,  'marco_plata'),
  ('tablero_creativo', 'Tablero Creativo',   'Creaste tu primer tablero',            '🎨', 'tableros', 1,   NULL),
  ('arquitecto',       'Arquitecto',          'Tienes 5 tableros activos',           '🏗️', 'tableros', 5,   'marco_dorado'),
  ('primera_compra',   'Primera Compra',      'Completaste tu primera compra',       '🛍️', 'compras',  1,   'marco_comprador'),
  ('comprador_vip',    'Comprador VIP',       '5 compras completadas',               '💎', 'compras',  5,   'animacion_fuego'),
  ('hora_conectado',   '1 Hora en MANTIZ',    'Llevas 1 hora en la plataforma',      '⏱️', 'tiempo',   3600,NULL),
  ('social_butterfly', 'Social Butterfly',    'Tienes 3 amigos en MANTIZ',           '🦋', 'social',   3,   'marco_social'),
  ('voz_activa',       'Voz Activa',          'Respondiste 5 encuestas',             '🗣️', 'encuestas',5,   NULL);

-- ─────────────────────────────────────────────
-- 11. SEED — STICKERS PREDETERMINADOS
-- ─────────────────────────────────────────────
INSERT IGNORE INTO stickers (nombre, archivo, tipo, moderado, activo, categoria) VALUES
  ('Fuego',       'fire.gif',       'predeterminado', 1, 1, 'reacciones'),
  ('Corazón',     'heart.gif',      'predeterminado', 1, 1, 'reacciones'),
  ('Aplausos',    'clap.gif',       'predeterminado', 1, 1, 'reacciones'),
  ('Wow',         'wow.gif',        'predeterminado', 1, 1, 'reacciones'),
  ('100',         '100.gif',        'predeterminado', 1, 1, 'reacciones'),
  ('Moda',        'fashion.gif',    'predeterminado', 1, 1, 'moda'),
  ('Outfit',      'outfit.gif',     'predeterminado', 1, 1, 'moda'),
  ('Stars',       'stars.gif',      'predeterminado', 1, 1, 'general');
