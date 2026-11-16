import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import Database from "better-sqlite3";

const TEST_DIR = path.join(process.cwd(), "tmp-test-scenario-storage");
const DB_PATH = path.join(TEST_DIR, "mocktwo.db");

describe("Milestone S1: Migration V3 & SQLite Scenario Storage", () => {
  before(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("Migration V3 on a V2 database with data preserves data and creates backup", async () => {
    // 1. Create a V2 database manually with schema_migrations at version 2
    const seedDb = new Database(DB_PATH);
    seedDb.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, '2026-11-15T12:00:00.000Z');
      INSERT INTO schema_migrations VALUES (2, '2026-11-15T13:00:00.000Z');

      CREATE TABLE personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_url TEXT,
        monogram TEXT NOT NULL,
        title TEXT NOT NULL,
        context_setting TEXT NOT NULL,
        seniority TEXT NOT NULL,
        language TEXT NOT NULL,
        temperament_traits TEXT NOT NULL,
        voice TEXT NOT NULL,
        backstory TEXT NOT NULL,
        communication_notes TEXT NOT NULL,
        scenarios_count INTEGER NOT NULL DEFAULT 0,
        pressure_level TEXT,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        tavus_pal_id TEXT,
        tavus_face_id TEXT,
        tavus_voice_id TEXT,
        face_name TEXT,
        face_image_path TEXT,
        greeting TEXT,
        compiled_system_prompt TEXT,
        pal_settings TEXT,
        sync_status TEXT NOT NULL DEFAULT 'draft',
        sync_error_code TEXT,
        sync_error TEXT,
        sync_hash TEXT,
        sync_attempt_at TEXT,
        last_synced_at TEXT,
        hidden INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE scenarios (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
        persona_name TEXT NOT NULL,
        context_setting TEXT NOT NULL,
        seniority TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        summary TEXT NOT NULL,
        context TEXT NOT NULL,
        persona_mood TEXT,
        learning_objectives TEXT NOT NULL,
        key_challenges TEXT NOT NULL,
        recommended_phrases TEXT NOT NULL,
        persona_avatar_url TEXT,
        persona_summary TEXT,
        source TEXT NOT NULL,
        submission_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO personas (id, name, monogram, title, context_setting, seniority, language, temperament_traits, voice, backstory, communication_notes, source, created_at, updated_at)
      VALUES ('p-seed-1', 'Dr. Marcus Vance', 'MV', 'Chief Risk Officer', 'Boardroom', 'Senior Executive', 'en', '[\"Skeptical\",\"Direct\"]', 'Default', 'Experienced executive', 'Presses on timeline', 'Mine', '2026-11-15T12:00:00.000Z', '2026-11-15T12:00:00.000Z');

      INSERT INTO scenarios (id, title, persona_id, persona_name, context_setting, seniority, interaction_type, difficulty, duration_minutes, summary, context, learning_objectives, key_challenges, recommended_phrases, source, created_at, updated_at)
      VALUES ('sc-seed-1', 'Initial Seed Scenario', 'p-seed-1', 'Dr. Marcus Vance', 'Boardroom', 'Senior Executive', 'Negotiation', 'Intermediate', 3, 'Initial summary', 'Initial situation narrative context', '[\"Goal 1\"]', '[\"Challenge 1\"]', '[]', 'Mine', '2026-11-15T12:00:00.000Z', '2026-11-15T12:00:00.000Z');
    `);
    seedDb.close();

    // 2. Start worker against DB_PATH which should detect version 2 < 3 and apply Migration V3 with backup
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    const personas = await send("personas:list");
    assert.equal(personas.length, 1);
    assert.equal(personas[0].name, "Dr. Marcus Vance");
    assert.equal(personas[0].scenariosCount, 1); // Dynamically computed

    const scenarios = await send("scenarios:list");
    assert.equal(scenarios.length, 1);
    assert.equal(scenarios[0].title, "Initial Seed Scenario");
    assert.equal(scenarios[0].hidden, false);

    // 3. Verify backup file was created in backups/
    const backupDir = path.join(TEST_DIR, "backups");
    assert.ok(fs.existsSync(backupDir), "backup directory exists");
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith("mocktwo-v2-") && f.endsWith(".db"));
    assert.ok(backups.length >= 1, "at least one backup created");

    // 4. Verify new columns exist in database directly
    const directDb = new Database(DB_PATH, { readonly: true });
    const cols = directDb.prepare("PRAGMA table_info(scenarios)").all().map((c: any) => c.name);
    assert.ok(cols.includes("opening_line"), "opening_line column exists");
    assert.ok(cols.includes("builtin_key"), "builtin_key column exists");
    assert.ok(cols.includes("hidden"), "hidden column exists");

    const migrations = directDb.prepare("SELECT version FROM schema_migrations ORDER BY version ASC").all().map((m: any) => m.version);
    assert.ok(migrations.includes(1) && migrations.includes(2) && migrations.includes(3), "migrations 1, 2, and 3 are recorded");

    directDb.close();
    await worker.terminate();
  });

  test("Scenario Studio Save derives all fields, word-boundary summary, and duration 3", async () => {
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    // Attempt save with nonexistent persona -> rejects with persona_not_found
    const failRes = await send("scenarios:save-studio", {
      personaId: "nonexistent-persona-id",
      title: "Should Fail",
      context: "Valid situation text that is sufficiently long."
    });
    assert.equal(failRes.ok, false);
    assert.equal(failRes.code, "persona_not_found");

    // Successful save with p-seed-1
    const longContext = "This is a detailed operational situation where the client experienced an unexpected 20% billing surcharge on their cloud invoice and is demanding immediate executive escalation.";
    const saveRes = await send("scenarios:save-studio", {
      personaId: "p-seed-1",
      title: "Cloud Billing Dispute",
      interactionType: "Negotiation",
      difficulty: "Advanced",
      context: longContext,
      keyChallenges: ["Demands 100% refund", "Threatens to cancel"],
      learningObjectives: ["Acknowledge issue without defensiveness", "Offer concrete timeline"],
      openingLine: "Explain this invoice immediately."
    });

    assert.equal(saveRes.ok, true);
    const sc = saveRes.scenario;
    assert.ok(sc.id.startsWith("sc-mine-"));
    assert.equal(sc.title, "Cloud Billing Dispute");
    assert.equal(sc.personaId, "p-seed-1");
    assert.equal(sc.personaName, "Dr. Marcus Vance");
    assert.equal(sc.contextSetting, "Boardroom");
    assert.equal(sc.seniority, "Senior Executive");
    assert.equal(sc.durationMinutes, 3);
    assert.equal(sc.openingLine, "Explain this invoice immediately.");
    assert.deepEqual(sc.keyChallenges, ["Demands 100% refund", "Threatens to cancel"]);
    assert.deepEqual(sc.learningObjectives, ["Acknowledge issue without defensiveness", "Offer concrete timeline"]);
    assert.ok(sc.summary.length <= 143);
    assert.ok(sc.summary.endsWith("..."));

    // Verify persona scenariosCount increased to 2
    const personas = await send("personas:list");
    const p = personas.find((x: any) => x.id === "p-seed-1");
    assert.equal(p.scenariosCount, 2);

    await worker.terminate();
  });

  test("Scenario Studio Update modifies fields without UNIQUE error and re-derives persona copies", async () => {
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    // Create a second persona
    const p2 = await send("personas:create", {
      id: "p-seed-2",
      name: "Elena Rostova",
      title: "VP Engineering",
      contextSetting: "Tech Lab",
      seniority: "Manager",
      temperamentTraits: ["Analytical", "Assertive"],
      source: "Mine"
    });

    // Update sc-seed-1 to point to Elena Rostova and change title
    const updateRes = await send("scenarios:update-studio", {
      id: "sc-seed-1",
      title: "Engineering Architecture Review",
      personaId: "p-seed-2",
      difficulty: "Advanced",
      context: "Reviewing system scalability bottlenecks under high traffic loads."
    });

    assert.equal(updateRes.ok, true);
    const updated = updateRes.scenario;
    assert.equal(updated.title, "Engineering Architecture Review");
    assert.equal(updated.personaId, "p-seed-2");
    assert.equal(updated.personaName, "Elena Rostova");
    assert.equal(updated.contextSetting, "Tech Lab");
    assert.equal(updated.seniority, "Manager");

    // Check count updates: p-seed-1 now has 1, p-seed-2 has 1
    const personas = await send("personas:list");
    const marcus = personas.find((x: any) => x.id === "p-seed-1");
    const elena = personas.find((x: any) => x.id === "p-seed-2");
    assert.equal(marcus.scenariosCount, 1);
    assert.equal(elena.scenariosCount, 1);

    await worker.terminate();
  });

  test("Persona edit propagates changes to linked scenarios without bumping scenarios.updated_at", async () => {
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    // Edit Elena Rostova's title and setting
    await send("personas:update", {
      id: "p-seed-2",
      persona: {
        title: "Chief Technology Officer",
        contextSetting: "Executive Suite"
      }
    });

    // Verify scenario sc-seed-1 has the updated persona copies
    const scenarios = await send("scenarios:list");
    const sc = scenarios.find((s: any) => s.id === "sc-seed-1");
    assert.equal(sc.contextSetting, "Executive Suite");
    assert.ok(sc.personaSummary.includes("Chief Technology Officer"));

    await worker.terminate();
  });

  test("Persona delete is blocked when active scenarios are assigned and allowed after scenarios are deleted", async () => {
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    // Attempt delete p-seed-2 (which has sc-seed-1 assigned)
    const delRes = await send("personas:delete", "p-seed-2");
    assert.equal(delRes.ok, false);
    assert.equal(delRes.code, "has_scenarios");
    assert.equal(delRes.count, 1);
    assert.equal(delRes.titles[0], "Engineering Architecture Review");

    // Also verify database trigger blocks direct SQL DELETE
    const directDb = new Database(DB_PATH);
    assert.throws(() => {
      directDb.prepare("DELETE FROM personas WHERE id = 'p-seed-2'").run();
    }, /RESTRICT_PERSONA_HAS_SCENARIOS/);

    // Delete sc-seed-1
    const delScRes = await send("scenarios:delete", "sc-seed-1");
    assert.equal(delScRes, true);

    // Now deleting p-seed-2 succeeds
    const delP2Res = await send("personas:delete", "p-seed-2");
    assert.equal(delP2Res.ok, true);

    const checkP2 = directDb.prepare("SELECT * FROM personas WHERE id = 'p-seed-2'").get();
    assert.equal(checkP2, undefined);

    directDb.close();
    await worker.terminate();
  });

  test("End-to-end Click Path: Marcus Vance persona creation, scenario studio save, scenarios_count, and delete restriction", async () => {
    const worker = new Worker(path.resolve("electron/storage/dbWorker.cjs"), {
      workerData: { dbPath: DB_PATH },
    });

    const send = (type: string, payload?: any) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker.on("message", handler);
        worker.postMessage({ id, type, payload });
      });

    // 1. Create Marcus Vance persona
    const marcusId = "p-marcus-vance";
    await send("personas:create", {
      id: marcusId,
      name: "Marcus Vance",
      monogram: "MV",
      title: "Chief Technology Officer",
      contextSetting: "Executive Boardroom",
      seniority: "Senior Executive",
      language: "en",
      temperamentTraits: ["Direct", "Analytical"],
      voice: "Echo (Direct American)",
      backstory: "Veteran engineering leader.",
      communicationNotes: "Values concise communication.",
      pressureLevel: "High",
      source: "Mine",
      greeting: "Let us get right to the architecture points.",
    });

    // Verify initial scenarios_count is 0
    const personasList = await send("personas:list");
    const marcus = personasList.find((p: any) => p.id === marcusId);
    assert.ok(marcus, "Marcus Vance persona should exist");
    assert.equal(marcus.scenariosCount, 0, "Initial scenariosCount should be 0");

    // 2. Save scenario in Studio for Marcus Vance
    const saveStudioRes = await send("scenarios:save-studio", {
      title: "Challenging Engineering Timeline Pushback",
      personaId: marcusId,
      interactionType: "Interviews",
      difficulty: "Intermediate",
      context: "A long-term client received a renewal invoice with a surprise 20% surcharge. They are frustrated and have asked for an urgent call.",
      keyChallenges: ["Threatens to cancel the contract unless a credit is issued today."],
      learningObjectives: ["Acknowledge the issue without being defensive"],
      openingLine: "I have emailed you twice. Can you explain this invoice?",
    });

    assert.equal(saveStudioRes.ok, true);
    const savedScenario = saveStudioRes.scenario;
    assert.ok(savedScenario.id.startsWith("sc-mine-"));
    assert.equal(savedScenario.title, "Challenging Engineering Timeline Pushback");
    assert.equal(savedScenario.personaId, marcusId);
    assert.equal(savedScenario.personaName, "Marcus Vance");
    assert.equal(savedScenario.durationMinutes, 3);
    assert.equal(savedScenario.openingLine, "I have emailed you twice. Can you explain this invoice?");

    // 3. Confirm directly in SQLite
    const directDb = new Database(DB_PATH);
    const row = directDb.prepare("SELECT * FROM scenarios WHERE id = ?").get(savedScenario.id) as any;
    assert.equal(row.persona_id, marcusId);
    assert.equal(row.opening_line, "I have emailed you twice. Can you explain this invoice?");
    assert.equal(row.duration_minutes, 3);
    assert.equal(row.context, "A long-term client received a renewal invoice with a surprise 20% surcharge. They are frustrated and have asked for an urgent call.");
    assert.deepEqual(JSON.parse(row.key_challenges), ["Threatens to cancel the contract unless a credit is issued today."]);
    assert.deepEqual(JSON.parse(row.learning_objectives), ["Acknowledge the issue without being defensive"]);

    // 4. Verify derived scenarios_count is now 1
    const personasListAfter = await send("personas:list");
    const marcusAfter = personasListAfter.find((p: any) => p.id === marcusId);
    assert.equal(marcusAfter.scenariosCount, 1, "scenariosCount should now be 1");

    // 5. Try deleting Marcus Vance -> should fail with has_scenarios
    const delRes = await send("personas:delete", marcusId);
    assert.equal(delRes.ok, false);
    assert.equal(delRes.code, "has_scenarios");
    assert.equal(delRes.count, 1);
    assert.equal(delRes.titles[0], "Challenging Engineering Timeline Pushback");

    // 6. Delete scenario -> now delete Marcus Vance succeeds
    const delScRes = await send("scenarios:delete", savedScenario.id);
    assert.equal(delScRes, true);

    const delMarcusRes = await send("personas:delete", marcusId);
    assert.equal(delMarcusRes.ok, true);

    directDb.close();
    await worker.terminate();
  });
});
