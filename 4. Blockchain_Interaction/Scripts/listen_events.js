const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    // Network configuration
    network: 'sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR-PROJECT-ID',
    wsUrl: process.env.SEPOLIA_WS_URL || 'wss://sepolia.infura.io/ws/v3/YOUR-PROJECT-ID',
    
    // Contract configuration
    contractAddress: process.env.CONTRACT_ADDRESS || '0xYOUR_CONTRACT_ADDRESS',
    
    // Event listener configuration
    pollInterval: 15000, // 15 seconds
    maxRetries: 5,
    retryDelay: 5000, // 5 seconds
    
    // Database configuration
    logFile: path.join(__dirname, '../TX_Result_Store/verified_tx_log.json'),
    eventLogFile: path.join(__dirname, '../TX_Result_Store/event_log.json'),
    
    // Webhook configuration
    webhookUrl: process.env.WEBHOOK_URL || null,
    
    // Notification configuration
    enableNotifications: true,
    notificationTypes: ['SignatureSubmitted', 'SignatureVerified']
};

// Contract ABI (minimal for events)
const CONTRACT_ABI = [
    "event SignatureSubmitted(address indexed signer, string indexed messageHash, bytes signature, uint256 timestamp, uint256 blockNumber)",
    "event SignatureVerified(address indexed signer, string indexed messageHash, bool isValid, uint256 timestamp, uint256 blockNumber)",
    "event ContractPaused(address indexed by, uint256 timestamp)",
    "event ContractUnpaused(address indexed by, uint256 timestamp)"
];

class EventListener {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.isRunning = false;
        this.retryCount = 0;
        this.lastProcessedBlock = 0;
        this.eventCount = 0;
        this.errorCount = 0;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Event Listener...');
            
            // Initialize provider
            this.provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
            
            // Check connection
            const network = await this.provider.getNetwork();
            console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
            
            // Initialize contract
            this.contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, this.provider);
            
            // Verify contract exists
            const code = await this.provider.getCode(CONFIG.contractAddress);
            if (code === '0x') {
                throw new Error(`No contract found at address: ${CONFIG.contractAddress}`);
            }
            
            console.log(`📋 Contract verified at: ${CONFIG.contractAddress}`);
            
            // Initialize log files
            this.initializeLogFiles();
            
            // Get last processed block
            await this.loadLastProcessedBlock();
            
            console.log('✅ Event Listener initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Event Listener:', error.message);
            throw error;
        }
    }
    
    initializeLogFiles() {
        // Ensure log directory exists
        const logDir = path.dirname(CONFIG.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Initialize log files if they don't exist
        if (!fs.existsSync(CONFIG.logFile)) {
            fs.writeFileSync(CONFIG.logFile, JSON.stringify([], null, 2));
        }
        
        if (!fs.existsSync(CONFIG.eventLogFile)) {
            fs.writeFileSync(CONFIG.eventLogFile, JSON.stringify([], null, 2));
        }
    }
    
    async loadLastProcessedBlock() {
        try {
            const eventLog = JSON.parse(fs.readFileSync(CONFIG.eventLogFile, 'utf-8'));
            if (eventLog.length > 0) {
                this.lastProcessedBlock = eventLog[eventLog.length - 1].blockNumber;
                console.log(`📦 Last processed block: ${this.lastProcessedBlock}`);
            } else {
                // Start from current block if no previous events
                this.lastProcessedBlock = await this.provider.getBlockNumber();
                console.log(`📦 Starting from current block: ${this.lastProcessedBlock}`);
            }
        } catch (error) {
            console.warn('⚠️ Could not load last processed block, starting from current:', error.message);
            this.lastProcessedBlock = await this.provider.getBlockNumber();
        }
    }
    
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Event listener is already running');
            return;
        }
        
        console.log('🎯 Starting event listener...');
        this.isRunning = true;
        this.retryCount = 0;
        
        // Start polling for events
        this.pollEvents();
        
        // Also listen for new blocks
        this.provider.on('block', (blockNumber) => {
            console.log(`📦 New block: ${blockNumber}`);
        });
        
        // Handle provider errors
        this.provider.on('error', (error) => {
            console.error('❌ Provider error:', error.message);
            this.handleError(error);
        });
    }
    
    async stop() {
        console.log('🛑 Stopping event listener...');
        this.isRunning = false;
        
        if (this.provider) {
            this.provider.removeAllListeners();
        }
    }
    
    async pollEvents() {
        while (this.isRunning) {
            try {
                await this.processEvents();
                this.retryCount = 0; // Reset retry count on success
                
                // Wait before next poll
                await this.sleep(CONFIG.pollInterval);
                
            } catch (error) {
                console.error('❌ Error polling events:', error.message);
                this.handleError(error);
            }
        }
    }
    
    async processEvents() {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            
            if (this.lastProcessedBlock >= currentBlock) {
                return; // No new blocks to process
            }
            
            console.log(`🔍 Processing events from block ${this.lastProcessedBlock + 1} to ${currentBlock}`);
            
            // Get events from the contract
            const events = await this.contract.queryFilter({}, this.lastProcessedBlock + 1, currentBlock);
            
            if (events.length > 0) {
                console.log(`📝 Found ${events.length} events to process`);
                
                for (const event of events) {
                    await this.processEvent(event);
                }
            }
            
            this.lastProcessedBlock = currentBlock;
            await this.saveLastProcessedBlock();
            
        } catch (error) {
            console.error('❌ Error processing events:', error.message);
            throw error;
        }
    }
    
    async processEvent(event) {
        try {
            console.log(`📋 Processing event: ${event.event} (Block: ${event.blockNumber})`);
            
            const eventData = {
                eventName: event.event,
                blockNumber: event.blockNumber,
                blockHash: event.blockHash,
                transactionHash: event.transactionHash,
                logIndex: event.logIndex,
                timestamp: new Date().toISOString(),
                args: event.args
            };
            
            // Parse event-specific data
            switch (event.event) {
                case 'SignatureSubmitted':
                    await this.handleSignatureSubmitted(eventData);
                    break;
                    
                case 'SignatureVerified':
                    await this.handleSignatureVerified(eventData);
                    break;
                    
                case 'ContractPaused':
                    await this.handleContractPaused(eventData);
                    break;
                    
                case 'ContractUnpaused':
                    await this.handleContractUnpaused(eventData);
                    break;
                    
                default:
                    console.log(`⚠️ Unknown event: ${event.event}`);
            }
            
            // Save event to log
            await this.saveEvent(eventData);
            
            // Send webhook notification
            if (CONFIG.webhookUrl) {
                await this.sendWebhook(eventData);
            }
            
            this.eventCount++;
            
        } catch (error) {
            console.error('❌ Error processing event:', error.message);
            this.errorCount++;
        }
    }
    
    async handleSignatureSubmitted(eventData) {
        const { signer, messageHash, signature, timestamp, blockNumber } = eventData.args;
        
        console.log(`📝 Signature submitted by ${signer}`);
        console.log(`   Message Hash: ${messageHash}`);
        console.log(`   Signature: ${signature}`);
        console.log(`   Block: ${blockNumber}`);
        
        // Log to database
        const logEntry = {
            type: 'signature_submitted',
            signer: signer,
            messageHash: messageHash,
            signature: signature,
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            blockNumber: blockNumber.toString(),
            txHash: eventData.transactionHash
        };
        
        await this.saveLogEntry(logEntry);
    }
    
    async handleSignatureVerified(eventData) {
        const { signer, messageHash, isValid, timestamp, blockNumber } = eventData.args;
        
        const status = isValid ? '✅ VALID' : '❌ INVALID';
        console.log(`🔍 Signature verification: ${status}`);
        console.log(`   Signer: ${signer}`);
        console.log(`   Message Hash: ${messageHash}`);
        console.log(`   Block: ${blockNumber}`);
        
        // Log to database
        const logEntry = {
            type: 'signature_verified',
            signer: signer,
            messageHash: messageHash,
            isValid: isValid,
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            blockNumber: blockNumber.toString(),
            txHash: eventData.transactionHash
        };
        
        await this.saveLogEntry(logEntry);
    }
    
    async handleContractPaused(eventData) {
        const { by, timestamp } = eventData.args;
        
        console.log(`⏸️ Contract paused by ${by}`);
        console.log(`   Timestamp: ${new Date(parseInt(timestamp) * 1000).toISOString()}`);
        
        // Log to database
        const logEntry = {
            type: 'contract_paused',
            pausedBy: by,
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            blockNumber: eventData.blockNumber.toString(),
            txHash: eventData.transactionHash
        };
        
        await this.saveLogEntry(logEntry);
    }
    
    async handleContractUnpaused(eventData) {
        const { by, timestamp } = eventData.args;
        
        console.log(`▶️ Contract unpaused by ${by}`);
        console.log(`   Timestamp: ${new Date(parseInt(timestamp) * 1000).toISOString()}`);
        
        // Log to database
        const logEntry = {
            type: 'contract_unpaused',
            unpausedBy: by,
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            blockNumber: eventData.blockNumber.toString(),
            txHash: eventData.transactionHash
        };
        
        await this.saveLogEntry(logEntry);
    }
    
    async saveEvent(eventData) {
        try {
            const events = JSON.parse(fs.readFileSync(CONFIG.eventLogFile, 'utf-8'));
            events.push(eventData);
            fs.writeFileSync(CONFIG.eventLogFile, JSON.stringify(events, null, 2));
        } catch (error) {
            console.error('❌ Error saving event:', error.message);
        }
    }
    
    async saveLogEntry(logEntry) {
        try {
            const logs = JSON.parse(fs.readFileSync(CONFIG.logFile, 'utf-8'));
            logs.push(logEntry);
            fs.writeFileSync(CONFIG.logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('❌ Error saving log entry:', error.message);
        }
    }
    
    async saveLastProcessedBlock() {
        try {
            const eventLog = JSON.parse(fs.readFileSync(CONFIG.eventLogFile, 'utf-8'));
            if (eventLog.length > 0) {
                eventLog[eventLog.length - 1].lastProcessedBlock = this.lastProcessedBlock;
            }
            fs.writeFileSync(CONFIG.eventLogFile, JSON.stringify(eventLog, null, 2));
        } catch (error) {
            console.error('❌ Error saving last processed block:', error.message);
        }
    }
    
    async sendWebhook(eventData) {
        try {
            const response = await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`Webhook failed with status: ${response.status}`);
            }
            
            console.log('📡 Webhook sent successfully');
            
        } catch (error) {
            console.error('❌ Error sending webhook:', error.message);
        }
    }
    
    handleError(error) {
        this.errorCount++;
        console.error(`❌ Error #${this.errorCount}:`, error.message);
        
        if (this.retryCount < CONFIG.maxRetries) {
            this.retryCount++;
            console.log(`🔄 Retrying in ${CONFIG.retryDelay}ms (Attempt ${this.retryCount}/${CONFIG.maxRetries})`);
            
            setTimeout(() => {
                if (this.isRunning) {
                    this.pollEvents();
                }
            }, CONFIG.retryDelay);
        } else {
            console.error('❌ Max retries reached, stopping event listener');
            this.stop();
        }
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStats() {
        return {
            isRunning: this.isRunning,
            eventCount: this.eventCount,
            errorCount: this.errorCount,
            retryCount: this.retryCount,
            lastProcessedBlock: this.lastProcessedBlock
        };
    }
}

// Main execution
async function main() {
    const listener = new EventListener();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await listener.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await listener.stop();
        process.exit(0);
    });
    
    // Start the listener
    await listener.start();
    
    // Log stats periodically
    setInterval(() => {
        const stats = listener.getStats();
        console.log(`📊 Stats: Events: ${stats.eventCount}, Errors: ${stats.errorCount}, Block: ${stats.lastProcessedBlock}`);
    }, 60000); // Every minute
}

// Export for module usage
module.exports = { EventListener, CONFIG };

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Event listener failed:', error);
        process.exit(1);
    });
}
