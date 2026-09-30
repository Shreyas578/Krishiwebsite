import fetch from 'node-fetch';

const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'hi': 'Hindi',
  'mr': 'Marathi',
  'te': 'Telugu',
  'ta': 'Tamil',
  'kn': 'Kannada',
  'bn': 'Bengali',
  'pa': 'Punjabi',
  'gu': 'Gujarati',
  'ml': 'Malayalam',
  'od': 'Odia'
};

/**
 * Translate text to target language
 * Uses LibreTranslate API (free, open-source)
 */
export async function translateText(text, targetLanguage = 'hi', sourceLanguage = 'en') {
  try {
    // If source and target are same, return as is
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // Use LibreTranslate API
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text'
      })
    });

    if (!response.ok) {
      console.warn('Translation API failed, returning original text');
      return text;
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original if translation fails
  }
}

/**
 * Translate object (recursively translate string values)
 */
export async function translateObject(obj, targetLanguage = 'hi') {
  if (typeof obj === 'string') {
    return await translateText(obj, targetLanguage);
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => translateObject(item, targetLanguage)));
  }

  if (typeof obj === 'object' && obj !== null) {
    const translated = {};
    for (const [key, value] of Object.entries(obj)) {
      translated[key] = await translateObject(value, targetLanguage);
    }
    return translated;
  }

  return obj;
}

/**
 * Translate array of strings
 */
export async function translateArray(array, targetLanguage = 'hi') {
  const results = [];
  for (const item of array) {
    if (typeof item === 'string') {
      results.push(await translateText(item, targetLanguage));
    } else if (typeof item === 'object') {
      results.push(await translateObject(item, targetLanguage));
    } else {
      results.push(item);
    }
  }
  return results;
}

/**
 * Detect language from text
 */
export async function detectLanguage(text) {
  try {
    // Use a simple language detection
    // For production, use google-cloud-language or similar
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0B00-\u0B7F]/.test(text)) return 'bn'; // Bengali
    return 'en'; // Default to English
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

/**
 * Get language name
 */
export function getLanguageName(languageCode) {
  return SUPPORTED_LANGUAGES[languageCode] || 'English';
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

/**
 * Batch translate with caching (save translation costs)
 */
const translationCache = new Map();

export async function cacheAndTranslate(text, targetLanguage = 'hi') {
  const cacheKey = `${text}_${targetLanguage}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const translation = await translateText(text, targetLanguage);
  translationCache.set(cacheKey, translation);

  return translation;
}

/**
 * Clear translation cache (if memory becomes an issue)
 */
export function clearTranslationCache() {
  translationCache.clear();
}

/**
 * Translate disease detection response
 */
export async function translateDiseaseResponse(diseaseData, targetLanguage = 'hi') {
  return {
    diseaseName: await translateText(diseaseData.diseaseName, targetLanguage),
    severity: diseaseData.severity,
    description: await translateText(diseaseData.description, targetLanguage),
    immediateAction: await translateText(diseaseData.immediateAction, targetLanguage),
    protectiveGear: await translateArray(diseaseData.protectiveGear || [], targetLanguage),
    chemicalTreatment: await translateArray(diseaseData.chemicalTreatment || [], targetLanguage),
    organicAlternative: await translateText(diseaseData.organicAlternative, targetLanguage),
    whatNotToDo: await translateArray(diseaseData.whatNotToDo || [], targetLanguage),
    whenToCallExpert: await translateText(diseaseData.whenToCallExpert, targetLanguage)
  };
}

/**
 * Translate chatbot response
 */
export async function translateChatResponse(message, targetLanguage = 'hi') {
  return await translateText(message, targetLanguage);
}

/**
 * Translate farm report
 */
export async function translateFarmReport(reportData, targetLanguage = 'hi') {
  const translated = { ...reportData };

  // Translate month-by-month plans
  if (translated.monthlyPlans) {
    translated.monthlyPlans = await Promise.all(
      translated.monthlyPlans.map(async (month) => ({
        ...month,
        month: await translateText(month.month, targetLanguage),
        tasks: await translateArray(month.tasks, targetLanguage),
        pestsToWatch: await translateArray(month.pestsToWatch, targetLanguage),
        waterSchedule: await translateText(month.waterSchedule, targetLanguage)
      }))
    );
  }

  // Translate recommendations
  if (translated.recommendations) {
    translated.recommendations = await translateArray(translated.recommendations, targetLanguage);
  }

  // Translate harvest info
  if (translated.harvestInfo) {
    translated.harvestInfo.expectedDate = await translateText(translated.harvestInfo.expectedDate, targetLanguage);
    translated.harvestInfo.yieldRange = await translateText(translated.harvestInfo.yieldRange, targetLanguage);
    translated.harvestInfo.bestSellingWindow = await translateText(translated.harvestInfo.bestSellingWindow, targetLanguage);
  }

  return translated;
}
