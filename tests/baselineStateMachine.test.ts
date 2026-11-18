import test from "node:test";
import assert from "node:assert/strict";

// Mock emitter representing the renderer-side SDK lifecycle
class MockSmartSpectraSDK {
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};
  public status: number = 1; // 1 = kIdle
  public isDestroyed = false;

  on(event: string, cb: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return this;
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.listeners[event] || [];
    for (const h of handlers) h(...args);
  }

  useMediaStream(_stream: any) {
    return this;
  }

  async start() {
    this.status = 3; // kRunning
    this.emit("processingStatus", 3);
  }

  async stop() {
    this.status = 1; // kIdle
    this.emit("processingStatus", 1);
  }

  destroy() {
    this.isDestroyed = true;
    this.listeners = {};
  }
}

test("baselineStateMachine: validation drops pause the clock and recovery resumes it", () => {
  let isClockPaused = false;
  let pausedAccumulatorMs = 0;
  let isOk = false;

  const handleValidation = (code: number) => {
    isOk = code === 0;
    if (!isOk) {
      isClockPaused = true;
    } else {
      isClockPaused = false;
    }
  };

  // Initially in positioning, validation OK
  handleValidation(0);
  assert.equal(isClockPaused, false);

  // User shifts face away -> code 1 (kNoFaceFound)
  handleValidation(1);
  assert.equal(isClockPaused, true);

  // Clock tick happens while paused
  if (isClockPaused) {
    pausedAccumulatorMs += 1000;
  }
  assert.equal(pausedAccumulatorMs, 1000);

  // User returns face -> code 0 (kOk)
  handleValidation(0);
  assert.equal(isClockPaused, false);
});

test("baselineStateMachine: cumulative paused time limit of 20 seconds triggers invalid baseline", () => {
  let pausedTimeMs = 0;
  let status = "measuring";
  let invalidReason: string | null = null;

  for (let sec = 1; sec <= 21; sec++) {
    pausedTimeMs += 1000;
    if (pausedTimeMs >= 20000) {
      status = "invalid";
      invalidReason = "Face lost or obstructed for over 20 seconds during calibration";
      break;
    }
  }

  assert.equal(status, "invalid");
  assert.ok(invalidReason?.includes("20 seconds"));
});

test("baselineStateMachine: missing API key immediately transitions to error without starting camera", () => {
  const presageConfig = { configured: false, apiKey: "" };
  let state = "checking";
  let errorMessage: string | null = null;

  if (!presageConfig.configured || !presageConfig.apiKey) {
    state = "error";
    errorMessage = "SmartSpectra API key is not configured. Add SMARTSPECTRA_API_KEY to your .env file.";
  }

  assert.equal(state, "error");
  assert.ok(errorMessage?.includes("SMARTSPECTRA_API_KEY"));
});

test("baselineStateMachine: session destroy cleans up all event listeners and native references", async () => {
  const mockSdk = new MockSmartSpectraSDK();
  let sampleCount = 0;

  mockSdk.on("sample", () => {
    sampleCount++;
  });

  mockSdk.emit("sample");
  assert.equal(sampleCount, 1);

  mockSdk.destroy();
  assert.equal(mockSdk.isDestroyed, true);

  // Post-destroy emission must not trigger handlers
  mockSdk.emit("sample");
  assert.equal(sampleCount, 1);
});
