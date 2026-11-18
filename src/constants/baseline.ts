/**
 * Single source of truth constants for Calm Baseline Calibration.
 *
 * Enforces:
 * - 90-second target duration required for complete 3-signal convergence (pulse, breathing, HRV).
 * - Minimum sample requirements per physiological signal.
 * - Local pre-flight hardware and lighting verification thresholds.
 */

export const BASELINE_TARGET_SECONDS = 90;
export const BASELINE_MAX_EXTENSION_SECONDS = 15;
export const BASELINE_MAX_PAUSED_SECONDS = 20;
export const BASELINE_TOTAL_TIMEOUT_SECONDS = 180;

// Minimum sample requirements for calibration to be considered complete
export const BASELINE_MIN_PULSE_SAMPLES = 30;     // At least 30 clean 1s pulse points
export const BASELINE_MIN_BREATHING_SAMPLES = 20; // At least 20 clean 1s breathing points
export const BASELINE_MIN_HRV_SAMPLES = 2;        // At least 2 clean 1s HRV points (emerges after 60s pulse window)

// Minimum quality ratios
export const BASELINE_MIN_FACE_PRESENT_RATIO = 0.70;
export const BASELINE_MAX_MOTION_RATIO = 0.25;
export const BASELINE_MIN_QUALITY_SCORE = 65;

// Pre-flight environmental thresholds (pure local verification before starting SDK)
export const PREFLIGHT_MIN_FPS = 24;
export const PREFLIGHT_MIN_LUMINANCE = 45;       // 0-255 scale
export const PREFLIGHT_MAX_LUMINANCE = 225;      // 0-255 scale
export const PREFLIGHT_MAX_HIGHLIGHT_CLIP = 0.15; // Max 15% blown-out pixels
export const PREFLIGHT_MAX_UNEVEN_RATIO = 2.0;    // Max luminance delta across quadrants
