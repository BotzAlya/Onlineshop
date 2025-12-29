<?php
// BOY SHOP Auto Payment System Backend
// Note: This is a basic example. Implement proper security in production.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$host = 'localhost';
$dbname = 'boyshop_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Handle different API endpoints
$action = $_GET['action'] ?? '';

switch($action) {
    case 'register':
        handleRegister($pdo);
        break;
    case 'login':
        handleLogin($pdo);
        break;
    case 'process_payment':
        handlePayment($pdo);
        break;
    case 'update_profile':
        handleProfileUpdate($pdo);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
}

function handleRegister($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $password = password_hash($data['password'] ?? '', PASSWORD_DEFAULT);
    $phone = filter_var($data['phone'] ?? '', FILTER_SANITIZE_STRING);
    
    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Email already registered']);
        return;
    }
    
    // Check user limit (1000 users)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($count >= 1000) {
        echo json_encode(['status' => 'error', 'message' => 'User limit reached']);
        return;
    }
    
    // Insert new user
    $stmt = $pdo->prepare("INSERT INTO users (email, password, phone, tier, balance, join_date) 
                          VALUES (?, ?, ?, 'basic', 100.00, NOW())");
    
    if ($stmt->execute([$email, $password, $phone])) {
        // Send WhatsApp code (simulated)
        $code = generateCode();
        logWhatsAppCode($phone, $code);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Registration successful. Code sent to WhatsApp.',
            'code' => $code // Only for demo, remove in production
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Registration failed']);
    }
}

function handleLogin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $password = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']); // Remove password from response
        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'user' => $user
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
    }
}

function handlePayment($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $userId = filter_var($data['user_id'] ?? 0, FILTER_VALIDATE_INT);
    $amount = filter_var($data['amount'] ?? 0, FILTER_VALIDATE_FLOAT);
    $service = filter_var($data['service'] ?? '', FILTER_SANITIZE_STRING);
    
    if ($userId <= 0 || $amount <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid payment data']);
        return;
    }
    
    // Check user balance
    $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        return;
    }
    
    if ($user['balance'] < $amount) {
        echo json_encode(['status' => 'error', 'message' => 'Insufficient balance']);
        return;
    }
    
    // Process payment (simulate Touch 'n Go integration)
    try {
        $pdo->beginTransaction();
        
        // Deduct balance
        $stmt = $pdo->prepare("UPDATE users SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $userId]);
        
        // Record transaction
        $stmt = $pdo->prepare("INSERT INTO transactions (user_id, service, amount, status, created_at) 
                              VALUES (?, ?, ?, 'completed', NOW())");
        $stmt->execute([$userId, $service, $amount]);
        
        // Update tier if premium purchase
        if (strpos($service, 'premium') !== false) {
            $tier = str_replace('premium_', '', $service);
            $stmt = $pdo->prepare("UPDATE users SET tier = ? WHERE id = ?");
            $stmt->execute([$tier, $userId]);
        }
        
        $pdo->commit();
        
        // Simulate WhatsApp notification
        $stmt = $pdo->prepare("SELECT phone FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userPhone = $stmt->fetchColumn();
        
        if ($userPhone) {
            logPaymentNotification($userPhone, $service, $amount);
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Payment processed successfully',
            'new_balance' => $user['balance'] - $amount
        ]);
        
    } catch(Exception $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => 'Payment failed: ' . $e->getMessage()]);
    }
}

function handleProfileUpdate($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $userId = filter_var($data['user_id'] ?? 0, FILTER_VALIDATE_INT);
    $phone = filter_var($data['phone'] ?? '', FILTER_SANITIZE_STRING);
    
    if ($userId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid user']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE users SET phone = ? WHERE id = ?");
    
    if ($stmt->execute([$phone, $userId])) {
        echo json_encode(['status' => 'success', 'message' => 'Profile updated']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Update failed']);
    }
}

function generateCode() {
    return strtoupper(bin2hex(random_bytes(3)));
}

function logWhatsAppCode($phone, $code) {
    // In production, integrate with WhatsApp API
    $log = date('Y-m-d H:i:s') . " | To: $phone | Code: $code\n";
    file_put_contents('whatsapp_log.txt', $log, FILE_APPEND);
}

function logPaymentNotification($phone, $service, $amount) {
    $log = date('Y-m-d H:i:s') . " | To: $phone | Service: $service | Amount: RM$amount\n";
    file_put_contents('payment_log.txt', $log, FILE_APPEND);
}
?>