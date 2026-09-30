/**
 * KISAN AI - Farm Report Generation Service
 * Master Prompt v3.0 - Reports are AI-generated based on farmer profile
 * 
 * Two Variants:
 * 1. 365-Day Crop Plan (when crop is decided)
 * 2. Crop Recommendation (when farmer hasn't decided yet)
 */

import Groq from 'groq-sdk';

/**
 * Strip markdown code fences and extract raw JSON string from Groq response.
 * Also handles truncated JSON by repairing to the last fully-closed brace.
 */
function parseGroqJSON(raw) {
  let text = (raw || '').trim();
  // Remove ```json ... ``` or ``` ... ``` fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  // Find the first { or [ and last } or ] to extract pure JSON
  const firstBrace = Math.min(
    text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
    text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
  );
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (firstBrace !== Infinity && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // First attempt: parse as-is
  try {
    return JSON.parse(text);
  } catch (_) {
    // Second attempt: repair truncated JSON by walking backwards from the end
    // to find the last position where the JSON can be parsed cleanly.
    console.warn('[REPORT] JSON parse failed — attempting truncation repair...');
    for (let i = text.length; i > 0; i--) {
      const ch = text[i - 1];
      if (ch !== '}' && ch !== ']') continue;
      try {
        const result = JSON.parse(text.slice(0, i));
        console.warn(`[REPORT] Truncation repair succeeded at position ${i}`);
        return result;
      } catch (_2) {
        // keep walking
      }
    }
    throw new SyntaxError('Unable to parse or repair JSON from AI response');
  }
}
import { getConnection } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Generate 365-Day Farm Plan
 * For farmers who have decided on a crop
 */
async function generate365DayPlan(farmer, farmProfile, crop) {
  try {
    console.log(`[REPORT] Generating 365-day plan for farmer: ${farmer.name}`);

    const prompt = `You are an expert agricultural advisor for India with deep knowledge of farming practices, weather patterns, crop cycles, pest management, and market conditions.

FARMER PROFILE:
Name: ${farmer.name}
Location: ${farmProfile.village}, ${farmProfile.tehsil}, ${farmProfile.district}, ${farmProfile.state}
Land Size: ${farmProfile.land_acres} acres
Number of Plots: ${farmProfile.num_plots}
Soil Type: ${farmProfile.soil_type}
Water Source: ${farmProfile.water_source}
Irrigation Type: ${farmProfile.irrigation_type}
Topography: ${farmProfile.topography}
Equipment: ${farmProfile.equipment}
Storage Available: ${farmProfile.has_storage ? 'Yes' : 'No'}
Budget Range: ${farmProfile.budget_range || 'Not specified'}
Market Preference: ${farmProfile.market_preference || 'Not specified'}

CURRENT CROP:
Crop Name: ${crop.crop_name}
Seed Variety: ${crop.seed_variety || 'Not specified'}
Sowing Date: ${crop.sowing_date || 'Not specified'}
Previous Crop: ${crop.previous_crop || 'Not specified'}
Expected Harvest: ${crop.expected_harvest_start} to ${crop.expected_harvest_end}

Your task: Generate a COMPLETE 365-day farming plan. Keep each field concise to ensure the full JSON fits in one response.

Return ONLY a valid JSON object with this EXACT structure:
{
  "farm_summary": {
    "farmer_name": "string",
    "crop_name": "string",
    "land_area": "string",
    "location": "string",
    "planning_period": "365 days",
    "key_objectives": ["obj1", "obj2", "obj3"]
  },
  "month_plans": [
    {
      "month_number": 1,
      "month_name": "Month name",
      "key_tasks": ["task1", "task2", "task3"],
      "fertilizer": "brief fertilizer advice",
      "irrigation": "brief irrigation advice",
      "pest_disease_watch": ["watch1", "watch2"],
      "estimated_cost": "\u20b9amount",
      "weather_advisory": "brief weather note",
      "month_summary": "one-sentence summary"
    }
  ],
  "harvest_plan": {
    "expected_harvest_start": "date",
    "expected_harvest_end": "date",
    "expected_yield_low": "tons/acre",
    "expected_yield_average": "tons/acre",
    "expected_yield_high": "tons/acre",
    "best_selling_window": "string",
    "recommended_mandis": ["mandi1", "mandi2"],
    "storage_tips": "tips"
  },
  "financial_summary": {
    "total_estimated_cost": "\u20b9amount",
    "cost_breakdown": {"seeds": "\u20b9", "fertilizer": "\u20b9", "labor": "\u20b9", "other": "\u20b9"},
    "expected_revenue_low": "\u20b9amount",
    "expected_revenue_average": "\u20b9amount",
    "expected_revenue_high": "\u20b9amount",
    "net_profit_estimate_average": "\u20b9amount",
    "roi_percentage": "percentage"
  },
  "risk_factors": [
    {"risk": "name", "likelihood": "high/medium/low", "mitigation": "steps"}
  ],
  "government_schemes": [
    {"scheme_name": "string", "benefit": "amount/subsidy"}
  ],
  "notes": "Additional advice"
}`;

    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 8000,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Indian agricultural advisor. Always respond with ONLY valid, complete JSON. Never truncate your response. Keep each field value concise (under 100 characters) so the entire JSON fits within the token limit.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from response
    let reportData = message.choices[0]?.message?.content || '';
    
    // Try to extract JSON if wrapped in markdown code blocks
    const parsedReport = parseGroqJSON(reportData);

    console.log(`[REPORT] 365-day plan generated successfully`);
    return {
      type: '365_day_plan',
      data: parsedReport,
      generated_at: new Date(),
      status: 'completed'
    };

  } catch (err) {
    console.error('[REPORT] Error generating 365-day plan:', err.message);
    throw err;
  }
}

/**
 * Generate Crop Recommendation Report
 * For farmers who haven't decided on a crop yet
 */
async function generateCropRecommendation(farmer, farmProfile) {
  try {
    console.log(`[REPORT] Generating crop recommendation for farmer: ${farmer.name}`);

    const prompt = `You are an expert agricultural advisor for India with deep knowledge of crop suitability, climate patterns, soil requirements, market demand, and profitability.

FARMER PROFILE:
Name: ${farmer.name}
Location: ${farmProfile.village}, ${farmProfile.tehsil}, ${farmProfile.district}, ${farmProfile.state}
Land Size: ${farmProfile.land_acres} acres
Soil Type: ${farmProfile.soil_type}
Water Source: ${farmProfile.water_source}
Irrigation Type: ${farmProfile.irrigation_type}
Budget Range: ${farmProfile.budget_range || 'Not specified'}
Market Preference: ${farmProfile.market_preference || 'Any'}
Risk Appetite: ${farmProfile.risk_appetite || 'Medium'}
Current Season: Determine based on state and location

Your task: Recommend the TOP 5 MOST SUITABLE CROPS for this farmer based on their land, location, and preferences. Consider current market prices, future demand, risk factors, and profitability.

Return a JSON object with this EXACT structure (and nothing else, just the JSON):
{
  "soil_assessment": {
    "type": "${farmProfile.soil_type}",
    "score": "suitability score 0-100",
    "strengths": ["strength1", "strength2"],
    "limitations": ["limitation1", "limitation2"],
    "improvement_tips": "suggestions for soil enhancement"
  },
  "location_climate": {
    "district": "${farmProfile.district}",
    "state": "${farmProfile.state}",
    "rainfall_pattern": "description",
    "temperature_range": "min-max in celsius",
    "recommended_seasons": ["season1", "season2"]
  },
  "top_5_crops": [
    {
      "rank": 1,
      "crop_name": "crop name",
      "suitability_score": "0-100",
      "why_suitable": "detailed reason",
      "current_modal_price": "â‚¹per unit",
      "price_trend": "rising/stable/falling",
      "expected_profit_per_acre": "â‚¹amount",
      "profit_confidence": "high/medium/low",
      "risk_level": "low/medium/high",
      "water_requirement": "low/medium/high",
      "water_match_with_source": true,
      "irrigation_compatibility": "description",
      "soil_compatibility": "description",
      "sowing_window": {
        "start_month": "month",
        "end_month": "month",
        "urgency": "immediate/soon/later"
      },
      "expected_yield_range": "tons/acre",
      "harvest_duration": "months",
      "market_demand": "high/medium/low",
      "export_potential": true,
      "storage_requirement": "description",
      "quick_start_week1": [
        "Action 1",
        "Action 2",
        "Action 3"
      ]
    }
  ],
  "ai_top_pick": {
    "crop": "crop name",
    "confidence": "percentage",
    "primary_reason": "key reason why this is #1",
    "expected_profit_season_1": "â‚¹amount",
    "alternative_if_low_risk_preferred": "crop name",
    "alternative_if_high_profit_preferred": "crop name"
  },
  "decision_deadline": "date - when to decide to meet sowing window",
  "next_steps": [
    "Get soil tested for NPK levels",
    "Check exact irrigation capacity",
    "Visit local mandis to verify current prices"
  ],
  "government_schemes_available": [
    {"scheme": "name", "benefit": "description"}
  ],
  "market_opportunity": "Current market analysis for top 3 crops",
  "risk_mitigation": "How to reduce farming risk",
  "notes": "Additional recommendations"
}`;

    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    let reportData = message.choices[0]?.message?.content || '';

    // Try to extract JSON if wrapped in markdown code blocks
    const parsedReport = parseGroqJSON(reportData);

    console.log(`[REPORT] Crop recommendation generated successfully`);
    return {
      type: 'crop_recommendation',
      data: parsedReport,
      generated_at: new Date(),
      status: 'completed'
    };

  } catch (err) {
    console.error('[REPORT] Error generating crop recommendation:', err.message);
    throw err;
  }
}

/**
 * Main Report Generation Function
 * Determines which variant to generate based on crop_decided flag
 */
async function generateFarmReport(userId, farmId, cropId) {
  let connection;
  try {
    connection = await getConnection();

    // Fetch farmer + profile + crop data
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const [profileRows] = await connection.execute(
      'SELECT * FROM farm_profiles WHERE user_id = ?',
      [userId]
    );

    const [cropRows] = await connection.execute(
      'SELECT * FROM farm_crops WHERE id = ? AND user_id = ?',
      [cropId, userId]
    );

    if (!userRows.length || !profileRows.length || !cropRows.length) {
      throw new Error('Farmer, farm profile, or crop not found');
    }

    const farmer = userRows[0];
    const farmProfile = profileRows[0];
    const crop = cropRows[0];

    console.log(`[REPORT] Starting generation for farmer: ${farmer.phone}`);

    let report;
    if (crop.is_decided) {
      // Generate 365-day plan
      report = await generate365DayPlan(farmer, farmProfile, crop);
    } else {
      // Generate crop recommendation
      report = await generateCropRecommendation(farmer, farmProfile);
    }

    // Store report in database
    const reportId = uuidv4();
    await connection.execute(
      `UPDATE farm_reports 
       SET report_data = ?, report_type = ?, is_active = ?, generated_at = NOW()
       WHERE user_id = ? AND farm_id = ? AND crop_id = ?
       LIMIT 1`,
      [
        JSON.stringify(report.data),
        report.type,
        true,
        userId,
        farmId,
        cropId
      ]
    );

    console.log(`[REPORT] Report stored in database`);

    connection.release();

    return {
      success: true,
      reportId,
      reportType: report.type,
      message: 'Farm report generated successfully'
    };

  } catch (err) {
    console.error('[REPORT] Error in generateFarmReport:', err.message);
    if (connection) connection.release();
    throw err;
  }
}

/**
 * Fetch generated report from database
 */
async function getFarmReport(userId, farmId) {
  let connection;
  try {
    connection = await getConnection();

    const [rows] = await connection.execute(
      `SELECT * FROM farm_reports 
       WHERE user_id = ? AND farm_id = ? AND is_active = TRUE
       ORDER BY generated_at DESC
       LIMIT 1`,
      [userId, farmId]
    );

    connection.release();

    if (!rows.length) {
      return null;
    }

    const report = rows[0];
    return {
      id: report.id,
      type: report.report_type,
      data: JSON.parse(report.report_data),
      generatedAt: report.generated_at
    };

  } catch (err) {
    console.error('[REPORT] Error fetching report:', err.message);
    if (connection) connection.release();
    throw err;
  }
}

export { generateFarmReport, getFarmReport, generate365DayPlan, generateCropRecommendation };
export default { generateFarmReport, getFarmReport };
