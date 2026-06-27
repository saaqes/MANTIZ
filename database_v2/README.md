# database_v2 — Base de datos MANTIZ

Esta carpeta organiza la base de datos del proyecto de forma profesional,
**sin romper la base de datos existente**. No es una base de datos nueva
desde cero: es una reorganización + sistema de migraciones automáticas sobre
el esquema actual (`database.sql` + `nuevas_tablas_v4.sql`), que ya estaba
bien diseñado pero le faltaba un mecanismo para garantizar que TODAS las
tablas se crearan en TODOS los entornos.

## Cómo correr las migraciones

```bash
node database_v2/migrate.js
```

También se ejecuta **automáticamente al iniciar el servidor** (`app.js`), de
forma no bloqueante: si falla, el servidor sigue arrancando igual que antes
(solo se registra el error en consola).

Es **idempotente**: se puede correr cuantas veces quieras, en cualquier
entorno (local, Render, etc.) — solo crea lo que falte.

## Estado de cada carpeta

| Carpeta | Estado | Contenido |
|---|---|---|
| `migrations/` | ✅ Funcional | `000_schema_base.sql` (referencia/manual, 27 tablas base) · `001_social_v4.sql` (automática — **soluciona el Problema Crítico #1**: notificaciones, amistades, logros, etc.) · `002_indices_rendimiento.sql` (automática, índices nuevos en `visitas`) · `003_vistas_utiles.sql` (automática, 2 vistas SQL) |
| `documentation/` | ✅ Disponible | `SCHEMA.md` — qué es cada una de las 40 tablas y cómo se relacionan |
| `indexes/` | ✅ Documentado | Los índices reales están en `migrations/002_indices_rendimiento.sql`; aquí se documentan candidatos futuros |
| `views/` | ✅ Documentado | Las vistas reales están en `migrations/003_vistas_utiles.sql` (`vw_perfil_resumen`, `vw_productos_populares`) |
| `seeds/` | 🟡 Manual | `001_demo_comunidad.sql` — encuesta de ejemplo para probar Comunidad en local (no automática) |
| `factories/` | ⚪ Pendiente | Generadores de datos de prueba (Node), para tests automatizados |
| `triggers/` | ⚪ Pendiente | No se detectó una necesidad crítica actual; se evaluará caso por caso |
| `procedures/` | ⚪ Pendiente | El único procedimiento existente (`mantiz_add_col`) vive en `000_schema_base.sql` (requiere `DELIMITER`, ejecución manual) |
| `backups/` | ⚪ Pendiente | Carpeta reservada para dumps (`mysqldump`) — no se generan automáticamente |
| `constraints/` | ✅ Ya incluidas | Todas las FK/UNIQUE/CHECK ya están definidas dentro de `migrations/*.sql` junto a cada tabla (es el estándar recomendado: constraints viven con su tabla) |
| `schema/` | ✅ Ya incluido | Redirige a `migrations/` — el esquema completo es la suma de los 4 archivos de `migrations/` |

## Por qué esta estructura y no "una BD nueva desde cero"

Reescribir las 40 tablas desde cero (con sus ~25 rutas y vistas que ya
dependen de los nombres/columnas actuales) violaría la regla más importante
del propio pedido: **"NO romper funcionalidades existentes"**. El esquema
actual está, en general, bien normalizado (FKs, índices en las tablas
nuevas, `ON DELETE CASCADE` correcto). El problema real no era el DISEÑO de
las tablas, sino que **`nuevas_tablas_v4.sql` nunca se ejecutó de forma
garantizada** en todos los entornos — de ahí el error de `notificaciones` y,
potencialmente, fallas silenciosas en amistades, logros, encuestas, chat,
conexiones de perfil y reacciones/guardados de tableros (las 13 tablas de esa
migración). `database_v2/migrate.js` resuelve esto de raíz y de forma
reutilizable para futuras migraciones (002, 003, ...).
