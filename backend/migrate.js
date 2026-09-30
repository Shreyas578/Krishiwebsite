/**
 * KISAN AI - Comprehensive Database Migration
 * Safely creates all missing tables without dropping existing data
 * Run: node migrate.js
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'kisanaico',
  multipleStatements: false,
});

console.log('🌾 Kisan AI — Running database migrations...\n');

const tables = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(15) NOT NULL UNIQUE,
      name VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('farmer', 'supplier', 'buyer') NOT NULL,
      fcm_token VARCHAR(255),
      phone_verified TINYINT(1) DEFAULT 0,
      registration_complete TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'refresh_tokens',
    sql: `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id VARCHAR(36) PRIMARY KEY,
      token_hash VARCHAR(255) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'farmer_profiles',
    sql: `CREATE TABLE IF NOT EXISTS farmer_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      land_area_acres DECIMAL(5,2),
      soil_type VARCHAR(50),
      water_source VARCHAR(50),
      village VARCHAR(100),
      tehsil VARCHAR(100),
      district VARCHAR(100),
      state VARCHAR(100),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'farm_profiles',
    sql: `CREATE TABLE IF NOT EXISTS farm_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      village VARCHAR(100),
      tehsil VARCHAR(100),
      district VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pin_code VARCHAR(6),
      land_size_acres DECIMAL(10,2),
      land_size_hectares DECIMAL(10,2),
      soil_type VARCHAR(100),
      soil_ph DECIMAL(3,1),
      water_source VARCHAR(100),
      irrigation_type VARCHAR(100),
      equipment VARCHAR(255),
      labor_type VARCHAR(100),
      storage_available BOOLEAN DEFAULT FALSE,
      nearest_mandi VARCHAR(255),
      preferred_language VARCHAR(20) DEFAULT 'en',
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'buyer_profiles',
    sql: `CREATE TABLE IF NOT EXISTS buyer_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      company_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'supplier_profiles',
    sql: `CREATE TABLE IF NOT EXISTS supplier_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      company_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'farm_crops',
    sql: `CREATE TABLE IF NOT EXISTS farm_crops (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      farm_id VARCHAR(36),
      crop_name VARCHAR(255) NOT NULL,
      is_decided BOOLEAN DEFAULT FALSE,
      seed_variety VARCHAR(255),
      sowing_date DATE,
      previous_crop VARCHAR(255),
      expected_harvest DATE,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'farm_reports',
    sql: `CREATE TABLE IF NOT EXISTS farm_reports (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      farm_id VARCHAR(36),
      crop_id VARCHAR(36),
      report_type VARCHAR(100) NOT NULL,
      report_data LONGTEXT,
      is_active BOOLEAN DEFAULT TRUE,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'marketplace_listings',
    sql: `CREATE TABLE IF NOT EXISTS marketplace_listings (
      id VARCHAR(36) PRIMARY KEY,
      seller_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'kg',
      price_per_unit DECIMAL(10,2) NOT NULL,
      quality_grade VARCHAR(10),
      location JSON,
      images JSON,
      ndvi_score DECIMAL(3,2),
      disease_clear BOOLEAN,
      status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'marketplace_orders',
    sql: `CREATE TABLE IF NOT EXISTS marketplace_orders (
      id VARCHAR(36) PRIMARY KEY,
      listing_id VARCHAR(36) NOT NULL,
      buyer_id VARCHAR(36) NOT NULL,
      seller_id VARCHAR(36) NOT NULL,
      quantity_ordered DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status ENUM('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
      payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
      delivery_address TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'government_schemes',
    sql: `CREATE TABLE IF NOT EXISTS government_schemes (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      eligibility_criteria JSON,
      benefits JSON,
      application_process TEXT,
      website_url VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255),
      message TEXT NOT NULL,
      type VARCHAR(50),
      read_status BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'weather_cache',
    sql: `CREATE TABLE IF NOT EXISTS weather_cache (
      id VARCHAR(36) PRIMARY KEY,
      lat_lng_key VARCHAR(100) NOT NULL UNIQUE,
      temperature DECIMAL(5,2),
      feels_like DECIMAL(5,2),
      humidity INT,
      description VARCHAR(255),
      wind_speed DECIMAL(5,2),
      uvi INT,
      visibility INT,
      sunrise TIMESTAMP NULL,
      sunset TIMESTAMP NULL,
      advice JSON,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'price_cache',
    sql: `CREATE TABLE IF NOT EXISTS price_cache (
      id VARCHAR(36) PRIMARY KEY,
      commodity_state_key VARCHAR(100) NOT NULL UNIQUE,
      commodity VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      market_data JSON,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'chat',
    sql: `CREATE TABLE IF NOT EXISTS chat (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      message TEXT NOT NULL,
      is_bot BOOLEAN DEFAULT FALSE,
      language VARCHAR(10) DEFAULT 'en',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'disease_history',
    sql: `CREATE TABLE IF NOT EXISTS disease_history (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      farmer_profile_id VARCHAR(36),
      image_url VARCHAR(512),
      crop_name VARCHAR(100),
      disease_detected VARCHAR(100),
      confidence INT,
      severity ENUM('mild', 'moderate', 'severe', 'healthy'),
      advice TEXT,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'crop_master',
    sql: `CREATE TABLE IF NOT EXISTS crop_master (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      scientific_name VARCHAR(100),
      water_requirement VARCHAR(50),
      growing_season VARCHAR(50),
      soil_preference VARCHAR(255),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
];

// Also add a 'name' column to users if it doesn't exist
async function addColumnIfMissing(conn, table, column, definition) {
  try {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'kisanaico', table, column]
    );
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`  ✅ Added column '${column}' to '${table}'`);
    }
  } catch (err) {
    console.warn(`  ⚠️  Could not add '${column}' to '${table}': ${err.message}`);
  }
}

let success = 0;
let skipped = 0;

for (const { name, sql } of tables) {
  try {
    await connection.query(sql);
    console.log(`✅ Table '${name}' — OK`);
    success++;
  } catch (err) {
    console.error(`❌ Table '${name}' — FAILED: ${err.message}`);
  }
}

console.log('\n🔧 Checking column additions...');
await addColumnIfMissing(connection, 'users', 'name', 'VARCHAR(255) AFTER phone');
await addColumnIfMissing(connection, 'users', 'phone_verified', 'TINYINT(1) DEFAULT 0');
await addColumnIfMissing(connection, 'users', 'registration_complete', 'TINYINT(1) DEFAULT 0');
await addColumnIfMissing(connection, 'farmer_profiles', 'tehsil', 'VARCHAR(100)');
await addColumnIfMissing(connection, 'farm_crops', 'user_id', 'VARCHAR(36)');
await addColumnIfMissing(connection, 'farm_crops', 'farm_id', 'VARCHAR(36)');
await addColumnIfMissing(connection, 'farm_crops', 'is_decided', 'BOOLEAN DEFAULT FALSE');
await addColumnIfMissing(connection, 'farm_crops', 'expected_harvest', 'DATE');

// Marketplace blockchain tracking
await addColumnIfMissing(connection, 'marketplace_listings', 'tx_hash', 'VARCHAR(100)');
await addColumnIfMissing(connection, 'marketplace_listings', 'ipfs_hash', 'VARCHAR(100)');
await addColumnIfMissing(connection, 'marketplace_orders', 'tx_hash', 'VARCHAR(100)');
await addColumnIfMissing(connection, 'marketplace_orders', 'ipfs_hash', 'VARCHAR(100)');

// Seed government schemes if table is empty
const [govSchemes] = await connection.query('SELECT COUNT(*) as cnt FROM government_schemes');
if (govSchemes[0].cnt === 0) {
  console.log('\n🌱 Seeding government schemes...');
  await connection.query(`
    INSERT INTO government_schemes (id, name, description, eligibility_criteria, benefits, application_process, website_url, is_active) VALUES
    (UUID(), 'Pradhan Mantri Kisan Samman Nidhi', 'Income support scheme for farmers', '["All landholding farmers"]', '["₹6000 annual direct income support"]', 'Apply through nearest bank or Common Service Center', 'https://pmkisan.gov.in', 1),
    (UUID(), 'Pradhan Mantri Fasal Bima Yojana', 'Crop insurance scheme for farmers', '["Farmers with registered crops"]', '["Yield loss coverage up to 72%"]', 'Contact nearest insurance agent or bank', 'https://pmfby.gov.in', 1),
    (UUID(), 'Kisan Credit Card', 'Credit facility for farming needs', '["All farmers"]', '["Short-term credit at subsidized rates"]', 'Apply at any nationalized bank', 'https://www.nabard.org', 1)
  `);
  console.log('✅ Government schemes seeded');
}

// Seed crop_master if table is empty
const [cropCount] = await connection.query('SELECT COUNT(*) as cnt FROM crop_master');
if (cropCount[0].cnt === 0) {
  console.log('\n🌱 Seeding crop_master...');
  await connection.query(`
    INSERT INTO crop_master (id, name, scientific_name, water_requirement, growing_season, soil_preference, description) VALUES
    (UUID(), 'Wheat',      'Triticum aestivum',      'Medium (450-650mm)',  'Rabi (Oct-Mar)',   'Loamy, Clay-loam',    'Major cereal crop grown in winter season'),
    (UUID(), 'Rice',       'Oryza sativa',           'High (1200-1600mm)', 'Kharif (Jun-Nov)', 'Clay, Silty-clay',    'Staple food crop requiring standing water'),
    (UUID(), 'Maize',      'Zea mays',               'Medium (500-800mm)', 'Kharif/Rabi',      'Sandy-loam, Loamy',   'Versatile cereal used for food, feed, starch'),
    (UUID(), 'Sugarcane',  'Saccharum officinarum',  'High (1500-2500mm)', 'Annual (Feb-Mar)', 'Loamy, Clay-loam',    'Cash crop for sugar and jaggery production'),
    (UUID(), 'Cotton',     'Gossypium hirsutum',     'Medium (700-1200mm)','Kharif (Apr-Nov)', 'Black cotton soil',   'Fiber crop; requires well-drained fertile soil'),
    (UUID(), 'Soybean',    'Glycine max',            'Medium (600-800mm)', 'Kharif (Jun-Sep)', 'Loamy, Well-drained', 'Oilseed and protein crop'),
    (UUID(), 'Groundnut',  'Arachis hypogaea',       'Medium (500-700mm)', 'Kharif (Jun-Oct)', 'Sandy-loam',          'Oilseed crop; fixes atmospheric nitrogen'),
    (UUID(), 'Mustard',    'Brassica juncea',        'Low (250-500mm)',    'Rabi (Oct-Feb)',   'Loamy, Sandy-loam',   'Important oilseed grown in winter'),
    (UUID(), 'Onion',      'Allium cepa',            'Medium (350-550mm)', 'Rabi/Kharif',      'Sandy-loam, Loamy',   'Major vegetable and export commodity'),
    (UUID(), 'Potato',     'Solanum tuberosum',      'Medium (400-600mm)', 'Rabi (Oct-Feb)',   'Sandy-loam, Loamy',   'Root vegetable; high demand throughout year'),
    (UUID(), 'Tomato',     'Solanum lycopersicum',   'Medium (600-800mm)', 'Year-round',       'Sandy-loam, Loamy',   'High-value vegetable with short crop cycle'),
    (UUID(), 'Gram',       'Cicer arietinum',        'Low (300-450mm)',    'Rabi (Oct-Feb)',   'Sandy-loam, Clay',    'Pulse crop; major protein source'),
    (UUID(), 'Tur',        'Cajanus cajan',          'Low (600-700mm)',    'Kharif (Jun-Nov)', 'Sandy-loam',          'Pigeon pea; drought-tolerant pulse'),
    (UUID(), 'Moong',      'Vigna radiata',          'Low (350-500mm)',    'Kharif/Rabi',      'Sandy-loam',          'Short-duration pulse with high market demand'),
    (UUID(), 'Bajra',      'Pennisetum glaucum',     'Low (200-400mm)',    'Kharif (Jun-Sep)', 'Sandy, Sandy-loam',   'Drought-tolerant millet grown in arid zones'),
    (UUID(), 'Jowar',      'Sorghum bicolor',        'Low (400-600mm)',    'Kharif/Rabi',      'Clayey, Loamy',       'Multi-purpose coarse cereal'),
    (UUID(), 'Sunflower',  'Helianthus annuus',      'Medium (600-1000mm)','Kharif/Rabi',      'Loamy, Sandy-loam',   'Oilseed with relatively short crop cycle'),
    (UUID(), 'Turmeric',   'Curcuma longa',          'High (1500-2000mm)', 'Kharif (Jun-Feb)', 'Loamy, Clay-loam',    'High-value spice crop with long growing period'),
    (UUID(), 'Chilli',     'Capsicum annuum',        'Medium (600-1200mm)','Kharif/Rabi',      'Sandy-loam, Loamy',   'Spice crop with high demand in domestic/export markets'),
    (UUID(), 'Garlic',     'Allium sativum',         'Low (600-700mm)',    'Rabi (Oct-Apr)',   'Loamy, Sandy-loam',   'Spice/condiment crop with price volatility')
  `);
  console.log('✅ Crop master seeded (20 crops)');
}

// Ensure prices_cache alias exists (some controllers reference it as prices_cache)
try {
  await connection.query(`CREATE TABLE IF NOT EXISTS prices_cache LIKE price_cache`);
} catch (_) { /* price_cache might not exist yet or already aliased */ }

await connection.end();
console.log(`\n🎉 Migration complete! ${success} tables verified/created.\n`);

