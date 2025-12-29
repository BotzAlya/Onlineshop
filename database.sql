-- BOY SHOP Auto Payment System Database
-- Created by: BOY SHOP | Telegram: @boyjutawan

CREATE DATABASE IF NOT EXISTS boyshop_db;
USE boyshop_db;

-- Users table (1000 users maximum)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    tier ENUM('basic', 'premium', 'vip') DEFAULT 'basic',
    balance DECIMAL(10,2) DEFAULT 100.00,
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'touchngo',
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Services table
CREATE TABLE services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default services
INSERT INTO services (name, price, description, category) VALUES
('UNBANNED WHATSAPP', 20.00, 'Buka sekatan akaun WhatsApp', 'whatsapp'),
('NOMBOR WHATSAPP MALAYSIA', 15.00, 'Nombor WhatsApp Malaysia aktif', 'whatsapp');

-- Premium packages
INSERT INTO services (name, price, description, category) VALUES
('Premium Basic', 20.00, 'Basic membership package', 'premium'),
('Premium Standard', 35.00, 'Standard membership package', 'premium'),
('Premium VIP', 45.00, 'VIP membership package', 'premium');

-- Payment logs table
CREATE TABLE payment_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    amount DECIMAL(10,2),
    service VARCHAR(100),
    status VARCHAR(50),
    response_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- WhatsApp codes table
CREATE TABLE whatsapp_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    email VARCHAR(255),
    is_used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_code (phone, code),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User settings table
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    auto_payment BOOLEAN DEFAULT TRUE,
    notifications BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'dark',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create triggers for user limit
DELIMITER $$

CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE user_count INT;
    SELECT COUNT(*) INTO user_count FROM users;
    IF user_count >= 1000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Maximum user limit (1000) reached';
    END IF;
END$$

DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at);
CREATE INDEX idx_services_category ON services(category, is_active);

-- Insert default admin contact
INSERT INTO users (email, password, phone, tier, balance) VALUES
('KECHIXXDARWISH@GMAIL.COM', '$2y$10$YourHashedPasswordHere', '01135041561', 'vip', 10000.00);

-- Create view for user dashboard
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.phone,
    u.tier,
    u.balance,
    u.join_date,
    COUNT(t.id) as total_transactions,
    SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END) as total_spent,
    MAX(t.created_at) as last_transaction
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id;

-- Stored procedure for processing payment
DELIMITER $$

CREATE PROCEDURE ProcessAutoPayment(
    IN p_user_id INT,
    IN p_service_name VARCHAR(100),
    IN p_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_balance DECIMAL(10,2);
    DECLARE v_user_tier VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'ERROR' as status, 'Transaction failed' as message;
    END;
    
    START TRANSACTION;
    
    -- Get user balance and tier
    SELECT balance, tier INTO v_balance, v_user_tier 
    FROM users WHERE id = p_user_id FOR UPDATE;
    
    -- Check balance
    IF v_balance < p_amount THEN
        ROLLBACK;
        SELECT 'ERROR' as status, 'Insufficient balance' as message;
    ELSE
        -- Deduct balance
        UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;
        
        -- Record transaction
        INSERT INTO transactions (user_id, service, amount, status)
        VALUES (p_user_id, p_service_name, p_amount, 'completed');
        
        -- Update tier if premium purchase
        IF p_service_name LIKE 'premium_%' THEN
            SET v_user_tier = REPLACE(p_service_name, 'premium_', '');
            UPDATE users SET tier = v_user_tier WHERE id = p_user_id;
        END IF;
        
        COMMIT;
        
        -- Return success
        SELECT 'SUCCESS' as status, 'Payment processed' as message, 
               (v_balance - p_amount) as new_balance, v_user_tier as new_tier;
    END IF;
END$$

DELIMITER ;