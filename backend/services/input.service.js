import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

class InputService {
  /**
   * Get input inventory for a user
   */
  async getInventory(userId, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM farmer_inputs WHERE farmer_id = ?',
        [userId]
      );
      const total = countResult[0].total;

      const [items] = await db.query(
        `SELECT * FROM farmer_inputs 
         WHERE farmer_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return {
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
  }

  /**
   * Purchase inputs
   */
  async purchaseInput(userId, purchaseData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const purchaseId = uuidv4();
      const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

      // Create purchase record
      await connection.query(
        `INSERT INTO input_purchases (id, farmer_id, total_amount, payment_method, payment_status, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [purchaseId, userId, totalAmount, purchaseData.payment_method || 'credit_card', 'paid', 'processing']
      );

      // Add items to inventory and create purchase items
      for (const item of purchaseData.items) {
        const itemId = uuidv4();

        // Record purchase item
        await connection.query(
          `INSERT INTO purchase_items (id, purchase_id, input_name, input_type, quantity, unit, price_per_unit, total_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [itemId, purchaseId, item.name, item.type, item.quantity, item.unit, item.price_per_unit, item.quantity * item.price_per_unit]
        );

        // Add to farmer inventory
        await connection.query(
          `INSERT INTO farmer_inputs (id, farmer_id, name, type, quantity, unit, min_threshold, price_per_unit, expiry_date, supplier, batch_number, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
          [
            uuidv4(),
            userId,
            item.name,
            item.type,
            item.quantity,
            item.unit,
            item.min_threshold || 0,
            item.price_per_unit,
            item.expiry_date || null,
            item.supplier || '',
            item.batch_number || '',
            'in_stock'
          ]
        );
      }

      await connection.commit();

      return {
        success: true,
        data: {
          purchase_id: purchaseId,
          total_amount: totalAmount,
          status: 'processing',
          purchase_date: new Date().toISOString(),
          expected_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to process purchase: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get input usage history
   */
  async getUsageHistory(userId, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM input_usage WHERE farmer_id = ?',
        [userId]
      );
      const total = countResult[0].total;

      const [records] = await db.query(
        `SELECT * FROM input_usage 
         WHERE farmer_id = ? 
         ORDER BY date_used DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return {
        success: true,
        data: {
          records,
          pagination: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch usage history: ${error.message}`);
    }
  }

  /**
   * Record input usage
   */
  async useInput(userId, usageData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const usageId = uuidv4();

      // Record usage
      await connection.query(
        `INSERT INTO input_usage (id, farmer_id, input_id, input_name, quantity_used, unit, date_used, crop_applied, field_location, purpose, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          usageId,
          userId,
          usageData.input_id,
          usageData.input_name,
          usageData.quantity_used,
          usageData.unit,
          usageData.date_used || new Date().toISOString(),
          usageData.crop_applied || '',
          usageData.field_location || '',
          usageData.purpose || '',
          usageData.remarks || ''
        ]
      );

      // Decrement inventory
      await connection.query(
        `UPDATE farmer_inputs 
         SET quantity = quantity - ?, updated_at = NOW()
         WHERE id = ? AND farmer_id = ?`,
        [usageData.quantity_used, usageData.input_id, userId]
      );

      await connection.commit();

      return {
        success: true,
        data: {
          usage_id: usageId,
          input_id: usageData.input_id,
          quantity_used: usageData.quantity_used,
          recorded_at: new Date().toISOString()
        }
      };
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to record usage: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(userId) {
    try {
      const [items] = await db.query(
        `SELECT * FROM farmer_inputs 
         WHERE farmer_id = ? AND quantity < min_threshold
         ORDER BY (min_threshold - quantity) DESC`,
        [userId]
      );

      return {
        success: true,
        data: {
          alerts: items,
          count: items.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }
  }
}

export default new InputService();

