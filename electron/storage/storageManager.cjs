const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");

class StorageManager {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.dbPath = path.join(userDataPath, "mocktwo.db");
    this.recordingsDir = path.join(userDataPath, "recordings");
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.worker = null;
    this.isReady = false;

    // Ensure recordings directory exists
    try {
      if (!fs.existsSync(this.recordingsDir)) {
        fs.mkdirSync(this.recordingsDir, { recursive: true });
      }
    } catch (err) {
      console.error("[StorageManager] Failed to create recordings dir:", err);
    }

    this.initWorker();
    this.cleanupOrphanedPartials();
  }

  initWorker() {
    const workerScript = path.join(__dirname, "dbWorker.cjs");
    this.worker = new Worker(workerScript, {
      workerData: { dbPath: this.dbPath },
    });

    this.worker.on("message", ({ id, success, result, error }) => {
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        if (success) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error || "Storage query failed"));
        }
      }
    });

    this.worker.on("error", (err) => {
      console.error("[StorageManager] Worker error:", err);
    });

    this.worker.on("exit", (code) => {
      if (code !== 0 && !this.isClosing) {
        console.error(`[StorageManager] Worker exited with code ${code}. Restarting...`);
        this.initWorker();
      }
    });

    this.isReady = true;
  }

  async execute(type, payload = null) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  // ---------------------------------------------------------------------------
  // Disk Space Guard
  // ---------------------------------------------------------------------------
  async checkFreeSpaceBytes() {
    try {
      if (typeof fs.statfs === "function") {
        return new Promise((resolve) => {
          fs.statfs(this.userDataPath, (err, stats) => {
            if (err) return resolve(Number.MAX_SAFE_INTEGER);
            const freeBytes = stats.bfree * stats.bsize;
            resolve(freeBytes);
          });
        });
      }
    } catch {
      // ignore
    }
    return Number.MAX_SAFE_INTEGER;
  }

  // ---------------------------------------------------------------------------
  // Chunked Audio Recording Subsystem
  // ---------------------------------------------------------------------------
  async startAudioRecording(recordingId) {
    const freeBytes = await this.checkFreeSpaceBytes();
    const MIN_REQUIRED_BYTES = 50 * 1024 * 1024; // 50 MB
    if (freeBytes < MIN_REQUIRED_BYTES) {
      throw new Error("Insufficient local disk space to start rehearsal recording (minimum 50 MB required).");
    }

    const partialPath = path.join(this.recordingsDir, `${recordingId}.partial`);
    await fs.promises.writeFile(partialPath, Buffer.alloc(0));
    return partialPath;
  }

  async appendAudioChunk(recordingId, chunkBuffer) {
    const partialPath = path.join(this.recordingsDir, `${recordingId}.partial`);
    if (!fs.existsSync(partialPath)) {
      throw new Error(`Recording partial file not found for id: ${recordingId}`);
    }

    const freeBytes = await this.checkFreeSpaceBytes();
    if (freeBytes < 20 * 1024 * 1024) {
      throw new Error("Local disk space critically low; stopping recording to preserve data.");
    }

    await fs.promises.appendFile(partialPath, chunkBuffer);
  }

  async finalizeAudioRecording(recordingId) {
    const partialPath = path.join(this.recordingsDir, `${recordingId}.partial`);
    const finalPath = path.join(this.recordingsDir, `${recordingId}.webm`);

    if (fs.existsSync(partialPath)) {
      await fs.promises.rename(partialPath, finalPath);
      return finalPath;
    }
    return null;
  }

  cleanupOrphanedPartials() {
    try {
      if (!fs.existsSync(this.recordingsDir)) return;
      const files = fs.readdirSync(this.recordingsDir);
      for (const file of files) {
        if (file.endsWith(".partial")) {
          const fullPath = path.join(this.recordingsDir, file);
          const stats = fs.statSync(fullPath);
          const ageMs = Date.now() - stats.mtimeMs;
          // If file is older than 1 hour, clean it up
          if (ageMs > 3600000) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    } catch (err) {
      console.error("[StorageManager] Error cleaning partial files:", err);
    }
  }

  close() {
    this.isClosing = true;
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

module.exports = { StorageManager };
