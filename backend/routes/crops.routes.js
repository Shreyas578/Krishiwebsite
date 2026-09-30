import express from 'express';
const router = express.Router();
import {
  getAllCrops,
  getCropDetails
} from '../controllers/crop.controller.js';

// Crop endpoints
router.get('/list', getAllCrops);
router.get('/:cropId', getCropDetails);

export default router;
