# procedures/

El único procedimiento del proyecto, `mantiz_add_col` (agrega columnas solo
si no existen), vive en `../migrations/000_schema_base.sql` porque usa
`DELIMITER $$`, sintaxis del CLIENTE `mysql` que el driver `mysql2` (usado
por `database_v2/migrate.js`) no soporta vía `multipleStatements`.

Por eso `000_schema_base.sql` se marca como "ejecución manual" — se corre
UNA vez con el cliente `mysql` al crear la base de datos. Las migraciones
001-003 (automáticas) deliberadamente NO usan procedimientos/`DELIMITER`
para poder ejecutarse solas desde Node.
