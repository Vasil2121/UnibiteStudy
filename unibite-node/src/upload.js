import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const originalExtension = path.extname(file.originalname).toLowerCase();
    const extension = ALLOWED_EXTENSIONS.includes(originalExtension)
      ? originalExtension
      : EXTENSION_BY_MIME_TYPE[file.mimetype];

    cb(null, crypto.randomUUID() + extension);
  }
});

function fileFilter(req, file, cb) {
  if (!EXTENSION_BY_MIME_TYPE[file.mimetype]) {
    const error = new Error('Επιτρέπονται μόνο εικόνες JPG, PNG ή WEBP.');
    error.code = 'INVALID_IMAGE_TYPE';
    cb(error);
    return;
  }

  cb(null, true);
}

const singlePhotoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_PHOTO_BYTES }
}).single('photo');

export function uploadPhoto(req, res, next) {
  singlePhotoUpload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      const message = 'Η φωτογραφία ξεπερνά τα 5 MB.';
      return res.status(400).json({ error: message, fields: { photo: message } });
    }

    if (err.code === 'INVALID_IMAGE_TYPE') {
      return res.status(400).json({ error: err.message, fields: { photo: err.message } });
    }

    next(err);
  });
}

export async function detectImageType(filePath) {
  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);

    if (bytesRead < 12) {
      return null;
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return 'image/png';
    }

    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
      return 'image/webp';
    }

    return null;
  } finally {
    await handle.close();
  }
}

export async function removeUploadedFile(filename) {
  if (!filename) {
    return;
  }

  try {
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
    }
  }
}
