/**
 * Task Scheduler for Virtual Chip Signature System
 * Manages signature operations, batch processing, and resource allocation
 * Supports multiple scheduling algorithms, load balancing, and resource optimization
 */

class TaskScheduler {
    constructor(options = {}) {
        this.maxWorkers = options.maxWorkers || 4;
        this.batchSize = options.batchSize || 10;
        this.schedulingAlgorithm = options.schedulingAlgorithm || 'round-robin';
        this.workers = new Map();
        this.tasks = [];
        this.running = false;
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageProcessingTime: 0,
            workerUtilization: 0
        };
        this.startTime = Date.now();
        
        // Initialize workers
        this.initializeWorkers();
    }

    /**
     * Initialize worker threads/processes
     */
    initializeWorkers() {
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workers.set(i, {
                id: i,
                status: 'idle',
                currentTask: null,
                tasksCompleted: 0,
                totalProcessingTime: 0,
                lastActivity: Date.now()
            });
        }
        console.log(`[TaskScheduler] Initialized ${this.maxWorkers} workers`);
    }

    /**
     * Add a task to the scheduler
     * @param {Object} task - Task object
     * @param {string} task.id - Unique task ID
     * @param {Function} task.handler - Task handler function
     * @param {Object} task.data - Task data
     * @param {number} task.priority - Task priority (1=highest, 5=lowest)
     * @param {Object} task.metadata - Additional metadata
     * @returns {Promise} - Promise that resolves when task is completed
     */
    async addTask(task) {
        const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const taskItem = {
            id: taskId,
            handler: task.handler,
            data: task.data,
            priority: task.priority || 3,
            metadata: task.metadata || {},
            timestamp: Date.now(),
            status: 'pending',
            assignedWorker: null,
            result: null,
            error: null,
            processingTime: 0
        };

        this.tasks.push(taskItem);
        this.stats.totalTasks++;

        console.log(`[TaskScheduler] Added task ${taskId} with priority ${taskItem.priority}`);

        // Start scheduling if not already running
        if (!this.running) {
            this.start();
        }

        // Return promise that resolves when task is completed
        return new Promise((resolve, reject) => {
            taskItem.resolve = resolve;
            taskItem.reject = reject;
        });
    }

    /**
     * Start the scheduler
     */
    start() {
        if (this.running) {
            return;
        }

        this.running = true;
        console.log('[TaskScheduler] Started');
        this.schedule();
    }

    /**
     * Stop the scheduler
     */
    stop() {
        this.running = false;
        console.log('[TaskScheduler] Stopped');
    }

    /**
     * Main scheduling loop
     */
    schedule() {
        if (!this.running) {
            return;
        }

        // Sort tasks by priority
        this.tasks.sort((a, b) => a.priority - b.priority);

        // Assign tasks to available workers
        this.assignTasks();

        // Update worker statistics
        this.updateWorkerStats();

        // Continue scheduling
        setTimeout(() => this.schedule(), 100);
    }

    /**
     * Assign tasks to available workers
     */
    assignTasks() {
        const availableWorkers = Array.from(this.workers.values())
            .filter(worker => worker.status === 'idle');

        if (availableWorkers.length === 0) {
            return;
        }

        const pendingTasks = this.tasks.filter(task => task.status === 'pending');
        
        if (pendingTasks.length === 0) {
            return;
        }

        // Use different scheduling algorithms
        switch (this.schedulingAlgorithm) {
            case 'round-robin':
                this.roundRobinAssignment(availableWorkers, pendingTasks);
                break;
            case 'least-loaded':
                this.leastLoadedAssignment(availableWorkers, pendingTasks);
                break;
            case 'priority-based':
                this.priorityBasedAssignment(availableWorkers, pendingTasks);
                break;
            default:
                this.roundRobinAssignment(availableWorkers, pendingTasks);
        }
    }

    /**
     * Round-robin task assignment
     */
    roundRobinAssignment(availableWorkers, pendingTasks) {
        let workerIndex = 0;
        
        for (const task of pendingTasks) {
            if (workerIndex >= availableWorkers.length) {
                break;
            }

            const worker = availableWorkers[workerIndex];
            this.assignTaskToWorker(task, worker);
            workerIndex++;
        }
    }

    /**
     * Least-loaded worker assignment
     */
    leastLoadedAssignment(availableWorkers, pendingTasks) {
        // Sort workers by load (tasks completed)
        const sortedWorkers = availableWorkers.sort((a, b) => a.tasksCompleted - b.tasksCompleted);
        
        for (let i = 0; i < Math.min(pendingTasks.length, sortedWorkers.length); i++) {
            this.assignTaskToWorker(pendingTasks[i], sortedWorkers[i]);
        }
    }

    /**
     * Priority-based assignment
     */
    priorityBasedAssignment(availableWorkers, pendingTasks) {
        // Group tasks by priority
        const tasksByPriority = {};
        pendingTasks.forEach(task => {
            if (!tasksByPriority[task.priority]) {
                tasksByPriority[task.priority] = [];
            }
            tasksByPriority[task.priority].push(task);
        });

        // Assign high priority tasks first
        const priorities = Object.keys(tasksByPriority).sort((a, b) => a - b);
        let workerIndex = 0;

        for (const priority of priorities) {
            const tasks = tasksByPriority[priority];
            for (const task of tasks) {
                if (workerIndex >= availableWorkers.length) {
                    break;
                }
                this.assignTaskToWorker(task, availableWorkers[workerIndex]);
                workerIndex++;
            }
        }
    }

    /**
     * Assign a task to a specific worker
     */
    async assignTaskToWorker(task, worker) {
        task.status = 'processing';
        task.assignedWorker = worker.id;
        worker.status = 'busy';
        worker.currentTask = task.id;
        worker.lastActivity = Date.now();

        console.log(`[TaskScheduler] Assigned task ${task.id} to worker ${worker.id}`);

        // Execute task
        this.executeTask(task, worker);
    }

    /**
     * Execute a task on a worker
     */
    async executeTask(task, worker) {
        const startTime = Date.now();

        try {
            console.log(`[TaskScheduler] Executing task ${task.id} on worker ${worker.id}`);
            
            // Execute the task handler
            const result = await task.handler(task.data, task.metadata);
            
            const processingTime = Date.now() - startTime;
            
            // Update task
            task.status = 'completed';
            task.result = result;
            task.processingTime = processingTime;

            // Update worker
            worker.status = 'idle';
            worker.currentTask = null;
            worker.tasksCompleted++;
            worker.totalProcessingTime += processingTime;
            worker.lastActivity = Date.now();

            // Update stats
            this.stats.completedTasks++;
            this.stats.averageProcessingTime = 
                (this.stats.averageProcessingTime * (this.stats.completedTasks - 1) + processingTime) / 
                this.stats.completedTasks;

            console.log(`[TaskScheduler] Task ${task.id} completed in ${processingTime}ms`);

            // Resolve promise
            if (task.resolve) {
                task.resolve(result);
            }

        } catch (error) {
            console.error(`[TaskScheduler] Task ${task.id} failed:`, error);

            // Update task
            task.status = 'failed';
            task.error = error;
            task.processingTime = Date.now() - startTime;

            // Update worker
            worker.status = 'idle';
            worker.currentTask = null;
            worker.lastActivity = Date.now();

            // Update stats
            this.stats.failedTasks++;

            // Reject promise
            if (task.reject) {
                task.reject(error);
            }
        }

        // Remove completed/failed tasks
        this.tasks = this.tasks.filter(t => t.status === 'pending' || t.status === 'processing');
    }

    /**
     * Update worker statistics
     */
    updateWorkerStats() {
        const busyWorkers = Array.from(this.workers.values())
            .filter(worker => worker.status === 'busy').length;
        
        this.stats.workerUtilization = (busyWorkers / this.maxWorkers) * 100;
    }

    /**
     * Get scheduler statistics
     * @returns {Object} - Scheduler statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime,
            activeWorkers: Array.from(this.workers.values()).filter(w => w.status === 'busy').length,
            pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
            processingTasks: this.tasks.filter(t => t.status === 'processing').length
        };
    }

    /**
     * Get worker status
     * @returns {Array} - Array of worker status objects
     */
    getWorkerStatus() {
        return Array.from(this.workers.values());
    }

    /**
     * Clear all tasks
     */
    clear() {
        this.tasks.forEach(task => {
            if (task.reject) {
                task.reject(new Error('Scheduler cleared'));
            }
        });
        this.tasks = [];
        console.log('[TaskScheduler] All tasks cleared');
    }

    /**
     * Set scheduling algorithm
     * @param {string} algorithm - Scheduling algorithm ('round-robin', 'least-loaded', 'priority-based')
     */
    setSchedulingAlgorithm(algorithm) {
        this.schedulingAlgorithm = algorithm;
        console.log(`[TaskScheduler] Changed scheduling algorithm to ${algorithm}`);
    }

    /**
     * Add a new worker
     */
    addWorker() {
        const workerId = this.maxWorkers;
        this.maxWorkers++;
        
        this.workers.set(workerId, {
            id: workerId,
            status: 'idle',
            currentTask: null,
            tasksCompleted: 0,
            totalProcessingTime: 0,
            lastActivity: Date.now()
        });

        console.log(`[TaskScheduler] Added worker ${workerId}`);
    }

    /**
     * Remove a worker
     * @param {number} workerId - Worker ID to remove
     */
    removeWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (worker && worker.status === 'busy') {
            console.warn(`[TaskScheduler] Cannot remove busy worker ${workerId}`);
            return false;
        }

        this.workers.delete(workerId);
        this.maxWorkers--;
        console.log(`[TaskScheduler] Removed worker ${workerId}`);
        return true;
    }
}

/**
 * Scheduling algorithms
 */
TaskScheduler.ALGORITHMS = {
    ROUND_ROBIN: 'round-robin',
    LEAST_LOADED: 'least-loaded',
    PRIORITY_BASED: 'priority-based'
};

/**
 * Task priorities
 */
TaskScheduler.PRIORITY = {
    CRITICAL: 1,
    HIGH: 2,
    NORMAL: 3,
    LOW: 4,
    BACKGROUND: 5
};

/**
 * Task statuses
 */
TaskScheduler.STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

module.exports = TaskScheduler;
