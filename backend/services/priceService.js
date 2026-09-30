// services/priceService.js
//
// 3-Layer Price Data Strategy:
//
//   Layer 1: data.gov.in — "Variety-wise Daily Market Prices Data of Commodity"
//            Resource ID: 35985678-0d79-46b4-9ed6-6f13308a1d24
//            81M+ records, updated daily from AGMARKNET. Free, uses DATA_GOV_API_KEY.
//            Field names are Title_Case: Arrival_Date, Commodity, State, District,
//            Market, Min_Price, Modal_Price, Max_Price, Variety, Grade.
//            NOTE: State + District are mandatory filters per API schema.
//            We try State+Commodity first; if empty we fall back to State-only query.
//
//   Layer 2: NewsAPI + Groq AI — Fetch latest news, extract explicitly mentioned
//            prices via LLM. Only used when Layer 1 returns no data.
//            Labelled "Market Buzz" — medium confidence.
//
//   Layer 3: Groq AI Seasonal Estimate — Always works. Generates realistic prices
//            based on commodity, state, month, and known base prices.
//            Labelled "AI Estimated" with disclaimer.

import axios from 'axios';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// data.gov.in resource ID for Variety-wise Daily Market Prices (81M records)
const DATAGOV_RESOURCE = '35985678-0d79-46b4-9ed6-6f13308a1d24';
const DATAGOV_BASE = `https://api.data.gov.in/resource/${DATAGOV_RESOURCE}`;

// Seasonal base prices (per quintal, INR) — floor for AI estimates
const BASE_PRICES = {
  Wheat: 2200, Rice: 2800, Maize: 1600, Cotton: 6500, Soybean: 4200,
  Onion: 1800, Potato: 1500, Tomato: 1200, Sugarcane: 350, Groundnut: 5500,
  Mustard: 5200, Sunflower: 5000, Bajra: 2200, Jowar: 2400, Gram: 5400,
  Tur: 6800, Moong: 7200, Urad: 6500, Chilli: 12000, Turmeric: 8000,
  Garlic: 8000, Ginger: 10000, Banana: 1200, Mango: 2500, Pomegranate: 6000,
  Apple: 4500, Orange: 3000, Grapes: 5000,
};

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
  } catch { return fallback; }
}

class PriceService {
  constructor() {
    // Accept either key name — AGMARKNET_API_KEY or DATA_GOV_API_KEY
    this.datagovKey = (process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_API_KEY)?.trim();
    this.newsApiKey = process.env.NEWSAPI_KEY?.trim();
  }

  // ─── LAYER 1: data.gov.in (real AGMARKNET daily data) ────────────────────
  async _fetchFromDataGov(commodity, state) {
    if (!this.datagovKey) {
      console.warn('[PriceService] No data.gov.in API key (AGMARKNET_API_KEY / DATA_GOV_API_KEY)');
      return null;
    }

    // Build records from raw API response using confirmed Title_Case field names
    const buildMarkets = (records) => {
      const marketMap = new Map();
      for (const rec of records) {
        const name = rec.Market || 'Main Market';
        if (!marketMap.has(name)) {
          marketMap.set(name, {
            name,
            district: rec.District || '',
            state: rec.State || state,
            variety: rec.Variety || 'Standard',
            grade: rec.Grade || '',
            date: rec.Arrival_Date || '',
            min: parseFloat(rec.Min_Price) || 0,
            modal: parseFloat(rec.Modal_Price) || 0,
            max: parseFloat(rec.Max_Price) || 0,
            unit: 'per Quintal',
          });
        }
      }
      return Array.from(marketMap.values()).filter(m => m.modal > 0);
    };

    // Attempt 1: State + Commodity filter (most targeted)
    try {
      const res = await axios.get(DATAGOV_BASE, {
        params: {
          'api-key': this.datagovKey,
          format: 'json',
          'filters[State]': state,
          'filters[Commodity]': commodity,
          limit: 100,
          offset: 0,
        },
        timeout: 12000,
      });

      const records = res.data?.records || [];
      if (records.length > 0) {
        const markets = buildMarkets(records);
        if (markets.length > 0) {
          // Determine data freshness from most recent Arrival_Date
          const latest = markets.reduce((l, m) => (m.date > l ? m.date : l), '');
          const daysOld = latest
            ? Math.floor((Date.now() - new Date(latest.replace(/\//g, '-')).getTime()) / 86400000)
            : 999;
          return {
            source: 'AGMARKNET (Official)',
            confidence: 'high',
            freshness: daysOld <= 3 ? 'live' : daysOld <= 10 ? 'recent' : 'historical',
            daysOld,
            markets,
          };
        }
      }
    } catch (err) {
      console.warn('[PriceService] data.gov.in Layer 1a failed:', err.message);
    }

    // Attempt 2: State-only filter (broader, more results)
    try {
      const res = await axios.get(DATAGOV_BASE, {
        params: {
          'api-key': this.datagovKey,
          format: 'json',
          'filters[State]': state,
          limit: 150,
          offset: 0,
        },
        timeout: 12000,
      });

      const records = (res.data?.records || []).filter(
        r => (r.Commodity || '').toLowerCase().includes(commodity.toLowerCase())
      );

      if (records.length > 0) {
        const markets = buildMarkets(records);
        if (markets.length > 0) {
          const latest = markets.reduce((l, m) => (m.date > l ? m.date : l), '');
          const daysOld = latest
            ? Math.floor((Date.now() - new Date(latest.replace(/\//g, '-')).getTime()) / 86400000)
            : 999;
          return {
            source: 'AGMARKNET (Official)',
            confidence: 'high',
            freshness: daysOld <= 3 ? 'live' : daysOld <= 10 ? 'recent' : 'historical',
            daysOld,
            markets,
          };
        }
      }
    } catch (err) {
      console.warn('[PriceService] data.gov.in Layer 1b failed:', err.message);
    }

    return null;
  }

  // ─── LAYER 2: NewsAPI → AI price extraction ───────────────────────────────
  async _fetchFromNews(commodity, state) {
    if (!this.newsApiKey) return null;

    try {
      const res = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: `"${commodity}" price mandi market India ${state}`,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 15,
          apiKey: this.newsApiKey,
        },
        timeout: 10000,
      });

      const articles = res.data?.articles || [];
      if (articles.length === 0) return null;

      const headlines = articles
        .slice(0, 10)
        .map((a, i) => `[${i + 1}] ${a.publishedAt?.split('T')[0]}: ${a.title}. ${a.description || ''}`)
        .join('\n');

      const today = new Date().toISOString().split('T')[0];
      const aiRes = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: `Extract structured mandi price data from these news headlines for ${commodity} in ${state}, India.

Articles:
${headlines}

Rules:
- Only extract prices EXPLICITLY mentioned in the articles (₹ per quintal or per kg×100)
- Do NOT guess or hallucinate prices
- If no explicit prices found, set has_explicit_prices to false and return empty markets

Return ONLY JSON:
{
  "has_explicit_prices": true_or_false,
  "markets": [
    {"name": "market name", "min": number, "modal": number, "max": number, "date": "YYYY-MM-DD", "state": "${state}"}
  ]
}`,
        }],
        temperature: 0.1,
        max_tokens: 600,
      });

      const parsed = parseAIJSON(aiRes.choices[0]?.message?.content);
      if (!parsed?.has_explicit_prices || !parsed?.markets?.length) return null;

      const valid = parsed.markets.filter(m => m.modal > 100);
      if (!valid.length) return null;

      return {
        source: 'Market Buzz (News)',
        confidence: 'medium',
        disclaimer: 'Prices extracted from news articles. Verify with local mandi before selling.',
        markets: valid.map(m => ({
          ...m,
          min: m.min || Math.round(m.modal * 0.93),
          max: m.max || Math.round(m.modal * 1.07),
          unit: 'per Quintal',
          variety: 'Standard',
        })),
      };
    } catch (err) {
      console.warn(`[PriceService] News layer failed:`, err.message);
      return null;
    }
  }

  // ─── LAYER 3: Groq AI seasonal estimate ──────────────────────────────────
  async _generateAIEstimate(commodity, state) {
    const basePrice = BASE_PRICES[commodity] || 2000;
    const month = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1];

    try {
      const aiRes = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: `You are an agricultural market expert for India. Generate realistic current wholesale mandi prices for ${commodity} in ${state}.

Context: Month=${monthName}, Base price ≈ ₹${basePrice}/quintal. Consider harvest cycle, seasonal demand, regional factors.

Return ONLY JSON (prices in ₹ per quintal, use real mandi names in ${state}):
{
  "markets": [
    {"name": "Real Mandi Name", "district": "District", "min": number, "modal": number, "max": number, "date": "${today}", "state": "${state}"},
    {"name": "Another Mandi", "district": "District", "min": number, "modal": number, "max": number, "date": "${today}", "state": "${state}"}
  ],
  "season_note": "one line about seasonal price impact"
}`,
        }],
        temperature: 0.25,
        max_tokens: 400,
      });

      const parsed = parseAIJSON(aiRes.choices[0]?.message?.content);
      if (parsed?.markets?.length) {
        return {
          source: 'AI Estimated',
          confidence: 'low',
          disclaimer: '⚠️ Prices are AI-estimated based on seasonal patterns. Verify with your local mandi before selling.',
          seasonNote: parsed.season_note || null,
          markets: parsed.markets.map(m => ({ ...m, unit: 'per Quintal', variety: 'Standard' })),
        };
      }
    } catch (err) {
      console.warn('[PriceService] AI estimate failed:', err.message);
    }

    // Hardcoded seasonal fallback — always works
    const mult = [0.9, 0.92, 0.95, 1.0, 1.08, 1.12, 1.05, 0.98, 0.95, 0.97, 1.0, 1.02][month - 1];
    const modal = Math.round(basePrice * mult);
    return {
      source: 'Baseline Estimate',
      confidence: 'very-low',
      disclaimer: '⚠️ Rough baseline estimate only. Verify with your local mandi before selling.',
      markets: [{
        name: `${state} Main Market`, district: '', state,
        min: Math.round(modal * 0.92), modal, max: Math.round(modal * 1.08),
        date: today, unit: 'per Quintal', variety: 'Standard',
      }],
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async getPrice(commodity, state) {
    if (!commodity?.trim()) throw new Error('Commodity is required');
    if (!state?.trim()) throw new Error('State is required');

    const c = commodity.trim();
    const s = state.trim();

    const govData  = await this._fetchFromDataGov(c, s);
    if (govData)  return this._formatResponse(c, s, govData);

    const newsData = await this._fetchFromNews(c, s);
    if (newsData) return this._formatResponse(c, s, newsData);

    const aiData   = await this._generateAIEstimate(c, s);
    return this._formatResponse(c, s, aiData);
  }

  async getMultiplePrices(commodities, state) {
    if (!Array.isArray(commodities) || !commodities.length) {
      throw new Error('Commodities must be a non-empty array');
    }
    const results = await Promise.allSettled(commodities.map(c => this.getPrice(c, state)));
    return {
      success: true,
      data: results.filter(r => r.status === 'fulfilled').map(r => r.value.data),
      timestamp: new Date().toISOString(),
    };
  }

  _formatResponse(commodity, state, priceData) {
    const markets = priceData.markets || [];
    return {
      success: true,
      data: {
        commodity,
        state,
        source: priceData.source,
        confidence: priceData.confidence || 'high',
        freshness: priceData.freshness || null,
        disclaimer: priceData.disclaimer || null,
        season_note: priceData.seasonNote || null,
        market_data: { markets, unit: 'per Quintal', currency: 'INR' },
        total_records: markets.length,
        summary: markets.length > 0 ? {
          min_price:  Math.min(...markets.map(m => m.min).filter(Boolean)),
          max_price:  Math.max(...markets.map(m => m.max).filter(Boolean)),
          avg_modal:  Math.round(markets.reduce((s, m) => s + m.modal, 0) / markets.length),
          best_mandi: markets.reduce((b, m) => m.modal > b.modal ? m : b, markets[0])?.name,
        } : null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  isConfigured() {
    return !!(this.datagovKey || this.newsApiKey || process.env.GROQ_API_KEY);
  }
}

export default new PriceService();
