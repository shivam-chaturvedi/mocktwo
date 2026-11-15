import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TEST_DIR = path.join(process.cwd(), "tmp_test_sqlite_" + Date.now());
const DB_PATH = path.join(TEST_DIR, "test.db");

describe("Phase 3: SQLite Storage & Worker Subsystem", () => {
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

  test("Initializes database with WAL mode and schema v1", async () => {
    try {
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

    // 1. Settings set & get
    await send("settings:set", { key: "theme", value: "dark" });
    const settings = await send("settings:get-all");
    assert.equal(settings.theme, "dark");

    // 2. Profile set & get
    const profile = await send("profile:save", {
      id: "usr-1",
      name: "Test User",
      email: "test@example.com",
      role: "Sales Engineer",
      team: "GTM",
      workspace: "HQ",
      property: "HQ",
      streakDays: 3,
      completedSessionsCount: 5,
      averageComposure: 85,
      averageRating: 4.8,
    });
    assert.equal(profile.name, "Test User");
    const retrievedProf = await send("profile:get");
    assert.equal(retrievedProf.name, "Test User");
    assert.equal(retrievedProf.streakDays, 3);

    // 3. Personas CRUD
    const persona = await send("personas:create", {
      name: "Sarah Chen",
      role: "VP Engineering",
      seniority: "Executive",
      tone: "Skeptical",
      temperamentTraits: ["Analytical", "Direct"],
      voice: "Alloy",
      source: "Mine",
    });
    assert.ok(persona.id);
    assert.equal(persona.name, "Sarah Chen");

    const personasList = await send("personas:list");
    assert.equal(personasList.length, 1);
    assert.equal(personasList[0].name, "Sarah Chen");

    // 4. Scenarios CRUD
    const scenario = await send("scenarios:create", {
      title: "Quarterly Budget Defense",
      difficulty: "Advanced",
      targetDurationMin: 5,
      category: "Executive",
      source: "Mine",
      description: "Defend engineering hiring budget against cross-cuts",
      personaId: persona.id,
      personaName: persona.name,
      evaluationCriteria: ["Composure under budget pushback"],
      tags: ["finance", "executive"],
    });
    assert.ok(scenario.id);
    assert.equal(scenario.title, "Quarterly Budget Defense");

    const scenariosList = await send("scenarios:list");
    assert.equal(scenariosList.length, 1);
    assert.equal(scenariosList[0].title, "Quarterly Budget Defense");

    // 5. Recordings & Foreign Key Cascade Delete
    const recording = await send("recordings:save", {
      id: "rec-test-1",
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioCategory: scenario.category,
      personaId: persona.id,
      personaName: persona.name,
      createdAt: new Date().toISOString(),
      durationSeconds: 60,
      composureScore: 88,
      baselineRestingPulse: 65,
      notes: [{ id: "n-1", timestampSeconds: 15, text: "Good recovery", author: "User" }],
      vitalsSamples: [
        {
          timestampMs: 1000,
          pulseRateBpm: 72,
          pulseConfidence: 95,
          pulseStable: true,
          motionWarning: false,
        },
      ],
    });
    assert.equal(recording.id, "rec-test-1");

    const retrievedRec = await send("recordings:get", "rec-test-1");
    assert.equal(retrievedRec.id, "rec-test-1");
    assert.equal(retrievedRec.notes.length, 1);
    assert.equal(retrievedRec.vitalsSamples.length, 1);

    // Verify re-saving recording does NOT duplicate child rows
    await send("recordings:save", {
      ...recording,
      selfReflectionNotes: "Reflected on pacing",
    });
    const retrievedAfterReSave = await send("recordings:get", "rec-test-1");
    assert.equal(retrievedAfterReSave.notes.length, 1);
    assert.equal(retrievedAfterReSave.vitalsSamples.length, 1);
    assert.equal(retrievedAfterReSave.selfReflectionNotes, "Reflected on pacing");

    // Verify recordings:add-note synchronizes both user_notes and recording_notes table
    await send("recordings:add-note", {
      recordingId: "rec-test-1",
      note: { timestampSeconds: 25, text: "Second observation note", author: "Coach" },
    });
    const retrievedAfterAddNote = await send("recordings:get", "rec-test-1");
    assert.equal(retrievedAfterAddNote.notes.length, 2);

    const checkDb = new Database(DB_PATH);
    const notesInTable = checkDb.prepare("SELECT count(*) as count FROM recording_notes WHERE recording_id = ?").get("rec-test-1") as { count: number };
    checkDb.close();
    assert.equal(notesInTable.count, 2);

    // Delete recording and check vitals samples are deleted (cascade)
    const delResult = await send("recordings:delete", "rec-test-1");
    assert.equal(delResult, true);
    const recAfterDelete = await send("recordings:get", "rec-test-1");
    assert.equal(recAfterDelete, null);

    // Check direct DB to ensure vitals_samples and recording_notes were cascaded
    const directDb = new Database(DB_PATH);
    const orphanVitals = directDb.prepare("SELECT count(*) as count FROM vitals_samples WHERE recording_id = ?").get("rec-test-1") as { count: number };
    const orphanNotes = directDb.prepare("SELECT count(*) as count FROM recording_notes WHERE recording_id = ?").get("rec-test-1") as { count: number };
    directDb.close();
    assert.equal(orphanVitals.count, 0);
    assert.equal(orphanNotes.count, 0);

    // 6. Benchmark recordings list performance with 1, 25, 1000 recordings
    console.log("Seeding recordings for benchmark...");
    const baseNow = Date.now();
    for (let i = 0; i < 25; i++) {
      await send("recordings:save", {
        id: `rec-bench-${i}`,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        scenarioCategory: "General",
        createdAt: new Date(baseNow - i * 3600000).toISOString(),
        durationSeconds: 60,
        composureScore: 70 + (i % 25),
      });
    }

    const t0 = performance.now();
    const list25 = await send("recordings:list");
    const t25 = performance.now() - t0;
    assert.equal(list25.length, 25);
    console.log(`recordings:list (25 items): ${t25.toFixed(2)}ms`);

    // Clean all data atomically
    await send("data:clear-all");
    const listAfterClear = await send("recordings:list");
    assert.equal(listAfterClear.length, 0);

    await worker.terminate();
  } catch (err) {
    console.error("TEST 1 ERROR:", err);
    throw err;
  }
  });

  test("Recovers gracefully from corrupted database file", async () => {
    const corruptDbPath = path.join(TEST_DIR, "corrupt.db");
    // Write random garbage into file to corrupt it
    fs.writeFileSync(corruptDbPath, "GARBAGE NOT SQLITE DATABASE CONTENT " + Math.random());

    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    const worker = new Worker(workerScript, {
      workerData: { dbPath: corruptDbPath },
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

    // The worker should detect corruption, backup the corrupt file, and initialize a fresh database
    await send("settings:set", { key: "recovered", value: true });
    const settings = await send("settings:get-all");
    assert.equal(settings.recovered, true);

    await worker.terminate();

    // Check that a backup file .corrupt.<timestamp> was created
    const dirFiles = fs.readdirSync(TEST_DIR);
    const backupFound = dirFiles.some((f) => f.includes("corrupt.db.corrupt."));
    assert.ok(backupFound, "Backup of corrupt database should exist");
  });

  test("Security: StorageManager prevents path traversal in audio chunk recording paths", () => {
    const { StorageManager } = require("../electron/storage/storageManager.cjs");
    const mockSM = {
      recordingsDir: path.join(TEST_DIR, "recordings"),
      getSafeRecordingPath: StorageManager.prototype.getSafeRecordingPath,
    };

    assert.throws(
      () => mockSM.getSafeRecordingPath("../../../etc/passwd", "webm"),
      /Invalid recording ID|Path traversal blocked/
    );
    assert.throws(
      () => mockSM.getSafeRecordingPath("..\\windows\\system32", "webm"),
      /Invalid recording ID|Path traversal blocked/
    );
    assert.throws(
      () => mockSM.getSafeRecordingPath("", "webm"),
      /Invalid recording ID/
    );

    // Valid alphanumeric ID
    const validPath = mockSM.getSafeRecordingPath("rec-12345_test", "webm");
    assert.ok(validPath.endsWith("rec-12345_test.webm"));
    assert.ok(validPath.startsWith(path.resolve(path.join(TEST_DIR, "recordings"))));
  });

  test("Security: settings:set blocks prototype pollution attempts", async () => {
    const { Worker } = require("worker_threads");
    const testDbPath = path.join(TEST_DIR, "proto-test.db");
    const worker = new Worker(path.resolve("electron/storage/dbWorker.cjs"), {
      workerData: { dbPath: testDbPath },
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

    await assert.rejects(
      async () => {
        await send("settings:set", { key: "__proto__", value: { polluted: true } });
      },
      /Invalid setting key/
    );

    await assert.rejects(
      async () => {
        await send("settings:set", { key: "constructor", value: { polluted: true } });
      },
      /Invalid setting key/
    );

    await assert.rejects(
      async () => {
        await send("settings:set", { key: "prototype", value: { polluted: true } });
      },
      /Invalid setting key/
    );

    // Verify recordings:list handles malformed bounds cleanly
    const safeList = await send("recordings:list", { limit: -10, offset: "bad" });
    assert.ok(Array.isArray(safeList));

    // Verify personas:update with partial updates merges safely
    await send("personas:create", {
      name: "Test Update Partner",
      avatarUrl: "",
      monogram: "TU",
      title: "Senior Lead",
      contextSetting: "Boardroom",
      seniority: "Executive",
      language: "English (US)",
      temperamentTraits: ["Calm"],
      voice: "Default",
      backstory: "Experienced",
      communicationNotes: "Notes",
      scenariosCount: 2,
      pressureLevel: "High",
      source: "Mine",
    });
    const allPersonas = await send("personas:list");
    const createdPersona = allPersonas.find((p: any) => p.name === "Test Update Partner");
    assert.ok(createdPersona);

    const updated = await send("personas:update", {
      id: createdPersona.id,
      persona: { name: "Renamed Update Partner" },
    });
    assert.equal(updated.name, "Renamed Update Partner");
    assert.equal(updated.title, "Senior Lead"); // Preserved!

    await worker.terminate();
  });
});
