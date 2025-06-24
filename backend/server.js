// Convert ES module imports to CommonJS
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const { ethers, keccak256, toUtf8Bytes } = require('ethers');
const { spawn, exec } = require('child_process');
const path = require('path');
const logger = require('./logger');
require('dotenv').config();
const userStore = require('./user_key_store');
const session = require('express-session');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'verification_log.json');

// Hardware configuration
const HARDWARE_CONFIG = {
    enabled: true, // Set to false to use software-only mode
    verilogPath: path.resolve(__dirname, '../2. Verilog_Chip_Core/'),
    simulationScript: 'run_full_sim.sh',
    timeout: 30000, // 30 seconds timeout for hardware operations
    fallbackToSoftware: true // Use software if hardware fails
};

// Demo private key (DO NOT USE IN PRODUCTION)
const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey);

app.use(cors());
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
}));

// Ensure log file exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]', 'utf-8');
}

// Log server start
logger.info('Server starting...');

// Log all incoming requests
app.use((req, res, next) => {
  logger.info({ message: 'Incoming request', method: req.method, url: req.url });
  next();
});

/**
 * Hardware Integration Functions
 */

/**
 * Generate Keccak-256 hash using hardware
 * @param {string} message - Message to hash
 * @returns {Promise<string>} - Hex hash
 */
async function generateKeccakHashHardware(message) {
    if (!HARDWARE_CONFIG.enabled) {
        throw new Error('Hardware integration is disabled');
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Hardware operation timed out'));
        }, HARDWARE_CONFIG.timeout);

        try {
            // Create input file for Verilog simulation
            const inputData = ethers.toUtf8Bytes(message);
            const inputFile = path.join(HARDWARE_CONFIG.verilogPath, 'input_data.mem');
            
            // Convert message to memory format for Verilog
            const memData = inputData.map(byte => byte.toString(16).padStart(2, '0')).join('\n');
            fs.writeFileSync(inputFile, memData);

            // Run Verilog simulation
            const simulationProcess = spawn('bash', [
                path.join(HARDWARE_CONFIG.verilogPath, HARDWARE_CONFIG.simulationScript)
            ], {
                cwd: HARDWARE_CONFIG.verilogPath
            });

            let output = '';
            let errorOutput = '';

            simulationProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            simulationProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            simulationProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code === 0) {
                    try {
                        // Parse output to extract hash
                        // This depends on your Verilog output format
                        const hashMatch = output.match(/Hash:\s*([0-9a-fA-F]{64})/);
                        if (hashMatch) {
                            resolve('0x' + hashMatch[1]);
                        } else {
                            reject(new Error('Could not extract hash from hardware output'));
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse hardware output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Hardware simulation failed with code ${code}: ${errorOutput}`));
                }
            });

            simulationProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Hardware simulation error: ${error.message}`));
            });

        } catch (error) {
            clearTimeout(timeout);
            reject(new Error(`Hardware setup error: ${error.message}`));
        }
    });
}

/**
 * Generate ECDSA signature using hardware
 * @param {string} messageHash - Keccak-256 hash to sign
 * @returns {Promise<object>} - Signature object with r, s, v components
 */
async function generateECDSASignatureHardware(messageHash) {
    if (!HARDWARE_CONFIG.enabled) {
        throw new Error('Hardware integration is disabled');
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Hardware ECDSA operation timed out'));
        }, HARDWARE_CONFIG.timeout);

        try {
            // Create input file for ECDSA simulation
            const inputFile = path.join(HARDWARE_CONFIG.verilogPath, 'ecdsa_input.mem');
            const hashBytes = ethers.getBytes(messageHash);
            const memData = hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('\n');
            fs.writeFileSync(inputFile, memData);

            // Run ECDSA simulation
            const ecdsaProcess = spawn('bash', [
                path.join(HARDWARE_CONFIG.verilogPath, 'testbench/run_ecdsa_sim.sh')
            ], {
                cwd: HARDWARE_CONFIG.verilogPath
            });

            let output = '';
            let errorOutput = '';

            ecdsaProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            ecdsaProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ecdsaProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code === 0) {
                    try {
                        // Parse ECDSA output to extract r, s, v
                        const rMatch = output.match(/r:\s*([0-9a-fA-F]{64})/);
                        const sMatch = output.match(/s:\s*([0-9a-fA-F]{64})/);
                        const vMatch = output.match(/v:\s*([0-9a-fA-F]{2})/);
                        
                        if (rMatch && sMatch && vMatch) {
                            const r = '0x' + rMatch[1];
                            const s = '0x' + sMatch[1];
                            const v = parseInt(vMatch[1], 16);
                            
                            resolve({ r, s, v });
                        } else {
                            reject(new Error('Could not extract ECDSA signature from hardware output'));
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse ECDSA output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`ECDSA simulation failed with code ${code}: ${errorOutput}`));
                }
            });

            ecdsaProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`ECDSA simulation error: ${error.message}`));
            });

        } catch (error) {
            clearTimeout(timeout);
            reject(new Error(`ECDSA setup error: ${error.message}`));
        }
    });
}

/**
 * Generate signature using hardware (Keccak + ECDSA)
 * @param {string} message - Message to sign
 * @returns {Promise<object>} - Signature result
 */
async function generateSignatureHardware(message) {
    try {
        console.log('🔧 Using hardware for signature generation...');
        
        // Step 1: Generate Keccak-256 hash
        const hash = await generateKeccakHashHardware(message);
        console.log('✅ Keccak-256 hash generated by hardware:', hash);
        
        // Step 2: Generate ECDSA signature
        const signatureComponents = await generateECDSASignatureHardware(hash);
        console.log('✅ ECDSA signature generated by hardware:', signatureComponents);
        
        // Step 3: Combine into standard signature format
        const signature = ethers.utils.joinSignature(signatureComponents);
        
        return {
            success: true,
            signature,
            hash,
            publicKey: wallet.address,
            method: 'hardware'
        };
        
    } catch (error) {
        console.error('❌ Hardware signature generation failed:', error.message);
        
        if (HARDWARE_CONFIG.fallbackToSoftware) {
            console.log('🔄 Falling back to software implementation...');
            return generateSignatureSoftware(message);
        } else {
            throw error;
        }
    }
}

/**
 * Generate signature using software (fallback)
 * @param {string} message - Message to sign
 * @returns {Promise<object>} - Signature result
 */
async function generateSignatureSoftware(message) {
    try {
        console.log('💻 Using software for signature generation...');
        
        // Hash the message with keccak256
        const hash = keccak256(toUtf8Bytes(message));
        
        // Sign the hash
        const signature = await wallet.signMessage(ethers.getBytes(hash));
        
        return {
            success: true,
            signature,
            hash,
            publicKey: wallet.address,
            method: 'software'
        };
        
    } catch (error) {
        console.error('❌ Software signature generation failed:', error.message);
        throw error;
    }
}

// POST /sign - sign a message (hardware or software)
app.post('/sign', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid message' });
  }
  
  try {
    let result;
    
    if (HARDWARE_CONFIG.enabled) {
      result = await generateSignatureHardware(message);
    } else {
      result = await generateSignatureSoftware(message);
    }
    
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

// POST /hardware-status - check hardware status
app.post('/hardware-status', async (req, res) => {
  try {
    const status = {
      enabled: HARDWARE_CONFIG.enabled,
      verilogPath: HARDWARE_CONFIG.verilogPath,
      timeout: HARDWARE_CONFIG.timeout,
      fallbackToSoftware: HARDWARE_CONFIG.fallbackToSoftware
    };
    
    // Check if Verilog files exist
    const verilogFiles = [
      'Keccak256_Module.v',
      'ECDSA_Signer.v',
      'run_full_sim.sh'
    ];
    
    status.files = {};
    for (const file of verilogFiles) {
      const filePath = path.join(HARDWARE_CONFIG.verilogPath, file);
      status.files[file] = fs.existsSync(filePath);
    }
    
    res.json({ success: true, status });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /log - log a verification result
app.post('/log', (req, res) => {
  const entry = req.body;
  if (!entry || typeof entry !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid log entry' });
  }
  try {
    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    logs.push({ ...entry, timestamp: new Date().toISOString() });
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /log - get all logs
app.get('/log', (req, res) => {
  try {
    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User registration
app.post('/api/register', express.json(), (req, res) => {
  const { username, password, privateKey } = req.body;
  if (!username || !password || !privateKey) return res.status(400).json({ error: 'Missing fields' });
  userStore.registerUser(username, password, privateKey, err => {
    if (err) return res.status(400).json({ error: 'User exists or DB error' });
    res.json({ success: true });
  });
});

// User login
app.post('/api/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  userStore.authenticateUser(username, password, (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.username = username;
    res.json({ success: true });
  });
});

// Authenticated signing endpoint
app.post('/api/sign', express.json(), (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'Missing data' });
  userStore.getDecryptedKey(req.session.username, (err, privateKey) => {
    if (err) return res.status(500).json({ error: 'Key error' });
    try {
      const wallet = new ethers.Wallet(privateKey);
      wallet.signMessage(data).then(signature => {
        res.json({ signature });
      }).catch(e => res.status(500).json({ error: 'Signing error' }));
    } catch (e) {
      res.status(500).json({ error: 'Signing error' });
    }
  });
});

// Store verification entry
app.post('/api/store', (req, res) => {
    const entry = req.body; // { data, signature, address, valid, timestamp }
    fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', err => {
        if (err) return res.status(500).json({ success: false, error: 'Failed to store entry' });
        res.json({ success: true });
    });
});

// Get verification history
app.get('/api/history', (req, res) => {
    if (!fs.existsSync(LOG_FILE)) return res.json([]);
    const lines = fs.readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean);
    const history = lines.map(line => {
        try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    res.json(history);
});

// GET /api/status - real-time backend and chip status
app.get('/api/status', async (req, res) => {
  try {
    // Backend is online if this code runs
    let chipOnline = false;
    try {
      // Check if the main simulation script exists and is executable
      const simScript = path.join(HARDWARE_CONFIG.verilogPath, HARDWARE_CONFIG.simulationScript);
      chipOnline = fs.existsSync(simScript) && fs.statSync(simScript).mode & 0o111;
    } catch (e) {
      chipOnline = false;
    }
    res.json({
      backend: true,
      chip: !!chipOnline
    });
  } catch (err) {
    res.status(500).json({ backend: false, chip: false, error: err.message });
  }
});

// Example error logging
app.use((err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack });
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`🚀 Signature log backend running on http://localhost:${PORT}`);
  console.log(`🔧 Hardware integration: ${HARDWARE_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  if (HARDWARE_CONFIG.enabled) {
    console.log(`📁 Verilog path: ${HARDWARE_CONFIG.verilogPath}`);
    console.log(`⏱️  Timeout: ${HARDWARE_CONFIG.timeout}ms`);
    console.log(`🔄 Fallback to software: ${HARDWARE_CONFIG.fallbackToSoftware ? 'YES' : 'NO'}`);
  }
}); 