import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// Create or update farm profile
async function createOrUpdateFarmProfile(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const {
      village,
      tehsil,
      district,
      state,
      pin_code,
      land_size_acres,
      land_size_hectares,
      soil_type,
      soil_ph,
      water_source,
      irrigation_type,
      equipment,
      labor_type,
      storage_available,
      nearest_mandi,
      preferred_language,
    } = req.body;

    // Check if profile exists
    const connection = db.getConnection();
    const [existing] = await connection.query(
      'SELECT id FROM farm_profiles WHERE user_id = ?',
      [userId]
    );

    let profileId;

    if (existing.length > 0) {
      // Update existing profile
      profileId = existing[0].id;
      await connection.query(
        `UPDATE farm_profiles SET 
          village = ?, tehsil = ?, district = ?, state = ?, pin_code = ?,
          land_size_acres = ?, land_size_hectares = ?, soil_type = ?, soil_ph = ?,
          water_source = ?, irrigation_type = ?, equipment = ?, labor_type = ?,
          storage_available = ?, nearest_mandi = ?, preferred_language = ?,
          updated_at = NOW()
        WHERE user_id = ?`,
        [
          village, tehsil, district, state, pin_code,
          land_size_acres, land_size_hectares, soil_type, soil_ph,
          water_source, irrigation_type, equipment, labor_type,
          storage_available, nearest_mandi, preferred_language,
          userId
        ]
      );
    } else {
      // Create new profile
      profileId = uuidv4();
      await connection.query(
        `INSERT INTO farm_profiles (
          id, user_id, village, tehsil, district, state, pin_code,
          land_size_acres, land_size_hectares, soil_type, soil_ph,
          water_source, irrigation_type, equipment, labor_type,
          storage_available, nearest_mandi, preferred_language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileId, userId, village, tehsil, district, state, pin_code,
          land_size_acres, land_size_hectares, soil_type, soil_ph,
          water_source, irrigation_type, equipment, labor_type,
          storage_available, nearest_mandi, preferred_language
        ]
      );
    }

    connection.release();

    res.status(201).json({
      success: true,
      data: {
        profileId,
        message: existing.length > 0 ? 'Profile updated' : 'Profile created'
      }
    });
  } catch (error) {
    console.error('Error in farm profile:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get farm profile
async function getFarmProfile(req, res) {
  try {
    const { userId } = req.params;

    const connection = db.getConnection();
    const [profiles] = await connection.query(
      'SELECT * FROM farm_profiles WHERE user_id = ?',
      [userId]
    );

    connection.release();

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Farm profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: profiles[0]
    });
  } catch (error) {
    console.error('Error fetching farm profile:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get farm crops
async function getFarmCrops(req, res) {
  try {
    const { farmProfileId } = req.params;

    const connection = db.getConnection();
    const [crops] = await connection.query(
      'SELECT * FROM farm_crops WHERE farm_profile_id = ? ORDER BY created_at DESC',
      [farmProfileId]
    );

    connection.release();

    res.status(200).json({
      success: true,
      data: crops
    });
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ error: error.message });
  }
}

// Add crop to farm
async function addCropToFarm(req, res) {
  try {
    const { farmProfileId } = req.params;
    const { crop_name, variety, sowing_date, expected_harvest } = req.body;

    const cropId = uuidv4();
    const connection = db.getConnection();

    await connection.query(
      `INSERT INTO farm_crops (id, farm_profile_id, crop_name, variety, sowing_date, expected_harvest)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cropId, farmProfileId, crop_name, variety, sowing_date, expected_harvest]
    );

    connection.release();

    res.status(201).json({
      success: true,
      data: { cropId, message: 'Crop added successfully' }
    });
  } catch (error) {
    console.error('Error adding crop:', error);
    res.status(500).json({ error: error.message });
  }
}

export {
  createOrUpdateFarmProfile,
  getFarmProfile,
  getFarmCrops,
  addCropToFarm
};
