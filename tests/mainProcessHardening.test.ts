import test from "node:test";
import assert from "node:assert/strict";

test("Main Process: Multi-display bounds validation logic detects off-screen coordinates", () => {
  const displays = [
    { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    { bounds: { x: 1920, y: 0, width: 1440, height: 900 } },
  ];

  function validateBounds(parsed: { x?: number; y?: number; width: number; height: number }) {
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return { width: parsed.width, height: parsed.height, x: undefined, y: undefined };
    }
    const isVisible = displays.some((d) => {
      const b = d.bounds;
      return (
        parsed.x! >= b.x - 20 &&
        parsed.x! <= b.x + b.width - 100 &&
        parsed.y! >= b.y - 20 &&
        parsed.y! <= b.y + b.height - 100
      );
    });
    if (isVisible) return parsed;
    return { width: parsed.width, height: parsed.height, x: undefined, y: undefined };
  }

  // Inside primary display
  const valid1 = validateBounds({ x: 100, y: 100, width: 1360, height: 860 });
  assert.strictEqual(valid1.x, 100);
  assert.strictEqual(valid1.y, 100);

  // Inside secondary display
  const valid2 = validateBounds({ x: 2100, y: 200, width: 1200, height: 750 });
  assert.strictEqual(valid2.x, 2100);
  assert.strictEqual(valid2.y, 200);

  // Disconnected display (saved at x: 4000)
  const invalid = validateBounds({ x: 4000, y: 300, width: 1360, height: 860 });
  assert.strictEqual(invalid.x, undefined);
  assert.strictEqual(invalid.y, undefined);
  assert.strictEqual(invalid.width, 1360);
});

test("Main Process: Platform URI resolution for camera and microphone", () => {
  function getSettingsUri(platform: string, pane: string): string | null {
    if (platform === "darwin") {
      if (pane === "camera") return "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera";
      if (pane === "microphone") return "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
    } else if (platform === "win32") {
      if (pane === "camera") return "ms-settings:privacy-webcam";
      if (pane === "microphone") return "ms-settings:privacy-microphone";
    }
    return null;
  }

  assert.strictEqual(getSettingsUri("darwin", "camera"), "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera");
  assert.strictEqual(getSettingsUri("darwin", "microphone"), "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone");
  assert.strictEqual(getSettingsUri("win32", "camera"), "ms-settings:privacy-webcam");
  assert.strictEqual(getSettingsUri("win32", "microphone"), "ms-settings:privacy-microphone");
  assert.strictEqual(getSettingsUri("linux", "camera"), null);
});

test("Main Process: Crash reload throttling limit enforces max 3 per minute", () => {
  let recentCrashes: number[] = [];
  function recordCrashAndCheckReload(now: number): boolean {
    recentCrashes = recentCrashes.filter((t) => now - t < 60000);
    if (recentCrashes.length < 3) {
      recentCrashes.push(now);
      return true;
    }
    return false;
  }

  const base = 100000;
  assert.strictEqual(recordCrashAndCheckReload(base), true);      // 1st crash
  assert.strictEqual(recordCrashAndCheckReload(base + 5000), true); // 2nd crash
  assert.strictEqual(recordCrashAndCheckReload(base + 10000), true); // 3rd crash
  assert.strictEqual(recordCrashAndCheckReload(base + 15000), false); // 4th crash within minute -> blocked!
  assert.strictEqual(recordCrashAndCheckReload(base + 65000), true); // After 1 minute window -> allowed!
});
