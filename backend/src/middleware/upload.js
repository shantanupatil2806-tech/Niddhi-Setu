const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Ensure directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Storage configuration with unique randomized names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `fdr-${uniqueId}${ext}`);
  }
});

// Allowed file MIME types and extensions
const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const allowedExts = ['.pdf', '.jpeg', '.jpg', '.png'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, JPEG, and PNG files are permitted.'), false);
  }
};

const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024 // 10MB default
  }
});

const uploadSingle = upload.single('document');
const uploadMultiple = upload.array('documents', 5);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadDirectory
};
