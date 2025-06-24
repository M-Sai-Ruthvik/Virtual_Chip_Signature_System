/**
 * Logger - logSignatureInfo.js
 * Comprehensive logging system for signature operations
 * Tracks signature generation, validation, and blockchain submissions
 */

const fs = require('fs');
const path = require('path');

class SignatureLogger {
    constructor(logDir = './logs') {
        this.logDir = logDir;
        this.ensureLogDirectory();
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        this.currentLogLevel = this.logLevels.INFO;
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Set logging level
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
     */
    setLogLevel(level) {
        if (this.logLevels[level] !== undefined) {
            this.currentLogLevel = this.logLevels[level];
        }
    }

    /**
     * Get current timestamp
     * @returns {string} ISO timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     * @returns {string} Formatted log message
     */
    formatLogMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        return JSON.stringify(logEntry) + '\n';
    }

    /**
     * Write log to file
     * @param {string} filename - Log filename
     * @param {string} content - Log content
     */
    writeLog(filename, content) {
        const logPath = path.join(this.logDir, filename);
        fs.appendFileSync(logPath, content);
    }

    /**
     * Log signature generation
     * @param {Object} signatureData - Signature data
     * @param {string} sessionId - Session ID
     * @param {Object} metadata - Additional metadata
     */
    logSignatureGeneration(signatureData, sessionId, metadata = {}) {
        const message = `Signature generated for session ${sessionId}`;
        const data = {
            sessionId,
            signature: {
                r: signatureData.signature?.r?.substring(0, 16) + '...',
                s: signatureData.signature?.s?.substring(0, 16) + '...',
                v: signatureData.signature?.v
            },
            hash: signatureData.hash?.substring(0, 16) + '...',
            timestamp: signatureData.timestamp,
            metadata
        };

        this.log('INFO', message, data);
        this.writeLog('signature_generation.log', this.formatLogMessage('INFO', message, data));
    }

    /**
     * Log signature validation
     * @param {Object} validationResult - Validation result
     * @param {string} sessionId - Session ID
     */
    logSignatureValidation(validationResult, sessionId) {
        const message = `Signature validation ${validationResult.isValid ? 'PASSED' : 'FAILED'} for session ${sessionId}`;
        const data = {
            sessionId,
            isValid: validationResult.isValid,
            errors: validationResult.errors || [],
            timestamp: this.getTimestamp()
        };

        const level = validationResult.isValid ? 'INFO' : 'ERROR';
        this.log(level, message, data);
        this.writeLog('signature_validation.log', this.formatLogMessage(level, message, data));
    }

    /**
     * Log blockchain submission
     * @param {Object} txData - Transaction data
     * @param {string} sessionId - Session ID
     * @param {string} status - Submission status
     */
    logBlockchainSubmission(txData, sessionId, status = 'PENDING') {
        const message = `Blockchain submission ${status} for session ${sessionId}`;
        const data = {
            sessionId,
            status,
            txHash: txData.txHash || null,
            gasUsed: txData.gasUsed || null,
            blockNumber: txData.blockNumber || null,
            timestamp: this.getTimestamp(),
            network: txData.network || 'sepolia'
        };

        const level = status === 'SUCCESS' ? 'INFO' : 
                     status === 'FAILED' ? 'ERROR' : 'WARN';
        
        this.log(level, message, data);
        this.writeLog('blockchain_submission.log', this.formatLogMessage(level, message, data));
    }

    /**
     * Log file processing
     * @param {string} filePath - File path
     * @param {string} format - File format
     * @param {string} sessionId - Session ID
     * @param {boolean} success - Processing success
     */
    logFileProcessing(filePath, format, sessionId, success) {
        const message = `File processing ${success ? 'SUCCESS' : 'FAILED'} for ${filePath}`;
        const data = {
            sessionId,
            filePath,
            format,
            success,
            timestamp: this.getTimestamp()
        };

        const level = success ? 'INFO' : 'ERROR';
        this.log(level, message, data);
        this.writeLog('file_processing.log', this.formatLogMessage(level, message, data));
    }

    /**
     * Log error
     * @param {string} error - Error message
     * @param {string} sessionId - Session ID
     * @param {Object} context - Error context
     */
    logError(error, sessionId = null, context = {}) {
        const message = `Error occurred${sessionId ? ` in session ${sessionId}` : ''}`;
        const data = {
            sessionId,
            error: error.message || error,
            stack: error.stack,
            context,
            timestamp: this.getTimestamp()
        };

        this.log('ERROR', message, data);
        this.writeLog('errors.log', this.formatLogMessage('ERROR', message, data));
    }

    /**
     * Log performance metrics
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {string} sessionId - Session ID
     */
    logPerformance(operation, duration, sessionId) {
        const message = `Performance metric for ${operation}`;
        const data = {
            sessionId,
            operation,
            duration,
            timestamp: this.getTimestamp()
        };

        this.log('DEBUG', message, data);
        this.writeLog('performance.log', this.formatLogMessage('DEBUG', message, data));
    }

    /**
     * Log user activity
     * @param {string} action - User action
     * @param {string} sessionId - Session ID
     * @param {Object} userData - User data
     */
    logUserActivity(action, sessionId, userData = {}) {
        const message = `User activity: ${action}`;
        const data = {
            sessionId,
            action,
            userData: {
                walletAddress: userData.walletAddress?.substring(0, 10) + '...',
                timestamp: this.getTimestamp()
            }
        };

        this.log('INFO', message, data);
        this.writeLog('user_activity.log', this.formatLogMessage('INFO', message, data));
    }

    /**
     * Log system events
     * @param {string} event - System event
     * @param {Object} data - Event data
     */
    logSystemEvent(event, data = {}) {
        const message = `System event: ${event}`;
        const logData = {
            event,
            data,
            timestamp: this.getTimestamp()
        };

        this.log('INFO', message, logData);
        this.writeLog('system_events.log', this.formatLogMessage('INFO', message, logData));
    }

    /**
     * Main logging function
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    log(level, message, data = null) {
        if (this.logLevels[level] >= this.currentLogLevel) {
            const logMessage = this.formatLogMessage(level, message, data);
            console.log(logMessage.trim());
            
            // Write to general log file
            this.writeLog('general.log', logMessage);
        }
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    getLogStats() {
        const stats = {
            totalLogs: 0,
            byLevel: {},
            byFile: {}
        };

        const logFiles = [
            'general.log',
            'signature_generation.log',
            'signature_validation.log',
            'blockchain_submission.log',
            'file_processing.log',
            'errors.log',
            'performance.log',
            'user_activity.log',
            'system_events.log'
        ];

        for (const file of logFiles) {
            const filePath = path.join(this.logDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                stats.byFile[file] = lines.length;
                stats.totalLogs += lines.length;

                // Count by level
                for (const line of lines) {
                    try {
                        const logEntry = JSON.parse(line);
                        const level = logEntry.level;
                        stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
                    } catch (e) {
                        // Skip malformed log entries
                    }
                }
            }
        }

        return stats;
    }

    /**
     * Clean old log files
     * @param {number} daysToKeep - Number of days to keep logs
     */
    cleanOldLogs(daysToKeep = 30) {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        if (fs.existsSync(this.logDir)) {
            const files = fs.readdirSync(this.logDir);
            
            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old log file: ${file}`);
                }
            }
        }
    }

    /**
     * Export logs for analysis
     * @param {string} format - Export format (json, csv)
     * @param {string} outputPath - Output file path
     */
    exportLogs(format = 'json', outputPath = null) {
        const logs = [];
        const logFiles = [
            'general.log',
            'signature_generation.log',
            'signature_validation.log',
            'blockchain_submission.log'
        ];

        for (const file of logFiles) {
            const filePath = path.join(this.logDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                
                for (const line of lines) {
                    try {
                        const logEntry = JSON.parse(line);
                        logs.push(logEntry);
                    } catch (e) {
                        // Skip malformed entries
                    }
                }
            }
        }

        if (format === 'json') {
            const output = outputPath || path.join(this.logDir, 'exported_logs.json');
            fs.writeFileSync(output, JSON.stringify(logs, null, 2));
        } else if (format === 'csv') {
            const output = outputPath || path.join(this.logDir, 'exported_logs.csv');
            const csvHeader = 'timestamp,level,message,data\n';
            const csvContent = logs.map(log => 
                `"${log.timestamp}","${log.level}","${log.message}","${JSON.stringify(log.data)}"`
            ).join('\n');
            fs.writeFileSync(output, csvHeader + csvContent);
        }

        return logs.length;
    }
}

// Export the class
module.exports = SignatureLogger;

// Example usage:
/*
const logger = new SignatureLogger('./logs');

// Set log level
logger.setLogLevel('DEBUG');

// Log signature generation
logger.logSignatureGeneration({
    signature: { r: '1234...', s: '5678...', v: '1b' },
    hash: 'abcd...',
    timestamp: Date.now()
}, 'session123', { userId: 'user1' });

// Log validation
logger.logSignatureValidation({
    isValid: true,
    errors: []
}, 'session123');

// Get statistics
const stats = logger.getLogStats();
console.log('Log statistics:', stats);
*/
