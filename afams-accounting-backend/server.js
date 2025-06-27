const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simple in-memory database (for demo purposes)
const DB_FILE = path.join(__dirname, 'users.json');

// Initialize database file if it doesn't exist
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }
}

// Read users from file
function getUsers() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Save users to file
function saveUsers(users) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// Simple JWT token generation (for demo - in production use proper JWT library)
function generateToken(userId) {
    return Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
}

// Verify token
function verifyToken(token) {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        return decoded.userId;
    } catch (error) {
        return null;
    }
}

// Middleware to verify authentication
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }

    const token = authHeader.split(' ')[1];
    const userId = verifyToken(token);
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }

    req.userId = userId;
    next();
}

// Initialize database
initDB();

// Test route
app.get('/', (req, res) => {
  res.send('Backend Afams Mini Accounting Berjalan ✅');
});

// Register endpoint
app.post('/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email dan password harus diisi' 
        });
    }

    if (password.length < 4) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password minimal 4 karakter' 
        });
    }

    const users = getUsers();
    
    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email sudah terdaftar' 
        });
    }

    // Create new user
    const newUser = {
        id: Date.now().toString(),
        email,
        password, // In production, hash this password!
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    if (saveUsers(users)) {
        res.json({ 
            success: true, 
            message: 'Pendaftaran berhasil' 
        });
    } else {
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menyimpan data pengguna' 
        });
    }
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email dan password harus diisi' 
        });
    }

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Email atau password salah' 
        });
    }

    const token = generateToken(user.id);
    
    res.json({ 
        success: true, 
        message: 'Login berhasil',
        token,
        user: { 
            id: user.id, 
            email: user.email 
        }
    });
});

// Dashboard endpoint (protected)
app.get('/dashboard', authenticate, (req, res) => {
    res.json({ 
        success: true, 
        message: 'Dashboard data berhasil diambil',
        userId: req.userId
    });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


