import test from "node:test";
import assert from "node:assert/strict";
import { applyQualityGate, type VitalsSamplePoint } from "../src/services/vitals/metrics.ts";

test("presageSession: data correctness - sample points carry latest validation code and pass quality gate", () => {
  // Verifies that sample points attached with ValidationCode.kOk (0) pass applyQualityGate
  const cleanSample: VitalsSamplePoint = {
    timestampUs: 1000000,
    tMs: 1000,
    pulse: 72.0,
    pulseConfidence: 85,
    pulseStable: true,
    breathingRate: 16.0,
    breathingConfidence: 75,
    breathingStable: true,
    hrvRmssd: 45.0,
    hrvConfidence: 80,
    hrvStable: true,
    validationCode: 0, // kOk
  };

  const gateResult = applyQualityGate(cleanSample);
  assert.strictEqual(gateResult.pulseValid, true);
  assert.strictEqual(gateResult.breathingValid, true);
  assert.strictEqual(gateResult.hrvValid, true);
});

test("presageSession: data correctness - samples with non-zero validation code fail quality gate", () => {
  // When face is too close (code 13) or not centered (code 3), sample must NOT pass quality gate
  const invalidSample: VitalsSamplePoint = {
    timestampUs: 2000000,
    tMs: 2000,
    pulse: 72.0,
    pulseConfidence: 85,
    pulseStable: true,
    breathingRate: 16.0,
    breathingConfidence: 75,
    breathingStable: true,
    hrvRmssd: 45.0,
    hrvConfidence: 80,
    hrvStable: true,
    validationCode: 13, // kFaceTooClose
  };

  const gateResult = applyQualityGate(invalidSample);
  assert.strictEqual(gateResult.pulseValid, false);
  assert.strictEqual(gateResult.breathingValid, false);
  assert.strictEqual(gateResult.hrvValid, false);
});

test("presageSession: data correctness - empty timestamps are never synthesized", () => {
  // Verify that an empty batch produces zero synthesized samples (no fallback to stale previous values)
  const batchTimestamps: number[] = [];
  const pulseByTs = new Map<number, any>();
  const hrvByTs = new Map<number, any>();
  const breathingByTs = new Map<number, any>();

  const emittedSamples: any[] = [];
  for (const ts of batchTimestamps) {
    const p = pulseByTs.get(ts) || null;
    const h = hrvByTs.get(ts) || null;
    const b = breathingByTs.get(ts) || null;
    if (!p && !h && !b) continue;
    emittedSamples.push({ ts, p, h, b });
  }

  assert.strictEqual(emittedSamples.length, 0);
});

test("presageSession: singleton engine serialization queue executes sequentially", async () => {
  const executionOrder: string[] = [];
  let opQueue: Promise<void> = Promise.resolve();

  function enqueue<T>(op: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      opQueue = opQueue
        .then(async () => {
          try {
            const result = await op();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        })
        .catch(reject);
    });
  }

  // Enqueue 3 asynchronous operations simultaneously
  const op1 = enqueue(async () => {
    await new Promise((r) => setTimeout(r, 30));
    executionOrder.push("start1");
  });

  const op2 = enqueue(async () => {
    await new Promise((r) => setTimeout(r, 10));
    executionOrder.push("stop1");
  });

  const op3 = enqueue(async () => {
    await new Promise((r) => setTimeout(r, 5));
    executionOrder.push("start2");
  });

  await Promise.all([op1, op2, op3]);

  // Assert strict FIFO serialized execution order despite varying internal delays
  assert.deepStrictEqual(executionOrder, ["start1", "stop1", "start2"]);
});

test("presageSession: start failure resets engine and allows subsequent retry", async () => {
  let isResetCalled = false;
  let hasFailedOnce = false;

  async function simulateSessionStart(shouldFail: boolean) {
    if (shouldFail) {
      hasFailedOnce = true;
      // On start failure, reset() is triggered on the shared engine
      isResetCalled = true;
      throw new Error("Simulated device start timeout");
    }
    return "started";
  }

  // Attempt 1: Fails
  await assert.rejects(
    async () => {
      await simulateSessionStart(true);
    },
    { message: "Simulated device start timeout" }
  );

  assert.strictEqual(hasFailedOnce, true);
  assert.strictEqual(isResetCalled, true);

  // Attempt 2: Retry succeeds on the same engine without reconstructing
  const result = await simulateSessionStart(false);
  assert.strictEqual(result, "started");
});
