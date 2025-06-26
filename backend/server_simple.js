const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');

const app = express();
const PORT = 4000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Demo private key (DO NOT USE IN PRODUCTION)
const privateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082790e7e5e2ad98079c6a1';
const wallet = new ethers.Wallet(privateKey);

// Simple software signature generation
async function generateSignatureSoftware(message) {
    try {
        // Hash the message with keccak256
        const hash = ethers.keccak256(ethers.toUtf8Bytes(message));
        // Sign the hash
        const signature = await wallet.signMessage(ethers.getBytes(hash));
        const { r, s, v } = ethers.Signature.from(signature);
        return {
            success: true,
            signature,
            hash,
            publicKey: wallet.address,
            method: 'software',
            r: r.toString(),
            s: s.toString(),
            v: v
        };
    } catch (error) {
        console.error('Software signature generation failed:', error.message);
        throw error;
    }
}

// POST /sign - sign a message
app.post('/sign', async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid message' });
    }
    
    try {
        const result = await generateSignatureSoftware(message);
        res.json(result);
    } catch (err) {
        console.error('Signature generation error:', err);
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
    res.json({ status: 'Backend is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`🔑 Using demo wallet: ${wallet.address}`);
});

module.exports = app; 