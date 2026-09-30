/**
 * Farm Report Generation Routes
 * Handles report generation and retrieval
 */

import express from 'express';
import { generateFarmReport, getFarmReport } from '../services/reportService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/farm-report/generate
 * Generates a new farm report for the user's current farm + crop
 * Called immediately after registration
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let { farmId, cropId } = req.body;

    if (!farmId || !cropId) {
      // Auto-lookup for newly registered users
      const { getConnection } = await import('../config/db.js');
      const connection = await getConnection();
      try {
        const [farms] = await connection.execute('SELECT id FROM farmer_profiles WHERE user_id = ? LIMIT 1', [userId]);
        const [crops] = await connection.execute('SELECT id FROM farm_crops WHERE user_id = ? LIMIT 1', [userId]);
        
        if (farms.length > 0) farmId = farms[0].id;
        if (crops.length > 0) cropId = crops[0].id;
        
        if (!farmId || !cropId) {
          return res.status(400).json({
            success: false,
            error: 'Could not auto-detect farm or crop for this user. Please provide farmId and cropId.'
          });
        }
      } finally {
        connection.release();
      }
    }

    console.log(`[API] Generating report for user: ${userId}, farm: ${farmId}, crop: ${cropId}`);

    // Generate the report (this will call Groq AI)
    const result = await generateFarmReport(userId, farmId, cropId);

    res.json({
      success: true,
      message: 'Farm report generation started',
      report: result
    });

  } catch (err) {
    console.error('[API] Report generation error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate farm report',
      message: err.message
    });
  }
});

/**
 * GET /api/farm-report/:farmId
 * Fetches previously generated report
 */
router.get('/:farmId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { farmId } = req.params;

    console.log(`[API] Fetching report for user: ${userId}, farm: ${farmId}`);

    const report = await getFarmReport(userId, farmId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        message: 'No farm report found for this farm. Generate one first.'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (err) {
    console.error('[API] Report fetch error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farm report',
      message: err.message
    });
  }
});

/**
 * POST /api/farm-report/regenerate
 * Regenerates report (in case of profile/crop changes)
 */
router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { farmId, cropId } = req.body;

    if (!farmId || !cropId) {
      return res.status(400).json({
        success: false,
        error: 'farmId and cropId are required'
      });
    }

    console.log(`[API] Regenerating report for user: ${userId}`);

    const result = await generateFarmReport(userId, farmId, cropId);

    res.json({
      success: true,
      message: 'Farm report regenerated',
      report: result
    });

  } catch (err) {
    console.error('[API] Report regeneration error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate farm report',
      message: err.message
    });
  }
});

export default router;
