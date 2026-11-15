import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SyncService } = require("../electron/tavus/syncService.cjs");
const { PersonaInputSchema } = require("../electron/tavus/validation.cjs");

const TEST_DIR = path.join(process.cwd(), "tmp_test_sync_" + Date.now());
const DB_PATH = path.join(TEST_DIR, "sync_test.db");

describe("Milestone M6: SyncService & Validation", () => {
  let worker: Worker;

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

  before(async () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    const workerScript = path.join(process.cwd(), "electron/storage/dbWorker.cjs");
    worker = new Worker(workerScript, {
      workerData: { dbPath: DB_PATH },
    });
    // Wait briefly for worker init
    await new Promise((r) => setTimeout(r, 100));
  });

  after(async () => {
    if (worker) await worker.terminate();
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("Zod validation accepts valid persona and rejects empty name", () => {
    const valid = {
      name: "Alex Rivera",
      title: "VP of Product",
      seniority: "Manager",
      pressureLevel: "Moderate",
    };
    const parsed = PersonaInputSchema.parse(valid);
    assert.equal(parsed.name, "Alex Rivera");

    assert.throws(() => {
      PersonaInputSchema.parse({ name: "   " });
    });
  });

  test("Sync without API key marks persona as draft with no_api_key", async () => {
    const origKey = process.env.TAVUS_API_KEY;
    delete process.env.TAVUS_API_KEY;

    try {
      const mockStorage = {
        execute: (type: string, payload: any) => send(type, payload),
      };

      const created = await send("personas:create", {
        name: "Draft Persona",
        title: "Analyst",
        seniority: "Peer",
      });

      const syncService = new SyncService(mockStorage);
      const res = await syncService.syncPersona(created.id);
      assert.equal(res.syncStatus, "draft");
      assert.equal(res.syncErrorCode, "no_api_key");
    } finally {
      process.env.TAVUS_API_KEY = origKey;
    }
  });

  test("Sync without face marks persona as draft with no_face", async () => {
    const origKey = process.env.TAVUS_API_KEY;
    process.env.TAVUS_API_KEY = "test_key";

    try {
      const mockStorage = {
        execute: (type: string, payload: any) => send(type, payload),
      };

      const created = await send("personas:create", {
        name: "No Face Persona",
        title: "Director",
        seniority: "Manager",
      });

      const syncService = new SyncService(mockStorage);
      const res = await syncService.syncPersona(created.id);
      assert.equal(res.syncStatus, "draft");
      assert.equal(res.syncErrorCode, "no_face");
    } finally {
      process.env.TAVUS_API_KEY = origKey;
    }
  });

  test("Successful PAL creation sets pal_id, hash, and synced status", async () => {
    const origKey = process.env.TAVUS_API_KEY;
    process.env.TAVUS_API_KEY = "test_key";

    try {
      let createdPalPayload: any = null;
      const mockTavusClient = {
        createPal: async (payload: any) => {
          createdPalPayload = payload;
          return { pal_id: "pal_mock_123" };
        },
        patchPal: async () => {},
        listPals: async () => ({ data: [] }),
      };

      const mockStorage = {
        execute: (type: string, payload: any) => send(type, payload),
      };

      const created = await send("personas:create", {
        name: "Sync Success Persona",
        title: "Chief Officer",
        seniority: "Senior Executive",
        tavusFaceId: "face_123",
        greeting: "Hello, let us begin.",
      });

      const syncService = new SyncService(mockStorage, { tavusClient: mockTavusClient });
      const res = await syncService.syncPersona(created.id);

      assert.equal(res.syncStatus, "synced");
      assert.equal(res.tavusPalId, "pal_mock_123");
      assert.ok(res.syncHash);
      assert.ok(createdPalPayload);
      assert.equal(createdPalPayload.default_face_id, "face_123");
      assert.equal(createdPalPayload.greeting, "Hello, let us begin.");

      // Second sync with no changes should be a no-op (no createPal call)
      let secondCallMade = false;
      mockTavusClient.createPal = async () => {
        secondCallMade = true;
        return { pal_id: "fail" };
      };

      const noopRes = await syncService.syncPersona(created.id);
      assert.equal(secondCallMade, false);
      assert.equal(noopRes.tavusPalId, "pal_mock_123");
    } finally {
      process.env.TAVUS_API_KEY = origKey;
    }
  });

  test("Syncing with changed fields issues JSON Patch operations", async () => {
    const origKey = process.env.TAVUS_API_KEY;
    process.env.TAVUS_API_KEY = "test_key";

    try {
      let patchCalled = false;
      let sentOps: any = null;

      const mockTavusClient = {
        createPal: async () => ({ pal_id: "pal_existing_456" }),
        patchPal: async (_palId: string, ops: any) => {
          patchCalled = true;
          sentOps = ops;
          return { pal_id: "pal_existing_456" };
        },
      };

      const mockStorage = {
        execute: (type: string, payload: any) => send(type, payload),
      };

      const created = await send("personas:create", {
        name: "Patch Persona",
        title: "Director",
        seniority: "Manager",
        tavusFaceId: "face_456",
        tavusPalId: "pal_existing_456",
        syncStatus: "draft",
      });

      const syncService = new SyncService(mockStorage, { tavusClient: mockTavusClient });
      const res = await syncService.syncPersona(created.id);

      assert.equal(patchCalled, true);
      assert.ok(sentOps);
      assert.equal(res.syncStatus, "synced");
    } finally {
      process.env.TAVUS_API_KEY = origKey;
    }
  });
});
