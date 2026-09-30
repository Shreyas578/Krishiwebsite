// services/groqService.js
import { Groq } from 'groq-sdk'
import dotenv from 'dotenv';
dotenv.config();

class GroqService {
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.warn('[Groq] API Key not found in environment');
      this.groq = null;
    } else {
      try {
        this.groq = new Groq({
          apiKey: apiKey.trim()
        });
        console.log('[Groq] Service initialized successfully');
      } catch (err) {
        console.error('[Groq] Failed to initialize:', err.message);
        this.groq = null;
      }
    }
  }

  /**
   * Generate chat completion using Groq
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Optional parameters (model, temperature, max_tokens, etc.)
   * @returns {Promise<Object>} Groq response
   */
  async chatCompletion(messages, options = {}) {
    try {
      if (!this.groq) {
        throw new Error('Groq service is not initialized. Check GROQ_API_KEY in .env');
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages must be a non-empty array');
      }

      const model = options.model || 'llama-3.3-70b-versatile';
      const temperature = typeof options.temperature !== 'undefined' ? parseFloat(options.temperature) : 0.7;
      const max_tokens = parseInt(options.max_tokens || 1000);
      const top_p = typeof options.top_p !== 'undefined' ? parseFloat(options.top_p) : 1;

      console.log(`[Groq] Sending request - Model: ${model}, Messages: ${messages.length}, Tokens: ${max_tokens}`);

      const requestPayload = {
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
        top_p: top_p
      };

      console.log('[Groq] Request payload:', JSON.stringify(requestPayload).substring(0, 200) + '...');

      const completion = await this.groq.chat.completions.create(requestPayload);

      console.log('[Groq] Response received successfully');

      return {
        success: true,
        data: completion
      };
    } catch (error) {
      console.error('[Groq] API Error:', error.message);
      throw error;
    }
  }

  /**
   * Check if Groq service is configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.groq !== null && !!process.env.GROQ_API_KEY;
  }
}

export default new GroqService();