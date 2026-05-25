const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads/', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
};

const uploadProduct = multer({ storage: createStorage('products'), fileFilter: imageFilter, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB
const uploadProfile = multer({ storage: createStorage('profiles'), fileFilter: imageFilter, limits: { fileSize: 3 * 1024 * 1024 } });
const uploadCarousel = multer({ storage: createStorage('banners'), fileFilter: imageFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB
const uploadLogo = multer({ storage: createStorage('logo'), fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadBanner = multer({ storage: createStorage('banners'), fileFilter: imageFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

module.exports = { uploadProduct, uploadProfile, uploadCarousel, uploadLogo, uploadBanner };

// 3D model upload
const modelFilter = (req, file, cb) => {
  const allowed = /glb|gltf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ext) return cb(null, true);
  cb(new Error('Solo se permiten modelos 3D (.glb, .gltf)'));
};

const uploadModel3d = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../public/models');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Keep original name for .glb files, prefix with timestamp if collision
      const orig = path.basename(file.originalname);
      const dest = path.join(__dirname, '../public/models', orig);
      if (fs.existsSync(dest)) {
        cb(null, Date.now() + '-' + orig);
      } else {
        cb(null, orig);
      }
    }
  }),
  fileFilter: modelFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Sticker upload (gif/png/webp, max 2MB)
const stickerFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = /image\/(jpeg|png|gif|webp)/.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo imágenes/GIFs para stickers'));
};
const uploadSticker = multer({ storage: createStorage('stickers'), fileFilter: stickerFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Encuesta option images (max 5MB)
const uploadEncuesta = multer({ storage: createStorage('encuestas'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { uploadProduct, uploadProfile, uploadCarousel, uploadLogo, uploadBanner, uploadModel3d, uploadSticker, uploadEncuesta };
