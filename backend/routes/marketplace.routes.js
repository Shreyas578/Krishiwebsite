
import express from 'express';
import marketplaceController from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const { 
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  createOrder,
  getUserOrders,
  updateOrderStatus,
  suggestPrice
} = marketplaceController;

// Marketplace routes
router.post('/listings', authMiddleware, createListing);
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);
router.put('/listings/:id', authMiddleware, updateListing);
router.delete('/listings/:id', authMiddleware, deleteListing);
router.post('/orders', authMiddleware, createOrder);
router.get('/orders/:userId/:role', authMiddleware, getUserOrders);
router.put('/orders/:id/status', authMiddleware, updateOrderStatus);
router.post('/suggest-price', suggestPrice);

export default router;


