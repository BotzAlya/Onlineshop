// Website Auto Payment System - BOY SHOP
// Developer: BOY SHOP | Telegram: @boyjutawan

// Global Variables
let currentUser = null;
let userBalance = 100.00; // Starting balance
let transactions = [];
let selectedService = null;
let paymentTimer = null;
let countdownInterval = null;

// User Database Simulation (Replace with actual backend)
const userDatabase = JSON.parse(localStorage.getItem('boyShopUsers')) || [];
const maxUsers = 1000;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    setupBotResponses();
});

// Authentication Check
function checkAuth() {
    const loggedInUser = localStorage.getItem('boyShopLoggedIn');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
        showDashboard();
    } else {
        showPreLogin();
    }
}

// Show Pre-Login Screen
function showPreLogin() {
    document.getElementById('preLoginContainer').style.display = 'block';
    document.getElementById('postLoginContainer').style.display = 'none';
}

// Show Dashboard
function showDashboard() {
    document.getElementById('preLoginContainer').style.display = 'none';
    document.getElementById('postLoginContainer').style.display = 'block';
    
    if (currentUser) {
        // Update user info
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phone || 'Belum ditetapkan';
        document.getElementById('profileTier').textContent = currentUser.tier || 'Basic';
        document.getElementById('userBalance').textContent = userBalance.toFixed(2);
        
        // Set join date
        if (currentUser.joinDate) {
            document.getElementById('profileJoinDate').textContent = currentUser.joinDate;
        } else {
            const joinDate = new Date().toLocaleDateString('ms-MY');
            currentUser.joinDate = joinDate;
            localStorage.setItem('boyShopLoggedIn', JSON.stringify(currentUser));
            document.getElementById('profileJoinDate').textContent = joinDate;
        }
    }
    
    // Show home section by default
    showSection('home');
}

// Setup Event Listeners
function setupEventListeners() {
    // Pre-Login Events
    document.getElementById('showRegister').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('registerSection').classList.add('active');
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('registerSection').classList.remove('active');
        document.getElementById('loginSection').classList.add('active');
    });
    
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (loginUser(email, password)) {
            alert('Log masuk berjaya!');
            document.getElementById('loginForm').reset();
            showDashboard();
        } else {
            alert('Email atau kata laluan tidak betul!');
        }
    });
    
    // Register Form
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const phone = document.getElementById('regPhone').value;
        
        if (registerUser(email, password, phone)) {
            alert('Pendaftaran berjaya! Kod akan dihantar ke WhatsApp anda.');
            
            // Send WhatsApp message (simulated)
            sendWhatsAppCode(phone, email);
            
            document.getElementById('registerForm').reset();
            document.getElementById('registerSection').classList.remove('active');
            document.getElementById('loginSection').classList.add('active');
        } else {
            alert('Pendaftaran gagal. Email sudah wujud atau kuota penuh.');
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Adakah anda pasti ingin log keluar?')) {
            localStorage.removeItem('boyShopLoggedIn');
            currentUser = null;
            showPreLogin();
        }
    });
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Service Buy Buttons
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', function() {
            const service = this.getAttribute('data-service');
            const price = parseFloat(this.getAttribute('data-price'));
            selectedService = { service, price };
            showPaymentModal(service, price);
        });
    });
    
    // Premium Buttons
    document.querySelectorAll('.btn-premium').forEach(btn => {
        btn.addEventListener('click', function() {
            const tier = this.getAttribute('data-tier');
            const price = parseFloat(this.getAttribute('data-price'));
            selectedService = { service: 'premium_' + tier, price };
            showPaymentModal('Premium ' + tier.toUpperCase(), price);
        });
    });
    
    // Top Up Button
    document.getElementById('topupBtn').addEventListener('click', function() {
        const amount = parseFloat(document.getElementById('topupAmount').value);
        if (amount >= 10 && amount <= 1000) {
            simulateTopUp(amount);
        } else {
            alert('Sila masukkan jumlah antara RM10 hingga RM1000');
        }
    });
    
    // Profile Form
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const phone = document.getElementById('editPhone').value;
        if (phone) {
            currentUser.phone = phone;
            localStorage.setItem('boyShopLoggedIn', JSON.stringify(currentUser));
            document.getElementById('profilePhone').textContent = phone;
            alert('Nombor telefon berjaya dikemaskini!');
        }
    });
    
    // Password Form
    document.getElementById('passwordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        
        if (currentPass && newPass) {
            alert('Kata laluan berjaya diubah!');
            document.getElementById('passwordForm').reset();
        }
    });
    
    // Payment Modal
    document.getElementById('confirmPayment').addEventListener('click', function() {
        processPayment();
    });
    
    document.querySelector('.close-modal').addEventListener('click', function() {
        closePaymentModal();
    });
    
    // Success Modal
    document.getElementById('closeSuccess').addEventListener('click', function() {
        closeSuccessModal();
    });
    
    // Bot Help
    document.getElementById('askBot').addEventListener('click', function() {
        askBot();
    });
    
    document.getElementById('userQuestion').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            askBot();
        }
    });
    
    // Theme Selector
    document.getElementById('themeSelect').addEventListener('change', function() {
        changeTheme(this.value);
    });
}

// Show Section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId + 'Section').classList.add('active');
}

// User Login
function loginUser(email, password) {
    const user = userDatabase.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('boyShopLoggedIn', JSON.stringify(user));
        return true;
    }
    return false;
}

// User Registration
function registerUser(email, password, phone) {
    // Check if user limit reached
    if (userDatabase.length >= maxUsers) {
        alert('Maaf, kuota 1000 pengguna sudah penuh!');
        return false;
    }
    
    // Check if email exists
    if (userDatabase.some(u => u.email === email)) {
        alert('Email ini sudah didaftarkan!');
        return false;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        email: email,
        password: password,
        phone: phone,
        tier: 'basic',
        joinDate: new Date().toLocaleDateString('ms-MY'),
        balance: 100.00
    };
    
    userDatabase.push(newUser);
    localStorage.setItem('boyShopUsers', JSON.stringify(userDatabase));
    
    return true;
}

// Send WhatsApp Code (Simulated)
function sendWhatsAppCode(phone, email) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log('WhatsApp Code Simulation:');
    console.log('Kepada: ' + phone);
    console.log('Dari: BOYSUPPORT');
    console.log('Mesej: Kod pendaftaran anda: ' + code);
    console.log('Untuk email: ' + email);
    console.log('----------------------------------');
    
    // In real implementation, integrate with WhatsApp API
    alert('Kod pendaftaran telah dihantar ke WhatsApp: ' + phone);
}

// Show Payment Modal
function showPaymentModal(service, price) {
    document.getElementById('paymentDescription').textContent = 'Membeli: ' + service;
    document.getElementById('paymentAmount').textContent = price;
    
    // Update QR code with amount
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TOUCHNGO_PAYMENT_NGO:100807472080_AMOUNT:${price}_SERVICE:${service}`;
    document.getElementById('modalQr').src = qrUrl;
    
    document.getElementById('paymentModal').style.display = 'block';
    
    // Start countdown
    let countdown = 10;
    document.getElementById('countdown').textContent = countdown;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        countdown--;
        document.getElementById('countdown').textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            processPayment();
        }
    }, 1000);
}

// Close Payment Modal
function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);
    selectedService = null;
}

// Process Payment
function processPayment() {
    if (!selectedService) return;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Check balance
    if (userBalance < selectedService.price) {
        alert('Baki tidak mencukupi. Sila top up terlebih dahulu.');
        closePaymentModal();
        showSection('payment');
        return;
    }
    
    // Deduct balance
    userBalance -= selectedService.price;
    document.getElementById('userBalance').textContent = userBalance.toFixed(2);
    
    // Record transaction
    const transaction = {
        id: Date.now(),
        service: selectedService.service,
        amount: selectedService.price,
        date: new Date().toLocaleString('ms-MY'),
        status: 'completed'
    };
    
    transactions.push(transaction);
    
    // Update recent transaction
    document.getElementById('recentTransaction').textContent = 
        selectedService.service + ' - RM' + selectedService.price;
    
    // Show success message
    let successMessage = '';
    if (selectedService.service.includes('premium')) {
        const tier = selectedService.service.split('_')[1];
        currentUser.tier = tier;
        localStorage.setItem('boyShopLoggedIn', JSON.stringify(currentUser));
        document.getElementById('premiumStatus').textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
        document.getElementById('profileTier').textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
        successMessage = 'Tahniah! Anda sekarang ahli ' + tier.toUpperCase() + '!';
    } else {
        successMessage = 'Service ' + selectedService.service + ' berjaya dibeli!';
    }
    
    document.getElementById('successMessage').textContent = successMessage;
    
    // Close payment modal and show success
    closePaymentModal();
    document.getElementById('successModal').style.display = 'block';
    
    // Send WhatsApp notification (simulated)
    if (currentUser.phone) {
        console.log('WhatsApp Notification:');
        console.log('Kepada: ' + currentUser.phone);
        console.log('Dari: BOYSUPPORT');
        console.log('Mesej: Pembelian ' + selectedService.service + ' berjaya! RM' + selectedService.price + ' telah didebit.');
        console.log('----------------------------------');
    }
    
    selectedService = null;
}

// Close Success Modal
function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Simulate Top Up
function simulateTopUp(amount) {
    userBalance += amount;
    document.getElementById('userBalance').textContent = userBalance.toFixed(2);
    
    // Simulate Touch 'n Go payment
    alert('Bayaran RM' + amount + ' berjaya! Baki telah dikemaskini.');
    
    // Record transaction
    transactions.push({
        id: Date.now(),
        service: 'topup',
        amount: amount,
        date: new Date().toLocaleString('ms-MY'),
        status: 'completed'
    });
}

// Setup Bot Responses
function setupBotResponses() {
    window.botResponses = [
        { keywords: ['hello', 'hi', 'hai'], response: 'Hello! Saya SupportBoy. Ada apa yang boleh saya bantu?' },
        { keywords: ['payment', 'bayar', 'pembayaran'], response: 'Sistem Auto Payment kami menggunakan Touch \'n Go eWallet. Pembayaran akan auto debit dari eWallet anda.' },
        { keywords: ['service', 'servis', 'perkhidmatan'], response: 'Kami menawarkan: UNBANNED WHATSAPP (RM20) dan NOMBOR WHATSAPP MALAYSIA (RM15).' },
        { keywords: ['premium', 'ahli', 'keahlian'], response: 'Premium membership: Basic (RM20), Premium (RM35), VIP (RM45). Setiap tier ada kelebihan berbeza.' },
        { keywords: ['error', 'masalah', 'bug'], response: 'Sila pastikan anda menggunakan browser terkini. Jika masalah berterusan, hubungi WhatsApp: BOYSUPPORT.' },
        { keywords: ['contact', 'hubungi', 'whatsapp'], response: 'WhatsApp Support: BOYSUPPORT\nEmail: KECHIXXDARWISH@GMAIL.COM\nTelefon: 01135041561' },
        { keywords: ['balance', 'baki', 'duit'], response: 'Anda boleh lihat baki di dashboard utama. Untuk top up, pergi ke bahagian Payment.' },
        { keywords: ['auto', 'autopay', 'autodebit'], response: 'Auto Payment akan debit automatik dari eWallet anda. Anda boleh hidup/matikan di Settings > Payment.' },
        { keywords: ['qr', 'code', 'scan'], response: 'QR code untuk bayaran NGO: 100807472080. Imbas dengan Touch \'n Go eWallet.' },
        { keywords: ['developer', 'pembangun', 'boy'], response: 'Developer: BOY SHOP\nTelegram: @boyjutawan\nEmail: KECHIXXDARWISH@GMAIL.COM' }
    ];
}

// Ask Bot
function askBot() {
    const question = document.getElementById('userQuestion').value.trim();
    if (!question) return;
    
    // Add user message
    const messagesDiv = document.getElementById('botMessages');
    const userMsg = document.createElement('div');
    userMsg.className = 'bot-message';
    userMsg.innerHTML = `<p><strong>Anda:</strong> ${question}</p>`;
    messagesDiv.appendChild(userMsg);
    
    // Find response
    let response = 'Maaf, saya tidak faham soalan anda. Cuba tanya soalan lain atau hubungi WhatsApp: BOYSUPPORT.';
    
    for (const botResponse of window.botResponses) {
        if (botResponse.keywords.some(keyword => 
            question.toLowerCase().includes(keyword.toLowerCase()))) {
            response = botResponse.response;
            break;
        }
    }
    
    // Add bot response
    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'bot-message';
        botMsg.innerHTML = `<p><strong>SUPPORTBOY:</strong> ${response}</p>`;
        messagesDiv.appendChild(botMsg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 500);
    
    // Clear input
    document.getElementById('userQuestion').value = '';
}

// Change Theme
function changeTheme(theme) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('theme-light', 'theme-dark', 'theme-anime');
    
    // Add selected theme
    body.classList.add('theme-' + theme);
    
    // Update background for anime theme
    if (theme === 'anime') {
        body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else if (theme === 'light') {
        body.style.background = '#f5f5f5';
    } else {
        body.style.background = '#1a1a2e';
    }
}

// Auto Payment Simulation
function simulateAutoPayment() {
    // This would integrate with actual Touch 'n Go API
    console.log('Auto Payment System: Connected to Touch \'n Go eWallet');
    console.log('NGO Account: 100807472080');
    console.log('Ready for auto debit transactions...');
}

// Initialize auto payment
simulateAutoPayment();

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'd') {
        // Developer mode shortcut
        console.log('Developer Mode Activated');
        console.log('Current User:', currentUser);
        console.log('User Balance:', userBalance);
        console.log('Transactions:', transactions);
    }
});

// Prevent form submission on Enter for certain inputs
document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"]').forEach(input => {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.type !== 'text') {
            e.preventDefault();
        }
    });
});