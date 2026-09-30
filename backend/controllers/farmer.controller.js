import FarmerService from '../services/farmer.service.js';
import { validationResult } from 'express-validator'

// Get farmer profile
async function getProfile(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id; // Assuming auth middleware sets req.user
    const profile = await FarmerService.getProfile(userId);
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error in get farmer profile:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update farmer profile
async function updateProfile(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const updates = req.body;
    const updatedProfile = await FarmerService.updateProfile(userId, updates);
    res.status(200).json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error in update farmer profile:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get farm details
async function getFarmDetails(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const farmDetails = await FarmerService.getFarmDetails(userId);
    res.status(200).json({
      success: true,
      data: farmDetails
    });
  } catch (error) {
    console.error('Error in get farm details:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update farm details
async function updateFarmDetails(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const updates = req.body;
    const updatedFarm = await FarmerService.updateFarmDetails(userId, updates);
    res.status(200).json({
      success: true,
      data: updatedFarm
    });
  } catch (error) {
    console.error('Error in update farm details:', error);
    res.status(500).json({ error: error.message });
  }
}

export default {
  getProfile,
  updateProfile,
  getFarmDetails,
  updateFarmDetails
};

