import { getConnection } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Register a new user (Step 1-3: Basic Info)
async function register(req, res) {
  let connection;
  try {
    const { phone, password, role, name, email } = req.body;
    
    // Validation
    if (!phone || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone, password, and role are required' 
      });
    }

    // Validate role
    if (!['farmer', 'supplier', 'buyer'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role. Must be farmer, supplier, or buyer' 
      });
    }

    // Validate phone format (basic check)
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    connection = await getConnection();
    
    // Check if user already exists
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );
    
    if (rows.length > 0) {
      connection.release();
      return res.status(409).json({ 
        success: false, 
        error: 'Phone number already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID for user
    const userId = uuidv4();

    // Insert user
    await connection.execute(
      'INSERT INTO users (id, phone, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [userId, phone, hashedPassword, role]
    );

    // If supplier or buyer, create corresponding profile
    if (role === 'supplier') {
      const profileId = uuidv4();
      await connection.execute(
        'INSERT INTO supplier_profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [profileId, userId]
      );
    } else if (role === 'buyer') {
      const profileId = uuidv4();
      await connection.execute(
        'INSERT INTO buyer_profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [profileId, userId]
      );
    } else if (role === 'farmer') {
      const profileId = uuidv4();
      await connection.execute(
        'INSERT INTO farmer_profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [profileId, userId]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, phone, role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token hash in database
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    
    await connection.execute(
      'INSERT INTO refresh_tokens (id, token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())',
      [refreshTokenId, refreshTokenHash, userId]
    );

    connection.release();

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, phone, role, name, email },
      message: 'Basic registration complete. Please complete farm details (Steps 4-5)'
    });
  } catch (err) {
    console.error('Registration error:', err.message, err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
}

// Complete Farmer Registration - Steps 4 & 5 (Farm Details + Crop Selection)
async function completeFarmerRegistration(req, res) {
  let connection;
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      // Step 4: Farm Details
      village,
      district,
      state,
      latitude,
      longitude,
      landSizeAcres,
      soilType,
      waterSource,
      irrigationType,
      // Step 5: Crop Selection
      selectedCrop,
      cropDecisionType // 'selected' or 'not_decided'
    } = req.body;

    // Validation
    if (!village || !district || !state) {
      return res.status(400).json({ 
        success: false, 
        error: 'Village, district, and state are required' 
      });
    }

    if (!cropDecisionType || !['selected', 'not_decided'].includes(cropDecisionType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Crop decision type must be "selected" or "not_decided"' 
      });
    }

    if (cropDecisionType === 'selected' && !selectedCrop) {
      return res.status(400).json({ 
        success: false, 
        error: 'Selected crop is required' 
      });
    }

    connection = await getConnection();

    // Update farm_profiles with location and farm details
    await connection.execute(
      `UPDATE farmer_profiles 
       SET village = ?, district = ?, state = ?, latitude = ?, longitude = ?, 
           land_area_acres = ?, soil_type = ?, water_source = ?, irrigation_type = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [village, district, state, latitude || null, longitude || null, landSizeAcres || null, 
       soilType, waterSource, irrigationType, userId]
    );

    // Get farm_profile_id
    const [farmProfile] = await connection.execute(
      'SELECT id FROM farmer_profiles WHERE user_id = ?',
      [userId]
    );

    if (farmProfile.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Farm profile not found' });
    }

    const farmProfileId = farmProfile[0].id;

    // Create farm report based on crop decision
    let reportData = {};
    if (cropDecisionType === 'selected') {
      // Crop-specific 1-year report
      reportData = await generateCrop1YearReport(connection, selectedCrop, state, soilType);
    } else {
      // Crop recommendations based on land info
      reportData = await generateCropRecommendations(connection, state, soilType, landSizeAcres, waterSource);
    }

    // Store farm report
    const reportId = uuidv4();
    await connection.execute(
      `INSERT INTO farm_reports (id, farm_profile_id, report_type, report_data, generated_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [reportId, farmProfileId, cropDecisionType === 'selected' ? 'crop_specific' : 'recommendations', 
       JSON.stringify(reportData)]
    );

    // Get all farm profile data to return
    const [updatedProfile] = await connection.execute(
      'SELECT * FROM farmer_profiles WHERE user_id = ?',
      [userId]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Farm registration completed successfully',
      farmProfile: updatedProfile[0],
      report: reportData,
      reportId: reportId
    });
  } catch (err) {
    console.error('Complete farmer registration error:', err);
    if (connection) connection.release();
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message 
    });
  }
}

// Helper: Generate 1-year crop report
async function generateCrop1YearReport(connection, cropName, state, soilType) {
  // This would typically call Groq AI or a database of crop guides
  const report = {
    crop: cropName,
    state: state,
    soilType: soilType,
    month_wise_plan: {
      'Month 1': { activities: ['Land preparation', 'Soil testing'], inputs: ['Fertilizer', 'Seeds'], expected_growth: '0%' },
      'Month 2': { activities: ['Sowing', 'Irrigation'], inputs: ['Water', 'Pesticides'], expected_growth: '20%' },
      'Month 3': { activities: ['Weeding', 'Fertilizer application'], inputs: ['Nitrogen', 'Phosphorus'], expected_growth: '40%' },
      'Month 4': { activities: ['Disease monitoring', 'Irrigation'], inputs: ['Fungicides', 'Water'], expected_growth: '60%' },
      'Month 5': { activities: ['Nutrient management', 'Pest control'], inputs: ['Micro-nutrients', 'Insecticides'], expected_growth: '75%' },
      'Month 6-11': { activities: ['Maintenance', 'Monitoring'], inputs: ['Regular care'], expected_growth: '90-95%' },
      'Month 12': { activities: ['Harvesting', 'Post-harvest handling'], inputs: ['Storage'], expected_growth: '100%' }
    },
    estimated_yield: '50-60 quintals/acre',
    expected_revenue: '₹200,000 - ₹250,000 per acre',
    risk_factors: ['Weather variations', 'Pest outbreaks', 'Market price fluctuations'],
    recommendations: ['Follow IPM practices', 'Use certified seeds', 'Regular monitoring']
  };
  return report;
}

// Helper: Generate crop recommendations based on land info
async function generateCropRecommendations(connection, state, soilType, landSize, waterSource) {
  // Query database for suitable crops
  const [cropMaster] = await connection.execute(
    `SELECT * FROM crop_master 
     WHERE soil_preference LIKE ? 
     LIMIT 10`,
    [`%${soilType}%`]
  );

  const recommendations = {
    state: state,
    landInfo: {
      soilType: soilType,
      landSize: landSize,
      waterSource: waterSource
    },
    suitableCrops: cropMaster.map(crop => ({
      name: crop.name,
      scientificName: crop.scientific_name,
      waterRequirement: crop.water_requirement,
      growingSeason: crop.growing_season,
      soilPreference: crop.soil_preference,
      suitabilityScore: calculateSuitability(crop, soilType, waterSource)
    })),
    generalAdvice: [
      'Conduct soil testing before selecting crop',
      'Check water availability for the growing season',
      'Plan crop rotation to maintain soil health',
      'Connect with local agricultural extension office'
    ]
  };

  return recommendations;
}

// Helper: Calculate crop suitability
function calculateSuitability(crop, soilType, waterSource) {
  let score = 50;
  if (crop.soil_preference.includes(soilType)) score += 30;
  if (waterSource && crop.water_requirement.toLowerCase() === waterSource.toLowerCase()) score += 20;
  return Math.min(score, 100);
}

// Login user
async function login(req, res) {
  let connection;
  try {
    const { phone, password } = req.body;
    
    // Validation
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and password are required' 
      });
    }

    connection = await getConnection();
    
    // Query user by phone
    const [rows] = await connection.execute(
      'SELECT id, phone, password_hash, role FROM users WHERE phone = ?',
      [phone]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const user = rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '7d' }
    );

    // Generate and store refresh token
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    
    await connection.execute(
      'INSERT INTO refresh_tokens (id, token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())',
      [refreshTokenId, refreshTokenHash, user.id]
    );

    connection.release();

    res.json({
      success: true,
      token,
      user: { id: user.id, phone: user.phone, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  } finally {
    if (connection) connection.release();
  }
}

// Refresh token
async function refreshToken(req, res) {
  let connection;
  try {
    const { token: refreshTokenFromRequest } = req.body;
    
    if (!refreshTokenFromRequest) {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token required' 
      });
    }

    // Verify the refresh token JWT
    let decoded;
    try {
      decoded = jwt.verify(refreshTokenFromRequest, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired refresh token' 
      });
    }

    connection = await getConnection();
    
    // Get user from database
    const [userRows] = await connection.execute(
      'SELECT id, phone, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userRows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const user = userRows[0];

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '7d' }
    );

    connection.release();

    res.json({ 
      success: true,
      token: accessToken 
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  } finally {
    if (connection) connection.release();
  }
}

// Logout user
async function logout(req, res) {
  let connection;
  try {
    // Get user ID from JWT token (from middleware)
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    connection = await getConnection();
    
    // Delete all refresh tokens for this user
    await connection.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );

    connection.release();

    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  } finally {
    if (connection) connection.release();
  }
}

// Update FCM token
async function updateFcmToken(req, res) {
  let connection;
  try {
    const { fcm_token } = req.body;
    
    if (!fcm_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'FCM token is required' 
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    connection = await getConnection();
    
    await connection.execute(
      'UPDATE users SET fcm_token = ?, updated_at = NOW() WHERE id = ?',
      [fcm_token, userId]
    );

    connection.release();

    res.json({ 
      success: true,
      message: 'FCM token updated successfully' 
    });
  } catch (err) {
    console.error('Update FCM token error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  } finally {
    if (connection) connection.release();
  }
}

export { register, completeFarmerRegistration, login, refreshToken, logout, updateFcmToken };

export default {
  register,
  completeFarmerRegistration,
  login,
  refreshToken,
  logout,
  updateFcmToken
};

