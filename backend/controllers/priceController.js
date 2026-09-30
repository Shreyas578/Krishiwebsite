
import PriceService from '../services/priceService.js';
import { validationResult } from 'express-validator'

// Get price for commodity and state
async function getPrice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commodity, state } = req.query;
    
    if (!commodity || !state) {
      return res.status(400).json({ error: 'Commodity and state are required' });
    }

    const result = await PriceService.getPrice(commodity, state);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in price controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get prices for multiple commodities
async function getMultiplePrices(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commodities, state } = req.query;
    
    if (!state) {
      return res.status(400).json({ error: 'State is required' });
    }

    let commodityArray = [];
    if (commodities) {
      // Handle both comma-separated string and array (though query params are strings)
      commodityArray = Array.isArray(commodities) 
        ? commodities 
        : commodities.split(',').map(c => c.trim());
    } else {
      // Default to some common commodities if none specified
      commodityArray = ['Wheat', 'Rice', 'Maize', 'Sugarcane', 'Cotton'];
    }

    const result = await PriceService.getMultiplePrices(commodityArray, state);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in price controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Check price service configuration
async function checkConfig(req, res) {
  try {
    const isConfigured = PriceService.isConfigured();
    res.status(200).json({
      success: true,
      configured: isConfigured,
      message: isConfigured ? 'Price service is configured' : 'Price service is not configured'
    });
  } catch (error) {
    console.error('Error checking price config:', error);
    res.status(500).json({ error: error.message });
  }
}

export { getPrice, getMultiplePrices, checkConfig };

export default {
  getPrice,
  getMultiplePrices,
  checkConfig
};


