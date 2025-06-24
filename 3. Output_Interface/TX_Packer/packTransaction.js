/**
 * TX_Packer - packTransaction.js
 * Prepares signature data for blockchain submission
 * Handles transaction formatting, validation, and gas estimation
 */

const { ethers } = require("ethers");

class TransactionPacker {
    constructor(provider = null, chainId = 11155111) { // Default to Sepolia
        this.provider = provider;
        this.chainId = chainId;
        this.gasPrice = null;
        this.maxFeePerGas = null;
        this.maxPriorityFeePerGas = null;
        this.defaultGasLimit = 300000;
    }

    /**
     * Set provider and update gas settings
     * @param {Object} provider - Ethers provider
     */
    setProvider(provider) {
        this.provider = provider;
        this.updateGasSettings();
    }

    /**
     * Update gas settings from network
     */
    async updateGasSettings() {
        if (!this.provider) return;

        try {
            const feeData = await this.provider.getFeeData();
            this.gasPrice = feeData.gasPrice;
            this.maxFeePerGas = feeData.maxFeePerGas;
            this.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } catch (error) {
            console.warn("Failed to update gas settings:", error.message);
        }
    }

    /**
     * Validate signature data
     * @param {Object} signatureData - Signature data
     * @returns {Object} Validation result
     */
    validateSignatureData(signatureData) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!signatureData.signature) {
            errors.push("Missing signature object");
        } else {
            const { r, s, v } = signatureData.signature;
            
            if (!r || r.length !== 64) {
                errors.push("Invalid signature R component");
            }
            if (!s || s.length !== 64) {
                errors.push("Invalid signature S component");
            }
            if (!v || !["1b", "1c"].includes(v)) {
                errors.push("Invalid signature V component");
            }
        }

        if (!signatureData.hash || signatureData.hash.length !== 64) {
            errors.push("Invalid hash length");
        }

        if (!signatureData.timestamp) {
            warnings.push("Missing timestamp");
        }

        // Validate hash format
        if (signatureData.hash && !/^[0-9a-fA-F]{64}$/.test(signatureData.hash)) {
            errors.push("Invalid hash format");
        }

        // Validate signature components format
        if (signatureData.signature) {
            const { r, s } = signatureData.signature;
            if (r && !/^[0-9a-fA-F]{64}$/.test(r)) {
                errors.push("Invalid signature R format");
            }
            if (s && !/^[0-9a-fA-F]{64}$/.test(s)) {
                errors.push("Invalid signature S format");
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Pack signature data for blockchain transaction
     * @param {Object} signatureData - Signature data
     * @param {Object} options - Packing options
     * @returns {Object} Packed transaction data
     */
    packSignatureTransaction(signatureData, options = {}) {
        const {
            contractAddress = "",
            methodName = "verifySignature",
            includeMetadata = true,
            compressData = false
        } = options;

        // Validate signature data
        const validation = this.validateSignatureData(signatureData);
        if (!validation.isValid) {
            throw new Error(`Invalid signature data: ${validation.errors.join(", ")}`);
        }

        // Normalize signature components
        const normalizedSignature = {
            r: this.normalizeHex(signatureData.signature.r),
            s: this.normalizeHex(signatureData.signature.s),
            v: this.normalizeHex(signatureData.signature.v)
        };

        const normalizedHash = this.normalizeHex(signatureData.hash);

        // Create transaction data
        const txData = {
            signature: normalizedSignature,
            hash: normalizedHash,
            timestamp: signatureData.timestamp || Date.now().toString(),
            metadata: includeMetadata ? (signatureData.metadata || {}) : {},
            validation: validation,
            packedAt: new Date().toISOString()
        };

        // Create contract call data
        const contractData = this.createContractCallData(txData, methodName);

        // Estimate gas if provider is available
        let gasEstimate = this.defaultGasLimit;
        if (this.provider) {
            gasEstimate = this.estimateGas(contractData);
        }

        // Create transaction object
        const transaction = {
            to: contractAddress,
            data: contractData,
            gasLimit: gasEstimate,
            chainId: this.chainId,
            type: 2, // EIP-1559 transaction
            maxFeePerGas: this.maxFeePerGas,
            maxPriorityFeePerGas: this.maxPriorityFeePerGas
        };

        // Add legacy gas price if EIP-1559 not supported
        if (!this.maxFeePerGas) {
            transaction.gasPrice = this.gasPrice;
            transaction.type = 0; // Legacy transaction
        }

        return {
            transaction,
            packedData: txData,
            validation,
            gasEstimate,
            contractAddress,
            methodName
        };
    }

    /**
     * Create contract call data
     * @param {Object} txData - Transaction data
     * @param {string} methodName - Contract method name
     * @returns {string} Contract call data
     */
    createContractCallData(txData, methodName) {
        // Define contract ABI for signature verification
        const abi = [
            "function verifySignature(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public view returns (bool)",
            "function verifySignatureWithMetadata(bytes32 hash, uint8 v, bytes32 r, bytes32 s, string memory metadata) public view returns (bool)"
        ];

        const iface = new ethers.utils.Interface(abi);

        // Prepare parameters
        const hash = "0x" + txData.hash;
        const v = parseInt(txData.signature.v, 16);
        const r = "0x" + txData.signature.r;
        const s = "0x" + txData.signature.s;

        let callData;
        if (methodName === "verifySignatureWithMetadata" && Object.keys(txData.metadata).length > 0) {
            const metadata = JSON.stringify(txData.metadata);
            callData = iface.encodeFunctionData("verifySignatureWithMetadata", [hash, v, r, s, metadata]);
        } else {
            callData = iface.encodeFunctionData("verifySignature", [hash, v, r, s]);
        }

        return callData;
    }

    /**
     * Estimate gas for transaction
     * @param {string} callData - Contract call data
     * @returns {number} Gas estimate
     */
    estimateGas(callData) {
        if (!this.provider) {
            return this.defaultGasLimit;
        }

        try {
            // This is a simplified gas estimation
            // In a real implementation, you would call provider.estimateGas()
            const baseGas = 21000;
            const dataGas = callData.length / 2 * 16; // 16 gas per byte
            const contractGas = 50000; // Estimated contract execution gas
            
            return Math.ceil(baseGas + dataGas + contractGas);
        } catch (error) {
            console.warn("Gas estimation failed, using default:", error.message);
            return this.defaultGasLimit;
        }
    }

    /**
     * Normalize hexadecimal string
     * @param {string} hex - Hex string to normalize
     * @returns {string} Normalized hex string
     */
    normalizeHex(hex) {
        if (!hex) return "";
        
        // Remove 0x prefix if present
        hex = hex.replace(/^0x/i, "");
        
        // Remove spaces and convert to lowercase
        hex = hex.replace(/\s+/g, "").toLowerCase();
        
        // Ensure even length
        if (hex.length % 2 !== 0) {
            hex = "0" + hex;
        }
        
        return hex;
    }

    /**
     * Pack multiple signatures into batch transaction
     * @param {Array} signaturesArray - Array of signature data
     * @param {Object} options - Packing options
     * @returns {Object} Batch transaction data
     */
    packBatchTransaction(signaturesArray, options = {}) {
        const {
            contractAddress = "",
            maxBatchSize = 10,
            includeMetadata = false
        } = options;

        if (!Array.isArray(signaturesArray) || signaturesArray.length === 0) {
            throw new Error("Invalid signatures array");
        }

        if (signaturesArray.length > maxBatchSize) {
            throw new Error(`Batch size exceeds maximum of ${maxBatchSize}`);
        }

        // Validate all signatures
        const validationResults = signaturesArray.map((sig, index) => ({
            index,
            validation: this.validateSignatureData(sig)
        }));

        const invalidSignatures = validationResults.filter(r => !r.validation.isValid);
        if (invalidSignatures.length > 0) {
            throw new Error(`Invalid signatures found at indices: ${invalidSignatures.map(s => s.index).join(", ")}`);
        }

        // Pack each signature
        const packedSignatures = signaturesArray.map(sig => ({
            r: "0x" + this.normalizeHex(sig.signature.r),
            s: "0x" + this.normalizeHex(sig.signature.s),
            v: parseInt(this.normalizeHex(sig.signature.v), 16),
            hash: "0x" + this.normalizeHex(sig.hash)
        }));

        // Create batch contract call data
        const batchData = this.createBatchContractCallData(packedSignatures, includeMetadata);

        // Estimate gas for batch
        const gasEstimate = this.estimateBatchGas(batchData, signaturesArray.length);

        const transaction = {
            to: contractAddress,
            data: batchData,
            gasLimit: gasEstimate,
            chainId: this.chainId,
            type: 2,
            maxFeePerGas: this.maxFeePerGas,
            maxPriorityFeePerGas: this.maxPriorityFeePerGas
        };

        if (!this.maxFeePerGas) {
            transaction.gasPrice = this.gasPrice;
            transaction.type = 0;
        }

        return {
            transaction,
            packedSignatures,
            validationResults,
            gasEstimate,
            batchSize: signaturesArray.length,
            contractAddress
        };
    }

    /**
     * Create batch contract call data
     * @param {Array} packedSignatures - Packed signatures
     * @param {boolean} includeMetadata - Include metadata
     * @returns {string} Batch call data
     */
    createBatchContractCallData(packedSignatures, includeMetadata) {
        // This would require a custom contract with batch verification
        // For now, we will create a simple concatenated call
        const abi = [
            "function verifyBatchSignatures(bytes32[] memory hashes, uint8[] memory v, bytes32[] memory r, bytes32[] memory s) public view returns (bool[])"
        ];

        const iface = new ethers.utils.Interface(abi);

        const hashes = packedSignatures.map(sig => sig.hash);
        const v = packedSignatures.map(sig => sig.v);
        const r = packedSignatures.map(sig => sig.r);
        const s = packedSignatures.map(sig => sig.s);

        return iface.encodeFunctionData("verifyBatchSignatures", [hashes, v, r, s]);
    }

    /**
     * Estimate gas for batch transaction
     * @param {string} callData - Contract call data
     * @param {number} batchSize - Number of signatures
     * @returns {number} Gas estimate
     */
    estimateBatchGas(callData, batchSize) {
        const baseGas = 21000;
        const dataGas = callData.length / 2 * 16;
        const contractGas = 50000 * batchSize; // Gas per signature
        
        return Math.ceil(baseGas + dataGas + contractGas);
    }

    /**
     * Create transaction receipt template
     * @param {Object} packedTx - Packed transaction
     * @param {string} txHash - Transaction hash
     * @returns {Object} Transaction receipt
     */
    createTransactionReceipt(packedTx, txHash) {
        return {
            txHash,
            status: "PENDING",
            timestamp: new Date().toISOString(),
            chainId: this.chainId,
            gasEstimate: packedTx.gasEstimate,
            contractAddress: packedTx.contractAddress,
            methodName: packedTx.methodName,
            signature: {
                r: packedTx.packedData.signature.r.substring(0, 16) + "...",
                s: packedTx.packedData.signature.s.substring(0, 16) + "...",
                v: packedTx.packedData.signature.v
            },
            hash: packedTx.packedData.hash.substring(0, 16) + "...",
            validation: packedTx.validation
        };
    }

    /**
     * Get transaction status
     * @param {string} txHash - Transaction hash
     * @returns {Object} Transaction status
     */
    async getTransactionStatus(txHash) {
        if (!this.provider) {
            throw new Error("Provider not set");
        }

        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (!receipt) {
                return { status: "PENDING", confirmations: 0 };
            }

            return {
                status: receipt.status === 1 ? "SUCCESS" : "FAILED",
                confirmations: receipt.confirmations,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString()
            };
        } catch (error) {
            throw new Error(`Failed to get transaction status: ${error.message}`);
        }
    }

    /**
     * Wait for transaction confirmation
     * @param {string} txHash - Transaction hash
     * @param {number} confirmations - Required confirmations
     * @returns {Object} Transaction receipt
     */
    async waitForConfirmation(txHash, confirmations = 1) {
        if (!this.provider) {
            throw new Error("Provider not set");
        }

        try {
            const receipt = await this.provider.waitForTransaction(txHash, confirmations);
            return {
                status: receipt.status === 1 ? "SUCCESS" : "FAILED",
                confirmations: receipt.confirmations,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString()
            };
        } catch (error) {
            throw new Error(`Transaction confirmation failed: ${error.message}`);
        }
    }
}

// Export the class
module.exports = TransactionPacker;
