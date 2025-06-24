/**
 * UI_Feedback_Module - Debug_UI.js
 * Comprehensive debug UI system for signature operations
 * Provides real-time monitoring, logging, and debugging capabilities
 */

class DebugUI {
    constructor(containerId = "debug-container", options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.options = {
            maxLogEntries: 1000,
            autoScroll: true,
            showTimestamps: true,
            logLevels: ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"],
            ...options
        };
        
        this.logEntries = [];
        this.isVisible = false;
        this.autoRefresh = false;
        this.refreshInterval = null;
        
        this.init();
    }

    /**
     * Initialize debug UI
     */
    init() {
        this.createContainer();
        this.createUI();
        this.bindEvents();
        this.log("DEBUG", "Debug UI initialized");
    }

    /**
     * Create debug container
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
        this.container.className = "debug-ui-container";
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: #1a1a1a;
            color: #ffffff;
            font-family: "Courier New", monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            border-left: 2px solid #333;
            box-shadow: -2px 0 10px rgba(0,0,0,0.5);
        `;

        document.body.appendChild(this.container);
    }

    /**
     * Create debug UI elements
     */
    createUI() {
        // Header
        const header = document.createElement("div");
        header.className = "debug-header";
        header.style.cssText = `
            background: #2a2a2a;
            padding: 10px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement("h3");
        title.textContent = "🔧 Debug Console";
        title.style.margin = "0";
        title.style.color = "#00ff00";

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.gap = "10px";

        // Clear button
        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear";
        clearBtn.onclick = () => this.clear();
        clearBtn.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        `;

        // Auto-refresh toggle
        const refreshBtn = document.createElement("button");
        refreshBtn.textContent = "Auto-Refresh: OFF";
        refreshBtn.onclick = () => this.toggleAutoRefresh();
        refreshBtn.style.cssText = `
            background: #4444ff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        `;
        this.refreshBtn = refreshBtn;

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.onclick = () => this.hide();
        closeBtn.style.cssText = `
            background: #666;
            color: white;
            border: none;
            padding: 5px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;

        controls.appendChild(clearBtn);
        controls.appendChild(refreshBtn);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);

        // Filter controls
        const filterContainer = document.createElement("div");
        filterContainer.style.cssText = `
            padding: 10px;
            background: #222;
            border-bottom: 1px solid #333;
        `;

        const filterLabel = document.createElement("label");
        filterLabel.textContent = "Log Level: ";
        filterLabel.style.color = "#ccc";

        const filterSelect = document.createElement("select");
        filterSelect.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 3px;
            margin-left: 10px;
        `;

        this.options.logLevels.forEach(level => {
            const option = document.createElement("option");
            option.value = level;
            option.textContent = level;
            filterSelect.appendChild(option);
        });

        filterSelect.onchange = (e) => this.filterByLevel(e.target.value);
        this.filterSelect = filterSelect;

        filterContainer.appendChild(filterLabel);
        filterContainer.appendChild(filterSelect);

        // Log display area
        const logContainer = document.createElement("div");
        logContainer.className = "debug-log-container";
        logContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: #000;
            font-family: "Courier New", monospace;
            font-size: 11px;
            line-height: 1.4;
        `;
        this.logContainer = logContainer;

        // Status bar
        const statusBar = document.createElement("div");
        statusBar.className = "debug-status";
        statusBar.style.cssText = `
            background: #2a2a2a;
            padding: 5px 10px;
            border-top: 1px solid #333;
            font-size: 10px;
            color: #ccc;
        `;
        this.statusBar = statusBar;

        // Assemble UI
        this.container.appendChild(header);
        this.container.appendChild(filterContainer);
        this.container.appendChild(logContainer);
        this.container.appendChild(statusBar);

        this.updateStatus();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Keyboard shortcut to toggle debug UI
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "D") {
                e.preventDefault();
                this.toggle();
            }
        });

        // Auto-scroll to bottom
        this.logContainer.addEventListener("scroll", () => {
            const isAtBottom = this.logContainer.scrollTop + this.logContainer.clientHeight >= this.logContainer.scrollHeight - 10;
            this.options.autoScroll = isAtBottom;
        });
    }

    /**
     * Log a message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            level,
            message,
            data,
            id: Date.now() + Math.random()
        };

        this.logEntries.push(entry);

        // Limit log entries
        if (this.logEntries.length > this.options.maxLogEntries) {
            this.logEntries.shift();
        }

        this.addLogEntry(entry);
        this.updateStatus();
    }

    /**
     * Add log entry to display
     * @param {Object} entry - Log entry
     */
    addLogEntry(entry) {
        const logEntry = document.createElement("div");
        logEntry.className = `log-entry log-${entry.level.toLowerCase()}`;
        logEntry.style.cssText = `
            margin-bottom: 5px;
            padding: 5px;
            border-radius: 3px;
            border-left: 3px solid ${this.getLevelColor(entry.level)};
            background: ${this.getLevelBackground(entry.level)};
        `;

        const timestamp = this.options.showTimestamps ? 
            `<span style="color: #888;">[${entry.timestamp}]</span> ` : "";

        const levelSpan = `<span style="color: ${this.getLevelColor(entry.level)}; font-weight: bold;">[${entry.level}]</span> `;
        
        let content = `${timestamp}${levelSpan}${entry.message}`;
        
        if (entry.data) {
            content += `<br><pre style="color: #aaa; margin: 5px 0; font-size: 10px;">${JSON.stringify(entry.data, null, 2)}</pre>`;
        }

        logEntry.innerHTML = content;
        this.logContainer.appendChild(logEntry);

        if (this.options.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    /**
     * Get color for log level
     * @param {string} level - Log level
     * @returns {string} Color
     */
    getLevelColor(level) {
        const colors = {
            DEBUG: "#888888",
            INFO: "#00ff00",
            WARN: "#ffff00",
            ERROR: "#ff4444",
            CRITICAL: "#ff0000"
        };
        return colors[level] || "#ffffff";
    }

    /**
     * Get background color for log level
     * @param {string} level - Log level
     * @returns {string} Background color
     */
    getLevelBackground(level) {
        const backgrounds = {
            DEBUG: "#1a1a1a",
            INFO: "#1a2a1a",
            WARN: "#2a2a1a",
            ERROR: "#2a1a1a",
            CRITICAL: "#2a0000"
        };
        return backgrounds[level] || "#1a1a1a";
    }

    /**
     * Filter logs by level
     * @param {string} level - Log level to show
     */
    filterByLevel(level) {
        this.logContainer.innerHTML = "";
        
        const filteredEntries = level === "ALL" ? 
            this.logEntries : 
            this.logEntries.filter(entry => entry.level === level);

        filteredEntries.forEach(entry => this.addLogEntry(entry));
    }

    /**
     * Clear all logs
     */
    clear() {
        this.logEntries = [];
        this.logContainer.innerHTML = "";
        this.updateStatus();
        this.log("INFO", "Debug log cleared");
    }

    /**
     * Toggle auto-refresh
     */
    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        
        if (this.autoRefresh) {
            this.refreshBtn.textContent = "Auto-Refresh: ON";
            this.refreshBtn.style.background = "#44ff44";
            this.startAutoRefresh();
        } else {
            this.refreshBtn.textContent = "Auto-Refresh: OFF";
            this.refreshBtn.style.background = "#4444ff";
            this.stopAutoRefresh();
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 1000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Refresh debug information
     */
    refresh() {
        // Update system status
        this.updateSystemStatus();
        
        // Update memory usage
        this.updateMemoryStatus();
        
        // Update performance metrics
        this.updatePerformanceStatus();
    }

    /**
     * Update system status
     */
    updateSystemStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            javaEnabled: navigator.javaEnabled()
        };

        this.log("DEBUG", "System status updated", status);
    }

    /**
     * Update memory status
     */
    updateMemoryStatus() {
        if (performance.memory) {
            const memory = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + " MB",
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + " MB",
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + " MB"
            };

            this.log("DEBUG", "Memory usage", data);
        }
    }

    /**
     * Update performance status
     */
    updatePerformanceStatus() {
        const performance = {
            navigationStart: new Date(performance.timing.navigationStart).toISOString(),
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart + " ms",
            domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart + " ms"
        };

        this.log("DEBUG", "Performance metrics", performance);
    }

    /**
     * Update status bar
     */
    updateStatus() {
        const totalEntries = this.logEntries.length;
        const errorCount = this.logEntries.filter(e => e.level === "ERROR" || e.level === "CRITICAL").length;
        const warningCount = this.logEntries.filter(e => e.level === "WARN").length;

        this.statusBar.textContent = `Entries: ${totalEntries} | Errors: ${errorCount} | Warnings: ${warningCount} | Auto-refresh: ${this.autoRefresh ? "ON" : "OFF"}`;
    }

    /**
     * Show debug UI
     */
    show() {
        this.container.style.display = "block";
        this.isVisible = true;
        this.log("INFO", "Debug UI shown");
    }

    /**
     * Hide debug UI
     */
    hide() {
        this.container.style.display = "none";
        this.isVisible = false;
        this.log("INFO", "Debug UI hidden");
    }

    /**
     * Toggle debug UI visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Export logs
     * @param {string} format - Export format (json, txt)
     */
    exportLogs(format = "json") {
        const data = {
            exportTime: new Date().toISOString(),
            totalEntries: this.logEntries.length,
            entries: this.logEntries
        };

        if (format === "json") {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `debug-logs-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === "txt") {
            const text = this.logEntries.map(entry => 
                `[${entry.timestamp}] [${entry.level}] ${entry.message}${entry.data ? "\n" + JSON.stringify(entry.data, null, 2) : ""}`
            ).join("\n");
            
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `debug-logs-${new Date().toISOString().split("T")[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }

        this.log("INFO", `Logs exported in ${format.toUpperCase()} format`);
    }

    /**
     * Get debug statistics
     * @returns {Object} Debug statistics
     */
    getStats() {
        const stats = {
            totalEntries: this.logEntries.length,
            byLevel: {},
            timeRange: {
                first: this.logEntries[0]?.timestamp,
                last: this.logEntries[this.logEntries.length - 1]?.timestamp
            }
        };

        this.options.logLevels.forEach(level => {
            stats.byLevel[level] = this.logEntries.filter(e => e.level === level).length;
        });

        return stats;
    }

    /**
     * Destroy debug UI
     */
    destroy() {
        this.stopAutoRefresh();
        if (this.container) {
            this.container.remove();
        }
        this.logEntries = [];
    }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
    module.exports = DebugUI;
}
