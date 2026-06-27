# SCHEMA.md — Esquema de base de datos MANTIZ

Documentación funcional de las 40 tablas del proyecto, agrupadas por
dominio. El DDL completo (tipos exactos, defaults, índices, FKs) vive en
`migrations/000_schema_base.sql` (27 tablas) y `migrations/001_social_v4.sql`
(13 tablas) — este documento explica **qué es cada tabla y cómo se
relaciona**, no repite el DDL.

---

## 1. Usuarios y perfil

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `usuarios` | Cuenta de cada persona: credenciales, rol (`cliente`/`admin`), avatar/banner, bio. | Tabla raíz: casi todo referencia `usuarios.id`. |
| `perfil_config` | Preferencias de perfil 1:1 con el usuario: color primario, tema (oscuro/claro), idioma, ubicación, tiempo total en sitio (gamificación). | `usuario_id` → `usuarios.id` (PK=FK). |
| `perfil_widgets` | Bloques personalizables del perfil público (tipo, título, imagen, orden). | `usuario_id` → `usuarios.id`. |
| `perfil_conexiones` *(v4)* | Redes/plataformas conectadas (Discord, Steam, Spotify, etc.), con visibilidad pública/privada. | `usuario_id` → `usuarios.id`. |
| `direcciones_entrega` | Direcciones de envío guardadas, con marca de "predeterminada" (estilo Mercado Libre). | `usuario_id` → `usuarios.id`. |
| `sesiones_stats` | Registro de sesiones (inicio/fin/duración) para analítica y gamificación. | `usuario_id` → `usuarios.id`. |

## 2. Catálogo de productos

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `productos` | Catálogo principal: título, precio, descuento, categoría, tags, likes/visitas, calificación promedio. | Referenciada por carrito, pedidos, tableros, likes, comentarios, modelos 3D. |
| `producto_imagenes` | Galería de imágenes adicionales por producto, con orden. | `producto_id` → `productos.id`. |
| `producto_tallas` | Stock por talla. | `producto_id` → `productos.id`. |
| `producto_likes` | Favoritos de usuarios sobre productos. | `usuario_id`, `producto_id`. |
| `modelos_3d` | Modelos `.glb` asociados a un producto (o "principal" para el visor del home). | `producto_id` → `productos.id` (nullable). |
| `carrusel` | Slides del banner principal del home (imagen, título, CTA). | — |
| `carrusel_marca` | Slides del carrusel secundario de marca. | — |
| `homepage_config` | Configuración clave/valor de secciones del home (qué mostrar, cuántos productos, etc.). | — |
| `configuracion_sitio` | Configuración global del sitio (nombre tienda, colores, moneda, redes — usado en cada request por el middleware de `app.js`). | — |

## 3. Comentarios y reacciones

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `comentarios` | Reseñas/comentarios de productos con calificación, likes/dislikes. | `producto_id`, `usuario_id`. |
| `comentario_reacciones` | Registro de qué usuario dio like/dislike a qué comentario (evita duplicados). | `comentario_id`, `usuario_id`. |
| `comentario_stickers` *(v4)* | Stickers reaccionando a un comentario. | `comentario_id`, `sticker_id`, `usuario_id`. |

## 4. Carrito, pedidos y logística

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `carrito` | Ítems en el carrito de cada usuario (producto + talla + cantidad). | `usuario_id`, `producto_id`. |
| `pedidos` | Cabecera de pedido: totales, método de pago, estado, tracking. | `usuario_id`, `direccion_id` → `direcciones_entrega.id`. |
| `pedido_items` | Líneas de un pedido (snapshot de precio al momento de comprar). | `pedido_id`, `producto_id`. |
| `pedido_seguimiento` | Eventos de tracking (ubicación, estado, proveedor). | `pedido_id`, `proveedor_id`. |
| `proveedores` | Transportistas/proveedores logísticos. | — |

## 5. Tiendas físicas / mapa

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `tiendas` | Sucursales físicas: nombre, dirección, coordenadas (lat/long), horario. Base del mapa Leaflet en admin y, próximamente, en la vista de usuario (Punto 2). | — |

## 6. Tableros (estilo Pinterest)

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `tableros` | Tablero/colección creado por un usuario (nombre, privacidad, portada). | `usuario_id` → `usuarios.id`. |
| `tablero_pines` | Pines dentro de un tablero: pueden ser un producto del catálogo o un enlace/imagen externa. | `tablero_id`, `producto_id` (nullable). |
| `tablero_miembros` | Miembros con acceso a un tablero colaborativo. | `tablero_id`, `usuario_id`. |
| `tablero_reacciones` *(v4)* | Reacciones (like, etc.) a un tablero público. | `tablero_id`, `usuario_id`. |
| `tablero_guardados` *(v4)* | Tableros públicos guardados/repineados por otro usuario. | `tablero_id`, `usuario_id`. |

## 7. Social (v4): amistades, notificaciones, chat

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `amistades` *(v4)* | Solicitudes/relaciones de amistad (`pendiente`/`aceptada`/`rechazada`/`bloqueada`). | `solicitante_id`, `receptor_id` → `usuarios.id`. |
| `notificaciones` *(v4)* | Notificaciones por usuario (amistad, descuento, reacción, pedido, etc.), con `leida` e índice por `(usuario_id, leida)`. **Esta es la tabla del Problema Crítico #1.** | `usuario_id` → `usuarios.id`. |
| `mensajes_chat` *(v4)* | Mensajes directos entre usuarios (texto, sticker o producto compartido), backing del chat SSE (`/chat/stream`). | `emisor_id`, `receptor_id` → `usuarios.id`. |
| `stickers` *(v4)* | Stickers subidos por usuarios, con moderación admin. **Sistema marcado para eliminación en V2** (ver roadmap). | `subido_por` → `usuarios.id`. |

## 8. Comunidad: encuestas/opiniones

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `encuestas` *(v4)* | Encuestas/polls de la comunidad (single/multi-choice, con sugerencias abiertas opcionales). | `creado_por` → `usuarios.id`. |
| `encuesta_opciones` *(v4)* | Opciones de cada encuesta, con contador de votos. | `encuesta_id`. |
| `encuesta_votos` *(v4)* | Voto individual de cada usuario (o sugerencia de texto libre). | `encuesta_id`, `opcion_id`, `usuario_id`. |

## 9. Gamificación

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `logros` *(v4)* | Catálogo de logros disponibles (clave, nombre, tipo, umbral, recompensa). | — |
| `usuario_logros` *(v4)* | Progreso/desbloqueo de cada logro por usuario. | `usuario_id`, `logro_id`. |

## 10. Analítica / Asistente IA

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `visitas` | Registro de páginas vistas (para "más vendidos", "cerca de ti", analítica). | `usuario_id` (nullable), `producto_id` (nullable). |
| `chat_ia_sesiones` | Sesión del asistente de IA por usuario/visitante. | `usuario_id` (nullable). |
| `chat_ia_mensajes` | Historial de mensajes de cada sesión de IA. | `sesion_id` → `chat_ia_sesiones.id`. |

---

## Notas de migración (v4)

- `001_social_v4.sql` también incluye dos `ALTER TABLE` (vía `ADD COLUMN IF
  NOT EXISTS`, seguros de re-ejecutar):
  - `perfil_config`: agrega `tema_global`, `ubicacion_ciudad`,
    `ubicacion_depto`, `ubicacion_pais`, `tiempo_total_seg`.
  - `tableros`: agrega `total_vistas`, `imagen_portada`.
- Si alguna de estas 13 tablas "v4" no existe en tu base de datos, corre
  `node database_v2/migrate.js` (o simplemente reinicia el servidor: se
  ejecuta automáticamente).
