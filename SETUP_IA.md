# MANTIZ — Configurar IA Gratuita (Google Gemini)

## Por que Gemini?
- **100% GRATIS** sin tarjeta de credito
- Sin fecha de vencimiento  
- 250 requests/dia en tier gratuito (suficiente para una tienda)
- Modelo: Gemini 2.5 Flash (muy capaz)

---

## Paso 1: Obtener API Key GRATIS

1. Ve a **https://aistudio.google.com/apikey**
2. Inicia sesion con tu cuenta de Google (cualquier Gmail)
3. Haz clic en **"Create API key"**
4. Selecciona "Create API key in new project"
5. **Copia la clave** (empieza con `AIzaSy...`)

*No necesitas tarjeta de credito, no necesitas facturacion.*

---

## Paso 2: Agregar la key al proyecto

Abre el archivo `.env` en la raiz del proyecto:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_password_mysql
DB_NAME=tienda_ropa
DB_PORT=3306
SESSION_SECRET=mantiz-secret-2025-ultra-secure
PORT=3000

# IA GRATUITA - Google Gemini
GEMINI_API_KEY=AIzaSy_TU_CLAVE_AQUI
```

---

## Paso 3: Reiniciar

```bash
npm start
```

---

## Que se activa con la API Key

| Funcion | Descripcion |
|---------|-------------|
| Chat flotante | Asistente en toda la pagina, conoce tu catalogo |
| Busqueda inteligente | Sugerencias semanticas al buscar productos |
| Recomendaciones | Aprende de los likes del usuario y sugiere productos |
| Widget busqueda | Busca juegos/musica/peliculas para el perfil |

---

## Limites gratuitos (marzo 2026)

| Modelo | RPM | Req/dia |
|--------|-----|---------|
| Gemini 2.5 Flash | 10 | 250 |
| Gemini 2.5 Flash-Lite | 15 | 1,000 |

Para una tienda normal esto es mas que suficiente.
Si necesitas mas, puedes agregar facturacion de Google Cloud 
(sigue siendo muy barato: ~$0.30 por millon de tokens).

---

## Sin API Key

El proyecto funciona perfectamente sin la key:
- Chat muestra mensaje informativo
- Recomendaciones usan algoritmo de BD (likes + categorias)
- Busqueda usa SQL tradicional
- Widgets usan placeholder de imagen

---

## Solucion de errores comunes

| Error | Solucion |
|-------|----------|
| 400 Bad Request | Formato del modelo incorrecto - ya corregido en el codigo |
| 429 Resource Exhausted | Limite diario alcanzado, espera hasta medianoche PST |
| API key not valid | Verifica que copiaste bien la key desde AI Studio |

