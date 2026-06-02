/**
 * config/storage.js — Cloudflare R2 / S3 + Sharp
 *
 * Exports:
 *   uploadImage(buffer, originalName, folder, opts) → URL string
 *   uploadFile(buffer, originalName, folder, contentType) → URL string
 *   deleteFromR2(urlOrKey) → void
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'mantiz';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

// Genera un nombre único para el archivo
function uniqueName(ext = '') {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

/**
 * Procesa imagen con Sharp (→ WebP) y sube a R2.
 * @param {Buffer} buffer  - Buffer del archivo (desde multer memoryStorage)
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folder  - Carpeta destino en R2 (ej: 'products', 'profiles')
 * @param {object} opts    - { maxWidth, maxHeight, quality }
 * @returns {Promise<string>} URL pública completa
 */
async function uploadImage(buffer, originalName, folder, opts = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 85,
    keepPng = false, // para logos/stickers con transparencia
  } = opts;

  let processed, contentType, ext;

  if (keepPng) {
    processed = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .png({ quality })
      .toBuffer();
    contentType = 'image/png';
    ext = '.png';
  } else {
    processed = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    contentType = 'image/webp';
    ext = '.webp';
  }

  const key = `${folder}/${uniqueName(ext)}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: processed,
    ContentType: contentType,
  }));

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Sube un archivo binario directamente a R2 (sin Sharp).
 * Usado para .glb, .gltf, GIFs animados, etc.
 * @returns {Promise<string>} URL pública completa
 */
async function uploadFile(buffer, originalName, folder, contentType = 'application/octet-stream') {
  const ext = path.extname(originalName).toLowerCase();
  const key = `${folder}/${uniqueName(ext)}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Elimina un objeto de R2 a partir de su URL pública o su key.
 */
async function deleteFromR2(urlOrKey) {
  if (!urlOrKey || !urlOrKey.startsWith('http')) return;
  let key = urlOrKey.replace(PUBLIC_URL + '/', '');
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.error('R2 delete error:', e.message);
  }
}

module.exports = { uploadImage, uploadFile, deleteFromR2 };
