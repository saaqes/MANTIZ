# views/

El contenido real vive en `../migrations/003_vistas_utiles.sql` (se ejecuta
automáticamente vía `CREATE OR REPLACE VIEW`, no afecta tablas existentes):

- `vw_perfil_resumen` — usuario + total de amigos, tableros públicos y
  logros desbloqueados. Pensada para el "Directorio de usuarios".
- `vw_productos_populares` — productos activos + score combinado de likes/
  visitas/calificación, para las categorías "Más vendidos" / "Destacados" /
  "Cerca de ti" del catálogo.

Para usarlas desde código: `SELECT * FROM vw_perfil_resumen WHERE usuario_id=?`
igual que una tabla normal.
