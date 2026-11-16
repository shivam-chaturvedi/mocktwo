/**
 * workerPool.cjs
 *
 * Bounded worker_threads pool for heavy background tasks (JSON parsing, Tavus fetches,
 * face selection, hashing). Complies strictly with R4:
 * - Pool size clamped: SEED_WORKER_MIN_THREADS <= size <= SEED_WORKER_MAX_THREADS <= os.availableParallelism() - 1
 * - Scales up only when queue is non-empty, scales down idle workers after SEED_WORKER_IDLE_MS
 * - No worker leaks, graceful shutdown on app exit, auto-recovery on worker crash.
 */

const { Worker } = require("worker_threads");
const path = require("path");
const { getConfig } = require("../config/seedConfig.cjs");

class WorkerPool {
  constructor(workerScriptPath, options = {}) {
    if (typeof workerScriptPath === "object" && workerScriptPath !== null) {
      options = workerScriptPath;
      workerScriptPath = null;
    }
    this.workerScriptPath = workerScriptPath || path.join(__dirname, "seedWorker.cjs");
    const conf = getConfig();
    this.minThreads = options.minThreads || conf.SEED_WORKER_MIN_THREADS;
    this.maxThreads = options.maxThreads || conf.SEED_WORKER_MAX_THREADS;
    this.idleTimeoutMs = options.idleTimeoutMs || conf.SEED_WORKER_IDLE_MS;

    this.workers = []; // array of { worker, busy: boolean, idleTimer: timeout|null, id: number }
    this.taskQueue = []; // array of { taskId, type, payload, resolve, reject, timer }
    this.isTerminated = false;
    this.nextWorkerId = 1;
    this.nextTaskId = 1;

    // Start with minimum workers
    for (let i = 0; i < this.minThreads; i++) {
      this._spawnWorker();
    }
  }

  _spawnWorker() {
    if (this.isTerminated) return null;
    const workerId = this.nextWorkerId++;
    let workerObj;

    try {
      const worker = new Worker(this.workerScriptPath, {
        workerData: { workerId },
      });

      workerObj = {
        id: workerId,
        worker,
        busy: false,
        idleTimer: null,
        activeTask: null,
      };

      worker.on("message", (msg) => {
        this._handleWorkerMessage(workerObj, msg);
      });

      worker.on("error", (err) => {
        console.error("[WorkerPool] Worker error:", workerId, err);
        this._handleWorkerCrash(workerObj, err);
      });

      worker.on("exit", (code) => {
        if (code !== 0 && !this.isTerminated) {
          console.warn("[WorkerPool] Worker exited with code:", workerId, code);
          this._handleWorkerCrash(workerObj, new Error(`Worker exited with code ${code}`));
        }
      });

      this.workers.push(workerObj);
      return workerObj;
    } catch (err) {
      console.error("[WorkerPool] Failed to spawn worker:", err);
      return null;
    }
  }

  _handleWorkerCrash(workerObj, error) {
    // Fail currently active task if any
    if (workerObj.activeTask) {
      clearTimeout(workerObj.activeTask.timer);
      workerObj.activeTask.reject(error || new Error("Worker crashed during task execution"));
      workerObj.activeTask = null;
    }

    // Remove from active list
    const idx = this.workers.indexOf(workerObj);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }
    if (workerObj.idleTimer) {
      clearTimeout(workerObj.idleTimer);
    }

    // Respawn to maintain minThreads if needed
    if (!this.isTerminated && this.workers.length < this.minThreads) {
      this._spawnWorker();
    }

    // Process next queue items
    this._processQueue();
  }

  _handleWorkerMessage(workerObj, msg) {
    const { taskId, success, result, error } = msg || {};
    if (workerObj.activeTask && workerObj.activeTask.taskId === taskId) {
      const task = workerObj.activeTask;
      workerObj.activeTask = null;
      workerObj.busy = false;
      clearTimeout(task.timer);

      if (success) {
        task.resolve(result);
      } else {
        task.reject(new Error(error || "Worker task failed"));
      }

      // Check idle shrink: if workers > minThreads, set timer to terminate
      if (this.workers.length > this.minThreads) {
        workerObj.idleTimer = setTimeout(() => {
          if (!workerObj.busy && this.workers.length > this.minThreads) {
            this._terminateWorker(workerObj);
          }
        }, this.idleTimeoutMs);
      }

      this._processQueue();
    }
  }

  _terminateWorker(workerObj) {
    const idx = this.workers.indexOf(workerObj);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
      if (workerObj.idleTimer) clearTimeout(workerObj.idleTimer);
      workerObj.worker.terminate().catch(() => {});
    }
  }

  _processQueue() {
    if (this.isTerminated || this.taskQueue.length === 0) return;

    // Find available worker
    let availableWorker = this.workers.find((w) => !w.busy);

    // If all busy and we can scale up, spawn a new worker
    if (!availableWorker && this.workers.length < this.maxThreads) {
      availableWorker = this._spawnWorker();
    }

    if (!availableWorker || availableWorker.busy) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    if (availableWorker.idleTimer) {
      clearTimeout(availableWorker.idleTimer);
      availableWorker.idleTimer = null;
    }

    availableWorker.busy = true;
    availableWorker.activeTask = task;

    try {
      availableWorker.worker.postMessage({
        taskId: task.taskId,
        type: task.type,
        payload: task.payload,
      });
    } catch (err) {
      availableWorker.busy = false;
      availableWorker.activeTask = null;
      clearTimeout(task.timer);
      task.reject(err);
      this._processQueue();
    }
  }

  runTask(type, payload = {}, timeoutMs = 60000) {
    if (this.isTerminated) {
      return Promise.reject(new Error("Worker pool is terminated"));
    }

    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++;
      const timer = setTimeout(() => {
        // Find if task is in queue
        const qIdx = this.taskQueue.findIndex((t) => t.taskId === taskId);
        if (qIdx !== -1) {
          this.taskQueue.splice(qIdx, 1);
          reject(new Error(`Task #${taskId} timed out in queue after ${timeoutMs}ms`));
          return;
        }
        // If task is running on a worker, terminate and restart worker
        const workerObj = this.workers.find((w) => w.activeTask && w.activeTask.taskId === taskId);
        if (workerObj) {
          this._handleWorkerCrash(workerObj, new Error(`Task #${taskId} (${type}) timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.taskQueue.push({ taskId, type, payload, resolve, reject, timer });
      this._processQueue();
    });
  }

  getActiveWorkerCount() {
    return this.workers.length;
  }

  getBusyWorkerCount() {
    return this.workers.filter((w) => w.busy).length;
  }

  async terminate() {
    this.isTerminated = true;
    for (const task of this.taskQueue) {
      clearTimeout(task.timer);
      task.reject(new Error("Worker pool terminating"));
    }
    this.taskQueue = [];

    const promises = this.workers.map((w) => {
      if (w.idleTimer) clearTimeout(w.idleTimer);
      if (w.activeTask) clearTimeout(w.activeTask.timer);
      return w.worker.terminate().catch(() => {});
    });
    this.workers = [];
    await Promise.all(promises);
  }

  async destroy() {
    return this.terminate();
  }
}

module.exports = { WorkerPool };
