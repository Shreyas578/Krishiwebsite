/**
 * KISAN AI - Complete Registration Controller (Fixed for actual DB schema)
 * Handles multi-role registration: farmer (5 steps), buyer/supplier (1 step)
 * 
 * Tables:
 *   users (id, phone, password_hash, role, fcm_token, phone_verified, registration_complete)
 *   farmer_profiles (id, user_id, land_area_acres, soil_type, water_source, village, district, state, latitude, longitude)
 *   buyer_profiles (id, user_id, company_name)
 *   supplier_profiles (id, user_id, company_name)
 *   refresh_tokens (id, token_hash, user_id, expires_at)
 */

import { getConnection } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// =====================================================================
// STEP 1: PERSONAL DETAILS — All roles
// Validates and saves personal info into a JWT session token (no DB yet)
// =====================================================================

async function savePersonalDetails(req, res) {
  try {
    const { name, phone, email, password, passwordConfirm, preferredLanguage, role } = req.body;

    // Validation
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: 'Name, phone, and password are required' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
    }

    const validRoles = ['farmer', 'buyer', 'seller'];
    const userRole = validRoles.includes(role) ? (role === 'seller' ? 'supplier' : role) : 'farmer';

    // Check if phone already exists
    const connection = await getConnection();
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE phone = ?',
      [cleanPhone]
    );
    connection.release();

    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, error: 'Phone number already registered. Please login instead.' });
    }

    // Store password hash in session so we don't re-hash on complete
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build JWT session token
    const sessionToken = jwt.sign(
      {
        registrationStep: 1,
        phone: cleanPhone,
        name,
        email: email || null,
        preferredLanguage: preferredLanguage || 'en',
        role: userRole,
        hashedPassword,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, message: 'Personal details saved', sessionToken, nextStep: userRole === 'farmer' ? 2 : 5 });

  } catch (err) {
    console.error('Personal details error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

// =====================================================================
// STEP 2: FARM LOCATION — Farmers only
// =====================================================================

async function saveFarmLocation(req, res) {
  try {
    const { sessionToken, method, lat, lng, village, tehsil, district, state, pinCode } = req.body;

    let session;
    try {
      session = jwt.verify(sessionToken, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session. Please start registration again.' });
    }

    if (!lat || !lng || !district || !state) {
      return res.status(400).json({ success: false, error: 'Location, district, and state are required' });
    }

    let geocodedVillage = village || '';
    if (method === 'gps') {
      try {
        const geoResponse = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { timeout: 5000, headers: { 'User-Agent': 'KisanAI/1.0' } }
        );
        if (geoResponse.data?.address) {
          geocodedVillage = geoResponse.data.address.village ||
                            geoResponse.data.address.town ||
                            geoResponse.data.address.county ||
                            village || '';
        }
      } catch (geoErr) {
        console.warn('Geocoding failed, using manual values:', geoErr.message);
      }
    }

    delete session.iat;
    delete session.exp;

    const updatedToken = jwt.sign(
      {
        ...session,
        registrationStep: 2,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          village: geocodedVillage,
          tehsil: tehsil || '',
          district,
          state,
          pinCode: pinCode || '',
        }
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, message: 'Farm location saved', sessionToken: updatedToken, nextStep: 3 });

  } catch (err) {
    console.error('Farm location error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

// =====================================================================
// STEP 3: LAND DETAILS — Farmers only
// =====================================================================

async function saveLandDetails(req, res) {
  try {
    const { sessionToken, landAcres, numPlots, soilType, waterSource, irrigationType, topography, equipment, hasStorage, budgetRange, marketPreference, riskAppetite } = req.body;

    let session;
    try {
      session = jwt.verify(sessionToken, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session. Please start registration again.' });
    }

    if (!landAcres || !soilType || !waterSource) {
      return res.status(400).json({ success: false, error: 'Land size, soil type, and water source are required' });
    }

    delete session.iat;
    delete session.exp;

    const updatedToken = jwt.sign(
      {
        ...session,
        registrationStep: 3,
        landDetails: {
          landAcres: parseFloat(landAcres),
          numPlots: parseInt(numPlots) || 1,
          soilType,
          waterSource,
          irrigationType: irrigationType || null,
          topography: topography || null,
          equipment: equipment || null,
          hasStorage: hasStorage === 'true' || hasStorage === true,
          budgetRange: budgetRange || null,
          marketPreference: marketPreference || null,
          riskAppetite: riskAppetite || 'medium',
        }
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, message: 'Land details saved', sessionToken: updatedToken, nextStep: 4 });

  } catch (err) {
    console.error('Land details error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

// =====================================================================
// STEP 4: CROP SELECTION — Farmers only
// =====================================================================

async function saveCropSelection(req, res) {
  try {
    const { sessionToken, isDecided, cropName, seedVariety, sowingDate, previousCrop, estimatedBudget } = req.body;

    let session;
    try {
      session = jwt.verify(sessionToken, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session. Please start registration again.' });
    }

    const decided = isDecided === 'true' || isDecided === true;
    if (decided && !cropName) {
      return res.status(400).json({ success: false, error: 'Crop name is required when crop is decided' });
    }

    delete session.iat;
    delete session.exp;

    const updatedToken = jwt.sign(
      {
        ...session,
        registrationStep: 4,
        cropSelection: {
          isDecided: decided,
          cropName: cropName || null,
          seedVariety: seedVariety || null,
          sowingDate: sowingDate || null,
          previousCrop: previousCrop || null,
          estimatedBudget: estimatedBudget || null,
        }
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, message: 'Crop selection saved', sessionToken: updatedToken, nextStep: 5 });

  } catch (err) {
    console.error('Crop selection error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

// =====================================================================
// STEP 5: COMPLETE REGISTRATION — All roles
// Creates user in DB with correct role profile
// =====================================================================

async function completeRegistration(req, res) {
  let connection;
  try {
    const { sessionToken, password } = req.body;

    let session;
    try {
      session = jwt.verify(sessionToken, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session. Please start registration again.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required to confirm registration' });
    }

    const isMatch = await bcrypt.compare(password, session.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    connection = await getConnection();
    const userId = uuidv4();
    const role = session.role || 'farmer';

    // 1. Create user record
    try {
      await connection.execute(
        `INSERT INTO users (id, phone, name, password_hash, role, phone_verified, registration_complete, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [userId, session.phone, session.name || session.phone, session.hashedPassword, role]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'Phone number is already registered. Please login.' });
      }
      throw err;
    }

    // 2. Create role-specific profile
    const profileId = uuidv4();

    if (role === 'farmer') {
      const location = session.location || {};
      const land = session.landDetails || {};

      await connection.execute(
        `INSERT INTO farmer_profiles (id, user_id, land_area_acres, soil_type, water_source, village, district, state, latitude, longitude, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          profileId,
          userId,
          land.landAcres || 0,
          land.soilType || null,
          land.waterSource || null,
          location.village || null,
          location.district || null,
          location.state || null,
          location.lat || null,
          location.lng || null,
        ]
      );

      // Insert crop data
      const crop = session.cropSelection || {};
      const cropId = uuidv4();
      await connection.execute(
        `INSERT INTO farm_crops (id, user_id, farm_id, crop_name, is_decided, seed_variety, sowing_date, previous_crop, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          cropId,
          userId,
          profileId,
          crop.cropName || 'TBD',
          crop.isDecided ? 1 : 0,
          crop.seedVariety || null,
          crop.sowingDate || null,
          crop.previousCrop || null,
        ]
      );
    } else if (role === 'buyer') {
      await connection.execute(
        `INSERT INTO buyer_profiles (id, user_id, company_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        [profileId, userId, session.name]
      );
    } else if (role === 'supplier') {
      await connection.execute(
        `INSERT INTO supplier_profiles (id, user_id, company_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        [profileId, userId, session.name]
      );
    }

    // 3. Generate JWT tokens
    const accessToken = jwt.sign(
      { id: userId, phone: session.phone, role, name: session.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Save refresh token
    const refreshTokenId = uuidv4();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await connection.execute(
      `INSERT INTO refresh_tokens (id, token_hash, user_id, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())`,
      [refreshTokenId, refreshTokenHash, userId]
    );

    connection.release();

    res.status(201).json({
      success: true,
      message: `Registration complete! Welcome to Kisan AI.`,
      user: {
        id: userId,
        name: session.name,
        phone: session.phone,
        email: session.email,
        role,
        preferredLanguage: session.preferredLanguage,
      },
      token: accessToken,
      refreshToken,
    });

  } catch (err) {
    console.error('Registration completion error:', err);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
  }
}

// =====================================================================
// GET REGISTRATION SUMMARY — For Step 5 Review screen
// =====================================================================

async function getRegistrationSummary(req, res) {
  try {
    const { sessionToken } = req.body;

    let session;
    try {
      session = jwt.verify(sessionToken, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    res.json({
      success: true,
      summary: {
        personal: { name: session.name, phone: session.phone, email: session.email, language: session.preferredLanguage, role: session.role },
        location: session.location || null,
        landDetails: session.landDetails || null,
        cropSelection: session.cropSelection || null,
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export { savePersonalDetails, saveFarmLocation, saveLandDetails, saveCropSelection, completeRegistration, getRegistrationSummary };
export default { savePersonalDetails, saveFarmLocation, saveLandDetails, saveCropSelection, completeRegistration, getRegistrationSummary };
