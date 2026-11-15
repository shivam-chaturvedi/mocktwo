/**
 * Week & Streak Statistics Service
 *
 * Computes calendar-aligned week strips, streak counts, goal progress,
 * and practice duration from real stored recordings.
 */

import type { Recording } from "../types/index.ts";

export const WEEK_START_DAY = 1; // 1 = Monday (0 = Sunday, 1 = Monday)

export interface WeekDayStat {
  dayLabel: string; // "M", "T", "W", "T", "F", "S", "S"
  dayName: string; // "Mon", "Tue", "Wed", ...
  dateNumber: number; // 1 - 31
  dateIso: string; // YYYY-MM-DD
  isToday: boolean;
  isCompleted: boolean;
  completedCount: number;
}

export interface WeekStats {
  weekDays: WeekDayStat[];
  completedThisWeekCount: number;
  practiceTimeMinutesThisWeek: number;
  currentStreakDays: number;
  goalTarget: number;
  goalProgressRatio: number; // 0 to 1
  totalCompletedSessions: number;
}

/**
 * Format a Date to local YYYY-MM-DD
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Check if a recording counts as a valid completed session.
 * Excludes "Too short" and incomplete sessions.
 */
export function isCompletedSession(recording: Pick<Recording, "status" | "durationSeconds">): boolean {
  if (!recording) return false;
  const status = (recording.status || "").toLowerCase();
  if (status === "too short" || status === "incomplete") return false;
  return status === "completed" && (recording.durationSeconds ?? 0) > 0;
}

/**
 * Calculate the Monday (or configured start day) of the week containing `referenceDate`.
 */
export function getStartOfWeek(referenceDate: Date, startDay: number = WEEK_START_DAY): Date {
  const currentDay = referenceDate.getDay();
  // Calculate distance in days to the previous startDay
  const distance = (currentDay - startDay + 7) % 7;
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - distance,
    0,
    0,
    0,
    0
  );
  return start;
}

/**
 * Compute consecutive streak days counting backwards from today (or yesterday if today has none).
 */
export function computeStreak(completedDatesSet: Set<string>, now: Date = new Date()): number {
  if (completedDatesSet.size === 0) return 0;

  const todayStr = toLocalDateString(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  let startDate: Date;
  if (completedDatesSet.has(todayStr)) {
    startDate = now;
  } else if (completedDatesSet.has(yesterdayStr)) {
    startDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  while (true) {
    const key = toLocalDateString(checkDate);
    if (completedDatesSet.has(key)) {
      streak++;
      // Move 1 day back (safe across month/year boundaries)
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute the full week stats from a list of recordings.
 */
export function computeWeekStats(
  recordings: Recording[],
  goalTarget: number = 5,
  now: Date = new Date()
): WeekStats {
  const validRecordings = (recordings || []).filter(isCompletedSession);

  // Map each completed recording to its local date string
  const completedDateCountMap = new Map<string, number>();
  const completedDatesSet = new Set<string>();

  for (const rec of validRecordings) {
    if (!rec.date) continue;
    const parsed = new Date(rec.date);
    if (isNaN(parsed.getTime())) continue;
    const dateKey = toLocalDateString(parsed);
    completedDateCountMap.set(dateKey, (completedDateCountMap.get(dateKey) || 0) + 1);
    completedDatesSet.add(dateKey);
  }

  // Build the 7 days of the current week (starting Monday)
  const monday = getStartOfWeek(now, WEEK_START_DAY);
  const todayStr = toLocalDateString(now);

  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekDays: WeekDayStat[] = [];
  const weekDateSet = new Set<string>();

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateIso = toLocalDateString(dayDate);
    weekDateSet.add(dateIso);

    const count = completedDateCountMap.get(dateIso) || 0;

    weekDays.push({
      dayLabel: dayLetters[i],
      dayName: dayNames[i],
      dateNumber: dayDate.getDate(),
      dateIso,
      isToday: dateIso === todayStr,
      isCompleted: count > 0,
      completedCount: count,
    });
  }

  // Compute stats for the current week
  let completedThisWeekCount = 0;
  let totalDurationSecondsThisWeek = 0;

  for (const rec of validRecordings) {
    if (!rec.date) continue;
    const parsed = new Date(rec.date);
    if (isNaN(parsed.getTime())) continue;
    const dateKey = toLocalDateString(parsed);

    if (weekDateSet.has(dateKey)) {
      completedThisWeekCount++;
      totalDurationSecondsThisWeek += rec.durationSeconds || 0;
    }
  }

  const practiceTimeMinutesThisWeek = Math.round(totalDurationSecondsThisWeek / 60);
  const currentStreakDays = computeStreak(completedDatesSet, now);
  const safeGoalTarget = Math.max(1, goalTarget);
  const goalProgressRatio = Math.min(1, completedThisWeekCount / safeGoalTarget);

  return {
    weekDays,
    completedThisWeekCount,
    practiceTimeMinutesThisWeek,
    currentStreakDays,
    goalTarget: safeGoalTarget,
    goalProgressRatio,
    totalCompletedSessions: validRecordings.length,
  };
}
