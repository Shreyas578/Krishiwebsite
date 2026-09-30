import OrderService from '../services/order.service.js';
import { validationResult } from 'express-validator'

// Get order history for the user
async function getOrderHistory(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id; // Assuming auth middleware
    const { page = 1, limit = 10, status } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null
    };
    const orders = await OrderService.getOrderHistory(userId, options);
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error in get order history:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create a new order
async function createOrder(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const orderData = req.body;
    const newOrder = await OrderService.createOrder(userId, orderData);
    res.status(201).json({
      success: true,
      data: newOrder
    });
  } catch (error) {
    console.error('Error in create order:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get order details by ID
async function getOrderById(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const orderId = req.params.id;
    const order = await OrderService.getOrderById(userId, orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error in get order by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// Cancel an order
async function cancelOrder(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const orderId = req.params.id;
    const result = await OrderService.cancelOrder(userId, orderId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in cancel order:', error);
    res.status(500).json({ error: error.message });
  }
}

export default {
  getOrderHistory,
  createOrder,
  getOrderById,
  cancelOrder
};

