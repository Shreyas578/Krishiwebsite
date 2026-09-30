import DiseaseService from '../services/disease.service.js';
import { validationResult } from 'express-validator'

async function detectDisease(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract image from multipart form data
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const cropName = req.body.cropName || 'Unknown';
    const language = req.body.language || 'en';
    
    // Call disease detection service with image buffer
    const result = await DiseaseService.detectDisease(req.file.buffer, cropName, language);
    
    res.status(result.success ? 200 : 400).json({
      success: result.success,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Error in disease controller:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

async function checkStatus(req, res) {
  try {
    const isAvailable = await DiseaseService.isAvailable();
    res.status(200).json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Disease detection service is available' : 'Disease detection service is not available'
    });
  } catch (error) {
    console.error('Error checking disease service status:', error);
    res.status(500).json({ error: error.message });
  }
}

export { detectDisease, checkStatus };

export default {
  detectDisease,
  checkStatus
};

