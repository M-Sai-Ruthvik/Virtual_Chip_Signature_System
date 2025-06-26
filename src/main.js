/**
 * Virtual Chip Signature System - Main Application Entry Point
 * 
 * This file initializes the entire application and coordinates
 * between all the different modules (Frontend, Blockchain, Hardware).
 */

import { log, LOG_LEVELS } from '../frontend_ui/developer_debug_ui/debugLogConsole.js';
import { connectWallet } from '../frontend_ui/metamask_integration/connectWallet.js';
import { assignSessionID } from '../frontend_ui/session_handler/assignSessionID.js';
import { storeTempData, getTempData } from '../frontend_ui/js_memory/storeTempData.js';
import { updateStatus } from '../ui_feedback_module/Result_Display.js';
import { processReceipt } from '../ui_feedback_module/Receipt_Processor.js';
import { renderUserInputForm } from '../frontend_ui/input_form/userInputForm.js';
import { validateUserInput } from '../frontend_ui/input_form/validateUserInput.js';
import { jsonToMemFormat } from '../frontend_ui/format_handler/jsonToMemFormat.js';
import { generateInputMem } from '../frontend_ui/verilog_file_generator/generateInputMem.js';
const ethers = window.ethers;

// Application state
class AppState {
    constructor() {
        this.walletConnected = false;
        this.walletAddress = null;
        this.sessionID = null;
        this.chipStatus = 'offline';
        this.networkStatus = 'disconnected';
        this.currentSignature = null;
        this.debugMode = false;
    }
}

// Main application class
class VirtualChipSignatureApp {
    constructor() {
        this.state = new AppState();
        this.modules = {};
        this.pollStatusInterval = null;
        this.init();
    }

    async init() {
        try {
            log('Initializing Virtual Chip Signature System...', LOG_LEVELS.INFO, 'APP_INIT');
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Initialize modules
            await this.initializeModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Restore session if available
            await this.restoreSession();
            
            // Update UI
            this.updateUI();
            
            log('Application initialized successfully', LOG_LEVELS.INFO, 'APP_INIT');
            
        } catch (error) {
            log(`Initialization failed: ${error.message}`, LOG_LEVELS.ERROR, 'APP_INIT');
        }
    }

    async initializeModules() {
        log('Initializing application modules...', LOG_LEVELS.DEBUG, 'MODULES');
        
        // Initialize wallet connection
        this.modules.wallet = {
            connect: connectWallet,
            isConnected: () => this.state.walletConnected
        };

        // Initialize session management
        this.modules.session = {
            assign: assignSessionID,
            getCurrent: () => this.state.sessionID
        };

        // Initialize storage
        this.modules.storage = {
            store: storeTempData,
            get: getTempData
        };

        // Initialize UI feedback
        this.modules.ui = {
            updateStatus,
            processReceipt
        };

        log('Modules initialized successfully', LOG_LEVELS.DEBUG, 'MODULES');
    }

    setupEventListeners() {
        log('Setting up event listeners...', LOG_LEVELS.DEBUG, 'EVENTS');

        // Wallet connection
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', () => this.handleWalletConnection());
        }

        // Signature generation
        const generateSignatureBtn = document.getElementById('generate-signature-btn');
        if (generateSignatureBtn) {
            generateSignatureBtn.addEventListener('click', () => this.handleSignatureGeneration());
        }

        // Signature verification
        const verifySignatureBtn = document.getElementById('verify-signature-btn');
        if (verifySignatureBtn) {
            verifySignatureBtn.addEventListener('click', () => this.handleSignatureVerification());
        }

        // Debug toggle
        const debugToggleBtn = document.getElementById('debug-toggle');
        if (debugToggleBtn) {
            debugToggleBtn.addEventListener('click', () => this.toggleDebugMode());
        }

        // Debug close
        const debugCloseBtn = document.getElementById('debug-close');
        if (debugCloseBtn) {
            debugCloseBtn.addEventListener('click', () => this.toggleDebugMode());
        }

        // Form inputs
        const dataInput = document.getElementById('data-input');
        if (dataInput) {
            dataInput.addEventListener('input', (e) => this.handleInputChange('data', e.target.value));
        }

        const privateKeyInput = document.getElementById('private-key-input');
        if (privateKeyInput) {
            privateKeyInput.addEventListener('input', (e) => this.handleInputChange('privateKey', e.target.value));
        }

        // --- Signature Verification Section ---
        const verificationSection = document.getElementById('results-section');
        if (verificationSection) {
            const verifyFormHTML = `
            <form id="verify-form" class="classic-form" style="margin-top:2rem;">
                <label for="verify-message" class="form-label">Message</label>
                <textarea id="verify-message" class="form-input" rows="2" placeholder="Enter the original message" required></textarea>
                <label for="verify-signature" class="form-label">Signature</label>
                <input id="verify-signature" class="form-input" placeholder="Paste the signature (0x...)" required />
                <label for="verify-address" class="form-label">Signer Address (optional)</label>
                <input id="verify-address" class="form-input" placeholder="0x... (leave blank to recover)" />
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-secondary">Verify (Local)</button>
                    <button type="button" id="verify-onchain-btn" class="btn btn-primary">Verify On-Chain</button>
                </div>
            </form>
            <div id="verify-result" class="output-field" style="margin-top:1rem;"></div>
            <div id="onchain-result" class="output-field" style="margin-top:1rem;"></div>
            `;
            verificationSection.insertAdjacentHTML('beforeend', verifyFormHTML);
            const verifyForm = document.getElementById('verify-form');
            const verifyResult = document.getElementById('verify-result');
            const onchainResult = document.getElementById('onchain-result');
            verifyForm.onsubmit = async (e) => {
                e.preventDefault();
                const message = document.getElementById('verify-message').value.trim();
                const signature = document.getElementById('verify-signature').value.trim();
                const address = document.getElementById('verify-address').value.trim();
                if (!message || !signature) {
                    verifyResult.textContent = 'Please provide both message and signature.';
                    log('WARN', 'Verification input missing.');
                    return;
                }
                try {
                    let recovered;
                    try {
                        recovered = ethers.utils.verifyMessage(message, signature);
                    } catch (err) {
                        verifyResult.textContent = 'Invalid signature format.';
                        log('ERROR', 'Invalid signature format.');
                        return;
                    }
                    let valid = false;
                    if (address) {
                        valid = (recovered.toLowerCase() === address.toLowerCase());
                    } else {
                        valid = !!recovered;
                    }
                    verifyResult.innerHTML = valid
                        ? `<span style='color:green;font-weight:600;'>✓ Signature is valid (local)</span><br>Recovered address: <code>${recovered}</code>`
                        : `<span style='color:red;font-weight:600;'>✗ Signature is invalid (local)</span><br>Recovered address: <code>${recovered}</code>`;
                    log('INFO', `Signature verification (local): ${valid ? 'valid' : 'invalid'} (recovered: ${recovered})`);
                    // Log to backend
                    fetch('http://localhost:4000/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'local',
                            message,
                            signature,
                            address,
                            recovered,
                            result: valid ? 'valid' : 'invalid'
                        })
                    })
                    .then(res => res.json())
                    .then(data => log('INFO', 'Logged to backend: ' + JSON.stringify(data)))
                    .catch(err => log('ERROR', 'Failed to log to backend: ' + err.message));
                } catch (err) {
                    verifyResult.textContent = 'Verification failed: ' + err.message;
                    log('ERROR', 'Verification failed: ' + err.message);
                }
            };
            // On-chain verification
            const verifyOnchainBtn = document.getElementById('verify-onchain-btn');
            if (verifyOnchainBtn) {
                verifyOnchainBtn.onclick = async () => {
                    const message = document.getElementById('verify-message').value.trim();
                    const signature = document.getElementById('verify-signature').value.trim();
                    const address = document.getElementById('verify-address').value.trim();
                    if (!message || !signature || !address) {
                        onchainResult.textContent = 'Please provide message, signature, and signer address for on-chain verification.';
                        log('WARN', 'On-chain verification input missing.');
                        return;
                    }
                    const contractAddress = prompt('Enter SignatureVerifier contract address:');
                    if (!contractAddress) {
                        onchainResult.textContent = 'Contract address is required.';
                        log('WARN', 'No contract address provided.');
                        return;
                    }
                    try {
                        if (!window.ethereum) {
                            onchainResult.textContent = 'MetaMask is required for on-chain verification.';
                            log('ERROR', 'MetaMask not found.');
                            return;
                        }
                        const provider = new ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const contract = new ethers.Contract(
                            contractAddress,
                            [
                                'function verifySignature(address,string,bytes) public returns (bool)'
                            ],
                            signer
                        );
                        // Convert signature to bytes
                        const sigBytes = ethers.getBytes(signature);
                        onchainResult.textContent = 'Verifying on-chain...';
                        log('INFO', 'Calling verifySignature on-chain...');
                        const tx = await contract.verifySignature(address, message, sigBytes);
                        const receipt = await tx.wait();
                        // Check event logs for SignatureVerified
                        let found = false;
                        for (const logEntry of receipt.logs) {
                            try {
                                const parsed = contract.interface.parseLog(logEntry);
                                if (parsed.name === 'SignatureVerified') {
                                    found = true;
                                    onchainResult.innerHTML = `<span style='color:green;font-weight:600;'>✓ Signature is valid (on-chain)</span><br>Tx Hash: <code>${receipt.transactionHash}</code>`;
                                    log('INFO', `Signature verified on-chain. Tx: ${receipt.transactionHash}`);
                                    // Log to backend
                                    fetch('http://localhost:4000/log', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: 'on-chain',
                                            message,
                                            signature,
                                            address,
                                            txHash: receipt.transactionHash,
                                            result: 'valid'
                                        })
                                    })
                                    .then(res => res.json())
                                    .then(data => log('INFO', 'Logged to backend: ' + JSON.stringify(data)))
                                    .catch(err => log('ERROR', 'Failed to log to backend: ' + err.message));
                                    break;
                                }
                            } catch {}
                        }
                        if (!found) {
                            onchainResult.innerHTML = `<span style='color:red;font-weight:600;'>✗ Signature is invalid (on-chain)</span><br>Tx Hash: <code>${receipt.transactionHash}</code>`;
                            log('INFO', `Signature invalid on-chain. Tx: ${receipt.transactionHash}`);
                            // Log to backend
                            fetch('http://localhost:4000/log', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'on-chain',
                                    message,
                                    signature,
                                    address,
                                    txHash: receipt.transactionHash,
                                    result: 'invalid'
                                })
                            })
                            .then(res => res.json())
                            .then(data => log('INFO', 'Logged to backend: ' + JSON.stringify(data)))
                            .catch(err => log('ERROR', 'Failed to log to backend: ' + err.message));
                        }
                    } catch (err) {
                        onchainResult.textContent = 'On-chain verification failed: ' + err.message;
                        log('ERROR', 'On-chain verification failed: ' + err.message);
                    }
                };
            }
        }

        // Copy signature button
        const copySignatureBtn = document.getElementById('copy-signature-btn');
        if (copySignatureBtn) {
            copySignatureBtn.addEventListener('click', () => {
                const signatureValue = document.getElementById('signature-value');
                if (signatureValue && signatureValue.textContent && signatureValue.textContent !== '-') {
                    navigator.clipboard.writeText(signatureValue.textContent);
                    showNotification('Signature copied to clipboard!');
                } else {
                    showNotification('No signature to copy.', 'error');
                }
            });
        }
        // Copy address button
        const copyAddressBtn = document.getElementById('copy-address-btn');
        if (copyAddressBtn) {
            copyAddressBtn.addEventListener('click', () => {
                const addressOutput = document.getElementById('address-output');
                const code = addressOutput ? addressOutput.querySelector('code') : null;
                if (code && code.textContent && code.textContent !== '-') {
                    navigator.clipboard.writeText(code.textContent);
                    showNotification('Address copied to clipboard!');
                } else {
                    showNotification('No address to copy.', 'error');
                }
            });
        }

        log('Event listeners setup complete', LOG_LEVELS.DEBUG, 'EVENTS');
    }

    async handleWalletConnection() {
        try {
            await this.modules.wallet.connect();
                this.state.walletConnected = true;
                this.updateUI();
            this.startStatusPolling();
            this.setupMetaMaskListeners();
            // Now check blockchain status
            checkBlockchainStatus();
        } catch (error) {
            log('Wallet connection failed: ' + error.message, LOG_LEVELS.ERROR, 'WALLET');
        }
    }

    startStatusPolling() {
        if (this.pollStatusInterval) return;
        pollStatus(); // poll once immediately
        this.pollStatusInterval = setInterval(pollStatus, 5000);
    }

    setupMetaMaskListeners() {
        if (window.ethereum) {
            window.ethereum.on('connect', checkBlockchainStatus);
            window.ethereum.on('accountsChanged', checkBlockchainStatus);
            window.ethereum.on('chainChanged', checkBlockchainStatus);
        }
    }

    async handleSignatureGeneration() {
        try {
            // Wallet connection is NOT required for signature generation
            const dataInput = document.getElementById('data-input');
            const message = dataInput?.value?.trim();
            if (!message) {
                log('[WARN] No message provided for signature generation.', LOG_LEVELS.WARN, 'SIGNATURE');
                return;
            }
            log('[DEBUG] Generating signature for message: ' + message, LOG_LEVELS.DEBUG, 'SIGNATURE');
            // Real signature generation via backend
            const response = await fetch('http://localhost:4000/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            log('[DEBUG] Awaiting backend response...', LOG_LEVELS.DEBUG, 'SIGNATURE');
            const data = await response.json();
            log('[DEBUG] Backend response: ' + JSON.stringify(data), LOG_LEVELS.DEBUG, 'SIGNATURE');
            if (!data.success) throw new Error(data.error || 'Signature generation failed');
            const realSignature = {
                message: message,
                signature: data.signature,
                hash: data.hash,
                publicKey: data.publicKey,
                timestamp: new Date().toISOString(),
                r: data.r,
                s: data.s,
                v: data.v
            };
            this.state.currentSignature = realSignature;
            this.modules.storage.store('currentSignature', realSignature);
            this.updateSignatureOutput(realSignature);

            // Update Keccak hash output
            const hashOutput = document.getElementById('hash-output');
            if (hashOutput) {
                log('[DEBUG] Updating Keccak output: ' + data.hash, LOG_LEVELS.DEBUG, 'SIGNATURE');
                hashOutput.innerHTML = `<code>${data.hash}</code>`;
            }
            // Update ECDSA r, s, v outputs if present
            if (data.r && data.s && typeof data.v !== 'undefined') {
                const rBox = document.getElementById('ecdsa-r');
                const sBox = document.getElementById('ecdsa-s');
                const vBox = document.getElementById('ecdsa-v');
                log(`[DEBUG] Updating ECDSA outputs: r=${data.r}, s=${data.s}, v=${data.v}`, LOG_LEVELS.DEBUG, 'SIGNATURE');
                if (rBox) rBox.innerHTML = `<code>${data.r}</code>`;
                if (sBox) sBox.innerHTML = `<code>${data.s}</code>`;
                if (vBox) vBox.innerHTML = `<code>${data.v}</code>`;
            } else {
                log('[WARN] ECDSA r, s, v missing from backend response.', LOG_LEVELS.WARN, 'SIGNATURE');
            }
            log('Signature generated successfully', LOG_LEVELS.INFO, 'SIGNATURE');
        } catch (error) {
            log(`Signature generation failed: ${error.message}`, LOG_LEVELS.ERROR, 'SIGNATURE');
        }
    }

    async handleSignatureVerification() {
        try {
            if (!this.state.currentSignature) {
                return;
            }

            log('Verifying signature...', LOG_LEVELS.INFO, 'VERIFICATION');

            // TODO: Implement actual signature verification
            // For now, simulate the process
            await this.simulateSignatureVerification();
            
        } catch (error) {
            log(`Signature verification failed: ${error.message}`, LOG_LEVELS.ERROR, 'VERIFICATION');
        }
    }

    async simulateSignatureVerification() {
        // Simulate verification process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock verification result
        const verificationResult = {
            isValid: true,
            message: 'Signature verified successfully',
            timestamp: new Date().toISOString(),
            verifiedBy: 'Virtual Chip System'
        };

        // Update UI
        this.updateVerificationOutput(verificationResult);
        
        log('Signature verified successfully', LOG_LEVELS.INFO, 'VERIFICATION');
    }

    handleInputChange(field, value) {
        log(`Input changed: ${field} = ${value ? '[REDACTED]' : 'empty'}`, LOG_LEVELS.DEBUG, 'INPUT');
        this.modules.storage.store(`input_${field}`, value);
    }

    toggleDebugMode() {
        this.state.debugMode = !this.state.debugMode;
        const debugPanel = document.getElementById('debug-panel');
        
        if (debugPanel) {
            debugPanel.style.display = this.state.debugMode ? 'block' : 'none';
        }
        
        log(`Debug mode ${this.state.debugMode ? 'enabled' : 'disabled'}`, LOG_LEVELS.DEBUG, 'DEBUG');
    }

    async restoreSession() {
        try {
            const savedSession = this.modules.storage.get('sessionID');
            if (savedSession) {
                this.state.sessionID = savedSession;
                log(`Session restored: ${savedSession}`, LOG_LEVELS.DEBUG, 'SESSION');
            } else {
                // Create new session
                this.state.sessionID = await this.modules.session.assign();
                this.modules.storage.store('sessionID', this.state.sessionID);
                log(`New session created: ${this.state.sessionID}`, LOG_LEVELS.DEBUG, 'SESSION');
            }
        } catch (error) {
            log(`Session restoration failed: ${error.message}`, LOG_LEVELS.WARN, 'SESSION');
        }
    }

    updateUI() {
        // Update wallet status
        const walletStatus = document.getElementById('wallet-status');
        if (walletStatus) {
            walletStatus.textContent = this.state.walletConnected ? 'Connected' : 'Disconnected';
            walletStatus.className = `status-indicator ${this.state.walletConnected ? 'online' : 'offline'}`;
        }

        // Update network status
        const networkStatus = document.getElementById('network-status');
        if (networkStatus) {
            networkStatus.textContent = this.state.networkStatus === 'connected' ? 'Connected' : 'Disconnected';
            networkStatus.className = `status-indicator ${this.state.networkStatus === 'connected' ? 'online' : 'offline'}`;
        }

        // Update session status
        const sessionStatus = document.getElementById('session-status');
        if (sessionStatus) {
            sessionStatus.textContent = this.state.sessionID ? 'Active' : 'No Session';
            sessionStatus.className = `status-indicator ${this.state.sessionID ? 'online' : 'offline'}`;
        }

        // Update chip status
        const chipStatus = document.getElementById('chip-status');
        if (chipStatus) {
            chipStatus.textContent = this.state.chipStatus === 'online' ? 'Online' : 'Offline';
            chipStatus.className = `status-indicator ${this.state.chipStatus === 'online' ? 'online' : 'offline'}`;
        }

        // Update connect wallet button
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        if (connectWalletBtn) {
            connectWalletBtn.textContent = this.state.walletConnected ? 'Wallet Connected' : 'Connect Wallet';
            connectWalletBtn.disabled = this.state.walletConnected;
        }
    }

    updateSignatureOutput(signature) {
        // Clear and update all output fields
        const rBox = document.getElementById('ecdsa-r');
        const sBox = document.getElementById('ecdsa-s');
        const vBox = document.getElementById('ecdsa-v');
        const addressOutput = document.getElementById('address-output');
        const signatureOutput = document.getElementById('signature-output');

        if (rBox) rBox.innerHTML = `<code>${signature.r ? signature.r : '-'}</code>`;
        if (sBox) sBox.innerHTML = `<code>${signature.s ? signature.s : '-'}</code>`;
        if (vBox) vBox.innerHTML = `<code>${typeof signature.v !== 'undefined' ? signature.v : '-'}</code>`;
        if (addressOutput) addressOutput.innerHTML = `<code>${signature.publicKey ? signature.publicKey : '-'}</code>`;
        if (signatureOutput) {
            signatureOutput.innerHTML = `<code id="signature-value">${signature.signature ? signature.signature : '-'}</code>`;
        }
    }

    async sendSignatureToSepolia(signature) {
        try {
            if (!window.ethereum) {
                return;
            }
            const contractAddress = prompt('Enter SignatureVerifier contract address (Sepolia):');
            if (!contractAddress) {
                return;
            }
            // Minimal ABI for demonstration
            const contractABI = [
                'function submitSignature(string message, bytes signature, address signer) public returns (bool)'
            ];
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const signerObj = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, contractABI, signerObj);
            // Convert signature to bytes
            const sigBytes = ethers.getBytes(signature.signature);
            const tx = await contract.submitSignature(signature.message, sigBytes, signature.publicKey);
            const receipt = await tx.wait();
            // Optionally, update UI with transaction hash
            const signatureOutput = document.getElementById('signature-output');
            if (signatureOutput) {
                signatureOutput.innerHTML += `<p><strong>Tx Hash:</strong> <code>${receipt.transactionHash}</code></p>`;
            }
        } catch (error) {
            log('Failed to send transaction: ' + error.message, LOG_LEVELS.ERROR, 'CHAIN');
        }
    }

    updateVerificationOutput(result) {
        const verificationOutput = document.getElementById('verification-output');
        if (verificationOutput) {
            verificationOutput.innerHTML = `
                <div class="verification-details">
                    <p><strong>Status:</strong> <span class="${result.isValid ? 'valid' : 'invalid'}">${result.isValid ? '✓ Valid' : '✗ Invalid'}</span></p>
                    <p><strong>Message:</strong> ${result.message}</p>
                    <p><strong>Verified By:</strong> ${result.verifiedBy}</p>
                    <p><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
                </div>
            `;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (app) {
            app.style.display = 'block';
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VirtualChipSignatureApp();
});

// Export for module usage
export default VirtualChipSignatureApp;

// Ensure setStatus is defined before pollStatus
function setStatus(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    if (status === 'online' || status === 'active') {
        el.textContent = id.replace('-status', '').replace(/\b\w/g, l => l.toUpperCase()) + ' Online';
        el.className = 'status-indicator online';
    } else {
        el.textContent = id.replace('-status', '').replace(/\b\w/g, l => l.toUpperCase()) + ' Offline';
        el.className = 'status-indicator offline';
    }
}

// Real blockchain status check
async function checkBlockchainStatus() {
    if (window.ethereum) {
        try {
            // Check if MetaMask is connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            // Check if on Sepolia (chainId 0xaa36a7)
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (accounts.length > 0 && chainId === '0xaa36a7') {
                setStatus('blockchain-status', 'online');
            } else {
                setStatus('blockchain-status', 'offline');
            }
        } catch (e) {
            setStatus('blockchain-status', 'offline');
        }
    } else {
        setStatus('blockchain-status', 'offline');
    }
}

// Update pollStatus to only update backend/chip status
async function pollStatus() {
    try {
        const res = await fetch('http://localhost:4000/api/status');
        const status = await res.json();
        setStatus('backend-status', status.backend ? 'online' : 'offline');
        setStatus('chip-status', status.chip ? 'online' : 'offline');
    } catch (e) {
        setStatus('backend-status', 'offline');
        setStatus('chip-status', 'offline');
    }
    // Do NOT call checkBlockchainStatus here
}

// Helper to reset ECDSA output fields
function resetEcdsaOutputs() {
    document.getElementById('ecdsa-r').innerHTML = '<p class="placeholder">Not yet generated</p>';
    document.getElementById('ecdsa-s').innerHTML = '<p class="placeholder">Not yet generated</p>';
    document.getElementById('ecdsa-v').innerHTML = '<p class="placeholder">Not yet generated</p>';
}

// Helper to reset signature output
function resetSignatureOutput() {
    document.getElementById('signature-output').innerHTML = '<p class="placeholder">Not yet generated</p>';
    document.getElementById('address-output').innerHTML = '<p class="placeholder">Not yet generated</p>';
} 

// At the end of the file, always poll backend/chip status
setInterval(pollStatus, 5000);
pollStatus(); 