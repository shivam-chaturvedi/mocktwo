import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Worker } from "node:worker_threads";

const TEST_DIR = path.join(process.cwd(), "tmp_test_migration_v2_" + Date.now());
const V1_DB_PATH = path.join(TEST_DIR, "v1_test.db");

describe("Milestone M2: SQLite Migration V2 & Startup Recovery", () => {
  before(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("Migrates a pure V1 database to V2, preserves data, applies defaults, and recovers interrupted syncs", async () => {
    // 1. Manually build a pure V1 schema database with sample personas
    const v1Db = new Database(V1_DB_PATH);
    v1Db.pragma("journal_mode = WAL");
    v1Db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

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
        updated_at TEXT NOT NULL
      );

      INSERT INTO schema_migrations (version, applied_at) VALUES (1, '2026-01-01T00:00:00.000Z');

      INSERT INTO personas (
        id, name, avatar_url, monogram, title, context_setting, seniority,
        language, temperament_traits, voice, backstory, communication_notes,
        scenarios_count, pressure_level, source, created_at, updated_at
      ) VALUES (
        'p-1', 'Marcus Vance', NULL, 'MV', 'Chief Financial Officer', 'Boardroom', 'Senior Executive',
        'English', '["Direct","Analytical"]', 'Default', 'Tough auditor', 'Expects fast answers',
        2, 'Intense', 'Mine', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
      );
    `);
    v1Db.close();

    // 2. Launch worker targeting V1_DB_PATH to trigger automatic migration to V2
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: V1_DB_PATH },
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

    // 3. Verify V1 data is intact and V2 columns received proper defaults
    const personas = await send("personas:list");
    assert.equal(personas.length, 1);
    const p1 = personas[0];
    assert.equal(p1.id, "p-1");
    assert.equal(p1.name, "Marcus Vance");
    assert.equal(p1.title, "Chief Financial Officer");
    assert.equal(p1.syncStatus, "draft");
    assert.equal(p1.hidden, false);
    assert.equal(p1.greeting, "");

    // 4. Test personas:get
    const retrieved = await send("personas:get", "p-1");
    assert.ok(retrieved);
    assert.equal(retrieved.id, "p-1");
    assert.equal(retrieved.name, "Marcus Vance");

    // 5. Test tavus catalog cache set and get
    await send("tavus:cache:set", {
      kind: "faces",
      payload: [{ faceId: "f-123", faceName: "Alex Morgan" }],
    });
    const cachedFaces = await send("tavus:cache:get", "faces");
    assert.ok(cachedFaces);
    assert.equal(cachedFaces.kind, "faces");
    assert.equal(cachedFaces.payload[0].faceId, "f-123");

    // 6. Test updating sync status via personas:update-sync
    await send("personas:update-sync", {
      id: "p-1",
      syncStatus: "syncing",
      syncAttemptAt: new Date().toISOString(),
      syncHash: "abc123hash",
      tavusPalId: "pal_999",
    });

    const updatedP1 = await send("personas:get", "p-1");
    assert.equal(updatedP1.syncStatus, "syncing");
    assert.equal(updatedP1.tavusPalId, "pal_999");
    assert.equal(updatedP1.syncHash, "abc123hash");

    // Terminate worker
    await worker.terminate();

    // 7. Verify startup recovery:
    // Starting worker again should detect "syncing" and recover to "failed" with code "interrupted"
    const worker2 = new Worker(workerScript, {
      workerData: { dbPath: V1_DB_PATH },
    });

    const send2 = (type: string, payload: any = null) =>
      new Promise<any>((resolve, reject) => {
        const id = Math.random();
        const handler = (msg: any) => {
          if (msg.id === id) {
            worker2.off("message", handler);
            if (msg.success) resolve(msg.result);
            else reject(new Error(msg.error));
          }
        };
        worker2.on("message", handler);
        worker2.postMessage({ id, type, payload });
      });

    const recoveredP1 = await send2("personas:get", "p-1");
    assert.equal(recoveredP1.syncStatus, "failed");
    assert.equal(recoveredP1.syncErrorCode, "interrupted");

    // 8. Verify migration version is at least 2 and re-running is a no-op
    const checkDb = new Database(V1_DB_PATH);
    const versionRow = checkDb.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as { version: number };
    assert.ok(versionRow.version >= 2, "migration version is at least 2");
    checkDb.close();

    await worker2.terminate();
  });
});
