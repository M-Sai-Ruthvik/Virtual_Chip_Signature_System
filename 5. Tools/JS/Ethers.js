/**
 * Ethers.js Utilities for Virtual Chip Signature System
 * Provides comprehensive blockchain interaction capabilities
 * Includes contract interactions, transaction handling, gas optimization, and error handling
 */

const { ethers } = require('ethers');

class EthersUtils {
    constructor(options = {}) {
        this.provider = null;
        this.signer = null;
        this.contracts = new Map();
        this.gasEstimates = new Map();
        this.networkConfig = {
            sepolia: {
                rpc: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
                chainId: 11155111,
                name: 'Sepolia Testnet'
            },
            mainnet: {
                rpc: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
                chainId: 1,
                name: 'Ethereum Mainnet'
            },
            local: {
                rpc: 'http://localhost:8545',
                chainId: 1337,
                name: 'Local Network'
            }
        };
        
        this.defaultNetwork = options.defaultNetwork || 'sepolia';
        this.gasLimitBuffer = options.gasLimitBuffer || 1.2; // 20% buffer
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Initialize provider and signer
     * @param {string} network - Network name ('sepolia', 'mainnet', 'local')
     * @param {string} privateKey - Private key for signer (optional)
     * @returns {Promise<Object>} - Provider and signer objects
     */
    async initialize(network = this.defaultNetwork, privateKey = null) {
        try {
            const config = this.networkConfig[network];
            if (!config) {
                throw new Error(`Unsupported network: ${network}`);
            }

            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(config.rpc);
            
            // Initialize signer
            if (privateKey) {
                this.signer = new ethers.Wallet(privateKey, this.provider);
            } else if (typeof window !== 'undefined' && window.ethereum) {
                // MetaMask integration
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner();
            } else {
                throw new Error('No signer available. Please provide private key or connect MetaMask.');
            }

            // Verify network connection
            const networkInfo = await this.provider.getNetwork();
            if (networkInfo.chainId !== config.chainId) {
                console.warn(`Network mismatch. Expected ${config.chainId}, got ${networkInfo.chainId}`);
            }

            console.log(`[EthersUtils] Connected to ${config.name}`);
            return { provider: this.provider, signer: this.signer };

        } catch (error) {
            console.error('[EthersUtils] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load a smart contract
     * @param {string} contractName - Contract name
     * @param {string} contractAddress - Contract address
     * @param {string} abi - Contract ABI
     * @returns {Object} - Contract instance
     */
    loadContract(contractName, contractAddress, abi) {
        if (!this.provider || !this.signer) {
            throw new Error('Provider and signer must be initialized first');
        }

        try {
            const contract = new ethers.Contract(contractAddress, abi, this.signer);
            this.contracts.set(contractName, contract);
            
            console.log(`[EthersUtils] Loaded contract ${contractName} at ${contractAddress}`);
            return contract;

        } catch (error) {
            console.error(`[EthersUtils] Failed to load contract ${contractName}:`, error);
            throw error;
        }
    }

    /**
     * Get contract instance
     * @param {string} contractName - Contract name
     * @returns {Object} - Contract instance
     */
    getContract(contractName) {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract ${contractName} not loaded`);
        }
        return contract;
    }

    /**
     * Estimate gas for a transaction
     * @param {Object} contract - Contract instance
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @returns {Promise<number>} - Estimated gas limit
     */
    async estimateGas(contract, method, args = []) {
        try {
            const gasEstimate = await contract[method].estimateGas(...args);
            const gasLimit = Math.ceil(Number(gasEstimate) * this.gasLimitBuffer);
            
            console.log(`[EthersUtils] Gas estimate for ${method}: ${gasEstimate.toString()}, with buffer: ${gasLimit}`);
            return gasLimit;

        } catch (error) {
            console.error(`[EthersUtils] Gas estimation failed for ${method}:`, error);
            throw error;
        }
    }

    /**
     * Get optimal gas price
     * @returns {Promise<Object>} - Gas price information
     */
    async getOptimalGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            
            // Use EIP-1559 gas pricing if available
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                return {
                    maxFeePerGas: feeData.maxFeePerGas,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                    type: 2 // EIP-1559 transaction
                };
            } else {
                // Fallback to legacy gas price
                const gasPrice = await this.provider.getGasPrice();
                return {
                    gasPrice: gasPrice,
                    type: 0 // Legacy transaction
                };
            }

        } catch (error) {
            console.error('[EthersUtils] Failed to get gas price:', error);
            throw error;
        }
    }

    /**
     * Send transaction with retry logic and gas optimization
     * @param {Object} contract - Contract instance
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @param {Object} options - Transaction options
     * @returns {Promise<Object>} - Transaction receipt
     */
    async sendTransaction(contract, method, args = [], options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`[EthersUtils] Sending transaction ${method} (attempt ${attempt})`);

                // Get gas price
                const gasPriceInfo = await this.getOptimalGasPrice();
                
                // Estimate gas if not provided
                let gasLimit = options.gasLimit;
                if (!gasLimit) {
                    gasLimit = await this.estimateGas(contract, method, args);
                }

                // Prepare transaction
                const txOptions = {
                    ...gasPriceInfo,
                    gasLimit: gasLimit,
                    ...options
                };

                // Send transaction
                const tx = await contract[method](...args, txOptions);
                console.log(`[EthersUtils] Transaction sent: ${tx.hash}`);

                // Wait for confirmation
                const receipt = await tx.wait();
                console.log(`[EthersUtils] Transaction confirmed: ${receipt.transactionHash}`);

                return {
                    transactionHash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
                    status: receipt.status,
                    logs: receipt.logs
                };

            } catch (error) {
                lastError = error;
                console.error(`[EthersUtils] Transaction attempt ${attempt} failed:`, error);

                if (attempt < this.maxRetries) {
                    // Wait before retry with exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`[EthersUtils] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Transaction failed after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Call contract method (read-only)
     * @param {Object} contract - Contract instance
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @returns {Promise<any>} - Method result
     */
    async callMethod(contract, method, args = []) {
        try {
            console.log(`[EthersUtils] Calling ${method} with args:`, args);
            const result = await contract[method](...args);
            console.log(`[EthersUtils] ${method} result:`, result);
            return result;

        } catch (error) {
            console.error(`[EthersUtils] Call to ${method} failed:`, error);
            throw error;
        }
    }

    /**
     * Get account balance
     * @param {string} address - Account address
     * @returns {Promise<string>} - Balance in ETH
     */
    async getBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);

        } catch (error) {
            console.error('[EthersUtils] Failed to get balance:', error);
            throw error;
        }
    }

    /**
     * Get transaction status
     * @param {string} txHash - Transaction hash
     * @returns {Promise<Object>} - Transaction status
     */
    async getTransactionStatus(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            const receipt = await this.provider.getTransactionReceipt(txHash);

            return {
                hash: txHash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                gasPrice: tx.gasPrice.toString(),
                gasLimit: tx.gasLimit.toString(),
                nonce: tx.nonce,
                blockNumber: receipt ? receipt.blockNumber : null,
                status: receipt ? receipt.status : null,
                gasUsed: receipt ? receipt.gasUsed.toString() : null,
                confirmations: receipt ? receipt.confirmations : 0
            };

        } catch (error) {
            console.error('[EthersUtils] Failed to get transaction status:', error);
            throw error;
        }
    }

    /**
     * Wait for transaction confirmation
     * @param {string} txHash - Transaction hash
     * @param {number} confirmations - Number of confirmations to wait for
     * @returns {Promise<Object>} - Transaction receipt
     */
    async waitForTransaction(txHash, confirmations = 1) {
        try {
            console.log(`[EthersUtils] Waiting for ${confirmations} confirmation(s) for ${txHash}`);
            const receipt = await this.provider.waitForTransaction(txHash, confirmations);
            console.log(`[EthersUtils] Transaction confirmed with ${receipt.confirmations} confirmation(s)`);
            return receipt;

        } catch (error) {
            console.error('[EthersUtils] Failed to wait for transaction:', error);
            throw error;
        }
    }

    /**
     * Get network information
     * @returns {Promise<Object>} - Network information
     */
    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            const gasPrice = await this.provider.getGasPrice();

            return {
                chainId: network.chainId,
                name: network.name,
                blockNumber: blockNumber,
                gasPrice: gasPrice.toString()
            };

        } catch (error) {
            console.error('[EthersUtils] Failed to get network info:', error);
            throw error;
        }
    }

    /**
     * Validate Ethereum address
     * @param {string} address - Address to validate
     * @returns {boolean} - True if valid
     */
    static isValidAddress(address) {
        return ethers.isAddress(address);
    }

    /**
     * Convert address to checksum format
     * @param {string} address - Address to convert
     * @returns {string} - Checksum address
     */
    static toChecksumAddress(address) {
        return ethers.getAddress(address);
    }

    /**
     * Format ETH amount
     * @param {string} amount - Amount in wei
     * @param {number} decimals - Number of decimal places
     * @returns {string} - Formatted amount
     */
    static formatEther(amount, decimals = 4) {
        const eth = ethers.formatEther(amount);
        return parseFloat(eth).toFixed(decimals);
    }

    /**
     * Parse ETH amount to wei
     * @param {string} amount - Amount in ETH
     * @returns {string} - Amount in wei
     */
    static parseEther(amount) {
        return ethers.parseEther(amount);
    }

    /**
     * Generate random wallet
     * @returns {Object} - Wallet object with address and private key
     */
    static generateWallet() {
        const wallet = ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic.phrase
        };
    }

    /**
     * Sign message
     * @param {string} message - Message to sign
     * @param {string} privateKey - Private key
     * @returns {string} - Signature
     */
    static async signMessage(message, privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        return await wallet.signMessage(message);
    }

    /**
     * Verify message signature
     * @param {string} message - Original message
     * @param {string} signature - Signature
     * @returns {string} - Recovered address
     */
    static verifyMessage(message, signature) {
        return ethers.verifyMessage(message, signature);
    }
}

module.exports = EthersUtils;
