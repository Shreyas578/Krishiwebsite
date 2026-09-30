import { Groq } from 'groq-sdk';
// Note: OpenRouter uses an OpenAI-compatible API endpoint
// We use it ONLY for disease detection because it supports Qwen-VL (vision model)
// All other AI tasks use Groq Llama (text-only, free tier)

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const VISION_MODEL = 'qwen/qwen2.5-vl-72b-instruct';
const TRANSLATION_MODEL = 'llama-3.3-70b-versatile'; // Groq, text-only

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY?.trim(),
});

/**
 * Call OpenRouter API (OpenAI-compatible) for vision tasks
 */
async function callOpenRouter(messages, maxTokens = 1024) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error('OPENROUTER_API_KEY not configured. Add it to .env — get a free key at https://openrouter.ai/');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kisanai.app',
      'X-Title': 'Kisan AI - Plant Disease Detection',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: maxTokens,
      temperature: 0.1,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  return response.json();
}

/**
 * Parse JSON from AI response, stripping markdown fences if present
 */
function parseAIJSON(raw, fallback = null) {
  try {
    let text = (raw || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const first = Math.min(
      text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
      text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
    );
    const last = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (first !== Infinity && last !== -1) text = text.slice(first, last + 1);
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

class DiseaseService {
  /**
   * Detect plant disease from image using OpenRouter Qwen-VL (vision model)
   * @param {Buffer} imageBuffer - Image buffer from multipart form
   * @param {string} cropName - Name of the crop (optional)
   * @param {string} language - Target language code (en, hi, mr, ta, te, etc.)
   * @returns {Promise<Object>} Detection result
   */
  async detectDisease(imageBuffer, cropName = 'Unknown', language = 'en') {
    try {
      if (!imageBuffer || imageBuffer.length === 0) {
        return { success: false, error: 'No image provided', data: null };
      }

      // Convert buffer to base64 data URI
      const base64Image = imageBuffer.toString('base64');
      const mimeType = 'image/jpeg';

      const prompt = `You are an expert agricultural pathologist specializing in Indian crops. 
Analyze this plant image carefully and provide a detailed disease assessment.

${cropName !== 'Unknown' ? `The farmer says this is a ${cropName} plant.` : ''}

Provide your assessment as ONLY a valid JSON object with this exact structure (no other text):
{
  "is_healthy": true,
  "disease_name": "string or null if healthy",
  "disease_type": "fungal|bacterial|viral|pest|nutrient_deficiency|none",
  "confidence": 85,
  "severity": "mild|moderate|severe|healthy",
  "affected_parts": ["leaves", "stem", "roots"],
  "treatment_recommendations": ["Apply fungicide X", "Remove affected leaves"],
  "treatment_timing": "Apply within 48 hours at dawn or dusk",
  "prevention_measures": ["Ensure good air circulation", "Avoid overhead irrigation"],
  "crop_name": "${cropName}",
  "additional_notes": "Any other important observations"
}`;

      const response = await callOpenRouter([
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ], 1024);

      const responseText = response.choices?.[0]?.message?.content || '';
      const detectionResult = parseAIJSON(responseText);

      if (!detectionResult) {
        console.error('[DiseaseService] Failed to parse Qwen-VL response:', responseText?.substring(0, 200));
        return {
          success: false,
          error: 'Failed to parse disease detection response',
          data: null,
        };
      }

      const detectionData = {
        disease_name: detectionResult.disease_name || 'Healthy Plant',
        disease_type: detectionResult.disease_type || 'none',
        is_healthy: detectionResult.is_healthy ?? true,
        confidence: detectionResult.confidence || 0,
        severity: detectionResult.severity || 'healthy',
        affected_parts: detectionResult.affected_parts || [],
        treatment_recommendations: detectionResult.treatment_recommendations || [],
        treatment_timing: detectionResult.treatment_timing || '',
        prevention_measures: detectionResult.prevention_measures || [],
        additional_notes: detectionResult.additional_notes || '',
        crop_name: cropName,
        model_used: VISION_MODEL,
        timestamp: new Date().toISOString(),
        language,
      };

      // Translate to farmer's language if not English (uses Groq Llama — text only)
      if (language && language !== 'en') {
        const translated = await this._translateDiseaseResult(detectionData, language);
        return { success: true, data: translated };
      }

      return { success: true, data: detectionData };
    } catch (error) {
      console.error('[DiseaseService] Detection error:', error.message);
      return {
        success: false,
        error: error.message || 'Disease detection failed',
        data: null,
      };
    }
  }

  /**
   * Translate disease result fields using Groq Llama (text-only, free)
   * Batched single prompt for speed
   */
  async _translateDiseaseResult(data, targetLanguage) {
    const LANGUAGE_NAMES = {
      hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
      kn: 'Kannada', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi', ml: 'Malayalam',
    };
    const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    try {
      const toTranslate = {
        disease_name: data.disease_name,
        treatment_recommendations: data.treatment_recommendations,
        treatment_timing: data.treatment_timing,
        prevention_measures: data.prevention_measures,
        additional_notes: data.additional_notes,
      };

      const response = await groq.chat.completions.create({
        model: TRANSLATION_MODEL,
        max_tokens: 1024,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `Translate the following agricultural disease information to ${langName}.
Keep it simple and practical for a farmer. Return ONLY valid JSON with the same keys.
Do NOT translate keys, only values.

${JSON.stringify(toTranslate, null, 2)}`,
        }],
      });

      const raw = response.choices[0]?.message?.content || '';
      const translated = parseAIJSON(raw);

      if (!translated) {
        return data; // Graceful fallback to English
      }

      return {
        ...data,
        disease_name: translated.disease_name || data.disease_name,
        treatment_recommendations: translated.treatment_recommendations || data.treatment_recommendations,
        treatment_timing: translated.treatment_timing || data.treatment_timing,
        prevention_measures: translated.prevention_measures || data.prevention_measures,
        additional_notes: translated.additional_notes || data.additional_notes,
        original_language: 'en',
        translated_to: targetLanguage,
      };
    } catch (e) {
      console.warn('[DiseaseService] Translation failed, returning English result:', e.message);
      return data;
    }
  }

  /**
   * Check if disease detection service is available
   */
  async isAvailable() {
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY?.trim() &&
      process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';
    return hasOpenRouter;
  }
}

export default new DiseaseService();
