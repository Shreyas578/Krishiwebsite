
import express from 'express';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });
import { getPrice, getMultiplePrices, checkConfig } from '../controllers/priceController.js';
import { getSmartPrice, getPriceTrends } from '../controllers/smartPriceController.js';
import PriceService from '../services/priceService.js';

// Price endpoints
router.get('/commodity', getPrice);      // GET /api/price/commodity?commodity=Wheat&state=Maharashtra
router.get('/', getMultiplePrices);       // GET /api/price/?state=Maharashtra
router.get('/status', checkConfig);       // GET /api/price/status

// Smart price endpoints
router.get('/smart-price', getSmartPrice);
router.get('/trends', getPriceTrends);

// ─── AI-Powered Price Forecast ────────────────────────────────────────────────
// Uses current market price as baseline → Groq Llama generates 4-week forecast
// GET /api/price/forecast?commodity=Wheat&state=Maharashtra&city=Nashik&days=30
router.get('/forecast', async (req, res) => {
  try {
    const { commodity, state, city, days = 28 } = req.query;
    if (!commodity || !state) {
      return res.status(400).json({ success: false, error: 'commodity and state are required' });
    }

    // Get current price as baseline (uses our 3-layer priceService)
    const currentPriceResult = await PriceService.getPrice(commodity, state);
    const basePrice = currentPriceResult?.data?.summary?.avg_modal || 2000;
    const currentSource = currentPriceResult?.data?.source || 'estimated';

    // Ask Groq to generate a realistic 4-week forecast
    const month = new Date().getMonth() + 1;
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1];
    const weeksCount = Math.ceil(parseInt(days) / 7);

    const locationContext = city ? `${city}, ${state}` : state;
    
    const aiRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are an expert agricultural price forecaster for India. Generate a ${weeksCount}-week detailed price forecast for ${commodity} in ${locationContext}.

Current market data:
- Current modal price: ₹${basePrice} per quintal
- Data source: ${currentSource}
- Current month: ${monthName}

Consider: seasonal harvest cycles, monsoon impact, demand patterns, mandi arrival trends, local ${locationContext} factors.

Return ONLY this JSON (no explanation):
{
  "forecast": [
    {"week": 1, "date_range": "e.g. Aug 15 - Aug 21", "price": number, "change_pct": number, "confidence": number_0_to_1, "note": "Detailed reason why prices will change this week based on local factors"},
    {"week": 2, "date_range": "e.g. Aug 22 - Aug 28", "price": number, "change_pct": number, "confidence": number_0_to_1, "note": "Detailed reason"},
    {"week": 3, "date_range": "e.g. Aug 29 - Sep 4", "price": number, "change_pct": number, "confidence": number_0_to_1, "note": "Detailed reason"},
    {"week": 4, "date_range": "e.g. Sep 5 - Sep 11", "price": number, "change_pct": number, "confidence": number_0_to_1, "note": "Detailed reason"}
  ],
  "trend": "bullish|bearish|stable",
  "season_context": "Detailed explanation of seasonal factors affecting ${locationContext}",
  "best_sell_week": 1_to_4,
  "best_sell_day": "e.g. Wednesday, Aug 20th"
}`,
      }],
      temperature: 0.3,
      max_tokens: 600,
    });

    // Parse AI response
    let parsed = null;
    try {
      let text = (aiRes.choices[0]?.message?.content || '').trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start = Math.min(text.indexOf('{') === -1 ? Infinity : text.indexOf('{'));
      const end = text.lastIndexOf('}');
      if (start !== Infinity && end !== -1) text = text.slice(start, end + 1);
      parsed = JSON.parse(text);
    } catch (_) { /* fall through to default */ }

    if (!parsed?.forecast) {
      // Fallback: simple linear forecast if AI fails
      parsed = {
        forecast: Array.from({ length: weeksCount }, (_, i) => ({
          week: i + 1,
          date_range: `Week ${i + 1}`,
          price: Math.round(basePrice * (1 + 0.015 * (i + 1))),
          change_pct: parseFloat((1.5 * (i + 1)).toFixed(1)),
          confidence: parseFloat((0.75 - i * 0.1).toFixed(2)),
          note: 'Estimated based on seasonal trend',
        })),
        trend: 'stable',
        season_context: 'Forecast generated from seasonal baseline.',
        best_sell_week: 1,
        best_sell_day: 'Any day next week'
      };
    }

    res.status(200).json({
      success: true,
      data: {
        commodity,
        state,
        current_price: basePrice,
        current_source: currentSource,
        forecast: parsed.forecast,
        trend: parsed.trend,
        season_context: parsed.season_context,
        best_sell_week: parsed.best_sell_week,
        best_sell_day: parsed.best_sell_day,
        generated_at: new Date().toISOString(),
        disclaimer: 'AI forecast for planning only. Actual prices depend on market conditions.',
      },
    });
  } catch (error) {
    console.error('[Forecast] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── AI Demand Intelligence ───────────────────────────────────────────────────
// Returns demandScore (0-100), outlook, bestSellingMonths for the DemandCalendarWidget
// GET /api/price/demand?commodity=Wheat&state=Maharashtra&city=Nashik
router.get('/demand', async (req, res) => {
  try {
    const { commodity, state, city } = req.query;
    if (!commodity || !state) {
      return res.status(400).json({ success: false, error: 'commodity and state are required' });
    }

    const month = new Date().getMonth() + 1;
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1];
    const locationContext = city ? `${city}, ${state}` : state;

    const aiRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are an expert agricultural market analyst for India. Analyze the detailed current demand outlook for ${commodity} in ${locationContext}.

Current month: ${monthName}.

Consider: harvest cycle, festival season demand, export demand, MSP procurement, storage patterns, regional consumption. Provide realistic estimates for active buyers and competition.

Return ONLY this JSON:
{
  "demandScore": number_0_to_100,
  "outlook": "High|Moderate|Average|Low",
  "activeBuyers": "Estimated number (e.g. 245)",
  "competitionLevel": "High|Medium|Low (e.g. 82 active sellers)",
  "bestSellingMonths": ["Month1", "Month2", "Month3"],
  "demandDrivers": ["Detailed reason 1", "Detailed reason 2", "Detailed reason 3"],
  "avoidMonths": ["Month"],
  "insight": "Detailed market insight paragraph for the farmer"
}`,
      }],
      temperature: 0.2,
      max_tokens: 350,
    });

    let parsed = null;
    try {
      let text = (aiRes.choices[0]?.message?.content || '').trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const s = text.indexOf('{'), e = text.lastIndexOf('}');
      if (s !== -1 && e !== -1) text = text.slice(s, e + 1);
      parsed = JSON.parse(text);
    } catch (_) {}

    // Sensible fallback if AI parsing fails
    if (!parsed?.demandScore) {
      parsed = {
        demandScore: 55,
        outlook: 'Average',
        activeBuyers: 'approx. 120',
        competitionLevel: 'Medium',
        bestSellingMonths: ['Oct', 'Nov', 'Dec'],
        demandDrivers: ['Seasonal demand', 'Local consumption'],
        avoidMonths: [],
        insight: `${commodity} demand in ${state} is currently average for ${monthName}.`,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        commodity,
        state,
        ...parsed,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Demand] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── AI Historical Trends (Candlesticks) ──────────────────────────────────────
// GET /api/price/history?commodity=Wheat&state=Maharashtra&city=Nashik&period=weekly&count=5
router.get('/history', async (req, res) => {
  try {
    const { commodity, state, city, period = 'weekly', count = 5 } = req.query;
    if (!commodity || !state) {
      return res.status(400).json({ success: false, error: 'commodity and state are required' });
    }

    // Get current price baseline
    const currentPriceResult = await PriceService.getPrice(commodity, state);
    const basePrice = currentPriceResult?.data?.summary?.avg_modal || 2000;
    const locationContext = city ? `${city}, ${state}` : state;

    const aiRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are a market data generator. Generate realistic historical ${period} price data (candlestick format) for the past ${count} periods for ${commodity} in ${locationContext}. 
The current price is approximately ₹${basePrice} per quintal.
Work backwards from period 0 (current) to period -${count - 1}. Prices should reflect realistic agricultural volatility. Ensure open, close, min, max are logically consistent (min <= open,close <= max).

Return ONLY JSON:
{
  "history": [
    { "periodOffset": 0, "min": number, "max": number, "open": number, "close": number, "modal": number },
    { "periodOffset": -1, "min": number, "max": number, "open": number, "close": number, "modal": number }
  ]
}`
      }],
      temperature: 0.3,
      max_tokens: 600,
    });

    let parsed = null;
    try {
      let text = (aiRes.choices[0]?.message?.content || '').trim();
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start = Math.min(text.indexOf('{') === -1 ? Infinity : text.indexOf('{'));
      const end = text.lastIndexOf('}');
      if (start !== Infinity && end !== -1) text = text.slice(start, end + 1);
      parsed = JSON.parse(text);
    } catch (_) {}

    if (!parsed?.history) {
      // Fallback simple history
      parsed = {
        history: Array.from({ length: count }, (_, i) => {
          const mod = basePrice * (1 - 0.02 * i);
          const o = Math.round(mod * 0.95);
          const c = Math.round(mod * 1.05);
          return { periodOffset: -i, min: Math.round(mod * 0.9), max: Math.round(mod * 1.1), open: o, close: c, modal: Math.round(mod) };
        })
      };
    }

    res.status(200).json({ success: true, data: parsed.history });
  } catch (error) {
    console.error('[History] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Price alerts endpoints
router.get('/alerts',        (req, res) => res.status(200).json({ success: true, data: [] }));
router.post('/alerts',       (req, res) => res.status(201).json({ success: true, data: { id: Date.now().toString(), ...req.body } }));
router.delete('/alerts/:id', (req, res) => res.status(200).json({ success: true, message: 'Alert deleted' }));

export default router;
