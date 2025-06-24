# 🚀 SignatureVerifier Contract Deployment Guide

## Overview
This guide will walk you through deploying the SignatureVerifier smart contract to the Sepolia testnet and integrating it with your frontend application.

## Prerequisites

### 1. Environment Setup
- Node.js (v16 or higher)
- npm or yarn
- MetaMask wallet with Sepolia testnet configured
- Sepolia testnet ETH (get from faucets below)

### 2. Required Accounts & Services
- **MetaMask Wallet**: For deployment and testing
- **Infura Account**: For RPC endpoints (free tier available)
- **Etherscan Account**: For contract verification (optional)

## Step 1: Get Sepolia Testnet ETH

### Free Faucets:
1. **Alchemy Sepolia Faucet**: https://sepoliafaucet.com/
2. **Infura Sepolia Faucet**: https://www.infura.io/faucet/sepolia
3. **Chainlink Faucet**: https://faucets.chain.link/sepolia

**Minimum Required**: 0.1 ETH (deployment costs ~0.01-0.05 ETH)

## Step 2: Configure Environment

### 1. Create Environment File
```bash
# Create .env file in project root
touch .env
```

### 2. Add Environment Variables
```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
SEPOLIA_WS_URL=wss://sepolia.infura.io/ws/v3/YOUR-PROJECT-ID

# Deployment Configuration
PRIVATE_KEY=your_metamask_private_key_here
CONTRACT_ADDRESS= # Will be filled after deployment

# Optional: Webhook for event notifications
WEBHOOK_URL=https://your-webhook-url.com/events
```

### 3. Get Infura Project ID
1. Go to https://infura.io/
2. Create account and new project
3. Copy Project ID from project settings
4. Replace `YOUR-PROJECT-ID` in .env file

## Step 3: Install Dependencies

```bash
# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Install ethers.js
npm install ethers
```

## Step 4: Configure Hardhat

### 1. Update hardhat.config.js
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY // Optional
  }
};
```

### 2. Install dotenv
```bash
npm install dotenv
```

## Step 5: Deploy Contract

### 1. Compile Contract
```bash
npx hardhat compile
```

### 2. Deploy to Sepolia
```bash
npx hardhat run 4. Blockchain_Interaction/Scripts/deploy.js --network sepolia
```

### 3. Expected Output
```
🚀 Starting SignatureVerifier deployment to Sepolia...
📝 Deploying contracts with account: 0xYourAddress...
💰 Account balance: 0.5 ETH
⛽ Estimated gas: 1234567
📦 Deploying SignatureVerifier...
⏳ Waiting for deployment confirmation...
✅ SignatureVerifier deployed successfully!
📍 Contract address: 0x1234567890abcdef...
⏳ Waiting for block confirmations...
✅ Contract verification successful!

📊 Contract Information:
👑 Owner: 0xYourAddress...
⏸️  Paused: false
📝 Total Signatures: 0
✅ Total Verifications: 0

💾 Deployment info saved to: 4. Blockchain_Interaction/deployments/sepolia-deployment.json
📄 ABI saved to: 4. Blockchain_Interaction/deployments/SignatureVerifier.json
⚙️  Frontend config saved to: 4. Blockchain_Interaction/deployments/frontend-config.json
```

## Step 6: Update Frontend Configuration

### 1. Copy Contract Address
After deployment, copy the contract address from the output.

### 2. Update Frontend Config
```javascript
// In src/main.js, update the contract address
const CONTRACT_CONFIG = {
    address: "0x1234567890abcdef...", // Your deployed contract address
    network: "sepolia",
    chainId: 11155111
};
```

### 3. Update Event Listener
```javascript
// In 4. Blockchain_Interaction/Scripts/listen_events.js
const CONFIG = {
    contractAddress: "0x1234567890abcdef...", // Your deployed contract address
    // ... other config
};
```

## Step 7: Test the Deployment

### 1. Test Contract Functions
```bash
# Run test script
npx hardhat test 7. Tests/SmartContract/verify.test.js --network sepolia
```

### 2. Manual Testing
1. Open your frontend application
2. Connect MetaMask to Sepolia
3. Enter a test message
4. Generate signature
5. Send to Sepolia
6. Verify the transaction appears on Etherscan

## Step 8: Start Event Listener

### 1. Start the Listener
```bash
# In a separate terminal
node 4. Blockchain_Interaction/Scripts/listen_events.js
```

### 2. Expected Output
```
🚀 Initializing Event Listener...
🌐 Connected to network: sepolia (Chain ID: 11155111)
📋 Contract verified at: 0x1234567890abcdef...
📦 Starting from current block: 12345678
✅ Event Listener initialized successfully
🎯 Starting event listener...
📦 New block: 12345679
```

## Step 9: Monitor and Verify

### 1. Check Contract on Etherscan
- Go to https://sepolia.etherscan.io/
- Search for your contract address
- Verify contract is deployed and functions are working

### 2. Monitor Events
- Check the event logs in `4. Blockchain_Interaction/TX_Result_Store/`
- Monitor the event listener console output
- Verify events are being captured correctly

## Troubleshooting

### Common Issues

#### 1. Insufficient ETH
```
Error: Insufficient ETH for deployment
```
**Solution**: Get more Sepolia ETH from faucets

#### 2. Network Connection Issues
```
Error: Network connection failed
```
**Solution**: 
- Check your RPC URL in .env
- Verify Infura project is active
- Check internet connection

#### 3. Contract Deployment Fails
```
Error: Contract deployment failed
```
**Solution**:
- Check gas limit settings
- Verify Solidity version compatibility
- Check for syntax errors in contract

#### 4. Event Listener Not Working
```
Error: No contract found at address
```
**Solution**:
- Verify contract address is correct
- Check if contract is deployed to correct network
- Verify RPC URL is for correct network

### Debug Commands

```bash
# Check network connection
npx hardhat console --network sepolia

# Verify contract on Etherscan (optional)
npx hardhat verify --network sepolia 0xYourContractAddress

# Check contract state
npx hardhat run scripts/check-contract.js --network sepolia
```

## Security Considerations

### 1. Private Key Security
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using hardware wallets for production

### 2. Contract Security
- The deployed contract includes access controls
- Only the owner can pause/unpause the contract
- Emergency functions are available for stuck ETH

### 3. Network Security
- Sepolia is a testnet - don't use real funds
- Always test thoroughly before mainnet deployment
- Monitor contract events for suspicious activity

## Production Deployment

When ready for mainnet:

1. **Change Network**: Update to Ethereum mainnet
2. **Security Audit**: Perform professional security audit
3. **Gas Optimization**: Optimize contract for gas efficiency
4. **Monitoring**: Set up comprehensive monitoring
5. **Backup**: Implement backup and recovery procedures

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review contract documentation
3. Check Hardhat and Ethers.js documentation
4. Monitor contract events and logs

---

**🎉 Congratulations! Your SignatureVerifier contract is now deployed and ready for production use!** 