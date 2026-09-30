import express from 'express';
const router = express.Router();
import { getPrice, getMultiplePrices, checkConfig } from '../controllers/priceController.js';

// Market price endpoints - These are called by the web app at /api/market
router.get('/prices', getMultiplePrices); // GET /api/market/prices - Get prices for commodities
router.get('/price', getPrice); // GET /api/market/price - Get single commodity price
router.get('/status', checkConfig); // GET /api/market/status - Check if service is configured

export default router;
