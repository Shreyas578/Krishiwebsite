/**
 * Farm Report Routes
 * All endpoints require authentication
 */

import express from 'express';
import {
  generateReport,
  getLatestReport,
  getMonthTasks,
  deleteReport
} from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/farm-report/generate
 * Generate a new farm report for the authenticated farmer
 * Response includes full report with tasks, costs, recommendations
 */
router.post('/generate', generateReport);

/**
 * GET /api/farm-report/:userId
 * Get the latest farm report for a farmer
 * Security: Users can only view their own reports (unless admin)
 */
router.get('/:userId', getLatestReport);

/**
 * GET /api/farm-report/:userId/month/:month
 * Get tasks for a specific month from the 365-day plan
 * Example: /api/farm-report/user123/month/January
 */
router.get('/:userId/month/:month', getMonthTasks);

/**
 * DELETE /api/farm-report/:reportId
 * Deactivate a farm report (soft delete)
 */
router.delete('/:reportId', deleteReport);

export default router;
