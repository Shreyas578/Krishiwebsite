-- Blockchain Payments Schema
-- Stores all cryptocurrency transaction records for marketplace orders

-- Main blockchain payments table
CREATE TABLE IF NOT EXISTS blockchain_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  buyer_id VARCHAR(255) NOT NULL,
  seller_id VARCHAR(255) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(20) DEFAULT 'USDC',
  status ENUM('pending', 'completed', 'failed', 'refunded', 'expired') DEFAULT 'pending',
  tx_hash VARCHAR(255),
  block_number INT,
  gas_used VARCHAR(255),
  gas_price VARCHAR(255),
  buyer_wallet_address VARCHAR(255),
  seller_wallet_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  refund_tx_hash VARCHAR(255),
  refund_reason TEXT,
  refunded_at TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_order_id (order_id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status),
  INDEX idx_tx_hash (tx_hash),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment audit log for tracking all transactions
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255),
  block_number INT,
  gas_used VARCHAR(255),
  gas_price VARCHAR(255),
  status VARCHAR(50),
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_tx_hash (tx_hash),
  INDEX idx_status (status),
  FOREIGN KEY (payment_id) REFERENCES blockchain_payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet management table for tracking user crypto wallets
CREATE TABLE IF NOT EXISTS user_wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  wallet_type ENUM('metamask', 'wallet_connect', 'ledger', 'trezor') DEFAULT 'metamask',
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(255),
  verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_user_id (user_id),
  INDEX idx_wallet_address (wallet_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction history for fast queries
CREATE TABLE IF NOT EXISTS transaction_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  tx_type ENUM('send', 'receive', 'escrow', 'refund'),
  tx_hash VARCHAR(255) NOT NULL,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  amount DECIMAL(18, 6),
  currency VARCHAR(20),
  status VARCHAR(50),
  block_number INT,
  gas_used VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_tx_hash (tx_hash),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  raised_by VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('open', 'investigating', 'resolved', 'closed') DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_order_id (order_id),
  INDEX idx_raised_by (raised_by),
  INDEX idx_status (status),
  FOREIGN KEY (payment_id) REFERENCES blockchain_payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Escrow transactions table (for holding funds during disputes)
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  escrow_id VARCHAR(255) UNIQUE NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  buyer_id VARCHAR(255) NOT NULL,
  seller_id VARCHAR(255) NOT NULL,
  arbiter_id VARCHAR(255),
  amount DECIMAL(18, 6),
  currency VARCHAR(20),
  status ENUM('held', 'released_to_seller', 'released_to_buyer', 'disputed') DEFAULT 'held',
  tx_hash VARCHAR(255),
  released_at TIMESTAMP,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  INDEX idx_escrow_id (escrow_id),
  INDEX idx_payment_id (payment_id),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  FOREIGN KEY (payment_id) REFERENCES blockchain_payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add blockchain payment fields to orders table if not exists
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS blockchain_payment_id VARCHAR(255);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'traditional';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blockchain_payments_status_created 
ON blockchain_payments(status, created_at);

CREATE INDEX IF NOT EXISTS idx_blockchain_payments_buyer_seller 
ON blockchain_payments(buyer_id, seller_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_wallets_active 
ON user_wallets(user_id, is_active);

-- View for payment statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed,
  SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunded,
  AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_transaction_value,
  DATE(created_at) as payment_date
FROM blockchain_payments
GROUP BY DATE(created_at);

-- View for user transaction history
CREATE OR REPLACE VIEW user_transaction_summary AS
SELECT 
  user_id,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN tx_type = 'send' THEN amount ELSE 0 END) as total_sent,
  SUM(CASE WHEN tx_type = 'receive' THEN amount ELSE 0 END) as total_received,
  MAX(created_at) as last_transaction_date
FROM transaction_history
WHERE status = 'completed'
GROUP BY user_id;
