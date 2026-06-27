# constraints/

Todas las constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE) ya están definidas
junto a su tabla en `../migrations/000_schema_base.sql` y
`001_social_v4.sql` — es el estándar recomendado (una constraint sin su
tabla no tiene sentido). Aquí no se duplican para evitar que queden
desincronizadas.

Constraints relevantes ya presentes:
- `amistades`: `UNIQUE (solicitante_id, receptor_id)` — evita solicitudes
  duplicadas.
- `producto_likes`: `UNIQUE (usuario_id, producto_id)` — evita likes
  duplicados.
- Todas las FK de `001_social_v4.sql` usan `ON DELETE CASCADE` hacia
  `usuarios`, así que borrar un usuario limpia automáticamente sus
  notificaciones, amistades, logros, conexiones, mensajes, etc.
