/**
 * Coaching Engine (Backward-compatible adapter)
 *
 * Delegates strictly to the pure Session Insights Engine in `src/utils/sessionInsights.ts`.
 * Zero mock data, zero canned templates.
 */

import type { RecordingPressureCoaching } from "../types/index.ts";
import {
  computeSessionInsights,
  type SessionInsightsInput,
  type TranscriptSegmentInput,
} from "./sessionInsights.ts";

export type TranscriptItem = TranscriptSegmentInput;
export type CoachingGenerationInput = SessionInsightsInput;

export function generateCoaching(input: CoachingGenerationInput): RecordingPressureCoaching | null {
  const insights = computeSessionInsights(input);
  return insights.coaching;
}
