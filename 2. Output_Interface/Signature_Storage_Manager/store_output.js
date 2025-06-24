/**
 * Signature_Storage_Manager - store_output.js
 * Manages storage, retrieval, and organization of signature outputs
 * Handles file management, data persistence, and cleanup operations
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SignatureStorageManager {
    constructor(storageDir = './signature_storage') {
        this.storageDir = storageDir;
        this.tempDir = path.join(storageDir, 'temp');
        this.permanentDir = path.join(storageDir, 'permanent');
        this.archiveDir = path.join(storageDir, 'archive');
        this.ensureDirectories();
        this.storageIndex = this.loadStorageIndex();
    }

    /**
     * Ensure all required directories exist
     */
    ensureDirectories() {
        const dirs = [this.storageDir, this.tempDir, this.permanentDir, this.archiveDir];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Load storage index from file
     * @returns {Object} Storage index
     */
    loadStorageIndex() {
        const indexPath = path.join(this.storageDir, 'storage_index.json');
        if (fs.existsSync(indexPath)) {
            try {
                return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            } catch (error) {
                console.warn('Failed to load storage index, creating new one');
            }
        }
        return {
            signatures: {},
            sessions: {},
            metadata: {
                totalSignatures: 0,
                totalSessions: 0,
                lastUpdated: new Date().toISOString()
            }
        };
    }

    /**
     * Save storage index to file
     */
    saveStorageIndex() {
        const indexPath = path.join(this.storageDir, 'storage_index.json');
        this.storageIndex.metadata.lastUpdated = new Date().toISOString();
        fs.writeFileSync(indexPath, JSON.stringify(this.storageIndex, null, 2));
    }

    /**
     * Generate unique file ID
     * @param {string} sessionId - Session ID
     * @param {string} type - File type
     * @returns {string} Unique file ID
     */
    generateFileId(sessionId, type) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${sessionId}_${type}_${timestamp}_${random}`;
    }

    /**
     * Store signature output
     * @param {Object} signatureData - Signature data
     * @param {string} sessionId - Session ID
     * @param {string} format - Output format
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Storage result
     */
    async storeSignatureOutput(signatureData, sessionId, format = 'json', metadata = {}) {
        try {
            const fileId = this.generateFileId(sessionId, 'signature');
            const timestamp = new Date().toISOString();
            
            // Create storage entry
            const storageEntry = {
                fileId,
                sessionId,
                timestamp,
                format,
                path: '',
                size: 0,
                metadata: {
                    ...metadata,
                    validation: signatureData.validation || { isValid: false },
                    hash: signatureData.hash,
                    signatureComponents: {
                        r: signatureData.signature?.r?.substring(0, 16) + '...',
                        s: signatureData.signature?.s?.substring(0, 16) + '...',
                        v: signatureData.signature?.v
                    }
                }
            };

            // Determine storage location based on validation
            const isValid = signatureData.validation?.isValid || false;
            const storageLocation = isValid ? this.permanentDir : this.tempDir;
            const fileName = `${fileId}.${format}`;
            const filePath = path.join(storageLocation, fileName);

            // Write file
            let fileContent;
            switch (format.toLowerCase()) {
                case 'json':
                    fileContent = JSON.stringify(signatureData, null, 2);
                    break;
                case 'txt':
                    fileContent = this.formatAsText(signatureData);
                    break;
                case 'hex':
                    fileContent = this.formatAsHex(signatureData);
                    break;
                default:
                    fileContent = JSON.stringify(signatureData, null, 2);
            }

            fs.writeFileSync(filePath, fileContent);
            
            // Update storage entry
            storageEntry.path = filePath;
            storageEntry.size = fs.statSync(filePath).size;

            // Update index
            this.storageIndex.signatures[fileId] = storageEntry;
            this.storageIndex.sessions[sessionId] = {
                ...this.storageIndex.sessions[sessionId],
                signatureFileId: fileId,
                lastUpdated: timestamp
            };
            this.storageIndex.metadata.totalSignatures++;

            // Save index
            this.saveStorageIndex();

            return {
                success: true,
                fileId,
                filePath,
                size: storageEntry.size,
                isValid
            };

        } catch (error) {
            console.error('Error storing signature output:', error);
            throw error;
        }
    }

    /**
     * Format signature data as text
     * @param {Object} signatureData - Signature data
     * @returns {string} Formatted text
     */
    formatAsText(signatureData) {
        const lines = [
            '=== SIGNATURE OUTPUT ===',
            `Timestamp: ${signatureData.timestamp}`,
            `Hash: ${signatureData.hash}`,
            '',
            'Signature Components:',
            `R: ${signatureData.signature?.r || 'N/A'}`,
            `S: ${signatureData.signature?.s || 'N/A'}`,
            `V: ${signatureData.signature?.v || 'N/A'}`,
            '',
            'Validation:',
            `Valid: ${signatureData.validation?.isValid || false}`,
            `Errors: ${signatureData.validation?.errors?.join(', ') || 'None'}`,
            '',
            'Metadata:',
            ...Object.entries(signatureData.metadata || {}).map(([k, v]) => `${k}: ${v}`)
        ];
        return lines.join('\n');
    }

    /**
     * Format signature data as hex
     * @param {Object} signatureData - Signature data
     * @returns {string} Formatted hex
     */
    formatAsHex(signatureData) {
        const components = [
            signatureData.signature?.r || '',
            signatureData.signature?.s || '',
            signatureData.signature?.v || '',
            signatureData.hash || ''
        ];
        return components.join('\n');
    }

    /**
     * Retrieve signature output
     * @param {string} fileId - File ID
     * @returns {Object} Signature data
     */
    async retrieveSignatureOutput(fileId) {
        try {
            const entry = this.storageIndex.signatures[fileId];
            if (!entry) {
                throw new Error(`Signature file not found: ${fileId}`);
            }

            if (!fs.existsSync(entry.path)) {
                throw new Error(`File not found on disk: ${entry.path}`);
            }

            const fileContent = fs.readFileSync(entry.path, 'utf8');
            let signatureData;

            switch (entry.format.toLowerCase()) {
                case 'json':
                    signatureData = JSON.parse(fileContent);
                    break;
                case 'txt':
                    signatureData = this.parseTextFormat(fileContent);
                    break;
                case 'hex':
                    signatureData = this.parseHexFormat(fileContent);
                    break;
                default:
                    signatureData = JSON.parse(fileContent);
            }

            return {
                ...signatureData,
                metadata: {
                    ...signatureData.metadata,
                    storageInfo: {
                        fileId,
                        sessionId: entry.sessionId,
                        timestamp: entry.timestamp,
                        size: entry.size,
                        path: entry.path
                    }
                }
            };

        } catch (error) {
            console.error('Error retrieving signature output:', error);
            throw error;
        }
    }

    /**
     * Parse text format back to object
     * @param {string} content - Text content
     * @returns {Object} Parsed data
     */
    parseTextFormat(content) {
        const lines = content.split('\n');
        const data = {
            signature: { r: '', s: '', v: '' },
            hash: '',
            timestamp: '',
            validation: { isValid: false, errors: [] },
            metadata: {}
        };

        let currentSection = '';
        for (const line of lines) {
            if (line.includes('Timestamp:')) {
                data.timestamp = line.split(':')[1].trim();
            } else if (line.includes('Hash:')) {
                data.hash = line.split(':')[1].trim();
            } else if (line.includes('R:')) {
                data.signature.r = line.split(':')[1].trim();
            } else if (line.includes('S:')) {
                data.signature.s = line.split(':')[1].trim();
            } else if (line.includes('V:')) {
                data.signature.v = line.split(':')[1].trim();
            } else if (line.includes('Valid:')) {
                data.validation.isValid = line.split(':')[1].trim() === 'true';
            } else if (line.includes('Errors:')) {
                const errors = line.split(':')[1].trim();
                data.validation.errors = errors === 'None' ? [] : errors.split(', ');
            } else if (line.includes('Metadata:') && !line.includes('Metadata:')) {
                currentSection = 'metadata';
            } else if (currentSection === 'metadata' && line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());
                if (key && value) {
                    data.metadata[key] = value;
                }
            }
        }

        return data;
    }

    /**
     * Parse hex format back to object
     * @param {string} content - Hex content
     * @returns {Object} Parsed data
     */
    parseHexFormat(content) {
        const lines = content.trim().split('\n');
        return {
            signature: {
                r: lines[0] || '',
                s: lines[1] || '',
                v: lines[2] || ''
            },
            hash: lines[3] || '',
            timestamp: Date.now().toString(),
            validation: { isValid: true, errors: [] },
            metadata: {}
        };
    }

    /**
     * Get session signatures
     * @param {string} sessionId - Session ID
     * @returns {Array} Session signatures
     */
    async getSessionSignatures(sessionId) {
        const sessionSignatures = [];
        
        for (const [fileId, entry] of Object.entries(this.storageIndex.signatures)) {
            if (entry.sessionId === sessionId) {
                try {
                    const signatureData = await this.retrieveSignatureOutput(fileId);
                    sessionSignatures.push(signatureData);
                } catch (error) {
                    console.warn(`Failed to retrieve signature ${fileId}:`, error.message);
                }
            }
        }

        return sessionSignatures.sort((a, b) => 
            new Date(a.metadata.storageInfo.timestamp) - new Date(b.metadata.storageInfo.timestamp)
        );
    }

    /**
     * Move signature to permanent storage
     * @param {string} fileId - File ID
     * @returns {Object} Move result
     */
    async moveToPermanent(fileId) {
        try {
            const entry = this.storageIndex.signatures[fileId];
            if (!entry) {
                throw new Error(`Signature file not found: ${fileId}`);
            }

            if (entry.path.includes(this.permanentDir)) {
                return { success: true, message: 'Already in permanent storage' };
            }

            const fileName = path.basename(entry.path);
            const newPath = path.join(this.permanentDir, fileName);
            
            fs.renameSync(entry.path, newPath);
            entry.path = newPath;
            
            this.saveStorageIndex();
            
            return { success: true, newPath };

        } catch (error) {
            console.error('Error moving to permanent storage:', error);
            throw error;
        }
    }

    /**
     * Archive old signatures
     * @param {number} daysOld - Days old threshold
     * @returns {Object} Archive result
     */
    async archiveOldSignatures(daysOld = 30) {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const archived = [];

        for (const [fileId, entry] of Object.entries(this.storageIndex.signatures)) {
            const fileTime = new Date(entry.timestamp).getTime();
            
            if (fileTime < cutoffTime && entry.path.includes(this.permanentDir)) {
                try {
                    const fileName = path.basename(entry.path);
                    const archivePath = path.join(this.archiveDir, fileName);
                    
                    fs.renameSync(entry.path, archivePath);
                    entry.path = archivePath;
                    archived.push(fileId);
                } catch (error) {
                    console.warn(`Failed to archive ${fileId}:`, error.message);
                }
            }
        }

        if (archived.length > 0) {
            this.saveStorageIndex();
        }

        return { success: true, archivedCount: archived.length, archived };
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        const stats = {
            totalSignatures: this.storageIndex.metadata.totalSignatures,
            totalSessions: this.storageIndex.metadata.totalSessions,
            byLocation: {
                temp: 0,
                permanent: 0,
                archive: 0
            },
            byValidation: {
                valid: 0,
                invalid: 0
            },
            totalSize: 0
        };

        for (const entry of Object.values(this.storageIndex.signatures)) {
            if (entry.path.includes(this.tempDir)) {
                stats.byLocation.temp++;
            } else if (entry.path.includes(this.permanentDir)) {
                stats.byLocation.permanent++;
            } else if (entry.path.includes(this.archiveDir)) {
                stats.byLocation.archive++;
            }

            if (entry.metadata.validation?.isValid) {
                stats.byValidation.valid++;
            } else {
                stats.byValidation.invalid++;
            }

            stats.totalSize += entry.size || 0;
        }

        return stats;
    }

    /**
     * Clean up temporary files
     * @param {number} hoursOld - Hours old threshold
     * @returns {Object} Cleanup result
     */
    async cleanupTempFiles(hoursOld = 24) {
        const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
        const cleaned = [];

        for (const [fileId, entry] of Object.entries(this.storageIndex.signatures)) {
            const fileTime = new Date(entry.timestamp).getTime();
            
            if (fileTime < cutoffTime && entry.path.includes(this.tempDir)) {
                try {
                    fs.unlinkSync(entry.path);
                    delete this.storageIndex.signatures[fileId];
                    cleaned.push(fileId);
                } catch (error) {
                    console.warn(`Failed to clean up ${fileId}:`, error.message);
                }
            }
        }

        if (cleaned.length > 0) {
            this.saveStorageIndex();
        }

        return { success: true, cleanedCount: cleaned.length, cleaned };
    }
}

// Export the class
module.exports = SignatureStorageManager;

// Example usage:
/*
const storageManager = new SignatureStorageManager('./signatures');

// Store signature output
const result = await storageManager.storeSignatureOutput({
    signature: { r: '1234...', s: '5678...', v: '1b' },
    hash: 'abcd...',
    timestamp: Date.now(),
    validation: { isValid: true, errors: [] }
}, 'session123', 'json', { userId: 'user1' });

console.log('Stored signature:', result);

// Get storage statistics
const stats = storageManager.getStorageStats();
console.log('Storage stats:', stats);
*/
