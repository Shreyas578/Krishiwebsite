import { getConnection } from '../config/db.js';

class FarmerService {
  /**
   * Get farmer profile by user ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Farmer profile data
   */
  async getProfile(userId) {
    let connection;
    try {
      connection = await getConnection();
      
      const [rows] = await connection.execute(
        `SELECT 
          fp.id, fp.user_id, fp.land_area_acres, fp.soil_type, 
          fp.water_source, fp.village, fp.district, fp.state,
          fp.latitude, fp.longitude, fp.created_at, fp.updated_at,
          u.phone, u.role
        FROM farmer_profiles fp
        JOIN users u ON fp.user_id = u.id
        WHERE fp.user_id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      connection.release();
      return rows[0];
    } catch (error) {
      console.error('Error getting farmer profile:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update farmer profile
   * @param {string} userId - The user ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated farmer profile
   */
  async updateProfile(userId, updates) {
    let connection;
    try {
      connection = await getConnection();
      
      // Build dynamic update query
      const allowedFields = ['land_area_acres', 'soil_type', 'water_source', 'village', 'district', 'state', 'latitude', 'longitude'];
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        return await this.getProfile(userId);
      }
      
      values.push(userId);
      
      const query = `UPDATE farmer_profiles SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = ?`;
      
      await connection.execute(query, values);
      connection.release();
      
      return await this.getProfile(userId);
    } catch (error) {
      console.error('Error updating farmer profile:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get farm details for a farmer
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Farm details
   */
  async getFarmDetails(userId) {
    let connection;
    try {
      connection = await getConnection();
      
      const [rows] = await connection.execute(
        `SELECT 
          c.id, c.name, c.variety, c.area_acres, c.sowing_date, c.growth_stage
        FROM crops c
        JOIN farmer_profiles fp ON c.farmer_profile_id = fp.id
        WHERE fp.user_id = ?`,
        [userId]
      );

      connection.release();
      return rows || [];
    } catch (error) {
      console.error('Error getting farm details:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update farm details
   * @param {string} userId - The user ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated farm details
   */
  async updateFarmDetails(userId, updates) {
    let connection;
    try {
      connection = await getConnection();
      
      // Get farmer profile first
      const [farmerRows] = await connection.execute(
        'SELECT id FROM farmer_profiles WHERE user_id = ?',
        [userId]
      );
      
      if (farmerRows.length === 0) {
        throw new Error('Farmer profile not found');
      }
      
      const farmerProfileId = farmerRows[0].id;
      
      // Update farmer profile if location/soil/water fields are provided
      const profileFields = ['land_area_acres', 'soil_type', 'water_source', 'village', 'district', 'state', 'latitude', 'longitude'];
      const profileUpdates = [];
      const profileValues = [];
      
      for (const field of profileFields) {
        if (updates[field] !== undefined) {
          profileUpdates.push(`${field} = ?`);
          profileValues.push(updates[field]);
        }
      }
      
      if (profileUpdates.length > 0) {
        profileValues.push(userId);
        await connection.execute(
          `UPDATE farmer_profiles SET ${profileUpdates.join(', ')}, updated_at = NOW() WHERE user_id = ?`,
          profileValues
        );
      }
      
      connection.release();
      return await this.getFarmDetails(userId);
    } catch (error) {
      console.error('Error updating farm details:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

export default new FarmerService();

