import {
  type BiometricSample,
  type ComposureTier,
  type DifficultyLevel,
  type ExpressionKey,
  type MetricState,
  type NervousnessLevel,
  type PeakStressMoment,
  type PulseSample,
  type HrvSample,
  type BreathingSample,
  type EdaSample,
  type FaceSample,
  type SessionBiometrics,
  type SessionReadinessStatus,
  type UserBaseline,
  type ValidationStatusCode,
  VALIDATION_HINTS,
  getComposureTier,
} from "../types";

export const WELLNESS_DISCLAIMER = "Wellness indicator, not a medical measurement.";

export const DEFAULT_USER_BASELINE: UserBaseline = {
  restingPulse: 68,
  restingHrvRmssd: 54,
  restingBaevsky: 82,
  restingBreathingRate: 14,
  restingEdaArousal: 0.22,
  restingExpressions: {
    neutral: 0.88,
    happy: 0.08,
    surprise: 0.02,
    contempt: 0.0,
    fear: 0.01,
    sad: 0.01,
    disgust: 0.0,
    angry: 0.0,
  },
  measuredAt: "2026-11-10T08:30:00Z",
  isCalibrated: true,
  restingHR: 68,
  restingHRV: 54,
};

export interface BiometricsProvider {
  id: string;
  name: string;
  source: "measured" | "estimated" | "unavailable";
  generateSessionBiometrics(
    durationSeconds: number,
    difficulty: DifficultyLevel,
    personaTraits: string[],
    pressureLevel?: "Moderate" | "High" | "Intense",
    baseline?: UserBaseline,
    forcedValidationIssues?: { startSec: number; endSec: number; code: ValidationStatusCode }[],
    forceOutOfRange?: boolean
  ): SessionBiometrics;
  measureBaseline(durationSeconds?: number): Promise<UserBaseline>;
  runMiniBaseline(durationSeconds?: number): Promise<{ restingPulse: number; expressions: Record<ExpressionKey, number> }>;
}

export class MockBiometricsProvider implements BiometricsProvider {
  id = "camera-smartspectra-mock";
  name = "SmartSpectra Optical Engine (Simulated)";
  source: "measured" | "estimated" | "unavailable" = "measured";

  generateSessionBiometrics(
    durationSeconds: number,
    difficulty: DifficultyLevel,
    personaTraits: string[] = [],
    pressureLevel: "Moderate" | "High" | "Intense" = "High",
    baseline: UserBaseline = DEFAULT_USER_BASELINE,
    forcedValidationIssues: { startSec: number; endSec: number; code: ValidationStatusCode }[] = [],
    forceOutOfRange: boolean = false
  ): SessionBiometrics {
    const basePulse = baseline.restingPulse || 68;
    const baseHrv = baseline.restingHrvRmssd || 54;
    const baseBaevsky = baseline.restingBaevsky || 82;
    const baseBreathing = baseline.restingBreathingRate || 14;

    const diffMultiplier =
      difficulty === "Advanced" ? 1.3 : difficulty === "Intermediate" ? 1.15 : 1.0;
    const pressureMultiplier =
      pressureLevel === "Intense" ? 1.25 : pressureLevel === "High" ? 1.12 : 1.0;

    const traitString = personaTraits.join(" ").toLowerCase();
    const isAggressive =
      traitString.includes("aggressive") ||
      traitString.includes("skeptical") ||
      traitString.includes("critical") ||
      traitString.includes("demanding") ||
      traitString.includes("provocative");

    const peakScale = diffMultiplier * pressureMultiplier * (isAggressive ? 1.15 : 1.0);

    // Pulse target calculations (Must stay within 40-110, or outOfRange)
    const targetPeakPulse = forceOutOfRange
      ? 116 // spikes above 110 bpm to demonstrate outOfRange marker
      : Math.min(108, Math.round(basePulse + 26 * peakScale));

    const sampleInterval = 2; // sample generated every 2 seconds
    const totalSteps = Math.max(1, Math.floor(durationSeconds / sampleInterval));

    const pulseRates: PulseSample[] = [];
    const hrvSamples: HrvSample[] = [];
    const breathingSamples: BreathingSample[] = [];
    const edaSamples: EdaSample[] = [];
    const faceSamples: FaceSample[] = [];
    const legacySamples: BiometricSample[] = [];

    // Peaks around ~35% and ~70% of conversation
    const peak1Sec = Math.round(durationSeconds * 0.35);
    const peak2Sec = Math.round(durationSeconds * 0.7);

    let cleanSecondsCount = 0;
    let hasOutOfRangePulse = false;

    // Build timeline samples
    for (let i = 0; i <= totalSteps; i++) {
      const t = Math.min(durationSeconds, i * sampleInterval);

      // Check if current timestamp falls within a forced validation issue (e.g. EXCESSIVE_MOTION)
      const activeIssue = forcedValidationIssues.find(
        (issue) => t >= issue.startSec && t <= issue.endSec
      );

      const isClean = !activeIssue;
      if (isClean) {
        cleanSecondsCount += Math.min(sampleInterval, Math.max(1, durationSeconds - t));
      }

      // Bell curves around the two stress peaks
      const dist1 = Math.abs(t - peak1Sec);
      const dist2 = Math.abs(t - peak2Sec);
      const peakEffect =
        Math.exp(-Math.pow(dist1 / 10, 2)) * 0.95 + Math.exp(-Math.pow(dist2 / 12, 2)) * 1.0;

      // Simulated talking cadence: user speaks roughly 45% of time in bursts
      const isTalking =
        (t >= 4 && t <= 14) ||
        (t >= 22 && t <= 34) ||
        (t >= 44 && t <= 56) ||
        (t >= 64 && t <= 72);

      // 1. Face landmarks & expressions (Immediate from 0 s)
      const neutralWeight = Math.max(0.2, 0.85 - peakEffect * 0.55);
      const fearWeight = Math.min(0.38, 0.02 + peakEffect * 0.32);
      const contemptWeight = Math.min(0.2, 0.01 + peakEffect * 0.16);
      const surpriseWeight = Math.min(0.18, 0.03 + (dist1 < 6 ? 0.14 : 0.02));
      const sadWeight = Math.min(0.15, 0.01 + peakEffect * 0.08);
      const happyWeight = Math.max(0.01, 0.06 - peakEffect * 0.05);
      const disgustWeight = Math.min(0.1, peakEffect * 0.06);
      const angryWeight = Math.min(0.12, peakEffect * 0.08);

      faceSamples.push({
        t,
        isTalking,
        blinkCount: Math.round(1 + peakEffect * 2),
        expressions: {
          neutral: Number(neutralWeight.toFixed(2)),
          fear: Number(fearWeight.toFixed(2)),
          contempt: Number(contemptWeight.toFixed(2)),
          surprise: Number(surpriseWeight.toFixed(2)),
          sad: Number(sadWeight.toFixed(2)),
          happy: Number(happyWeight.toFixed(2)),
          disgust: Number(disgustWeight.toFixed(2)),
          angry: Number(angryWeight.toFixed(2)),
        },
      });

      // 2. Pulse rate (Requires 12 s window)
      if (t >= 12) {
        const rawPulse = Math.round(
          basePulse + (targetPeakPulse - basePulse) * Math.min(1, peakEffect) + (Math.sin(t * 0.5) * 1.5)
        );

        const confidence = activeIssue
          ? activeIssue.code === "EXCESSIVE_MOTION" ? 22 : 32
          : Math.min(96, Math.max(68, Math.round(88 - peakEffect * 10)));
        const stable = confidence >= 40;

        if (rawPulse > 110) {
          hasOutOfRangePulse = true;
          pulseRates.push({
            t,
            value: "outOfRange",
            confidence,
            stable,
          });
        } else {
          const clamped = Math.max(40, Math.min(110, rawPulse));
          pulseRates.push({
            t,
            value: clamped,
            confidence,
            stable,
          });
        }
      }

      // 3. Breathing (Requires 30 s window, invalid while talking or unstable camera)
      if (t >= 30) {
        const isMeasurable = !isTalking && !activeIssue;
        const confidence = isMeasurable ? 78 + Math.round(Math.sin(t) * 8) : 18;
        const stable = confidence >= 45;
        const rawRate = Math.round(baseBreathing + peakEffect * 6 + Math.sin(t * 0.3) * 1.5);
        const clampedRate = Math.max(5, Math.min(40, rawRate));

        breathingSamples.push({
          t,
          value: clampedRate,
          confidence,
          stable,
          isMeasurable,
        });
      }

      // 4. EDA proxy trace (Starts after 35+ s)
      if (t >= 35) {
        const rawEda = Number(
          Math.min(1.0, Math.max(0.1, 0.24 + peakEffect * 0.52 + Math.sin(t * 0.2) * 0.04)).toFixed(3)
        );
        edaSamples.push({
          t,
          value: rawEda,
        });
      }

      // 5. HRV (Requires 60 s window; confidence is 0 until 60 s)
      if (t >= 60) {
        const hrvConfidence = activeIssue ? 35 : Math.min(94, Math.max(60, Math.round(86 - peakEffect * 12)));
        const hrvStable = hrvConfidence >= 50;
        const currentRmssd = Math.max(22, Math.round(baseHrv - peakEffect * 18));
        const currentBaevsky = Math.round(baseBaevsky + peakEffect * 28);

        hrvSamples.push({
          t,
          rmssd: currentRmssd,
          meanNn: Math.round(880 - peakEffect * 140),
          sdnn: Math.round(currentRmssd * 1.25),
          baevsky: currentBaevsky,
          confidence: hrvConfidence,
          stable: hrvStable,
        });
      }

      // Legacy fallback sample
      legacySamples.push({
        t,
        heartRate: t >= 12 ? (pulseRates[pulseRates.length - 1]?.value === "outOfRange" ? 112 : (pulseRates[pulseRates.length - 1]?.value as number || basePulse)) : basePulse,
        hrv: t >= 60 ? hrvSamples[hrvSamples.length - 1]?.rmssd : undefined,
        source: "measured",
      });
    }

    // Determine states based on payloads (first sample with confidence > 0 and stable)
    const pulseFirstStable = pulseRates.find((p) => p.confidence > 0 && p.stable && p.value !== "outOfRange");
    let pulseState: MetricState = "unavailable";
    if (durationSeconds < 12) {
      pulseState = "notEnoughTime";
    } else if (hasOutOfRangePulse && pulseRates.every((p) => p.value === "outOfRange")) {
      pulseState = "outOfRange";
    } else if (pulseFirstStable) {
      pulseState = "measured";
    } else {
      pulseState = "lowConfidence";
    }

    // Waveform
    const waveformPoints = Array.from({ length: 40 }).map((_, idx) => {
      const ph = (idx / 40) * Math.PI * 4;
      return {
        t: idx * 0.25,
        shapeValue: Number(((Math.sin(ph) * 0.5 + 0.5) * (1 - Math.abs(idx - 20) * 0.02)).toFixed(3)),
      };
    });

    // HRV state
    const hrvFirstStable = hrvSamples.find((h) => h.confidence > 0 && h.stable);
    let hrvState: MetricState = "unavailable";
    if (durationSeconds < 60) {
      hrvState = "notEnoughTime";
    } else if (hrvFirstStable) {
      hrvState = "measured";
    } else {
      hrvState = "lowConfidence";
    }

    // Breathing state
    const breathingStableSample = breathingSamples.find((b) => b.isMeasurable && b.stable);
    let breathingState: MetricState = "unavailable";
    if (durationSeconds < 30) {
      breathingState = "notEnoughTime";
    } else if (breathingStableSample) {
      breathingState = "measured";
    } else {
      breathingState = "notMeasurableWhileSpeaking";
    }

    // EDA state
    let edaState: MetricState = "unavailable";
    if (durationSeconds < 35) {
      edaState = "notEnoughTime";
    } else if (edaSamples.length > 0) {
      edaState = "measured";
    }

    // Face state
    const faceState: MetricState = faceSamples.length > 0 ? "measured" : "unavailable";

    // Readiness status
    let readinessStatus: SessionReadinessStatus = "Full read";
    if (durationSeconds < 12) {
      readinessStatus = "Too short";
    } else if (durationSeconds < 30) {
      readinessStatus = "Quick read";
    } else if (durationSeconds < 60) {
      readinessStatus = "Quick read";
    }

    // Expression averages
    const exprAverages: Record<ExpressionKey, number> = {
      neutral: 0.72,
      fear: 0.09,
      contempt: 0.04,
      surprise: 0.05,
      sad: 0.03,
      happy: 0.03,
      disgust: 0.02,
      angry: 0.02,
    };
    if (faceSamples.length > 0) {
      const count = faceSamples.length;
      const sum: Record<ExpressionKey, number> = {
        neutral: 0,
        fear: 0,
        contempt: 0,
        surprise: 0,
        sad: 0,
        happy: 0,
        disgust: 0,
        angry: 0,
      };
      faceSamples.forEach((f) => {
        Object.keys(sum).forEach((k) => {
          sum[k as ExpressionKey] += f.expressions[k as ExpressionKey] || 0;
        });
      });
      Object.keys(sum).forEach((k) => {
        exprAverages[k as ExpressionKey] = Number((sum[k as ExpressionKey] / count).toFixed(2));
      });
    }

    // Number of available signals for composure score (out of 5)
    let availableCount = 0;
    if (pulseState === "measured") availableCount++;
    if (durationSeconds >= 12) availableCount++; // recovery time (approx resolution 12s)
    if (hrvState === "measured") availableCount++;
    if (edaState === "measured") availableCount++;
    if (faceState === "measured") availableCount++;

    const isPartialScore = availableCount < 5 || durationSeconds < 60;

    // Calculate composure score
    let composureScore: number | undefined = undefined;
    let composureTier: ComposureTier | undefined = undefined;
    let nervousnessLevel: NervousnessLevel = "Mild";

    if (durationSeconds >= 12 && availableCount > 0) {
      const pulseScore = Math.max(40, 100 - (targetPeakPulse - basePulse) * 1.5);
      const recoveryScore = Math.max(50, 100 - Math.max(0, 24 - 12) * 2.0);
      const hrvScore = hrvState === "measured" ? Math.max(45, 100 - (baseBaevsky > 0 ? (baseBaevsky - 70) * 0.4 : 10)) : 80;
      const edaScore = edaState === "measured" ? Math.max(50, 100 - (edaSamples[edaSamples.length - 1]?.value || 0.3) * 60) : 82;
      const tensionShare = exprAverages.fear + exprAverages.angry + exprAverages.sad + exprAverages.contempt;
      const faceScore = Math.max(45, Math.round(100 - tensionShare * 140));

      let weightedSum = 0;
      let totalWeight = 0;

      if (pulseState === "measured") {
        weightedSum += pulseScore * 0.35;
        totalWeight += 0.35;
      }
      weightedSum += recoveryScore * 0.25;
      totalWeight += 0.25;

      if (hrvState === "measured") {
        weightedSum += hrvScore * 0.15;
        totalWeight += 0.15;
      }
      if (edaState === "measured") {
        weightedSum += edaScore * 0.1;
        totalWeight += 0.1;
      }
      if (faceState === "measured") {
        weightedSum += faceScore * 0.15;
        totalWeight += 0.15;
      }

      composureScore = Math.round(weightedSum / totalWeight);
      composureTier = getComposureTier(composureScore);

      if (composureScore >= 88) nervousnessLevel = "Calm";
      else if (composureScore >= 76) nervousnessLevel = "Mild";
      else if (composureScore >= 60) nervousnessLevel = "Moderate";
      else nervousnessLevel = "High";
    }

    // Filter valid pulse values for stats
    const validNumericPulses = pulseRates
      .filter((p) => typeof p.value === "number")
      .map((p) => p.value as number);

    const avgPulseVal =
      validNumericPulses.length > 0
        ? Math.round(validNumericPulses.reduce((a, b) => a + b, 0) / validNumericPulses.length)
        : undefined;
    const peakPulseVal =
      validNumericPulses.length > 0 ? Math.max(...validNumericPulses) : undefined;
    const minPulseVal =
      validNumericPulses.length > 0 ? Math.min(...validNumericPulses) : undefined;

    // HRV single values (60s reached)
    const finalHrv = hrvSamples[hrvSamples.length - 1];
    const rmssdVal = durationSeconds >= 60 && finalHrv ? finalHrv.rmssd : undefined;
    const baevskyVal = durationSeconds >= 60 && finalHrv ? finalHrv.baevsky : undefined;
    const baevskyDelta =
      baevskyVal !== undefined ? Math.round(((baevskyVal - baseBaevsky) / baseBaevsky) * 100) : undefined;

    // Breathing quiet segments average
    const quietBreaths = breathingSamples
      .filter((b) => b.isMeasurable && b.stable)
      .map((b) => b.value);
    const quietBreathingRate =
      quietBreaths.length > 0
        ? Math.round(quietBreaths.reduce((a, b) => a + b, 0) / quietBreaths.length)
        : undefined;

    // Clean coverage calculation
    const coverageCleanSec = Math.min(durationSeconds, Math.max(0, cleanSecondsCount));
    const coverageStr = `Coverage: ${coverageCleanSec} of ${durationSeconds} s measured cleanly`;

    // Validation events list
    const validationEvents = forcedValidationIssues.map((issue) => ({
      timestampSeconds: issue.startSec,
      code: issue.code,
      hintText: VALIDATION_HINTS[issue.code] || "Adjust camera framing",
    }));

    // SDK-compliant peak stress moments (Looking back 12s, physiology only)
    const peakStressMoments: PeakStressMoment[] = [
      {
        timestampSeconds: peak1Sec,
        counterpartQuote: "Your numbers do not justify this proposed budget. Walk me through the delta.",
        reaction: `Pulse spiked to ${targetPeakPulse > 110 ? ">110 bpm (out of range)" : `${targetPeakPulse} bpm`} (+${Math.max(0, targetPeakPulse - basePulse)} vs baseline). Fear expression rose to 34%.`,
        userAction: "Maintained relaxed facial expressions, paused for 2 seconds before countering.",
        suggestion: "Take a silent diaphragmatic breath during the pause to blunt the initial autonomic surge.",
      },
      {
        timestampSeconds: peak2Sec,
        counterpartQuote: "That sounds like an excuse rather than an explanation of the timeline slip.",
        reaction: "EDA arousal peaked (+0.44 relative). Blink rate doubled to 28/min.",
        userAction: "Remained centered without defensive facial flinching.",
        suggestion: "Keep shoulders relaxed and start your response at a deliberately measured pace.",
      },
    ].filter((m) => m.timestampSeconds < durationSeconds);

    return {
      pulse: {
        rate: pulseRates,
        avg: avgPulseVal,
        peak: peakPulseVal,
        min: minPulseVal,
        baselineValue: basePulse,
        deltaVsBaseline: avgPulseVal ? avgPulseVal - basePulse : undefined,
        state: pulseState,
        confidence: pulseState === "measured" ? 88 : 0,
        windowSeconds: 12,
        rangeBpm: "40–110 bpm",
        hasOutOfRange: hasOutOfRangePulse,
      },
      waveform: {
        samples: waveformPoints,
        state: pulseState,
      },
      hrv: {
        trace: hrvSamples,
        rmssd: rmssdVal,
        meanNn: finalHrv?.meanNn,
        sdnn: finalHrv?.sdnn,
        baevsky: baevskyVal,
        baevskyDeltaVsBaseline: baevskyDelta,
        state: hrvState,
        confidence: hrvState === "measured" ? (finalHrv?.confidence || 82) : 0,
        windowSeconds: 60,
      },
      breathing: {
        rate: breathingSamples,
        quietRateBpm: quietBreathingRate,
        state: breathingState,
        confidence: breathingState === "measured" ? 80 : 0,
        windowSeconds: 30,
        rangeBpm: "5–40 br/min",
      },
      eda: {
        trace: edaSamples,
        peakArousalDelta: edaSamples.length > 0 && typeof baseline.restingEdaArousal === "number" ? Number((edaSamples[edaSamples.length - 1].value - baseline.restingEdaArousal).toFixed(2)) : undefined,
        state: edaState,
        startSeconds: 35,
      },
      face: {
        trace: faceSamples,
        expressionAverages: exprAverages,
        blinkRatePerMin: Math.round(18 + peakScale * 8),
        speakingSharePct: Math.round((faceSamples.filter((f) => f.isTalking).length / Math.max(1, faceSamples.length)) * 100),
        state: faceState,
      },
      validationEvents,
      cleanMeasuredSeconds: coverageCleanSec,
      totalDurationSeconds: durationSeconds,
      coverageRatio: coverageStr,
      recoverySecondsApprox: durationSeconds >= 24 ? 24 : undefined,
      readinessStatus,
      composureScore,
      composureTier,
      signalsAvailableCount: availableCount,
      isPartialScore,
      nervousnessLevel,
      peakStressMoments,

      // Backward compatibility aliases
      avgHR: avgPulseVal,
      peakHR: peakPulseVal,
      minHR: minPulseVal,
      baselineHR: basePulse,
      avgHRV: rmssdVal,
      baselineHRV: baseHrv,
      recoverySeconds: 24,
      source: "measured",
      samples: legacySamples,
    };
  }

  async measureBaseline(_durationSeconds: number = 60): Promise<UserBaseline> {
    return {
      restingPulse: 68,
      restingHrvRmssd: 54,
      restingBaevsky: 82,
      restingBreathingRate: 14,
      restingEdaArousal: 0.2,
      restingExpressions: {
        neutral: 0.9,
        happy: 0.06,
        surprise: 0.02,
        contempt: 0.0,
        fear: 0.01,
        sad: 0.01,
        disgust: 0.0,
        angry: 0.0,
      },
      measuredAt: new Date().toISOString(),
      isCalibrated: true,
      restingHR: 68,
      restingHRV: 54,
    };
  }

  async runMiniBaseline(_durationSeconds: number = 20): Promise<{ restingPulse: number; expressions: Record<ExpressionKey, number> }> {
    return {
      restingPulse: 68,
      expressions: {
        neutral: 0.88,
        happy: 0.08,
        surprise: 0.02,
        contempt: 0.0,
        fear: 0.01,
        sad: 0.01,
        disgust: 0.0,
        angry: 0.0,
      },
    };
  }
}

export class CameraEstimateProvider extends MockBiometricsProvider {
  override id = "camera-estimate";
  override name = "Facial Micro-vascular Estimate (Optical Camera)";
  override source: "measured" | "estimated" | "unavailable" = "estimated";
}

// Renormalized proprietary mocktwo Composure Index
export function calculateComposureScore(params: {
  pulseRiseVsBaseline?: number;
  peakPulse?: number;
  recoverySecondsApprox?: number;
  hrvVsBaseline?: number;
  edaArousalVsBaseline?: number;
  expressionTensionShare?: number;
  signalsAvailableCount: number;
}): { score: number; tier: ComposureTier; nervousness: NervousnessLevel; isPartial: boolean } {
  const {
    pulseRiseVsBaseline = 12,
    peakPulse = 84,
    recoverySecondsApprox = 24,
    hrvVsBaseline = -10,
    edaArousalVsBaseline = 0.2,
    expressionTensionShare = 0.15,
    signalsAvailableCount,
  } = params;

  const pulseScore = Math.max(40, 100 - Math.max(0, pulseRiseVsBaseline) * 2.2);
  const peakScore = Math.max(45, 100 - Math.max(0, peakPulse - 70) * 1.4);
  const recoveryScore = Math.max(50, 100 - Math.max(0, recoverySecondsApprox - 12) * 2.0);
  const hrvScore = Math.max(45, 100 - Math.abs(Math.min(0, hrvVsBaseline)) * 1.5);
  const edaScore = Math.max(50, 100 - Math.max(0, edaArousalVsBaseline) * 80);
  const expressionScore = Math.max(45, 100 - Math.max(0, expressionTensionShare) * 130);

  // Renormalized weighting based on available signals
  let weighted = 0;
  let weightSum = 0;

  if (params.pulseRiseVsBaseline !== undefined) {
    weighted += (pulseScore * 0.2 + peakScore * 0.15);
    weightSum += 0.35;
  }
  if (params.recoverySecondsApprox !== undefined) {
    weighted += recoveryScore * 0.25;
    weightSum += 0.25;
  }
  if (params.hrvVsBaseline !== undefined) {
    weighted += hrvScore * 0.15;
    weightSum += 0.15;
  }
  if (params.edaArousalVsBaseline !== undefined) {
    weighted += edaScore * 0.1;
    weightSum += 0.1;
  }
  if (params.expressionTensionShare !== undefined) {
    weighted += expressionScore * 0.15;
    weightSum += 0.15;
  }

  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 75;
  const tier = getComposureTier(score);

  let nervousness: NervousnessLevel = "Mild";
  if (score >= 88) nervousness = "Calm";
  else if (score >= 76) nervousness = "Mild";
  else if (score >= 60) nervousness = "Moderate";
  else nervousness = "High";

  return {
    score,
    tier,
    nervousness,
    isPartial: signalsAvailableCount < 5,
  };
}
