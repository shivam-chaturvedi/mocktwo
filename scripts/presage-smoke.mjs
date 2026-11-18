import { SmartSpectraSDK, CameraSelection, MetricType, cardioMetrics } from "@smartspectra/node-sdk";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";

console.log("[presage-smoke] Starting headless smoke test...");
console.log("[presage-smoke] Key present:", Boolean(process.env.SMARTSPECTRA_API_KEY));

const sdk = new SmartSpectraSDK({
  apiKey: process.env.SMARTSPECTRA_API_KEY || "",
  enableTelemetry: false,
  requestedMetrics: [MetricType.BREATHING_RATE, ...cardioMetrics, 12, 13],
});

sdk.on("processingStatus", (status) => {
  console.log(`[presage-smoke] processingStatus: ${status}`);
});

sdk.on("validationStatus", (code, ts, hint) => {
  console.log(`[presage-smoke] validationStatus: code=${code}, hint="${hint}", ts=${ts}`);
});

sdk.on("error", (code, message, retryable) => {
  console.error(`[presage-smoke] error: code=${code}, message="${message}", retryable=${retryable}`);
});

sdk.on("metrics", (buf, ts) => {
  try {
    const decoded = decodeMetrics(buf);
    console.log(`[presage-smoke] metrics decoded at ts=${ts}:`, {
      pulse: decoded?.cardio?.pulseRate,
      hrv: decoded?.cardio?.hrv,
      breathing: decoded?.breathing?.rate,
      chestTrace: decoded?.breathing?.upperTrace?.length,
    });
  } catch (err) {
    console.error("[presage-smoke] decode error:", err);
  }
});

try {
  console.log("[presage-smoke] Configuring camera...");
  sdk.useCamera(CameraSelection.default);
  console.log("[presage-smoke] Calling sdk.start()...");
  sdk.start();
  console.log("[presage-smoke] sdk.start() returned successfully. Streaming for 10 seconds...");

  setTimeout(async () => {
    console.log("[presage-smoke] Stopping SDK...");
    await sdk.stopAsync();
    console.log("[presage-smoke] Destroying SDK...");
    sdk.destroy();
    console.log("[presage-smoke] Smoke test completed cleanly.");
    process.exit(0);
  }, 10000);
} catch (err) {
  console.error("[presage-smoke] Exception:", err);
  process.exit(1);
}
