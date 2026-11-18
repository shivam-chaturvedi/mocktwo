/**
 * Session & Recording Constants
 *
 * Single source of truth for completion thresholds and identifier validation.
 */

export const MIN_COMPLETED_SECONDS = 30;
export const MIN_CALIBRATION_CLEAN_SECONDS = 45;
export const TOTAL_CALIBRATION_SECONDS = 60;

// Readiness Gate Constants
export const GATE_REQUIRED_OK_MS = 3000;
export const GATE_COUNTDOWN_SECONDS = 3;
export const GATE_HELP_TIMEOUT_MS = 60000;
export const GATE_GIVE_UP_TIMEOUT_MS = 90000;

export const RECORDING_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

export type SessionEndReason =
  | "completed"
  | "user_quit"
  | "timeout"
  | "error"
  | "app_closed";

export type SessionStatus =
  | "recording"
  | "completed"
  | "abandoned"
  | "interrupted"
  | "failed";
