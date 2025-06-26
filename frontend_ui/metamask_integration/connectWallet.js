/**
 * Connects to MetaMask and returns the user's account address.
 * Adds listeners for account and network changes.
 * @returns {Promise<string|null>} The connected account address or null if failed.
 */
let isConnecting = false;

export async function connectWallet() {
    if (isConnecting) return;
    isConnecting = true;
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask extension not found. Please install MetaMask to use this feature.');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        // Listen for account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
            window.location.reload(); // Simple way to refresh state
        });
        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
        return account;
    } catch (err) {
        // Do not alert, just return null
        isConnecting = false;
        return null;
    }
}

// Example usage
// (async () => {
//     const account = await connectWallet();
//     if (account) {
//         console.log('Wallet connected:', account);
//     } else {
//         console.log('Failed to connect wallet.');
//     }
// })();
