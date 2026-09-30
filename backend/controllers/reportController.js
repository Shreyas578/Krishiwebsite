/**
 * KISAN AI - Farm Report Controller
 * Handles farm report generation and retrieval
 */

import { getConnection } from '../config/db.js';
import { generate365DayPlan, generateCropRecommendation } from '../services/reportService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/farm-report/generate
 * Generate a new farm report for the authenticated farmer
 */
async function generateReport(req, res) {
  let connection;
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    connection = await getConnection();

    // Get the farmer user record (needed for name field)
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const farmer = userRows[0];
    // Ensure farmer has a name field (users table may store name separately or use phone)
    if (!farmer.name) farmer.name = farmer.phone;

    // Get farmer profile — try farmer_profiles first, fallback to farm_profiles
    let farmProfiles;
    [farmProfiles] = await connection.execute(
      'SELECT * FROM farmer_profiles WHERE user_id = ?',
      [userId]
    );

    // If not found in farmer_profiles, try farm_profiles
    if (farmProfiles.length === 0) {
      [farmProfiles] = await connection.execute(
        'SELECT *, land_size_acres AS land_acres FROM farm_profiles WHERE user_id = ?',
        [userId]
      );
    }

    if (farmProfiles.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Farm profile not found. Please complete your farm setup first.' });
    }

    const farmProfile = farmProfiles[0];
    // Normalise column name differences between the two profile tables
    if (!farmProfile.land_acres && farmProfile.land_area_acres) {
      farmProfile.land_acres = farmProfile.land_area_acres;
    }
    if (!farmProfile.village) farmProfile.village = farmProfile.district || 'Unknown';
    if (!farmProfile.tehsil) farmProfile.tehsil = '';
    if (!farmProfile.district) farmProfile.district = 'Unknown';
    if (!farmProfile.state) farmProfile.state = 'Unknown';

    // Get current crop from farm_crops
    const [crops] = await connection.execute(
      'SELECT * FROM farm_crops WHERE user_id = ? AND status = ?',
      [userId, 'active']
    );

    let reportType, reportData;

    const currentCrop = crops.length > 0 ? crops[0] : null;

    if (currentCrop && currentCrop.crop_name && currentCrop.crop_name !== 'TBD') {
      // Generate 365-day plan — pass farmer AND farmProfile AND crop separately
      reportType = '365_day_plan';

      const cropForReport = {
        crop_name: currentCrop.crop_name,
        seed_variety: currentCrop.seed_variety || 'Standard',
        sowing_date: currentCrop.sowing_date || null,
        previous_crop: currentCrop.previous_crop || null,
        expected_harvest_start: currentCrop.expected_harvest || null,
        expected_harvest_end: currentCrop.expected_harvest || null,
      };

      reportData = await generate365DayPlan(farmer, farmProfile, cropForReport);
    } else {
      // Generate crop recommendation — pass farmer AND farmProfile separately
      reportType = 'crop_recommendation';
      reportData = await generateCropRecommendation(farmer, farmProfile);
    }

    // Store report in database
    const reportId = uuidv4();
    const cropId = crops.length > 0 ? crops[0].id : null;
    // reportData is {type, data, generated_at, status} — only store the actual data payload
    const reportPayload = reportData.data || reportData;

    await connection.execute(
      `INSERT INTO farm_reports (id, user_id, farm_id, crop_id, report_type, report_data, is_active, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reportId, userId, farmProfile.id, cropId, reportType, JSON.stringify(reportPayload), true]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Farm report generated successfully',
      report: {
        id: reportId,
        type: reportType,
        data: reportPayload,
        generated_at: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Generate report error:', err);
    if (connection) connection.release();
    res.status(500).json({
      success: false,
      error: 'Failed to generate farm report',
      message: err.message
    });
  }
}

/**
 * GET /api/farm-report/:userId
 * Get the latest farm report for a farmer
 */
async function getLatestReport(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Security: Only allow users to view their own reports
    if (userId !== requestingUserId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    connection = await getConnection();

    const [reports] = await connection.execute(
      `SELECT * FROM farm_reports 
       WHERE user_id = ? AND is_active = ? 
       ORDER BY generated_at DESC 
       LIMIT 1`,
      [userId, true]
    );

    connection.release();

    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'No farm report found' });
    }

    const report = reports[0];
    const reportData = typeof report.report_data === 'string' 
      ? JSON.parse(report.report_data) 
      : report.report_data;

    res.json({
      success: true,
      report: {
        id: report.id,
        type: report.report_type,
        data: reportData,
        generated_at: report.generated_at
      }
    });

  } catch (err) {
    console.error('Get report error:', err);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/farm-report/:userId/month/:month
 * Get tasks for a specific month from the farm report
 */
async function getMonthTasks(req, res) {
  let connection;
  try {
    const { userId, month } = req.params;
    const requestingUserId = req.user?.id;

    if (userId !== requestingUserId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    connection = await getConnection();

    const [reports] = await connection.execute(
      `SELECT * FROM farm_reports 
       WHERE user_id = ? AND is_active = ? 
       ORDER BY generated_at DESC 
       LIMIT 1`,
      [userId, true]
    );

    connection.release();

    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'No farm report found' });
    }

    const reportData = typeof reports[0].report_data === 'string'
      ? JSON.parse(reports[0].report_data)
      : reports[0].report_data;

    if (reportData.type === '365_day_plan') {
      const monthPlan = reportData.data.month_plans.find(
        mp => mp.month.toLowerCase() === month.toLowerCase()
      );

      if (!monthPlan) {
        return res.status(404).json({ success: false, error: 'Month not found in report' });
      }

      return res.json({
        success: true,
        month: month,
        plan: monthPlan
      });
    }

    res.status(400).json({ success: false, error: 'This report type does not have monthly plans' });

  } catch (err) {
    console.error('Get month tasks error:', err);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * DELETE /api/farm-report/:reportId
 * Deactivate a farm report
 */
async function deleteReport(req, res) {
  let connection;
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    connection = await getConnection();

    // Verify report belongs to user
    const [reports] = await connection.execute(
      'SELECT * FROM farm_reports WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );

    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // Deactivate report
    await connection.execute(
      'UPDATE farm_reports SET is_active = ? WHERE id = ?',
      [false, reportId]
    );

    connection.release();

    res.json({ success: true, message: 'Report deleted successfully' });

  } catch (err) {
    console.error('Delete report error:', err);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export {
  generateReport,
  getLatestReport,
  getMonthTasks,
  deleteReport
};

export default {
  generateReport,
  getLatestReport,
  getMonthTasks,
  deleteReport
};
