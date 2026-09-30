import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import ipfsController from '../controllers/ipfs.controller.js';

const router = express.Router();

// Configure multer for memory storage (we'll upload buffers to IPFS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // Limit file size to 20MB
  }
});

const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB for batch uploads
  }
});

// All routes require authentication
router.use(authMiddleware);

/**
 * Image Upload Endpoints
 */

// Upload single image
// POST /api/ipfs/upload
// Body: { farmId?, uploadType? }
// File: multipart image file
router.post('/upload', upload.single('file'), ipfsController.uploadImage);

// Upload multiple images
// POST /api/ipfs/upload-batch
// Body: { farmId?, uploadType? }
// Files: multipart image files
router.post('/upload-batch', uploadMultiple.array('files', 10), ipfsController.uploadMultipleImages);

/**
 * JSON Upload Endpoints
 */

// Upload JSON data (receipts, reports, metadata)
// POST /api/ipfs/upload-json
// Body: { data: Object, uploadType? }
router.post('/upload-json', ipfsController.uploadJSON);

/**
 * Retrieval Endpoints
 */

// Get image by IPFS hash
// GET /api/ipfs/get/:ipfsHash
router.get('/get/:ipfsHash', ipfsController.getImage);

// Get user's uploads
// GET /api/ipfs/uploads?uploadType=general
router.get('/uploads', ipfsController.getUserUploads);

/**
 * Status Endpoints
 */

// Get IPFS service status
// GET /api/ipfs/status
router.get('/status', ipfsController.getStatus);

export default router;


