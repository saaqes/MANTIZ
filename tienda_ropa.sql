-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 30-06-2026 a las 18:38:57
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `tienda_ropa`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `achievements`
--

CREATE TABLE `achievements` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(10) DEFAULT '?',
  `puntos` int(11) DEFAULT 10,
  `tipo` enum('automatico','manual') DEFAULT 'automatico',
  `condicion_tipo` varchar(50) DEFAULT NULL,
  `condicion_valor` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `achievements`
--

INSERT INTO `achievements` (`id`, `codigo`, `nombre`, `descripcion`, `icono`, `puntos`, `tipo`, `condicion_tipo`, `condicion_valor`, `activo`, `creado_en`) VALUES
(1, 'primera_compra', 'Primera compra', 'Realizaste tu primera compra', '🛍️', 50, 'automatico', 'compras', 1, 1, '2026-06-30 00:36:18'),
(2, 'cinco_compras', 'Cliente frecuente', 'Has realizado 5 compras', '⭐', 100, 'automatico', 'compras', 5, 1, '2026-06-30 00:36:18'),
(3, 'primer_like', 'Primer like', 'Le diste like a tu primer producto', '❤️', 10, 'automatico', 'likes', 1, 1, '2026-06-30 00:36:18'),
(4, 'explorador', 'Explorador', 'Diste 10 likes a productos', '🔍', 30, 'automatico', 'likes', 10, 1, '2026-06-30 00:36:18'),
(5, 'primer_tablero', 'Creador de tableros', 'Creaste tu primer tablero', '📌', 20, 'automatico', 'tableros', 1, 1, '2026-06-30 00:36:18'),
(6, 'cinco_tableros', 'Curador', 'Creaste 5 tableros', '🎨', 50, 'automatico', 'tableros', 5, 1, '2026-06-30 00:36:18'),
(7, 'perfil_completo', 'Perfil completo', 'Completaste tu perfil al 100%', '✅', 40, 'automatico', 'perfil', 1, 1, '2026-06-30 00:36:18'),
(8, 'veterano', 'Veterano', 'Llevas más de 30 días en la comunidad', '🏅', 80, 'automatico', 'dias', 30, 1, '2026-06-30 00:36:18'),
(9, 'primera_opinion', 'Tu opinión importa', 'Participaste en tu primera encuesta', '💬', 15, 'automatico', 'opiniones', 1, 1, '2026-06-30 00:36:18'),
(10, 'influencer', 'Influencer', 'Tus tableros acumularon 100 vistas', '🌟', 100, 'automatico', 'vistas_tableros', 100, 1, '2026-06-30 00:36:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `amistades`
--

CREATE TABLE `amistades` (
  `id` int(11) NOT NULL,
  `solicitante_id` int(11) NOT NULL,
  `receptor_id` int(11) NOT NULL,
  `estado` enum('pendiente','aceptada','rechazada','bloqueada') DEFAULT 'pendiente',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `amistades`
--

INSERT INTO `amistades` (`id`, `solicitante_id`, `receptor_id`, `estado`, `creado_en`, `actualizado_en`) VALUES
(1, 2, 1, 'pendiente', '2026-06-30 16:34:06', '2026-06-30 16:34:06');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrito`
--

CREATE TABLE `carrito` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `talla` varchar(20) DEFAULT NULL,
  `cantidad` int(11) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrusel`
--

CREATE TABLE `carrusel` (
  `id` int(11) NOT NULL,
  `imagen` varchar(255) NOT NULL,
  `titulo` varchar(200) DEFAULT NULL,
  `subtitulo` varchar(300) DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `content_type` enum('texto','cronometro','nada','texto_cronometro') DEFAULT 'texto',
  `mostrar_boton` tinyint(1) DEFAULT 1,
  `boton_texto` varchar(80) DEFAULT 'EXPLORAR',
  `countdown_fecha` datetime DEFAULT NULL,
  `boton_url` varchar(255) DEFAULT '/productos',
  `destino_tipo` enum('url','producto','categoria','pagina') DEFAULT 'url',
  `destino_valor` varchar(255) DEFAULT NULL,
  `animacion` enum('fade-in','fade-up','fade-left','fade-right','zoom-in','zoom-out','scale','slide','ninguna') DEFAULT 'fade-in',
  `posicion_texto` enum('izquierda','centro','derecha') DEFAULT 'centro',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `carrusel`
--

INSERT INTO `carrusel` (`id`, `imagen`, `titulo`, `subtitulo`, `orden`, `activo`, `content_type`, `mostrar_boton`, `boton_texto`, `countdown_fecha`, `boton_url`, `destino_tipo`, `destino_valor`, `animacion`, `posicion_texto`, `creado_en`) VALUES
(4, '1782799757727-884957668.png', '', '', 1, 1, 'texto', 1, 'EXPLORAR', NULL, '/productos', 'url', NULL, 'fade-in', 'centro', '2026-06-30 06:09:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrusel_marca`
--

CREATE TABLE `carrusel_marca` (
  `id` int(11) NOT NULL,
  `imagen` varchar(255) NOT NULL,
  `titulo` varchar(200) DEFAULT NULL,
  `subtitulo` varchar(300) DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `boton_texto` varchar(80) DEFAULT NULL,
  `boton_url` varchar(255) DEFAULT '/productos',
  `color_acento` varchar(20) DEFAULT '#e91e8c'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_adjuntos`
--

CREATE TABLE `chat_adjuntos` (
  `id` int(11) NOT NULL,
  `mensaje_id` int(11) NOT NULL,
  `url` varchar(500) NOT NULL,
  `nombre_original` varchar(255) DEFAULT NULL,
  `tipo_mime` varchar(100) DEFAULT NULL,
  `tamanio_bytes` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_ia_mensajes`
--

CREATE TABLE `chat_ia_mensajes` (
  `id` int(11) NOT NULL,
  `sesion_id` int(11) NOT NULL,
  `rol` enum('user','assistant') NOT NULL,
  `contenido` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_ia_sesiones`
--

CREATE TABLE `chat_ia_sesiones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentarios`
--

CREATE TABLE `comentarios` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `calificacion` tinyint(4) DEFAULT NULL,
  `likes` int(11) DEFAULT 0,
  `dislikes` int(11) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentario_reacciones`
--

CREATE TABLE `comentario_reacciones` (
  `id` int(11) NOT NULL,
  `comentario_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('like','dislike') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentario_stickers`
--

CREATE TABLE `comentario_stickers` (
  `id` int(11) NOT NULL,
  `comentario_id` int(11) NOT NULL,
  `sticker_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_sitio`
--

CREATE TABLE `configuracion_sitio` (
  `id` int(11) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `valor` text DEFAULT NULL,
  `tipo` enum('texto','imagen','color','numero','json') DEFAULT 'texto',
  `descripcion` varchar(255) DEFAULT NULL,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_sitio`
--

INSERT INTO `configuracion_sitio` (`id`, `clave`, `valor`, `tipo`, `descripcion`, `actualizado_en`) VALUES
(1, 'logo', 'logo-default.png', 'imagen', 'Logo principal', '2026-06-30 00:31:18'),
(2, 'nombre_tienda', 'MANTIZ', 'texto', 'Nombre de la tienda', '2026-06-30 00:31:18'),
(3, 'color_primario', '#e91e8c', 'color', 'Color primario', '2026-06-30 16:25:27'),
(4, 'color_acento', '#ff5cb8', 'color', 'Color de acento', '2026-06-30 16:25:27'),
(5, 'meta_descripcion', '', 'texto', 'Descripción SEO', '2026-06-30 05:49:43'),
(6, 'meta_keywords', '', 'texto', 'Palabras clave SEO', '2026-06-30 05:49:43'),
(7, 'og_image', '', 'imagen', 'Imagen social por defecto (OG)', '2026-06-30 00:31:18'),
(8, 'footer_descripcion', '', 'texto', 'Descripción del footer', '2026-06-30 05:49:43'),
(9, 'footer_copyright', '', 'texto', 'Copyright del footer', '2026-06-30 05:49:43'),
(10, 'footer_email', '', 'texto', 'Email de contacto en footer', '2026-06-30 00:31:18'),
(11, 'footer_telefono', '', 'texto', 'Teléfono de contacto en footer', '2026-06-30 00:31:18'),
(12, 'footer_direccion', '', 'texto', 'Dirección en footer', '2026-06-30 00:31:18'),
(13, 'footer_links_json', '[]', 'json', 'Links adicionales del footer', '2026-06-30 00:31:18'),
(14, 'moneda', 'MXN', 'texto', 'Código de moneda', '2026-06-30 16:26:12'),
(15, 'simbolo_moneda', '$', 'texto', 'Símbolo de moneda', '2026-06-30 00:31:18'),
(16, 'metodos_pago_json', '[\"Tarjeta\",\"Efectivo\",\"PSE\",\"Nequi\",\"Daviplata\"]', 'json', 'Métodos de pago', '2026-06-30 16:26:27'),
(17, 'costo_envio', '8.99', 'numero', 'Costo base de envío', '2026-06-30 05:49:43'),
(18, 'envio_gratis_desde', '', 'numero', 'Monto para envío gratis', '2026-06-30 05:49:43'),
(28, 'terminos_pago', '', 'texto', 'Términos y condiciones de pago', '2026-06-30 00:36:21');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conversaciones`
--

CREATE TABLE `conversaciones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `estado` enum('activa','pendiente','importante','resuelta') DEFAULT 'pendiente',
  `ultimo_msg` text DEFAULT NULL,
  `ultimo_msg_en` datetime DEFAULT NULL,
  `no_leidos_usr` int(11) DEFAULT 0,
  `no_leidos_adm` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conversaciones_soporte`
--

CREATE TABLE `conversaciones_soporte` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `estado` enum('pendiente','activa','resuelta') DEFAULT 'pendiente',
  `ultimo_msg` text DEFAULT NULL,
  `ultimo_msg_en` datetime DEFAULT NULL,
  `no_leidos_usr` int(11) DEFAULT 0,
  `no_leidos_adm` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `conversaciones_soporte`
--

INSERT INTO `conversaciones_soporte` (`id`, `usuario_id`, `admin_id`, `estado`, `ultimo_msg`, `ultimo_msg_en`, `no_leidos_usr`, `no_leidos_adm`, `creado_en`, `actualizado_en`) VALUES
(1, 1, 1, 'pendiente', '[Archivo]', '2026-06-30 11:31:51', 0, 1, '2026-06-30 16:30:50', '2026-06-30 16:31:51'),
(2, 2, 1, 'pendiente', 'Gracias por escribirnos, en un momento te atendemos.', '2026-06-30 11:33:11', 0, 0, '2026-06-30 16:32:47', '2026-06-30 16:33:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `direcciones_entrega`
--

CREATE TABLE `direcciones_entrega` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `alias` varchar(50) DEFAULT 'Casa',
  `nombre_destinatario` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `pais` varchar(80) DEFAULT 'Colombia',
  `departamento` varchar(80) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `codigo_postal` varchar(20) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `predeterminada` tinyint(1) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `direcciones_entrega`
--

INSERT INTO `direcciones_entrega` (`id`, `usuario_id`, `alias`, `nombre_destinatario`, `telefono`, `pais`, `departamento`, `ciudad`, `direccion`, `codigo_postal`, `notas`, `lat`, `lng`, `predeterminada`, `creado_en`) VALUES
(1, 1, 'Entrega', 'asd', NULL, 'Colombia', 'Quindío', 'Perímetro Urbano Armenia', 'Parque de la Quindianidad, Centro, Comuna El Cafetero', NULL, NULL, 4.5365970, -75.6718970, 0, '2026-06-30 16:20:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encuestas`
--

CREATE TABLE `encuestas` (
  `id` int(11) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo_respuesta` enum('botones','imagenes','banners','estrellas') DEFAULT 'botones',
  `activa` tinyint(1) DEFAULT 1,
  `permite_sugerencias` tinyint(1) DEFAULT 0,
  `fecha_cierre` date DEFAULT NULL,
  `creado_por` int(11) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encuesta_opciones`
--

CREATE TABLE `encuesta_opciones` (
  `id` int(11) NOT NULL,
  `encuesta_id` int(11) NOT NULL,
  `texto` varchar(200) NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `votos` int(10) UNSIGNED DEFAULT 0,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `encuesta_votos`
--

CREATE TABLE `encuesta_votos` (
  `id` int(11) NOT NULL,
  `encuesta_id` int(11) NOT NULL,
  `opcion_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `sugerencia` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `homepage_config`
--

CREATE TABLE `homepage_config` (
  `clave` varchar(80) NOT NULL,
  `valor` text DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `homepage_config`
--

INSERT INTO `homepage_config` (`clave`, `valor`, `descripcion`) VALUES
('bestsellers_cantidad', '4', 'Bestsellers a mostrar'),
('mostrar_bestsellers', '1', 'Mostrar bestsellers con 3D'),
('mostrar_carrusel_marca', '1', 'Mostrar carrusel de marca'),
('mostrar_hero', '1', 'Mostrar hero carousel'),
('mostrar_productos', '1', 'Mostrar sección productos'),
('productos_cantidad', '8', 'Productos en inicio'),
('seccion_orden', 'hero,productos,bestsellers,carrusel_marca', 'Orden de secciones'),
('viewer3d_modelo_id', NULL, 'ID modelo 3D activo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logros`
--

CREATE TABLE `logros` (
  `id` int(11) NOT NULL,
  `clave` varchar(60) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `icono` varchar(50) DEFAULT '?',
  `tipo` enum('tiempo','tableros','pines','compras','social','encuestas','likes') DEFAULT 'social',
  `umbral` int(11) DEFAULT 1,
  `recompensa` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `logros`
--

INSERT INTO `logros` (`id`, `clave`, `nombre`, `descripcion`, `icono`, `tipo`, `umbral`, `recompensa`) VALUES
(1, 'primer_pin', 'Primer Pin', 'Guardaste tu primer pin', '📌', 'pines', 1, NULL),
(2, 'coleccionista', 'Coleccionista', 'Tienes 10 pines guardados', '🗂️', 'pines', 10, 'marco_plata'),
(3, 'tablero_creativo', 'Tablero Creativo', 'Creaste tu primer tablero', '🎨', 'tableros', 1, NULL),
(4, 'arquitecto', 'Arquitecto', 'Tienes 5 tableros activos', '🏗️', 'tableros', 5, 'marco_dorado'),
(5, 'primera_compra', 'Primera Compra', 'Completaste tu primera compra', '🛍️', 'compras', 1, 'marco_comprador'),
(6, 'comprador_vip', 'Comprador VIP', '5 compras completadas', '💎', 'compras', 5, 'animacion_fuego'),
(7, 'primer_like', 'Primer Like', 'Le diste like a tu primer producto', '❤️', 'likes', 1, NULL),
(8, 'explorador', 'Explorador', 'Diste 10 likes a productos', '🔍', 'likes', 10, NULL),
(9, 'hora_conectado', '1 Hora en MANTIZ', 'Llevas 1 hora en la plataforma', '⏱️', 'tiempo', 3600, NULL),
(10, 'social_butterfly', 'Social Butterfly', 'Tienes 3 amigos en MANTIZ', '🦋', 'social', 3, 'marco_social'),
(11, 'voz_activa', 'Voz Activa', 'Respondiste 5 encuestas', '🗣️', 'encuestas', 5, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_chat`
--

CREATE TABLE `mensajes_chat` (
  `id` int(11) NOT NULL,
  `emisor_id` int(11) NOT NULL,
  `receptor_id` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `tipo` enum('texto','sticker','producto') DEFAULT 'texto',
  `sticker_id` int(11) DEFAULT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `leido` tinyint(1) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_soporte`
--

CREATE TABLE `mensajes_soporte` (
  `id` int(11) NOT NULL,
  `conversacion_id` int(11) NOT NULL,
  `remitente_id` int(11) NOT NULL,
  `tipo` enum('texto','imagen','archivo','rapido') DEFAULT 'texto',
  `contenido` text DEFAULT NULL,
  `archivo_url` varchar(500) DEFAULT NULL,
  `archivo_nombre` varchar(255) DEFAULT NULL,
  `estado` enum('enviado','leido') DEFAULT 'enviado',
  `leido_en` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mensajes_soporte`
--

INSERT INTO `mensajes_soporte` (`id`, `conversacion_id`, `remitente_id`, `tipo`, `contenido`, `archivo_url`, `archivo_nombre`, `estado`, `leido_en`, `creado_en`) VALUES
(1, 1, 1, 'texto', 'hola', NULL, NULL, 'enviado', NULL, '2026-06-30 16:30:55'),
(2, 1, 1, 'texto', '¡Hola! ¿En qué puedo ayudarte hoy?', NULL, NULL, 'enviado', NULL, '2026-06-30 16:31:10'),
(3, 1, 1, 'imagen', '', '/uploads/chat/1782837111618-859386086.png', 'person.png', 'enviado', NULL, '2026-06-30 16:31:51'),
(4, 2, 2, 'texto', 'hola', NULL, NULL, 'leido', '2026-06-30 11:33:07', '2026-06-30 16:32:52'),
(5, 2, 1, 'texto', 'Gracias por escribirnos, en un momento te atendemos.', NULL, NULL, 'leido', '2026-06-30 11:33:38', '2026-06-30 16:33:11');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metodos_pago_usuario`
--

CREATE TABLE `metodos_pago_usuario` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('cuenta_bancaria','tarjeta') DEFAULT 'cuenta_bancaria',
  `banco` varchar(100) DEFAULT NULL,
  `titular` varchar(150) DEFAULT NULL,
  `numero_cuenta` varchar(60) DEFAULT NULL,
  `tipo_cuenta` enum('ahorros','corriente') DEFAULT 'ahorros',
  `info_adicional` text DEFAULT NULL,
  `predeterminado` tinyint(1) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `metodos_pago_usuario`
--

INSERT INTO `metodos_pago_usuario` (`id`, `usuario_id`, `tipo`, `banco`, `titular`, `numero_cuenta`, `tipo_cuenta`, `info_adicional`, `predeterminado`, `creado_en`) VALUES
(1, 1, 'cuenta_bancaria', 'DAVIPLATA', 'SEBASTIAN RAMIREZ', '123412341234', 'corriente', '', 1, '2026-06-30 16:22:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modelos_3d`
--

CREATE TABLE `modelos_3d` (
  `id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `archivo` varchar(255) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `es_principal` tinyint(1) DEFAULT 0,
  `escala` decimal(5,2) DEFAULT 1.00,
  `pos_y` decimal(5,2) DEFAULT 0.00,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `modelos_3d`
--

INSERT INTO `modelos_3d` (`id`, `nombre`, `archivo`, `producto_id`, `activo`, `es_principal`, `escala`, `pos_y`, `creado_en`) VALUES
(1, 'Susan', 'susan.glb', NULL, 1, 1, 1.00, 0.00, '2026-06-30 00:31:18'),
(2, 'Stella', 'stella.glb', NULL, 1, 0, 1.00, 0.00, '2026-06-30 00:31:18'),
(3, 'T-Shirt', 't_shirt.glb', NULL, 1, 0, 1.00, 0.00, '2026-06-30 00:31:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('amistad','descuento','mantenimiento','noticia','reaccion','mencion','pedido','logro') DEFAULT 'noticia',
  `titulo` varchar(150) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `enlace` varchar(255) DEFAULT NULL,
  `leida` tinyint(1) DEFAULT 0,
  `icono` varchar(50) DEFAULT 'bi-bell',
  `color` varchar(20) DEFAULT '#e91e8c',
  `datos_extra` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_extra`)),
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `usuario_id`, `tipo`, `titulo`, `mensaje`, `enlace`, `leida`, `icono`, `color`, `datos_extra`, `creado_en`) VALUES
(1, 1, 'noticia', '¡Logro desbloqueado: Tablero Creativo!', 'Creaste tu primer tablero', NULL, 1, '🎨', '#ffd700', NULL, '2026-06-30 15:30:47'),
(2, 1, 'noticia', '¡Logro desbloqueado: Primera Compra!', 'Completaste tu primera compra', NULL, 1, '🛍️', '#ffd700', NULL, '2026-06-30 16:20:21'),
(3, 1, 'amistad', '¡Nueva solicitud de amistad!', 'sebas quiere ser tu amigo en MANTIZ', '/u/saqes', 1, 'bi-person-plus-fill', '#e91e8c', NULL, '2026-06-30 16:34:06');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `direccion_id` int(11) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `costo_envio` decimal(10,2) DEFAULT 8.99,
  `metodo_pago` enum('tarjeta','transferencia','contraentrega','paypal','nequi','daviplata','efectivo','pse') DEFAULT 'tarjeta',
  `estado_pago` enum('pendiente','pagado','fallido','reembolsado') DEFAULT 'pendiente',
  `estado` enum('pendiente','confirmado','empaquetando','en_transito','en_aduana','con_conductor','entregado','cancelado') DEFAULT 'pendiente',
  `numero_tracking` varchar(50) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `fecha_estimada_entrega` date DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `entrega_lat` decimal(10,7) DEFAULT NULL,
  `entrega_lng` decimal(10,7) DEFAULT NULL,
  `entrega_direccion` varchar(255) DEFAULT NULL,
  `entrega_ciudad` varchar(100) DEFAULT NULL,
  `entrega_departamento` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `usuario_id`, `direccion_id`, `total`, `subtotal`, `costo_envio`, `metodo_pago`, `estado_pago`, `estado`, `numero_tracking`, `notas`, `fecha_estimada_entrega`, `creado_en`, `actualizado_en`, `entrega_lat`, `entrega_lng`, `entrega_direccion`, `entrega_ciudad`, `entrega_departamento`) VALUES
(1, 1, 1, 38.98, 29.99, 8.99, 'tarjeta', 'pagado', 'confirmado', 'MTZ-MR0URUE6-12', '', '2026-07-07', '2026-06-30 16:20:20', '2026-06-30 16:20:20', NULL, NULL, NULL, NULL, NULL),
(2, 1, 1, 98.98, 89.99, 8.99, 'tarjeta', 'pagado', 'cancelado', 'MTZ-MR0UXC0B-127', '', '2026-07-07', '2026-06-30 16:24:36', '2026-06-30 16:25:03', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_items`
--

CREATE TABLE `pedido_items` (
  `id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `talla` varchar(20) DEFAULT NULL,
  `cantidad` int(11) DEFAULT 1,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedido_items`
--

INSERT INTO `pedido_items` (`id`, `pedido_id`, `producto_id`, `talla`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 1, 'XL', 1, 29.99, 29.99),
(2, 2, 4, 'XL', 1, 89.99, 89.99);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_seguimiento`
--

CREATE TABLE `pedido_seguimiento` (
  `id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `proveedor_id` int(11) DEFAULT NULL,
  `estado` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `tipo_proveedor` enum('almacen','empaquetador','transporte','aduana','entrega') DEFAULT 'almacen',
  `fecha_hora` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedido_seguimiento`
--

INSERT INTO `pedido_seguimiento` (`id`, `pedido_id`, `proveedor_id`, `estado`, `descripcion`, `ubicacion`, `latitud`, `longitud`, `tipo_proveedor`, `fecha_hora`) VALUES
(1, 1, NULL, 'Pedido confirmado', 'Tu pedido ha sido recibido y confirmado exitosamente.', 'Almacén Central Mantiz, Bogotá', 4.6097100, -74.0817500, 'almacen', '2026-06-30 16:20:21'),
(2, 2, NULL, 'Pedido confirmado', 'Tu pedido ha sido recibido y confirmado exitosamente.', 'Almacén Central Mantiz, Bogotá', 4.6097100, -74.0817500, 'almacen', '2026-06-30 16:24:37');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfil_conexiones`
--

CREATE TABLE `perfil_conexiones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `plataforma` enum('playstation','xbox','steam','github','tiktok','spotify','twitch','discord') NOT NULL,
  `username` varchar(100) NOT NULL,
  `publico` tinyint(1) DEFAULT 1,
  `url` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `perfil_conexiones`
--

INSERT INTO `perfil_conexiones` (`id`, `usuario_id`, `plataforma`, `username`, `publico`, `url`, `creado_en`, `actualizado_en`) VALUES
(1, 1, 'playstation', 'saqes', 1, NULL, '2026-06-30 06:17:52', '2026-06-30 06:17:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfil_config`
--

CREATE TABLE `perfil_config` (
  `usuario_id` int(11) NOT NULL,
  `color_primario` varchar(20) DEFAULT '#e91e8c',
  `tema` enum('oscuro','claro') DEFAULT 'oscuro',
  `tema_global` enum('oscuro','claro') DEFAULT 'oscuro',
  `fondo_tipo` enum('color','imagen','gradiente') DEFAULT 'color',
  `fondo_valor` varchar(500) DEFAULT '#0a0a0a',
  `fondo_blur` int(11) DEFAULT 0,
  `pais` varchar(80) DEFAULT 'Colombia',
  `idioma` varchar(20) DEFAULT 'es',
  `metodo_pago_pref` varchar(50) DEFAULT 'tarjeta',
  `mostrar_favoritos` tinyint(1) DEFAULT 1,
  `mostrar_tableros` tinyint(1) DEFAULT 1,
  `ubicacion_ciudad` varchar(100) DEFAULT NULL,
  `ubicacion_depto` varchar(100) DEFAULT NULL,
  `ubicacion_pais` varchar(80) DEFAULT 'Colombia',
  `tiempo_total_seg` int(10) UNSIGNED DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `perfil_config`
--

INSERT INTO `perfil_config` (`usuario_id`, `color_primario`, `tema`, `tema_global`, `fondo_tipo`, `fondo_valor`, `fondo_blur`, `pais`, `idioma`, `metodo_pago_pref`, `mostrar_favoritos`, `mostrar_tableros`, `ubicacion_ciudad`, `ubicacion_depto`, `ubicacion_pais`, `tiempo_total_seg`, `creado_en`) VALUES
(1, '#8a004c', 'oscuro', 'oscuro', 'color', '#4d0057', 8, 'Colombia', 'es', 'daviplata', 1, 1, NULL, NULL, 'Colombia', 8400, '2026-06-30 05:51:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `perfil_widgets`
--

CREATE TABLE `perfil_widgets` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('juego','musica','pelicula') NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `subtitulo` varchar(200) DEFAULT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  `color_acento` varchar(20) DEFAULT '#e91e8c',
  `orden` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `precio_descuento` decimal(10,2) DEFAULT NULL,
  `imagen_principal` varchar(255) DEFAULT NULL,
  `imagen_secundaria` varchar(255) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `tags` varchar(255) DEFAULT '',
  `en_inicio` tinyint(1) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `total_likes` int(11) DEFAULT 0,
  `total_visitas` int(11) DEFAULT 0,
  `calificacion_promedio` decimal(3,2) DEFAULT 0.00,
  `total_calificaciones` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `imagen_hover` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `titulo`, `descripcion`, `precio`, `precio_descuento`, `imagen_principal`, `imagen_secundaria`, `categoria`, `tags`, `en_inicio`, `activo`, `total_likes`, `total_visitas`, `calificacion_promedio`, `total_calificaciones`, `creado_en`, `actualizado_en`, `imagen_hover`) VALUES
(1, 'Camiseta Premium Cotton', 'Camiseta de algodón 100% orgánico, suave al tacto y duradera.', 29.99, NULL, '1782836241061-337209249.jpg', NULL, 'Camisetas', 'camiseta,algodón,casual', 1, 1, 12, 0, 0.00, 0, '2026-06-30 00:31:18', '2026-06-30 16:17:21', NULL),
(2, 'Jeans Slim Fit', 'Jeans de corte slim fit con elastano.', 59.99, 49.99, '1782836257613-217339729.jpg', NULL, 'Pantalones', 'jeans,slim,denim', 1, 1, 8, 0, 0.00, 0, '2026-06-30 00:31:18', '2026-06-30 16:17:37', NULL),
(3, 'Vestido Floral', 'Elegante vestido con estampado floral.', 79.99, NULL, '1782836280301-969453168.jpg', NULL, 'Vestidos', 'vestido,floral', 1, 1, 24, 3, 0.00, 0, '2026-06-30 00:31:18', '2026-06-30 16:35:20', NULL),
(4, 'Chaqueta Urbana', 'Chaqueta urbana impermeable con múltiples bolsillos.', 119.99, 89.99, '1782836324573-276860063.jpg', NULL, 'Chaquetas', 'chaqueta,urbana', 1, 1, 6, 0, 0.00, 0, '2026-06-30 00:31:18', '2026-06-30 16:18:44', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_imagenes`
--

CREATE TABLE `producto_imagenes` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `imagen` varchar(255) NOT NULL,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_likes`
--

CREATE TABLE `producto_likes` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_tallas`
--

CREATE TABLE `producto_tallas` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `talla` varchar(20) NOT NULL,
  `stock` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `producto_tallas`
--

INSERT INTO `producto_tallas` (`id`, `producto_id`, `talla`, `stock`) VALUES
(1, 1, 'XS', 10),
(2, 1, 'S', 15),
(3, 1, 'M', 20),
(4, 1, 'L', 12),
(5, 1, 'XL', 8),
(6, 2, '28', 5),
(7, 2, '30', 10),
(8, 2, '32', 15),
(9, 2, '34', 8),
(10, 3, 'XS', 7),
(11, 3, 'S', 12),
(12, 3, 'M', 18),
(13, 3, 'L', 9),
(14, 4, 'S', 8),
(15, 4, 'M', 14),
(16, 4, 'L', 11),
(17, 4, 'XL', 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('almacen','empaquetador','transporte','aduana','entrega') DEFAULT 'transporte',
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id`, `nombre`, `tipo`, `telefono`, `email`, `ciudad`, `activo`, `creado_en`) VALUES
(1, 'Almacén Central Mantiz', 'almacen', '601-1234567', 'almacen@mantiz.com', 'Bogotá', 1, '2026-06-30 00:31:18'),
(2, 'EmpaquetaYa S.A.S', 'empaquetador', '601-7654321', 'empaque@empaquetaya.com', 'Bogotá', 1, '2026-06-30 00:31:18'),
(3, 'TurboEnvíos Colombia', 'transporte', '300-1234567', 'ops@turboenvios.co', 'Medellín', 1, '2026-06-30 00:31:18'),
(4, 'Aduana Express CO', 'aduana', '601-9876543', 'ops@aduanaexpress.co', 'Bogotá', 1, '2026-06-30 00:31:18'),
(5, 'MotoExpress Última Milla', 'entrega', '310-9999888', 'entregas@motoexpress.co', 'Bogotá', 1, '2026-06-30 00:31:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `endpoint` varchar(700) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `push_subscriptions`
--

INSERT INTO `push_subscriptions` (`id`, `usuario_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `creado_en`) VALUES
(3, 1, 'https://fcm.googleapis.com/fcm/send/c0ZnbF_kr6c:APA91bHbdOgjtPzA0S2Lh_CK9At2ZJcuhniwizFFVxEYlYBtUx9q7-gHV1ESYPo_L9eqlovuCbfAQiOJVdfHQoxpr8ygfbLEff_8PusX41GI377xByiGCnkpR2yIefppiEOgiD0o_4et', 'BO76iFawITMSrKpB7M4hGTihRQJ4Xz22e___TUsjzmbS-zgYbDFNYuN_1GleZXuITMYlCWCWWXfucYXUFiO634U', 'DC6_ne_l9K4wTwwlD_6m4A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-30 16:10:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `redes_sociales`
--

CREATE TABLE `redes_sociales` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `icono` varchar(50) NOT NULL,
  `url` varchar(500) DEFAULT '',
  `texto` varchar(100) DEFAULT '',
  `color` varchar(20) DEFAULT '#e91e8c',
  `visible` tinyint(1) DEFAULT 1,
  `orden` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `redes_sociales`
--

INSERT INTO `redes_sociales` (`id`, `nombre`, `icono`, `url`, `texto`, `color`, `visible`, `orden`, `creado_en`) VALUES
(1, 'Facebook', 'bi-facebook', '', 'Síguenos', '#1877f2', 0, 1, '2026-06-30 00:36:18'),
(2, 'Instagram', 'bi-instagram', 'https://www.instagram.com/mantiz.xe/', 'Instagram', '#e91e8c', 1, 2, '2026-06-30 00:36:18'),
(3, 'TikTok', 'bi-tiktok', '', 'TikTok', '#000000', 1, 3, '2026-06-30 00:36:18'),
(4, 'WhatsApp', 'bi-whatsapp', '', 'WhatsApp', '#25d366', 1, 4, '2026-06-30 00:36:18'),
(5, 'YouTube', 'bi-youtube', '', 'YouTube', '#ff0000', 0, 5, '2026-06-30 00:36:18'),
(6, 'X/Twitter', 'bi-twitter-x', '', 'Twitter', '#000000', 0, 6, '2026-06-30 00:36:18'),
(7, 'LinkedIn', 'bi-linkedin', '', 'LinkedIn', '#0077b5', 0, 7, '2026-06-30 00:36:18'),
(13, 'Discord', 'bi bi-discord', '', '', '#5865f2', 0, 8, '2026-06-30 14:47:34'),
(14, 'Telegram', 'bi bi-telegram', '', '', '#26a5e4', 0, 9, '2026-06-30 14:47:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones_stats`
--

CREATE TABLE `sesiones_stats` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `inicio` timestamp NOT NULL DEFAULT current_timestamp(),
  `fin` timestamp NULL DEFAULT NULL,
  `duracion_seg` int(11) DEFAULT 0,
  `pagina_inicio` varchar(255) DEFAULT NULL,
  `ip` varchar(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sesiones_stats`
--

INSERT INTO `sesiones_stats` (`id`, `usuario_id`, `session_id`, `inicio`, `fin`, `duracion_seg`, `pagina_inicio`, `ip`) VALUES
(1, 1, '7G9MBAai4HQhakByiBRTkrKXBM7ENCji', '2026-06-30 06:09:31', NULL, 0, '/', '::1'),
(2, 1, '7G9MBAai4HQhakByiBRTkrKXBM7ENCji', '2026-06-30 06:11:57', NULL, 0, '/', '::1'),
(3, 1, '7G9MBAai4HQhakByiBRTkrKXBM7ENCji', '2026-06-30 06:14:23', NULL, 0, '/', '::1'),
(4, 1, '7G9MBAai4HQhakByiBRTkrKXBM7ENCji', '2026-06-30 06:15:44', NULL, 0, '/', '::1'),
(5, 1, '7G9MBAai4HQhakByiBRTkrKXBM7ENCji', '2026-06-30 06:17:32', NULL, 0, '/', '::1'),
(6, 1, 'iw83Osir-IZRBX4Yn-0Bx2dj6WkyZjBb', '2026-06-30 15:07:12', NULL, 0, '/', '::1'),
(7, 1, 'kkVe2tOXBvkswc7qRUYzXw1FdH60O9Th', '2026-06-30 15:29:45', NULL, 0, '/', '::1'),
(8, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:10:09', NULL, 0, '/', '::1'),
(9, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:11:25', NULL, 0, '/', '::1'),
(10, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:12:39', NULL, 0, '/', '::1'),
(11, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:13:08', NULL, 0, '/', '::1'),
(12, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:16:29', NULL, 0, '/', '::1'),
(13, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:18:53', NULL, 0, '/', '::1'),
(14, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:19:14', NULL, 0, '/', '::1'),
(15, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:19:42', NULL, 0, '/', '::1'),
(16, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:21:15', NULL, 0, '/', '::1'),
(17, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:24:09', NULL, 0, '/', '::1'),
(18, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:28:10', NULL, 0, '/', '::1'),
(19, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:30:43', NULL, 0, '/', '::1'),
(20, 1, 'JMIPnvQ8MSyO3lKWlLexiVGZhaQ22pRw', '2026-06-30 16:31:25', NULL, 0, '/', '::1'),
(21, 2, 'UYHmgtlqJxoTX-4CbBc2CpyDzWMEJevN', '2026-06-30 16:32:37', NULL, 0, '/', '::1'),
(22, 1, 'YBJwYo3zlVKmYbA66CFJ181FpLCNQ6iY', '2026-06-30 16:33:14', NULL, 0, '/', '::1'),
(23, 2, '4k6071bib8QwacIKBAvFFWP4-nnDehbR', '2026-06-30 16:33:34', NULL, 0, '/', '::1'),
(24, 1, 'Hhmm2hKBS37nJmYHXLcetpI6audY5N9B', '2026-06-30 16:34:22', NULL, 0, '/', '::1'),
(25, 1, 'Hhmm2hKBS37nJmYHXLcetpI6audY5N9B', '2026-06-30 16:35:11', NULL, 0, '/', '::1'),
(26, 1, 'Hhmm2hKBS37nJmYHXLcetpI6audY5N9B', '2026-06-30 16:35:45', NULL, 0, '/', '::1');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stickers`
--

CREATE TABLE `stickers` (
  `id` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `archivo` varchar(255) NOT NULL,
  `tipo` enum('predeterminado','admin','usuario') DEFAULT 'predeterminado',
  `subido_por` int(11) DEFAULT NULL,
  `moderado` tinyint(1) DEFAULT 1,
  `activo` tinyint(1) DEFAULT 1,
  `categoria` varchar(50) DEFAULT 'general',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `stickers`
--

INSERT INTO `stickers` (`id`, `nombre`, `archivo`, `tipo`, `subido_por`, `moderado`, `activo`, `categoria`, `creado_en`) VALUES
(1, 'Fuego', 'fire.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:31:19'),
(2, 'Corazón', 'heart.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:31:19'),
(3, 'Aplausos', 'clap.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:31:19'),
(4, 'Wow', 'wow.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:31:19'),
(5, '100', '100.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:31:19'),
(6, 'Moda', 'fashion.gif', 'predeterminado', NULL, 1, 1, 'moda', '2026-06-30 00:31:19'),
(7, 'Outfit', 'outfit.gif', 'predeterminado', NULL, 1, 1, 'moda', '2026-06-30 00:31:19'),
(8, 'Stars', 'stars.gif', 'predeterminado', NULL, 1, 1, 'general', '2026-06-30 00:31:19'),
(9, 'Fuego', 'fire.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:36:10'),
(10, 'Corazón', 'heart.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:36:10'),
(11, 'Aplausos', 'clap.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:36:10'),
(12, 'Wow', 'wow.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:36:10'),
(13, '100', '100.gif', 'predeterminado', NULL, 1, 1, 'reacciones', '2026-06-30 00:36:10'),
(14, 'Moda', 'fashion.gif', 'predeterminado', NULL, 1, 1, 'moda', '2026-06-30 00:36:10'),
(15, 'Outfit', 'outfit.gif', 'predeterminado', NULL, 1, 1, 'moda', '2026-06-30 00:36:10'),
(16, 'Stars', 'stars.gif', 'predeterminado', NULL, 1, 1, 'general', '2026-06-30 00:36:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tableros`
--

CREATE TABLE `tableros` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `privacidad` enum('privado','publico','grupal') DEFAULT 'privado',
  `color_portada` varchar(20) DEFAULT '#e91e8c',
  `imagen_portada` varchar(255) DEFAULT NULL,
  `total_vistas` int(10) UNSIGNED DEFAULT 0,
  `total_pines` int(10) UNSIGNED DEFAULT 0,
  `total_reacciones` int(10) UNSIGNED DEFAULT 0,
  `total_guardados` int(10) UNSIGNED DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tableros`
--

INSERT INTO `tableros` (`id`, `usuario_id`, `nombre`, `descripcion`, `privacidad`, `color_portada`, `imagen_portada`, `total_vistas`, `total_pines`, `total_reacciones`, `total_guardados`, `creado_en`) VALUES
(1, 1, 'aaaa', '', 'publico', '#e91e8c', NULL, 4, 0, 0, 0, '2026-06-30 15:30:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tablero_guardados`
--

CREATE TABLE `tablero_guardados` (
  `id` int(11) NOT NULL,
  `tablero_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tablero_miembros`
--

CREATE TABLE `tablero_miembros` (
  `tablero_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `rol` enum('admin','miembro') DEFAULT 'miembro',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tablero_pines`
--

CREATE TABLE `tablero_pines` (
  `id` int(11) NOT NULL,
  `tablero_id` int(11) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  `titulo` varchar(200) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `url_externa` varchar(500) DEFAULT NULL,
  `tipo` enum('producto','imagen','link') DEFAULT 'producto',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tablero_reacciones`
--

CREATE TABLE `tablero_reacciones` (
  `id` int(11) NOT NULL,
  `tablero_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('like','love','fuego','wow') DEFAULT 'like',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tiendas`
--

CREATE TABLE `tiendas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `pais` varchar(80) DEFAULT 'Colombia',
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `horario` text DEFAULT NULL,
  `activa` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tiendas`
--

INSERT INTO `tiendas` (`id`, `nombre`, `direccion`, `ciudad`, `pais`, `latitud`, `longitud`, `telefono`, `email`, `horario`, `activa`, `creado_en`, `actualizado_en`) VALUES
(1, 'Mantiz Bogotá - Chapinero', 'Calle 60 #9-10', 'Bogotá', 'Colombia', 4.6464000, -74.0631000, '601-3001234', NULL, 'Lun-Sáb 9:00-20:00', 1, '2026-06-30 00:31:18', '2026-06-30 00:31:18'),
(2, 'Mantiz Medellín - Poblado', 'Calle 10A #43D-30', 'Medellín', 'Colombia', 6.2088000, -75.5649000, '604-3005678', NULL, 'Lun-Sáb 10:00-21:00', 1, '2026-06-30 00:31:18', '2026-06-30 00:31:18'),
(3, 'Mantiz Cali - Unicentro', 'Cra 100 #5-169, Unicentro', 'Cali', 'Colombia', 3.3862000, -76.5248000, '602-3009012', NULL, 'Lun-Dom 10:00-21:00', 1, '2026-06-30 00:31:18', '2026-06-30 00:31:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `nombre_visible` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','cliente') DEFAULT 'cliente',
  `foto_perfil` varchar(255) DEFAULT NULL,
  `foto_perfil_tipo` enum('upload','preset') DEFAULT 'preset',
  `foto_perfil_preset` varchar(100) DEFAULT 'avatar1.png',
  `banner` varchar(255) DEFAULT NULL,
  `banner_tipo` enum('upload','preset') DEFAULT 'preset',
  `banner_preset` varchar(100) DEFAULT 'banner1.jpg',
  `bio` text DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `color_perfil` varchar(20) DEFAULT '#e91e8c',
  `fondo_perfil_tipo` varchar(20) DEFAULT 'color',
  `fondo_perfil_valor` varchar(500) DEFAULT '#0a0a0a',
  `perfil_blur` int(11) DEFAULT 0,
  `pais` varchar(80) DEFAULT 'Colombia',
  `idioma` varchar(20) DEFAULT 'es',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notificaciones_push` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `username`, `nombre_visible`, `email`, `password`, `rol`, `foto_perfil`, `foto_perfil_tipo`, `foto_perfil_preset`, `banner`, `banner_tipo`, `banner_preset`, `bio`, `telefono`, `color_perfil`, `fondo_perfil_tipo`, `fondo_perfil_valor`, `perfil_blur`, `pais`, `idioma`, `activo`, `creado_en`, `actualizado_en`, `notificaciones_push`) VALUES
(1, 'admin', 'Administrador', 'admin@tienda.com', '$2a$10$FRpBO3u.dfCnWbKx0xTFqe1kejsDq/QMZ6rNXPzAf/61ssmnAya4m', 'admin', NULL, 'preset', 'avatar2.png', NULL, 'preset', 'banner1.jpg', NULL, NULL, '#e91e8c', 'color', '#0a0a0a', 0, 'Colombia', 'es', 1, '2026-06-30 00:31:17', '2026-06-30 16:21:37', 1),
(2, 'saqes', 'sebas', 'jramirezceballos27@gmail.com', '$2a$10$uBGhlHk7GkJAKzm3DT4NCOq.n1wa4Wi2jFEE0A4eGDCzhepf9PyuC', 'cliente', NULL, 'preset', 'avatar1.png', NULL, 'preset', 'banner1.jpg', NULL, NULL, '#e91e8c', 'color', '#0a0a0a', 0, 'Colombia', 'es', 1, '2026-06-30 16:32:29', '2026-06-30 16:32:29', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_logros`
--

CREATE TABLE `usuario_logros` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `logro_id` int(11) NOT NULL,
  `progreso` int(10) UNSIGNED DEFAULT 0,
  `desbloqueado` tinyint(1) DEFAULT 0,
  `fecha_desbloqueo` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuario_logros`
--

INSERT INTO `usuario_logros` (`id`, `usuario_id`, `logro_id`, `progreso`, `desbloqueado`, `fecha_desbloqueo`) VALUES
(1, 1, 9, 82, 0, NULL),
(42, 1, 4, 1, 0, NULL),
(43, 1, 3, 1, 1, '2026-06-30 15:30:47'),
(76, 1, 5, 1, 1, '2026-06-30 16:20:20'),
(77, 1, 6, 2, 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `visitas`
--

CREATE TABLE `visitas` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `pagina` varchar(255) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `duracion_segundos` int(11) DEFAULT 0,
  `duracion_seg` int(11) DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `visitas`
--

INSERT INTO `visitas` (`id`, `usuario_id`, `pagina`, `producto_id`, `ip`, `user_agent`, `duracion_segundos`, `duracion_seg`, `creado_en`) VALUES
(1, 1, '/productos/3', 3, '::1', NULL, 0, 0, '2026-06-30 16:19:07'),
(2, 1, '/productos/3', 3, '::1', NULL, 0, 0, '2026-06-30 16:30:40'),
(3, 1, '/productos/3', 3, '::1', NULL, 0, 0, '2026-06-30 16:35:20');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_perfil_resumen`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_perfil_resumen` (
`usuario_id` int(11)
,`username` varchar(50)
,`nombre_visible` varchar(100)
,`foto_perfil` varchar(255)
,`foto_perfil_tipo` enum('upload','preset')
,`foto_perfil_preset` varchar(100)
,`total_amigos` bigint(21)
,`total_tableros_publicos` bigint(21)
,`total_logros` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_productos_populares`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_productos_populares` (
`id` int(11)
,`titulo` varchar(150)
,`descripcion` text
,`precio` decimal(10,2)
,`precio_descuento` decimal(10,2)
,`imagen_principal` varchar(255)
,`imagen_secundaria` varchar(255)
,`categoria` varchar(100)
,`tags` varchar(255)
,`en_inicio` tinyint(1)
,`activo` tinyint(1)
,`total_likes` int(11)
,`total_visitas` int(11)
,`calificacion_promedio` decimal(3,2)
,`total_calificaciones` int(11)
,`creado_en` timestamp
,`actualizado_en` timestamp
,`total_visitas_real` bigint(21)
,`score_popularidad` bigint(14)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `_migrations`
--

CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `aplicada_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `_migrations`
--

INSERT INTO `_migrations` (`id`, `nombre`, `aplicada_en`) VALUES
(1, '001_social_v4.sql', '2026-06-30 00:36:10'),
(2, '002_indices_rendimiento.sql', '2026-06-30 00:36:11'),
(3, '003_vistas_utiles.sql', '2026-06-30 00:36:11'),
(4, '004_perf_indexes.sql', '2026-06-30 00:36:16'),
(5, '005_carrusel_pro.sql', '2026-06-30 00:36:16'),
(6, '006_seo_config.sql', '2026-06-30 00:36:16'),
(7, '007_chat_social_footer_achievements.sql', '2026-06-30 00:36:19'),
(8, '008_perfil_config.sql', '2026-06-30 00:36:21'),
(9, '009_defaults_y_safety.sql', '2026-06-30 00:36:22'),
(10, '007_correcciones_completas.sql', '2026-06-30 05:45:07'),
(11, '008_redes_sociales_unicas.sql', '2026-06-30 14:47:36'),
(12, '009_push_notifications.sql', '2026-06-30 14:47:38');

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_perfil_resumen`
--
DROP TABLE IF EXISTS `vw_perfil_resumen`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_perfil_resumen`  AS SELECT `u`.`id` AS `usuario_id`, `u`.`username` AS `username`, `u`.`nombre_visible` AS `nombre_visible`, `u`.`foto_perfil` AS `foto_perfil`, `u`.`foto_perfil_tipo` AS `foto_perfil_tipo`, `u`.`foto_perfil_preset` AS `foto_perfil_preset`, (select count(0) from `amistades` `a` where `a`.`estado` = 'aceptada' and (`a`.`solicitante_id` = `u`.`id` or `a`.`receptor_id` = `u`.`id`)) AS `total_amigos`, (select count(0) from `tableros` `t` where `t`.`usuario_id` = `u`.`id` and `t`.`privacidad` = 'publico') AS `total_tableros_publicos`, (select count(0) from `usuario_logros` `ul` where `ul`.`usuario_id` = `u`.`id` and `ul`.`desbloqueado` = 1) AS `total_logros` FROM `usuarios` AS `u` WHERE `u`.`activo` = 1 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_productos_populares`
--
DROP TABLE IF EXISTS `vw_productos_populares`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_productos_populares`  AS SELECT `p`.`id` AS `id`, `p`.`titulo` AS `titulo`, `p`.`descripcion` AS `descripcion`, `p`.`precio` AS `precio`, `p`.`precio_descuento` AS `precio_descuento`, `p`.`imagen_principal` AS `imagen_principal`, `p`.`imagen_secundaria` AS `imagen_secundaria`, `p`.`categoria` AS `categoria`, `p`.`tags` AS `tags`, `p`.`en_inicio` AS `en_inicio`, `p`.`activo` AS `activo`, `p`.`total_likes` AS `total_likes`, `p`.`total_visitas` AS `total_visitas`, `p`.`calificacion_promedio` AS `calificacion_promedio`, `p`.`total_calificaciones` AS `total_calificaciones`, `p`.`creado_en` AS `creado_en`, `p`.`actualizado_en` AS `actualizado_en`, (select count(0) from `visitas` `v` where `v`.`producto_id` = `p`.`id`) AS `total_visitas_real`, `p`.`total_likes`* 3 + `p`.`total_visitas` + `p`.`total_calificaciones` * 2 AS `score_popularidad` FROM `productos` AS `p` WHERE `p`.`activo` = 1 ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `amistades`
--
ALTER TABLE `amistades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_amistad` (`solicitante_id`,`receptor_id`),
  ADD KEY `idx_receptor` (`receptor_id`,`estado`),
  ADD KEY `idx_solicitante` (`solicitante_id`,`estado`),
  ADD KEY `idx_am_receptor_estado` (`receptor_id`,`estado`),
  ADD KEY `idx_am_solicitante_estado` (`solicitante_id`,`estado`);

--
-- Indices de la tabla `carrito`
--
ALTER TABLE `carrito`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `idx_usuario` (`usuario_id`);

--
-- Indices de la tabla `carrusel`
--
ALTER TABLE `carrusel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activo_orden` (`activo`,`orden`),
  ADD KEY `idx_carrusel_activo` (`activo`,`orden`);

--
-- Indices de la tabla `carrusel_marca`
--
ALTER TABLE `carrusel_marca`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `chat_adjuntos`
--
ALTER TABLE `chat_adjuntos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `mensaje_id` (`mensaje_id`);

--
-- Indices de la tabla `chat_ia_mensajes`
--
ALTER TABLE `chat_ia_mensajes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sesion_id` (`sesion_id`);

--
-- Indices de la tabla `chat_ia_sesiones`
--
ALTER TABLE `chat_ia_sesiones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_com_prod_activo_fecha` (`producto_id`,`activo`,`creado_en`);

--
-- Indices de la tabla `comentario_reacciones`
--
ALTER TABLE `comentario_reacciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reaccion` (`comentario_id`,`usuario_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `comentario_stickers`
--
ALTER TABLE `comentario_stickers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `comentario_id` (`comentario_id`),
  ADD KEY `sticker_id` (`sticker_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `configuracion_sitio`
--
ALTER TABLE `configuracion_sitio`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `conversaciones`
--
ALTER TABLE `conversaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conv_usuario` (`usuario_id`),
  ADD KEY `idx_conv_estado` (`estado`),
  ADD KEY `idx_conv_updated` (`actualizado_en`);

--
-- Indices de la tabla `conversaciones_soporte`
--
ALTER TABLE `conversaciones_soporte`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cs_usuario` (`usuario_id`),
  ADD KEY `idx_cs_estado` (`estado`);

--
-- Indices de la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`);

--
-- Indices de la tabla `encuestas`
--
ALTER TABLE `encuestas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `creado_por` (`creado_por`),
  ADD KEY `idx_activa` (`activa`);

--
-- Indices de la tabla `encuesta_opciones`
--
ALTER TABLE `encuesta_opciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_encuesta` (`encuesta_id`);

--
-- Indices de la tabla `encuesta_votos`
--
ALTER TABLE `encuesta_votos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_voto` (`encuesta_id`,`usuario_id`),
  ADD KEY `opcion_id` (`opcion_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `homepage_config`
--
ALTER TABLE `homepage_config`
  ADD PRIMARY KEY (`clave`);

--
-- Indices de la tabla `logros`
--
ALTER TABLE `logros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `mensajes_chat`
--
ALTER TABLE `mensajes_chat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conv` (`emisor_id`,`receptor_id`),
  ADD KEY `idx_receptor` (`receptor_id`,`leido`);

--
-- Indices de la tabla `mensajes_soporte`
--
ALTER TABLE `mensajes_soporte`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ms_conv` (`conversacion_id`),
  ADD KEY `idx_ms_fecha` (`creado_en`);

--
-- Indices de la tabla `metodos_pago_usuario`
--
ALTER TABLE `metodos_pago_usuario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `modelos_3d`
--
ALTER TABLE `modelos_3d`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario_leida` (`usuario_id`,`leida`),
  ADD KEY `idx_creado` (`creado_en`),
  ADD KEY `idx_notif_usuario_leida` (`usuario_id`,`leida`,`creado_en`),
  ADD KEY `idx_notif_uid_leida` (`usuario_id`,`leida`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `direccion_id` (`direccion_id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_creado` (`creado_en`),
  ADD KEY `idx_pedidos_usuario_estado` (`usuario_id`,`estado`);

--
-- Indices de la tabla `pedido_items`
--
ALTER TABLE `pedido_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `idx_pedido` (`pedido_id`);

--
-- Indices de la tabla `pedido_seguimiento`
--
ALTER TABLE `pedido_seguimiento`
  ADD PRIMARY KEY (`id`),
  ADD KEY `proveedor_id` (`proveedor_id`),
  ADD KEY `idx_pedido` (`pedido_id`);

--
-- Indices de la tabla `perfil_conexiones`
--
ALTER TABLE `perfil_conexiones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_conexion` (`usuario_id`,`plataforma`);

--
-- Indices de la tabla `perfil_config`
--
ALTER TABLE `perfil_config`
  ADD PRIMARY KEY (`usuario_id`);

--
-- Indices de la tabla `perfil_widgets`
--
ALTER TABLE `perfil_widgets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `idx_inicio` (`en_inicio`,`activo`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_likes` (`total_likes`),
  ADD KEY `idx_prod_activo_inicio` (`activo`,`en_inicio`),
  ADD KEY `idx_prod_activo_cat` (`activo`,`categoria`),
  ADD KEY `idx_prod_likes_activo` (`total_likes`,`activo`),
  ADD KEY `idx_prod_inicio_likes` (`activo`,`en_inicio`,`total_likes`),
  ADD KEY `idx_prod_cat_likes` (`activo`,`categoria`,`total_likes`),
  ADD KEY `idx_prod_activo_creado` (`activo`,`creado_en`);

--
-- Indices de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prod` (`producto_id`);

--
-- Indices de la tabla `producto_likes`
--
ALTER TABLE `producto_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_like` (`usuario_id`,`producto_id`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_usuario` (`usuario_id`,`creado_en`),
  ADD KEY `idx_likes_uid_fecha` (`usuario_id`,`creado_en`),
  ADD KEY `idx_pl_uid_fecha` (`usuario_id`,`creado_en`);

--
-- Indices de la tabla `producto_tallas`
--
ALTER TABLE `producto_tallas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prod` (`producto_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_endpoint` (`endpoint`(255)),
  ADD KEY `idx_push_usuario` (`usuario_id`);

--
-- Indices de la tabla `redes_sociales`
--
ALTER TABLE `redes_sociales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_redes_nombre_unico` (`nombre`);

--
-- Indices de la tabla `sesiones_stats`
--
ALTER TABLE `sesiones_stats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_inicio` (`inicio`);

--
-- Indices de la tabla `stickers`
--
ALTER TABLE `stickers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subido_por` (`subido_por`);

--
-- Indices de la tabla `tableros`
--
ALTER TABLE `tableros`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_privacidad` (`privacidad`),
  ADD KEY `idx_vistas` (`total_vistas`),
  ADD KEY `idx_tableros_pub_vistas` (`privacidad`,`total_vistas`),
  ADD KEY `idx_tab_uid_priv` (`usuario_id`,`privacidad`),
  ADD KEY `idx_tb_uid_fecha` (`usuario_id`,`creado_en`);

--
-- Indices de la tabla `tablero_guardados`
--
ALTER TABLE `tablero_guardados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_guardado` (`tablero_id`,`usuario_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `tablero_miembros`
--
ALTER TABLE `tablero_miembros`
  ADD PRIMARY KEY (`tablero_id`,`usuario_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `tablero_pines`
--
ALTER TABLE `tablero_pines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `idx_tablero` (`tablero_id`);

--
-- Indices de la tabla `tablero_reacciones`
--
ALTER TABLE `tablero_reacciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reaccion` (`tablero_id`,`usuario_id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `tiendas`
--
ALTER TABLE `tiendas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `usuario_logros`
--
ALTER TABLE `usuario_logros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_logro` (`usuario_id`,`logro_id`),
  ADD KEY `logro_id` (`logro_id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_desbloqueado` (`desbloqueado`);

--
-- Indices de la tabla `visitas`
--
ALTER TABLE `visitas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `idx_pagina` (`pagina`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_creado` (`creado_en`),
  ADD KEY `idx_visitas_producto` (`producto_id`),
  ADD KEY `idx_visitas_creado` (`creado_en`),
  ADD KEY `idx_visitas_pagina` (`pagina`);

--
-- Indices de la tabla `_migrations`
--
ALTER TABLE `_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `achievements`
--
ALTER TABLE `achievements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `amistades`
--
ALTER TABLE `amistades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `carrito`
--
ALTER TABLE `carrito`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `carrusel`
--
ALTER TABLE `carrusel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `carrusel_marca`
--
ALTER TABLE `carrusel_marca`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `chat_adjuntos`
--
ALTER TABLE `chat_adjuntos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `chat_ia_mensajes`
--
ALTER TABLE `chat_ia_mensajes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `chat_ia_sesiones`
--
ALTER TABLE `chat_ia_sesiones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `comentario_reacciones`
--
ALTER TABLE `comentario_reacciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `comentario_stickers`
--
ALTER TABLE `comentario_stickers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `configuracion_sitio`
--
ALTER TABLE `configuracion_sitio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `conversaciones`
--
ALTER TABLE `conversaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `conversaciones_soporte`
--
ALTER TABLE `conversaciones_soporte`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `encuestas`
--
ALTER TABLE `encuestas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `encuesta_opciones`
--
ALTER TABLE `encuesta_opciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `encuesta_votos`
--
ALTER TABLE `encuesta_votos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `logros`
--
ALTER TABLE `logros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `mensajes_chat`
--
ALTER TABLE `mensajes_chat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `mensajes_soporte`
--
ALTER TABLE `mensajes_soporte`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `metodos_pago_usuario`
--
ALTER TABLE `metodos_pago_usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `modelos_3d`
--
ALTER TABLE `modelos_3d`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `pedido_items`
--
ALTER TABLE `pedido_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `pedido_seguimiento`
--
ALTER TABLE `pedido_seguimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `perfil_conexiones`
--
ALTER TABLE `perfil_conexiones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `perfil_widgets`
--
ALTER TABLE `perfil_widgets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `producto_likes`
--
ALTER TABLE `producto_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `producto_tallas`
--
ALTER TABLE `producto_tallas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `redes_sociales`
--
ALTER TABLE `redes_sociales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `sesiones_stats`
--
ALTER TABLE `sesiones_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT de la tabla `stickers`
--
ALTER TABLE `stickers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `tableros`
--
ALTER TABLE `tableros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `tablero_guardados`
--
ALTER TABLE `tablero_guardados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tablero_pines`
--
ALTER TABLE `tablero_pines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tablero_reacciones`
--
ALTER TABLE `tablero_reacciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tiendas`
--
ALTER TABLE `tiendas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuario_logros`
--
ALTER TABLE `usuario_logros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=88;

--
-- AUTO_INCREMENT de la tabla `visitas`
--
ALTER TABLE `visitas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `_migrations`
--
ALTER TABLE `_migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `amistades`
--
ALTER TABLE `amistades`
  ADD CONSTRAINT `amistades_ibfk_1` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `amistades_ibfk_2` FOREIGN KEY (`receptor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `carrito`
--
ALTER TABLE `carrito`
  ADD CONSTRAINT `carrito_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `carrito_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `chat_adjuntos`
--
ALTER TABLE `chat_adjuntos`
  ADD CONSTRAINT `chat_adjuntos_ibfk_1` FOREIGN KEY (`mensaje_id`) REFERENCES `mensajes_chat` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `chat_ia_mensajes`
--
ALTER TABLE `chat_ia_mensajes`
  ADD CONSTRAINT `chat_ia_mensajes_ibfk_1` FOREIGN KEY (`sesion_id`) REFERENCES `chat_ia_sesiones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `chat_ia_sesiones`
--
ALTER TABLE `chat_ia_sesiones`
  ADD CONSTRAINT `chat_ia_sesiones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `comentarios`
--
ALTER TABLE `comentarios`
  ADD CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `comentario_reacciones`
--
ALTER TABLE `comentario_reacciones`
  ADD CONSTRAINT `comentario_reacciones_ibfk_1` FOREIGN KEY (`comentario_id`) REFERENCES `comentarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comentario_reacciones_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `comentario_stickers`
--
ALTER TABLE `comentario_stickers`
  ADD CONSTRAINT `comentario_stickers_ibfk_1` FOREIGN KEY (`comentario_id`) REFERENCES `comentarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comentario_stickers_ibfk_2` FOREIGN KEY (`sticker_id`) REFERENCES `stickers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comentario_stickers_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `conversaciones`
--
ALTER TABLE `conversaciones`
  ADD CONSTRAINT `conversaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `conversaciones_soporte`
--
ALTER TABLE `conversaciones_soporte`
  ADD CONSTRAINT `conversaciones_soporte_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  ADD CONSTRAINT `direcciones_entrega_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `encuestas`
--
ALTER TABLE `encuestas`
  ADD CONSTRAINT `encuestas_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `encuesta_opciones`
--
ALTER TABLE `encuesta_opciones`
  ADD CONSTRAINT `encuesta_opciones_ibfk_1` FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `encuesta_votos`
--
ALTER TABLE `encuesta_votos`
  ADD CONSTRAINT `encuesta_votos_ibfk_1` FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `encuesta_votos_ibfk_2` FOREIGN KEY (`opcion_id`) REFERENCES `encuesta_opciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `encuesta_votos_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mensajes_chat`
--
ALTER TABLE `mensajes_chat`
  ADD CONSTRAINT `mensajes_chat_ibfk_1` FOREIGN KEY (`emisor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_chat_ibfk_2` FOREIGN KEY (`receptor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mensajes_soporte`
--
ALTER TABLE `mensajes_soporte`
  ADD CONSTRAINT `mensajes_soporte_ibfk_1` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones_soporte` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `metodos_pago_usuario`
--
ALTER TABLE `metodos_pago_usuario`
  ADD CONSTRAINT `metodos_pago_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `modelos_3d`
--
ALTER TABLE `modelos_3d`
  ADD CONSTRAINT `modelos_3d_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`direccion_id`) REFERENCES `direcciones_entrega` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `pedido_items`
--
ALTER TABLE `pedido_items`
  ADD CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedido_items_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pedido_seguimiento`
--
ALTER TABLE `pedido_seguimiento`
  ADD CONSTRAINT `pedido_seguimiento_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedido_seguimiento_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `perfil_conexiones`
--
ALTER TABLE `perfil_conexiones`
  ADD CONSTRAINT `perfil_conexiones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `perfil_config`
--
ALTER TABLE `perfil_config`
  ADD CONSTRAINT `perfil_config_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `perfil_widgets`
--
ALTER TABLE `perfil_widgets`
  ADD CONSTRAINT `perfil_widgets_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD CONSTRAINT `producto_imagenes_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_likes`
--
ALTER TABLE `producto_likes`
  ADD CONSTRAINT `producto_likes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `producto_likes_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_tallas`
--
ALTER TABLE `producto_tallas`
  ADD CONSTRAINT `producto_tallas_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `stickers`
--
ALTER TABLE `stickers`
  ADD CONSTRAINT `stickers_ibfk_1` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `tableros`
--
ALTER TABLE `tableros`
  ADD CONSTRAINT `tableros_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `tablero_guardados`
--
ALTER TABLE `tablero_guardados`
  ADD CONSTRAINT `tablero_guardados_ibfk_1` FOREIGN KEY (`tablero_id`) REFERENCES `tableros` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tablero_guardados_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `tablero_miembros`
--
ALTER TABLE `tablero_miembros`
  ADD CONSTRAINT `tablero_miembros_ibfk_1` FOREIGN KEY (`tablero_id`) REFERENCES `tableros` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tablero_miembros_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `tablero_pines`
--
ALTER TABLE `tablero_pines`
  ADD CONSTRAINT `tablero_pines_ibfk_1` FOREIGN KEY (`tablero_id`) REFERENCES `tableros` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tablero_pines_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `tablero_reacciones`
--
ALTER TABLE `tablero_reacciones`
  ADD CONSTRAINT `tablero_reacciones_ibfk_1` FOREIGN KEY (`tablero_id`) REFERENCES `tableros` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tablero_reacciones_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario_logros`
--
ALTER TABLE `usuario_logros`
  ADD CONSTRAINT `usuario_logros_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `usuario_logros_ibfk_2` FOREIGN KEY (`logro_id`) REFERENCES `logros` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `visitas`
--
ALTER TABLE `visitas`
  ADD CONSTRAINT `visitas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
