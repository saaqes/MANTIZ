# MANTIZ v4 — PostgreSQL + Cloudflare R2

Stack listo para desplegar en **Render** + **Neon** (PostgreSQL) + **Cloudflare R2** (storage de imágenes y modelos 3D).

## Flujo de archivos

```
Usuario → EJS form (multipart)
       → Multer (memoryStorage — sin disco)
       → Sharp (solo imágenes: resize + WebP)
       → Cloudflare R2 / S3
       → PostgreSQL (guarda URL completa)
       → Express → EJS
       → <img src="URL_R2"> o <model-viewer src="URL_R2">
```

## Setup rápido

### 1. Variables de entorno

Copia `.env.example` → `.env` y completa:

```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key
R2_SECRET_ACCESS_KEY=tu_secret
R2_BUCKET_NAME=mantiz
R2_PUBLIC_URL=https://pub-xxx.r2.dev
SESSION_SECRET=secreto-muy-largo
```

### 2. Cloudflare R2

1. Crea un bucket en Cloudflare R2 (nombre: `mantiz`)
2. Habilita **Public Access** en el bucket
3. Crea un **API Token** con permisos `Object Read & Write`
4. Copia `Account ID`, `Access Key ID` y `Secret Access Key`

### 3. Inicializar base de datos

```bash
npm install
node setup.js
```

### 4. Desarrollo local

```bash
npm run dev
```

### 5. Desplegar en Render

1. Crea un **Web Service** conectado al repo
2. **Build Command:** `npm install`  
3. **Start Command:** `node app.js`  
4. Agrega todas las vars de entorno en Render → Environment
5. En el primer deploy corre `node setup.js` desde la consola de Render

## Credenciales por defecto

| Campo    | Valor             |
|----------|-------------------|
| Email    | admin@mantiz.co   |
| Password | Admin1234!        |

## Carpetas R2

| Carpeta    | Contenido                    | Sharp |
|------------|------------------------------|-------|
| `products` | Imágenes de productos        | ✅ WebP 800×1066 |
| `profiles` | Fotos de perfil              | ✅ WebP 400×400  |
| `banners`  | Banners/carrusel/perfiles    | ✅ WebP 1920×900 |
| `logo`     | Logo del sitio               | ✅ PNG 400×400   |
| `stickers` | Stickers (GIFs sin procesar) | 🔀 PNG/GIF       |
| `models`   | Modelos 3D .glb/.gltf        | ❌ (binario raw) |

## Stickers predeterminados

Coloca los GIFs en `public/img/stickers/`:  
`fire.gif`, `heart.gif`, `clap.gif`, `wow.gif`, `100.gif`, `fashion.gif`, `outfit.gif`, `stars.gif`
