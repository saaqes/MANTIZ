# MANTIZ — Tienda Completa

## Fusión: Diseño visual master (grunge/animations/3D) + Backend completo (DB/Admin/Auth)

### Stack
- **Backend**: Node.js + Express + EJS
- **DB**: MySQL/MariaDB
- **Auth**: Session + bcryptjs
- **Storage**: Multer (uploads)
- **3D**: Three.js (modelos .glb en /public/models/)

### Setup
```bash
npm install
# Configurar .env con credenciales DB
# Importar database.sql en MariaDB
node setup.js   # (opcional: datos de prueba)
npm start
```

### Variables de entorno (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=tienda_ropa
DB_PORT=3306
SESSION_SECRET=mantiz-secret-2025
PORT=3000
```

### Características
- ✅ Navbar grunge con scroll-hide
- ✅ Hero carousel con banners de BD
- ✅ Productos en grid estilo master con hover crossfade
- ✅ Panel de carrito lateral con filtro grunge
- ✅ Modal de talla para quick-add
- ✅ Visor 3D con modelos .glb
- ✅ Admin panel completo (productos, pedidos, usuarios, config)
- ✅ Auth (login, registro, sesión)
- ✅ Perfil con avatares y direcciones
- ✅ Checkout y tracking de pedidos
- ✅ IA chat flotante
- ✅ Mapa de tiendas con Leaflet
- ✅ Responsive mobile-first
