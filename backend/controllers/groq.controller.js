// controllers/groq.controller.js
import GroqService from '../services/groqService.js';
import OfflineService from '../services/offlineService.js';
import { getFarmProfileByUserId, getFarmCrops } from '../services/farmProfileService.js';
import { validationResult } from 'express-validator'

// Generate text completion (online or offline)
async function generateText(req, res) {
  try {
    const { messages, model, temperature, max_tokens, language } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' });
    }

    // Build system prompt with farm context
    let systemPrompt = "You are an expert Indian agricultural AI assistant. Provide practical, accurate, and empathetic advice to farmers.";
    if (req.user && req.user.id) {
      try {
        const profile = await getFarmProfileByUserId(req.user.id);
        if (profile) {
          systemPrompt += `\nFarmer Context:\n- Location: ${profile.village || ''}, ${profile.district || ''}, ${profile.state || ''}\n- Land: ${profile.land_size_acres || 0} acres\n- Soil Type: ${profile.soil_type || 'Unknown'}\n- Irrigation: ${profile.irrigation_type || 'Unknown'}`;
          const crops = await getFarmCrops(profile.id);
          if (crops && crops.length > 0) {
            const cropNames = crops.map(c => c.crop_name).join(', ');
            systemPrompt += `\n- Current Crops: ${cropNames}`;
          }
        }
      } catch (e) {
        console.warn('[Chatbot] Failed to fetch farm context:', e.message);
      }
    }
    
    // Add language instruction
    const langCode = language || 'en';
    const langMap = { hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi', ml: 'Malayalam' };
    const langName = langMap[langCode] || 'English';
    systemPrompt += `\n\nCRITICAL: You MUST respond entirely in ${langName}.`;

    // Prepend system prompt to messages
    const contextualMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const isOffline = OfflineService.isOfflineMode();
    let result;
    let mode = 'online';

    console.log(`[Chatbot] Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);

    try {
      if (isOffline) {
        // Use offline Mistral 7B
        mode = 'offline';
        console.log('[Chatbot] Using offline Mistral 7B model');
        
        const responseText = await OfflineService.generateOfflineResponse(contextualMessages, {
          temperature: temperature || 0.7,
          top_p: 0.9
        });

        result = {
          success: true,
          result: responseText,
          model: 'mistral:7b',
          mode: 'offline',
          usage: { prompt_tokens: 0, completion_tokens: 0 }
        };
      } else {
        // Try online Groq API
        try {
          const requestModel = model || 'openai/gpt-oss-20b';
          const requestTemp = temperature || 0.7;
          const requestTokens = max_tokens || 512;

          console.log(`[Chatbot] Using online Groq API with model: ${requestModel}`);

          const groqResult = await GroqService.chatCompletion(contextualMessages, {
            model: requestModel,
            temperature: requestTemp,
            max_tokens: requestTokens
          });

          const responseText = groqResult.data.choices[0]?.message?.content || 'No response generated';

          result = {
            success: true,
            result: responseText,
            model: requestModel,
            mode: 'online',
            usage: groqResult.data.usage
          };
        } catch (groqError) {
          console.warn('[Chatbot] Groq API failed, attempting offline fallback:', groqError.message);
          
          // Fallback to offline if available
          if (OfflineService.isOfflineMode()) {
            mode = 'offline-fallback';
            console.log('[Chatbot] Falling back to offline Mistral 7B');
            
            const responseText = await OfflineService.generateOfflineResponse(contextualMessages, {
              temperature: temperature || 0.7
            });

            result = {
              success: true,
              result: responseText,
              model: 'mistral:7b',
              mode: 'offline-fallback',
              usage: { prompt_tokens: 0, completion_tokens: 0 }
            };
          } else {
            throw groqError;
          }
        }
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[Chatbot] Generation error:', error.message);
      
      // Last resort: Return helpful message
      res.status(500).json({
        success: false,
        error: error.message,
        mode: mode,
        hint: 'Try connecting to internet or ensure Ollama is running for offline mode'
      });
    }
  } catch (error) {
    console.error('[Chatbot] Controller error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// Check if Groq is configured and offline status
async function checkConfig(req, res) {
  try {
    const groqConfigured = GroqService.isConfigured();
    const offlineAvailable = OfflineService.isOfflineMode();
    const offlineStatus = await OfflineService.getOfflineStatus();

    res.status(200).json({
      success: true,
      online: {
        configured: groqConfigured,
        service: 'Groq API'
      },
      offline: {
        available: offlineAvailable,
        models: offlineStatus
      },
      mode: offlineAvailable ? 'Both (Online + Offline)' : (groqConfigured ? 'Online only' : 'Not configured'),
      status: groqConfigured || offlineAvailable ? 'Ready' : 'Not ready'
    });
  } catch (error) {
    console.error('[Chatbot] Config check error:', error);
    res.status(500).json({ error: error.message });
  }
}

export { generateText, checkConfig };

export default {
  generateText,
  checkConfig
};
