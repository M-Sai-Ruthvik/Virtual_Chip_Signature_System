/**
 * UI_Feedback_Module - Receipt_Processor.js
 * Processes blockchain transaction receipts and provides user feedback
 * Handles receipt validation, status tracking, and error reporting
 */

class ReceiptProcessor {
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            retryDelay: 2000,
            confirmationBlocks: 1,
            timeout: 30000,
            ...options
        };
        
        this.pendingReceipts = new Map();
        this.processedReceipts = new Map();
        this.errorHandlers = new Map();
        this.successHandlers = new Map();
    }

    /**
     * Process transaction receipt
     * @param {string} txHash - Transaction hash
     * @param {Object} provider - Ethers provider
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed receipt
     */
    async processReceipt(txHash, provider, options = {}) {
        const processingOptions = { ...this.options, ...options };
        
        try {
            // Check if already processed
            if (this.processedReceipts.has(txHash)) {
                return this.processedReceipts.get(txHash);
            }

            // Add to pending receipts
            this.pendingReceipts.set(txHash, {
                status: 'PENDING',
                startTime: Date.now(),
                retries: 0
            });

            // Wait for transaction receipt
            const receipt = await this.waitForReceipt(txHash, provider, processingOptions);
            
            // Process the receipt
            const processedReceipt = this.analyzeReceipt(receipt, txHash);
            
            // Store processed receipt
            this.processedReceipts.set(txHash, processedReceipt);
            this.pendingReceipts.delete(txHash);
            
            // Trigger success handler
            this.triggerSuccessHandler(txHash, processedReceipt);
            
            return processedReceipt;

        } catch (error) {
            // Handle processing error
            const errorReceipt = this.createErrorReceipt(txHash, error);
            this.processedReceipts.set(txHash, errorReceipt);
            this.pendingReceipts.delete(txHash);
            
            // Trigger error handler
            this.triggerErrorHandler(txHash, errorReceipt);
            
            throw error;
        }
    }

    /**
     * Wait for transaction receipt
     * @param {string} txHash - Transaction hash
     * @param {Object} provider - Ethers provider
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Transaction receipt
     */
    async waitForReceipt(txHash, provider, options) {
        const { maxRetries, retryDelay, confirmationBlocks, timeout } = options;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                // Wait for transaction with confirmations
                const receipt = await Promise.race([
                    provider.waitForTransaction(txHash, confirmationBlocks),
                    this.createTimeout(timeout)
                ]);

                if (receipt) {
                    return receipt;
                }

            } catch (error) {
                retries++;
                
                if (retries >= maxRetries) {
                    throw new Error(`Failed to get receipt after ${maxRetries} retries: ${error.message}`);
                }

                // Wait before retry
                await this.delay(retryDelay * retries);
            }
        }

        throw new Error('Transaction receipt timeout');
    }

    /**
     * Create timeout promise
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Timeout promise
     */
    createTimeout(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Transaction timeout')), timeout);
        });
    }

    /**
     * Delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Analyze transaction receipt
     * @param {Object} receipt - Raw transaction receipt
     * @param {string} txHash - Transaction hash
     * @returns {Object} Analyzed receipt
     */
    analyzeReceipt(receipt, txHash) {
        const analyzed = {
            txHash,
            status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            confirmations: receipt.confirmations,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice.toString(),
            cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
            from: receipt.from,
            to: receipt.to,
            contractAddress: receipt.contractAddress,
            logs: receipt.logs || [],
            processedAt: new Date().toISOString(),
            analysis: {
                isSuccess: receipt.status === 1,
                hasLogs: receipt.logs && receipt.logs.length > 0,
                gasEfficiency: this.calculateGasEfficiency(receipt),
                confirmationLevel: this.getConfirmationLevel(receipt.confirmations),
                estimatedCost: this.estimateTransactionCost(receipt)
            }
        };

        // Analyze logs if present
        if (receipt.logs && receipt.logs.length > 0) {
            analyzed.logAnalysis = this.analyzeLogs(receipt.logs);
        }

        return analyzed;
    }

    /**
     * Calculate gas efficiency
     * @param {Object} receipt - Transaction receipt
     * @returns {Object} Gas efficiency metrics
     */
    calculateGasEfficiency(receipt) {
        const gasUsed = parseInt(receipt.gasUsed.toString());
        const gasPrice = parseInt(receipt.effectiveGasPrice.toString());
        
        return {
            gasUsed,
            gasPrice,
            totalCost: gasUsed * gasPrice,
            efficiency: gasUsed < 100000 ? 'HIGH' : gasUsed < 300000 ? 'MEDIUM' : 'LOW'
        };
    }

    /**
     * Get confirmation level
     * @param {number} confirmations - Number of confirmations
     * @returns {string} Confirmation level
     */
    getConfirmationLevel(confirmations) {
        if (confirmations >= 12) return 'FINAL';
        if (confirmations >= 6) return 'HIGH';
        if (confirmations >= 3) return 'MEDIUM';
        if (confirmations >= 1) return 'LOW';
        return 'PENDING';
    }

    /**
     * Estimate transaction cost
     * @param {Object} receipt - Transaction receipt
     * @returns {Object} Cost estimation
     */
    estimateTransactionCost(receipt) {
        const gasUsed = parseInt(receipt.gasUsed.toString());
        const gasPrice = parseInt(receipt.effectiveGasPrice.toString());
        const totalWei = gasUsed * gasPrice;
        
        return {
            wei: totalWei,
            gwei: totalWei / 1e9,
            eth: totalWei / 1e18,
            usd: this.estimateUSD(totalWei)
        };
    }

    /**
     * Estimate USD value (placeholder)
     * @param {number} wei - Wei amount
     * @returns {number} USD estimate
     */
    estimateUSD(wei) {
        // This would typically fetch current ETH price
        const ethPrice = 2000; // Placeholder USD price
        const ethAmount = wei / 1e18;
        return ethAmount * ethPrice;
    }

    /**
     * Analyze transaction logs
     * @param {Array} logs - Transaction logs
     * @returns {Object} Log analysis
     */
    analyzeLogs(logs) {
        const analysis = {
            totalLogs: logs.length,
            eventTypes: {},
            contractInteractions: [],
            errors: []
        };

        logs.forEach((log, index) => {
            // Count event types
            const eventType = log.topics[0] || 'unknown';
            analysis.eventTypes[eventType] = (analysis.eventTypes[eventType] || 0) + 1;

            // Analyze contract interactions
            if (log.address) {
                analysis.contractInteractions.push({
                    contract: log.address,
                    topics: log.topics,
                    data: log.data,
                    index
                });
            }

            // Check for error events
            if (log.topics.some(topic => topic.includes('error') || topic.includes('fail'))) {
                analysis.errors.push({
                    logIndex: index,
                    contract: log.address,
                    topics: log.topics,
                    data: log.data
                });
            }
        });

        return analysis;
    }

    /**
     * Create error receipt
     * @param {string} txHash - Transaction hash
     * @param {Error} error - Error object
     * @returns {Object} Error receipt
     */
    createErrorReceipt(txHash, error) {
        return {
            txHash,
            status: 'ERROR',
            error: {
                message: error.message,
                code: error.code || 'UNKNOWN',
                stack: error.stack
            },
            processedAt: new Date().toISOString(),
            analysis: {
                isSuccess: false,
                hasLogs: false,
                gasEfficiency: null,
                confirmationLevel: 'FAILED',
                estimatedCost: null
            }
        };
    }

    /**
     * Get receipt status
     * @param {string} txHash - Transaction hash
     * @returns {Object} Receipt status
     */
    getReceiptStatus(txHash) {
        if (this.processedReceipts.has(txHash)) {
            return this.processedReceipts.get(txHash);
        }
        
        if (this.pendingReceipts.has(txHash)) {
            return this.pendingReceipts.get(txHash);
        }
        
        return { status: 'NOT_FOUND' };
    }

    /**
     * Get all processed receipts
     * @returns {Array} All processed receipts
     */
    getAllReceipts() {
        return Array.from(this.processedReceipts.values());
    }

    /**
     * Get pending receipts
     * @returns {Array} Pending receipts
     */
    getPendingReceipts() {
        return Array.from(this.pendingReceipts.entries()).map(([txHash, data]) => ({
            txHash,
            ...data
        }));
    }

    /**
     * Add success handler
     * @param {string} txHash - Transaction hash
     * @param {Function} handler - Success handler function
     */
    addSuccessHandler(txHash, handler) {
        this.successHandlers.set(txHash, handler);
    }

    /**
     * Add error handler
     * @param {string} txHash - Transaction hash
     * @param {Function} handler - Error handler function
     */
    addErrorHandler(txHash, handler) {
        this.errorHandlers.set(txHash, handler);
    }

    /**
     * Trigger success handler
     * @param {string} txHash - Transaction hash
     * @param {Object} receipt - Processed receipt
     */
    triggerSuccessHandler(txHash, receipt) {
        const handler = this.successHandlers.get(txHash);
        if (handler) {
            try {
                handler(receipt);
            } catch (error) {
                console.error('Error in success handler:', error);
            }
        }
    }

    /**
     * Trigger error handler
     * @param {string} txHash - Transaction hash
     * @param {Object} receipt - Error receipt
     */
    triggerErrorHandler(txHash, receipt) {
        const handler = this.errorHandlers.get(txHash);
        if (handler) {
            try {
                handler(receipt);
            } catch (error) {
                console.error('Error in error handler:', error);
            }
        }
    }

    /**
     * Clear processed receipts
     * @param {number} maxAge - Maximum age in hours
     */
    clearOldReceipts(maxAge = 24) {
        const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
        
        for (const [txHash, receipt] of this.processedReceipts.entries()) {
            const receiptTime = new Date(receipt.processedAt).getTime();
            if (receiptTime < cutoffTime) {
                this.processedReceipts.delete(txHash);
            }
        }
    }

    /**
     * Get receipt statistics
     * @returns {Object} Receipt statistics
     */
    getReceiptStats() {
        const receipts = this.getAllReceipts();
        const stats = {
            total: receipts.length,
            byStatus: {},
            byConfirmationLevel: {},
            averageGasUsed: 0,
            totalCost: 0
        };

        let totalGas = 0;
        let totalCost = 0;

        receipts.forEach(receipt => {
            // Count by status
            const status = receipt.status;
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            // Count by confirmation level
            const confirmationLevel = receipt.analysis?.confirmationLevel || 'UNKNOWN';
            stats.byConfirmationLevel[confirmationLevel] = (stats.byConfirmationLevel[confirmationLevel] || 0) + 1;

            // Calculate gas and cost
            if (receipt.analysis?.gasEfficiency) {
                totalGas += receipt.analysis.gasEfficiency.gasUsed;
                totalCost += receipt.analysis.gasEfficiency.totalCost;
            }
        });

        if (receipts.length > 0) {
            stats.averageGasUsed = Math.round(totalGas / receipts.length);
            stats.totalCost = totalCost;
        }

        return stats;
    }

    /**
     * Export receipts
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported data
     */
    exportReceipts(format = 'json') {
        const receipts = this.getAllReceipts();
        
        if (format === 'json') {
            return JSON.stringify(receipts, null, 2);
        } else if (format === 'csv') {
            const headers = ['txHash', 'status', 'blockNumber', 'gasUsed', 'effectiveGasPrice', 'processedAt'];
            const csvRows = [headers.join(',')];
            
            receipts.forEach(receipt => {
                const row = [
                    receipt.txHash,
                    receipt.status,
                    receipt.blockNumber || '',
                    receipt.gasUsed || '',
                    receipt.effectiveGasPrice || '',
                    receipt.processedAt
                ];
                csvRows.push(row.join(','));
            });
            
            return csvRows.join('\n');
        }
        
        return '';
    }

    /**
     * Validate receipt format
     * @param {Object} receipt - Receipt to validate
     * @returns {Object} Validation result
     */
    validateReceipt(receipt) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!receipt.txHash) errors.push('Missing txHash');
        if (!receipt.status) errors.push('Missing status');
        if (!receipt.processedAt) errors.push('Missing processedAt');

        // Status validation
        if (receipt.status && !['SUCCESS', 'FAILED', 'ERROR', 'PENDING'].includes(receipt.status)) {
            warnings.push('Invalid status value');
        }

        // Gas validation
        if (receipt.gasUsed && isNaN(parseInt(receipt.gasUsed))) {
            errors.push('Invalid gasUsed value');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReceiptProcessor;
}

// Example usage:
/*
const processor = new ReceiptProcessor({
    maxRetries: 3,
    retryDelay: 2000,
    confirmationBlocks: 1
});

// Process a receipt
const receipt = await processor.processReceipt(
    '0x1234...',
    provider,
    { timeout: 30000 }
);

console.log('Processed receipt:', receipt);

// Add handlers
processor.addSuccessHandler('0x1234...', (receipt) => {
    console.log('Transaction successful:', receipt.txHash);
});

processor.addErrorHandler('0x1234...', (receipt) => {
    console.log('Transaction failed:', receipt.error.message);
});

// Get statistics
const stats = processor.getReceiptStats();
console.log('Receipt statistics:', stats);
*/

// Export an instance method for compatibility
const receiptProcessorInstance = new ReceiptProcessor();
export const processReceipt = receiptProcessorInstance.processReceipt.bind(receiptProcessorInstance);
