
import GovernmentSchemesService from '../services/governmentSchemesService.js';
import { validationResult } from 'express-validator'

// Get all government schemes
async function getAllSchemes(req, res) {
  try {
    const filters = {
      scheme_type: req.query.scheme_type,
      crop_type: req.query.crop_type,
      farmer_type: req.query.farmer_type,
      active_only: req.query.active_only === 'true' || req.query.active_only === true
    };
    
    const schemes = await GovernmentSchemesService.getAllSchemes(filters);
    res.status(200).json({
      success: true,
      data: schemes
    });
  } catch (error) {
    console.error('Error in governmentSchemes controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get a government scheme by ID
async function getSchemeById(req, res) {
  try {
    const { id } = req.params;
    const scheme = await GovernmentSchemesService.getSchemeById(id);

    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error in governmentSchemes controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create a new government scheme (admin only)
async function createScheme(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const schemeData = req.body;
    const result = await GovernmentSchemesService.createScheme(schemeData);

    res.status(201).json({
      success: true,
      message: 'Government scheme created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in governmentSchemes controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update a government scheme (admin only)
async function updateScheme(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const schemeData = req.body;
    const success = await GovernmentSchemesService.updateScheme(id, schemeData);

    if (!success) {
      return res.status(404).json({ error: 'Scheme not found or no changes made' });
    }

    res.status(200).json({
      success: true,
      message: 'Government scheme updated successfully'
    });
  } catch (error) {
    console.error('Error in governmentSchemes controller:', error);
    res.status(500).json({ error: error.message });
  }
}

// Delete a government scheme (admin only)
async function deleteScheme(req, res) {
  try {
    const { id } = req.params;
    const success = await GovernmentSchemesService.deleteScheme(id);

    if (!success) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Government scheme deleted successfully'
    });
  } catch (error) {
    console.error('Error in governmentSchemes controller:', error);
    res.status(500).json({ error: error.message });
  }
}

export { getAllSchemes, getSchemeById, createScheme, updateScheme, deleteScheme };

export default {
  getAllSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  deleteScheme
};


