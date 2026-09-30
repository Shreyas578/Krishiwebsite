// services/governmentSchemesService.js
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

class GovernmentSchemesService {
  /**
   * Get all government schemes with optional filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} List of schemes
   */
  async getAllSchemes(filters = {}) {
    const connection = await getConnection();
    try {
      let query = 'SELECT * FROM government_schemes WHERE 1=1';
      const queryParams = [];

      if (filters.active_only) {
        query += ' AND is_active = true';
      }

      // We do a simple LIKE for JSON fields to support filtering
      if (filters.scheme_type && filters.scheme_type !== 'all') {
        // Assuming scheme_type could be added to schema, but currently there's no scheme_type column.
        // If there's no scheme_type column, we filter by description or name
        query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
        queryParams.push(`%${filters.scheme_type}%`, `%${filters.scheme_type}%`);
      }

      if (filters.farmer_type && filters.farmer_type !== 'all') {
        query += ' AND LOWER(eligibility_criteria) LIKE ?';
        queryParams.push(`%${filters.farmer_type}%`);
      }

      const [rows] = await connection.query(query, queryParams);
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get a government scheme by ID
   * @param {string} id - Scheme ID
   * @returns {Promise<Object>} Scheme details
   */
  async getSchemeById(id) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM government_schemes WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Create a new government scheme
   * @param {Object} schemeData - Scheme data
   * @returns {Promise<Object>} Created scheme with ID
   */
  async createScheme(schemeData) {
    const connection = await getConnection();
    try {
      const id = uuidv4();
      const {
        name,
        description,
        eligibility_criteria,
        benefits,
        application_process,
        website_url,
        is_active = true
      } = schemeData;

      const [result] = await connection.query(
        `INSERT INTO government_schemes 
         (id, name, description, eligibility_criteria, benefits, application_process, website_url, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          description,
          JSON.stringify(eligibility_criteria),
          JSON.stringify(benefits),
          application_process,
          website_url,
          is_active
        ]
      );

      return { id, ...schemeData };
    } finally {
      connection.release();
    }
  }

  /**
   * Update a government scheme
   * @param {string} id - Scheme ID
   * @param {Object} schemeData - Updated data
   * @returns {Promise<boolean>} Success status
   */
  async updateScheme(id, schemeData) {
    const connection = await getConnection();
    try {
      const {
        name,
        description,
        eligibility_criteria,
        benefits,
        application_process,
        website_url,
        is_active
      } = schemeData;

      const [result] = await connection.query(
        `UPDATE government_schemes 
         SET name = ?, description = ?, eligibility_criteria = ?, benefits = ?, 
             application_process = ?, website_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name,
          description,
          JSON.stringify(eligibility_criteria),
          JSON.stringify(benefits),
          application_process,
          website_url,
          is_active,
          id
        ]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a government scheme (soft delete)
   * @param {string} id - Scheme ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteScheme(id) {
    const connection = await getConnection();
    try {
      const [result] = await connection.query(
        'UPDATE government_schemes SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}

export default new GovernmentSchemesService();

