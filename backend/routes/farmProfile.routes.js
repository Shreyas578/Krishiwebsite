import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as farmProfileService from '../services/farmProfileService.js';
import * as reportService from '../services/reportService.js';

const router = express.Router();

/**
 * POST /api/farm-profile/:userId
 * Create or update farm profile
 */
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is updating their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const profile = await farmProfileService.createOrUpdateFarmProfile(userId, req.body);
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error creating/updating farm profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/farm-profile/:userId
 * Get farm profile
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await farmProfileService.getFarmProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Farm profile not found' });
    }

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching farm profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/farm-profile/:farmProfileId/crop
 * Add crop to farm
 */
router.post('/:farmProfileId/crop', authMiddleware, async (req, res) => {
  try {
    const { farmProfileId } = req.params;

    const result = await farmProfileService.addCropToFarm(farmProfileId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding crop:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/farm-profile/:farmProfileId/crops
 * Get all crops for farm
 */
router.get('/:farmProfileId/crops', authMiddleware, async (req, res) => {
  try {
    const { farmProfileId } = req.params;

    const crops = await farmProfileService.getFarmCrops(farmProfileId);
    res.status(200).json({ success: true, data: crops });
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/farm-profile/crop/:cropId
 * Update crop
 */
router.put('/crop/:cropId', authMiddleware, async (req, res) => {
  try {
    const { cropId } = req.params;

    const result = await farmProfileService.updateCrop(cropId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating crop:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/farm-profile/crop/:cropId
 * Delete crop
 */
router.delete('/crop/:cropId', authMiddleware, async (req, res) => {
  try {
    const { cropId } = req.params;

    const result = await farmProfileService.deleteCrop(cropId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting crop:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/farm-profile/crops/all
 * Get all available crops (crop master)
 */
router.get('/crops/all', async (req, res) => {
  try {
    const crops = await farmProfileService.getAllCropsFromMaster();
    res.status(200).json({ success: true, data: crops });
  } catch (error) {
    console.error('Error fetching all crops:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/farm-profile/crops/search
 * Search crops
 */
router.get('/crops/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const crops = await farmProfileService.searchCrops(q);
    res.status(200).json({ success: true, data: crops });
  } catch (error) {
    console.error('Error searching crops:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

