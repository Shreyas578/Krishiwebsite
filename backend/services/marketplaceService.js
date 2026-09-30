// services/marketplaceService.js
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import IPFSService from './ipfsService.js';

class MarketplaceService {
  /**
   * Create a new marketplace listing
   * @param {Object} listingData - Listing data
   * @param {string} sellerId - ID of the seller
   * @returns {Promise<Object>} Created listing
   */
  async createListing(listingData, sellerId) {
    const connection = await getConnection();
    try {
      const id = uuidv4();
      const {
        title,
        product_name,      // accept both for backward compat
        category,
        quantity,
        unit,
        price_per_unit,
        description,
        image_ipfs_hash,   // legacy field
        images,            // preferred: JSON array
        quality_grade,
        location,
        tx_hash,
        ipfs_hash
      } = listingData;

      const listingTitle = title || product_name || 'Untitled';
      const listingUnit  = unit  || 'kg';
      const listingImages = images
        ? (typeof images === 'string' ? images : JSON.stringify(images))
        : (image_ipfs_hash ? JSON.stringify([image_ipfs_hash]) : null);

      await connection.query(
        `INSERT INTO marketplace_listings 
         (id, seller_id, title, category, quantity, unit, price_per_unit, description, images, quality_grade, location, status, tx_hash, ipfs_hash) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          id,
          sellerId,
          listingTitle,
          category,
          quantity,
          listingUnit,
          price_per_unit,
          description || null,
          listingImages,
          quality_grade || null,
          location ? JSON.stringify(location) : null,
          tx_hash || null,
          ipfs_hash || null
        ]
      );

      return {
        id,
        seller_id: sellerId,
        title: listingTitle,
        category,
        quantity,
        unit: listingUnit,
        price_per_unit,
        description,
        images: listingImages,
        status: 'active',
        tx_hash,
        ipfs_hash,
        created_at: new Date(),
        updated_at: new Date()
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get marketplace listings with optional filtering
   * @param {Object} filters - Filter criteria (category, search term, etc.)
   * @param {number} limit - Limit number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Listings
   */
  async getListings(filters = {}, limit = 20, offset = 0) {
    const connection = await getConnection();
    try {
      let query = `
        SELECT ml.*, u.phone as seller_phone 
        FROM marketplace_listings ml
        JOIN users u ON ml.seller_id = u.id
        WHERE ml.status = 'active'
      `;
      const params = [];

      if (filters.category) {
        query += ' AND ml.category = ?';
        params.push(filters.category);
      }

      if (filters.search) {
        query += ' AND (ml.title LIKE ? OR ml.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.minPrice) {
        query += ' AND ml.price_per_unit >= ?';
        params.push(parseFloat(filters.minPrice));
      }

      if (filters.maxPrice) {
        query += ' AND ml.price_per_unit <= ?';
        params.push(parseFloat(filters.maxPrice));
      }

      query += ' ORDER BY ml.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [rows] = await connection.query(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get a single listing by ID
   * @param {string} id - Listing ID
   * @returns {Promise<Object>} Listing details
   */
  async getListingById(id) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT ml.*, u.phone as seller_phone 
         FROM marketplace_listings ml
         JOIN users u ON ml.seller_id = u.id
         WHERE ml.id = ?`,
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Update a listing (only by seller)
   * @param {string} id - Listing ID
   * @param {string} sellerId - Seller ID for authorization
   * @param {Object} updateData - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  async updateListing(id, sellerId, updateData) {
    const connection = await getConnection();
    try {
      // Build dynamic update query
      const fields = [];
      const values = [];

      const allowedFields = ['title', 'category', 'quantity', 'unit', 'price_per_unit', 'description', 'images', 'status', 'quality_grade'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });
      // Backward compat: accept product_name as title
      if (updateData.product_name !== undefined && !updateData.title) {
        fields.push('title = ?');
        values.push(updateData.product_name);
      }

      if (fields.length === 0) return false;

      values.push(new Date().toISOString().slice(0, 19).replace('T', ' ')); // updated_at
      values.push(id);
      values.push(sellerId);

      const query = `
        UPDATE marketplace_listings 
        SET ${fields.join(', ')}, updated_at = ?
        WHERE id = ? AND seller_id = ?
      `;

      const [result] = await connection.query(query, values);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a listing (only by seller)
   * @param {string} id - Listing ID
   * @param {string} sellerId - Seller ID for authorization
   * @returns {Promise<boolean>} Success status
   */
  async deleteListing(id, sellerId) {
    const connection = await getConnection();
    try {
      const [result] = await connection.query(
        'UPDATE marketplace_listings SET status = \"cancelled\" WHERE id = ? AND seller_id = ?',
        [id, sellerId]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Create a marketplace order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createOrder(orderData) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const id = uuidv4();
      const {
        listing_id,
        buyer_id,
        seller_id,
        quantity_ordered,
        total_price,
        tx_hash,
        ipfs_hash
      } = orderData;

      // 0. Verify and lock the listing
      const [listings] = await connection.query(
        'SELECT quantity FROM marketplace_listings WHERE id = ? FOR UPDATE',
        [listing_id]
      );
      
      if (listings.length === 0) {
        throw new Error('Listing not found');
      }
      
      const currentQuantity = listings[0].quantity;
      if (currentQuantity < quantity_ordered) {
        throw new Error(`Insufficient quantity. Only ${currentQuantity} available.`);
      }

      // 1. Create the order
      const [orderResult] = await connection.query(
        `INSERT INTO marketplace_orders 
         (id, listing_id, buyer_id, seller_id, quantity_ordered, total_price, status, payment_status, tx_hash, ipfs_hash) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)`,
        [
          id,
          listing_id,
          buyer_id,
          seller_id,
          quantity_ordered,
          total_price,
          tx_hash || null,
          ipfs_hash || null
        ]
      );

      // 2. Update the listing quantity
      const newQuantity = currentQuantity - quantity_ordered;
      const newStatus = newQuantity <= 0 ? 'sold' : 'active';
      
      await connection.query(
        'UPDATE marketplace_listings SET quantity = ?, status = ? WHERE id = ?',
        [newQuantity, newStatus, listing_id]
      );

      await connection.commit();

      return {
        id,
        listing_id,
        buyer_id,
        seller_id,
        quantity_ordered,
        total_price,
        status: 'pending',
        payment_status: 'pending',
        tx_hash,
        ipfs_hash,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get orders for a user (buyer or seller)
   * @param {string} userId - User ID
   * @param {string} role - 'buyer' or 'seller'
   * @param {number} limit - Limit number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Orders
   */
  async getUserOrders(userId, role, limit = 20, offset = 0) {
    const connection = await getConnection();
    try {
      let query = `
        SELECT mo.*, ml.title, ml.category, ml.images,
               buyer.phone as buyer_phone, seller.phone as seller_phone
        FROM marketplace_orders mo
        JOIN marketplace_listings ml ON mo.listing_id = ml.id
        JOIN users buyer ON mo.buyer_id = buyer.id
        JOIN users seller ON mo.seller_id = seller.id
      `;
      const params = [];

      if (role === 'buyer') {
        query += ' WHERE mo.buyer_id = ?';
        params.push(userId);
      } else if (role === 'seller') {
        query += ' WHERE mo.seller_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY mo.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [rows] = await connection.query(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Update order status (e.g., confirm, ship, deliver, cancel)
   * @param {string} id - Order ID
   * @param {Object} updateData - Status updates
   * @returns {Promise<boolean>} Success status
   */
  async updateOrderStatus(id, updateData) {
    const connection = await getConnection();
    try {
      const { status, payment_status } = updateData;
      const fields = [];
      const values = [];

      if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
      }
      if (payment_status !== undefined) {
        fields.push('payment_status = ?');
        values.push(payment_status);
      }

      if (fields.length === 0) return false;

      values.push(new Date().toISOString().slice(0, 19).replace('T', ' ')); // updated_at
      values.push(id);

      const query = `
        UPDATE marketplace_orders 
        SET ${fields.join(', ')}, updated_at = ?
        WHERE id = ?
      `;

      const [result] = await connection.query(query, values);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

export default new MarketplaceService();

