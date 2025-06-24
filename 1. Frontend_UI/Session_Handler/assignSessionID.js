/**
 * Assigns a new session ID using browser crypto.
 * @returns {string}
 */
export function assignSessionID() {
    if (window.crypto && window.crypto.randomUUID) {
        const id = window.crypto.randomUUID();
        sessionStorage.setItem('sessionID', id);
        return id;
    } else {
        // Fallback for older browsers
        const id = 'sess-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionID', id);
        return id;
    }
}
