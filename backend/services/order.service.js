// services/order.service.js
import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

class OrderService {
  // Get order history for a user
  async getOrderHistory(userId, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
        [userId]
      );
      const total = countResult[0][0].total;

      // Get paginated orders
      const [orders] = await db.query(
        `SELECT * FROM orders 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Get order items for each order
      for (const order of orders) {
        const [items] = await db.query(
          `SELECT * FROM order_items WHERE order_id = ?`,
          [order.id]
        );
        order.items = items;
      }

      return {
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch order history: ${error.message}`);
    }
  }

  // Create a new order
  async createOrder(userId, orderData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const orderId = uuidv4();
      const totalAmount = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // Insert order
      await connection.query(
        `INSERT INTO orders (id, user_id, type, status, total_amount, shipping_address, payment_method, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId,
          userId,
          orderData.type || 'purchase',
          'pending',
          totalAmount,
          JSON.stringify(orderData.shipping_address || {}),
          orderData.payment_method || ''
        ]
      );

      // Insert order items
      for (const item of orderData.items) {
        await connection.query(
          `INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            orderId,
            item.product_id,
            item.name,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price
          ]
        );
      }

      await connection.commit();

      return {
        success: true,
        data: {
          id: orderId,
          user_id: userId,
          type: orderData.type || 'purchase',
          status: 'pending',
          total_amount: totalAmount,
          items: orderData.items,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to create order: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Get order by ID
  async getOrderById(userId, orderId) {
    try {
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [orderId, userId]
      );

      if (orders.length === 0) {
        return null;
      }

      const order = orders[0];
      const [items] = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );

      order.items = items;
      return {
        success: true,
        data: order
      };
    } catch (error) {
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  // Cancel an order
  async cancelOrder(userId, orderId) {
    try {
      // Check if order exists and belongs to user
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [orderId, userId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      if (orders[0].status === 'delivered' || orders[0].status === 'cancelled') {
        throw new Error(`Cannot cancel order with status: ${orders[0].status}`);
      }

      // Update order status
      await db.query(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['cancelled', orderId]
      );

      return {
        success: true,
        data: {
          id: orderId,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          message: 'Order has been cancelled successfully'
        }
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      await db.query(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, orderId]
      );

      return {
        success: true,
        message: `Order status updated to ${status}`
      };
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }
}

export default new OrderService();

