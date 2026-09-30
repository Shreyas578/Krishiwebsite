import PiperTtsService from '../services/piperTtsService.js'; 

import { validationResult } from 'express-validator'

/**
 * TTS Controller - Handles text-to-speech API endpoints
 * Provides endpoints for converting text to speech using Piper TTS (offline)
 */
class TtsController {
  /**
   * Convert text to speech
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async synthesizeSpeech(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { text, options } = req.body;

      // Optional: Validate text length
      if (text.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Text is too long. Maximum 5000 characters allowed.'
        });
      }

      // Synthesize speech
      const result = await PiperTtsService.synthesizeSpeech(text, options);

      // Set appropriate headers for audio response
      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="tts_output_${Date.now()}.wav"`,
        'Cache-Control': 'no-cache'
      });

      // Send audio data
      return res.status(200).send(result.audioContent);

    } catch (error) {
      console.error('Error in TTS synthesis:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to synthesize speech',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get TTS service status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatus(req, res) {
    try {
      const isConfigured = PiperTtsService.isConfigured();
      
      return res.status(200).json({
        success: true,
        data: {
          service: 'Piper TTS (Offline Text-to-Speech)',
          isAvailable: isConfigured,
          engine: 'Piper TTS',
          modelPath: PiperTtsService.modelPath || 'Not configured',
          piperPath: PiperTtsService.piperPath || 'Not configured',
          features: [
            'Offline operation',
            'No internet required',
            'Multiple voice models',
            'Real-time synthesis',
            'High quality output'
          ]
        }
      });
    } catch (error) {
      console.error('Error getting TTS status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get TTS service status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

const ttsController = new TtsController();

export const synthesizeSpeech = ttsController.synthesizeSpeech.bind(ttsController);
export const getStatus = ttsController.getStatus.bind(ttsController);
export default ttsController;

