import express from 'express';
import { body, validationResult } from 'express-validator';
import { register, login, refreshToken, logout, updateFcmToken } from '../controllers/auth.controller.js';
import {
  savePersonalDetails,
  saveFarmLocation,
  saveLandDetails,
  saveCropSelection,
  completeRegistration,
  getRegistrationSummary
} from '../controllers/registration.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: errors.array()[0].msg 
    });
  }
  next();
};

// ========== LEGACY AUTH ROUTES ==========
// Public routes
router.post('/register', [
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['farmer', 'supplier', 'buyer']).withMessage('Role must be farmer, supplier, or buyer'),
  handleValidationErrors
], register);

router.post('/login', [
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], login);

router.post('/refresh', [
  body('token').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors
], refreshToken);

// Protected routes (require authentication middleware)
router.post('/logout', authMiddleware, logout);
router.put('/fcm-token', authMiddleware, [
  body('fcm_token').notEmpty().withMessage('FCM token is required'),
  handleValidationErrors
], updateFcmToken);

// ========== NEW MULTI-STEP REGISTRATION ROUTES (STEPS 1-5) ==========

// Step 1: Save Personal Details (name, phone, email, password, language)
router.post('/register/step1', savePersonalDetails);

// Step 2: Save Farm Location (GPS or manual entry)
router.post('/register/step2', saveFarmLocation);

// Step 3: Save Land Details (acres, soil, water, irrigation, etc.)
router.post('/register/step3', saveLandDetails);

// Step 4: Save Crop Selection (decided or not decided)
router.post('/register/step4', saveCropSelection);

// Step 5: Complete Registration & Trigger Farm Report Generation
router.post('/register/complete', completeRegistration);

// Get Registration Summary (for Step 5 review screen)
router.post('/register/summary', getRegistrationSummary);

export default router;

