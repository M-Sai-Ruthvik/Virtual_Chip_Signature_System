/**
 * Validates user input based on specific criteria.
 * @param {string} input - The user input to validate.
 * @returns {boolean} - Returns true if the input is valid, otherwise false.
 */
function validateUserInput(input) {
    // Trim the input to remove leading and trailing whitespace
    const trimmedInput = input.trim();

    // Check if the input is not empty
    if (!trimmedInput) {
        console.error('Input is empty');
        return false;
    }

    // Check if the input meets the minimum length requirement
    const minLength = 3;
    if (trimmedInput.length < minLength) {
        console.error(`Input is too short. Minimum length is ${minLength}`);
        return false;
    }

    // Check if the input matches a specific pattern (e.g., alphanumeric)
    const pattern = /^[a-zA-Z0-9]+$/;
    if (!pattern.test(trimmedInput)) {
        console.error('Input contains invalid characters. Only alphanumeric characters are allowed.');
        return false;
    }

    // Additional custom validation logic can be added here

    // If all checks pass, the input is valid
    return true;
}

/**
 * Renders a user input form for message signing.
 * @param {string} containerId - The DOM id to render the form into.
 * @param {function} onSubmit - Callback with the message when form is submitted.
 */
export function renderUserInputForm(containerId, onSubmit) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <form id="user-input-form" class="classic-form">
            <label for="message" class="form-label">Message to Sign</label>
            <textarea id="message" class="form-input" rows="4" placeholder="Enter your message..." required></textarea>
            <button type="submit" class="btn btn-primary">Sign Message</button>
        </form>
    `;
    const form = document.getElementById('user-input-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        const message = form.message.value.trim();
        if (message.length < 3) {
            alert('Message must be at least 3 characters.');
            return;
        }
        onSubmit(message);
    };
}

export default validateUserInput;
