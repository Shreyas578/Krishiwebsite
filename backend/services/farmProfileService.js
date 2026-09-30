import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

/**
 * Create or update farm profile
 */
export async function createOrUpdateFarmProfile(userId, profileData) {
  const connection = await db.getConnection();
  try {
    const [existing] = await connection.query(
      'SELECT id FROM farmer_profiles WHERE user_id = ?',
      [userId]
    );

    const profileId = existing.length > 0 ? existing[0].id : uuidv4();

    if (existing.length > 0) {
      // Update
      await connection.query(
        `UPDATE farm_profiles SET 
          village = ?, tehsil = ?, district = ?, state = ?, pin_code = ?,
          land_size_acres = ?, land_size_hectares = ?, soil_type = ?, soil_ph = ?,
          water_source = ?, irrigation_type = ?, equipment = ?, labor_type = ?,
          storage_available = ?, nearest_mandi = ?, preferred_language = ?,
          updated_at = NOW()
        WHERE user_id = ?`,
        [
          profileData.village, profileData.tehsil, profileData.district, 
          profileData.state, profileData.pin_code,
          profileData.land_size_acres, profileData.land_size_hectares, 
          profileData.soil_type, profileData.soil_ph,
          profileData.water_source, profileData.irrigation_type, 
          profileData.equipment, profileData.labor_type,
          profileData.storage_available, profileData.nearest_mandi, 
          profileData.preferred_language,
          userId
        ]
      );
    } else {
      // Create
      await connection.query(
        `INSERT INTO farm_profiles (
          id, user_id, village, tehsil, district, state, pin_code,
          land_size_acres, land_size_hectares, soil_type, soil_ph,
          water_source, irrigation_type, equipment, labor_type,
          storage_available, nearest_mandi, preferred_language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileId, userId, profileData.village, profileData.tehsil, 
          profileData.district, profileData.state, profileData.pin_code,
          profileData.land_size_acres, profileData.land_size_hectares, 
          profileData.soil_type, profileData.soil_ph,
          profileData.water_source, profileData.irrigation_type, 
          profileData.equipment, profileData.labor_type,
          profileData.storage_available, profileData.nearest_mandi, 
          profileData.preferred_language
        ]
      );
    }

    connection.release();
    return { profileId, created: existing.length === 0 };
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get farm profile by user ID
 */
export async function getFarmProfileByUserId(userId) {
  const connection = await db.getConnection();
  try {
    const [profiles] = await connection.query(
      'SELECT * FROM farmer_profiles WHERE user_id = ?',
      [userId]
    );
    connection.release();
    return profiles.length > 0 ? profiles[0] : null;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get farm profile by ID
 */
export async function getFarmProfileById(farmProfileId) {
  const connection = await db.getConnection();
  try {
    const [profiles] = await connection.query(
      'SELECT * FROM farm_profiles WHERE id = ?',
      [farmProfileId]
    );
    connection.release();
    return profiles.length > 0 ? profiles[0] : null;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Add crop to farm
 */
export async function addCropToFarm(farmProfileId, cropData) {
  const connection = await db.getConnection();
  try {
    const cropId = uuidv4();
    await connection.query(
      `INSERT INTO farm_crops (
        id, farm_profile_id, crop_name, variety, sowing_date, expected_harvest, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        cropId, farmProfileId, cropData.crop_name, cropData.variety, 
        cropData.sowing_date, cropData.expected_harvest
      ]
    );
    connection.release();
    return { cropId, success: true };
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get all crops for a farm
 */
export async function getFarmCrops(farmProfileId) {
  const connection = await db.getConnection();
  try {
    const [crops] = await connection.query(
      'SELECT * FROM farm_crops WHERE farm_profile_id = ? ORDER BY created_at DESC',
      [farmProfileId]
    );
    connection.release();
    return crops;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get crop by ID
 */
export async function getCropById(cropId) {
  const connection = await db.getConnection();
  try {
    const [crops] = await connection.query(
      'SELECT * FROM farm_crops WHERE id = ?',
      [cropId]
    );
    connection.release();
    return crops.length > 0 ? crops[0] : null;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Update crop
 */
export async function updateCrop(cropId, cropData) {
  const connection = await db.getConnection();
  try {
    await connection.query(
      `UPDATE farm_crops SET 
        crop_name = ?, variety = ?, sowing_date = ?, 
        expected_harvest = ?, status = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        cropData.crop_name, cropData.variety, cropData.sowing_date,
        cropData.expected_harvest, cropData.status, cropId
      ]
    );
    connection.release();
    return { success: true };
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Delete crop
 */
export async function deleteCrop(cropId) {
  const connection = await db.getConnection();
  try {
    await connection.query('DELETE FROM farm_crops WHERE id = ?', [cropId]);
    connection.release();
    return { success: true };
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Get all crops in crop master
 */
export async function getAllCropsFromMaster() {
  const connection = await db.getConnection();
  try {
    const [crops] = await connection.query(
      `SELECT id, name, scientific_name, water_requirement, growing_season, soil_preference 
       FROM crop_master ORDER BY name ASC`
    );
    connection.release();
    return crops;
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Search crops by name
 */
export async function searchCrops(searchTerm) {
  const connection = await db.getConnection();
  try {
    const [crops] = await connection.query(
      `SELECT id, name, scientific_name, water_requirement, growing_season, soil_preference 
       FROM crop_master WHERE name LIKE ? ORDER BY name ASC`,
      [`%${searchTerm}%`]
    );
    connection.release();
    return crops;
  } catch (error) {
    connection.release();
    throw error;
  }
}
