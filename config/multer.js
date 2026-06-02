/**
 * config/multer.js — Solo memoryStorage (sin disco).
 * 
 * El buffer se pasa a Sharp + R2 en cada ruta.
 * No se crean carpetas locales de uploads.
 */
const multer = require('multer');
const path = require('path');

const mem = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const ext = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  const mime = /image\/(jpeg|png|gif|webp)/.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
};

const modelFilter = (req, file, cb) => {
  const ext = /glb|gltf/.test(path.extname(file.originalname).toLowerCase());
  if (ext) return cb(null, true);
  cb(new Error('Solo se permiten modelos 3D (.glb, .gltf)'));
};

const stickerFilter = (req, file, cb) => {
  const ext = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  const mime = /image\/(jpeg|png|gif|webp)/.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo imágenes/GIFs para stickers'));
};

const MB = 1024 * 1024;

const uploadProduct  = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 15 * MB } });
const uploadProfile  = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 3 * MB } });
const uploadCarousel = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 20 * MB } });
const uploadLogo     = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 2 * MB } });
const uploadBanner   = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 20 * MB } });
const uploadModel3d  = multer({ storage: mem, fileFilter: modelFilter,  limits: { fileSize: 50 * MB } });
const uploadSticker  = multer({ storage: mem, fileFilter: stickerFilter, limits: { fileSize: 2 * MB } });
const uploadEncuesta = multer({ storage: mem, fileFilter: imageFilter, limits: { fileSize: 5 * MB } });

module.exports = {
  uploadProduct, uploadProfile, uploadCarousel, uploadLogo,
  uploadBanner, uploadModel3d, uploadSticker, uploadEncuesta,
};
