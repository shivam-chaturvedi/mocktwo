/**
 * Pure mathematical and environmental pre-flight check functions.
 * Evaluates camera readiness, frame rate, and illumination locally
 * before the SmartSpectra SDK is started, consuming zero external API credits.
 */

import {
  PREFLIGHT_MIN_FPS,
  PREFLIGHT_MIN_LUMINANCE,
  PREFLIGHT_MAX_LUMINANCE,
  PREFLIGHT_MAX_HIGHLIGHT_CLIP,
  PREFLIGHT_MAX_UNEVEN_RATIO,
} from "../constants/baseline.ts";

export interface PixelBufferLike {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface FrameLuminanceAnalysis {
  meanLuminance: number;
  highlightClipRatio: number;
  unevenRatio: number;
  lightingStatus: "ok" | "too_dark" | "too_bright" | "backlit";
  lightingPass: boolean;
}

export interface PreflightReport {
  cameraReady: boolean;
  fps: number;
  fpsPass: boolean;
  luminance: number;
  lightingStatus: "ok" | "too_dark" | "too_bright" | "backlit";
  lightingPass: boolean;
  isReady: boolean;
  reasons: string[];
}

/**
 * Pure luminance and illumination uniformity analysis on RGBA pixel buffer.
 */
export function analyzePixelLuminance(buffer: PixelBufferLike): FrameLuminanceAnalysis {
  const { data, width, height } = buffer;
  const totalPixels = width * height;
  if (!totalPixels || data.length < totalPixels * 4) {
    return {
      meanLuminance: 0,
      highlightClipRatio: 0,
      unevenRatio: 1,
      lightingStatus: "too_dark",
      lightingPass: false,
    };
  }

  let lumSum = 0;
  let highlightCount = 0;
  let leftSum = 0;
  let rightSum = 0;
  const halfWidth = Math.floor(width / 2);

  for (let i = 0; i < totalPixels * 4; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard ITU-R BT.601 perceptual luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;

    if (lum > 250) {
      highlightCount++;
    }

    const pixelIdx = i / 4;
    const x = pixelIdx % width;
    if (x < halfWidth) {
      leftSum += lum;
    } else {
      rightSum += lum;
    }
  }

  const meanLuminance = Number((lumSum / totalPixels).toFixed(1));
  const highlightClipRatio = Number((highlightCount / totalPixels).toFixed(3));
  const halfPixels = Math.max(1, totalPixels / 2);
  const leftMean = leftSum / halfPixels;
  const rightMean = rightSum / halfPixels;
  const unevenRatio = Number(
    (Math.max(leftMean, rightMean) / Math.max(1, Math.min(leftMean, rightMean))).toFixed(2)
  );

  let lightingStatus: "ok" | "too_dark" | "too_bright" | "backlit" = "ok";
  if (meanLuminance < PREFLIGHT_MIN_LUMINANCE) {
    lightingStatus = "too_dark";
  } else if (meanLuminance > PREFLIGHT_MAX_LUMINANCE || highlightClipRatio > PREFLIGHT_MAX_HIGHLIGHT_CLIP) {
    lightingStatus = "too_bright";
  } else if (unevenRatio > PREFLIGHT_MAX_UNEVEN_RATIO) {
    lightingStatus = "backlit";
  }

  const lightingPass = lightingStatus === "ok";

  return {
    meanLuminance,
    highlightClipRatio,
    unevenRatio,
    lightingStatus,
    lightingPass,
  };
}

/**
 * Combines hardware stream metrics and lighting analysis into a definitive readiness decision.
 */
export function evaluatePreflightReport(params: {
  cameraReady: boolean;
  measuredFps: number;
  luminanceAnalysis: FrameLuminanceAnalysis;
}): PreflightReport {
  const { cameraReady, measuredFps, luminanceAnalysis } = params;
  const reasons: string[] = [];

  if (!cameraReady) {
    reasons.push("Camera track is not active or permission was denied");
  }

  const fpsPass = measuredFps >= PREFLIGHT_MIN_FPS;
  if (!fpsPass) {
    reasons.push(
      `Frame rate is too low (${measuredFps.toFixed(0)} fps; min ${PREFLIGHT_MIN_FPS} fps required for optical pulse reading)`
    );
  }

  if (!luminanceAnalysis.lightingPass) {
    if (luminanceAnalysis.lightingStatus === "too_dark") {
      reasons.push("Room is too dark. Increase lighting on your face and upper chest.");
    } else if (luminanceAnalysis.lightingStatus === "too_bright") {
      reasons.push("Lighting is too bright or washed out. Reduce harsh direct light.");
    } else if (luminanceAnalysis.lightingStatus === "backlit") {
      reasons.push("Lighting is uneven or backlit. Face the light source directly.");
    }
  }

  const isReady = cameraReady && fpsPass && luminanceAnalysis.lightingPass;

  return {
    cameraReady,
    fps: measuredFps,
    fpsPass,
    luminance: luminanceAnalysis.meanLuminance,
    lightingStatus: luminanceAnalysis.lightingStatus,
    lightingPass: luminanceAnalysis.lightingPass,
    isReady,
    reasons,
  };
}
