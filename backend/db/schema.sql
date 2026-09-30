-- =====================================================================
-- KISAN AI DATABASE SCHEMA - CLEAN VERSION
-- =====================================================================
-- Drop tables if they exist (for development, use with caution in production)
-- Drop in reverse dependency order to avoid foreign key errors
DROP TABLE IF EXISTS blockchain_logs;
DROP TABLE IF EXISTS pending_actions;
DROP TABLE IF EXISTS listing_cache;
DROP TABLE IF EXISTS chat;
DROP TABLE IF EXISTS disease_history;
DROP TABLE IF EXISTS ndvi_records;
DROP TABLE IF EXISTS price_forecast;
DROP TABLE IF EXISTS demand_score;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS news_cache;
DROP TABLE IF EXISTS weather_cache;
DROP TABLE IF EXISTS price_cache;
DROP TABLE IF EXISTS input_usage;
DROP TABLE IF EXISTS input_purchases;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS farmer_inputs;
DROP TABLE IF EXISTS farm_reports;
DROP TABLE IF EXISTS farm_crops;
DROP TABLE IF EXISTS crops;
DROP TABLE IF EXISTS marketplace_orders;
DROP TABLE IF EXISTS marketplace_listings;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS government_schemes;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS farm_profiles;
DROP TABLE IF EXISTS buyer_profiles;
DROP TABLE IF EXISTS seller_profiles;
DROP TABLE IF EXISTS supplier_profiles;
DROP TABLE IF EXISTS farmer_profiles;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS crop_master;

-- =====================================================================
-- AUTHENTICATION & USER MANAGEMENT
-- =====================================================================

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    phone VARCHAR(15) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'supplier', 'buyer') NOT NULL,
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- FARM PROFILE & CROP MANAGEMENT
-- =====================================================================

CREATE TABLE farm_profiles (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE farmer_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    land_area_acres DECIMAL(5,2),
    soil_type VARCHAR(50),
    water_source VARCHAR(50),
    village VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE farm_crops (
    id VARCHAR(36) PRIMARY KEY,
    farm_profile_id VARCHAR(36) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    sowing_date DATE,
    expected_harvest DATE,
    area_acres DECIMAL(10,2),
    growth_stage ENUM('Planning', 'Sowing', 'Germination', 'Vegetative', 'Flowering', 'Fruit Development', 'Harvest', 'Post-Harvest') DEFAULT 'Planning',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_profile_id) REFERENCES farm_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE crops (
    id VARCHAR(36) PRIMARY KEY,
    farmer_profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    area_acres DECIMAL(5,2),
    sowing_date DATE,
    growth_stage ENUM('Sowing', 'Germination', 'Vegetative', 'Flowering', 'Harvest') DEFAULT 'Sowing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_profile_id) REFERENCES farmer_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- FARM REPORTS & PLANNING
-- =====================================================================

CREATE TABLE farm_reports (
    id VARCHAR(36) PRIMARY KEY,
    farm_profile_id VARCHAR(36) NOT NULL,
    report_type VARCHAR(20),
    report_data LONGTEXT,
    pdf_url VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_profile_id) REFERENCES farm_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- INPUT MANAGEMENT (Fertilizers, Seeds, Pesticides)
-- =====================================================================

CREATE TABLE farmer_inputs (
    id VARCHAR(36) PRIMARY KEY,
    farmer_id VARCHAR(36) NOT NULL,
    input_type ENUM('Fertilizer', 'Seed', 'Pesticide', 'Equipment') NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity_unit VARCHAR(50),
    total_quantity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE input_purchases (
    id VARCHAR(36) PRIMARY KEY,
    farmer_id VARCHAR(36) NOT NULL,
    purchase_date DATE NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    vendor_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_items (
    id VARCHAR(36) PRIMARY KEY,
    purchase_id VARCHAR(36) NOT NULL,
    input_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES input_purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (input_id) REFERENCES farmer_inputs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE input_usage (
    id VARCHAR(36) PRIMARY KEY,
    farmer_id VARCHAR(36) NOT NULL,
    input_id VARCHAR(36) NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    usage_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (input_id) REFERENCES farmer_inputs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- ORDERS MANAGEMENT
-- =====================================================================

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50),
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address JSON,
    payment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- MARKETPLACE
-- =====================================================================

CREATE TABLE marketplace_listings (
    id VARCHAR(36) PRIMARY KEY,
    seller_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE marketplace_orders (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- GOVERNMENT SCHEMES
-- =====================================================================

CREATE TABLE government_schemes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    type VARCHAR(50),
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- DISEASE DETECTION & MONITORING
-- =====================================================================

CREATE TABLE disease_history (
    id VARCHAR(36) PRIMARY KEY,
    farmer_profile_id VARCHAR(36) NOT NULL,
    image_url VARCHAR(512),
    crop_name VARCHAR(100),
    disease_detected VARCHAR(100),
    confidence INT,
    severity ENUM('mild', 'moderate', 'severe', 'healthy'),
    advice TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_profile_id) REFERENCES farmer_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- CACHING & MONITORING TABLES
-- =====================================================================

CREATE TABLE weather_cache (
    id VARCHAR(36) PRIMARY KEY,
    lat_lng_key VARCHAR(100) NOT NULL UNIQUE,
    temperature DECIMAL(5,2),
    feels_like DECIMAL(5,2),
    humidity INT,
    description VARCHAR(255),
    wind_speed DECIMAL(5,2),
    uvi INT,
    visibility INT,
    sunrise TIMESTAMP,
    sunset TIMESTAMP,
    advice JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_cache (
    id VARCHAR(36) PRIMARY KEY,
    commodity_state_key VARCHAR(100) NOT NULL UNIQUE,
    commodity VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    market_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_history (
    id VARCHAR(36) PRIMARY KEY,
    commodity VARCHAR(100),
    state VARCHAR(50),
    mandi VARCHAR(100),
    min_price DECIMAL(10,2),
    modal_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    recorded_date DATE,
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_forecast (
    id VARCHAR(36) PRIMARY KEY,
    commodity VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    forecast_days INT,
    predicted_price DECIMAL(10,2),
    confidence INT,
    trend VARCHAR(20),
    key_factors TEXT,
    best_sell_start DATE,
    best_sell_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE KEY unique_forecast (commodity, state, forecast_days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE demand_score (
    id VARCHAR(36) PRIMARY KEY,
    commodity VARCHAR(100) NOT NULL,
    month INT NOT NULL,
    demand_score INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_demand (commodity, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_alerts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    commodity VARCHAR(100),
    state VARCHAR(50),
    target_price DECIMAL(10,2),
    condition VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE news_cache (
    id VARCHAR(36) PRIMARY KEY,
    title TEXT,
    summary TEXT,
    url TEXT,
    commodity_tags VARCHAR(255),
    sentiment_score DECIMAL(3,2),
    published_at TIMESTAMP,
    source VARCHAR(100),
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- ADDITIONAL TABLES
-- =====================================================================

CREATE TABLE chat (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ndvi_records (
    id VARCHAR(36) PRIMARY KEY,
    farmer_profile_id VARCHAR(36) NOT NULL,
    polygon JSON NOT NULL,
    ndvi_value DECIMAL(3,2),
    ndvi_category ENUM('Poor', 'Fair', 'Good', 'Excellent'),
    satellite_date DATE,
    interpretation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_profile_id) REFERENCES farm_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE listing_cache (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL UNIQUE,
    title VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    category VARCHAR(100),
    condition VARCHAR(50),
    location JSON,
    images JSON,
    ndvi_score DECIMAL(3,2),
    disease_clear BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pending_actions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    payload JSON,
    headers JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INT DEFAULT 0,
    last_error TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE blockchain_logs (
    id VARCHAR(36) PRIMARY KEY,
    transaction_type ENUM('Listing', 'Order') NOT NULL,
    transaction_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    contract_address VARCHAR(42),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- CROP MASTER DATA
-- =====================================================================

CREATE TABLE crop_master (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    scientific_name VARCHAR(100),
    water_requirement VARCHAR(50),
    growing_season VARCHAR(50),
    soil_preference VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_farm_profiles_user_id ON farm_profiles(user_id);
CREATE INDEX idx_farmer_profiles_user_id ON farmer_profiles(user_id);
CREATE INDEX idx_farm_crops_farm_profile_id ON farm_crops(farm_profile_id);
CREATE INDEX idx_crops_farmer_profile_id ON crops(farmer_profile_id);
CREATE INDEX idx_farmer_inputs_farmer_id ON farmer_inputs(farmer_id);
CREATE INDEX idx_input_purchases_farmer_id ON input_purchases(farmer_id);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_input_usage_farmer_id ON input_usage(farmer_id);
CREATE INDEX idx_input_usage_input_id ON input_usage(input_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_orders_listing_id ON marketplace_orders(listing_id);
CREATE INDEX idx_marketplace_orders_buyer_id ON marketplace_orders(buyer_id);
CREATE INDEX idx_marketplace_orders_seller_id ON marketplace_orders(seller_id);
CREATE INDEX idx_government_schemes_active ON government_schemes(is_active);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_weather_cache_lat_lng_key ON weather_cache(lat_lng_key);
CREATE INDEX idx_price_cache_commodity_state_key ON price_cache(commodity_state_key);
CREATE INDEX idx_price_history_commodity_state ON price_history(commodity, state);
CREATE INDEX idx_price_forecast_commodity_state ON price_forecast(commodity, state);
CREATE INDEX idx_demand_score_commodity ON demand_score(commodity);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_news_cache_commodity ON news_cache(commodity_tags);
CREATE INDEX idx_chat_user_id ON chat(user_id);
CREATE INDEX idx_ndvi_records_farmer_profile_id ON ndvi_records(farmer_profile_id);
CREATE INDEX idx_listing_cache_listing_id ON listing_cache(listing_id);
CREATE INDEX idx_pending_actions_user_id ON pending_actions(user_id);
CREATE INDEX idx_blockchain_logs_user_id ON blockchain_logs(user_id);
CREATE INDEX idx_crop_master_name ON crop_master(name);
CREATE INDEX idx_disease_history_farmer_profile_id ON disease_history(farmer_profile_id);

-- =====================================================================
-- INSERT SAMPLE DATA
-- =====================================================================

-- Insert crop master data
INSERT INTO crop_master (id, name, scientific_name, water_requirement, growing_season, soil_preference) VALUES
(UUID(), 'Wheat', 'Triticum aestivum', 'Medium', 'Oct-Mar', 'Loamy'),
(UUID(), 'Rice', 'Oryza sativa', 'High', 'Jun-Sep', 'Clay'),
(UUID(), 'Maize', 'Zea mays', 'Medium', 'Jun-Sep', 'Loamy'),
(UUID(), 'Cotton', 'Gossypium spp.', 'Medium', 'May-Oct', 'Black'),
(UUID(), 'Sugarcane', 'Saccharum officinarum', 'High', 'Oct-Sep', 'Loamy'),
(UUID(), 'Groundnut', 'Arachis hypogaea', 'Low', 'Jun-Sep', 'Sandy'),
(UUID(), 'Soybean', 'Glycine max', 'Medium', 'Jun-Oct', 'Loamy'),
(UUID(), 'Tomato', 'Solanum lycopersicum', 'Medium', 'Year-round', 'Loamy'),
(UUID(), 'Potato', 'Solanum tuberosum', 'Medium', 'Oct-Mar', 'Loamy'),
(UUID(), 'Onion', 'Allium cepa', 'Low', 'Oct-Mar', 'Loamy'),
(UUID(), 'Garlic', 'Allium sativum', 'Low', 'Oct-Mar', 'Loamy'),
(UUID(), 'Chilli', 'Capsicum annuum', 'Medium', 'Jun-Dec', 'Loamy'),
(UUID(), 'Turmeric', 'Curcuma longa', 'Medium', 'May-Jan', 'Loamy'),
(UUID(), 'Ginger', 'Zingiber officinale', 'High', 'May-Dec', 'Loamy'),
(UUID(), 'Coriander', 'Coriandrum sativum', 'Low', 'Oct-Mar', 'Loamy'),
(UUID(), 'Barley', 'Hordeum vulgare', 'Low', 'Oct-Mar', 'Well-drained'),
(UUID(), 'Jowar', 'Sorghum bicolor', 'Low', 'Jun-Sep', 'Any'),
(UUID(), 'Bajra', 'Pennisetum glaucum', 'Low', 'Jun-Sep', 'Sandy'),
(UUID(), 'Lentil', 'Lens culinaris', 'Medium', 'Oct-Mar', 'Loamy'),
(UUID(), 'Chickpea', 'Cicer arietinum', 'Low', 'Oct-Mar', 'Loamy'),
(UUID(), 'Peas', 'Pisum sativum', 'Medium', 'Oct-Mar', 'Loamy'),
(UUID(), 'Mustard', 'Brassica juncea', 'Low', 'Oct-Mar', 'Loamy'),
(UUID(), 'Sunflower', 'Helianthus annuus', 'Low', 'Mar-Jul', 'Well-drained'),
(UUID(), 'Coconut', 'Cocos nucifera', 'High', 'Year-round', 'Sandy'),
(UUID(), 'Arecanut', 'Areca catechu', 'High', 'Year-round', 'Loamy');

-- Insert sample government schemes
INSERT INTO government_schemes (id, name, description, eligibility_criteria, benefits, application_process, website_url, is_active) VALUES
(UUID(), 'Pradhan Mantri Kisan Samman Nidhi', 'Income support for farmers', '["All landholding farmers"]', '["₹6000 annual direct income support"]', 'Apply through nearest bank', 'https://pmkisan.gov.in', TRUE),
(UUID(), 'Pradhan Mantri Fasal Bima Yojana', 'Crop insurance scheme', '["Farmers with registered crops"]', '["Yield loss coverage up to 72%"]', 'Contact nearest insurance agent', 'https://pmfby.gov.in', TRUE);

-- Insert sample price cache data
INSERT INTO price_cache (id, commodity_state_key, commodity, state, market_data, expires_at, created_at) VALUES
(UUID(), 'Wheat_Maharashtra', 'Wheat', 'Maharashtra', '{"markets":[{"name":"Mumbai","min":1800,"modal":2000,"max":2200}]}', DATE_ADD(NOW(), INTERVAL 6 HOUR), NOW()),
(UUID(), 'Rice_Punjab', 'Rice', 'Punjab', '{"markets":[{"name":"Ludhiana","min":2200,"modal":2400,"max":2600}]}', DATE_ADD(NOW(), INTERVAL 6 HOUR), NOW());

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
