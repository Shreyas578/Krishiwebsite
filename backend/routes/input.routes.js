import express from 'express';
import inputController from '../controllers/input.controller.js';

const {
  getInventory,
  purchaseInput,
  getUsageHistory,
  useInput
} = inputController;

const router = express.Router();

// Input routes
router.get('/inventory', getInventory);
router.post('/purchase', purchaseInput);
router.get('/usage-history', getUsageHistory);
router.post('/use', useInput);

export default router;

