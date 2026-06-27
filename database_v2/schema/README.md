# schema/

El esquema completo y actual es la suma de:
- `../migrations/000_schema_base.sql` (27 tablas base)
- `../migrations/001_social_v4.sql` (13 tablas sociales/v4)
- `../migrations/002_indices_rendimiento.sql` (índices adicionales)
- `../migrations/003_vistas_utiles.sql` (2 vistas)

Ver `../documentation/SCHEMA.md` para la descripción funcional de cada
tabla y `../README.md` para cómo ejecutar todo con `migrate.js`.
