
import FarmReportService from '../services/farmReportService.js';
import { validationResult } from 'express-validator'

// Generate a farm report
async function generateReport(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { report_type, title, additional_context } = req.body;
    const farmerProfileId = req.user?.farmerProfileId; // Assuming auth middleware attaches user

    if (!farmerProfileId) {
      return res.status(400).json({ error: 'Farmer profile ID required' });
    }

    const result = await FarmReportService.generateReport(
      { report_type, title, additional_context },
      farmerProfileId
    );

    res.status(201).json({
      success: true,
      message: 'Farm report generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in farmReport controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get farm reports for a farmer
async function getFarmerReports(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farmerProfileId = req.user?.farmerProfileId;
    if (!farmerProfileId) {
      return res.status(400).json({ error: 'Farmer profile ID required' });
    }

    const { report_type, limit, offset } = req.query;
    const reports = await FarmReportService.getFarmerReports(
      farmerProfileId,
      report_type || null,
      parseInt(limit) || 20,
      parseInt(offset) || 0
    );

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error in farmReport controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get a farm report by ID
async function getReportById(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const report = await FarmReportService.getReportById(id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error in farmReport controller:', error);
    res.status(500).json({ error: error.message });
  }
}

export { generateReport, getFarmerReports, getReportById };

export default {
  generateReport,
  getFarmerReports,
  getReportById
};


