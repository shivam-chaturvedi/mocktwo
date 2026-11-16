/**
 * seedOrchestrator.cjs
 *
 * Coordinates production-grade first-run seeding across background workers and SQLite storage.
 * Enforces non-negotiable rules:
 * - R1: No hard-coded counts; derived exclusively from JSON arrays.
 * - R3: Thin main-thread footprint; heavy tasks run in WorkerPool, storage runs in dbWorker.
 * - R5: No network calls inside DB transactions; chunked by SEED_BATCH_SIZE.
 * - R6: Idempotent inserts with ON CONFLICT DO NOTHING, preserving user edits and soft deletes.
 */

const path = require("path");
const fs = require("fs");
const { WorkerPool } = require("./workerPool.cjs");
const { getConfig } = require("../config/seedConfig.cjs");
const { TavusClient } = require("../tavus/tavusClient.cjs");

class SeedOrchestrator {
  constructor(storageManager, options = {}) {
    this.storage = storageManager;
    this.options = options;
    this.conf = getConfig();
    this.workerPool = options.workerPool || new WorkerPool();
    this.tavusClient = options.tavusClient || new TavusClient();
    this.sendProgressCallback = options.onProgress || null;

    this.activeRunPromise = null;
    this.currentStatus = {
      isSeeding: false,
      personasStatus: "pending", // 'pending' | 'partial' | 'complete'
      scenariosStatus: "pending",
      unboundPersonasCount: 0,
      totalPersonasCount: 0,
      totalScenariosCount: 0,
      attempts: 0,
      lastError: null,
      errorCode: null,
    };
  }

  emitProgress(step, details = {}) {
    this.currentStatus = {
      ...this.currentStatus,
      ...details,
      step,
    };
    if (typeof this.sendProgressCallback === "function") {
      try {
        this.sendProgressCallback(this.currentStatus);
      } catch (err) {
        console.warn("[SeedOrchestrator] Error delivering progress event:", err.message);
      }
    }
  }

  getStatus() {
    return { ...this.currentStatus };
  }

  /**
   * Main entry point to run seeding. Guarded by single-flight promise.
   */
  async runSeeding(options = {}) {
    if (this.activeRunPromise) {
      return this.activeRunPromise;
    }

    this.activeRunPromise = this._executeSeeding(options).finally(() => {
      this.activeRunPromise = null;
    });

    return this.activeRunPromise;
  }

  async _executeSeeding(options = {}) {
    const conf = this.conf;
    if (!conf.SEED_ENABLED) {
      console.log("[SeedOrchestrator] Seeding is disabled via config.");
      return { skipped: true, reason: "disabled" };
    }

    this.currentStatus.isSeeding = true;
    this.currentStatus.lastError = null;
    this.currentStatus.errorCode = null;
    this.emitProgress("starting", { isSeeding: true, lastError: null, errorCode: null });

    try {
      // Step 1: Load and validate seed files via worker thread
      let personasSeed = options.personasSeed;
      let scenariosSeed = options.scenariosSeed;

      if (!personasSeed) {
        const personasPath = path.join(__dirname, "personas.seed.json");
        personasSeed = JSON.parse(fs.readFileSync(personasPath, "utf8"));
      }
      if (!scenariosSeed) {
        const scenariosPath = path.join(__dirname, "scenarios.seed.json");
        scenariosSeed = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
      }

      this.emitProgress("validating_json");
      const validationResult = await this.workerPool.runTask("validateSeedFiles", {
        personasContent: personasSeed,
        scenariosContent: scenariosSeed,
      });

      if (!validationResult.valid) {
        throw new Error(validationResult.error || "Seed files validation failed");
      }

      const { personas, scenarios, seedVersion } = validationResult;
      this.currentStatus.totalPersonasCount = personas.length;
      this.currentStatus.totalScenariosCount = scenarios.length;

      // -----------------------------------------------------------------------
      // Stage A: Personas Content (Offline-Safe)
      // -----------------------------------------------------------------------
      this.emitProgress("seeding_personas_content");
      const batchSize = conf.SEED_BATCH_SIZE;
      let personasInserted = 0;

      for (let i = 0; i < personas.length; i += batchSize) {
        const chunk = personas.slice(i, i + batchSize);
        const res = await this.storage.execute("seed:upsert-personas", {
          items: chunk,
          seedVersion,
        });
        if (res && typeof res.count === "number") {
          personasInserted += res.count;
        }
      }

      await this.storage.execute("seed:set-state", {
        key: "personas",
        status: "partial",
        seedVersion,
        attempts: this.currentStatus.attempts,
        lastError: null,
      });
      this.currentStatus.personasStatus = "partial";

      // -----------------------------------------------------------------------
      // Stage B: Face Binding (Network call outside DB transaction)
      // -----------------------------------------------------------------------
      this.emitProgress("checking_unbound_faces");
      const unboundPersonas = await this.storage.execute("seed:get-unbound-personas");
      this.currentStatus.unboundPersonasCount = unboundPersonas.length;

      if (unboundPersonas.length > 0) {
        this.emitProgress("fetching_tavus_faces", {
          unboundPersonasCount: unboundPersonas.length,
        });

        let candidateFaces = [];
        let fetchError = null;
        const targetCandidates = unboundPersonas.length * conf.SEED_FACE_POOL_MULTIPLIER;
        const pageSize = conf.TAVUS_FACES_PAGE_SIZE;
        const maxPages = conf.TAVUS_FACES_MAX_PAGES;

        for (let page = 1; page <= maxPages; page++) {
          try {
            const pageRes = await this.tavusClient.listFaces({
              page,
              limit: pageSize,
              model_name: conf.TAVUS_FACE_MODEL_NAME || undefined,
            });

            if (pageRes && Array.isArray(pageRes.data)) {
              candidateFaces.push(...pageRes.data);
            }

            if (!pageRes || !Array.isArray(pageRes.data) || pageRes.data.length < pageSize || candidateFaces.length >= targetCandidates) {
              break;
            }
          } catch (err) {
            console.warn("[SeedOrchestrator] Error fetching face page:", page, err.message);
            fetchError = err;
            break;
          }
        }

        if (candidateFaces.length > 0) {
          this.emitProgress("assigning_faces");
          const assignment = await this.workerPool.runTask("filterAndAssignFaces", {
            unboundPersonas,
            rawFaces: candidateFaces,
            existingAssignedFaceIds: options.existingAssignedFaceIds || [],
            seedKey: options.seedKey || "mocktwo-installation-seed",
          });

          if (assignment && assignment.bindings && assignment.bindings.length > 0) {
            // Write bound faces in chunked batches
            for (let i = 0; i < assignment.bindings.length; i += batchSize) {
              const chunk = assignment.bindings.slice(i, i + batchSize);
              await this.storage.execute("seed:bind-faces", { bindings: chunk });
            }
          }

          // Check remaining unbound count
          const remainingUnbound = await this.storage.execute("seed:get-unbound-personas");
          this.currentStatus.unboundPersonasCount = remainingUnbound.length;

          if (remainingUnbound.length === 0) {
            await this.storage.execute("seed:set-state", {
              key: "personas",
              status: "complete",
              seedVersion,
              attempts: this.currentStatus.attempts,
              lastError: null,
            });
            this.currentStatus.personasStatus = "complete";
          } else {
            console.warn(`[SeedOrchestrator] ${remainingUnbound.length} personas remain without bound faces.`);
          }
        } else if (fetchError) {
          this.currentStatus.lastError = fetchError.message;
          this.currentStatus.errorCode = fetchError.code || "network_error";
          await this.storage.execute("seed:set-state", {
            key: "personas",
            status: "partial",
            seedVersion,
            attempts: this.currentStatus.attempts + 1,
            lastError: fetchError.message,
          });
        }
      } else {
        await this.storage.execute("seed:set-state", {
          key: "personas",
          status: "complete",
          seedVersion,
          attempts: this.currentStatus.attempts,
          lastError: null,
        });
        this.currentStatus.personasStatus = "complete";
      }

      // -----------------------------------------------------------------------
      // Stage C: Scenarios (Offline-Safe; Links to Persona Rows)
      // -----------------------------------------------------------------------
      this.emitProgress("seeding_scenarios");
      let scenariosInserted = 0;
      for (let i = 0; i < scenarios.length; i += batchSize) {
        const chunk = scenarios.slice(i, i + batchSize);
        const res = await this.storage.execute("seed:upsert-scenarios", {
          items: chunk,
          seedVersion,
        });
        if (res && typeof res.count === "number") {
          scenariosInserted += res.count;
        }
      }

      await this.storage.execute("seed:set-state", {
        key: "scenarios",
        status: "complete",
        seedVersion,
        attempts: 0,
        lastError: null,
      });
      this.currentStatus.scenariosStatus = "complete";

      if (this.currentStatus.personasStatus === "complete") {
        this.currentStatus.lastError = null;
        this.currentStatus.errorCode = null;
      }

      this.emitProgress("completed", {
        isSeeding: false,
        lastError: this.currentStatus.lastError,
        errorCode: this.currentStatus.errorCode,
        personasStatus: this.currentStatus.personasStatus,
        scenariosStatus: "complete",
      });

      return {
        success: true,
        personasInserted,
        scenariosInserted,
        faceBindingSuccess: this.currentStatus.personasStatus === "complete",
        personasStatus: this.currentStatus.personasStatus,
        scenariosStatus: "complete",
        unboundCount: this.currentStatus.unboundPersonasCount,
      };
    } catch (err) {
      console.error("[SeedOrchestrator] Seeding error:", err);
      this.currentStatus.lastError = err.message;
      this.currentStatus.isSeeding = false;
      this.emitProgress("error", {
        isSeeding: false,
        lastError: err.message,
      });
      throw err;
    }
  }

  async shutdown() {
    if (this.workerPool) {
      await this.workerPool.terminate();
    }
  }
}

module.exports = { SeedOrchestrator };
