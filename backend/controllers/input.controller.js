import InputService from '../services/input.service.js';
import { validationResult } from 'express-validator'

// Get input inventory for the user
async function getInventory(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { type, page = 1, limit = 10 } = req.query;
    const options = {
      type: type || null,
      page: parseInt(page),
      limit: parseInt(limit)
    };
    const inventory = await InputService.getInventory(userId, options);
    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error in get input inventory:', error);
    res.status(500).json({ error: error.message });
  }
}

// Purchase inputs
async function purchaseInput(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const purchaseData = req.body;
    const purchaseRecord = await InputService.purchaseInput(userId, purchaseData);
    res.status(201).json({
      success: true,
      data: purchaseRecord
    });
  } catch (error) {
    console.error('Error in purchase input:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get input usage history
async function getUsageHistory(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { type, startDate, endDate, page = 1, limit = 10 } = req.query;
    const options = {
      type: type || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      page: parseInt(page),
      limit: parseInt(limit)
    };
    const usageHistory = await InputService.getUsageHistory(userId, options);
    res.status(200).json({
      success: true,
      data: usageHistory
    });
  } catch (error) {
    console.error('Error in get input usage history:', error);
    res.status(500).json({ error: error.message });
  }
}

// Use input (record usage)
async function useInput(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const usageData = req.body;
    const usageRecord = await InputService.useInput(userId, usageData);
    res.status(200).json({
      success: true,
      data: usageRecord
    });
  } catch (error) {
    console.error('Error in use input:', error);
    res.status(500).json({ error: error.message });
  }
}

export default {
  getInventory,
  purchaseInput,
  getUsageHistory,
  useInput
};

