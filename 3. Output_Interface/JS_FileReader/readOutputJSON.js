/**
 * JS_FileReader - readOutputJSON.js
 * Reads and processes Verilog chip output files
 * Converts binary/memory format to JSON for blockchain processing
 */

const fs = require('fs');
const path = require('path');

class OutputJSONReader {
    constructor() {
        this.supportedFormats = ['.mem', '.txt', '.json', '.hex'];
        this.outputCache = new Map();
    }

    /**
     * Read Verilog chip output file and convert to JSON
     * @param {string} filePath - Path to the output file
     * @param {string} format - Expected format (mem, txt, json, hex)
     * @returns {Object} Structured output data
     */
    async readOutputFile(filePath, format = 'auto') {
        try {
            // Validate file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`Output file not found: ${filePath}`);
            }

            // Auto-detect format if not specified
            if (format === 'auto') {
                format = this.detectFormat(filePath);
            }

            // Read file content
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            // Parse based on format
            let parsedData;
            switch (format.toLowerCase()) {
                case 'mem':
                    parsedData = this.parseMemoryFormat(fileContent);
                    break;
                case 'hex':
                    parsedData = this.parseHexFormat(fileContent);
                    break;
                case 'json':
                    parsedData = JSON.parse(fileContent);
                    break;
                case 'txt':
                    parsedData = this.parseTextFormat(fileContent);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            // Validate and structure the data
            const structuredData = this.structureOutputData(parsedData);
            
            // Cache the result
            this.outputCache.set(filePath, {
                data: structuredData,
                timestamp: Date.now(),
                format: format
            });

            return structuredData;

        } catch (error) {
            console.error('Error reading output file:', error);
            throw error;
        }
    }

    /**
     * Parse Verilog memory format (.mem files)
     * @param {string} content - Memory file content
     * @returns {Object} Parsed memory data
     */
    parseMemoryFormat(content) {
        const lines = content.trim().split('\n');
        const memoryData = {
            signature: {
                r: '',
                s: '',
                v: ''
            },
            hash: '',
            timestamp: '',
            metadata: {}
        };

        let currentSection = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip comments and empty lines
            if (line.startsWith('//') || line === '') continue;
            
            // Detect sections
            if (line.includes('SIGNATURE_R:')) {
                currentSection = 'r';
                continue;
            } else if (line.includes('SIGNATURE_S:')) {
                currentSection = 's';
                continue;
            } else if (line.includes('SIGNATURE_V:')) {
                currentSection = 'v';
                continue;
            } else if (line.includes('HASH:')) {
                currentSection = 'hash';
                continue;
            } else if (line.includes('TIMESTAMP:')) {
                currentSection = 'timestamp';
                continue;
            }

            // Parse data based on current section
            if (currentSection && line.match(/^[0-9A-Fa-f]+$/)) {
                const hexValue = line.replace(/\s+/g, '');
                
                switch (currentSection) {
                    case 'r':
                        memoryData.signature.r = hexValue;
                        break;
                    case 's':
                        memoryData.signature.s = hexValue;
                        break;
                    case 'v':
                        memoryData.signature.v = hexValue;
                        break;
                    case 'hash':
                        memoryData.hash = hexValue;
                        break;
                    case 'timestamp':
                        memoryData.timestamp = hexValue;
                        break;
                }
            }
        }

        return memoryData;
    }

    /**
     * Parse hexadecimal format
     * @param {string} content - Hex file content
     * @returns {Object} Parsed hex data
     */
    parseHexFormat(content) {
        const hexLines = content.trim().split('\n');
        const hexData = {
            signature: { r: '', s: '', v: '' },
            hash: '',
            timestamp: ''
        };

        // Assume first 32 bytes = R, next 32 bytes = S, next 1 byte = V
        // Next 32 bytes = hash, remaining = timestamp
        let allHex = hexLines.join('').replace(/\s+/g, '');
        
        if (allHex.length >= 130) { // 32+32+1+32+33 = 130 minimum
            hexData.signature.r = allHex.substring(0, 64);
            hexData.signature.s = allHex.substring(64, 128);
            hexData.signature.v = allHex.substring(128, 130);
            hexData.hash = allHex.substring(130, 194);
            hexData.timestamp = allHex.substring(194);
        }

        return hexData;
    }

    /**
     * Parse text format
     * @param {string} content - Text file content
     * @returns {Object} Parsed text data
     */
    parseTextFormat(content) {
        const lines = content.trim().split('\n');
        const textData = {
            signature: { r: '', s: '', v: '' },
            hash: '',
            timestamp: '',
            metadata: {}
        };

        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            
            switch (key?.toLowerCase()) {
                case 'r':
                    textData.signature.r = value;
                    break;
                case 's':
                    textData.signature.s = value;
                    break;
                case 'v':
                    textData.signature.v = value;
                    break;
                case 'hash':
                    textData.hash = value;
                    break;
                case 'timestamp':
                    textData.timestamp = value;
                    break;
                default:
                    if (key && value) {
                        textData.metadata[key] = value;
                    }
            }
        }

        return textData;
    }

    /**
     * Auto-detect file format
     * @param {string} filePath - Path to the file
     * @returns {string} Detected format
     */
    detectFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        if (ext === '.mem') return 'mem';
        if (ext === '.hex') return 'hex';
        if (ext === '.json') return 'json';
        if (ext === '.txt') return 'txt';
        
        // Try to detect from content
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 100);
        
        if (content.includes('SIGNATURE_R:') || content.includes('//')) return 'mem';
        if (content.match(/^[0-9A-Fa-f\s]+$/)) return 'hex';
        if (content.startsWith('{') || content.startsWith('[')) return 'json';
        
        return 'txt'; // Default fallback
    }

    /**
     * Structure and validate output data
     * @param {Object} parsedData - Raw parsed data
     * @returns {Object} Structured and validated data
     */
    structureOutputData(parsedData) {
        const structured = {
            signature: {
                r: this.normalizeHex(parsedData.signature?.r || ''),
                s: this.normalizeHex(parsedData.signature?.s || ''),
                v: this.normalizeHex(parsedData.signature?.v || '')
            },
            hash: this.normalizeHex(parsedData.hash || ''),
            timestamp: parsedData.timestamp || Date.now().toString(),
            metadata: parsedData.metadata || {},
            validation: {
                isValid: false,
                errors: []
            }
        };

        // Validate signature components
        if (!structured.signature.r || structured.signature.r.length !== 64) {
            structured.validation.errors.push('Invalid signature R component');
        }
        if (!structured.signature.s || structured.signature.s.length !== 64) {
            structured.validation.errors.push('Invalid signature S component');
        }
        if (!structured.signature.v || !['1b', '1c'].includes(structured.signature.v)) {
            structured.validation.errors.push('Invalid signature V component');
        }
        if (!structured.hash || structured.hash.length !== 64) {
            structured.validation.errors.push('Invalid hash length');
        }

        structured.validation.isValid = structured.validation.errors.length === 0;
        
        return structured;
    }

    /**
     * Normalize hexadecimal string
     * @param {string} hex - Hex string to normalize
     * @returns {string} Normalized hex string
     */
    normalizeHex(hex) {
        if (!hex) return '';
        
        // Remove 0x prefix if present
        hex = hex.replace(/^0x/i, '');
        
        // Remove spaces and convert to lowercase
        hex = hex.replace(/\s+/g, '').toLowerCase();
        
        // Ensure even length
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        
        return hex;
    }

    /**
     * Get cached output data
     * @param {string} filePath - Path to the file
     * @returns {Object|null} Cached data or null
     */
    getCachedOutput(filePath) {
        const cached = this.outputCache.get(filePath);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
            return cached.data;
        }
        return null;
    }

    /**
     * Clear cache for specific file or all
     * @param {string} filePath - Optional file path to clear
     */
    clearCache(filePath = null) {
        if (filePath) {
            this.outputCache.delete(filePath);
        } else {
            this.outputCache.clear();
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.outputCache.size,
            entries: Array.from(this.outputCache.entries()).map(([path, data]) => ({
                path,
                timestamp: data.timestamp,
                format: data.format
            }))
        };
    }
}

// Export the class
module.exports = OutputJSONReader;

// Example usage:
/*
const reader = new OutputJSONReader();

// Read a memory format file
reader.readOutputFile('./output.mem', 'mem')
    .then(data => {
        console.log('Parsed output:', data);
        if (data.validation.isValid) {
            console.log('✅ Output is valid for blockchain submission');
        } else {
            console.log('❌ Validation errors:', data.validation.errors);
        }
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
*/
