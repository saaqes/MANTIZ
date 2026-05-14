-- =============================================
-- TIENDA MANTIZ - BASE DE DATOS COMPLETA v3
-- =============================================

CREATE DATABASE IF NOT EXISTS tienda_ropa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tienda_ropa;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  nombre_visible VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','cliente') DEFAULT 'cliente',
  foto_perfil VARCHAR(255) DEFAULT 'default-avatar.jpg',
  foto_perfil_tipo ENUM('upload','preset') DEFAULT 'preset',
  foto_perfil_preset VARCHAR(100) DEFAULT 'avatar1.png',
  banner VARCHAR(255) DEFAULT 'default-banner.jpg',
  banner_tipo ENUM('upload','preset') DEFAULT 'preset',
  banner_preset VARCHAR(100) DEFAULT 'banner1.jpg',
  bio TEXT,
  telefono VARCHAR(20),
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  precio_descuento DECIMAL(10,2) DEFAULT NULL,
  imagen_principal VARCHAR(255),
  categoria VARCHAR(100),
  tags VARCHAR(255) DEFAULT '',
  en_inicio TINYINT(1) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  total_likes INT DEFAULT 0,
  total_visitas INT DEFAULT 0,
  calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
  total_calificaciones INT DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  imagen VARCHAR(255) NOT NULL,
  orden INT DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS producto_tallas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  talla VARCHAR(20) NOT NULL,
  stock INT DEFAULT 0,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS producto_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id INT NOT NULL,
  contenido TEXT NOT NULL,
  calificacion TINYINT DEFAULT NULL,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentario_reacciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comentario_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo ENUM('like','dislike') NOT NULL,
  UNIQUE KEY unique_reaccion (comentario_id, usuario_id),
  FOREIGN KEY (comentario_id) REFERENCES comentarios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carrito (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  talla VARCHAR(20),
  cantidad INT DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direcciones_entrega (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  alias VARCHAR(50) DEFAULT 'Casa',
  nombre_destinatario VARCHAR(100),
  telefono VARCHAR(20),
  pais VARCHAR(80) DEFAULT 'Colombia',
  departamento VARCHAR(80),
  ciudad VARCHAR(80),
  direccion VARCHAR(255),
  codigo_postal VARCHAR(20),
  notas TEXT,
  predeterminada TINYINT(1) DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  direccion_id INT DEFAULT NULL,
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  costo_envio DECIMAL(10,2) DEFAULT 8.99,
  metodo_pago ENUM('tarjeta','transferencia','contraentrega','paypal','nequi','daviplata') DEFAULT 'tarjeta',
  estado_pago ENUM('pendiente','pagado','fallido','reembolsado') DEFAULT 'pendiente',
  estado ENUM('pendiente','confirmado','empaquetando','en_transito','en_aduana','con_conductor','entregado','cancelado') DEFAULT 'pendiente',
  numero_tracking VARCHAR(50),
  notas TEXT,
  fecha_estimada_entrega DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direcciones_entrega(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  talla VARCHAR(20),
  cantidad INT DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('almacen','empaquetador','transporte','aduana','entrega') DEFAULT 'transporte',
  telefono VARCHAR(20),
  email VARCHAR(100),
  ciudad VARCHAR(80),
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_seguimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  proveedor_id INT DEFAULT NULL,
  estado VARCHAR(100) NOT NULL,
  descripcion TEXT,
  ubicacion VARCHAR(200),
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  tipo_proveedor ENUM('almacen','empaquetador','transporte','aduana','entrega') DEFAULT 'almacen',
  fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tiendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  ciudad VARCHAR(80),
  pais VARCHAR(80) DEFAULT 'Colombia',
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  telefono VARCHAR(20),
  email VARCHAR(100),
  horario TEXT,
  activa TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_ia_sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT DEFAULT NULL,
  session_id VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_ia_mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesion_id INT NOT NULL,
  rol ENUM('user','assistant') NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sesion_id) REFERENCES chat_ia_sesiones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT DEFAULT NULL,
  pagina VARCHAR(255) NOT NULL,
  producto_id INT DEFAULT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  duracion_segundos INT DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS configuracion_sitio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo ENUM('texto','imagen','color') DEFAULT 'texto',
  descripcion VARCHAR(255),
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carrusel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  imagen VARCHAR(255) NOT NULL,
  titulo VARCHAR(200),
  subtitulo VARCHAR(300),
  orden INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── DATOS INICIALES ────────────────────────────────────────────────────────────
-- Admin: email=admin@tienda.com | password=Admin1234!
INSERT IGNORE INTO usuarios (username, nombre_visible, email, password, rol, foto_perfil_tipo, foto_perfil_preset) VALUES
('admin', 'Administrador', 'admin@tienda.com', '$2a$10$FRpBO3u.dfCnWbKx0xTFqe1kejsDq/QMZ6rNXPzAf/61ssmnAya4m', 'admin', 'preset', 'avatar1.png');

INSERT IGNORE INTO configuracion_sitio (clave, valor, tipo, descripcion) VALUES
('logo', 'logo-default.png', 'imagen', 'Logo principal de la tienda'),
('nombre_tienda', 'MANTIZ', 'texto', 'Nombre de la tienda'),
('color_primario', '#e91e8c', 'color', 'Color primario'),
('color_acento', '#ff5cb8', 'color', 'Color de acento');

INSERT IGNORE INTO carrusel (imagen, titulo, subtitulo, orden, activo) VALUES
('carousel-1.jpg', 'Nueva Colección 2025', 'Descubre las últimas tendencias', 1, 1),
('carousel-2.jpg', 'Ofertas Exclusivas', 'Hasta 50% de descuento', 2, 1),
('carousel-3.jpg', 'Estilo & Elegancia', 'Viste con confianza cada día', 3, 1);

INSERT IGNORE INTO productos (titulo, descripcion, precio, precio_descuento, imagen_principal, categoria, tags, en_inicio, total_likes) VALUES
('Camiseta Premium Cotton', 'Camiseta de algodón 100% orgánico, suave al tacto y duradera. Perfecta para el uso diario.', 29.99, NULL, 'product-1.jpg', 'Camisetas', 'camiseta,algodón,casual,básico', 1, 12),
('Jeans Slim Fit', 'Jeans de corte slim fit con elastano para mayor comodidad. Disponible en varios tonos.', 59.99, 49.99, 'product-2.jpg', 'Pantalones', 'jeans,slim,denim,casual', 1, 8),
('Vestido Floral', 'Elegante vestido con estampado floral, ideal para cualquier evento o salida casual.', 79.99, NULL, 'product-3.jpg', 'Vestidos', 'vestido,floral,elegante,femenino', 1, 24),
('Chaqueta Urbana', 'Chaqueta urbana impermeable con múltiples bolsillos. Ideal para el frío.', 119.99, 89.99, 'product-4.jpg', 'Chaquetas', 'chaqueta,urbana,impermeable,abrigo', 1, 6);

INSERT IGNORE INTO producto_tallas (producto_id, talla, stock) VALUES
(1,'XS',10),(1,'S',15),(1,'M',20),(1,'L',12),(1,'XL',8),
(2,'28',5),(2,'30',10),(2,'32',15),(2,'34',8),(2,'36',4),
(3,'XS',7),(3,'S',12),(3,'M',18),(3,'L',9),(3,'XL',5),
(4,'S',8),(4,'M',14),(4,'L',11),(4,'XL',6),(4,'XXL',3);

INSERT IGNORE INTO proveedores (nombre, tipo, telefono, email, ciudad) VALUES
('Almacén Central Mantiz', 'almacen', '601-1234567', 'almacen@mantiz.com', 'Bogotá'),
('EmpaquetaYa S.A.S', 'empaquetador', '601-7654321', 'empaque@empaquetaya.com', 'Bogotá'),
('TurboEnvíos Colombia', 'transporte', '300-1234567', 'ops@turboenvios.co', 'Medellín'),
('Aduana Express CO', 'aduana', '601-9876543', 'ops@aduanaexpress.co', 'Bogotá'),
('MotoExpress Última Milla', 'entrega', '310-9999888', 'entregas@motoexpress.co', 'Bogotá');

INSERT IGNORE INTO tiendas (nombre, direccion, ciudad, latitud, longitud, telefono, horario) VALUES
('Mantiz Bogotá - Chapinero', 'Calle 60 #9-10, Chapinero', 'Bogotá', 4.6464, -74.0631, '601-3001234', 'Lun-Sáb 9:00-20:00 | Dom 10:00-18:00'),
('Mantiz Medellín - El Poblado', 'Calle 10A #43D-30, El Poblado', 'Medellín', 6.2088, -75.5649, '604-3005678', 'Lun-Sáb 10:00-21:00 | Dom 11:00-19:00'),
('Mantiz Cali - Unicentro', 'Cra 100 #5-169, Unicentro Cali', 'Cali', 3.3862, -76.5248, '602-3009012', 'Lun-Dom 10:00-21:00');

-- ── MIGRACIONES SEGURAS (para instalaciones existentes) ───────────────────────
-- Compatible con MySQL 5.7+ y MariaDB 10.1+
-- Usa procedimientos almacenados para agregar columnas solo si no existen.

DROP PROCEDURE IF EXISTS mantiz_add_col;
DELIMITER $$
CREATE PROCEDURE mantiz_add_col(
  IN p_table VARCHAR(64),
  IN p_col   VARCHAR(64),
  IN p_def   TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND COLUMN_NAME  = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Columnas nuevas en usuarios
CALL mantiz_add_col('usuarios', 'foto_perfil_tipo',   "ENUM('upload','preset') DEFAULT 'preset'");
CALL mantiz_add_col('usuarios', 'foto_perfil_preset', "VARCHAR(100) DEFAULT 'avatar1.png'");
CALL mantiz_add_col('usuarios', 'banner_tipo',        "ENUM('upload','preset') DEFAULT 'preset'");
CALL mantiz_add_col('usuarios', 'banner_preset',      "VARCHAR(100) DEFAULT 'banner1.jpg'");
CALL mantiz_add_col('usuarios', 'telefono',           "VARCHAR(20) DEFAULT NULL");

-- Columnas nuevas en productos
CALL mantiz_add_col('productos', 'tags',                  "VARCHAR(255) DEFAULT ''");
CALL mantiz_add_col('productos', 'calificacion_promedio', "DECIMAL(3,2) DEFAULT 0.00");
CALL mantiz_add_col('productos', 'total_calificaciones',  "INT DEFAULT 0");

DROP PROCEDURE IF EXISTS mantiz_add_col;

-- ── RESETEAR CONTRASEÑA DE ADMIN ─────────────────────────────────────────────
-- Si no puedes iniciar sesión, ejecuta desde la carpeta del proyecto:
--   node setup.js reset
-- Eso actualiza el hash automáticamente en la BD.
--
-- O ejecuta este UPDATE en tu cliente MySQL (contraseña: Admin1234!):
-- UPDATE usuarios SET password='$2a$10$3cSgCiZmuKcGY2IvgWY4s.cOQ0Dn7pBKH23/Ey/crMRlm8Jl9bqZm' WHERE email='admin@tienda.com';

-- ============================================================
-- NUEVAS TABLAS v4
-- ============================================================

-- Tableros (estilo Pinterest)
CREATE TABLE IF NOT EXISTS tableros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  privacidad ENUM('privado','publico','grupal') DEFAULT 'privado',
  color_portada VARCHAR(20) DEFAULT '#e91e8c',
  imagen_portada VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Pines en tableros
CREATE TABLE IF NOT EXISTS tablero_pines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tablero_id INT NOT NULL,
  producto_id INT,
  imagen_url VARCHAR(500),
  titulo VARCHAR(200),
  descripcion TEXT,
  url_externa VARCHAR(500),
  tipo ENUM('producto','imagen','link') DEFAULT 'producto',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tablero_id) REFERENCES tableros(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- Miembros de tableros grupales
CREATE TABLE IF NOT EXISTS tablero_miembros (
  tablero_id INT NOT NULL,
  usuario_id INT NOT NULL,
  rol ENUM('admin','miembro') DEFAULT 'miembro',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tablero_id, usuario_id),
  FOREIGN KEY (tablero_id) REFERENCES tableros(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Widgets de perfil
CREATE TABLE IF NOT EXISTS perfil_widgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('juego','musica','pelicula') NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  subtitulo VARCHAR(200),
  imagen_url VARCHAR(500),
  color_acento VARCHAR(20) DEFAULT '#e91e8c',
  orden INT DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Configuracion personal de perfil
CREATE TABLE IF NOT EXISTS perfil_config (
  usuario_id INT PRIMARY KEY,
  color_primario VARCHAR(20) DEFAULT '#e91e8c',
  tema ENUM('oscuro','claro') DEFAULT 'oscuro',
  fondo_tipo ENUM('color','imagen','gradiente') DEFAULT 'color',
  fondo_valor VARCHAR(500) DEFAULT '#0a0a0a',
  fondo_blur INT DEFAULT 0,
  pais VARCHAR(80) DEFAULT 'Colombia',
  idioma VARCHAR(20) DEFAULT 'es',
  metodo_pago_pref VARCHAR(50) DEFAULT 'tarjeta',
  mostrar_favoritos TINYINT(1) DEFAULT 1,
  mostrar_tableros TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Sesiones de usuario para estadísticas (tiempo en página)
CREATE TABLE IF NOT EXISTS sesiones_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  session_id VARCHAR(100),
  inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fin TIMESTAMP NULL,
  duracion_seg INT DEFAULT 0,
  pagina_inicio VARCHAR(255),
  ip VARCHAR(60),
  INDEX idx_usuario (usuario_id),
  INDEX idx_inicio (inicio)
);

-- Estadísticas de visitas por página
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS duracion_seg INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS color_perfil VARCHAR(20) DEFAULT '#e91e8c';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fondo_perfil_tipo VARCHAR(20) DEFAULT 'color';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fondo_perfil_valor VARCHAR(500) DEFAULT '#0a0a0a';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_blur INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pais VARCHAR(80) DEFAULT 'Colombia';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS idioma VARCHAR(20) DEFAULT 'es';

-- Update admin hash (Admin1234!)
UPDATE usuarios SET password='$2a$10$FRpBO3u.dfCnWbKx0xTFqe1kejsDq/QMZ6rNXPzAf/61ssmnAya4m' WHERE email='admin@tienda.com';


-- ============================================================
-- MODELOS 3D gestionables desde admin
-- ============================================================
CREATE TABLE IF NOT EXISTS modelos_3d (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  archivo VARCHAR(255) NOT NULL,
  producto_id INT DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  es_principal TINYINT(1) DEFAULT 0,
  escala DECIMAL(5,2) DEFAULT 1.00,
  pos_y DECIMAL(5,2) DEFAULT 0.00,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- Configuracion de layout del homepage
CREATE TABLE IF NOT EXISTS homepage_config (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT,
  descripcion VARCHAR(255)
);

INSERT IGNORE INTO homepage_config (clave, valor, descripcion) VALUES
('seccion_orden', 'hero,productos,bestsellers,carrusel_marca', 'Orden de secciones'),
('mostrar_hero', '1', 'Mostrar hero carousel'),
('mostrar_productos', '1', 'Mostrar seccion productos'),
('mostrar_bestsellers', '1', 'Mostrar bestsellers con 3D'),
('mostrar_carrusel_marca', '1', 'Mostrar carrusel de marca'),
('productos_cantidad', '8', 'Cuantos productos mostrar en inicio'),
('bestsellers_cantidad', '4', 'Cuantos bestsellers mostrar'),
('viewer3d_modelo_id', NULL, 'ID del modelo 3D activo en inicio'),
('carrusel_marca_titulo', 'NUEVA COLECCION', 'Titulo del carrusel de marca');

-- Seed modelos 3d with existing files
INSERT IGNORE INTO modelos_3d (nombre, archivo, es_principal, activo) VALUES
('Susan', 'susan.glb', 1, 1),
('Stella', 'stella.glb', 0, 1),
('T-Shirt', 't_shirt.glb', 0, 1);

-- Add url_destino to carrusel if missing (run this if you get ER_BAD_FIELD_ERROR)
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS url_destino VARCHAR(500) DEFAULT NULL;

-- Carrusel enhancements
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS content_type ENUM('texto','cronometro','nada','texto_cronometro') DEFAULT 'texto';
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS mostrar_boton TINYINT(1) DEFAULT 1;
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS boton_texto VARCHAR(80) DEFAULT 'EXPLORAR';
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS countdown_fecha DATETIME DEFAULT NULL;
ALTER TABLE carrusel ADD COLUMN IF NOT EXISTS url_destino VARCHAR(500) DEFAULT NULL;

-- Separate brand carousel images (different from hero slides)
CREATE TABLE IF NOT EXISTS carrusel_marca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  imagen VARCHAR(255) NOT NULL,
  titulo VARCHAR(200),
  subtitulo VARCHAR(300),
  orden INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add location coords to direcciones_entrega
ALTER TABLE direcciones_entrega ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7) DEFAULT NULL;
ALTER TABLE direcciones_entrega ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7) DEFAULT NULL;
