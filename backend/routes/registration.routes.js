import express from 'express';
import {
  savePersonalDetails,
  saveFarmLocation,
  saveLandDetails,
  saveCropSelection,
  completeRegistration,
  getRegistrationSummary
} from '../controllers/registration.controller.js';

const router = express.Router();

/**
 * Registration Flow Routes
 * POST /api/registration/step1   - Personal details
 * POST /api/registration/step2   - Farm location
 * POST /api/registration/step3   - Land details
 * POST /api/registration/step4   - Crop selection
 * POST /api/registration/step5   - Complete & generate report
 * POST /api/registration/summary - Get filled data for review
 */

router.post('/step1', savePersonalDetails);
router.post('/step2', saveFarmLocation);
router.post('/step3', saveLandDetails);
router.post('/step4', saveCropSelection);
router.post('/step5', completeRegistration);
router.post('/summary', getRegistrationSummary);

export default router;
