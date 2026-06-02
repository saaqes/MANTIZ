-- ============================================================
-- MANTIZ v4 — Esquema PostgreSQL (Neon)
-- Incluye tablas base + v4 (social, gamificación, stickers)
-- ============================================================

-- Extensión para UUIDs si se necesitan en el futuro
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- USUARIOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                  SERIAL PRIMARY KEY,
  username            VARCHAR(50)  UNIQUE NOT NULL,
  nombre_visible      VARCHAR(100) NOT NULL,
  email               VARCHAR(100) UNIQUE NOT NULL,
  password            VARCHAR(255) NOT NULL,
  rol                 VARCHAR(10)  DEFAULT 'cliente' CHECK (rol IN ('admin','cliente')),
  foto_perfil         VARCHAR(500) DEFAULT NULL,
  foto_perfil_tipo    VARCHAR(10)  DEFAULT 'preset' CHECK (foto_perfil_tipo IN ('upload','preset')),
  foto_perfil_preset  VARCHAR(100) DEFAULT 'avatar1.png',
  banner              VARCHAR(500) DEFAULT NULL,
  banner_tipo         VARCHAR(10)  DEFAULT 'preset' CHECK (banner_tipo IN ('upload','preset')),
  banner_preset       VARCHAR(100) DEFAULT 'banner1.jpg',
  bio                 TEXT,
  telefono            VARCHAR(20),
  activo              SMALLINT     DEFAULT 1,
  creado_en           TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id                    SERIAL PRIMARY KEY,
  titulo                VARCHAR(150) NOT NULL,
  descripcion           TEXT,
  precio                DECIMAL(10,2) NOT NULL,
  precio_descuento      DECIMAL(10,2) DEFAULT NULL,
  imagen_principal      VARCHAR(500),
  categoria             VARCHAR(100),
  tags                  VARCHAR(255) DEFAULT '',
  en_inicio             SMALLINT     DEFAULT 0,
  activo                SMALLINT     DEFAULT 1,
  total_likes           INT          DEFAULT 0,
  total_visitas         INT          DEFAULT 0,
  calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
  total_calificaciones  INT          DEFAULT 0,
  creado_en             TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id          SERIAL PRIMARY KEY,
  producto_id INT    NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  imagen      VARCHAR(500) NOT NULL,
  orden       INT    DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producto_tallas (
  id          SERIAL PRIMARY KEY,
  producto_id INT    NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talla       VARCHAR(20) NOT NULL,
  stock       INT    DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producto_likes (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id INT  NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, producto_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
  id          SERIAL PRIMARY KEY,
  producto_id INT     NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id  INT     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido   TEXT    NOT NULL,
  calificacion SMALLINT DEFAULT NULL,
  likes       INT     DEFAULT 0,
  dislikes    INT     DEFAULT 0,
  activo      SMALLINT DEFAULT 1,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentario_reacciones (
  id            SERIAL PRIMARY KEY,
  comentario_id INT  NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_id    INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo          VARCHAR(10) DEFAULT 'like' CHECK (tipo IN ('like','dislike')),
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comentario_id, usuario_id)
);

-- ─────────────────────────────────────────────────────────────
-- PEDIDOS / CARRITO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direcciones_entrega (
  id                SERIAL PRIMARY KEY,
  usuario_id        INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  alias             VARCHAR(50) DEFAULT 'Casa',
  nombre_destinatario VARCHAR(100),
  ciudad            VARCHAR(100),
  departamento      VARCHAR(100),
  direccion         TEXT,
  predeterminada    SMALLINT DEFAULT 0,
  creado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id                      SERIAL PRIMARY KEY,
  usuario_id              INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  direccion_id            INT  DEFAULT NULL,
  total                   DECIMAL(10,2) NOT NULL,
  subtotal                DECIMAL(10,2) DEFAULT 0,
  costo_envio             DECIMAL(10,2) DEFAULT 8.99,
  metodo_pago             VARCHAR(20)  DEFAULT 'tarjeta',
  estado_pago             VARCHAR(20)  DEFAULT 'pendiente',
  estado                  VARCHAR(30)  DEFAULT 'pendiente',
  numero_tracking         VARCHAR(50),
  notas                   TEXT,
  fecha_estimada_entrega  DATE,
  creado_en               TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id          SERIAL PRIMARY KEY,
  pedido_id   INT  NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INT  NOT NULL REFERENCES productos(id),
  talla       VARCHAR(20),
  cantidad    INT  DEFAULT 1,
  precio      DECIMAL(10,2) NOT NULL,
  imagen      VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS carrito (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id INT  NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talla       VARCHAR(20),
  cantidad    INT  DEFAULT 1,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, producto_id, talla)
);

-- ─────────────────────────────────────────────────────────────
-- TABLEROS / PINES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tableros (
  id            SERIAL PRIMARY KEY,
  usuario_id    INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre        VARCHAR(150) NOT NULL,
  descripcion   TEXT,
  privacidad    VARCHAR(10) DEFAULT 'privado' CHECK (privacidad IN ('privado','publico','grupal')),
  color_portada VARCHAR(20) DEFAULT '#e91e8c',
  imagen_portada VARCHAR(500),
  total_vistas  INT DEFAULT 0,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tablero_pines (
  id          SERIAL PRIMARY KEY,
  tablero_id  INT  NOT NULL REFERENCES tableros(id) ON DELETE CASCADE,
  producto_id INT  DEFAULT NULL REFERENCES productos(id) ON DELETE SET NULL,
  titulo      VARCHAR(200),
  imagen_url  VARCHAR(500),
  url_externa VARCHAR(500),
  tipo        VARCHAR(20) DEFAULT 'producto',
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tablero_miembros (
  id          SERIAL PRIMARY KEY,
  tablero_id  INT NOT NULL REFERENCES tableros(id) ON DELETE CASCADE,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tablero_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS tablero_reacciones (
  id          SERIAL PRIMARY KEY,
  tablero_id  INT  NOT NULL REFERENCES tableros(id) ON DELETE CASCADE,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) DEFAULT 'like',
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tablero_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS tablero_guardados (
  id          SERIAL PRIMARY KEY,
  tablero_id  INT  NOT NULL REFERENCES tableros(id) ON DELETE CASCADE,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tablero_id, usuario_id)
);

-- ─────────────────────────────────────────────────────────────
-- CARRUSEL / HOMEPAGE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrusel (
  id            SERIAL PRIMARY KEY,
  imagen        VARCHAR(500) NOT NULL,
  titulo        VARCHAR(200),
  subtitulo     VARCHAR(300),
  orden         INT     DEFAULT 0,
  activo        SMALLINT DEFAULT 1,
  content_type  VARCHAR(20) DEFAULT 'texto',
  mostrar_boton SMALLINT DEFAULT 1,
  boton_texto   VARCHAR(50) DEFAULT 'EXPLORAR',
  countdown_fecha TIMESTAMPTZ DEFAULT NULL,
  url_destino   VARCHAR(500) DEFAULT NULL,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carrusel_marca (
  id        SERIAL PRIMARY KEY,
  imagen    VARCHAR(500) NOT NULL,
  titulo    VARCHAR(200),
  subtitulo VARCHAR(300),
  orden     INT  DEFAULT 0,
  activo    SMALLINT DEFAULT 1,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_config (
  id        SERIAL PRIMARY KEY,
  clave     VARCHAR(100) UNIQUE NOT NULL,
  valor     TEXT,
  descripcion VARCHAR(255),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CONFIGURACIÓN DEL SITIO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion_sitio (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(100) UNIQUE NOT NULL,
  valor       TEXT,
  tipo        VARCHAR(20) DEFAULT 'texto',
  descripcion VARCHAR(255),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PERFIL CONFIG / WIDGETS / CONEXIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfil_config (
  id                SERIAL PRIMARY KEY,
  usuario_id        INT  UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  color_primario    VARCHAR(20)  DEFAULT '#e91e8c',
  tema              VARCHAR(10)  DEFAULT 'oscuro',
  fondo_tipo        VARCHAR(20)  DEFAULT 'color',
  fondo_valor       VARCHAR(100) DEFAULT '#0a0a0a',
  fondo_blur        INT          DEFAULT 0,
  pais              VARCHAR(80)  DEFAULT 'Colombia',
  idioma            VARCHAR(10)  DEFAULT 'es',
  metodo_pago_pref  VARCHAR(30)  DEFAULT 'tarjeta',
  tema_global       VARCHAR(10)  DEFAULT 'oscuro',
  ubicacion_ciudad  VARCHAR(100),
  ubicacion_depto   VARCHAR(100),
  ubicacion_pais    VARCHAR(80)  DEFAULT 'Colombia',
  tiempo_total_seg  INT          DEFAULT 0,
  creado_en         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfil_widgets (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        VARCHAR(50),
  titulo      VARCHAR(100),
  contenido   TEXT,
  imagen_url  VARCHAR(500),
  orden       INT  DEFAULT 0,
  visible     SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS perfil_conexiones (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plataforma  VARCHAR(30) NOT NULL,
  username    VARCHAR(100) NOT NULL,
  publico     SMALLINT DEFAULT 1,
  url         VARCHAR(500) DEFAULT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, plataforma)
);

-- ─────────────────────────────────────────────────────────────
-- ESTADÍSTICAS / VISITAS / SESIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitas (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  DEFAULT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  pagina      VARCHAR(255),
  producto_id INT  DEFAULT NULL,
  ip          VARCHAR(60),
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones_stats (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  DEFAULT NULL,
  session_id  VARCHAR(100),
  inicio      TIMESTAMPTZ DEFAULT NOW(),
  fin         TIMESTAMPTZ NULL,
  duracion_seg INT DEFAULT 0,
  pagina_inicio VARCHAR(255),
  ip          VARCHAR(60)
);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_stats(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_inicio ON sesiones_stats(inicio);

-- ─────────────────────────────────────────────────────────────
-- MODELOS 3D
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modelos_3d (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  archivo     VARCHAR(500) NOT NULL,    -- URL completa en R2
  producto_id INT  DEFAULT NULL REFERENCES productos(id) ON DELETE SET NULL,
  activo      SMALLINT DEFAULT 1,
  es_principal SMALLINT DEFAULT 0,
  escala      DECIMAL(5,2) DEFAULT 1.00,
  pos_y       DECIMAL(5,2) DEFAULT 0.00,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICACIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT  NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) DEFAULT 'noticia',
  titulo      VARCHAR(150) NOT NULL,
  mensaje     TEXT,
  enlace      VARCHAR(255) DEFAULT NULL,
  leida       SMALLINT DEFAULT 0,
  icono       VARCHAR(50) DEFAULT 'bi-bell',
  color       VARCHAR(20) DEFAULT '#e91e8c',
  datos_extra JSONB DEFAULT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notif_fecha ON notificaciones(creado_en);

-- ─────────────────────────────────────────────────────────────
-- AMISTADES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amistades (
  id             SERIAL PRIMARY KEY,
  solicitante_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  receptor_id    INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado         VARCHAR(20) DEFAULT 'pendiente',
  creado_en      TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (solicitante_id, receptor_id)
);

-- ─────────────────────────────────────────────────────────────
-- CHAT SOCIAL
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id          SERIAL PRIMARY KEY,
  emisor_id   INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  receptor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido   TEXT NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'texto',
  sticker_id  INT DEFAULT NULL,
  producto_id INT DEFAULT NULL,
  leido       SMALLINT DEFAULT 0,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conv ON mensajes_chat(emisor_id, receptor_id);
CREATE INDEX IF NOT EXISTS idx_chat_receptor ON mensajes_chat(receptor_id, leido);

-- ─────────────────────────────────────────────────────────────
-- ENCUESTAS / OPINIONES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encuestas (
  id                  SERIAL PRIMARY KEY,
  titulo              VARCHAR(200) NOT NULL,
  descripcion         TEXT,
  tipo_respuesta      VARCHAR(20) DEFAULT 'botones',
  activa              SMALLINT DEFAULT 1,
  permite_sugerencias SMALLINT DEFAULT 0,
  fecha_cierre        DATE DEFAULT NULL,
  creado_por          INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encuesta_opciones (
  id          SERIAL PRIMARY KEY,
  encuesta_id INT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  texto       VARCHAR(200) NOT NULL,
  imagen      VARCHAR(500) DEFAULT NULL,
  color       VARCHAR(20)  DEFAULT NULL,
  votos       INT DEFAULT 0,
  orden       INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS encuesta_votos (
  id          SERIAL PRIMARY KEY,
  encuesta_id INT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  opcion_id   INT NOT NULL REFERENCES encuesta_opciones(id) ON DELETE CASCADE,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sugerencia  TEXT DEFAULT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (encuesta_id, usuario_id)
);

-- ─────────────────────────────────────────────────────────────
-- GAMIFICACIÓN
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logros (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(60) UNIQUE NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono       VARCHAR(50) DEFAULT '🏆',
  tipo        VARCHAR(20) DEFAULT 'social',
  umbral      INT DEFAULT 1,
  recompensa  VARCHAR(50) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS usuario_logros (
  id               SERIAL PRIMARY KEY,
  usuario_id       INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  logro_id         INT NOT NULL REFERENCES logros(id) ON DELETE CASCADE,
  progreso         INT DEFAULT 0,
  desbloqueado     SMALLINT DEFAULT 0,
  fecha_desbloqueo TIMESTAMPTZ NULL,
  UNIQUE (usuario_id, logro_id)
);

-- ─────────────────────────────────────────────────────────────
-- STICKERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stickers (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(80) NOT NULL,
  archivo     VARCHAR(500) NOT NULL,   -- URL en R2 o path local para defaults
  tipo        VARCHAR(20) DEFAULT 'predeterminado',
  subido_por  INT DEFAULT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  moderado    SMALLINT DEFAULT 1,
  activo      SMALLINT DEFAULT 1,
  categoria   VARCHAR(50) DEFAULT 'general',
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentario_stickers (
  id            SERIAL PRIMARY KEY,
  comentario_id INT NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  sticker_id    INT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  usuario_id    INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PROVEEDORES / TIENDAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(150) NOT NULL,
  contacto  VARCHAR(150),
  email     VARCHAR(100),
  telefono  VARCHAR(30),
  ciudad    VARCHAR(100),
  activo    SMALLINT DEFAULT 1,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiendas (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  direccion       TEXT,
  ciudad          VARCHAR(100),
  departamento    VARCHAR(100),
  lat             DECIMAL(10,7),
  lng             DECIMAL(10,7),
  telefono        VARCHAR(30),
  horario         VARCHAR(200),
  activo          SMALLINT DEFAULT 1,
  es_principal    SMALLINT DEFAULT 0,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- DATOS INICIALES
-- ─────────────────────────────────────────────────────────────
-- Admin: email=admin@mantiz.co | password=Admin1234!
INSERT INTO usuarios (username, nombre_visible, email, password, rol, foto_perfil_tipo, foto_perfil_preset)
VALUES ('admin', 'Administrador', 'admin@mantiz.co',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin1234!
        'admin', 'preset', 'avatar1.png')
ON CONFLICT (email) DO NOTHING;

-- Configuración inicial del sitio
INSERT INTO configuracion_sitio (clave, valor, tipo, descripcion) VALUES
  ('nombre_tienda',    'MANTIZ',        'texto',  'Nombre de la tienda'),
  ('logo',             NULL,            'imagen', 'Logo principal de la tienda'),
  ('color_primario',   '#e91e8c',       'color',  'Color principal de la marca'),
  ('descripcion',      'Moda underground y streetwear', 'texto', 'Descripción del sitio'),
  ('email_contacto',   'info@mantiz.co','texto',  'Email de contacto'),
  ('telefono_contacto','',              'texto',  'Teléfono de contacto'),
  ('instagram',        '',              'texto',  'Usuario de Instagram'),
  ('tiktok',           '',              'texto',  'Usuario de TikTok')
ON CONFLICT (clave) DO NOTHING;

-- Homepage config inicial
INSERT INTO homepage_config (clave, valor, descripcion) VALUES
  ('mostrar_hero',           '1', 'Mostrar sección hero'),
  ('mostrar_productos',      '1', 'Mostrar productos en inicio'),
  ('mostrar_bestsellers',    '1', 'Mostrar bestsellers'),
  ('mostrar_carrusel_marca', '1', 'Mostrar carrusel de marca'),
  ('productos_cantidad',     '8', 'Cantidad de productos en inicio'),
  ('bestsellers_cantidad',   '4', 'Cantidad de bestsellers'),
  ('carrusel_marca_titulo',  'NUEVA COLECCIÓN', 'Título del carrusel de marca'),
  ('seccion_orden',          'hero,productos,bestsellers,carrusel_marca', 'Orden de secciones'),
  ('viewer3d_modelo_id',     NULL, 'ID del modelo 3D activo en inicio')
ON CONFLICT (clave) DO NOTHING;

-- Logros iniciales
INSERT INTO logros (clave, nombre, descripcion, icono, tipo, umbral, recompensa) VALUES
  ('primer_pin',       'Primer Pin',        'Guardaste tu primer pin',         '📌','pines',    1,   NULL),
  ('coleccionista',    'Coleccionista',     'Tienes 10 pines guardados',        '🗂️','pines',    10,  'marco_plata'),
  ('tablero_creativo', 'Tablero Creativo',  'Creaste tu primer tablero',        '🎨','tableros', 1,   NULL),
  ('arquitecto',       'Arquitecto',        'Tienes 5 tableros activos',        '🏗️','tableros', 5,   'marco_dorado'),
  ('primera_compra',   'Primera Compra',    'Completaste tu primera compra',    '🛍️','compras',  1,   'marco_comprador'),
  ('comprador_vip',    'Comprador VIP',     '5 compras completadas',            '💎','compras',  5,   'animacion_fuego'),
  ('hora_conectado',   '1 Hora en MANTIZ',  'Llevas 1 hora en la plataforma',   '⏱️','tiempo',  3600, NULL),
  ('social_butterfly', 'Social Butterfly',  'Tienes 3 amigos en MANTIZ',        '🦋','social',   3,   'marco_social'),
  ('voz_activa',       'Voz Activa',        'Respondiste 5 encuestas',          '🗣️','encuestas',5,   NULL)
ON CONFLICT (clave) DO NOTHING;

-- Stickers predeterminados (archivos en /public/img/stickers/)
INSERT INTO stickers (nombre, archivo, tipo, moderado, activo, categoria) VALUES
  ('Fuego',    '/img/stickers/fire.gif',    'predeterminado',1,1,'reacciones'),
  ('Corazón',  '/img/stickers/heart.gif',   'predeterminado',1,1,'reacciones'),
  ('Aplausos', '/img/stickers/clap.gif',    'predeterminado',1,1,'reacciones'),
  ('Wow',      '/img/stickers/wow.gif',     'predeterminado',1,1,'reacciones'),
  ('100',      '/img/stickers/100.gif',     'predeterminado',1,1,'reacciones'),
  ('Moda',     '/img/stickers/fashion.gif', 'predeterminado',1,1,'moda'),
  ('Outfit',   '/img/stickers/outfit.gif',  'predeterminado',1,1,'moda'),
  ('Stars',    '/img/stickers/stars.gif',   'predeterminado',1,1,'general')
ON CONFLICT DO NOTHING;

-- Productos de ejemplo con imágenes de Unsplash
INSERT INTO productos (titulo, descripcion, precio, precio_descuento, imagen_principal, categoria, tags, en_inicio, total_likes)
VALUES
  ('Hoodie Grunge Negro',    'Sudadera oversized estilo grunge, 100% algodón pesado.',  89000, 75000,
   'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800', 'Hoodies', 'grunge,negro,oversized', 1, 24),
  ('Pantalón Cargo Caqui',   'Cargo fit con bolsillos laterales, tela ripstop.',         95000,  NULL,
   'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800', 'Pantalones', 'cargo,caqui,streetwear', 1, 18),
  ('Camiseta Underground',   'Print exclusivo, corte boxy, serigrafía al agua.',          52000, 45000,
   'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800', 'Camisetas', 'print,underground,boxy', 1, 31),
  ('Chaqueta Bomber Negra',  'Bomber oversized con bordado en manga, tela satin.',       145000, 120000,
   'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', 'Chaquetas', 'bomber,negro,satin', 1, 42)
ON CONFLICT DO NOTHING;

