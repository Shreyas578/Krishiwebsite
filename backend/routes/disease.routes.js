import express from 'express';
import multer from 'multer';
const router = express.Router();
import { detectDisease, checkStatus } from '../controllers/disease.controller.js';

// Configure multer for image uploads (memory storage for performance)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    // Accept image files or generic browser streams when no MIME type is supplied
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed, got ${file.mimetype}`));
    }
  }
});

// Disease detection endpoint - accepts multipart form data with image
router.post('/detect', upload.single('image'), detectDisease);

// Disease service status endpoint
router.get('/status', checkStatus);

export default router;

