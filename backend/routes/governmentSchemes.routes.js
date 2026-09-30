
import express from 'express';
const router = express.Router();
import { getAllSchemes, getSchemeById, createScheme, updateScheme, deleteScheme } from '../controllers/governmentSchemesController.js';

// Government schemes routes
router.get('/', getAllSchemes);
router.get('/:id', getSchemeById);
router.post('/', createScheme);
router.put('/:id', updateScheme);
router.delete('/:id', deleteScheme);

// Scheme applications routes
router.post('/applications', (req, res) => {
  // Dummy endpoint to simulate successful scheme application submission
  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: req.body
  });
});

export default router;


