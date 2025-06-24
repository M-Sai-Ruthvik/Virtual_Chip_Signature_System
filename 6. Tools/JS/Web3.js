/**
 * Web3.js Utilities for Virtual Chip Signature System
 * Provides comprehensive blockchain interaction capabilities
 * Includes contract interactions, transaction handling, gas optimization, and error handling
 */

const Web3 = require('web3');

class Web3Utils {
    constructor(options = {}) {
        this.web3 = null;
        this.contracts = new Map();
        this.accounts = [];
        this.defaultAccount = null;
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
     * Initialize Web3 instance
     * @param {string} network - Network name ('sepolia', 'mainnet', 'local')
     * @param {string} privateKey - Private key for account (optional)
     * @returns {Promise<Object>} - Web3 instance and accounts
     */
    async initialize(network = this.defaultNetwork, privateKey = null) {
        try {
            const config = this.networkConfig[network];
            if (!config) {
                throw new Error(`Unsupported network: ${network}`);
            }

            // Initialize Web3
            if (typeof window !== 'undefined' && window.ethereum) {
                // MetaMask integration
                this.web3 = new Web3(window.ethereum);
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } else if (privateKey) {
                // Private key provider
                this.web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
                const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
                this.web3.eth.accounts.wallet.add(account);
            } else {
                // HTTP provider
                this.web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
            }

            // Get accounts
            this.accounts = await this.web3.eth.getAccounts();
            this.defaultAccount = this.accounts[0];

            if (!this.defaultAccount) {
                throw new Error('No accounts available');
            }

            // Verify network connection
            const chainId = await this.web3.eth.getChainId();
            if (chainId !== config.chainId) {
                console.warn(`Network mismatch. Expected ${config.chainId}, got ${chainId}`);
            }

            console.log(`[Web3Utils] Connected to ${config.name} with account ${this.defaultAccount}`);
            return { web3: this.web3, accounts: this.accounts, defaultAccount: this.defaultAccount };

        } catch (error) {
            console.error('[Web3Utils] Initialization failed:', error);
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
        if (!this.web3) {
            throw new Error('Web3 must be initialized first');
        }

        try {
            const contract = new this.web3.eth.Contract(abi, contractAddress);
            this.contracts.set(contractName, contract);
            
            console.log(`[Web3Utils] Loaded contract ${contractName} at ${contractAddress}`);
            return contract;

        } catch (error) {
            console.error(`[Web3Utils] Failed to load contract ${contractName}:`, error);
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
     * @param {Object} options - Transaction options
     * @returns {Promise<number>} - Estimated gas limit
     */
    async estimateGas(contract, method, args = [], options = {}) {
        try {
            const gasEstimate = await contract.methods[method](...args).estimateGas({
                from: this.defaultAccount,
                ...options
            });
            
            const gasLimit = Math.ceil(gasEstimate * this.gasLimitBuffer);
            
            console.log(`[Web3Utils] Gas estimate for ${method}: ${gasEstimate}, with buffer: ${gasLimit}`);
            return gasLimit;

        } catch (error) {
            console.error(`[Web3Utils] Gas estimation failed for ${method}:`, error);
            throw error;
        }
    }

    /**
     * Get optimal gas price
     * @returns {Promise<string>} - Gas price in wei
     */
    async getOptimalGasPrice() {
        try {
            const gasPrice = await this.web3.eth.getGasPrice();
            console.log(`[Web3Utils] Current gas price: ${gasPrice} wei`);
            return gasPrice;

        } catch (error) {
            console.error('[Web3Utils] Failed to get gas price:', error);
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
                console.log(`[Web3Utils] Sending transaction ${method} (attempt ${attempt})`);

                // Get gas price
                const gasPrice = await this.getOptimalGasPrice();
                
                // Estimate gas if not provided
                let gasLimit = options.gasLimit;
                if (!gasLimit) {
                    gasLimit = await this.estimateGas(contract, method, args, options);
                }

                // Prepare transaction
                const txOptions = {
                    from: this.defaultAccount,
                    gasPrice: gasPrice,
                    gas: gasLimit,
                    ...options
                };

                // Send transaction
                const tx = await contract.methods[method](...args).send(txOptions);
                console.log(`[Web3Utils] Transaction confirmed: ${tx.transactionHash}`);

                return {
                    transactionHash: tx.transactionHash,
                    blockNumber: tx.blockNumber,
                    gasUsed: tx.gasUsed,
                    effectiveGasPrice: tx.effectiveGasPrice,
                    status: tx.status,
                    logs: tx.events
                };

            } catch (error) {
                lastError = error;
                console.error(`[Web3Utils] Transaction attempt ${attempt} failed:`, error);

                if (attempt < this.maxRetries) {
                    // Wait before retry with exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`[Web3Utils] Retrying in ${delay}ms...`);
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
     * @param {Object} options - Call options
     * @returns {Promise<any>} - Method result
     */
    async callMethod(contract, method, args = [], options = {}) {
        try {
            console.log(`[Web3Utils] Calling ${method} with args:`, args);
            
            const callOptions = {
                from: this.defaultAccount,
                ...options
            };

            const result = await contract.methods[method](...args).call(callOptions);
            console.log(`[Web3Utils] ${method} result:`, result);
            return result;

        } catch (error) {
            console.error(`[Web3Utils] Call to ${method} failed:`, error);
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
            const balance = await this.web3.eth.getBalance(address);
            return this.web3.utils.fromWei(balance, 'ether');

        } catch (error) {
            console.error('[Web3Utils] Failed to get balance:', error);
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
            const tx = await this.web3.eth.getTransaction(txHash);
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);

            return {
                hash: txHash,
                from: tx.from,
                to: tx.to,
                value: this.web3.utils.fromWei(tx.value, 'ether'),
                gasPrice: tx.gasPrice,
                gas: tx.gas,
                nonce: tx.nonce,
                blockNumber: receipt ? receipt.blockNumber : null,
                status: receipt ? receipt.status : null,
                gasUsed: receipt ? receipt.gasUsed : null,
                confirmations: receipt ? receipt.confirmations : 0
            };

        } catch (error) {
            console.error('[Web3Utils] Failed to get transaction status:', error);
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
            console.log(`[Web3Utils] Waiting for ${confirmations} confirmation(s) for ${txHash}`);
            
            return new Promise((resolve, reject) => {
                const checkConfirmation = async () => {
                    try {
                        const receipt = await this.web3.eth.getTransactionReceipt(txHash);
                        
                        if (receipt && receipt.confirmations >= confirmations) {
                            console.log(`[Web3Utils] Transaction confirmed with ${receipt.confirmations} confirmation(s)`);
                            resolve(receipt);
                        } else {
                            setTimeout(checkConfirmation, 1000);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                checkConfirmation();
            });

        } catch (error) {
            console.error('[Web3Utils] Failed to wait for transaction:', error);
            throw error;
        }
    }

    /**
     * Get network information
     * @returns {Promise<Object>} - Network information
     */
    async getNetworkInfo() {
        try {
            const chainId = await this.web3.eth.getChainId();
            const blockNumber = await this.web3.eth.getBlockNumber();
            const gasPrice = await this.web3.eth.getGasPrice();

            return {
                chainId: chainId,
                blockNumber: blockNumber,
                gasPrice: gasPrice
            };

        } catch (error) {
            console.error('[Web3Utils] Failed to get network info:', error);
            throw error;
        }
    }

    /**
     * Sign message
     * @param {string} message - Message to sign
     * @param {string} privateKey - Private key
     * @returns {string} - Signature
     */
    static signMessage(message, privateKey) {
        const web3 = new Web3();
        return web3.eth.accounts.sign(message, privateKey);
    }

    /**
     * Verify message signature
     * @param {string} message - Original message
     * @param {string} signature - Signature
     * @returns {string} - Recovered address
     */
    static verifyMessage(message, signature) {
        const web3 = new Web3();
        return web3.eth.accounts.recover(message, signature);
    }

    /**
     * Validate Ethereum address
     * @param {string} address - Address to validate
     * @returns {boolean} - True if valid
     */
    static isValidAddress(address) {
        const web3 = new Web3();
        return web3.utils.isAddress(address);
    }

    /**
     * Convert address to checksum format
     * @param {string} address - Address to convert
     * @returns {string} - Checksum address
     */
    static toChecksumAddress(address) {
        const web3 = new Web3();
        return web3.utils.toChecksumAddress(address);
    }

    /**
     * Format ETH amount
     * @param {string} amount - Amount in wei
     * @param {number} decimals - Number of decimal places
     * @returns {string} - Formatted amount
     */
    static formatEther(amount, decimals = 4) {
        const web3 = new Web3();
        const eth = web3.utils.fromWei(amount, 'ether');
        return parseFloat(eth).toFixed(decimals);
    }

    /**
     * Parse ETH amount to wei
     * @param {string} amount - Amount in ETH
     * @returns {string} - Amount in wei
     */
    static parseEther(amount) {
        const web3 = new Web3();
        return web3.utils.toWei(amount, 'ether');
    }

    /**
     * Generate random wallet
     * @returns {Object} - Wallet object with address and private key
     */
    static generateWallet() {
        const web3 = new Web3();
        const account = web3.eth.accounts.create();
        return {
            address: account.address,
            privateKey: account.privateKey
        };
    }

    /**
     * Hash data using Keccak256
     * @param {string} data - Data to hash
     * @returns {string} - Hash
     */
    static keccak256(data) {
        const web3 = new Web3();
        return web3.utils.keccak256(data);
    }

    /**
     * Convert hex to bytes
     * @param {string} hex - Hex string
     * @returns {Array} - Byte array
     */
    static hexToBytes(hex) {
        const web3 = new Web3();
        return web3.utils.hexToBytes(hex);
    }

    /**
     * Convert bytes to hex
     * @param {Array} bytes - Byte array
     * @returns {string} - Hex string
     */
    static bytesToHex(bytes) {
        const web3 = new Web3();
        return web3.utils.bytesToHex(bytes);
    }

    /**
     * Encode function call
     * @param {string} abi - Function ABI
     * @param {Array} params - Function parameters
     * @returns {string} - Encoded function call
     */
    static encodeFunctionCall(abi, params) {
        const web3 = new Web3();
        return web3.eth.abi.encodeFunctionCall(abi, params);
    }

    /**
     * Decode function parameters
     * @param {string} abi - Function ABI
     * @param {string} data - Encoded data
     * @returns {Array} - Decoded parameters
     */
    static decodeFunctionParameters(abi, data) {
        const web3 = new Web3();
        return web3.eth.abi.decodeParameters(abi, data);
    }
}

module.exports = Web3Utils;
