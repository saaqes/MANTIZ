# backups/

⚪ Carpeta reservada para dumps de `mysqldump`. No se generan
automáticamente (no es responsabilidad del código de la app crear backups
de producción). Sugerencia de comando para generar uno manual antes de
aplicar migraciones nuevas en producción:

```bash
mysqldump -u <user> -p --no-tablespaces tienda_ropa > database_v2/backups/backup_$(date +%Y%m%d).sql
```

Recuerda añadir `database_v2/backups/*.sql` a `.gitignore` si vas a usar
esta carpeta — los dumps pueden contener datos de usuarios reales.
