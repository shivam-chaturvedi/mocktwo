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
        for (const [, pending] of this.pendingRequests.entries()) {
          pending.reject(new Error(`StorageManager worker exited unexpectedly (code ${code})`));
        }
        this.pendingRequests.clear();
        this.initWorker();
      }
    });

    this.isReady = true;
  }

  async execute(type, payload = null) {
    if (this.isClosing) {
      return Promise.reject(new Error("StorageManager closed"));
    }
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Storage query '${type}' timed out after 30s`));
        }
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
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
  getSafeRecordingPath(recordingId, ext) {
    if (typeof recordingId !== "string" || !recordingId.trim()) {
      throw new Error("Invalid recording ID");
    }
    if (recordingId.includes("..") || recordingId.includes("/") || recordingId.includes("\\")) {
      throw new Error("Path traversal blocked");
    }
    const cleanId = path.basename(recordingId).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) {
      throw new Error("Invalid recording ID characters");
    }
    const safeExt = ext === "webm" ? "webm" : ext === "partial" ? "partial" : "dat";
    const targetPath = path.join(this.recordingsDir, `${cleanId}.${safeExt}`);
    const resolved = path.resolve(targetPath);
    const base = path.resolve(this.recordingsDir);
    if (resolved === base || !resolved.startsWith(base + path.sep)) {
      throw new Error("Path traversal blocked");
    }
    return resolved;
  }

  async startAudioRecording(recordingId) {
    const freeBytes = await this.checkFreeSpaceBytes();
    const MIN_REQUIRED_BYTES = 50 * 1024 * 1024; // 50 MB
    if (freeBytes < MIN_REQUIRED_BYTES) {
      throw new Error("Insufficient local disk space to start rehearsal recording (minimum 50 MB required).");
    }

    const partialPath = this.getSafeRecordingPath(recordingId, "partial");
    await fs.promises.writeFile(partialPath, Buffer.alloc(0));
    return partialPath;
  }

  async appendAudioChunk(recordingId, chunkBuffer) {
    const partialPath = this.getSafeRecordingPath(recordingId, "partial");
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
    const partialPath = this.getSafeRecordingPath(recordingId, "partial");
    const finalPath = this.getSafeRecordingPath(recordingId, "webm");

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
          try {
            const fullPath = path.join(this.recordingsDir, file);
            const stats = fs.statSync(fullPath);
            const ageMs = Date.now() - stats.mtimeMs;
            // If file is older than 1 hour, clean it up
            if (ageMs > 3600000) {
              fs.unlinkSync(fullPath);
            }
          } catch {
            // ignore individual file cleanup failure
          }
        }
      }
    } catch (err) {
      console.error("[StorageManager] Error cleaning partial files:", err);
    }
  }

  close() {
    this.isClosing = true;
    for (const [, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error("StorageManager closed"));
    }
    this.pendingRequests.clear();
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

module.exports = { StorageManager };
