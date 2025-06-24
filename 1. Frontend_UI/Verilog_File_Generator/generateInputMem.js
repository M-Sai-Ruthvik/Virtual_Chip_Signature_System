/**
 * Enhanced Verilog File Generator for Hardware Integration
 * Generates proper memory files for Verilog simulation and FPGA implementation
 * Supports multiple formats: memory files, test vectors, and simulation inputs
 */

/**
 * Generate Verilog memory file from data
 * @param {string|object} data - Input data (string or object)
 * @param {object} options - Generation options
 * @returns {string} - Verilog memory file content
 */
export function generateInputMem(data, options = {}) {
    const config = {
        format: 'memory', // 'memory', 'testvector', 'simulation'
        dataWidth: 32,    // Data width in bits
        addressWidth: 10, // Address width in bits
        endianness: 'little', // 'little' or 'big'
        includeHeader: true,
        includeComments: true,
        ...options
    };

    try {
        // Convert input to bytes
        const bytes = convertToBytes(data);
        
        // Generate based on format
        switch (config.format) {
            case 'memory':
                return generateMemoryFile(bytes, config);
            case 'testvector':
                return generateTestVector(bytes, config);
            case 'simulation':
                return generateSimulationFile(bytes, config);
            default:
                return generateMemoryFile(bytes, config);
        }
    } catch (error) {
        console.error('Error generating Verilog file:', error);
        return generateErrorFile(error.message);
    }
}

/**
 * Convert input data to byte array
 * @param {string|object} data - Input data
 * @returns {Array} - Byte array
 */
function convertToBytes(data) {
    if (typeof data === 'string') {
        // Convert string to UTF-8 bytes
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(data));
    } else if (typeof data === 'object') {
        // Convert object to JSON string, then to bytes
        const jsonString = JSON.stringify(data);
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(jsonString));
    } else {
        throw new Error('Unsupported data type. Use string or object.');
    }
}

/**
 * Generate Verilog memory file
 * @param {Array} bytes - Byte array
 * @param {object} config - Configuration
 * @returns {string} - Memory file content
 */
function generateMemoryFile(bytes, config) {
    const lines = [];
    
    if (config.includeHeader) {
        lines.push('// ========================================');
        lines.push('// Virtual Chip Signature System');
        lines.push('// Memory File - Auto Generated');
        lines.push(`// Generated: ${new Date().toISOString()}`);
        lines.push(`// Data Width: ${config.dataWidth} bits`);
        lines.push(`// Address Width: ${config.addressWidth} bits`);
        lines.push(`// Total Bytes: ${bytes.length}`);
        lines.push('// ========================================');
        lines.push('');
    }

    // Calculate words per line based on data width
    const bytesPerWord = config.dataWidth / 8;
    const wordsPerLine = 4; // 4 words per line for readability
    
    for (let i = 0; i < bytes.length; i += bytesPerWord * wordsPerLine) {
        const address = Math.floor(i / bytesPerWord);
        const lineBytes = bytes.slice(i, i + bytesPerWord * wordsPerLine);
        
        // Pad line to full width
        while (lineBytes.length < bytesPerWord * wordsPerLine) {
            lineBytes.push(0);
        }
        
        // Convert bytes to words
        const words = [];
        for (let j = 0; j < lineBytes.length; j += bytesPerWord) {
            const wordBytes = lineBytes.slice(j, j + bytesPerWord);
            const word = bytesToWord(wordBytes, config.endianness);
            words.push(word.toString(16).padStart(config.dataWidth / 4, '0'));
        }
        
        // Format line
        const addressHex = address.toString(16).padStart(config.addressWidth / 4, '0');
        const wordsHex = words.join(' ');
        
        let line = `${addressHex}: ${wordsHex};`;
        
        if (config.includeComments) {
            const originalBytes = bytes.slice(i, i + bytesPerWord * wordsPerLine);
            const byteHex = originalBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
            line += ` // ${byteHex}`;
        }
        
        lines.push(line);
    }
    
    return lines.join('\n');
}

/**
 * Generate test vector file
 * @param {Array} bytes - Byte array
 * @param {object} config - Configuration
 * @returns {string} - Test vector content
 */
function generateTestVector(bytes, config) {
    const lines = [];
    
    if (config.includeHeader) {
        lines.push('// ========================================');
        lines.push('// Virtual Chip Signature System');
        lines.push('// Test Vector File - Auto Generated');
        lines.push(`// Generated: ${new Date().toISOString()}`);
        lines.push(`// Total Test Cases: ${Math.ceil(bytes.length / 4)}`);
        lines.push('// ========================================');
        lines.push('');
        lines.push('// Format: clock, reset, data_valid, data_in, expected_output');
        lines.push('');
    }

    // Generate test vectors
    for (let i = 0; i < bytes.length; i += 4) {
        const testCase = Math.floor(i / 4);
        const dataBytes = bytes.slice(i, i + 4);
        
        // Pad to 4 bytes
        while (dataBytes.length < 4) {
            dataBytes.push(0);
        }
        
        const dataHex = dataBytes.map(b => b.toString(16).padStart(2, '0')).join('');
        
        lines.push(`// Test Case ${testCase + 1}`);
        lines.push(`1, 0, 1, 32'h${dataHex}, 32'hXXXXXXXX; // Data: ${dataHex}`);
        lines.push(`0, 0, 0, 32'h00000000, 32'hXXXXXXXX; // Wait`);
        lines.push('');
    }
    
    return lines.join('\n');
}

/**
 * Generate simulation file
 * @param {Array} bytes - Byte array
 * @param {object} config - Configuration
 * @returns {string} - Simulation file content
 */
function generateSimulationFile(bytes, config) {
    const lines = [];
    
    if (config.includeHeader) {
        lines.push('// ========================================');
        lines.push('// Virtual Chip Signature System');
        lines.push('// Simulation File - Auto Generated');
        lines.push(`// Generated: ${new Date().toISOString()}`);
        lines.push('// ========================================');
        lines.push('');
    }

    lines.push('module input_simulation;');
    lines.push('');
    lines.push('  // Clock and reset signals');
    lines.push('  reg clk;');
    lines.push('  reg rst_n;');
    lines.push('');
    lines.push('  // Data signals');
    lines.push(`  reg [${config.dataWidth-1}:0] data_in;`);
    lines.push('  reg data_valid;');
    lines.push('  wire data_ready;');
    lines.push('');
    lines.push('  // Instantiate your module here');
    lines.push('  // your_module uut (');
    lines.push('  //   .clk(clk),');
    lines.push('  //   .rst_n(rst_n),');
    lines.push('  //   .data_in(data_in),');
    lines.push('  //   .data_valid(data_valid),');
    lines.push('  //   .data_ready(data_ready)');
    lines.push('  // );');
    lines.push('');
    lines.push('  // Clock generation');
    lines.push('  initial begin');
    lines.push('    clk = 0;');
    lines.push('    forever #5 clk = ~clk;');
    lines.push('  end');
    lines.push('');
    lines.push('  // Test stimulus');
    lines.push('  initial begin');
    lines.push('    // Initialize');
    lines.push('    rst_n = 0;');
    lines.push('    data_valid = 0;');
    lines.push('    data_in = 0;');
    lines.push('');
    lines.push('    // Reset');
    lines.push('    #100;');
    lines.push('    rst_n = 1;');
    lines.push('    #50;');
    lines.push('');

    // Generate test stimulus
    for (let i = 0; i < bytes.length; i += config.dataWidth / 8) {
        const dataBytes = bytes.slice(i, i + config.dataWidth / 8);
        const dataHex = dataBytes.map(b => b.toString(16).padStart(2, '0')).join('');
        const paddedHex = dataHex.padEnd(config.dataWidth / 4, '0');
        
        lines.push(`    // Send data ${Math.floor(i / (config.dataWidth / 8)) + 1}`);
        lines.push(`    data_in = ${config.dataWidth}'h${paddedHex};`);
        lines.push('    data_valid = 1;');
        lines.push('    @(posedge clk);');
        lines.push('    data_valid = 0;');
        lines.push('    @(posedge clk);');
        lines.push('');
    }

    lines.push('    // Wait for completion');
    lines.push('    #1000;');
    lines.push('    $finish;');
    lines.push('  end');
    lines.push('');
    lines.push('  // Monitor outputs');
    lines.push('  initial begin');
    lines.push('    $monitor("Time=%0t rst_n=%b data_valid=%b data_in=%h data_ready=%b",');
    lines.push('             $time, rst_n, data_valid, data_in, data_ready);');
    lines.push('  end');
    lines.push('');
    lines.push('endmodule');
    
    return lines.join('\n');
}

/**
 * Convert bytes to word based on endianness
 * @param {Array} bytes - Byte array
 * @param {string} endianness - 'little' or 'big'
 * @returns {number} - Word value
 */
function bytesToWord(bytes, endianness) {
    let word = 0;
    
    if (endianness === 'little') {
        for (let i = 0; i < bytes.length; i++) {
            word |= (bytes[i] << (i * 8));
        }
    } else {
        for (let i = 0; i < bytes.length; i++) {
            word |= (bytes[i] << ((bytes.length - 1 - i) * 8));
        }
    }
    
    return word;
}

/**
 * Generate error file
 * @param {string} errorMessage - Error message
 * @returns {string} - Error file content
 */
function generateErrorFile(errorMessage) {
    return `// ========================================
// Virtual Chip Signature System
// ERROR: Failed to generate memory file
// Error: ${errorMessage}
// Generated: ${new Date().toISOString()}
// ========================================

// Please check your input data and try again.
// Supported formats: string, object
// Supported options: format, dataWidth, addressWidth, endianness
`;
}

/**
 * Generate Keccak input memory file
 * @param {string} message - Message to hash
 * @returns {string} - Keccak-specific memory file
 */
export function generateKeccakInputMem(message) {
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(message));
    
    const lines = [];
    lines.push('// ========================================');
    lines.push('// Keccak-256 Input Memory File');
    lines.push('// Virtual Chip Signature System');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push(`// Message: "${message}"`);
    lines.push(`// Length: ${bytes.length} bytes`);
    lines.push('// ========================================');
    lines.push('');
    
    // Keccak uses 64-bit words
    for (let i = 0; i < bytes.length; i += 8) {
        const address = Math.floor(i / 8);
        const wordBytes = bytes.slice(i, i + 8);
        
        // Pad to 8 bytes
        while (wordBytes.length < 8) {
            wordBytes.push(0);
        }
        
        const wordHex = wordBytes.map(b => b.toString(16).padStart(2, '0')).join('');
        const addressHex = address.toString(16).padStart(2, '0');
        
        lines.push(`${addressHex}: ${wordHex}; // ${wordBytes.map(b => String.fromCharCode(b)).join('')}`);
    }
    
    return lines.join('\n');
}

/**
 * Generate ECDSA input memory file
 * @param {string} hash - Hash to sign
 * @param {string} privateKey - Private key
 * @param {string} nonce - Random nonce
 * @returns {string} - ECDSA-specific memory file
 */
export function generateECDSAInputMem(hash, privateKey, nonce) {
    const lines = [];
    lines.push('// ========================================');
    lines.push('// ECDSA Input Memory File');
    lines.push('// Virtual Chip Signature System');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// ========================================');
    lines.push('');
    
    // Hash (32 bytes = 256 bits)
    lines.push('// Message Hash (256 bits)');
    for (let i = 0; i < 8; i++) {
        const start = i * 4;
        const end = start + 4;
        const wordHex = hash.slice(start * 2, end * 2);
        lines.push(`${i.toString(16).padStart(2, '0')}: ${wordHex};`);
    }
    lines.push('');
    
    // Private Key (32 bytes = 256 bits)
    lines.push('// Private Key (256 bits)');
    for (let i = 0; i < 8; i++) {
        const start = i * 4;
        const end = start + 4;
        const wordHex = privateKey.slice(start * 2, end * 2);
        lines.push(`${(i + 8).toString(16).padStart(2, '0')}: ${wordHex};`);
    }
    lines.push('');
    
    // Nonce (32 bytes = 256 bits)
    lines.push('// Random Nonce (256 bits)');
    for (let i = 0; i < 8; i++) {
        const start = i * 4;
        const end = start + 4;
        const wordHex = nonce.slice(start * 2, end * 2);
        lines.push(`${(i + 16).toString(16).padStart(2, '0')}: ${wordHex};`);
    }
    
    return lines.join('\n');
}

/**
 * Validate input data for hardware compatibility
 * @param {string|object} data - Input data
 * @returns {object} - Validation result
 */
export function validateHardwareInput(data) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        recommendations: []
    };
    
    try {
        const bytes = convertToBytes(data);
        
        // Check data size
        if (bytes.length > 1024) {
            result.warnings.push('Data size exceeds 1KB. Consider chunking for large inputs.');
        }
        
        if (bytes.length === 0) {
            result.valid = false;
            result.errors.push('Input data is empty.');
        }
        
        // Check for non-printable characters
        const nonPrintable = bytes.filter(b => b < 32 && b !== 9 && b !== 10 && b !== 13);
        if (nonPrintable.length > 0) {
            result.warnings.push('Input contains non-printable characters.');
        }
        
        // Check for null bytes
        const nullBytes = bytes.filter(b => b === 0);
        if (nullBytes.length > bytes.length * 0.1) {
            result.warnings.push('Input contains many null bytes (>10%).');
        }
        
        // Recommendations
        if (bytes.length < 16) {
            result.recommendations.push('Consider padding input to at least 16 bytes for better hardware efficiency.');
        }
        
        if (bytes.length % 4 !== 0) {
            result.recommendations.push('Consider padding input to 4-byte alignment for optimal performance.');
        }
        
    } catch (error) {
        result.valid = false;
        result.errors.push(`Data conversion failed: ${error.message}`);
    }
    
    return result;
}

// Export all functions
export default {
    generateInputMem,
    generateKeccakInputMem,
    generateECDSAInputMem,
    validateHardwareInput
};
