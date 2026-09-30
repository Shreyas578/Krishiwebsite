import express from 'express';
const router = express.Router();
import {
  createOrUpdateFarmProfile,
  getFarmProfile,
  getFarmCrops,
  addCropToFarm
} from '../controllers/farm.controller.js';

// Farm profile routes
router.post('/profile/:userId', createOrUpdateFarmProfile);
router.get('/profile/:userId', getFarmProfile);

// Farm crops routes
router.get('/crops/:farmProfileId', getFarmCrops);
router.post('/crops/:farmProfileId', addCropToFarm);

export default router;
