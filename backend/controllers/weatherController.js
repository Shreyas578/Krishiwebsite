
import WeatherService from '../services/weatherService.js';
import { validationResult } from 'express-validator'

// Get current weather
async function getCurrentWeather(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await WeatherService.getCurrentWeather(parseFloat(lat), parseFloat(lon));
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in weather controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get weather forecast
async function getForecast(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lon, days } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await WeatherService.getForecast(
      parseFloat(lat), 
      parseFloat(lon), 
      parseInt(days) || 5
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in weather controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Check weather service configuration
async function checkConfig(req, res) {
  try {
    const isConfigured = WeatherService.isConfigured();
    res.status(200).json({
      success: true,
      configured: isConfigured,
      message: isConfigured ? 'Weather service is configured' : 'Weather service is not configured'
    });
  } catch (error) {
    console.error('Error checking weather config:', error);
    res.status(500).json({ error: error.message });
  }
}

export { getCurrentWeather, getForecast, checkConfig };

export default {
  getCurrentWeather,
  getForecast,
  checkConfig
};


