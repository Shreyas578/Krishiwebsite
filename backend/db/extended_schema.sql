-- =====================================================================
-- KISAN AI EXTENDED DATABASE SCHEMA - COMPLETE
-- Based on Master Prompt v3.0
-- =====================================================================

-- =====================================================================
-- ALTER EXISTING USERS TABLE (if columns don't exist, they'll be added)
-- =====================================================================

ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'hi';
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN registration_complete BOOLEAN DEFAULT false;

-- =====================================================================
-- FARM PROFILES (New - Core to entire app)
-- =====================================================================

CREATE TABLE IF NOT EXISTS farm_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    
    -- Location (drives: weather, mandi, news, schemes)
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    village VARCHAR(100),
    tehsil VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(50),
    pin_code VARCHAR(6),
    
    -- Land details (drives: report, crop advice, irrigation tips)
    land_acres DECIMAL(10,2),
    num_plots INTEGER DEFAULT 1,
    soil_type VARCHAR(50),
    water_source VARCHAR(50),
    irrigation_type VARCHAR(50),
    topography VARCHAR(50),
    equipment VARCHAR(100),
    has_storage BOOLEAN DEFAULT false,
    
    -- Derived data
    nearest_mandis JSON,
    applicable_schemes JSON,
    
    -- Preferences
    budget_range VARCHAR(50),
    market_preference VARCHAR(50),
    risk_appetite VARCHAR(20) DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_district_state (district, state),
    INDEX idx_location (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- FARM CROPS (New - Tracks crops per user)
-- =====================================================================

CREATE TABLE IF NOT EXISTS farm_crops (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    farm_id VARCHAR(36) NOT NULL,
    
    -- Crop details
    crop_name VARCHAR(100),
    is_decided BOOLEAN DEFAULT true,
    seed_variety VARCHAR(100),
    sowing_date DATE,
    expected_harvest_start DATE,
    expected_harvest_end DATE,
    previous_crop VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farm_profiles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_farm_id (farm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- FARM REPORTS (New - AI-generated reports)
-- =====================================================================

CREATE TABLE IF NOT EXISTS farm_reports (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    farm_id VARCHAR(36) NOT NULL,
    crop_id VARCHAR(36),
    
    report_type VARCHAR(30), -- '365_day_plan' or 'crop_recommendation'
    report_data LONGTEXT,  -- JSON containing full report
    pdf_url VARCHAR(255),
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farm_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES farm_crops(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_farm_id (farm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PRICE ALERTS (New - User-set alerts)
-- =====================================================================

CREATE TABLE IF NOT EXISTS price_alerts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    
    commodity VARCHAR(100),
    state VARCHAR(50),
    target_price DECIMAL(10,2),
    condition VARCHAR(10), -- 'above' | 'below'
    
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_commodity_state (commodity, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PRICE HISTORY CACHE (New - Market data)
-- =====================================================================

CREATE TABLE IF NOT EXISTS price_history (
    id VARCHAR(36) PRIMARY KEY,
    
    commodity VARCHAR(100),
    state VARCHAR(50),
    mandi VARCHAR(100),
    
    min_price DECIMAL(10,2),
    modal_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    recorded_date DATE,
    source VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_commodity_state (commodity, state),
    INDEX idx_mandi (mandi),
    INDEX idx_recorded_date (recorded_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- NEWS CACHE (New - Articles)
-- =====================================================================

CREATE TABLE IF NOT EXISTS news_cache (
    id VARCHAR(36) PRIMARY KEY,
    
    title TEXT,
    summary TEXT,
    url TEXT,
    
    commodity_tags JSON,
    sentiment_score DECIMAL(3,2),
    
    published_at TIMESTAMP,
    source VARCHAR(100),
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_commodity (commodity_tags),
    INDEX idx_cached_at (cached_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- WEATHER CACHE (New - Caching weather API responses)
-- =====================================================================

CREATE TABLE IF NOT EXISTS weather_cache (
    id VARCHAR(36) PRIMARY KEY,
    
    user_id VARCHAR(36),
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    
    weather_data LONGTEXT, -- JSON: current + forecast
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_location (lat, lng),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- MARKETPLACE TRANSACTIONS (For blockchain reference)
-- =====================================================================

CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id VARCHAR(36) PRIMARY KEY,
    
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36),
    
    transaction_hash VARCHAR(66), -- Ethereum tx hash
    blockchain_confirmed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_blockchain_confirmed (blockchain_confirmed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SYNC LOGS (For offline sync tracking)
-- =====================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50), -- 'price_alert', 'listing_created', etc
    data_json LONGTEXT,
    
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_synced (synced),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- DISEASE DETECTIONS (Track detections over time)
-- =====================================================================

CREATE TABLE IF NOT EXISTS disease_detections (
    id VARCHAR(36) PRIMARY KEY,
    
    user_id VARCHAR(36) NOT NULL,
    farm_id VARCHAR(36) NOT NULL,
    crop_id VARCHAR(36),
    
    disease_name VARCHAR(100),
    confidence DECIMAL(3,2),
    severity VARCHAR(20), -- LOW, MODERATE, HIGH, CRITICAL
    image_url VARCHAR(255),
    
    treatment_suggested TEXT,
    organic_treatment TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farm_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_id) REFERENCES farm_crops(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
