import express from 'express';
const router = express.Router();
import { synthesizeSpeech, getStatus } from '../controllers/tts.controller.js';

// TTS endpoints
router.post('/synthesize', synthesizeSpeech);
router.get('/status', getStatus);

export default router;

