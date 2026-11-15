import type {
  SessionBiometrics,
  PulseSample,
  EdaSample,
  FaceSample,
  SessionReadinessStatus,
} from "../types";

export interface TimelinePoint {
  t: number;                      // Time in seconds (0, 1, 2, ... durationSeconds)
  timeLabel: string;              // "m:ss" format for ticks/tooltips
  pulse: number | null;           // Heart rate in bpm (40–110). NULL before 12s, or when >110 (out of range), or in gaps
  pulseConfidence: number | null; // Confidence 0–100 or null
  eda: number | null;             // Normalized 0–100 relative arousal. NULL before ~35s or when missing
  speaking: boolean;              // True if user is speaking
  outOfRange: boolean;            // True if pulse was detected above 110 bpm
  stable: boolean;                // False during motion or low confidence
  isExcessiveMotion: boolean;     // True during EXCESSIVE_MOTION validation events
  isWarmingUp: boolean;           // True for 0 to 12s
  isPeak?: boolean;               // True on top 2-3 local pulse peaks
  peakRank?: number;              // 1, 2, 3
  peakTriggerSec?: number;        // Lookback 12s timestamp for the conversational trigger
}

export interface TimelineData {
  points: TimelinePoint[];
  hasBiometrics: boolean;
  isTooShort: boolean;
  status: SessionReadinessStatus;
  baselinePulse: number;
  durationSeconds: number;
  averagePulse?: number;
  peakPulse?: number;
  peakPoints: TimelinePoint[];
  speakingBands: { start: number; end: number }[];
  listeningBands: { start: number; end: number }[];
  motionBands: { start: number; end: number }[];
  outOfRangeBands: { start: number; end: number }[];
  summaryText: string;
}

export function formatTimeSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Pure adapter: converts raw SessionBiometrics payload into chart-ready time series.
 * Enforces SDK timing restrictions:
 * - Pulse window is 12 s (no pulse plotted before 12 s)
 * - EDA proxy trace starts at 35+ s (no EDA plotted before 35 s)
 * - Pulse > 110 bpm is out-of-range (never plotted as valid number)
 * - Gaps stay gaps (no interpolation across missing readings)
 */
export function buildTimelineSeries(
  biometrics: SessionBiometrics | undefined | null,
  durationSeconds: number,
  baselinePulse: number = 68
): TimelineData {
  const totalDuration = Math.max(0, Math.round(durationSeconds || 0));
  const isTooShort = totalDuration < 12;

  if (!biometrics || isTooShort || !biometrics.pulse || biometrics.pulse.state === "unavailable") {
    return {
      points: [],
      hasBiometrics: false,
      isTooShort,
      status: isTooShort ? "Too short" : "Too short",
      baselinePulse,
      durationSeconds: totalDuration,
      peakPoints: [],
      speakingBands: [],
      listeningBands: [],
      motionBands: [],
      outOfRangeBands: [],
      summaryText: isTooShort
        ? `Rehearsal duration of ${totalDuration}s was too short to establish optical vitals (minimum 12s required).`
        : "Camera pulse measurement was unavailable for this rehearsal.",
    };
  }

  const rawPulseRates: PulseSample[] = biometrics.pulse.rate || [];
  const rawEdaTrace: EdaSample[] = biometrics.eda?.trace || [];
  const rawFaceTrace: FaceSample[] = biometrics.face?.trace || [];
  const validationEvents = biometrics.validationEvents || [];

  // Index maps for lookup by second
  const pulseBySecond = new Map<number, PulseSample>();
  for (const p of rawPulseRates) {
    const sec = Math.round(p.t ?? (p as any).timestampSeconds ?? 0);
    pulseBySecond.set(sec, p);
  }

  const edaBySecond = new Map<number, EdaSample>();
  for (const e of rawEdaTrace) {
    edaBySecond.set(Math.round(e.t), e);
  }

  const faceBySecond = new Map<number, FaceSample>();
  for (const f of rawFaceTrace) {
    const sec = Math.round(f.t ?? (f as any).timestampSeconds ?? 0);
    faceBySecond.set(sec, f);
  }

  // Pre-calculate excessive motion intervals (within 3 seconds of an EXCESSIVE_MOTION event)
  const motionSeconds = new Set<number>();
  for (const ev of validationEvents) {
    if (ev.code === "EXCESSIVE_MOTION") {
      const center = Math.round(ev.timestampSeconds);
      for (let offset = -2; offset <= 3; offset++) {
        const sec = center + offset;
        if (sec >= 0 && sec <= totalDuration) {
          motionSeconds.add(sec);
        }
      }
    }
  }

  const points: TimelinePoint[] = [];

  for (let s = 0; s <= totalDuration; s++) {
    const isWarmingUp = s < 12;
    const isMotion = motionSeconds.has(s);

    // Look for pulse sample at s or immediate neighbor (step is typically 2s)
    const pSample = pulseBySecond.get(s) || (s % 2 === 1 ? pulseBySecond.get(s - 1) : undefined);

    let pulseVal: number | null = null;
    let pulseConf: number | null = null;
    let outOfRange = false;
    let stable = true;

    if (!isWarmingUp && pSample) {
      pulseConf = pSample.confidence;
      stable = pSample.stable && !isMotion;

      if (pSample.value === "outOfRange" || (typeof pSample.value === "number" && pSample.value > 110)) {
        outOfRange = true;
        pulseVal = null; // Do not plot numbers above 110
      } else if (typeof pSample.value === "number" && pSample.value >= 40 && pSample.value <= 110) {
        pulseVal = pSample.value;
      }
    }

    // Look for EDA sample (strictly >= 35s)
    let edaVal: number | null = null;
    if (s >= 35) {
      const eSample = edaBySecond.get(s) || (s % 2 === 1 ? edaBySecond.get(s - 1) : undefined);
      if (eSample && typeof eSample.value === "number") {
        edaVal = Math.min(100, Math.max(0, Math.round(eSample.value * 100)));
      }
    }

    // Look for speaking status
    const fSample = faceBySecond.get(s) || (s % 2 === 1 ? faceBySecond.get(s - 1) : undefined);
    const speaking = fSample ? fSample.isTalking : false;

    points.push({
      t: s,
      timeLabel: formatTimeSeconds(s),
      pulse: pulseVal,
      pulseConfidence: pulseConf,
      eda: edaVal,
      speaking,
      outOfRange,
      stable,
      isExcessiveMotion: isMotion,
      isWarmingUp,
    });
  }

  // Find top 2 or 3 local pulse peaks (strictly within measurable range)
  const validPulsePoints = points.filter((p) => p.pulse != null && !p.isWarmingUp);
  const localPeaks: { point: TimelinePoint; value: number }[] = [];

  for (let i = 1; i < validPulsePoints.length - 1; i++) {
    const prev = validPulsePoints[i - 1].pulse!;
    const curr = validPulsePoints[i].pulse!;
    const next = validPulsePoints[i + 1].pulse!;
    if (curr > prev && curr >= next && curr >= baselinePulse + 6) {
      localPeaks.push({ point: validPulsePoints[i], value: curr });
    }
  }

  // Sort descending by pulse value
  localPeaks.sort((a, b) => b.value - a.value);
  const topPeaks = localPeaks.slice(0, 3);

  // Annotate top peaks
  const peakPoints: TimelinePoint[] = [];
  topPeaks.forEach((pk, idx) => {
    pk.point.isPeak = true;
    pk.point.peakRank = idx + 1;
    pk.point.peakTriggerSec = Math.max(0, pk.point.t - 12); // 12-second lookback for conversational trigger
    peakPoints.push(pk.point);
  });

  // Calculate contiguous bands for speaking / listening / motion / outOfRange
  function computeBands(filterFn: (p: TimelinePoint) => boolean): { start: number; end: number }[] {
    const bands: { start: number; end: number }[] = [];
    let start: number | null = null;

    for (let i = 0; i < points.length; i++) {
      if (filterFn(points[i])) {
        if (start === null) start = points[i].t;
      } else {
        if (start !== null) {
          bands.push({ start, end: points[i - 1].t });
          start = null;
        }
      }
    }
    if (start !== null) {
      bands.push({ start, end: points[points.length - 1].t });
    }
    return bands;
  }

  const speakingBands = computeBands((p) => p.speaking);
  const listeningBands = computeBands((p) => !p.speaking);
  const motionBands = computeBands((p) => p.isExcessiveMotion);
  const outOfRangeBands = computeBands((p) => p.outOfRange);

  // Summary statistics for accessibility aria-label
  const pulsesOnly = points.map((p) => p.pulse).filter((val): val is number => val != null);
  const avgPulse = pulsesOnly.length > 0
    ? Math.round(pulsesOnly.reduce((a, b) => a + b, 0) / pulsesOnly.length)
    : undefined;
  const peakPulse = pulsesOnly.length > 0 ? Math.max(...pulsesOnly) : undefined;

  const speakingCount = points.filter((p) => p.speaking).length;
  const speakingPct = totalDuration > 0 ? Math.round((speakingCount / totalDuration) * 100) : 0;

  const summaryText = `Pressure timeline for ${totalDuration}-second session. ${
    avgPulse ? `Average pulse ${avgPulse} bpm (resting baseline ${baselinePulse} bpm), peak ${peakPulse} bpm.` : ""
  } ${peakPoints.length} stress reaction moment${peakPoints.length === 1 ? "" : "s"} identified. Speaking share: ${speakingPct}%. Wellness indicator, not a medical measurement.`;

  return {
    points,
    hasBiometrics: true,
    isTooShort: false,
    status: biometrics.readinessStatus || (totalDuration >= 60 ? "Full read" : "Quick read"),
    baselinePulse,
    durationSeconds: totalDuration,
    averagePulse: avgPulse,
    peakPulse,
    peakPoints,
    speakingBands,
    listeningBands,
    motionBands,
    outOfRangeBands,
    summaryText,
  };
}
