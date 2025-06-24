/**
 * Converts a JS object to a memory format string (key:value;...)
 * @param {object} obj
 * @returns {string}
 */
export function jsonToMemFormat(obj) {
    if (typeof obj !== 'object' || obj === null) return '';
    let str = '';
    for (const [k, v] of Object.entries(obj)) {
        str += typeof v === 'object' && v !== null
            ? jsonToMemFormat(v)
            : `${k}:${v};`;
        }
    return str;
}

// Example usage
const exampleJson = {
    name: 'Chip',
    version: '1.0',
    active: true,
    details: {
        manufacturer: 'TechCorp',
        year: 2023
    }
};

try {
    const memFormat = jsonToMemFormat(exampleJson);
    console.log('Memory Format:', memFormat);
} catch (error) {
    console.error('Error converting JSON to memory format:', error.message);
}
