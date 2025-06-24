/**
 * UI_Feedback_Module - Result_Display.js
 * Displays signature results, transaction status, and user feedback
 * Provides beautiful and informative UI for system outputs
 */

class ResultDisplay {
    constructor(containerId = "result-display", options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            theme: "dark",
            animations: true,
            autoHide: true,
            autoHideDelay: 5000,
            maxResults: 10,
            ...options
        };
        
        this.results = [];
        this.currentResult = null;
        this.autoHideTimer = null;
        
        this.init();
    }

    /**
     * Initialize result display
     */
    init() {
        this.createContainer();
        this.createUI();
        this.bindEvents();
        this.applyTheme();
    }

    /**
     * Create result display container
     */
    createContainer() {
        // Remove existing container if any
        const existing = document.getElementById(this.containerId);
        if (existing) {
            existing.remove();
        }

        // Create new container
        this.container = document.createElement("div");
        this.container.id = this.containerId;
        this.container.className = "result-display-container";
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 450px;
            max-height: 80vh;
            background: #1a1a1a;
            color: #ffffff;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            z-index: 10000;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            overflow: hidden;
            display: none;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(this.container);
    }

    /**
     * Create result display UI
     */
    createUI() {
        // Header
        const header = document.createElement("div");
        header.className = "result-header";
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
        `;

        const title = document.createElement("h3");
        title.textContent = "🎯 Signature Results";
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
            font-weight: 600;
        `;

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.gap = "10px";

        // Minimize button
        const minimizeBtn = document.createElement("button");
        minimizeBtn.innerHTML = "−";
        minimizeBtn.onclick = () => this.minimize();
        minimizeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        `;

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.onclick = () => this.hide();
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
        `;

        controls.appendChild(minimizeBtn);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);

        // Content area
        const content = document.createElement("div");
        content.className = "result-content";
        content.style.cssText = `
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        `;
        this.content = content;

        // Status bar
        const statusBar = document.createElement("div");
        statusBar.className = "result-status";
        statusBar.style.cssText = `
            background: #2a2a2a;
            padding: 10px 20px;
            border-top: 1px solid #333;
            font-size: 12px;
            color: #ccc;
            display: flex;
            justify-content: space-between;
        `;
        this.statusBar = statusBar;

        // Assemble UI
        this.container.appendChild(header);
        this.container.appendChild(content);
        this.container.appendChild(statusBar);

        this.updateStatus();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "R") {
                e.preventDefault();
                this.toggle();
            }
        });

        // Auto-hide functionality
        this.container.addEventListener("mouseenter", () => {
            if (this.autoHideTimer) {
                clearTimeout(this.autoHideTimer);
                this.autoHideTimer = null;
            }
        });

        this.container.addEventListener("mouseleave", () => {
            if (this.options.autoHide && this.currentResult) {
                this.autoHideTimer = setTimeout(() => {
                    this.hide();
                }, this.options.autoHideDelay);
            }
        });
    }

    /**
     * Apply theme
     */
    applyTheme() {
        if (this.options.theme === "light") {
            this.container.style.background = "#ffffff";
            this.container.style.color = "#333333";
            this.content.style.background = "#f5f5f5";
        }
    }

    /**
     * Display signature result
     * @param {Object} result - Signature result data
     */
    displaySignatureResult(result) {
        this.currentResult = result;
        this.results.unshift(result);
        
        // Limit results
        if (this.results.length > this.options.maxResults) {
            this.results.pop();
        }

        this.renderResult(result);
        this.show();
        this.updateStatus();
    }

    /**
     * Display transaction result
     * @param {Object} result - Transaction result data
     */
    displayTransactionResult(result) {
        this.currentResult = result;
        this.results.unshift(result);
        
        if (this.results.length > this.options.maxResults) {
            this.results.pop();
        }

        this.renderTransactionResult(result);
        this.show();
        this.updateStatus();
    }

    /**
     * Display error result
     * @param {Object} error - Error data
     */
    displayError(error) {
        const errorResult = {
            type: "error",
            timestamp: new Date().toISOString(),
            message: error.message || "An error occurred",
            details: error.details || error,
            severity: error.severity || "error"
        };

        this.currentResult = errorResult;
        this.results.unshift(errorResult);
        
        if (this.results.length > this.options.maxResults) {
            this.results.pop();
        }

        this.renderError(errorResult);
        this.show();
        this.updateStatus();
    }

    /**
     * Render signature result
     * @param {Object} result - Signature result
     */
    renderResult(result) {
        this.content.innerHTML = "";

        const resultCard = document.createElement("div");
        resultCard.className = "result-card signature-result";
        resultCard.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #00ff00;
        `;

        // Header
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        `;

        const title = document.createElement("h4");
        title.textContent = "✅ Signature Generated";
        title.style.cssText = `
            margin: 0;
            color: #00ff00;
            font-size: 16px;
        `;

        const timestamp = document.createElement("span");
        timestamp.textContent = new Date(result.timestamp).toLocaleTimeString();
        timestamp.style.cssText = `
            color: #888;
            font-size: 12px;
        `;

        header.appendChild(title);
        header.appendChild(timestamp);

        // Signature details
        const details = document.createElement("div");
        details.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        `;

        // Hash
        const hashSection = this.createDetailSection("Hash", result.hash, "hash");
        details.appendChild(hashSection);

        // Signature components
        const signatureSection = this.createDetailSection("Signature", {
            R: result.signature?.r?.substring(0, 16) + "...",
            S: result.signature?.s?.substring(0, 16) + "...",
            V: result.signature?.v
        }, "signature");
        details.appendChild(signatureSection);

        // Validation status
        if (result.validation) {
            const validationSection = this.createDetailSection("Validation", {
                Status: result.validation.isValid ? "✅ Valid" : "❌ Invalid",
                Errors: result.validation.errors?.length || 0
            }, "validation");
            details.appendChild(validationSection);
        }

        // Metadata
        if (result.metadata && Object.keys(result.metadata).length > 0) {
            const metadataSection = this.createDetailSection("Metadata", result.metadata, "metadata");
            details.appendChild(metadataSection);
        }

        // Actions
        const actions = this.createActionButtons(result);
        details.appendChild(actions);

        resultCard.appendChild(header);
        resultCard.appendChild(details);

        this.content.appendChild(resultCard);
    }

    /**
     * Render transaction result
     * @param {Object} result - Transaction result
     */
    renderTransactionResult(result) {
        this.content.innerHTML = "";

        const resultCard = document.createElement("div");
        resultCard.className = "result-card transaction-result";
        resultCard.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid ${result.status === "SUCCESS" ? "#00ff00" : "#ff4444"};
        `;

        // Header
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        `;

        const title = document.createElement("h4");
        title.textContent = result.status === "SUCCESS" ? "✅ Transaction Successful" : "❌ Transaction Failed";
        title.style.cssText = `
            margin: 0;
            color: ${result.status === "SUCCESS" ? "#00ff00" : "#ff4444"};
            font-size: 16px;
        `;

        const timestamp = document.createElement("span");
        timestamp.textContent = new Date(result.processedAt).toLocaleTimeString();
        timestamp.style.cssText = `
            color: #888;
            font-size: 12px;
        `;

        header.appendChild(title);
        header.appendChild(timestamp);

        // Transaction details
        const details = document.createElement("div");
        details.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        `;

        // Transaction hash
        const hashSection = this.createDetailSection("Transaction Hash", result.txHash, "hash");
        details.appendChild(hashSection);

        // Block information
        const blockSection = this.createDetailSection("Block Info", {
            Number: result.blockNumber || "Pending",
            Confirmations: result.confirmations || 0,
            Level: result.analysis?.confirmationLevel || "Unknown"
        }, "block");
        details.appendChild(blockSection);

        // Gas information
        const gasSection = this.createDetailSection("Gas Info", {
            Used: result.gasUsed || "Unknown",
            Price: result.effectiveGasPrice ? `${parseInt(result.effectiveGasPrice) / 1e9} Gwei` : "Unknown",
            Efficiency: result.analysis?.gasEfficiency?.efficiency || "Unknown"
        }, "gas");
        details.appendChild(gasSection);

        // Cost information
        if (result.analysis?.estimatedCost) {
            const costSection = this.createDetailSection("Cost", {
                ETH: `${result.analysis.estimatedCost.eth.toFixed(6)} ETH`,
                USD: `$${result.analysis.estimatedCost.usd.toFixed(2)}`,
                Gwei: `${result.analysis.estimatedCost.gwei.toFixed(2)} Gwei`
            }, "cost");
            details.appendChild(costSection);
        }

        // Actions
        const actions = this.createTransactionActions(result);
        details.appendChild(actions);

        resultCard.appendChild(header);
        resultCard.appendChild(details);

        this.content.appendChild(resultCard);
    }

    /**
     * Render error result
     * @param {Object} error - Error result
     */
    renderError(error) {
        this.content.innerHTML = "";

        const errorCard = document.createElement("div");
        errorCard.className = "result-card error-result";
        errorCard.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #ff4444;
        `;

        // Header
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        `;

        const title = document.createElement("h4");
        title.textContent = "❌ Error Occurred";
        title.style.cssText = `
            margin: 0;
            color: #ff4444;
            font-size: 16px;
        `;

        const timestamp = document.createElement("span");
        timestamp.textContent = new Date(error.timestamp).toLocaleTimeString();
        timestamp.style.cssText = `
            color: #888;
            font-size: 12px;
        `;

        header.appendChild(title);
        header.appendChild(timestamp);

        // Error details
        const details = document.createElement("div");
        details.style.cssText = `
            margin-bottom: 15px;
        `;

        const message = document.createElement("div");
        message.textContent = error.message;
        message.style.cssText = `
            color: #ff8888;
            margin-bottom: 10px;
            font-weight: 500;
        `;

        if (error.details) {
            const detailsText = document.createElement("pre");
            detailsText.textContent = JSON.stringify(error.details, null, 2);
            detailsText.style.cssText = `
                background: #1a1a1a;
                padding: 10px;
                border-radius: 5px;
                font-size: 11px;
                color: #ccc;
                overflow-x: auto;
            `;
            details.appendChild(detailsText);
        }

        details.appendChild(message);

        // Actions
        const actions = this.createErrorActions(error);
        details.appendChild(actions);

        errorCard.appendChild(header);
        errorCard.appendChild(details);

        this.content.appendChild(errorCard);
    }

    /**
     * Create detail section
     * @param {string} title - Section title
     * @param {Object|string} data - Section data
     * @param {string} type - Data type
     * @returns {HTMLElement} Detail section
     */
    createDetailSection(title, data, type) {
        const section = document.createElement("div");
        section.style.cssText = `
            background: #1a1a1a;
            padding: 15px;
            border-radius: 5px;
        `;

        const sectionTitle = document.createElement("h5");
        sectionTitle.textContent = title;
        sectionTitle.style.cssText = `
            margin: 0 0 10px 0;
            color: #888;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        section.appendChild(sectionTitle);

        if (typeof data === "string") {
            const value = document.createElement("div");
            value.textContent = data;
            value.style.cssText = `
                color: #fff;
                font-family: "Courier New", monospace;
                font-size: 11px;
                word-break: break-all;
            `;
            section.appendChild(value);
        } else {
            Object.entries(data).forEach(([key, value]) => {
                const item = document.createElement("div");
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                    font-size: 12px;
                `;

                const label = document.createElement("span");
                label.textContent = key;
                label.style.color = "#888";

                const val = document.createElement("span");
                val.textContent = value;
                val.style.color = "#fff";

                item.appendChild(label);
                item.appendChild(val);
                section.appendChild(item);
            });
        }

        return section;
    }

    /**
     * Create action buttons
     * @param {Object} result - Result data
     * @returns {HTMLElement} Action buttons container
     */
    createActionButtons(result) {
        const actions = document.createElement("div");
        actions.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            gap: 10px;
            margin-top: 15px;
        `;

        // Copy button
        const copyBtn = document.createElement("button");
        copyBtn.textContent = "📋 Copy";
        copyBtn.onclick = () => this.copyToClipboard(result);
        copyBtn.style.cssText = `
            background: #4444ff;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        // Export button
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "💾 Export";
        exportBtn.onclick = () => this.exportResult(result);
        exportBtn.style.cssText = `
            background: #44ff44;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        actions.appendChild(copyBtn);
        actions.appendChild(exportBtn);

        return actions;
    }

    /**
     * Create transaction action buttons
     * @param {Object} result - Transaction result
     * @returns {HTMLElement} Action buttons container
     */
    createTransactionActions(result) {
        const actions = document.createElement("div");
        actions.style.cssText = `
            grid-column: 1 / -1;
            display: flex;
            gap: 10px;
            margin-top: 15px;
        `;

        // View on explorer
        const explorerBtn = document.createElement("button");
        explorerBtn.textContent = "🔍 Explorer";
        explorerBtn.onclick = () => this.openExplorer(result.txHash);
        explorerBtn.style.cssText = `
            background: #ff8844;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        // Copy hash
        const copyBtn = document.createElement("button");
        copyBtn.textContent = "📋 Copy Hash";
        copyBtn.onclick = () => this.copyToClipboard(result.txHash);
        copyBtn.style.cssText = `
            background: #4444ff;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        actions.appendChild(explorerBtn);
        actions.appendChild(copyBtn);

        return actions;
    }

    /**
     * Create error action buttons
     * @param {Object} error - Error result
     * @returns {HTMLElement} Action buttons container
     */
    createErrorActions(error) {
        const actions = document.createElement("div");
        actions.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 15px;
        `;

        // Retry button
        const retryBtn = document.createElement("button");
        retryBtn.textContent = "🔄 Retry";
        retryBtn.onclick = () => this.retryOperation(error);
        retryBtn.style.cssText = `
            background: #ff8844;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        // Report button
        const reportBtn = document.createElement("button");
        reportBtn.textContent = "📧 Report";
        reportBtn.onclick = () => this.reportError(error);
        reportBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        `;

        actions.appendChild(retryBtn);
        actions.appendChild(reportBtn);

        return actions;
    }

    /**
     * Copy to clipboard
     * @param {Object|string} data - Data to copy
     */
    copyToClipboard(data) {
        const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        
        navigator.clipboard.writeText(text).then(() => {
            // this.showNotification("Copied to clipboard!", "success");
        }).catch(() => {
            // this.showNotification("Failed to copy", "error");
        });
    }

    /**
     * Export result
     * @param {Object} result - Result to export
     */
    exportResult(result) {
        const data = {
            exportTime: new Date().toISOString(),
            result: result
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `signature-result-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // this.showNotification("Result exported!", "success");
    }

    /**
     * Open explorer
     * @param {string} txHash - Transaction hash
     */
    openExplorer(txHash) {
        const explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
        window.open(explorerUrl, "_blank");
    }

    /**
     * Retry operation
     * @param {Object} error - Error data
     */
    retryOperation(error) {
        // This would typically trigger a retry event
        // this.showNotification("Retry requested", "info");
        this.hide();
    }

    /**
     * Report error
     * @param {Object} error - Error data
     */
    reportError(error) {
        // This would typically open an error reporting form
        // this.showNotification("Error reporting not implemented", "warning");
    }

    /**
     * Update status bar
     */
    updateStatus() {
        const totalResults = this.results.length;
        const successCount = this.results.filter(r => r.status === "SUCCESS" || r.type === "signature").length;
        const errorCount = this.results.filter(r => r.status === "ERROR" || r.type === "error").length;

        this.statusBar.innerHTML = `
            <span>Results: ${totalResults} | Success: ${successCount} | Errors: ${errorCount}</span>
            <span>${this.currentResult ? new Date(this.currentResult.timestamp || Date.now()).toLocaleTimeString() : ""}</span>
        `;
    }

    /**
     * Show result display
     */
    show() {
        this.container.style.display = "block";
        if (this.options.animations) {
            this.container.style.transform = "translateX(0)";
        }
    }

    /**
     * Hide result display
     */
    hide() {
        if (this.options.animations) {
            this.container.style.transform = "translateX(100%)";
            setTimeout(() => {
                this.container.style.display = "none";
            }, 300);
        } else {
            this.container.style.display = "none";
        }
    }

    /**
     * Toggle result display
     */
    toggle() {
        if (this.container.style.display === "none") {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Minimize result display
     */
    minimize() {
        this.container.style.height = "60px";
        this.content.style.display = "none";
    }

    /**
     * Maximize result display
     */
    maximize() {
        this.container.style.height = "80vh";
        this.content.style.display = "block";
    }

    /**
     * Clear all results
     */
    clear() {
        this.results = [];
        this.currentResult = null;
        this.content.innerHTML = "";
        this.updateStatus();
    }

    /**
     * Get result statistics
     * @returns {Object} Result statistics
     */
    getStats() {
        return {
            totalResults: this.results.length,
            byType: this.results.reduce((acc, result) => {
                const type = result.type || "unknown";
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            byStatus: this.results.reduce((acc, result) => {
                const status = result.status || "unknown";
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
    module.exports = ResultDisplay;
}

// Export updateStatus as a named export for compatibility
const resultDisplayInstance = new ResultDisplay();
export const updateStatus = resultDisplayInstance.updateStatus.bind(resultDisplayInstance);
