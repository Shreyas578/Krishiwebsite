import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as reportService from '../services/reportService.js';
import * as farmProfileService from '../services/farmProfileService.js';

const router = express.Router();

/**
 * POST /api/reports/365day/:farmProfileId/:cropId
 * Generate 365-day farm plan
 */
router.post('/365day/:farmProfileId/:cropId', authMiddleware, async (req, res) => {
  try {
    const { farmProfileId, cropId } = req.params;

    // Get farm profile and crop
    const [farmProfile, crop] = await Promise.all([
      farmProfileService.getFarmProfileById(farmProfileId),
      farmProfileService.getCropById(cropId)
    ]);

    if (!farmProfile || !crop) {
      return res.status(404).json({ error: 'Farm profile or crop not found' });
    }

    // Generate plan
    const planData = await reportService.generate365DayPlan(farmProfile, crop);

    // Save report
    const report = await reportService.saveReport(farmProfileId, '365day', planData);

    res.status(200).json({
      success: true,
      data: {
        reportId: report.reportId,
        plan: planData
      }
    });
  } catch (error) {
    console.error('Error generating 365-day plan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reports/recommendations/:farmProfileId
 * Generate crop recommendations
 */
router.post('/recommendations/:farmProfileId', authMiddleware, async (req, res) => {
  try {
    const { farmProfileId } = req.params;

    // Get farm profile
    const farmProfile = await farmProfileService.getFarmProfileById(farmProfileId);
    if (!farmProfile) {
      return res.status(404).json({ error: 'Farm profile not found' });
    }

    // Generate recommendations
    const recommendations = await reportService.generateCropRecommendations(farmProfile);

    // Save report
    const report = await reportService.saveReport(farmProfileId, 'recommendations', recommendations);

    res.status(200).json({
      success: true,
      data: {
        reportId: report.reportId,
        recommendations
      }
    });
  } catch (error) {
    console.error('Error generating crop recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/:reportId
 * Get specific report
 */
router.get('/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await reportService.getReportById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/farm/:farmProfileId
 * Get all reports for a farm
 */
router.get('/farm/:farmProfileId', authMiddleware, async (req, res) => {
  try {
    const { farmProfileId } = req.params;

    const reports = await reportService.getFarmReports(farmProfileId);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching farm reports:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

