import express from 'express';
import farmerController from '../controllers/farmer.controller.js';

const {
  getProfile,
  updateProfile,
  getFarmDetails,
  updateFarmDetails
} = farmerController;

const router = express.Router();

// Farmer profile endpoints
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Farmer farm details endpoints
router.get('/farm-details', getFarmDetails);
router.put('/farm-details', updateFarmDetails);

export default router;

