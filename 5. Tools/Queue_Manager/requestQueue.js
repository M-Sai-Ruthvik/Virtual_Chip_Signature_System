/**
 * Request Queue Manager for Virtual Chip Signature System
 * Handles multiple signature requests with priority, rate limiting, and error handling
 * Supports concurrent processing, retry logic, and request prioritization
 */

class RequestQueue {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 5;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.rateLimit = options.rateLimit || 100; // requests per minute
        this.queue = [];
        this.processing = new Set();
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageProcessingTime: 0,
            queueLength: 0
        };
    }

    /**
     * Add a request to the queue
     * @param {Object} request - Request object
     * @param {string} request.id - Unique request ID
     * @param {number} request.priority - Priority (1=highest, 5=lowest)
     * @param {Function} request.handler - Request handler function
     * @param {Object} request.data - Request data
     * @param {Object} request.metadata - Additional metadata
     * @returns {Promise} - Promise that resolves when request is processed
     */
    async addRequest(request) {
        const requestId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const queueItem = {
            id: requestId,
            priority: request.priority || 3,
            handler: request.handler,
            data: request.data,
            metadata: request.metadata || {},
            timestamp: Date.now(),
            attempts: 0,
            status: 'pending',
            result: null,
            error: null
        };

        // Add to queue and sort by priority
        this.queue.push(queueItem);
        this.queue.sort((a, b) => a.priority - b.priority);
        
        this.stats.totalRequests++;
        this.stats.queueLength = this.queue.length;

        console.log(`[RequestQueue] Added request ${requestId} with priority ${queueItem.priority}`);

        // Process queue if not at capacity
        this.processQueue();

        // Return promise that resolves when request is processed
        return new Promise((resolve, reject) => {
            queueItem.resolve = resolve;
            queueItem.reject = reject;
        });
    }

    /**
     * Process the queue
     */
    async processQueue() {
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        if (this.queue.length === 0) {
            return;
        }

        // Check rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minInterval = 60000 / this.rateLimit; // Convert rate limit to interval

        if (timeSinceLastRequest < minInterval) {
            setTimeout(() => this.processQueue(), minInterval - timeSinceLastRequest);
            return;
        }

        const item = this.queue.shift();
        this.stats.queueLength = this.queue.length;

        if (!item) {
            return;
        }

        this.processing.add(item.id);
        this.lastRequestTime = now;

        console.log(`[RequestQueue] Processing request ${item.id}`);

        try {
            const startTime = Date.now();
            const result = await this.executeRequest(item);
            const processingTime = Date.now() - startTime;

            // Update stats
            this.stats.successfulRequests++;
            this.stats.averageProcessingTime = 
                (this.stats.averageProcessingTime * (this.stats.successfulRequests - 1) + processingTime) / 
                this.stats.successfulRequests;

            item.status = 'completed';
            item.result = result;
            item.processingTime = processingTime;

            console.log(`[RequestQueue] Request ${item.id} completed in ${processingTime}ms`);

            if (item.resolve) {
                item.resolve(result);
            }

        } catch (error) {
            console.error(`[RequestQueue] Request ${item.id} failed:`, error);

            item.attempts++;
            item.error = error;

            if (item.attempts < this.retryAttempts) {
                // Retry with exponential backoff
                const delay = this.retryDelay * Math.pow(2, item.attempts - 1);
                console.log(`[RequestQueue] Retrying request ${item.id} in ${delay}ms (attempt ${item.attempts})`);
                
                setTimeout(() => {
                    this.queue.unshift(item);
                    this.stats.queueLength = this.queue.length;
                    this.processing.delete(item.id);
                    this.processQueue();
                }, delay);
                return;
            } else {
                // Max retries reached
                this.stats.failedRequests++;
                item.status = 'failed';

                if (item.reject) {
                    item.reject(error);
                }
            }
        }

        this.processing.delete(item.id);
        this.processQueue(); // Process next item
    }

    /**
     * Execute a single request
     * @param {Object} item - Queue item
     * @returns {Promise} - Request result
     */
    async executeRequest(item) {
        try {
            // Simulate some processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            // Execute the handler
            const result = await item.handler(item.data, item.metadata);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get queue statistics
     * @returns {Object} - Queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            processing: this.processing.size,
            queueLength: this.queue.length,
            uptime: Date.now() - this.startTime
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue.forEach(item => {
            if (item.reject) {
                item.reject(new Error('Queue cleared'));
            }
        });
        this.queue = [];
        this.stats.queueLength = 0;
        console.log('[RequestQueue] Queue cleared');
    }

    /**
     * Remove a specific request from the queue
     * @param {string} requestId - Request ID to remove
     * @returns {boolean} - True if request was found and removed
     */
    removeRequest(requestId) {
        const index = this.queue.findIndex(item => item.id === requestId);
        if (index !== -1) {
            const item = this.queue.splice(index, 1)[0];
            if (item.reject) {
                item.reject(new Error('Request removed from queue'));
            }
            this.stats.queueLength = this.queue.length;
            console.log(`[RequestQueue] Removed request ${requestId}`);
            return true;
        }
        return false;
    }

    /**
     * Get queue status
     * @returns {Object} - Queue status
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: Array.from(this.processing),
            stats: this.getStats()
        };
    }
}

/**
 * Priority levels for requests
 */
RequestQueue.PRIORITY = {
    CRITICAL: 1,
    HIGH: 2,
    NORMAL: 3,
    LOW: 4,
    BACKGROUND: 5
};

/**
 * Request statuses
 */
RequestQueue.STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

module.exports = RequestQueue;
