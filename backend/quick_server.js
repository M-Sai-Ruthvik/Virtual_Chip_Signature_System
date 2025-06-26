const http = require('http');
const url = require('url');

const PORT = 4000;

// Simple signature generation (mock for demo)
function generateMockSignature(message) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const hash = '0x' + crypto.createHash('sha256').update(message + timestamp).digest('hex');
    
    return {
        success: true,
        signature: '0x' + crypto.randomBytes(65).toString('hex'),
        hash: hash,
        publicKey: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        method: 'software',
        r: '0x' + crypto.randomBytes(32).toString('hex'),
        s: '0x' + crypto.randomBytes(32).toString('hex'),
        v: 27
    };
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    if (req.method === 'GET') {
        if (parsedUrl.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'Backend is running', 
                timestamp: new Date().toISOString(),
                message: 'Demo server ready for signature generation'
            }));
        } else if (parsedUrl.pathname === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                backend: true,
                chip: false
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    } else if (req.method === 'POST' && parsedUrl.pathname === '/sign') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { message } = data;
                
                if (!message || typeof message !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid message' }));
                    return;
                }
                
                const result = generateMockSignature(message);
                console.log('✅ Signature generated for:', message);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('❌ Error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Demo backend server running on http://localhost:${PORT}`);
    console.log(`🔑 Demo wallet: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`);
    console.log(`📝 POST /sign - Generate signatures`);
    console.log(`📊 GET /api/status - Check status`);
}); 