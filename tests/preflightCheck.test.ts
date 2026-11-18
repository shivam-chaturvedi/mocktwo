import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzePixelLuminance,
  evaluatePreflightReport,
} from "../src/utils/preflightCheck.ts";

test("preflightCheck: analyzePixelLuminance accurately measures normal lighting", () => {
  const width = 10;
  const height = 10;
  // Uniform mid-gray (R=128, G=128, B=128, A=255)
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }

  const analysis = analyzePixelLuminance({ data, width, height });
  assert.equal(analysis.lightingStatus, "ok");
  assert.equal(analysis.lightingPass, true);
  assert.ok(analysis.meanLuminance >= 127 && analysis.meanLuminance <= 129);
  assert.equal(analysis.highlightClipRatio, 0);
  assert.equal(analysis.unevenRatio, 1);
});

test("preflightCheck: flags dark environment below threshold", () => {
  const width = 10;
  const height = 10;
  // Very dark (R=20, G=20, B=20, A=255) -> luminance ~20 < 45
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 20;
    data[i + 1] = 20;
    data[i + 2] = 20;
    data[i + 3] = 255;
  }

  const analysis = analyzePixelLuminance({ data, width, height });
  assert.equal(analysis.lightingStatus, "too_dark");
  assert.equal(analysis.lightingPass, false);
});

test("preflightCheck: flags blown-out highlights exceeding clip threshold", () => {
  const width = 10;
  const height = 10;
  // 30% of pixels completely blown out (255, 255, 255)
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const isBlown = i < data.length * 0.3;
    const val = isBlown ? 255 : 100;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  const analysis = analyzePixelLuminance({ data, width, height });
  assert.equal(analysis.lightingStatus, "too_bright");
  assert.equal(analysis.lightingPass, false);
});

test("preflightCheck: flags uneven backlighting", () => {
  const width = 10;
  const height = 10;
  // Left half very bright (200), Right half very dark (40) -> ratio = 200/40 = 5.0 > 2.0
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = x < 5 ? 200 : 40;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const analysis = analyzePixelLuminance({ data, width, height });
  assert.equal(analysis.lightingStatus, "backlit");
  assert.equal(analysis.lightingPass, false);
});

test("preflightCheck: evaluatePreflightReport requires camera, fps, and lighting", () => {
  const goodAnalysis = {
    meanLuminance: 120,
    highlightClipRatio: 0.02,
    unevenRatio: 1.1,
    lightingStatus: "ok" as const,
    lightingPass: true,
  };

  // All pass
  const passReport = evaluatePreflightReport({
    cameraReady: true,
    measuredFps: 30,
    luminanceAnalysis: goodAnalysis,
  });
  assert.equal(passReport.isReady, true);
  assert.equal(passReport.reasons.length, 0);

  // Low FPS fails
  const lowFpsReport = evaluatePreflightReport({
    cameraReady: true,
    measuredFps: 18,
    luminanceAnalysis: goodAnalysis,
  });
  assert.equal(lowFpsReport.isReady, false);
  assert.ok(lowFpsReport.reasons.some((r) => r.includes("Frame rate is too low")));

  // Inactive camera fails
  const noCamReport = evaluatePreflightReport({
    cameraReady: false,
    measuredFps: 30,
    luminanceAnalysis: goodAnalysis,
  });
  assert.equal(noCamReport.isReady, false);
  assert.ok(noCamReport.reasons.some((r) => r.includes("Camera track is not active")));
});
