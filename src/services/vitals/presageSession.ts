/**
 * Presage SmartSpectra Vitals Telemetry Engine
 * 
 * Module-level long-lived singleton around @smartspectra/node-sdk/renderer.
 * - Instantiates exactly ONE SmartSpectraSDK instance lazily for the renderer process.
 * - Serializes start/stop/reset operations via an asynchronous promise queue.
 * - Reuses the instance across retries, calling reset() instead of reconstructing on failure.
 * - Only destroys the SDK instance on window unload (beforeunload).
 * - Decodes Protobuf telemetry without repeating stale readings.
 * - Tracks the latest validation code directly on each sample point for accurate quality gating.
 */

import {
  SmartSpectraSDK,
  cardioMetrics,
  faceMetrics,
  MetricType,
} from "@smartspectra/node-sdk/renderer";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";
import type { VitalsSamplePoint } from "./metrics";
import { registerCleanupHandler } from "../../utils/mediaLifecycle";

export interface VitalsSessionConfig {
  apiKey: string;
  stream: MediaStream;
  enableTelemetry?: boolean;
  requestedMetrics?: number[];
  onSample?: (sample: VitalsSamplePoint) => void;
  onValidation?: (code: number, timestampUs: number, hint?: string) => void;
  onStatus?: (status: number) => void;
  onError?: (code: number, message: string, retryable: boolean) => void;
}

export interface VitalsSession {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
  destroy: () => Promise<void>;
  getStatus: () => number;
}

// Module-level singleton state
let sharedSdk: SmartSpectraSDK | null = null;
let currentApiKey: string | null = null;
let opQueue: Promise<void> = Promise.resolve();

// Active callbacks for the currently running session
interface ActiveCallbacks {
  onSample?: (sample: VitalsSamplePoint) => void;
  onValidation?: (code: number, timestampUs: number, hint?: string) => void;
  onStatus?: (status: number) => void;
  onError?: (code: number, message: string, retryable: boolean) => void;
}

let activeCallbacks: ActiveCallbacks = {};
let latestValidationCode: number | null = null;
let timeOriginUs: number | null = null;
const processedTimestamps = new Set<number>();

function enqueueOperation<T>(op: () => Promise<T>): Promise<T> {
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
      .catch((err) => {
        reject(err);
      });
  });
}

function ensureSharedSdk(apiKey: string, enableTelemetry = false, requestedMetrics?: number[]): SmartSpectraSDK {
  if (sharedSdk && currentApiKey === apiKey) {
    return sharedSdk;
  }

  if (sharedSdk && currentApiKey !== apiKey) {
    try {
      sharedSdk.destroy();
    } catch {}
    sharedSdk = null;
  }

  currentApiKey = apiKey;
  // Request core cardio, breathing rate, and non-heavy facial metrics (blink/talking).
  // Note: We use MetricType.BREATHING_RATE directly rather than breathingMetrics ([0, 1, 2])
  // because metrics 0 and 1 (chest/abdomen traces) require chest framing, whereas Hotel Coach
  // measures facial rPPG respiratory rate and instructs the user to frame their face.
  const defaultMetrics = [
    MetricType.BREATHING_RATE,
    ...cardioMetrics,
    faceMetrics[1], // BLINKING: 12
    faceMetrics[2], // TALKING: 13
  ];

  sharedSdk = new SmartSpectraSDK({
    apiKey,
    enableTelemetry,
    requestedMetrics: requestedMetrics || defaultMetrics,
    sendTimeoutMs: 10000, // 10 second timeout per specification
  });

  // Wire event handlers ONCE on the shared SDK instance
  sharedSdk.on("processingStatus", (status: number) => {
    if (activeCallbacks.onStatus) {
      activeCallbacks.onStatus(status);
    }
  });

  sharedSdk.on("validationStatus", (code: number, timestampUs: number, hint?: string) => {
    latestValidationCode = code;
    if (activeCallbacks.onValidation) {
      activeCallbacks.onValidation(code, timestampUs, hint);
    }
  });

  sharedSdk.on("error", (code: number, message: string, retryable: boolean) => {
    if (activeCallbacks.onError) {
      activeCallbacks.onError(code, message, retryable);
    }
  });

  sharedSdk.on("metrics", (buf: Uint8Array | ArrayBuffer, timestampUs: number) => {
    if (!activeCallbacks.onSample) return;

    if (timeOriginUs === null) {
      timeOriginUs = timestampUs;
    }

    try {
      const decoded = decodeMetrics(buf) as any;
      if (!decoded) return;

      const pulseArray = decoded.cardio?.pulseRate || [];
      const hrvArray = decoded.cardio?.hrv || [];
      const breathingArray = decoded.breathing?.rate || [];
      const edaArray = decoded.eda?.trace || [];
      const blinkArray = decoded.face?.blinking || [];
      const talkingArray = decoded.face?.talking || [];
      const expressionArray = decoded.face?.expression || [];

      // Collect all distinct timestamps across all arrays
      const batchTimestamps = new Set<number>();
      for (const p of pulseArray) if (p.timestamp != null) batchTimestamps.add(Number(p.timestamp));
      for (const h of hrvArray) if (h.timestamp != null) batchTimestamps.add(Number(h.timestamp));
      for (const b of breathingArray) if (b.timestamp != null) batchTimestamps.add(Number(b.timestamp));
      for (const e of edaArray) if (e.timestamp != null) batchTimestamps.add(Number(e.timestamp));
      for (const bl of blinkArray) if (bl.timestamp != null) batchTimestamps.add(Number(bl.timestamp));
      for (const t of talkingArray) if (t.timestamp != null) batchTimestamps.add(Number(t.timestamp));
      for (const ex of expressionArray) if (ex.timestamp != null) batchTimestamps.add(Number(ex.timestamp));

      if (batchTimestamps.size === 0) {
        batchTimestamps.add(timestampUs);
      }

      // Index arrays by timestamp for exact O(1) matching
      const pulseByTs = new Map<number, any>();
      for (const p of pulseArray) if (p.timestamp != null) pulseByTs.set(Number(p.timestamp), p);

      const hrvByTs = new Map<number, any>();
      for (const h of hrvArray) if (h.timestamp != null) hrvByTs.set(Number(h.timestamp), h);

      const breathingByTs = new Map<number, any>();
      for (const b of breathingArray) if (b.timestamp != null) breathingByTs.set(Number(b.timestamp), b);

      const edaByTs = new Map<number, any>();
      for (const e of edaArray) if (e.timestamp != null) edaByTs.set(Number(e.timestamp), e);

      const blinkByTs = new Map<number, any>();
      for (const bl of blinkArray) if (bl.timestamp != null) blinkByTs.set(Number(bl.timestamp), bl);

      const talkingByTs = new Map<number, any>();
      for (const t of talkingArray) if (t.timestamp != null) talkingByTs.set(Number(t.timestamp), t);

      const expressionByTs = new Map<number, any>();
      for (const ex of expressionArray) if (ex.timestamp != null) expressionByTs.set(Number(ex.timestamp), ex);

      const sortedTs = Array.from(batchTimestamps).sort((a, b) => a - b);

      for (const ts of sortedTs) {
        if (processedTimestamps.has(ts)) continue;
        processedTimestamps.add(ts);

        // Keep set size bounded
        if (processedTimestamps.size > 10000) {
          const arr = Array.from(processedTimestamps);
          for (let i = 0; i < 5000; i++) {
            processedTimestamps.delete(arr[i]);
          }
        }

        const p = pulseByTs.get(ts) || null;
        const h = hrvByTs.get(ts) || null;
        const b = breathingByTs.get(ts) || null;
        const eda = edaByTs.get(ts) || null;
        const bl = blinkByTs.get(ts) || null;
        const tk = talkingByTs.get(ts) || null;
        const ex = expressionByTs.get(ts) || null;

        // DATA CORRECTNESS: Only emit a sample if this timestamp actually has fresh data.
        // Never fall back to the last array element to prevent repeating stale values.
        if (!p && !h && !b && !eda && !bl && !tk && !ex) {
          continue;
        }

        let expressionScores: Record<string, number> | null = null;
        if (ex && ex.scores && Array.isArray(ex.scores)) {
          expressionScores = {};
          for (const s of ex.scores) {
            const key = String(s.type);
            expressionScores[key] = Number(s.confidence ?? 0);
          }
        }

        const tMs = Math.max(0, Math.round((ts - (timeOriginUs || ts)) / 1000));

        const samplePoint: VitalsSamplePoint = {
          timestampUs: ts,
          tMs,
          pulse: p?.value != null ? Number(p.value.toFixed(1)) : null,
          pulseConfidence: p?.confidence != null ? Number(p.confidence) : null,
          pulseStable: Boolean(p?.stable),
          breathingRate: b?.value != null ? Number(b.value.toFixed(1)) : null,
          breathingConfidence: b?.confidence != null ? Number(b.confidence) : null,
          breathingStable: Boolean(b?.stable),
          hrvRmssd: h?.rmssd != null ? Number(h.rmssd.toFixed(1)) : null,
          hrvSdnn: h?.sdnn != null ? Number(h.sdnn.toFixed(1)) : null,
          hrvMeanNn: h?.meanNn != null ? Number(h.meanNn.toFixed(1)) : null,
          hrvBaevsky: h?.baevsky != null ? Number(h.baevsky.toFixed(1)) : null,
          hrvConfidence: h?.confidence != null ? Number(h.confidence) : null,
          hrvStable: Boolean(h?.stable),
          eda: eda?.value != null ? Number(eda.value.toFixed(2)) : null,
          blinkDetected: bl?.detected != null ? Boolean(bl.detected) : false,
          talkingDetected: tk?.detected != null ? Boolean(tk.detected) : false,
          expressions: expressionScores,
          validationCode: latestValidationCode,
        };

        activeCallbacks.onSample(samplePoint);
      }
    } catch (err) {
      console.error("[presageSession] Error decoding Metrics protobuf:", err);
    }
  });

  return sharedSdk;
}

/**
 * Definitively destroys the long-lived singleton SDK instance and releases C-API resources.
 */
export function destroySharedSdk(): void {
  if (sharedSdk) {
    try {
      sharedSdk.destroy();
    } catch (err) {
      console.warn("[presageSession] Error destroying sharedSdk:", err);
    }
    sharedSdk = null;
  }
}

// Register with global lifecycle manager so SDK is destroyed on exit, crash, or reload
registerCleanupHandler(() => {
  destroySharedSdk();
});

/**
 * Creates or retrieves the long-lived engine interface for a session.
 */
export function createVitalsSession(config: VitalsSessionConfig): VitalsSession {
  const {
    apiKey,
    stream,
    enableTelemetry = false,
    requestedMetrics,
    onSample,
    onValidation,
    onStatus,
    onError,
  } = config;

  return {
    start: async () => {
      return enqueueOperation(async () => {
        const sdk = ensureSharedSdk(apiKey, enableTelemetry, requestedMetrics);

        // Update active listener dispatchers for this session
        activeCallbacks = {
          onSample,
          onValidation,
          onStatus,
          onError,
        };
        latestValidationCode = null;
        timeOriginUs = null;
        processedTimestamps.clear();

        sdk.useMediaStream(stream);
        try {
          await sdk.start();
        } catch (err) {
          // On start failure, reset the engine rather than discarding it
          try {
            await sdk.reset();
          } catch {}
          throw err;
        }
      });
    },

    stop: async () => {
      return enqueueOperation(async () => {
        if (!sharedSdk) return;
        try {
          await sharedSdk.stop();
        } catch (err) {
          console.warn("[presageSession] Error during sdk.stop():", err);
        } finally {
          activeCallbacks = {};
        }
      });
    },

    reset: async () => {
      return enqueueOperation(async () => {
        if (!sharedSdk) return;
        try {
          await sharedSdk.reset();
        } finally {
          activeCallbacks = {};
        }
      });
    },

    destroy: async () => {
      // Per architectural rule: do not destroy the shared SDK on per-session completion.
      // Reset state and unbind active callbacks instead so next session reuses the instance.
      return enqueueOperation(async () => {
        if (!sharedSdk) return;
        try {
          await sharedSdk.stop();
        } catch {}
        activeCallbacks = {};
      });
    },

    getStatus: () => {
      return sharedSdk ? sharedSdk.processingStatus : 1; // 1 = kIdle
    },
  };
}
