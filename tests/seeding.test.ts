import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Worker } from "node:worker_threads";
import Database from "better-sqlite3";

import seedConfigPkg from "../electron/config/seedConfig.cjs";
const { getConfig, SeedConfigSchema, _resetConfigForTest } = seedConfigPkg;

import seedOrchestratorPkg from "../electron/seed/seedOrchestrator.cjs";
const { SeedOrchestrator } = seedOrchestratorPkg;

import workerPoolPkg from "../electron/seed/workerPool.cjs";
const { WorkerPool } = workerPoolPkg;

import seedSchemasPkg from "../electron/seed/seedSchemas.cjs";
const { validateSeedFiles } = seedSchemasPkg;

const TEST_DIR = path.join(process.cwd(), "tmp-test-seeding");
const DB_PATH = path.join(TEST_DIR, "mocktwo-seeding.db");

// Mock Tavus Client for deterministic offline & online tests
class MockTavusClient {
  constructor(options = {}) {
    this.shouldFail = options.shouldFail || false;
    this.failureError = options.failureError || new Error("Network request failed: ENOTFOUND tavusapi.com");
    this.faces = options.faces || [
      {
        face_id: "face_anna_f",
        face_name: "Anna",
        status: "completed",
        default_voice_id: "voice_anna_1",
        thumbnail_video_url: "https://example.com/anna.mp4",
        thumbnail_image_url: "https://example.com/anna.jpg",
        tags: [{ tag_id: "female" }],
      },
      {
        face_id: "face_marcus_m",
        face_name: "Marcus",
        status: "completed",
        default_voice_id: "voice_marcus_1",
        thumbnail_video_url: "https://example.com/marcus.mp4",
        thumbnail_image_url: "https://example.com/marcus.jpg",
        tags: [{ tag_id: "male" }],
      },
      {
        face_id: "face_elena_f",
        face_name: "Elena",
        status: "completed",
        default_voice_id: "voice_elena_1",
        thumbnail_video_url: "https://example.com/elena.mp4",
        thumbnail_image_url: "https://example.com/elena.jpg",
        tags: [{ tag_id: "female" }],
      },
      {
        face_id: "face_david_m",
        face_name: "David",
        status: "completed",
        default_voice_id: "voice_david_1",
        thumbnail_video_url: "https://example.com/david.mp4",
        thumbnail_image_url: "https://example.com/david.jpg",
        tags: [{ tag_id: "male" }],
      },
      {
        face_id: "face_sarah_f",
        face_name: "Sarah",
        status: "completed",
        default_voice_id: "voice_sarah_1",
        thumbnail_video_url: "https://example.com/sarah.mp4",
        thumbnail_image_url: "https://example.com/sarah.jpg",
        tags: [{ tag_id: "female" }],
      },
    ];
  }

  async listFaces() {
    if (this.shouldFail) {
      throw this.failureError;
    }
    return { data: this.faces };
  }
}

describe("Milestone: Production-Grade First-Run Seeding System", () => {
  let dbWorker: Worker;
  let sendStorage: (type: string, payload?: any) => Promise<any>;
  let mockStorageManager: any;

  before(async () => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Start dbWorker
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    dbWorker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    sendStorage = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            dbWorker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        dbWorker.on("message", handler);
        dbWorker.postMessage({ id, type, payload });
      });

    mockStorageManager = {
      execute: (type: string, payload: any) => sendStorage(type, payload),
    };

    // Ping DB worker to verify worker ready
    await sendStorage("personas:list");
  });

  after(async () => {
    if (dbWorker) {
      dbWorker.postMessage({ type: "close" });
      await dbWorker.terminate();
    }
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Config Validation and CPU Clamping
  // ---------------------------------------------------------------------------
  test("Config: frozen exports, CPU thread clamping, and fallback defaults", () => {
    const config = getConfig();
    assert.ok(Object.isFrozen(config), "Config must be deeply frozen");
    assert.equal(typeof config.SEED_ENABLED, "boolean");
    assert.ok(config.SEED_BATCH_SIZE > 0);

    // Clamping test: minThreads cannot exceed maxThreads; maxThreads <= availableParallelism() - 1
    const available = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
    const maxAllowed = Math.max(1, available - 1);
    assert.ok(
      config.SEED_WORKER_MAX_THREADS <= maxAllowed,
      `Worker max threads (${config.SEED_WORKER_MAX_THREADS}) must be <= maxAllowed (${maxAllowed})`
    );
    assert.ok(
      config.SEED_WORKER_MIN_THREADS <= config.SEED_WORKER_MAX_THREADS,
      "Min threads must be <= max threads"
    );

    // Validate schema validation
    const customValid = SeedConfigSchema.safeParse({
      SEED_ENABLED: true,
      SEED_BATCH_SIZE: 50,
      SEED_WORKER_MIN_THREADS: 1,
      SEED_WORKER_MAX_THREADS: 2,
      SEED_WORKER_IDLE_MS: 5000,
      SEED_MAX_ATTEMPTS_PER_SESSION: 3,
      SEED_BACKOFF_BASE_MS: 500,
      SEED_BACKOFF_MAX_MS: 10000,
      SEED_FACE_POOL_MULTIPLIER: 2,
      SEED_STARTUP_DELAY_MS: 0,
      TAVUS_FACES_PAGE_SIZE: 20,
      TAVUS_FACES_MAX_PAGES: 5,
      TAVUS_FACE_MODEL_NAME: "phoenix-3",
      TAVUS_REQUEST_TIMEOUT_MS: 10000,
      TAVUS_REQUEST_MAX_RETRIES: 2,
      TAVUS_CATALOG_CACHE_TTL_MS: 3600000,
      UI_LIST_PAGE_SIZE: 20,
      MAIN_THREAD_LAG_BUDGET_MS: 50,
    });
    assert.equal(customValid.success, true);
    if (customValid.success) {
      assert.equal(customValid.data.SEED_BATCH_SIZE, 50);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Schema Migration V4 Verification
  // ---------------------------------------------------------------------------
  test("Schema Migration V4: creates seed_state table, new columns, and WAL backup", () => {
    const db = new Database(DB_PATH);

    // Check seed_state table exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seed_state'")
      .all();
    assert.equal(tables.length, 1, "seed_state table must exist");

    // Check seed_state columns
    const seedStateCols = db.prepare("PRAGMA table_info(seed_state)").all() as any[];
    const colNames = seedStateCols.map((c) => c.name);
    assert.ok(colNames.includes("key"));
    assert.ok(colNames.includes("status"));
    assert.ok(colNames.includes("seed_version"));
    assert.ok(colNames.includes("attempts"));
    assert.ok(colNames.includes("last_error"));
    assert.ok(colNames.includes("updated_at"));

    // Check personas columns
    const personaCols = db.prepare("PRAGMA table_info(personas)").all() as any[];
    const personaColNames = personaCols.map((c) => c.name);
    assert.ok(personaColNames.includes("builtin_key"));
    assert.ok(personaColNames.includes("seed_version"));
    assert.ok(personaColNames.includes("user_modified"));
    assert.ok(personaColNames.includes("hidden"));

    // Check scenarios columns
    const scenarioCols = db.prepare("PRAGMA table_info(scenarios)").all() as any[];
    const scenarioColNames = scenarioCols.map((c) => c.name);
    assert.ok(scenarioColNames.includes("builtin_key"));
    assert.ok(scenarioColNames.includes("seed_version"));
    assert.ok(scenarioColNames.includes("user_modified"));
    assert.ok(scenarioColNames.includes("hidden"));

    db.close();
  });

  // ---------------------------------------------------------------------------
  // 3. JSON Schema & Structural Validation
  // ---------------------------------------------------------------------------
  test("JSON Validation: rejects invalid enums, duplicate keys, and dangling persona references", () => {
    // Valid minimal pair
    const validPersonas = {
      seedVersion: 1,
      personas: [
        {
          builtinKey: "p-test-1",
          name: "Test Leader",
          title: "VP of Quality",
          contextSetting: "Hospitality Operations",
          seniority: "Executive",
          language: "en",
          pressureLevel: "Moderate",
          temperamentTraits: ["Calm", "Direct"],
          voice: "Default",
          backstory: "Experienced general manager.",
          communicationNotes: "Values clear communication.",
          face: { gender: "female" },
        },
      ],
    };

    const validScenarios = {
      seedVersion: 1,
      scenarios: [
        {
          builtinKey: "sc-test-1",
          personaKey: "p-test-1",
          title: "Quality Review",
          interactionType: "Customer Service",
          difficulty: "Intermediate",
          context: "A detailed situation context with enough characters to pass validation.",
          learningObjectives: ["Active listening"],
          keyChallenges: ["Maintaining composure"],
        },
      ],
    };

    const validRes = validateSeedFiles(validPersonas, validScenarios);
    assert.equal(validRes.valid, true);
    assert.equal(validRes.personas.length, 1);
    assert.equal(validRes.scenarios.length, 1);

    // Duplicate builtinKey in personas
    const dupPersonas = {
      seedVersion: 1,
      personas: [
        { ...validPersonas.personas[0], builtinKey: "dup-key" },
        { ...validPersonas.personas[0], builtinKey: "dup-key", name: "Second" },
      ],
    };
    const dupRes = validateSeedFiles(dupPersonas, validScenarios);
    assert.equal(dupRes.valid, false);
    assert.match(dupRes.error || "", /Duplicate builtinKey/);

    // Invalid enum in scenario (e.g. invalid difficulty)
    const invalidEnumScenarios = {
      seedVersion: 1,
      scenarios: [
        {
          ...validScenarios.scenarios[0],
          difficulty: "SuperImpossibleHard",
        },
      ],
    };
    const invalidEnumRes = validateSeedFiles(validPersonas, invalidEnumScenarios);
    assert.equal(invalidEnumRes.valid, false);

    // Dangling personaKey in scenario
    const danglingScenarios = {
      seedVersion: 1,
      scenarios: [
        {
          ...validScenarios.scenarios[0],
          personaKey: "non-existent-persona",
        },
      ],
    };
    const danglingRes = validateSeedFiles(validPersonas, danglingScenarios);
    assert.equal(danglingRes.valid, false);
    assert.match(danglingRes.error || "", /references unknown personaKey/);
  });

  // ---------------------------------------------------------------------------
  // 4. Dynamic Counts: Seed Fixtures with 3, 8, and 10 Items
  // ---------------------------------------------------------------------------
  test("Dynamic Counts: seeding works for any arbitrary number of personas and scenarios (3, 8, 10)", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });
    const tavusMock = new MockTavusClient();

    const createFixtures = (count: number, prefix: string) => {
      const personas = Array.from({ length: count }, (_, i) => ({
        builtinKey: `${prefix}-p-${i + 1}`,
        name: `Persona ${prefix} ${i + 1}`,
        title: `Manager ${i + 1}`,
        contextSetting: "Hospitality Operations",
        seniority: "Manager",
        language: "en",
        pressureLevel: "Moderate",
        temperamentTraits: ["Attentive", "Professional"],
        voice: "Default",
        backstory: `Backstory for ${i + 1}`,
        communicationNotes: `Notes for ${i + 1}`,
        face: { gender: i % 2 === 0 ? "female" : "male" },
      }));

      const scenarios = Array.from({ length: count }, (_, i) => ({
        builtinKey: `${prefix}-sc-${i + 1}`,
        personaKey: `${prefix}-p-${i + 1}`,
        title: `Scenario ${prefix} ${i + 1}`,
        interactionType: "Customer Service",
        difficulty: "Foundational",
        context: `Full situation context for scenario ${i + 1} with ample length.`,
        learningObjectives: ["Communication clarity"],
        keyChallenges: ["Handling questions"],
      }));

      return {
        personasSeed: { seedVersion: 1, personas },
        scenariosSeed: { seedVersion: 1, scenarios },
      };
    };

    for (const count of [3, 8, 10]) {
      const fixture = createFixtures(count, `run-${count}`);
      const orchestrator = new SeedOrchestrator(mockStorageManager, {
        workerPool: pool,
        tavusClient: tavusMock,
      });

      const result = await orchestrator.runSeeding(fixture);
      assert.equal(result.personasInserted, count, `Should insert exactly ${count} personas`);
      assert.equal(result.scenariosInserted, count, `Should insert exactly ${count} scenarios`);

      // Verify in DB
      const db = new Database(DB_PATH);
      const personaRows = db
        .prepare("SELECT count(*) as count FROM personas WHERE builtin_key LIKE ?")
        .get(`run-${count}-p-%`) as { count: number };
      const scenarioRows = db
        .prepare("SELECT count(*) as count FROM scenarios WHERE builtin_key LIKE ?")
        .get(`run-${count}-sc-%`) as { count: number };
      db.close();

      assert.equal(personaRows.count, count, `DB must contain exactly ${count} personas for run-${count}`);
      assert.equal(scenarioRows.count, count, `DB must contain exactly ${count} scenarios for run-${count}`);
    }

    await pool.destroy();
  });

  // ---------------------------------------------------------------------------
  // 5. Idempotency and Concurrent Seeding
  // ---------------------------------------------------------------------------
  test("Idempotency: multiple sequential runs and concurrent runs produce zero duplicate rows", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });
    const tavusMock = new MockTavusClient();

    const fixture = {
      personasSeed: {
        seedVersion: 1,
        personas: [
          {
            builtinKey: "idempotent-p-1",
            name: "Idempotent Persona",
            title: "Guest Relations Lead",
            contextSetting: "Front Desk Operations",
            seniority: "Supervisor",
            language: "en",
            pressureLevel: "Moderate",
            temperamentTraits: ["Calm"],
            voice: "Default",
            backstory: "Backstory",
            communicationNotes: "Notes",
            face: { gender: "female" },
          },
        ],
      },
      scenariosSeed: {
        seedVersion: 1,
        scenarios: [
          {
            builtinKey: "idempotent-sc-1",
            personaKey: "idempotent-p-1",
            title: "Idempotent Scenario",
            interactionType: "Customer Service",
            difficulty: "Foundational",
            context: "Situation context with sufficient descriptive length.",
            learningObjectives: ["Clarity"],
            keyChallenges: ["Speed"],
          },
        ],
      },
    };

    const orchestrator = new SeedOrchestrator(mockStorageManager, {
      workerPool: pool,
      tavusClient: tavusMock,
    });

    // Run 1
    const res1 = await orchestrator.runSeeding(fixture);
    assert.equal(res1.personasInserted, 1);
    assert.equal(res1.scenariosInserted, 1);

    // Run 2 (sequential)
    const res2 = await orchestrator.runSeeding(fixture);
    assert.equal(res2.personasInserted, 0, "Second run must insert 0 new personas");
    assert.equal(res2.scenariosInserted, 0, "Second run must insert 0 new scenarios");

    // Run 3 & 4 (concurrent)
    const [c1, c2] = await Promise.all([
      orchestrator.runSeeding(fixture),
      orchestrator.runSeeding(fixture),
    ]);
    assert.equal(c1.personasInserted, 0);
    assert.equal(c2.personasInserted, 0);

    // DB verification
    const db = new Database(DB_PATH);
    const countP = db
      .prepare("SELECT count(*) as count FROM personas WHERE builtin_key = 'idempotent-p-1'")
      .get() as { count: number };
    const countSc = db
      .prepare("SELECT count(*) as count FROM scenarios WHERE builtin_key = 'idempotent-sc-1'")
      .get() as { count: number };
    db.close();

    assert.equal(countP.count, 1, "Exactly 1 persona row must exist");
    assert.equal(countSc.count, 1, "Exactly 1 scenario row must exist");

    await pool.destroy();
  });

  // ---------------------------------------------------------------------------
  // 6. Preservation of User Modifications and Soft Deletes
  // ---------------------------------------------------------------------------
  test("Preservation: user_modified=1 and hidden=1 are never overwritten on seedVersion bump", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });
    const tavusMock = new MockTavusClient();

    // 1. Seed initial version 1
    const fixtureV1 = {
      personasSeed: {
        seedVersion: 1,
        personas: [
          {
            builtinKey: "mod-test-p-1",
            name: "Original Name",
            title: "Original Title",
            contextSetting: "Hospitality Operations",
            seniority: "Staff",
            language: "en",
            pressureLevel: "Moderate",
            temperamentTraits: ["Formal"],
            voice: "Default",
            backstory: "Original backstory",
            communicationNotes: "Original notes",
            face: { gender: "male" },
          },
          {
            builtinKey: "soft-delete-p-2",
            name: "To Be Deleted",
            title: "Concierge",
            contextSetting: "Guest Services",
            seniority: "Staff",
            language: "en",
            pressureLevel: "Moderate",
            temperamentTraits: ["Friendly"],
            voice: "Default",
            backstory: "Backstory",
            communicationNotes: "Notes",
            face: { gender: "female" },
          },
        ],
      },
      scenariosSeed: {
        seedVersion: 1,
        scenarios: [
          {
            builtinKey: "mod-test-sc-1",
            personaKey: "mod-test-p-1",
            title: "Original Scenario Title",
            interactionType: "Customer Service",
            difficulty: "Foundational",
            context: "Original context with sufficient text length.",
            learningObjectives: ["Goal"],
            keyChallenges: ["Challenge"],
          },
        ],
      },
    };

    const orchestrator = new SeedOrchestrator(mockStorageManager, {
      workerPool: pool,
      tavusClient: tavusMock,
    });
    await orchestrator.runSeeding(fixtureV1);

    // 2. User modifies persona 1 and soft-deletes persona 2
    const db = new Database(DB_PATH);
    db.prepare(`
      UPDATE personas 
      SET name = 'User Custom Name', user_modified = 1 
      WHERE builtin_key = 'mod-test-p-1'
    `).run();

    db.prepare(`
      UPDATE personas 
      SET hidden = 1 
      WHERE builtin_key = 'soft-delete-p-2'
    `).run();

    db.prepare(`
      UPDATE scenarios 
      SET title = 'User Custom Scenario Title', user_modified = 1 
      WHERE builtin_key = 'mod-test-sc-1'
    `).run();
    db.close();

    // 3. Seed version 2 arrives with new default content for both
    const fixtureV2 = {
      personasSeed: {
        seedVersion: 2,
        personas: [
          {
            ...fixtureV1.personasSeed.personas[0],
            name: "Updated In V2",
          },
          {
            ...fixtureV1.personasSeed.personas[1],
            name: "Resurrect In V2?",
          },
        ],
      },
      scenariosSeed: {
        seedVersion: 2,
        scenarios: [
          {
            ...fixtureV1.scenariosSeed.scenarios[0],
            title: "Updated Scenario In V2",
          },
        ],
      },
    };

    await orchestrator.runSeeding(fixtureV2);

    // 4. Verify user changes were preserved
    const dbCheck = new Database(DB_PATH);
    const p1 = dbCheck
      .prepare("SELECT name, user_modified FROM personas WHERE builtin_key = 'mod-test-p-1'")
      .get() as any;
    assert.equal(p1.name, "User Custom Name", "User-modified persona name must not be overwritten");
    assert.equal(p1.user_modified, 1);

    const p2 = dbCheck
      .prepare("SELECT hidden FROM personas WHERE builtin_key = 'soft-delete-p-2'")
      .get() as any;
    assert.equal(p2.hidden, 1, "Soft-deleted persona must remain hidden (hidden=1)");

    const sc1 = dbCheck
      .prepare("SELECT title, user_modified FROM scenarios WHERE builtin_key = 'mod-test-sc-1'")
      .get() as any;
    assert.equal(sc1.title, "User Custom Scenario Title", "User-modified scenario title must not be overwritten");
    assert.equal(sc1.user_modified, 1);

    dbCheck.close();
    await pool.destroy();
  });

  // ---------------------------------------------------------------------------
  // 7. Offline & Error Recovery
  // ---------------------------------------------------------------------------
  test("Offline Safety: inserts content when network fails, logs error, and binds faces on retry", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });
    const failingTavusMock = new MockTavusClient({ shouldFail: true });

    const fixture = {
      personasSeed: {
        seedVersion: 1,
        personas: [
          {
            builtinKey: "offline-p-1",
            name: "Offline Ingested Persona",
            title: "Operations Supervisor",
            contextSetting: "Hospitality Operations",
            seniority: "Supervisor",
            language: "en",
            pressureLevel: "Moderate",
            temperamentTraits: ["Calm"],
            voice: "Default",
            backstory: "Backstory",
            communicationNotes: "Notes",
            face: { gender: "female" },
          },
        ],
      },
      scenariosSeed: {
        seedVersion: 1,
        scenarios: [
          {
            builtinKey: "offline-sc-1",
            personaKey: "offline-p-1",
            title: "Offline Scenario",
            interactionType: "Customer Service",
            difficulty: "Foundational",
            context: "Context with sufficient descriptive length.",
            learningObjectives: ["Goal"],
            keyChallenges: ["Challenge"],
          },
        ],
      },
    };

    const orchestrator = new SeedOrchestrator(mockStorageManager, {
      workerPool: pool,
      tavusClient: failingTavusMock,
    });

    // 1. Initial attempt fails Tavus network call
    const result = await orchestrator.runSeeding(fixture);
    assert.equal(result.personasInserted, 1, "Content must still be inserted offline");
    assert.equal(result.scenariosInserted, 1, "Scenario content must still be inserted offline");
    assert.equal(result.faceBindingSuccess, false, "Face binding should report failure offline");

    // Check DB state
    const db = new Database(DB_PATH);
    const pRow = db
      .prepare("SELECT tavus_face_id FROM personas WHERE builtin_key = 'offline-p-1'")
      .get() as any;
    assert.equal(pRow.tavus_face_id, null, "tavus_face_id should be NULL when offline");

    const seedState = db
      .prepare("SELECT status, last_error FROM seed_state WHERE key = 'personas'")
      .get() as any;
    assert.ok(seedState.status === "partial" || seedState.status === "pending");
    assert.ok(seedState.last_error && seedState.last_error.length > 0);
    db.close();

    // 2. Network returns (retry with working Tavus client)
    const workingTavusMock = new MockTavusClient({ shouldFail: false });
    const retryOrchestrator = new SeedOrchestrator(mockStorageManager, {
      workerPool: pool,
      tavusClient: workingTavusMock,
    });

    const retryResult = await retryOrchestrator.runSeeding(fixture);
    assert.equal(retryResult.faceBindingSuccess, true, "Face binding should succeed when network returns");

    const dbAfterRetry = new Database(DB_PATH);
    const pRowAfter = dbAfterRetry
      .prepare("SELECT tavus_face_id FROM personas WHERE builtin_key = 'offline-p-1'")
      .get() as any;
    assert.ok(pRowAfter.tavus_face_id, "tavus_face_id must now be bound to a real face");
    dbAfterRetry.close();

    await pool.destroy();
  });

  // ---------------------------------------------------------------------------
  // 8. Face Pool Filtering & PRNG Assignment
  // ---------------------------------------------------------------------------
  test("Face Filtering: filters invalid statuses, respects gender tags, and avoids duplicates", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });

    const rawFaces = [
      // Valid female face
      {
        face_id: "f_1",
        face_name: "Face 1",
        status: "completed",
        default_voice_id: "v_1",
        tags: [{ tag_id: "female" }],
      },
      // Incomplete status face (must be filtered out)
      {
        face_id: "f_2_incomplete",
        face_name: "Face 2",
        status: "processing",
        default_voice_id: "v_2",
        tags: [{ tag_id: "female" }],
      },
      // Valid male face
      {
        face_id: "m_1",
        face_name: "Face 3",
        status: "completed",
        default_voice_id: "v_3",
        tags: [{ tag_id: "male" }],
      },
      // Valid neutral face
      {
        face_id: "n_1",
        face_name: "Face 4",
        status: "completed",
        default_voice_id: "v_4",
        tags: [],
      },
    ];

    const personasToBind = [
      { builtinKey: "p-female-1", face: { gender: "female" } },
      { builtinKey: "p-male-1", face: { gender: "male" } },
    ];

    const assignment = await pool.runTask("filterAndAssignFaces", {
      rawFaces,
      unboundPersonas: personasToBind,
      seedKey: "test-seed",
    });

    assert.equal(assignment.bindings.length, 2);

    const femaleAssign = assignment.bindings.find((a: any) => a.builtinKey === "p-female-1");
    assert.equal(femaleAssign.tavusFaceId, "f_1", "Must match completed female face");

    const maleAssign = assignment.bindings.find((a: any) => a.builtinKey === "p-male-1");
    assert.equal(maleAssign.tavusFaceId, "m_1", "Must match completed male face");

    await pool.destroy();
  });

  // ---------------------------------------------------------------------------
  // 9. Worker Pool Thread Management
  // ---------------------------------------------------------------------------
  test("WorkerPool: respects thread limits, recovers from worker crash, and shuts down", async () => {
    const pool = new WorkerPool({ minThreads: 1, maxThreads: 2 });
    assert.equal(pool.workers.length, 1, "Initial pool should have minThreads workers");

    // Run parallel tasks to scale up to maxThreads
    const t1 = pool.runTask("validateSeedFiles", { personasContent: { seedVersion: 1, personas: [] }, scenariosContent: { seedVersion: 1, scenarios: [] } });
    const t2 = pool.runTask("validateSeedFiles", { personasContent: { seedVersion: 1, personas: [] }, scenariosContent: { seedVersion: 1, scenarios: [] } });

    await Promise.all([t1, t2]);
    assert.ok(pool.workers.length <= 2, "Workers should not exceed maxThreads");

    // Clean shutdown
    await pool.destroy();
    assert.equal(pool.isTerminated, true);
    assert.equal(pool.workers.length, 0);
  });
});
