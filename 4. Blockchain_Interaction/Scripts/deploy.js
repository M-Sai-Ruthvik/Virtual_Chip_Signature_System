// scripts/deploy.js
// Deploys the SignatureVerifier contract using Hardhat

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting SignatureVerifier deployment to Sepolia...");
    
    try {
        // Get the deployer account
        const [deployer] = await ethers.getSigners();
        console.log(`📝 Deploying contracts with account: ${deployer.address}`);
        console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
        
        // Check if we have enough ETH
        const balance = await deployer.getBalance();
        if (balance.lt(ethers.utils.parseEther("0.01"))) {
            throw new Error("Insufficient ETH for deployment. Please get Sepolia testnet ETH from a faucet.");
        }
        
        // Deploy the SignatureVerifier contract
        console.log("📦 Deploying SignatureVerifier...");
        const SignatureVerifier = await ethers.getContractFactory("SignatureVerifier");
        
        // Estimate gas
        const estimatedGas = await SignatureVerifier.signer.estimateGas(
            SignatureVerifier.getDeployTransaction()
        );
        console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
        
        // Deploy with gas limit
        const signatureVerifier = await SignatureVerifier.deploy({
            gasLimit: estimatedGas.mul(120).div(100) // Add 20% buffer
        });
        
        console.log("⏳ Waiting for deployment confirmation...");
        await signatureVerifier.deployed();
        
        console.log("✅ SignatureVerifier deployed successfully!");
        console.log(`📍 Contract address: ${signatureVerifier.address}`);
        
        // Wait for a few block confirmations
        console.log("⏳ Waiting for block confirmations...");
        await signatureVerifier.deployTransaction.wait(3);
        
        // Verify deployment
        console.log("🔍 Verifying deployment...");
        const code = await ethers.provider.getCode(signatureVerifier.address);
        if (code === "0x") {
            throw new Error("Contract deployment verification failed - no code at address");
        }
        console.log("✅ Contract verification successful!");
        
        // Get contract info
        const owner = await signatureVerifier.owner();
        const paused = await signatureVerifier.paused();
        const totalSignatures = await signatureVerifier.totalSignatures();
        const totalVerifications = await signatureVerifier.totalVerifications();
        
        console.log("\n📊 Contract Information:");
        console.log(`👑 Owner: ${owner}`);
        console.log(`⏸️  Paused: ${paused}`);
        console.log(`📝 Total Signatures: ${totalSignatures.toString()}`);
        console.log(`✅ Total Verifications: ${totalVerifications.toString()}`);
        
        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            contractName: "SignatureVerifier",
            contractAddress: signatureVerifier.address,
            deployer: deployer.address,
            deploymentTx: signatureVerifier.deployTransaction.hash,
            blockNumber: signatureVerifier.deployTransaction.blockNumber,
            timestamp: new Date().toISOString(),
            gasUsed: signatureVerifier.deployTransaction.gasLimit.toString(),
            owner: owner,
            abi: SignatureVerifier.interface.format()
        };
        
        // Create deployment directory if it doesn't exist
        const deploymentDir = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        // Save deployment info to file
        const deploymentFile = path.join(deploymentDir, "sepolia-deployment.json");
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log(`💾 Deployment info saved to: ${deploymentFile}`);
        
        // Create ABI file for frontend
        const abiFile = path.join(deploymentDir, "SignatureVerifier.json");
        const abiData = {
            contractName: "SignatureVerifier",
            abi: SignatureVerifier.interface.format(),
            address: signatureVerifier.address,
            network: "sepolia"
        };
        fs.writeFileSync(abiFile, JSON.stringify(abiData, null, 2));
        console.log(`📄 ABI saved to: ${abiFile}`);
        
        // Create frontend config
        const frontendConfig = {
            contractAddress: signatureVerifier.address,
            network: "sepolia",
            chainId: 11155111,
            rpcUrl: "https://sepolia.infura.io/v3/YOUR-PROJECT-ID",
            blockExplorer: "https://sepolia.etherscan.io"
        };
        
        const configFile = path.join(deploymentDir, "frontend-config.json");
        fs.writeFileSync(configFile, JSON.stringify(frontendConfig, null, 2));
        console.log(`⚙️  Frontend config saved to: ${configFile}`);
        
        console.log("\n🎉 Deployment completed successfully!");
        console.log("\n📋 Next Steps:");
        console.log("1. Update your frontend with the contract address");
        console.log("2. Test the contract with a sample signature");
        console.log("3. Monitor the contract on Sepolia Etherscan");
        console.log("4. Set up event listeners for real-time updates");
        
        return {
            contractAddress: signatureVerifier.address,
            deployer: deployer.address,
            deploymentTx: signatureVerifier.deployTransaction.hash
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
main()
  .then(() => process.exit(0))
  .catch((error) => {
            console.error("❌ Script execution failed:", error);
    process.exit(1);
  });
}

module.exports = { main };
