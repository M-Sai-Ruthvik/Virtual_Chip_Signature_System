/**
 * Virtual Chip Signature System - Main Application Entry Point
 * 
 * This file initializes the entire application and coordinates
 * between all the different modules (Frontend, Blockchain, Hardware).
 */

import { log, LOG_LEVELS } from '../1. Frontend_UI/Developer_Debug_UI/debugLogConsole.js';
import { connectWallet } from '../1. Frontend_UI/MetaMask_Integration/connectWallet.js';
import { assignSessionID } from '../1. Frontend_UI/Session_Handler/assignSessionID.js';
import { storeTempData, getTempData } from '../1. Frontend_UI/JS_Memory/storeTempData.js';
import { updateStatus } from '../5. UI_Feedback_Module/Result_Display.js';
import { processReceipt } from '../5. UI_Feedback_Module/Receipt_Processor.js';
import { renderUserInputForm } from '../1. Frontend_UI/Input_Form/userInputForm.js';
import { validateUserInput } from '../1. Frontend_UI/Input_Form/validateUserInput.js';
import { jsonToMemFormat } from '../1. Frontend_UI/Format_Handler/jsonToMemFormat.js';
import { generateInputMem } from '../1. Frontend_UI/Verilog_File_Generator/generateInputMem.js';
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

        log('Event listeners setup complete', LOG_LEVELS.DEBUG, 'EVENTS');
    }

    async handleWalletConnection() {
        try {
            log('Attempting wallet connection...', LOG_LEVELS.INFO, 'WALLET');
            
            const account = await this.modules.wallet.connect();
            
            if (account) {
                this.state.walletConnected = true;
                this.state.walletAddress = account;
                this.state.networkStatus = 'connected';
                
                // Store wallet info
                this.modules.storage.store('walletAddress', account);
                
                log(`Wallet connected: ${account}`, LOG_LEVELS.INFO, 'WALLET');
                
                // Update UI
                this.updateUI();
            } else {
                throw new Error('Failed to connect wallet');
            }
            
        } catch (error) {
            log(`Wallet connection failed: ${error.message}`, LOG_LEVELS.ERROR, 'WALLET');
        }
    }

    async handleSignatureGeneration() {
        try {
            // Wallet connection is NOT required for signature generation
            const dataInput = document.getElementById('data-input');
            const message = dataInput?.value?.trim();
            if (!message) {
                return;
            }
            log('Generating signature...', LOG_LEVELS.INFO, 'SIGNATURE');
            // Real signature generation via backend
            const response = await fetch('http://localhost:4000/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Signature generation failed');
            const realSignature = {
                message: message,
                signature: data.signature,
                hash: data.hash,
                publicKey: data.publicKey,
                timestamp: new Date().toISOString(),
            };
            this.state.currentSignature = realSignature;
            this.modules.storage.store('currentSignature', realSignature);
            this.updateSignatureOutput(realSignature);
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
        const signatureOutput = document.getElementById('signature-output');
        if (signatureOutput) {
            signatureOutput.innerHTML = `
                <div class="signature-details">
                    <p><strong>Message:</strong> ${signature.message}</p>
                    <p><strong>Signature:</strong> <code>${signature.signature}</code></p>
                    <p><strong>Hash:</strong> <code>${signature.hash}</code></p>
                    <p><strong>Public Key:</strong> <code>${signature.publicKey}</code></p>
                    <p><strong>Timestamp:</strong> ${new Date(signature.timestamp).toLocaleString()}</p>
                    <button id="send-to-chain-btn" class="btn btn-primary" style="margin-top:1rem;">Send to Sepolia</button>
                </div>
            `;
            // Add event listener for sending to Sepolia
            const sendBtn = document.getElementById('send-to-chain-btn');
            if (sendBtn) {
                sendBtn.onclick = () => this.sendSignatureToSepolia(signature);
            }
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

// Update pollStatus to also check blockchain status
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
    // Always check blockchain status
    checkBlockchainStatus();
}

// Poll every 5 seconds
setInterval(pollStatus, 5000);
// Also poll once on page load
pollStatus();

// Check blockchain status on MetaMask events
if (window.ethereum) {
    window.ethereum.on('connect', checkBlockchainStatus);
    window.ethereum.on('accountsChanged', checkBlockchainStatus);
    window.ethereum.on('chainChanged', checkBlockchainStatus);
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