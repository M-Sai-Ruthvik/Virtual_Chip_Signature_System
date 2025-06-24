// validateUserInput.js
/**
 * Validates user input for message signing.
 * @param {string} input
 * @returns {boolean}
 */
export function validateUserInput(input) {
    return typeof input === 'string' && input.trim().length >= 3;
}