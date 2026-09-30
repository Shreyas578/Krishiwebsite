import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as marketService from '../services/marketIntelligenceService.js';

const router = express.Router();

/**
 * GET /api/market/prices
 * Get current market prices for commodity and state
 */
router.get('/prices', async (req, res) => {
  try {
    const { commodity, state } = req.query;

    if (!commodity || !state) {
      return res.status(400).json({ error: 'Commodity and state required' });
    }

    const prices = await marketService.getCurrentMarketPrices(commodity, state);
    res.status(200).json({ success: true, data: prices });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/forecast
 * Get price forecast
 */
router.get('/forecast', async (req, res) => {
  try {
    const { commodity, state, days = 30 } = req.query;

    if (!commodity || !state) {
      return res.status(400).json({ error: 'Commodity and state required' });
    }

    const forecast = await marketService.forecastPrice(commodity, state, parseInt(days));
    res.status(200).json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/smart-price
 * Get smart listing price suggestion
 */
router.get('/smart-price', async (req, res) => {
  try {
    const { commodity, state, quality = 'average', costPerUnit } = req.query;

    if (!commodity || !state) {
      return res.status(400).json({ error: 'Commodity and state required' });
    }

    const suggestion = await marketService.calculateSmartListingPrice(
      commodity,
      state,
      quality,
      costPerUnit ? parseFloat(costPerUnit) : null
    );

    res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    console.error('Error calculating smart price:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/demand
 * Get demand score for commodity
 */
router.get('/demand', async (req, res) => {
  try {
    const { commodity, month } = req.query;

    if (!commodity || !month) {
      return res.status(400).json({ error: 'Commodity and month required' });
    }

    const demand = await marketService.getDemandScore(commodity, parseInt(month));
    res.status(200).json({ success: true, data: { demandScore: demand } });
  } catch (error) {
    console.error('Error fetching demand score:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/market/alerts
 * Create price alert
 */
router.post('/alerts', authMiddleware, async (req, res) => {
  try {
    const { commodity, state, targetPrice, condition } = req.body;

    if (!commodity || !state || !targetPrice || !condition) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const alert = await marketService.createPriceAlert(
      req.user.id,
      commodity,
      state,
      targetPrice,
      condition
    );

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    console.error('Error creating price alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/alerts
 * Get user's price alerts
 */
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await marketService.getUserAlerts(req.user.id);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/market/alerts/:alertId
 * Deactivate price alert
 */
router.delete('/alerts/:alertId', authMiddleware, async (req, res) => {
  try {
    const { alertId } = req.params;

    const result = await marketService.deactivateAlert(alertId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error deactivating alert:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

