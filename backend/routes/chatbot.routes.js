import express from 'express';
import { generateText, checkConfig } from '../controllers/groq.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Send message to AI and get response (requires authentication)
router.post('/message', authMiddleware, async (req, res) => {
  await generateText(req, res);
});

// Check if Groq service is configured (public endpoint)
router.get('/config', async (req, res) => {
  await checkConfig(req, res);
});

export default router;

