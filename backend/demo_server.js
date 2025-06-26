const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Demo private key (DO NOT USE IN PRODUCTION)
const demoPrivateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082790e7e5e2ad98079c6a1';

// Simple signature generation (mock for demo)
function generateMockSignature(message) {
    const timestamp = Date.now();
    const hash = '0x' + require('crypto').createHash('sha256').update(message + timestamp).digest('hex');
    
    return {
        success: true,
        signature: '0x' + require('crypto').randomBytes(65).toString('hex'),
        hash: hash,
        publicKey: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        method: 'software',
        r: '0x' + require('crypto').randomBytes(32).toString('hex'),
        s: '0x' + require('crypto').randomBytes(32).toString('hex'),
        v: 27
    };
}

// POST /sign - sign a message
app.post('/sign', (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid message' });
    }
    
    try {
        const result = generateMockSignature(message);
        console.log('✅ Signature generated for:', message);
        res.json(result);
    } catch (err) {
        console.error('❌ Signature generation error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message,
            method: 'failed'
        });
    }
});

// GET /api/status - backend status
app.get('/api/status', (req, res) => {
    res.json({
        backend: true,
        chip: false
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'Backend is running', 
        timestamp: new Date().toISOString(),
        message: 'Demo server ready for signature generation'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Demo backend server running on http://localhost:${PORT}`);
    console.log(`🔑 Demo wallet: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`);
    console.log(`📝 POST /sign - Generate signatures`);
    console.log(`📊 GET /api/status - Check status`);
});

module.exports = app; 