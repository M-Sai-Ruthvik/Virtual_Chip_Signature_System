/**
 * Debug log console for elegant UI debugging.
 */
const logs = [];
export const LOG_LEVELS = { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

export function log(level, message) {
    const entry = { level, message, time: new Date().toLocaleTimeString() };
    logs.push(entry);
    const consoleDiv = document.getElementById('debug-console');
    if (consoleDiv) {
        renderDebugConsole('debug-console');
    }
}

export function renderDebugConsole(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = logs.map(l =>
        `<div class="log-entry log-${l.level.toLowerCase()}">
            <span class="log-time">[${l.time}]</span>
            <span class="log-level">${l.level}</span>:
            <span class="log-message">${l.message}</span>
        </div>`
    ).join('');
}