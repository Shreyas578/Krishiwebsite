import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { Groq } from 'groq-sdk';
// Note: Using native fetch (Node 18+) — no need for node-fetch

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

function parseGroqJSON(raw, fallback) {
  try {
    let text = (raw || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const first = Math.min(text.indexOf('{') === -1 ? Infinity : text.indexOf('{'), text.indexOf('[') === -1 ? Infinity : text.indexOf('['));
    const last = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (first !== Infinity && last !== -1) text = text.slice(first, last + 1);
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

/**
 * Get current market prices for a commodity in a state
 */
export async function getCurrentMarketPrices(commodity, state) {
  const connection = await db.getConnection();
  try {
    // First check cache using the unique composite key
    const cacheKey = `${commodity}_${state}`;
    const [cached] = await connection.query(
      `SELECT market_data FROM price_cache 
       WHERE commodity_state_key = ? AND expires_at > NOW()`,
      [cacheKey]
    );

    if (cached.length > 0) {
      connection.release();
      return JSON.parse(cached[0].market_data);
    }

    // Fetch from AGMARKNET API
    const apiKey = process.env.AGMARKNET_API_KEY;
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a5c0-ea0081eda513?api-key=${apiKey}&filters[state]=${state}&filters[commodity]=${commodity}&limit=100`;

    const response = await fetch(url);
    const data = await response.json();

    const marketData = {
      commodity,
      state,
      markets: data.records ? data.records.map(record => ({
        mandi: record.market,
        min: parseInt(record.min_price) || 0,
        modal: parseInt(record.modal_price) || 0,
        max: parseInt(record.max_price) || 0,
        lastUpdated: record.arrival_date
      })) : []
    };

    // Cache for 6 hours â€” uses commodity_state_key unique constraint
    await connection.query(
      `INSERT INTO price_cache (id, commodity_state_key, commodity, state, market_data, expires_at) 
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 6 HOUR))
       ON DUPLICATE KEY UPDATE market_data = VALUES(market_data), expires_at = VALUES(expires_at)`,
      [uuidv4(), cacheKey, commodity, state, JSON.stringify(marketData)]
    );

    connection.release();
    return marketData;
  } catch (error) {
    connection.release();
    console.error('Error fetching market prices:', error);
    throw error;
  }
}

/**
 * Forecast commodity price using AI and historical data
 */
export async function forecastPrice(commodity, state, days = 30) {
  const connection = await db.getConnection();
  try {
    // Check if forecast exists and not expired
    const [existing] = await connection.query(
      `SELECT predicted_price, confidence, trend FROM price_forecast 
       WHERE commodity = ? AND state = ? AND forecast_days = ? AND expires_at > NOW()`,
      [commodity, state, days]
    );

    if (existing.length > 0) {
      connection.release();
      return existing[0];
    }

    // Get historical prices (last 6 months)
    const [history] = await connection.query(
      `SELECT DATE(recorded_date) as date, modal_price FROM price_history 
       WHERE commodity = ? AND state = ? 
       ORDER BY recorded_date DESC LIMIT 180`,
      [commodity, state]
    );

    // Get current prices
    const currentPrices = await getCurrentMarketPrices(commodity, state);
    const currentPrice = currentPrices.markets[0]?.modal || 0;

    // Prepare prompt for AI
    const priceHistory = history.map(h => `${h.date}: â‚¹${h.modal_price}`).join(', ');
    
    const prompt = `You are an agricultural commodity price analyst for India. Based on:
- Historical prices (last 6 months): ${priceHistory || 'No data available'}
- Current price: â‚¹${currentPrice}
- Commodity: ${commodity}
- State: ${state}
- Forecast period: ${days} days

Predict the price trend and provide:
1. Expected price in ${days} days
2. Confidence level (0-100%)
3. Trend: rising/falling/stable
4. Key factors affecting the price
5. Best selling window (date range)
6. Risk assessment

Respond as JSON:
{
  "predictedPrice": 2400,
  "confidence": 75,
  "trend": "rising",
  "keyFactors": ["factor1", "factor2"],
  "bestSellStart": "2024-01-15",
  "bestSellEnd": "2024-01-25",
  "riskLevel": "medium"
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    let responseText = response.choices[0]?.message?.content || '';
    const forecast = parseGroqJSON(responseText, {
      predictedPrice: currentPrice,
      confidence: 0,
      trend: 'stable'
    });

    // Save to database
    const forecastId = uuidv4();
    await connection.query(
      `INSERT INTO price_forecast (id, commodity, state, forecast_days, predicted_price, confidence, trend, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
       ON DUPLICATE KEY UPDATE predicted_price = VALUES(predicted_price), confidence = VALUES(confidence)`,
      [forecastId, commodity, state, days, forecast.predictedPrice, forecast.confidence, forecast.trend]
    );

    connection.release();
    return forecast;
  } catch (error) {
    connection.release();
    console.error('Error forecasting price:', error);
    throw error;
  }
}

/**
 * Get demand score for a commodity in a month
 */
export async function getDemandScore(commodity, month) {
  const connection = await db.getConnection();
  try {
    const [demand] = await connection.query(
      `SELECT demand_score FROM demand_score 
       WHERE commodity = ? AND month = ?`,
      [commodity, month]
    );

    connection.release();
    return demand.length > 0 ? demand[0].demand_score : 50; // Default neutral
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Calculate smart listing price
 */
export async function calculateSmartListingPrice(commodity, state, quality = 'average', costPerUnit = null) {
  try {
    const currentPrices = await getCurrentMarketPrices(commodity, state);
    const forecast = await forecastPrice(commodity, state, 14);
    const month = new Date().getMonth() + 1;
    const demandScore = await getDemandScore(commodity, month);

    const qualityMultiplier = {
      'premium': 1.08,
      'average': 1.0,
      'below_average': 0.92
    };

    const basePrice = currentPrices.markets[0]?.modal || 0;
    const trendAdjustment = forecast.trend === 'rising' ? 1.03 :
                           forecast.trend === 'falling' ? 0.97 : 1.0;
    const demandAdjustment = 1 + (demandScore - 50) / 200;

    const suggestedPrice = Math.round(
      basePrice * qualityMultiplier[quality] * trendAdjustment * demandAdjustment
    );

    let profitability = null;
    if (costPerUnit) {
      profitability = {
        costPerUnit,
        suggestedPrice,
        profitPerUnit: suggestedPrice - costPerUnit,
        marginPercentage: ((suggestedPrice - costPerUnit) / costPerUnit * 100).toFixed(1)
      };
    }

    return {
      suggested: suggestedPrice,
      min: currentPrices.markets[0]?.min || basePrice * 0.9,
      max: currentPrices.markets[0]?.max || basePrice * 1.1,
      modal: basePrice,
      confidence: forecast.confidence,
      reasoning: `Based on â‚¹${basePrice} avg + ${forecast.trend} trend + demand ${demandScore}/100`,
      profitability
    };
  } catch (error) {
    console.error('Error calculating smart price:', error);
    throw error;
  }
}

/**
 * Create price alert
 */
export async function createPriceAlert(userId, commodity, state, targetPrice, condition) {
  const connection = await db.getConnection();
  try {
    const alertId = uuidv4();
    await connection.query(
      `INSERT INTO price_alerts (id, user_id, commodity, state, target_price, \`condition\`, is_active)
       VALUES (?, ?, ?, ?, ?, ?, true)`,
      [alertId, userId, commodity, state, targetPrice, condition]
    );
    connection.release();
    return { alertId, success: true };
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get user's price alerts
 */
export async function getUserAlerts(userId) {
  const connection = await db.getConnection();
  try {
    const [alerts] = await connection.query(
      `SELECT id, commodity, state, target_price, \`condition\`, is_active, last_triggered, created_at
       FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    connection.release();
    return alerts;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Check and trigger alerts (for cron job)
 */
export async function checkAndTriggerAlerts() {
  const connection = await db.getConnection();
  try {
    const [activeAlerts] = await connection.query(
      `SELECT id, user_id, commodity, state, target_price, \`condition\` 
       FROM price_alerts WHERE is_active = true`
    );

    const triggeredAlerts = [];

    for (const alert of activeAlerts) {
      try {
        const prices = await getCurrentMarketPrices(alert.commodity, alert.state);
        const currentPrice = prices.markets[0]?.modal || 0;

        let shouldTrigger = false;
        if (alert.condition === 'above' && currentPrice >= alert.target_price) {
          shouldTrigger = true;
        } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          await connection.query(
            `UPDATE price_alerts SET last_triggered = NOW() WHERE id = ?`,
            [alert.id]
          );
          triggeredAlerts.push({
            alertId: alert.id,
            userId: alert.user_id,
            commodity: alert.commodity,
            currentPrice,
            targetPrice: alert.target_price,
            message: `ðŸ”” ${alert.commodity} price in ${alert.state} is now â‚¹${currentPrice}`
          });
        }
      } catch (err) {
        console.error(`Error checking alert ${alert.id}:`, err);
      }
    }

    connection.release();
    return triggeredAlerts;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Deactivate price alert
 */
export async function deactivateAlert(alertId) {
  const connection = await db.getConnection();
  try {
    await connection.query(
      `UPDATE price_alerts SET is_active = false WHERE id = ?`,
      [alertId]
    );
    connection.release();
    return { success: true };
  } catch (error) {
    connection.release();
    throw error;
  }
}
