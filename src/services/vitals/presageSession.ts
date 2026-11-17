/**
 * Thin wrapper around @smartspectra/node-sdk/renderer for host-controlled MediaStream sessions.
 * 
 * Completely decoupled from React, SQLite, and UI screens so it can be reused for
 * live practice sessions later with identical behavior.
 */

import {
  SmartSpectraSDK,
  breathingMetrics,
  cardioMetrics,
  faceMetrics,
  edaMetrics,
} from "@smartspectra/node-sdk/renderer";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";
import type { VitalsSamplePoint } from "./metrics";

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
  destroy: () => Promise<void>;
  getStatus: () => number;
}

export function createVitalsSession(config: VitalsSessionConfig): VitalsSession {
  const {
    apiKey,
    stream,
    enableTelemetry = false,
    requestedMetrics = [
      ...breathingMetrics,
      ...cardioMetrics,
      ...faceMetrics,
      ...edaMetrics,
    ],
    onSample,
    onValidation,
    onStatus,
    onError,
  } = config;

  let sdk: SmartSpectraSDK | null = null;
  let isDestroyed = false;
  let timeOriginUs: number | null = null;
  const processedTimestamps = new Set<number>();

  sdk = new SmartSpectraSDK({
    apiKey,
    enableTelemetry,
    requestedMetrics,
  });

  // Supply host-owned MediaStream so camera is never opened twice
  sdk.useMediaStream(stream);

  // Wire event handlers
  sdk.on("processingStatus", (status: number) => {
    if (!isDestroyed && onStatus) {
      onStatus(status);
    }
  });

  sdk.on("validationStatus", (code: number, timestampUs: number, hint?: string) => {
    if (!isDestroyed && onValidation) {
      onValidation(code, timestampUs, hint);
    }
  });

  sdk.on("error", (code: number, message: string, retryable: boolean) => {
    if (!isDestroyed && onError) {
      onError(code, message, retryable);
    }
  });

  sdk.on("metrics", (buf: Uint8Array | ArrayBuffer, timestampUs: number) => {
    if (isDestroyed || !onSample) return;

    if (timeOriginUs === null) {
      timeOriginUs = timestampUs;
    }

    try {
      const decoded = decodeMetrics(buf) as any;
      if (!decoded) return;

      // Collect all distinct timestamps across all arrays
      const pulseArray = decoded.cardio?.pulseRate || [];
      const hrvArray = decoded.cardio?.hrv || [];
      const breathingArray = decoded.breathing?.rate || [];
      const edaArray = decoded.eda?.trace || [];
      const blinkArray = decoded.face?.blinking || [];
      const talkingArray = decoded.face?.talking || [];
      const expressionArray = decoded.face?.expression || [];

      // Extract new timestamps to process
      const batchTimestamps = new Set<number>();

      for (const p of pulseArray) if (p.timestamp != null) batchTimestamps.add(Number(p.timestamp));
      for (const h of hrvArray) if (h.timestamp != null) batchTimestamps.add(Number(h.timestamp));
      for (const b of breathingArray) if (b.timestamp != null) batchTimestamps.add(Number(b.timestamp));
      for (const e of edaArray) if (e.timestamp != null) batchTimestamps.add(Number(e.timestamp));
      for (const bl of blinkArray) if (bl.timestamp != null) batchTimestamps.add(Number(bl.timestamp));
      for (const t of talkingArray) if (t.timestamp != null) batchTimestamps.add(Number(t.timestamp));
      for (const ex of expressionArray) if (ex.timestamp != null) batchTimestamps.add(Number(ex.timestamp));

      // If array items don't have explicit item timestamps, use event timestamp
      if (batchTimestamps.size === 0) {
        batchTimestamps.add(timestampUs);
      }

      // Index arrays by timestamp for O(1) lookup
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

      // Sort chronological
      const sortedTs = Array.from(batchTimestamps).sort((a, b) => a - b);

      for (const ts of sortedTs) {
        if (processedTimestamps.has(ts)) continue;
        processedTimestamps.add(ts);

        // Keep set size under control
        if (processedTimestamps.size > 10000) {
          const arr = Array.from(processedTimestamps);
          for (let i = 0; i < 5000; i++) {
            processedTimestamps.delete(arr[i]);
          }
        }

        const p = pulseByTs.get(ts) || pulseArray[pulseArray.length - 1];
        const h = hrvByTs.get(ts) || hrvArray[hrvArray.length - 1];
        const b = breathingByTs.get(ts) || breathingArray[breathingArray.length - 1];
        const eda = edaByTs.get(ts) || edaArray[edaArray.length - 1];
        const bl = blinkByTs.get(ts) || blinkArray[blinkArray.length - 1];
        const tk = talkingByTs.get(ts) || talkingArray[talkingArray.length - 1];
        const ex = expressionByTs.get(ts) || expressionArray[expressionArray.length - 1];

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
        };

        onSample(samplePoint);
      }
    } catch (err) {
      console.error("[presageSession] Error decoding Metrics protobuf:", err);
    }
  });

  return {
    start: async () => {
      if (isDestroyed || !sdk) {
        throw new Error("Cannot start destroyed VitalsSession");
      }
      await sdk.start();
    },
    stop: async () => {
      if (!sdk) return;
      try {
        await sdk.stop();
      } catch (err) {
        console.warn("[presageSession] Error stopping SDK:", err);
      }
    },
    destroy: async () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (sdk) {
        try {
          sdk.destroy();
        } catch {
          // Ignore destroy errors on teardown
        }
        sdk = null;
      }
    },
    getStatus: () => {
      return sdk ? sdk.processingStatus : 1; // 1 = kIdle
    },
  };
}
