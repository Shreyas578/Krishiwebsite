import express from 'express';
import orderController from '../controllers/order.controller.js';

const {
  getOrderHistory,
  createOrder,
  getOrderById,
  cancelOrder
} = orderController;

const router = express.Router();

// Order routes
router.get('/history', getOrderHistory);
router.post('/create', createOrder);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

export default router;

