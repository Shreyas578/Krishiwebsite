// services/offlineService.js
import axios from 'axios';

class OfflineService {
  constructor() {
    this.ollama_endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.isOllamaAvailable = false;
    this.checkOllamaAvailability();
  }

  /**
   * Check if Ollama (local Mistral) is available
   */
  async checkOllamaAvailability() {
    try {
      const response = await axios.get(`${this.ollama_endpoint}/api/tags`, {
        timeout: 2000
      });
      this.isOllamaAvailable = true;
      console.log('[Offline] Ollama service is available');
    } catch (err) {
      this.isOllamaAvailable = false;
      console.log('[Offline] Ollama service not available - offline mode disabled');
    }
  }

  /**
   * Check if running in offline mode
   * @returns {boolean} true if offline models are available
   */
  isOfflineMode() {
    return this.isOllamaAvailable;
  }

  /**
   * Generate response using local Mistral 7B model
   * @param {Array} messages - Chat messages
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async generateOfflineResponse(messages, options = {}) {
    try {
      if (!this.isOllamaAvailable) {
        throw new Error('Ollama service not available');
      }

      // Convert messages array to prompt format
      const prompt = this.formatPrompt(messages);
      
      console.log('[Offline] Generating response with Mistral 7B...');

      const response = await axios.post(
        `${this.ollama_endpoint}/api/generate`,
        {
          model: 'mistral:7b',
          prompt: prompt,
          stream: false,
          temperature: options.temperature || 0.7,
          top_k: options.top_k || 40,
          top_p: options.top_p || 0.9
        },
        {
          timeout: 60000 // 60 second timeout for model inference
        }
      );

      if (response.data && response.data.response) {
        console.log('[Offline] Response generated successfully');
        return response.data.response.trim();
      } else {
        throw new Error('No response from model');
      }
    } catch (error) {
      console.error('[Offline] Error generating response:', error.message);
      throw new Error(`Offline generation failed: ${error.message}`);
    }
  }

  /**
   * Format messages array into prompt for Mistral
   * @param {Array} messages - Messages array
   * @returns {string} Formatted prompt
   */
  formatPrompt(messages) {
    let prompt = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n`;
      }
    }
    
    // Add assistant prompt for next response
    prompt += 'Assistant: ';
    
    return prompt;
  }

  /**
   * Get health status of offline services
   * @returns {Promise<Object>} Service status
   */
  async getOfflineStatus() {
    const status = {
      ollama: this.isOllamaAvailable,
      mistral: this.isOllamaAvailable ? 'available' : 'unavailable',
      whisper: true, // Whisper is pre-installed on mobile
      tts: true,      // TTS is pre-installed on mobile
      translation: true // Translation is pre-installed on mobile
    };

    return status;
  }
}

export default new OfflineService();
