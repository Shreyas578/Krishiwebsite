/**
 * Smart Price Controller
 * Provides intelligent price recommendations based on:
 * - Current market prices (AGMARKNET)
 * - Product quality/grade
 * - Seasonal trends
 * - Regional demand
 * - Seller rating/history
 */

import PriceService from '../services/priceService.js';
import db from '../config/db.js';

/**
 * Get smart price recommendation for a commodity
 * Factors: quality, location, historical data, trends
 */
async function getSmartPrice(req, res) {
  try {
    const { commodity, state, district, quality = 'standard', quantity } = req.query;

    if (!commodity || !state) {
      return res.status(400).json({
        success: false,
        error: 'Commodity and state are required'
      });
    }

    // Get real market prices from AGMARKNET
    const marketData = await PriceService.getPrice(commodity, state);
    
    if (!marketData.success) {
      return res.status(400).json({
        success: false,
        error: marketData.error
      });
    }

    const markets = marketData.data.market_data.markets;

    // Calculate average prices
    const prices = markets.map(m => m.modal);
    const avgModal = Math.round(prices.reduce((a, b) => a + b) / prices.length);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Get price history for trend analysis
    const [priceHistory] = await db.query(
      `SELECT AVG(modal_price) as avg_price, DATE(created_at) as date
       FROM price_history 
       WHERE commodity = ? AND state = ?
       ORDER BY created_at DESC LIMIT 30`,
      [commodity, state]
    );

    let priceChange = 0;
    if (priceHistory.length >= 2) {
      const oldPrice = priceHistory[priceHistory.length - 1].avg_price;
      const currentPrice = priceHistory[0].avg_price;
      priceChange = ((currentPrice - oldPrice) / oldPrice) * 100;
    }

    // Quality adjustments
    const qualityMultipliers = {
      'premium': 1.15,    // +15%
      'grade_a': 1.10,    // +10%
      'standard': 1.00,   // No adjustment
      'grade_b': 0.95,    // -5%
      'poor': 0.85        // -15%
    };

    const qualityMultiplier = qualityMultipliers[quality] || 1.00;

    // Calculate recommended prices
    const recommendedPrice = Math.round(avgModal * qualityMultiplier);
    const minRecommended = Math.round(minPrice * qualityMultiplier);
    const maxRecommended = Math.round(maxPrice * qualityMultiplier);

    // Get demand score
    const [demandData] = await db.query(
      `SELECT demand_score FROM demand_score 
       WHERE commodity = ? AND state = ?
       ORDER BY month DESC LIMIT 1`,
      [commodity, state]
    );

    const demandScore = demandData.length > 0 ? demandData[0].demand_score : 50;

    // Calculate urgency factor based on quantity vs market demand
    let urgencyMultiplier = 1.0;
    if (quantity && demandScore) {
      if (demandScore > 75) {
        urgencyMultiplier = 1.05; // Can charge slightly more if high demand
      } else if (demandScore < 25) {
        urgencyMultiplier = 0.95; // Need to price lower if low demand
      }
    }

    const finalPrice = Math.round(recommendedPrice * urgencyMultiplier);

    // Prepare response with trend indicator
    let trendIndicator = 'stable';
    if (priceChange > 5) {
      trendIndicator = 'upward';
    } else if (priceChange < -5) {
      trendIndicator = 'downward';
    }

    return res.status(200).json({
      success: true,
      data: {
        commodity,
        state,
        district,
        quality,
        
        // Price recommendations (per unit)
        recommended_price: finalPrice,
        min_price: minRecommended,
        max_price: maxRecommended,
        avg_market_price: avgModal,
        
        // Market analysis
        market_range: {
          min: minPrice,
          max: maxPrice,
          markets_count: markets.length
        },
        
        // Trend analysis
        price_trend: {
          change_percentage: priceChange.toFixed(2),
          direction: trendIndicator,
          interpretation: priceChange > 0 ? 'Prices are increasing' : 'Prices are decreasing'
        },
        
        // Quality adjustment
        quality_adjustment: {
          applied_multiplier: qualityMultiplier,
          adjustment_percent: ((qualityMultiplier - 1) * 100).toFixed(1)
        },
        
        // Demand factor
        demand_score: demandScore,
        demand_level: demandScore > 60 ? 'High' : demandScore > 40 ? 'Medium' : 'Low',
        urgency_multiplier: urgencyMultiplier,
        
        // Recommendation text
        recommendation: buildRecommendation(finalPrice, avgModal, trendIndicator, demandScore),
        
        // Advice for seller
        selling_advice: {
          quick_sale: Math.round(finalPrice * 0.95),
          fair_price: finalPrice,
          premium_price: Math.round(finalPrice * 1.05),
          timing: trendIndicator === 'upward' ? 'Wait for higher prices' : 'Sell soon before prices drop'
        },
        
        // Sample markets with their prices
        sample_markets: markets.slice(0, 5).map(m => ({
          name: m.name,
          district: m.district,
          price: m.modal,
          variety: m.variety
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Smart price error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Build recommendation text based on market conditions
 */
function buildRecommendation(recommended, market, trend, demand) {
  let text = `Based on current market analysis: `;
  
  const variance = ((recommended - market) / market * 100).toFixed(0);
  
  if (Math.abs(variance) < 5) {
    text += `Price is aligned with market (±${Math.abs(variance)}%). `;
  } else if (variance > 0) {
    text += `Your price is ${variance}% above market average. `;
  } else {
    text += `Your price is ${Math.abs(variance)}% below market average. `;
  }
  
  if (trend === 'upward') {
    text += `Market prices are trending UP - Consider holding stock. `;
  } else if (trend === 'downward') {
    text += `Market prices are trending DOWN - Consider selling soon. `;
  }
  
  if (demand > 60) {
    text += `Demand is HIGH - You can maintain or increase price. `;
  } else if (demand < 40) {
    text += `Demand is LOW - Consider reducing price for quick sale. `;
  }
  
  text += `Recommended price: ₹${recommended}/unit`;
  
  return text;
}

/**
 * Get price history and trends for a commodity
 */
async function getPriceTrends(req, res) {
  try {
    const { commodity, state, days = 30 } = req.query;

    if (!commodity || !state) {
      return res.status(400).json({
        success: false,
        error: 'Commodity and state required'
      });
    }

    const [history] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        AVG(modal_price) as price,
        MIN(min_price) as min,
        MAX(max_price) as max,
        COUNT(*) as markets
       FROM price_history
       WHERE commodity = ? AND state = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [commodity, state, days]
    );

    return res.status(200).json({
      success: true,
      data: {
        commodity,
        state,
        period_days: days,
        price_history: history,
        trend_analysis: calculateTrendMetrics(history)
      }
    });

  } catch (error) {
    console.error('Price trends error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Calculate trend metrics
 */
function calculateTrendMetrics(history) {
  if (history.length < 2) {
    return { trend: 'insufficient_data' };
  }

  const oldestPrice = history[history.length - 1].price;
  const latestPrice = history[0].price;
  const change = ((latestPrice - oldestPrice) / oldestPrice) * 100;
  const avgPrice = history.reduce((sum, h) => sum + h.price, 0) / history.length;
  const volatility = Math.sqrt(
    history.reduce((sum, h) => sum + Math.pow(h.price - avgPrice, 2), 0) / history.length
  );

  return {
    price_change_percent: change.toFixed(2),
    trend: change > 5 ? 'upward' : change < -5 ? 'downward' : 'stable',
    volatility: volatility.toFixed(2),
    highest: Math.max(...history.map(h => h.price)),
    lowest: Math.min(...history.map(h => h.price)),
    average: avgPrice.toFixed(2)
  };
}

export { getSmartPrice, getPriceTrends };
export default {
  getSmartPrice,
  getPriceTrends
};
