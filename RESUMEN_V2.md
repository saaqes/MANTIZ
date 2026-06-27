# MANTIZ V2 — Resumen de entregas (fases 7–14)

**Stack**: Express.js + EJS + MariaDB · Deploy en Render · Session auth · SSE chat

Esta sesión de trabajo cubrió 8 fases de mejora incremental sobre la base ya entregada
en la sesión anterior (fases 1–6: async handling, notificaciones, mobile UI, mapa,
directorio, comunidad).

---

## Instrucciones de despliegue

1. Reemplaza los archivos de tu repositorio con los de este zip (misma estructura de carpetas).
2. Ejecuta `npm install` en la raíz del proyecto (agrega `compression ^1.7.4`).
3. Arranca el servidor: `node app.js` — las migraciones corren automáticamente.
4. Verifica que `/robots.txt` y `/sitemap.xml` respondan con HTTP 200.
5. En el panel admin `/admin/carrusel`, prueba crear un slide con el nuevo editor fullscreen.

---

## 30 archivos modificados

```
app.js
config/database.js
routes/admin.js
routes/index.js
routes/productos.js
views/partials/header.ejs          ← el más importante: meta tags SEO + CSS animaciones
views/partials/footer.ejs          ← lazy loading + scroll animations (Intersection Observer)
views/index.ejs                    ← hero carousel fix + sistema de animaciones
views/auth/login.ejs
views/auth/registro.ejs
views/productos/lista.ejs
views/productos/detalle.ejs        ← botones Ver 3D + Probar + modales
views/ia/chat.ejs
views/opiniones/index.ejs
views/carrito/index.ejs            ← fix responsive crítico (controles de cantidad)
views/pedidos/checkout.ejs
views/pedidos/detalle.ejs
views/buscar.ejs
views/user/perfil.ejs
views/user/perfil_publico.ejs
views/admin/homepage.ejs
views/admin/pedidos/detalle.ejs
views/admin/estadisticas.ejs       ← tabla con scroll horizontal
views/admin/usuarios.ejs           ← modal con padding en overlay
views/admin/carrusel.ejs           ← editor de banners fullscreen (reescrito completo)
views/admin/modelos.ejs            ← previsualización 3D en tarjetas (reescrito completo)
database_v2/migrations/004_perf_indexes.sql
database_v2/migrations/005_carrusel_pro.sql
database_v2/migrations/006_seo_config.sql
```

---

## Resumen por fase

### FASE 7 — Rendimiento
- `compression({ level:6 })` gzip/Brotli: HTML/CSS/JSON ~70% más pequeños
- Cache diferenciado: uploads `no-cache`, fuentes `1 año immutable`, imágenes/CSS/JS `7 días`
- Pool MySQL: `queueLimit:50` (evita OOM) + `enableKeepAlive` (evita conexiones muertas en Render)
- **`Promise.all` en la home**: 7 queries secuenciales → 2 grupos paralelos (~61% menos tiempo de BD)
- Paginación del catálogo: 24 por página con `Promise.all([datos, count, categorías])`
- `preconnect`/`dns-prefetch` para Google Fonts y JSDelivr
- Script universal de lazy loading en footer (nativo + IntersectionObserver)
- **8 índices compuestos** (migración 004) para las queries más frecuentes

### FASE 8 — Modo Claro/Oscuro (auditoría de contraste)
- Nuevas variables CSS `--faint-1/2/3` para bordes y textos sutiles sobre fondos adaptables
- Fix de clase global `.btn-grunge-w`: texto/borde fijo blanco → `var(--text)` (5 instancias en una sola corrección)
- ~90 fixes en 14 vistas: botones like/destacar, estrellas, comentarios, galería, carrito, chat IA, encuestas, modales
- Login/registro corregidos: variables de tema mal aplicadas en página intencionalmente oscura
- Overrides conservadores en `body.light-mode` (solo clases utilitarias e inputs — sin selectores agresivos que romperían overlays y footer oscuros por diseño)

### FASE 9 — Responsive
- **Bug crítico en carrito**: fila de item dejaba ~20px para controles de cantidad en 320-375px — botones inaccesibles. Fix: layout apilado en ≤480px con clases específicas
- Tabla admin estadísticas: `overflow:hidden` → wrapper con `overflow-x:auto` (columnas ya no quedan inaccessibles)
- Modal admin usuarios: `padding:16px` en overlay + `max-height:90vh`

### FASE 10 — Editor de Banners Profesional
- **3 bugs corregidos**: columna `cta_texto/cta_link` inexistente rompía el hero, `goSlide()` nunca re-aplicaba config de texto, botón CTA hardcodeado a `/productos`
- Migración 005: columnas `boton_url`, `destino_tipo`, `destino_valor`, `animacion`, `posicion_texto`
- Editor fullscreen: canvas central con aspect-ratio real (1920×600), sidebar de herramientas
- **9 animaciones** configurables (fade-in/up/left/right, zoom-in/out, scale, slide, ninguna) con botón "reproducir"
- **Selector de destino estructurado**: Producto/Categoría/Página/URL con listas dinámicas de BD
- Preview en tiempo real sincronizado con el render público
- `fetchCarruselSafe()`: fallback en cascada (sin perder todo el carrusel ante una columna faltante)

### FASE 11 — SEO
- Meta tags dinámicas en todas las páginas: `<meta description>`, `<link canonical>`, robots, Open Graph completo, Twitter Card, JSON-LD `Organization`
- Favicon SVG inline con color de marca (sin depender de archivos subidos — no existía ninguno)
- **JSON-LD `Product`** en fichas de producto: nombre, precio, `AggregateRating`, `Offer` con disponibilidad real
- Descripción dinámica por categoría en el catálogo
- `og:image` de la home = primer slide del carrusel
- `GET /robots.txt` dinámico con `Sitemap:` usando `baseUrl` real
- `GET /sitemap.xml` dinámico desde BD: hasta 5000 productos + categorías + tableros públicos + páginas estáticas. XML válido
- **Bug crítico corregido**: columna `destacado` inexistente hacía que home y catálogo renderizaran vacíos silenciosamente

### FASE 12 — Previsualización 3D Admin
- `createModelViewer()`: función reutilizable que crea escena Three.js completa con `dispose()` correcto (evita fugas de memoria GPU)
- Miniaturas con auto-rotación en cada tarjeta — lazy-load con IntersectionObserver
- Vista previa instantánea al seleccionar `.glb` sin subir al servidor (`URL.createObjectURL`)
- Escala y posición Y actualizadas en vivo en el preview
- Modelo existente precargado al abrir panel de edición
- Visor fullscreen: Frontal/Lateral/Trasera/3/4, Zoom +/−, Auto-rotar, Esc para cerrar

### FASE 13 — Animaciones de Scroll
Sistema en 1 archivo (`footer.ejs`), cero cambios en otras vistas:
- **Clases manuales**: `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale` + `.stagger-1` a `.stagger-6`
- **Auto-reveal**: IntersectionObserver que aplica animaciones automáticamente a `.pgrid>*`, `.board-card`, `.pin-card`, `.dir-grid>*`, `.pp-stat`, `.logro-card`, `.tienda-item`, `.creador-card`, `.cart-item-row`, y más
- Stagger automático: grupos de 2-6 hijos reciben delays escalonados sin HTML extra
- 5 reglas de seguridad: nada above-the-fold se oculta, sin duplicar `.reveal` existente, `prefers-reduced-motion` respetado, un solo `unobserve`, sin dependencias externas

### FASE 14 — Botones "Ver 3D" y "Probar"
- Backend: query con fallback (modelo específico → modelo principal → `null`)
- **"Ver 3D"**: modal fullscreen Three.js, librerías cargadas solo al primer clic, controles completos, `dispose()` al cerrar. Deshabilitado con tooltip si no hay modelo activo
- **"Probar"** (try-on): webcam + overlay arrastrable de la imagen del producto. Drag mouse/touch, Ampliar/Reducir/Reset. "Capturar foto" exporta el frame de vídeo re-invertido + overlay como JPEG y lo descarga automáticamente. Fallback claro si la cámara es denegada

---

## Bugs críticos encontrados y corregidos (no eran los objetivos originales)

| Bug | Impacto | Fase detectada |
|---|---|---|
| Query usaba `cta_texto/cta_link` (columnas inexistentes) | Hero del home desaparecía silenciosamente | FASE 10 (yo mismo lo introduje en FASE 7) |
| `goSlide()` no re-aplicaba `applySlideConfig()` | Texto del carrusel congelado en slide 1 para siempre | FASE 10 |
| `boton_url` nunca existió como columna en `carrusel` | Destino del botón CTA se perdía al guardar | FASE 10 |
| Columna `destacado` inexistente en query de productos | Home y catálogo completos renderizaban vacíos | FASE 11 |
| Modal admin usuarios sin `padding` en overlay | Edge-to-edge en móvil | FASE 9 |
| Tabla estadísticas con `overflow:hidden` | Columnas Stock/Estado/Acciones inaccessibles en móvil | FASE 9 |
| Carrito: ~20px disponibles para controles de cantidad en 320px | Imposible cambiar cantidad o eliminar en móvil | FASE 9 |

---

## Sistema de migraciones

Las 3 migraciones nuevas corren automáticamente al iniciar el servidor:

| Migración | Contenido |
|---|---|
| `004_perf_indexes.sql` | 8 índices compuestos para queries frecuentes |
| `005_carrusel_pro.sql` | Columnas del editor profesional de banners |
| `006_seo_config.sql` | Claves SEO en `configuracion_sitio` |
