import express from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const {
  initializePayment,
  processPayment,
  getPaymentStatus,
  verifyTransaction,
  refundPayment,
  getWalletBalance,
  estimateGas,
} = paymentController;

const router = express.Router();

/**
 * Blockchain Payment Routes
 * All routes handle cryptocurrency transactions with backend managing gas fees
 * Farmers don't interact directly with blockchain - backend handles everything
 */

// Initialize payment for an order
router.post('/initialize', authMiddleware, initializePayment);

// Process blockchain payment (execute transaction)
router.post('/process', authMiddleware, processPayment);

// Get payment status
router.get('/:paymentId', authMiddleware, getPaymentStatus);

// Verify transaction on blockchain
router.get('/verify/:txHash', verifyTransaction);

// Request refund
router.post('/refund', authMiddleware, refundPayment);

// Get wallet balance
router.get('/wallet/balance/:address', getWalletBalance);

// Estimate gas fees for a transaction
router.post('/estimate-gas', estimateGas);

export default router;
