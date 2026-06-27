# factories/

⚪ Pendiente. Las "factories" generan datos de prueba realistas desde Node
(útiles para tests automatizados, no para producción).

Propuesta de estructura cuando se implemente:
```
factories/
  usuarioFactory.js     // crea N usuarios con bcrypt real
  productoFactory.js    // crea productos con imágenes/tallas
  comunidadFactory.js    // tableros + pines + reacciones
```
Cada factory usaría `config/database.js` (el mismo pool) e
`INSERT ... VALUES` con datos de `faker` (paquete a evaluar/instalar).
No se incluye código todavía para no añadir una dependencia nueva sin que el
equipo decida si vale la pena para el alcance actual del proyecto.
