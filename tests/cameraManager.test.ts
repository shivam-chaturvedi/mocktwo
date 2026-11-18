import test from "node:test";
import assert from "node:assert/strict";
import { cameraManager } from "../src/services/media/cameraManager.ts";

test("CameraManager: Hard releases source track and all registered consumer clones", async () => {
  let sourceStopped = false;
  let clone1Stopped = false;
  let clone2Stopped = false;

  const mockSourceTrack = {
    kind: "video",
    readyState: "live",
    stop: () => {
      sourceStopped = true;
      (mockSourceTrack as any).readyState = "ended";
    },
    getSettings: () => ({ deviceId: "cam-1" }),
  } as unknown as MediaStreamTrack;

  const mockClone1 = {
    kind: "video",
    readyState: "live",
    stop: () => {
      clone1Stopped = true;
      (mockClone1 as any).readyState = "ended";
    },
  } as unknown as MediaStreamTrack;

  const mockClone2 = {
    kind: "video",
    readyState: "live",
    stop: () => {
      clone2Stopped = true;
      (mockClone2 as any).readyState = "ended";
    },
  } as unknown as MediaStreamTrack;

  // Mock navigator.mediaDevices.getUserMedia cleanly using Object.defineProperty
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    value: {
      mediaDevices: {
        getUserMedia: async () => ({
          getVideoTracks: () => [mockSourceTrack],
        }),
      },
    },
    configurable: true,
    writable: true,
  });

  try {
    let currentTrack: MediaStreamTrack | null = null;
    const unsub = cameraManager.onTrack((track) => {
      currentTrack = track;
    });

    // 1. Acquire
    const acquired = await cameraManager.acquire("cam-1");
    assert.strictEqual(acquired, mockSourceTrack);
    assert.strictEqual(currentTrack, mockSourceTrack);
    assert.strictEqual(cameraManager.isCameraActive(), true);

    // 2. Register consumer clones (e.g. SmartSpectra, Daily, Compositor)
    cameraManager.registerConsumer("consumer-smartspectra", mockClone1);
    cameraManager.registerConsumer("consumer-daily", mockClone2);

    assert.strictEqual(cameraManager.getLiveTrackCount(), 3);

    // 3. Release: Must hard-stop source and all consumer clones
    cameraManager.release();

    assert.strictEqual(sourceStopped, true, "Source track must be physically stopped");
    assert.strictEqual(clone1Stopped, true, "Clone 1 must be physically stopped");
    assert.strictEqual(clone2Stopped, true, "Clone 2 must be physically stopped");
    assert.strictEqual(cameraManager.getLiveTrackCount(), 0, "All live tracks must be 0 after release");
    assert.strictEqual(cameraManager.isCameraActive(), false);
    assert.strictEqual(currentTrack, null, "Listeners must be notified of null track on release");

    unsub();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalDescriptor);
    }
  }
});
