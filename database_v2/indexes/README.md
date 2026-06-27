# indexes/

Los índices críticos viven junto a cada tabla en `../migrations/` (estándar
recomendado: un índice se define donde se define la tabla).

- Índices ya existentes en `001_social_v4.sql`: `notificaciones
  (usuario_id, leida)`, `notificaciones (creado_en)`, `amistades` (UNIQUE +
  FKs), etc.
- Nuevo en `002_indices_rendimiento.sql` (se ejecuta automáticamente):
  `visitas (producto_id)`, `visitas (creado_en)`, `visitas (pagina)` — antes
  no existían y son necesarios para "Más vendidos"/"Cerca de ti"/analítica.

## Candidatos para una futura migración 00X (no aplicados todavía)
- `tablero_pines (tablero_id, creado_en)` — si el feed de comunidad ordena
  pines por fecha dentro de un tablero con muchos pines.
- `mensajes_chat (emisor_id, receptor_id, creado_en)` — para listar
  conversaciones ordenadas; medir primero con datos reales antes de añadir.
- `pedidos (usuario_id, estado)` — para "Mis pedidos" filtrando por estado.

Recomendación: agregar estos SOLO si `EXPLAIN` muestra table scans con datos
reales — un índice de más también tiene costo (escritura más lenta).
