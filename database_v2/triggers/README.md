# triggers/

⚪ Sin necesidad crítica detectada en la auditoría actual. La lógica que
normalmente iría en triggers (incrementar `total_likes`, `total_visitas`,
contadores de `encuesta_opciones.votos`, etc.) ya se maneja explícitamente
desde las rutas Node (`producto_likes`, `notificaciones.js`,
`opiniones.js`), lo cual es más fácil de debuggear para un equipo pequeño.

Si en el futuro se detectan inconsistencias entre contadores (p.ej.
`productos.total_likes` desincronizado de `COUNT(producto_likes)`), un buen
primer trigger sería:

```sql
CREATE TRIGGER trg_producto_likes_inc AFTER INSERT ON producto_likes
FOR EACH ROW UPDATE productos SET total_likes = total_likes + 1 WHERE id = NEW.producto_id;
```

(y su equivalente AFTER DELETE). No se agrega todavía para no introducir
lógica "invisible" sin acuerdo del equipo.
