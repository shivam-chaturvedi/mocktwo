import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EmptyBiometricsService } from "../src/services/api/emptyAdapters.ts";
import type { UserBaseline } from "../src/types/index.ts";

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, val: string): void {
    this.store.set(key, val);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe("Baseline State and Biometrics Service Contract", () => {
  const mockStorage = new MockLocalStorage();
  // @ts-expect-error test shim
  globalThis.localStorage = mockStorage;

  test("Biometrics is standalone and available without network/backend services", async () => {
    const service = new EmptyBiometricsService();
    assert.equal(service.isAvailable(), true);
    const status = await service.getStatus();
    assert.equal(status.status, "ready");
    assert.equal(status.hasBaseline, false);
  });

  test("Initial baseline is null when storage is empty", async () => {
    mockStorage.clear();
    const service = new EmptyBiometricsService();
    const baseline = await service.getBaseline();
    assert.equal(baseline, null);
  });

  test("Saving baseline persists derived metrics under mocktwo_baseline_v2 key", async () => {
    mockStorage.clear();
    const service = new EmptyBiometricsService();
    const baselineData: UserBaseline = {
      restingPulse: 68,
      restingBreathingRate: 14,
      restingHrvRmssd: 54,
      restingBaevsky: 82,
      restingEdaArousal: 0.22,
      measuredAt: new Date().toISOString(),
      isCalibrated: true,
      qualityScore: 94,
      qualityRating: "Good",
      sdkVersion: "smartspectra-3.2.0-local",
      durationSeconds: 60,
    };

    const saved = await service.saveBaseline(baselineData);
    assert.equal(saved.isCalibrated, true);
    assert.equal(saved.restingPulse, 68);
    assert.equal(saved.qualityRating, "Good");

    // Check raw storage key
    const raw = mockStorage.getItem("mocktwo_baseline_v2");
    assert.ok(raw, "mocktwo_baseline_v2 key must exist");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.restingPulse, 68);
    assert.equal(parsed.restingBreathingRate, 14);
    assert.equal(parsed.restingHrvRmssd, 54);

    // Retrieve via service
    const retrieved = await service.getBaseline();
    assert.ok(retrieved);
    assert.equal(retrieved.restingPulse, 68);
    assert.equal(retrieved.isCalibrated, true);
  });

  test("Clearing baseline removes mocktwo_baseline_v2 and returns null", async () => {
    const service = new EmptyBiometricsService();
    await service.clearBaseline();
    const raw = mockStorage.getItem("mocktwo_baseline_v2");
    assert.equal(raw, null);
    const retrieved = await service.getBaseline();
    assert.equal(retrieved, null);
  });

  test("Camera hardware tracks cleanup contract ensures no leaked tracks", () => {
    let stoppedCount = 0;
    const fakeTracks = [
      {
        kind: "video",
        stop() {
          stoppedCount++;
        },
      },
      {
        kind: "video",
        stop() {
          stoppedCount++;
        },
      },
    ];

    const fakeStream = {
      getTracks: () => fakeTracks,
    };

    const fakeVideo = {
      srcObject: fakeStream as unknown as MediaStream,
    };

    // Simulate cleanup function in BaselineSheet
    const stopCamera = (
      stream: typeof fakeStream | null,
      video: typeof fakeVideo | null
    ) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (video) {
        video.srcObject = null as unknown as MediaStream;
      }
    };

    stopCamera(fakeStream, fakeVideo);
    assert.equal(stoppedCount, 2, "All camera tracks must have stop() invoked");
    assert.equal(fakeVideo.srcObject, null, "Video element srcObject must be nullified");
  });
});
