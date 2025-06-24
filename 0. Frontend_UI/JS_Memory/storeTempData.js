/**
 * Store, get, and remove temp data in localStorage.
 */
export function storeTempData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    }

export function getTempData(key) {
    const v = localStorage.getItem(key);
    try { return v ? JSON.parse(v) : null; } catch { return null; }
}

export function removeTempData(key) {
        localStorage.removeItem(key);
}
