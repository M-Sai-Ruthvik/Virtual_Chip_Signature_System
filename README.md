# Virtual Chip Signature System

A complete digital signature system combining hardware cryptography (Verilog), a web-based interface, and blockchain verification. This project demonstrates a full-stack implementation of ECDSA P-256 and Keccak-256 with real-time signature generation and verification capabilities.

## 🎯 Project Overview

The Virtual Chip Signature System is a production-oriented cryptographic processor that integrates:

- **Hardware Core** (Verilog): ECDSA P-256 signing/verification and Keccak-256 hashing
- **Backend Server** (Node.js): REST API for signature generation and chip status monitoring
- **Web Frontend** (HTML/JavaScript): Interactive UI for signing and verification
- **Blockchain Integration** (Solidity/Hardhat): On-chain signature verification on Ethereum (Sepolia testnet)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Web Browser (Frontend)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sign | Verify | Status Dashboard                    │  │
│  │  - Input message                                      │  │
│  │  - Display Keccak-256 hash                           │  │
│  │  - Show ECDSA (r, s, v) components                   │  │
│  │  - Verify signatures locally or on-chain             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Server (Node.js/Express)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /sign       → Generate signature + hash        │  │
│  │  GET /api/status  → Return chip/backend health       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ ethers.js
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Cryptographic Signing (ethers.js)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ECDSA P-256 Signature Generation                    │  │
│  │  Keccak-256 Message Hashing                          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Blockchain (Ethereum Sepolia Testnet)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Smart Contract: SignatureVerifier                   │  │
│  │  - Verify signatures on-chain                        │  │
│  │  - MetaMask integration                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Virtual_Chip_Signature_System/
│
├── index.html                          # Main web interface
├── package.json                        # Node.js dependencies
├── backend/
│   ├── server.js                       # Express server (PORT 4000)
│   ├── server_simple.js               # Alternative simple server
│   └── package.json                   # Backend dependencies
│
├── 1. Verilog_Chip_Core/
│   ├── src/                           # Verilog HDL files
│   ├── testbench/                     # UVM/Verilog testbenches
│   ├── simulation/                    # Simulation results
│   └── synthesis/                     # Synthesis scripts
│
├── 3. Blockchain_Interaction/
│   ├── contracts/SignatureVerifier.sol # Solidity smart contract
│   └── scripts/deploy.js              # Contract deployment
│
├── 5. Tools/
│   ├── Simulation/
│   │   ├── run_simulation.sh           # Verilog simulation runner
│   │   ├── logs/                      # Simulation logs
│   │   ├── results/                   # Test results (JSON)
│   │   └── waveforms/                 # GTKWave output
│   ├── Synthesis/
│   │   └── synthesis_scripts/         # Synopsys/Cadence scripts
│   └── FPGA/
│       └── vivado_scripts/            # FPGA deployment
│
├── 6. Tests/
│   ├── unit/                          # Unit tests (Jest)
│   ├── integration/                   # Integration tests
│   └── scenarios/                     # End-to-end scenarios
│
├── frontend_ui/
│   ├── developer_debug_ui/            # Debug console
│   ├── input_form/                    # User input form
│   ├── metamask_integration/          # Wallet connection
│   ├── session_handler/               # Session management
│   └── js_memory/                     # Client-side storage
│
├── src/
│   └── main.js                        # Frontend entry point
│
├── styles/                            # CSS styling
├── dist/                              # Built/compiled output
│
├── hardhat.config.js                  # Hardhat Ethereum testing
├── AXI4_DataFlow_Diagram.md           # Hardware interface docs
└── Documentation/                     # Technical documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- npm (v8+)
- Python 3.x (for scripts)
- Verilog simulator: `iverilog` & `gtkwave` (optional, for hardware testing)

### Installation

```bash
# Clone repository
git clone https://github.com/M-Sai-Ruthvik/Virtual_Chip_Signature_System.git
cd Virtual_Chip_Signature_System

# Install dependencies
npm install
cd backend && npm install && cd ..

# Compile smart contracts (optional)
npx hardhat compile
```

### Running the Application

#### 1. Start Backend Server

```bash
cd backend
npm start
# Server runs on http://localhost:4000
```

#### 2. Open Web Interface

```bash
# Open in browser
open index.html
# or
python -m http.server 8000
# Visit http://localhost:8000
```

#### 3. Sign a Message

1. Enter text in the **Sign** section
2. Click **"Generate Signature"**
3. View results:
   - **Keccak Output**: Message hash (256-bit)
   - **ECDSA Output**: r, s, v signature components
   - **Signature**: Full signed message

#### 4. Verify Signature

**Local Verification:**
1. Go to **Verify** section
2. Paste the original data, signature, and address
3. Click **"Verify"** button
4. Result displays validity

**On-Chain Verification:**
1. Click **"Verify On-Chain"** (requires MetaMask on Sepolia)
2. Smart contract validates signature on Ethereum
3. Transaction hash displayed

## 🔧 Core Features

### ✅ Current Implementation

| Feature | Status | Location |
|---------|--------|----------|
| **ECDSA P-256 Signing** | ✅ Implemented | `backend/server.js`, ethers.js |
| **Keccak-256 Hashing** | ✅ Implemented | `backend/server.js`, ethers.js |
| **Signature Generation** | ✅ Working | REST API `/sign` |
| **Local Verification** | ✅ Working | Frontend JavaScript |
| **On-Chain Verification** | ✅ Working | Solidity Smart Contract |
| **MetaMask Integration** | ✅ Working | Frontend UI |
| **Status Monitoring** | ✅ Working | REST API `/api/status` |
| **Web Interface** | ✅ Working | `index.html` |
| **Backend API** | ✅ Working | Express.js Server |
| **Debug Console** | ✅ Working | Frontend debug panel |
| **Session Management** | ✅ Working | Client-side storage |

### ⚙️ Technical Specifications

**Cryptography:**
- Signature Algorithm: ECDSA over P-256 (secp256k1 compatible)
- Hash Function: Keccak-256 (SHA-3 variant)
- Signature Format: (r, s, v) components

**Backend:**
- Framework: Express.js
- Port: 4000 (configurable)
- API Response: JSON
- CORS: Enabled
- Rate Limiting: Available

**Frontend:**
- Framework: Vanilla JavaScript (no framework dependencies)
- Build Tool: Webpack
- UI Components: HTML5 + CSS3
- Real-time Status: Polling (5-second intervals)

**Blockchain:**
- Network: Ethereum Sepolia Testnet
- Contract Language: Solidity
- Testing Framework: Hardhat
- Wallet: MetaMask

## 📋 API Reference

### `POST /sign`

Generate ECDSA signature and Keccak-256 hash for a message.

**Request:**
```json
{
  "message": "Hello, World!"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "0x...",
  "hash": "0x...",
  "publicKey": "0x...",
  "r": "0x...",
  "s": "0x...",
  "v": 27,
  "method": "software"
}
```

### `GET /api/status`

Check health of backend and chip simulator.

**Response:**
```json
{
  "backend": true,
  "chip": false
}
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Verilog Simulations

```bash
bash 6.\ Tools/Simulation/run_simulation.sh
```

### Run Hardhat Tests (Smart Contracts)

```bash
npx hardhat test
```

### Run Linting

```bash
npm run lint
npm run lint:fix
```

## 🔐 Security Notes

- **Demo private key** in `backend/server.js` is for testing only - **DO NOT USE IN PRODUCTION**
- Signatures use industry-standard ECDSA P-256 (compatible with Ethereum)
- All cryptographic operations use `ethers.js` (battle-tested library)
- Side-channel analysis documentation available in `8. Security_Notes/`

## 📖 Documentation

- **AXI4 Interface**: `AXI4_DataFlow_Diagram.md` - Hardware interface specification
- **Verilog Tests**: `1. Verilog_Chip_Core/testbench/README.md` - Hardware testing guide
- **Smart Contracts**: `3. Blockchain_Interaction/` - Contract documentation
- **Project Roadmap**: `Next` - Detailed phase-by-phase breakdown

## 🛠️ Development

### Adding a New Signature

To extend functionality:

1. **Backend**: Add new endpoint in `backend/server.js`
2. **Frontend**: Update `src/main.js` and UI components
3. **Smart Contract**: Modify `3. Blockchain_Interaction/contracts/SignatureVerifier.sol`
4. **Tests**: Add tests to `6. Tests/`

### Common Tasks

```bash
# Start frontend with live reload
npm run build:dev

# Production build
npm run build

# Format code
npm run format

# Deploy smart contract
npx hardhat run scripts/deploy.js --network sepolia
```

## 🐛 Troubleshooting

### Backend not responding

```bash
# Check if port 4000 is in use
lsof -i :4000

# Kill process if needed
kill -9 <PID>

# Restart server
cd backend && npm start
```

### Signature verification fails

1. Ensure message text is identical (case-sensitive)
2. Check that address matches the signer
3. Verify signature format (should start with `0x`)

### MetaMask won't connect

1. Install MetaMask browser extension
2. Switch to Sepolia testnet
3. Reload page
4. Click "Connect Wallet"

## 📦 Dependencies

### Frontend
- ethers.js (v6.x) - Blockchain interaction

### Backend
- Express - HTTP server
- ethers.js - Cryptography
- cors - Cross-origin support
- body-parser - JSON parsing

### Development
- Hardhat - Smart contract testing
- Jest - Unit testing
- Webpack - Build bundling
- Prettier - Code formatting
- ESLint - Linting

See `package.json` for complete list.

## 📄 License

MIT License - See LICENSE file for details

## 🙋 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a Pull Request

## 📞 Support

For issues or questions:
1. Check existing GitHub issues
2. Review documentation in `Documentation/`
3. Create a new GitHub issue with detailed description

---

**Virtual Chip Signature System** - Secure, verifiable digital signatures powered by cryptographic hardware integration and blockchain verification.
```

