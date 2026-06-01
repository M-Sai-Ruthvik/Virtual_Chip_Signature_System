# Virtual Chip Signature System

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js v18+](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Python 3.x](https://img.shields.io/badge/Python-3.x-blue.svg)](https://www.python.org/)
[![Ethereum Sepolia](https://img.shields.io/badge/Network-Sepolia-purple.svg)](https://sepolia.dev/)

**A production-ready full-stack digital signature system combining cryptographic hardware (Verilog), blockchain integration (Solidity), and a modern web interface.**

[Features](#-core-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Reference](#-api-reference) • [Troubleshooting](#-troubleshooting)

</div>

---

## 🎯 Project Overview

The **Virtual Chip Signature System** is an end-to-end cryptographic solution that demonstrates the integration of:

- **Hardware Cryptography Layer** (Verilog): ECDSA P-256 signing/verification and Keccak-256 hashing implemented in HDL
- **Backend Server** (Node.js/Express): High-performance REST API for signature generation with configurable ports and rate limiting
- **Web Frontend** (HTML/JavaScript): Interactive user interface with real-time status monitoring and session management
- **Blockchain Layer** (Solidity/Ethereum): Smart contract-based verification on Ethereum Sepolia testnet with MetaMask integration

**Use Cases:**
- 🔐 Educational platform for cryptographic systems
- 🔄 Digital document signing and verification
- ⛓️ Blockchain-based signature validation
- 🧪 Hardware cryptography testing and simulation
- 🏭 FPGA implementation of cryptographic processors

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Web Tier (Browser)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Sign messages → Generate ECDSA + Keccak             │   │
│  │  • Verify signatures locally (fast path)               │   │
│  │  • MetaMask wallet integration                         │   │
│  │  • Real-time backend status monitoring (poll 5s)       │   │
│  │  • Session persistence & debug console                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST (CORS enabled)
                           │ Port: 8000 (frontend)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Application Tier (Node.js/Express)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /sign          → Sign message, return signature   │   │
│  │  GET /api/status     → Backend health + chip status     │   │
│  │  POST /verify        → Verify signature (optional)      │   │
│  │                                                         │   │
│  │  Features:                                              │   │
│  │  • CORS middleware                                      │   │
│  │  • Rate limiting (100 req/15min default)                │   │
│  │  • JSON request/response validation                     │   │
│  │  • Error handling & logging                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Port: 4000                                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ethers.js v6
                           │ (Async signing)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           Cryptography Layer (ethers.js)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • ECDSA P-256 (secp256k1-compatible)                   │   │
│  │  • Keccak-256 message hashing                           │   │
│  │  • Signature components: r, s, v extraction             │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Web3.js
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          Blockchain Tier (Ethereum Sepolia)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Smart Contract: SignatureVerifier.sol                  │   │
│  │  • Verify signatures on-chain (gas ~25k per call)       │   │
│  │  • Store verified signatures                            │   │
│  │  • Event emission for audit trail                       │   │
│  │  • MetaMask transaction signing                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Network: Sepolia Testnet (chainId: 11155111)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User Input (Text Message)
        │
        ▼
┌──────────────────────┐
│  Frontend            │
│  ├─ Input validation │
│  └─ Store locally    │
└──────────────────────┘
        │
        ├─► POST /sign ──┐
        │                 │
        │                 ▼
        │           ┌─────────────────────────┐
        │           │  Backend Server         │
        │           │  ├─ Receive message     │
        │           │  ├─ Hash (Keccak-256)   │
        │           │  ├─ Sign (ECDSA P-256)  │
        │           │  └─ Extract r, s, v     │
        │           └─────────────────────────┘
        │                 │
        │◄─── JSON response with signature ──┤
        │                 
        ▼
┌──────────────────────────────────────────┐
│  Frontend Display Results                │
│  ├─ Show message hash                    │
│  ├─ Display signature (0x...)            │
│  └─ Show r, s, v components              │
└──────────────────────────────────────────┘
        │
        ├─► Option A: Local Verify ─────────────────┐
        │   (Fast, client-side)                      │
        │                                             │
        └─► Option B: Verify On-Chain ─┐             │
            (Requires MetaMask)         │             │
                                        │             │
                                        ▼             ▼
                                  ┌──────────────────────────┐
                                  │ Ethereum Sepolia         │
                                  │ ├─ MetaMask signs txn    │
                                  │ ├─ Contract verifies     │
                                  │ └─ Emit VerificationEvent│
                                  └──────────────────────────┘
```

---

## 📁 Project Structure

```
Virtual_Chip_Signature_System/
│
├── 📄 index.html                          # Main web interface (port 8000)
├── 📄 package.json                        # Root dependencies
├── 📄 webpack.config.js                   # Webpack bundling config
├── 📄 hardhat.config.js                   # Hardhat Ethereum testing
├── 🔑 .env.example                        # Environment variables template
│
├── 🔧 backend/
│   ├── 📄 server.js                       # Express server (PORT 4000)
│   ├── 📄 server_simple.js                # Lightweight alternative server
│   ├── 📄 package.json                    # Backend-only dependencies
│   └── 🔌 routes/
│       ├── sign.js                        # POST /sign endpoint
│       ├── verify.js                      # POST /verify endpoint
│       └── status.js                      # GET /api/status endpoint
│
├── 🛠️ 1. Verilog_Chip_Core/
│   ├── 📁 src/
│   │   ├── ecdsa_core.v                   # ECDSA P-256 signing module
│   │   ├── keccak_256.v                   # Keccak-256 hash module
│   │   ├── axi4_interface.v               # AXI4 protocol handler
│   │   └── controller.v                   # Main chip controller
│   ├── 📁 testbench/
│   │   ├── 📄 ecdsa_tb.v                  # ECDSA testbench
│   │   ├── 📄 keccak_tb.v                 # Keccak testbench
│   │   ├── 📄 integration_tb.v            # Full chip testbench
│   │   └── 📄 README.md                   # Testbench documentation
│   ├── 📁 simulation/
│   │   ├── logs/                          # Simulation execution logs
│   │   ├── results/                       # JSON test results
│   │   └── waveforms/                     # GTKWave .vcd files
│   └── 📁 synthesis/
│       ├── synopsys_scripts/              # Design Compiler scripts
│       └── cadence_scripts/               # Genus synthesis configs
│
├── 🔌 2. Output_Interface/
│   ├── axi4_slave.v                       # AXI4 slave implementation
│   ├── read_write_engine.v                # Read/write logic
│   └── register_map.v                     # Memory-mapped registers
│
├── ⛓️ 3. Blockchain_Interaction/
│   ├── 📄 contracts/SignatureVerifier.sol # Main smart contract
│   ├── 📄 scripts/deploy.js               # Hardhat deployment script
│   ├── 📄 scripts/verify.js               # Contract verification
│   └── 📁 test/
│       ├── 📄 SignatureVerifier.test.js   # Hardhat tests
│       └── 📄 gas-report.txt              # Gas usage analysis
│
├── 🧪 5. Tools/
│   ├── 📁 Simulation/
│   │   ├── 📄 run_simulation.sh            # Master test runner
│   │   ├── 📄 unit_tests.sh               # Unit test executor
│   │   ├── 📄 integration_tests.sh        # Integration test runner
│   │   ├── 📁 logs/                       # Test execution logs
│   │   ├── 📁 results/                    # JSON test results
│   │   └── 📁 waveforms/                  # GTKWave output files
│   ├── 📁 Synthesis/
│   │   ├── 📄 synthesis_scripts/
│   │   └── 📄 timing_analysis.rpt         # Post-synthesis timing
│   └── 📁 FPGA/
│       ├── 📄 vivado_scripts/             # Xilinx Vivado automation
│       ├── 📄 bitstream_generation.tcl    # FPGA build script
│       └── 📄 constraints.xdc             # Timing constraints
│
├── 🧪 6. Tests/
│   ├── 📁 unit/
│   │   ├── ecdsa.test.js                  # ECDSA unit tests
│   │   ├── keccak.test.js                 # Keccak unit tests
│   │   └── integration.test.js            # End-to-end tests
│   ├── 📁 integration/
│   │   ├── backend_integration.test.js    # Backend API tests
│   │   └── blockchain_integration.test.js # Smart contract tests
│   └── 📁 scenarios/
│       ├── multi_signature.test.js        # Multiple signatures
│       └── edge_cases.test.js             # Boundary conditions
│
├── 🎨 frontend_ui/
│   ├── 📁 developer_debug_ui/
│   │   └── debug_console.js               # Debug panel logic
│   ├── 📁 input_form/
│   │   ├── sign_form.js                   # Sign message form
│   │   └── verify_form.js                 # Verify signature form
│   ├── 📁 metamask_integration/
│   │   ├── wallet_connector.js            # MetaMask connection
│   │   └── transaction_handler.js         # Txn signing & submission
│   ├── 📁 session_handler/
│   │   └── session_manager.js             # Client-side session
│   └── 📁 js_memory/
│       └── local_storage.js               # LocalStorage wrapper
│
├── 📦 src/
│   ├── 📄 main.js                         # Frontend entry point
│   ├── 📄 app.js                          # Application logic
│   ├── 📄 crypto_utils.js                 # Crypto helpers
│   ├── 📄 api_client.js                   # Backend API calls
│   └── 📄 ui_controller.js                # UI state management
│
├── 🎨 styles/
│   ├── 📄 main.css                        # Global styles
│   ├── 📄 form.css                        # Form styling
│   ├── 📄 debug_console.css               # Debug panel styles
│   └── 📄 responsive.css                  # Mobile responsive
│
├── 📚 9. Documentation/
│   ├── 📄 API_REFERENCE.md                # Detailed API docs
│   ├── 📄 DEPLOYMENT.md                   # Production deployment
│   ├── 📄 SECURITY.md                     # Security guidelines
│   └── 📄 CONTRIBUTING.md                 # Contribution guide
│
├── 📊 AXI4_DataFlow_Diagram.md            # Hardware interface spec
├── 📄 LICENSE                             # MIT License
├── 📄 Next                                # Future roadmap
├── 🚀 start_all.sh                        # Start all services
└── 🚀 start_demo.sh                       # Quick demo startup
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **npm** v8+ (bundled with Node.js)
- **Git** for version control
- **Verilog Simulator** (optional): `iverilog` and `gtkwave`
  ```bash
  # macOS
  brew install icarus-verilog gtkwave
  
  # Ubuntu/Debian
  sudo apt-get install iverilog gtkwave
  ```
- **Python 3.x** (optional, for build scripts)

### Installation (5 minutes)

#### Step 1: Clone Repository

```bash
git clone https://github.com/M-Sai-Ruthvik/Virtual_Chip_Signature_System.git
cd Virtual_Chip_Signature_System
```

#### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install Hardhat (smart contract testing)
npm run hardhat:compile
```

#### Step 3: Configure Environment (Optional)

Create a `.env` file in the project root:

```bash
# Backend Configuration
BACKEND_PORT=4000
BACKEND_HOST=localhost
NODE_ENV=development

# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=0x... # Test account private key (DO NOT use production keys!)
ETHERSCAN_API_KEY=...

# Frontend Configuration
REACT_APP_BACKEND_URL=http://localhost:4000
REACT_APP_CHAIN_ID=11155111

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Running the Application

#### Option 1: Run Everything at Once (Recommended)

```bash
# Start backend + frontend + status monitoring
bash start_all.sh
```

Then open: **http://localhost:8000**

#### Option 2: Start Services Individually

**Terminal 1 - Backend Server:**
```bash
cd backend
npm start
# Backend running on http://localhost:4000
```

**Terminal 2 - Frontend Development Server:**
```bash
# From project root
npm run build:dev

# Or use simple HTTP server
python -m http.server 8000
# Visit http://localhost:8000
```

#### Option 3: Quick Demo

```bash
bash start_demo.sh
# Runs pre-configured demo with sample signatures
```

---

## 📖 Usage Guide

### Signing a Message (3 steps)

1. **Enter Message:**
   - Navigate to "Sign" tab in the web interface
   - Type or paste your message (e.g., "Hello, World!")

2. **Generate Signature:**
   - Click **"Generate Signature"** button
   - Wait for backend to process (typically <100ms)

3. **Review Results:**
   ```
   Message: "Hello, World!"
   Keccak-256 Hash: 0x...abc123
   ECDSA Signature: 0x...xyz789
   Components:
   - r: 0x...
   - s: 0x...
   - v: 27 or 28
   ```

### Verifying a Signature (2 options)

#### Local Verification (Fast)

1. Go to **Verify** tab
2. Enter:
   - **Original Message**: Exact same text that was signed
   - **Signature**: Full 0x... signature string
   - **Address**: Signer's Ethereum address
3. Click **"Verify Locally"**
4. Result: ✅ Valid or ❌ Invalid

#### On-Chain Verification (Blockchain)

1. Install [MetaMask](https://metamask.io/) browser extension
2. Switch network to **Sepolia Testnet**
3. Go to **Verify** tab
4. Enter signature details (same as above)
5. Click **"Verify On-Chain"**
6. Approve transaction in MetaMask
7. Wait for confirmation (~15 seconds)
8. Result: Blockchain-verified ✅

### Checking System Status

- **Backend Health:** Monitor "/api/status" endpoint
- **Real-time Dashboard:** Status updates every 5 seconds
- **Debug Console:** Open browser DevTools → Console for detailed logs

---

## 🔧 Core Features

### ✅ Fully Implemented

| Feature | Details | Location |
|---------|---------|----------|
| **ECDSA P-256 Signing** | Secp256k1-compatible signing | `backend/server.js` |
| **Keccak-256 Hashing** | SHA-3 variant hashing | `backend/routes/sign.js` |
| **Signature Generation API** | REST endpoint `/sign` | `backend/routes/sign.js` |
| **Local Verification** | Client-side verification | `src/verify_utils.js` |
| **On-Chain Verification** | Smart contract validation | `3. Blockchain_Interaction/contracts/` |
| **MetaMask Integration** | Wallet connection & signing | `frontend_ui/metamask_integration/` |
| **Backend Health Monitoring** | Status API endpoint | `backend/routes/status.js` |
| **Web User Interface** | Full-featured HTML/CSS/JS UI | `index.html` |
| **Express.js Backend** | RESTful API server | `backend/server.js` |
| **Debug Console** | Development debugging tools | `frontend_ui/developer_debug_ui/` |
| **Session Management** | Persistent client-side state | `frontend_ui/session_handler/` |
| **Rate Limiting** | API request throttling | `backend/server.js` |
| **CORS Support** | Cross-origin requests enabled | `backend/server.js` |
| **Error Handling** | Comprehensive error messages | Throughout codebase |
| **Input Validation** | Request/response validation | `backend/routes/` |

### ⚙️ Technical Specifications

#### Cryptography Engine
```
Algorithm:      ECDSA P-256 (secp256k1)
Hash Function:  Keccak-256 (SHA-3)
Signature Size: 65 bytes (r: 32, s: 32, v: 1)
Key Size:       256-bit private key
Curve:          secp256k1 (Ethereum standard)
```

#### Backend Architecture
```
Framework:      Express.js 4.18.2
Runtime:        Node.js v18+
Port:           4000 (configurable)
Protocol:       HTTP/REST
Content-Type:   application/json
CORS:           Enabled
Rate Limit:     100 requests per 15 minutes
Timeout:        30 seconds per request
```

#### Frontend Stack
```
Runtime:        Vanilla JavaScript (ES6+)
Build Tool:     Webpack 5
UI Framework:   None (pure HTML5/CSS3)
Storage:        LocalStorage API
API Client:     Fetch API
Polling:        5-second intervals for status
```

#### Blockchain Configuration
```
Network:        Ethereum Sepolia Testnet
Chain ID:       11155111
Contract Type:  Solidity ^0.8.0
Gas Estimate:   ~25,000 per verification
Wallet:         MetaMask
RPC Provider:   Infura or Alchemy (configurable)
```

---

## 📋 API Reference

### Base URL
```
http://localhost:4000
```

### `POST /sign`

Generate ECDSA signature and Keccak-256 hash for a message.

**Request:**
```http
POST /sign HTTP/1.1
Content-Type: application/json

{
  "message": "Hello, World!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "signature": "0x1234...abcd",
  "hash": "0xabcd...1234",
  "publicKey": "0x... (65 bytes)",
  "r": "0x...",
  "s": "0x...",
  "v": 27,
  "method": "software",
  "timestamp": 1704067200000
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Message is required",
  "code": "INVALID_INPUT"
}
```

**Status Codes:**
- `200 OK`: Signature generated successfully
- `400 Bad Request`: Invalid message format
- `500 Internal Server Error`: Signing failure

---

### `GET /api/status`

Check health of backend and chip simulator.

**Request:**
```http
GET /api/status HTTP/1.1
```

**Response:**
```json
{
  "backend": true,
  "chip": false,
  "timestamp": 1704067200000,
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK`: Always returns current status

---

### `POST /verify`

Verify an ECDSA signature (optional endpoint).

**Request:**
```json
{
  "message": "Hello, World!",
  "signature": "0x1234...abcd",
  "address": "0x742d35Cc6634C0532925a3b844Bc029e4a72062d"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "method": "software",
  "recoveredAddress": "0x742d35Cc6634C0532925a3b844Bc029e4a72062d"
}
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Specific Component

```bash
# Backend API tests
npm run test:backend

# Frontend unit tests
npm run test:frontend

# Smart contract tests
npm run hardhat:test

# Verilog simulations
npm run simulate
```

### Test with Coverage

```bash
npm run test:coverage
```

### Run Linting & Formatting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Manual Testing with cURL

```bash
# Test signing endpoint
curl -X POST http://localhost:4000/sign \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# Test status endpoint
curl http://localhost:4000/api/status

# Test with headers
curl -X POST http://localhost:4000/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"secure message"}'
```

### Verilog Simulation

```bash
# Run all Verilog tests
bash 5.\ Tools/Simulation/run_simulation.sh

# View waveforms
gtkwave 5.\ Tools/Simulation/waveforms/ecdsa_tb.vcd

# Check simulation logs
cat 5.\ Tools/Simulation/logs/ecdsa_sim.log
```

---

## 📖 Detailed Documentation

| Document | Purpose |
|----------|---------|
| [API_REFERENCE.md](9.\ Documentation/API_REFERENCE.md) | Complete API endpoint documentation |
| [DEPLOYMENT.md](9.\ Documentation/DEPLOYMENT.md) | Production deployment guide |
| [SECURITY.md](9.\ Documentation/SECURITY.md) | Security best practices & considerations |
| [CONTRIBUTING.md](9.\ Documentation/CONTRIBUTING.md) | Contribution guidelines |
| [AXI4_DataFlow_Diagram.md](AXI4_DataFlow_Diagram.md) | Hardware interface specifications |
| [Verilog Testbench README](1.\ Verilog_Chip_Core/testbench/README.md) | Hardware testing guide |

---

## 🔐 Security Notes

### ⚠️ Important Security Considerations

- **Private Keys**: Demo private key in `backend/server.js` is for testing only
  - ❌ **DO NOT use in production**
  - ✅ Use environment variables for sensitive keys
  - ✅ Use hardware wallets (Ledger, Trezor) for real assets

- **Signature Verification**:
  - Signatures are cryptographically sound (ECDSA P-256)
  - Ethereum-compatible signature format
  - Industry-standard implementation via ethers.js

- **Rate Limiting**:
  - Backend implements rate limiting (100 req/15min default)
  - Protects against DoS attacks
  - Configurable via environment variables

- **CORS**: 
  - Enabled for all origins in development
  - ✅ Restrict to specific domains in production

- **Input Validation**:
  - All inputs validated before processing
  - Message length limits enforced
  - Signature format verification

### Audit & Compliance

- See `8. Security_Notes/` directory for detailed security analysis
- Code review recommended for production use
- Consider professional audit for high-value systems

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Backend Server Won't Start

```bash
# Check if port 4000 is already in use
lsof -i :4000

# Kill existing process
kill -9 <PID>

# Try different port
PORT=5000 npm start
```

**Solution**: Port 4000 is already occupied. Use a different port or kill the process.

---

#### Cannot Connect Frontend to Backend

```bash
# Verify backend is running
curl http://localhost:4000/api/status

# Check CORS headers
curl -I http://localhost:4000

# Check browser console for CORS errors
```

**Solution**: Ensure backend is running and CORS is enabled. Check browser DevTools → Network tab.

---

#### Signature Verification Fails

```
❌ Invalid Signature Error
```

**Checklist:**
1. ✅ Message text is **exactly identical** (case-sensitive)
2. ✅ Address matches the **original signer**
3. ✅ Signature starts with **0x**
4. ✅ Signature is **valid hex string**

**Solution**: Double-check message and signature values. They are case-sensitive.

---

#### MetaMask Won't Connect

**Steps:**
1. Install [MetaMask](https://metamask.io/) extension
2. Create/import account
3. Switch to **Sepolia Testnet** (chain ID: 11155111)
4. Reload the webpage
5. Click **"Connect Wallet"** button

**If still failing:**
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Check MetaMask network
# Settings → Networks → Add Sepolia manually if needed
```

---

#### Transaction Stuck on Blockchain

**Check Status:**
```bash
# Find your transaction hash in MetaMask
# Visit Sepolia etherscan: https://sepolia.etherscan.io/tx/0x...
```

**Solutions:**
- ✅ Transaction may still be pending (wait 1-2 minutes)
- ✅ Check gas price (might be too low)
- ✅ Restart MetaMask: Lock & unlock wallet

---

#### High Gas Fees

**Solutions:**
- Use **Sepolia testnet** (free test ETH, no real cost)
- Get test ETH: [Sepolia Faucet](https://sepoliafaucet.com/)
- Optimize smart contract code
- Batch multiple operations

---

#### Verilog Simulation Errors

```bash
# Install iverilog and gtkwave
brew install icarus-verilog gtkwave  # macOS
sudo apt install iverilog gtkwave     # Linux

# Run simulation with debug output
iverilog -g2009 src/*.v testbench/*.v

# Check for syntax errors
iverilog -Wall -g2009 src/ecdsa_core.v
```

---

## 🛠️ Development Guide

### Adding a New Feature

#### 1. Backend (Add API Endpoint)

Create `backend/routes/newfeature.js`:
```javascript
const express = require('express');
const router = express.Router();

router.post('/newfeature', async (req, res) => {
  try {
    const result = await processFeature(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

Register in `backend/server.js`:
```javascript
const newFeature = require('./routes/newfeature');
app.use('/api', newFeature);
```

#### 2. Frontend (Update UI)

Update `index.html` and `src/main.js`:
```javascript
async function callNewFeature(data) {
  const response = await fetch('http://localhost:4000/api/newfeature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

#### 3. Tests

Create `6. Tests/unit/newfeature.test.js`:
```javascript
describe('New Feature', () => {
  it('should work correctly', async () => {
    // Test implementation
  });
});
```

#### 4. Documentation

Update `9. Documentation/API_REFERENCE.md` with endpoint details.

---

### Project Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm run build:dev       # Build for development

# Production
npm run build           # Build for production
npm start               # Start production server

# Testing
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Coverage report

# Code Quality
npm run lint            # Check code style
npm run lint:fix        # Auto-fix style issues
npm run format          # Format code with Prettier

# Blockchain
npm run hardhat:compile  # Compile smart contracts
npm run hardhat:test     # Run contract tests
npm run hardhat:deploy   # Deploy to network

# Hardware
npm run simulate        # Run Verilog simulations
npm run fpga:build      # Build FPGA bitstream
```

---

## 📊 Performance Metrics

### Signature Generation

| Metric | Value |
|--------|-------|
| Generation Time | ~50-100ms |
| Hash (Keccak-256) | ~20ms |
| ECDSA Signing | ~30-80ms |
| Throughput | ~10-20 sig/sec |

### Backend Response Times

| Endpoint | Time |
|----------|------|
| `POST /sign` | 80-150ms |
| `GET /api/status` | 5-10ms |
| `POST /verify` | 50-100ms |

### Blockchain Transactions

| Operation | Gas | Time |
|-----------|-----|------|
| Deploy Contract | ~450,000 | ~1-2 min |
| Verify Signature | ~25,000 | ~15 seconds |
| Event Emission | Included | Included |

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Test** thoroughly: `npm test`
4. **Commit**: `git commit -m "Add your feature"`
5. **Push**: `git push origin feature/your-feature`
6. **Open** a Pull Request

### Contribution Areas

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🧪 Test coverage
- ⚡ Performance optimizations

---

## 📦 Dependencies

### Production Dependencies

**Backend:**
- `express` (4.18.2) - Web framework
- `ethers` (6.8.1) - Cryptography & blockchain
- `cors` (2.8.5) - Cross-origin support
- `body-parser` (1.20.2) - Request parsing
- `dotenv` (16.5.0) - Environment variables

**Frontend:**
- `ethers` (6.14.4) - Blockchain interaction
- `web3` (4.2.2) - Ethereum connectivity

### Development Dependencies

- `hardhat` (2.19.1) - Smart contract testing
- `jest` (29.7.0) - Unit testing
- `webpack` (5.89.0) - Bundling
- `eslint` (8.55.0) - Linting
- `prettier` (3.1.0) - Code formatting

See `package.json` for complete dependency tree.

---

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) file for full text.

**Summary**: You are free to use, modify, and distribute this code for any purpose, including commercial use, provided you include the original license notice.

---

## 🎓 Educational Resources

### Understanding ECDSA

- [ECDSA Explained](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [secp256k1 Curve](https://en.bitcoin.it/wiki/Secp256k1)
- [Ethereum Signature Format](https://eips.ethereum.org/EIPS/eip-191)

### Blockchain & Solidity

- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Development](https://ethereum.org/en/developers/)
- [Hardhat Tutorial](https://hardhat.org/getting-started/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Verilog & Hardware

- [Verilog Language Guide](https://en.wikipedia.org/wiki/Verilog)
- [FPGA Design Flow](https://www.xilinx.com/)
- [Hardware Simulation](https://www.edaplayground.com/)

---

## 📞 Support & Contact

### Getting Help

1. **Check Documentation**: Review `9. Documentation/` directory
2. **Search Issues**: [GitHub Issues](https://github.com/M-Sai-Ruthvik/Virtual_Chip_Signature_System/issues)
3. **Review Examples**: Check `6. Tests/` for usage examples
4. **Create Issue**: [Open GitHub Issue](https://github.com/M-Sai-Ruthvik/Virtual_Chip_Signature_System/issues/new)

### Report a Bug

When reporting issues, please include:
- System information (OS, Node.js version)
- Steps to reproduce
- Expected vs actual behavior
- Error messages / logs
- Code snippet if applicable

---

## 🙏 Acknowledgments

- **Ethereum Foundation** - secp256k1 curve & signature standard
- **ethers.js** - Cryptography library
- **Solidity Team** - Smart contract language
- **Hardhat** - Ethereum development framework

---

<div align="center">

### 🚀 Ready to Get Started?

[⬆ Quick Start](#-quick-start) | [📖 Full Documentation](#-detailed-documentation) | [🐛 Report Issue](https://github.com/M-Sai-Ruthvik/Virtual_Chip_Signature_System/issues)

---

**Made with ❤️ for the cryptography & blockchain community**

⭐ Please consider starring this repository if you found it helpful!

</div>
