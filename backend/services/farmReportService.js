// services/farmReportService.js
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import GroqService from './groqService.js';

class FarmReportService {
  /**
   * Generate a farm report using AI
   * @param {Object} reportData - Data for the report
   * @param {string} farmerProfileId - ID of the farmer's profile
   * @returns {Promise<Object>} Generated report
   */
  async generateReport(reportData, farmerProfileId) {
    const connection = await getConnection();
    try {
      const id = uuidv4();
      const {
        report_type,
        title,
        additional_context // Additional context for AI generation
      } = reportData;

      // Prepare prompt for AI based on report type
      let prompt = '';
      switch (report_type) {
        case 'yield_prediction':
          prompt = `As an agricultural expert, predict the crop yield for the upcoming season based on the following data: ${JSON.stringify(reportData)}. Provide detailed predictions, factors affecting yield, and recommendations for optimization.`;
          break;
        case 'soil_health':
          prompt = `As a soil scientist, analyze the soil health based on the following data: ${JSON.stringify(reportData)}. Provide nutrient levels, pH, organic matter content, and recommendations for soil improvement.`;
          break;
        case 'pest_disease':
          prompt = `As a plant pathologist, identify potential pests and diseases based on the following data: ${JSON.stringify(reportData)}. Provide prevention methods, treatment options, and integrated pest management strategies.`;
          break;
        case 'irrigation_advice':
          prompt = `As an irrigation specialist, provide irrigation recommendations based on the following data: ${JSON.stringify(reportData)}. Include water requirements, scheduling, and water conservation techniques.`;
          break;
        default:
          prompt = `Provide a comprehensive farm report based on the following data: ${JSON.stringify(reportData)}`;
      }

      // Add additional context if provided
      if (additional_context) {
        prompt += ` Additional context: ${additional_context}`;
      }

      // Use Groq service to generate the report content
      const aiResponse = await GroqService.chatCompletion([
        { role: 'system', content: 'You are an expert agricultural advisor providing detailed farm reports.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        max_tokens: 2000
      });

      // Extract the generated content
      let content = 'Report generation failed';
      if (aiResponse.success && aiResponse.data && aiResponse.data.choices && aiResponse.data.choices.length > 0) {
        content = aiResponse.data.choices[0].message.content;
      }

      // Prepare recommendations (could be extracted from AI response or generated separately)
      const recommendations = {
        action_items: [],
        resources: [],
        follow_up: []
      };

      // Insert the report into the database
      await connection.query(
        `INSERT INTO farm_reports 
         (id, farmer_profile_id, report_type, title, content, recommendations) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          farmerProfileId,
          report_type,
          title,
          content,
          JSON.stringify(recommendations)
        ]
      );

      return {
        id,
        farmer_profile_id: farmerProfileId,
        report_type,
        title,
        content,
        recommendations,
        created_at: new Date()
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get farm reports for a farmer
   * @param {string} farmerProfileId - Farmer's profile ID
   * @param {string} reportType - Optional filter by report type
   * @param {number} limit - Limit number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Reports
   */
  async getFarmerReports(farmerProfileId, reportType = null, limit = 20, offset = 0) {
    const connection = await getConnection();
    try {
      let query = 'SELECT * FROM farm_reports WHERE farmer_profile_id = ?';
      const params = [farmerProfileId];

      if (reportType) {
        query += ' AND report_type = ?';
        params.push(reportType);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [rows] = await connection.query(query, params);
      return rows.map(row => ({
        ...row,
        recommendations: row.recommendations ? JSON.parse(row.recommendations) : {}
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Get a farm report by ID
   * @param {string} id - Report ID
   * @returns {Promise<Object>} Report details
   */
  async getReportById(id) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM farm_reports WHERE id = ?', [id]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        recommendations: row.recommendations ? JSON.parse(row.recommendations) : {}
      };
    } finally {
      connection.release();
    }
  }
}

export default new FarmReportService();

