const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");
const { fixWebmDuration } = require("./ebmlFixer.cjs");

const RECORDING_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

class StorageManager {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.dbPath = path.join(userDataPath, "mocktwo.db");
    this.recordingsDir = path.join(userDataPath, "recordings");
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.activeStreams = new Map();
    this.worker = null;
    this.isReady = false;

    // Ensure recordings base directory and subdirectories exist
    try {
      if (!fs.existsSync(this.recordingsDir)) {
        fs.mkdirSync(this.recordingsDir, { recursive: true });
      }
      const sessionsDir = path.join(this.recordingsDir, "sessions");
      const baselinesDir = path.join(this.recordingsDir, "baselines");
      const quarantineDir = path.join(this.recordingsDir, "quarantine");
      if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
      if (!fs.existsSync(baselinesDir)) fs.mkdirSync(baselinesDir, { recursive: true });
      if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
    } catch (err) {
      console.error("[StorageManager] Failed to create recordings directories:", err);
    }

    this.initWorker();
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
  // Path Traversal Security & Resolution
  // ---------------------------------------------------------------------------
  resolveRecordingPath(relativePath) {
    if (!relativePath || typeof relativePath !== "string") {
      throw new Error("Invalid recording path");
    }
    const resolved = path.resolve(this.recordingsDir, relativePath);
    const base = path.resolve(this.recordingsDir);
    if (resolved === base || !resolved.startsWith(base + path.sep)) {
      throw new Error("Path traversal blocked");
    }
    return resolved;
  }

  getSafeRecordingPath(recordingId, ext, kind = "sessions") {
    if (!RECORDING_ID_REGEX.test(recordingId)) {
      throw new Error(`Invalid recording ID format: ${recordingId}`);
    }
    const subFolder = kind === "baseline" || kind === "baselines" ? "baselines" : "sessions";
    const safeExt = ext === "webm" ? "webm" : ext === "partial" ? "webm.partial" : "dat";
    const relativePath = path.join(subFolder, recordingId, safeExt);
    return this.resolveRecordingPath(relativePath);
  }

  // ---------------------------------------------------------------------------
  // Sequential Chunk Streaming Writer (MediaRecorder timeslice -> Disk)
  // ---------------------------------------------------------------------------
  async startRecordingStream(id, kind = "sessions") {
    if (!RECORDING_ID_REGEX.test(id)) {
      throw new Error(`Invalid recording ID: ${id}`);
    }

    if (this.activeStreams.has(id)) {
      throw new Error(`Recording stream already active for id: ${id}`);
    }

    const freeBytes = await this.checkFreeSpaceBytes();
    const MIN_REQUIRED_BYTES = 50 * 1024 * 1024; // 50 MB
    if (freeBytes < MIN_REQUIRED_BYTES) {
      throw new Error("Insufficient local disk space to start recording (minimum 50 MB required).");
    }

    const subFolder = kind === "baseline" || kind === "baselines" ? "baselines" : "sessions";
    const sessionDir = path.join(this.recordingsDir, subFolder, id);
    if (!fs.existsSync(sessionDir)) {
      await fs.promises.mkdir(sessionDir, { recursive: true });
    }

    const partialPath = path.join(sessionDir, "video.webm.partial");
    const finalPath = path.join(sessionDir, "video.webm");
    const relativePath = `${subFolder}/${id}/video.webm`;

    const writeStream = fs.createWriteStream(partialPath, { flags: "w" });

    const streamInfo = {
      id,
      kind,
      writeStream,
      expectedSeq: 0,
      partialPath,
      finalPath,
      relativePath,
      bytesWritten: 0,
    };

    this.activeStreams.set(id, streamInfo);
    return relativePath;
  }

  async appendChunk(id, seq, chunkBuffer) {
    const streamInfo = this.activeStreams.get(id);
    if (!streamInfo) {
      throw new Error(`No active recording stream for id: ${id}`);
    }

    const freeBytes = await this.checkFreeSpaceBytes();
    if (freeBytes < 20 * 1024 * 1024) {
      throw new Error("Local disk space critically low; stopping recording to preserve data.");
    }

    // Sequence validation (drop duplicate, accept in-order)
    if (seq < streamInfo.expectedSeq) {
      // Duplicate chunk, ignore
      return;
    }

    return new Promise((resolve, reject) => {
      const buffer = Buffer.isBuffer(chunkBuffer) ? chunkBuffer : Buffer.from(chunkBuffer);
      streamInfo.bytesWritten += buffer.length;
      streamInfo.expectedSeq = seq + 1;

      const ok = streamInfo.writeStream.write(buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });

      if (!ok) {
        streamInfo.writeStream.once("drain", () => {});
      }
    });
  }

  async finalizeRecordingStream(id, kind = "sessions", durationMs = 0) {
    const streamInfo = this.activeStreams.get(id);
    if (!streamInfo) {
      // If already finalized or path exists
      const subFolder = kind === "baseline" || kind === "baselines" ? "baselines" : "sessions";
      const finalPath = path.join(this.recordingsDir, subFolder, id, "video.webm");
      if (fs.existsSync(finalPath)) {
        const stats = await fs.promises.stat(finalPath);
        return { relativePath: `${subFolder}/${id}/video.webm`, fileSizeBytes: stats.size };
      }
      return null;
    }

    this.activeStreams.delete(id);

    await new Promise((resolve) => {
      streamInfo.writeStream.end(() => resolve());
    });

    if (fs.existsSync(streamInfo.partialPath)) {
      // Patch duration in WebM EBML header for seeking support
      if (typeof durationMs === "number" && durationMs > 0) {
        try {
          await fixWebmDuration(streamInfo.partialPath, durationMs);
        } catch (err) {
          console.warn("[StorageManager] EBML duration patch warning:", err.message);
        }
      }

      await fs.promises.rename(streamInfo.partialPath, streamInfo.finalPath);
      const stats = await fs.promises.stat(streamInfo.finalPath);
      return {
        relativePath: streamInfo.relativePath,
        fileSizeBytes: stats.size,
      };
    }

    return null;
  }

  async abortRecordingStream(id, kind = "sessions") {
    const streamInfo = this.activeStreams.get(id);
    if (streamInfo) {
      this.activeStreams.delete(id);
      try {
        streamInfo.writeStream.destroy();
      } catch {}
      if (fs.existsSync(streamInfo.partialPath)) {
        try {
          await fs.promises.unlink(streamInfo.partialPath);
        } catch {}
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Backward-compatible Audio Recording Wrappers (for legacy calls)
  // ---------------------------------------------------------------------------
  async startAudioRecording(recordingId) {
    return this.startRecordingStream(recordingId, "sessions");
  }

  async appendAudioChunk(recordingId, chunkBuffer) {
    const streamInfo = this.activeStreams.get(recordingId);
    const seq = streamInfo ? streamInfo.expectedSeq : 0;
    return this.appendChunk(recordingId, seq, chunkBuffer);
  }

  async finalizeAudioRecording(recordingId) {
    const res = await this.finalizeRecordingStream(recordingId, "sessions", 0);
    return res ? res.relativePath : null;
  }

  // ---------------------------------------------------------------------------
  // Startup Reconciliation & Crash Recovery
  // ---------------------------------------------------------------------------
  async reconcileOnStartup(onInterruptedTavus) {
    try {
      // 1. Mark interrupted in-flight rows in SQLite
      const interruptedRows = await this.execute("recordings:reconcile-in-flight").catch(() => []);
      console.log(`[StorageManager] Reconciled ${interruptedRows?.length || 0} in-flight recording rows on startup.`);

      if (Array.isArray(interruptedRows) && typeof onInterruptedTavus === "function") {
        for (const row of interruptedRows) {
          if (row && row.tavus_conversation_id) {
            try {
              onInterruptedTavus(row.tavus_conversation_id);
            } catch {}
          }
        }
      }

      // 2. Scan folders for orphaned .partial files
      const subFolders = ["sessions", "baselines"];
      for (const sub of subFolders) {
        const baseSubDir = path.join(this.recordingsDir, sub);
        if (!fs.existsSync(baseSubDir)) continue;
        const entries = await fs.promises.readdir(baseSubDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const folderPath = path.join(baseSubDir, entry.name);
          const partialFile = path.join(folderPath, "video.webm.partial");
          const finalFile = path.join(folderPath, "video.webm");

          if (fs.existsSync(partialFile)) {
            const stats = await fs.promises.stat(partialFile);
            if (stats.size > 1024) {
              // Finalize so it stays playable
              await fs.promises.rename(partialFile, finalFile).catch(() => {});
            } else {
              // Quarantine or unlink corrupt tiny stub
              const quarantineTarget = path.join(this.recordingsDir, "quarantine", `${entry.name}.partial`);
              await fs.promises.rename(partialFile, quarantineTarget).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error("[StorageManager] Error during startup reconciliation:", err);
    }
  }

  emergencyFlushSync() {
    for (const [id, streamInfo] of this.activeStreams.entries()) {
      try {
        if (streamInfo.writeStream && !streamInfo.writeStream.destroyed) {
          streamInfo.writeStream.end();
        }
      } catch (err) {
        console.error(`[StorageManager] Emergency flush failed for id ${id}:`, err);
      }
    }
    this.activeStreams.clear();
  }

  close() {
    this.isClosing = true;
    this.emergencyFlushSync();
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
