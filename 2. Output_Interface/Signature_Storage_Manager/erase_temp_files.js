/**
 * Signature_Storage_Manager - erase_temp_files.js
 * Utility for cleaning up temporary signature files
 * Implements configurable retention policies and safety checks
 */

const fs = require('fs');
const path = require('path');

class TempFileCleaner {
    constructor(storageDir = './signature_storage') {
        this.storageDir = storageDir;
        this.tempDir = path.join(storageDir, 'temp');
        this.logDir = path.join(storageDir, 'logs');
        this.ensureDirectories();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        const dirs = [this.storageDir, this.tempDir, this.logDir];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Log cleanup operation
     * @param {string} operation - Operation type
     * @param {Object} data - Operation data
     */
    logCleanupOperation(operation, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            data
        };

        const logFile = path.join(this.logDir, 'cleanup_operations.log');
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFileSync(logFile, logLine);
    }

    /**
     * Get file age in hours
     * @param {string} filePath - File path
     * @returns {number} Age in hours
     */
    getFileAge(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const ageMs = Date.now() - stats.mtime.getTime();
            return ageMs / (1000 * 60 * 60); // Convert to hours
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get file size in bytes
     * @param {string} filePath - File path
     * @returns {number} File size
     */
    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check if file is safe to delete
     * @param {string} filePath - File path
     * @returns {boolean} Safe to delete
     */
    isSafeToDelete(filePath) {
        // Check if file is in temp directory
        if (!filePath.includes(this.tempDir)) {
            return false;
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return false;
        }

        // Check file extension
        const ext = path.extname(filePath).toLowerCase();
        const allowedExtensions = ['.json', '.txt', '.hex', '.mem', '.log'];
        if (!allowedExtensions.includes(ext)) {
            return false;
        }

        return true;
    }

    /**
     * Clean up temporary files by age
     * @param {number} maxAgeHours - Maximum age in hours
     * @param {boolean} dryRun - If true, don't actually delete files
     * @returns {Object} Cleanup result
     */
    async cleanupByAge(maxAgeHours = 24, dryRun = false) {
        const result = {
            operation: 'cleanup_by_age',
            maxAgeHours,
            dryRun,
            filesFound: 0,
            filesDeleted: 0,
            totalSizeFreed: 0,
            errors: [],
            deletedFiles: []
        };

        try {
            if (!fs.existsSync(this.tempDir)) {
                result.errors.push('Temp directory does not exist');
                return result;
            }

            const files = fs.readdirSync(this.tempDir);
            result.filesFound = files.length;

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                
                if (!this.isSafeToDelete(filePath)) {
                    continue;
                }

                const fileAge = this.getFileAge(filePath);
                
                if (fileAge > maxAgeHours) {
                    const fileSize = this.getFileSize(filePath);
                    
                    if (!dryRun) {
                        try {
                            fs.unlinkSync(filePath);
                            result.filesDeleted++;
                            result.totalSizeFreed += fileSize;
                            result.deletedFiles.push({
                                name: file,
                                path: filePath,
                                age: fileAge,
                                size: fileSize
                            });
                        } catch (error) {
                            result.errors.push(`Failed to delete ${file}: ${error.message}`);
                        }
                    } else {
                        result.deletedFiles.push({
                            name: file,
                            path: filePath,
                            age: fileAge,
                            size: fileSize,
                            wouldDelete: true
                        });
                    }
                }
            }

            this.logCleanupOperation('cleanup_by_age', result);
            return result;

        } catch (error) {
            result.errors.push(`Cleanup operation failed: ${error.message}`);
            this.logCleanupOperation('cleanup_by_age_error', { error: error.message });
            return result;
        }
    }

    /**
     * Clean up temporary files by size
     * @param {number} maxTotalSizeMB - Maximum total size in MB
     * @param {boolean} dryRun - If true, don't actually delete files
     * @returns {Object} Cleanup result
     */
    async cleanupBySize(maxTotalSizeMB = 100, dryRun = false) {
        const result = {
            operation: 'cleanup_by_size',
            maxTotalSizeMB,
            dryRun,
            filesFound: 0,
            filesDeleted: 0,
            totalSizeFreed: 0,
            errors: [],
            deletedFiles: []
        };

        try {
            if (!fs.existsSync(this.tempDir)) {
                result.errors.push('Temp directory does not exist');
                return result;
            }

            const files = fs.readdirSync(this.tempDir);
            result.filesFound = files.length;

            // Get all files with their sizes and ages
            const fileInfo = [];
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                
                if (!this.isSafeToDelete(filePath)) {
                    continue;
                }

                const fileSize = this.getFileSize(filePath);
                const fileAge = this.getFileAge(filePath);
                
                fileInfo.push({
                    name: file,
                    path: filePath,
                    size: fileSize,
                    age: fileAge
                });
            }

            // Sort by age (oldest first)
            fileInfo.sort((a, b) => a.age - b.age);

            // Calculate current total size
            const currentTotalSize = fileInfo.reduce((sum, file) => sum + file.size, 0);
            const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;

            if (currentTotalSize > maxTotalSizeBytes) {
                const bytesToFree = currentTotalSize - maxTotalSizeBytes;
                let bytesFreed = 0;

                for (const file of fileInfo) {
                    if (bytesFreed >= bytesToFree) {
                        break;
                    }

                    if (!dryRun) {
                        try {
                            fs.unlinkSync(file.path);
                            result.filesDeleted++;
                            result.totalSizeFreed += file.size;
                            bytesFreed += file.size;
                            result.deletedFiles.push({
                                ...file,
                                deleted: true
                            });
                        } catch (error) {
                            result.errors.push(`Failed to delete ${file.name}: ${error.message}`);
                        }
                    } else {
                        result.deletedFiles.push({
                            ...file,
                            wouldDelete: true
                        });
                    }
                }
            }

            this.logCleanupOperation('cleanup_by_size', result);
            return result;

        } catch (error) {
            result.errors.push(`Cleanup operation failed: ${error.message}`);
            this.logCleanupOperation('cleanup_by_size_error', { error: error.message });
            return result;
        }
    }

    /**
     * Clean up files by session
     * @param {string} sessionId - Session ID to clean
     * @param {boolean} dryRun - If true, don't actually delete files
     * @returns {Object} Cleanup result
     */
    async cleanupBySession(sessionId, dryRun = false) {
        const result = {
            operation: 'cleanup_by_session',
            sessionId,
            dryRun,
            filesFound: 0,
            filesDeleted: 0,
            totalSizeFreed: 0,
            errors: [],
            deletedFiles: []
        };

        try {
            if (!fs.existsSync(this.tempDir)) {
                result.errors.push('Temp directory does not exist');
                return result;
            }

            const files = fs.readdirSync(this.tempDir);
            
            for (const file of files) {
                if (file.includes(sessionId)) {
                    const filePath = path.join(this.tempDir, file);
                    
                    if (!this.isSafeToDelete(filePath)) {
                        continue;
                    }

                    result.filesFound++;
                    const fileSize = this.getFileSize(filePath);
                    
                    if (!dryRun) {
                        try {
                            fs.unlinkSync(filePath);
                            result.filesDeleted++;
                            result.totalSizeFreed += fileSize;
                            result.deletedFiles.push({
                                name: file,
                                path: filePath,
                                size: fileSize
                            });
                        } catch (error) {
                            result.errors.push(`Failed to delete ${file}: ${error.message}`);
                        }
                    } else {
                        result.deletedFiles.push({
                            name: file,
                            path: filePath,
                            size: fileSize,
                            wouldDelete: true
                        });
                    }
                }
            }

            this.logCleanupOperation('cleanup_by_session', result);
            return result;

        } catch (error) {
            result.errors.push(`Cleanup operation failed: ${error.message}`);
            this.logCleanupOperation('cleanup_by_session_error', { error: error.message });
            return result;
        }
    }

    /**
     * Get temp directory statistics
     * @returns {Object} Directory statistics
     */
    getTempDirStats() {
        const stats = {
            totalFiles: 0,
            totalSize: 0,
            oldestFile: null,
            newestFile: null,
            byExtension: {},
            byAge: {
                lessThan1Hour: 0,
                lessThan24Hours: 0,
                lessThan7Days: 0,
                moreThan7Days: 0
            }
        };

        try {
            if (!fs.existsSync(this.tempDir)) {
                return stats;
            }

            const files = fs.readdirSync(this.tempDir);
            stats.totalFiles = files.length;

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                
                if (!this.isSafeToDelete(filePath)) {
                    continue;
                }

                const fileSize = this.getFileSize(filePath);
                const fileAge = this.getFileAge(filePath);
                const ext = path.extname(file).toLowerCase();

                stats.totalSize += fileSize;

                // Count by extension
                stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;

                // Count by age
                if (fileAge < 1) {
                    stats.byAge.lessThan1Hour++;
                } else if (fileAge < 24) {
                    stats.byAge.lessThan24Hours++;
                } else if (fileAge < 168) { // 7 days
                    stats.byAge.lessThan7Days++;
                } else {
                    stats.byAge.moreThan7Days++;
                }

                // Track oldest and newest files
                if (!stats.oldestFile || fileAge > stats.oldestFile.age) {
                    stats.oldestFile = { name: file, age: fileAge, size: fileSize };
                }
                if (!stats.newestFile || fileAge < stats.newestFile.age) {
                    stats.newestFile = { name: file, age: fileAge, size: fileSize };
                }
            }

        } catch (error) {
            console.error('Error getting temp directory stats:', error);
        }

        return stats;
    }

    /**
     * Schedule automatic cleanup
     * @param {Object} config - Cleanup configuration
     */
    scheduleAutomaticCleanup(config = {}) {
        const {
            maxAgeHours = 24,
            maxTotalSizeMB = 100,
            intervalMinutes = 60,
            enabled = true
        } = config;

        if (!enabled) {
            return;
        }

        const interval = intervalMinutes * 60 * 1000; // Convert to milliseconds

        setInterval(async () => {
            console.log('Running scheduled temp file cleanup...');
            
            // Clean by age
            const ageResult = await this.cleanupByAge(maxAgeHours, false);
            console.log(`Age cleanup: ${ageResult.filesDeleted} files deleted`);
            
            // Clean by size
            const sizeResult = await this.cleanupBySize(maxTotalSizeMB, false);
            console.log(`Size cleanup: ${sizeResult.filesDeleted} files deleted`);
            
        }, interval);

        console.log(`Scheduled automatic cleanup every ${intervalMinutes} minutes`);
    }
}

// Export the class
module.exports = TempFileCleaner;

// Example usage:
/*
const cleaner = new TempFileCleaner('./signature_storage');

// Clean up files older than 24 hours
const result = await cleaner.cleanupByAge(24, false);
console.log('Cleanup result:', result);

// Get directory statistics
const stats = cleaner.getTempDirStats();
console.log('Temp directory stats:', stats);

// Schedule automatic cleanup
cleaner.scheduleAutomaticCleanup({
    maxAgeHours: 24,
    maxTotalSizeMB: 100,
    intervalMinutes: 60,
    enabled: true
});
*/
