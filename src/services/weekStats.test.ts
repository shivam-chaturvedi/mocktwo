import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeWeekStats,
  computeStreak,
  getStartOfWeek,
  toLocalDateString,
  isCompletedSession,
  WEEK_START_DAY,
} from "./weekStats.ts";
import type { Recording } from "../types/index.ts";

describe("weekStats service", () => {
  it("WEEK_START_DAY is Monday (1)", () => {
    assert.strictEqual(WEEK_START_DAY, 1);
  });

  describe("toLocalDateString", () => {
    it("formats dates as YYYY-MM-DD", () => {
      const d = new Date(2026, 10, 15); // Nov 15, 2026
      assert.strictEqual(toLocalDateString(d), "2026-11-15");
    });
  });

  describe("getStartOfWeek", () => {
    it("returns Monday for a Wednesday", () => {
      // 2026-11-18 is a Wednesday
      const wed = new Date(2026, 10, 18, 14, 30);
      const start = getStartOfWeek(wed);
      assert.strictEqual(start.getDay(), 1); // Monday
      assert.strictEqual(toLocalDateString(start), "2026-11-16");
    });

    it("returns Monday for a Sunday", () => {
      // 2026-11-22 is a Sunday
      const sun = new Date(2026, 10, 22, 22, 0);
      const start = getStartOfWeek(sun);
      assert.strictEqual(start.getDay(), 1);
      assert.strictEqual(toLocalDateString(start), "2026-11-16");
    });

    it("returns the same day if reference is Monday", () => {
      // 2026-11-16 is Monday
      const mon = new Date(2026, 10, 16, 9, 0);
      const start = getStartOfWeek(mon);
      assert.strictEqual(toLocalDateString(start), "2026-11-16");
    });
  });

  describe("isCompletedSession", () => {
    it("accepts Completed sessions with duration > 0", () => {
      assert.strictEqual(
        isCompletedSession({ status: "Completed", durationSeconds: 120 } as Recording),
        true
      );
    });

    it("rejects 'Too short' sessions", () => {
      assert.strictEqual(
        isCompletedSession({ status: "Too short", durationSeconds: 20 } as Recording),
        false
      );
    });

    it("rejects Incomplete sessions", () => {
      assert.strictEqual(
        isCompletedSession({ status: "Incomplete", durationSeconds: 50 } as Recording),
        false
      );
    });

    it("rejects zero duration sessions", () => {
      assert.strictEqual(
        isCompletedSession({ status: "Completed", durationSeconds: 0 } as Recording),
        false
      );
    });
  });

  describe("computeStreak", () => {
    it("returns 0 when there are no dates", () => {
      const emptySet = new Set<string>();
      assert.strictEqual(computeStreak(emptySet, new Date(2026, 10, 15)), 0);
    });

    it("returns 1 when today only has a session", () => {
      const now = new Date(2026, 10, 15);
      const dates = new Set(["2026-11-15"]);
      assert.strictEqual(computeStreak(dates, now), 1);
    });

    it("returns 1 when yesterday only has a session (grace for today)", () => {
      const now = new Date(2026, 10, 15);
      const dates = new Set(["2026-11-14"]);
      assert.strictEqual(computeStreak(dates, now), 1);
    });

    it("returns 0 when last session was 2 days ago (gap)", () => {
      const now = new Date(2026, 10, 15);
      const dates = new Set(["2026-11-13"]);
      assert.strictEqual(computeStreak(dates, now), 0);
    });

    it("counts consecutive days backwards across month boundary", () => {
      // Today: Dec 2, 2026
      const now = new Date(2026, 11, 2);
      const dates = new Set([
        "2026-12-02",
        "2026-12-01",
        "2026-11-30",
        "2026-11-29",
      ]);
      assert.strictEqual(computeStreak(dates, now), 4);
    });

    it("stops counting when it hits a gap day", () => {
      const now = new Date(2026, 10, 15);
      const dates = new Set([
        "2026-11-15",
        "2026-11-14",
        // 2026-11-13 missing
        "2026-11-12",
        "2026-11-11",
      ]);
      assert.strictEqual(computeStreak(dates, now), 2);
    });
  });

  describe("computeWeekStats", () => {
    it("computes clean zero-state when recordings array is empty", () => {
      const now = new Date(2026, 10, 18, 12, 0); // Wednesday
      const stats = computeWeekStats([], 5, now);

      assert.strictEqual(stats.completedThisWeekCount, 0);
      assert.strictEqual(stats.practiceTimeMinutesThisWeek, 0);
      assert.strictEqual(stats.currentStreakDays, 0);
      assert.strictEqual(stats.goalTarget, 5);
      assert.strictEqual(stats.goalProgressRatio, 0);
      assert.strictEqual(stats.totalCompletedSessions, 0);
      assert.strictEqual(stats.weekDays.length, 7);

      // Verify Wednesday is today and outlined, but has no completed sessions
      const wed = stats.weekDays.find((d) => d.dayName === "Wed");
      assert.ok(wed);
      assert.strictEqual(wed.isToday, true);
      assert.strictEqual(wed.isCompleted, false);

      // Verify all days have isCompleted === false
      assert.ok(stats.weekDays.every((d) => !d.isCompleted));
    });

    it("computes stats for sessions in current week", () => {
      const now = new Date(2026, 10, 18, 12, 0); // Wednesday Nov 18, 2026
      const recordings: Recording[] = [
        {
          id: "rec-1",
          scenarioId: "s-1",
          scenarioTitle: "Interview",
          personaName: "Interviewer",
          date: "2026-11-16T10:00:00.000Z", // Monday
          relativeDate: "2 days ago",
          dateGroup: "This Week",
          durationSeconds: 180, // 3 min
          status: "Completed",
          transcript: [],
          userNotes: [],
        },
        {
          id: "rec-2",
          scenarioId: "s-2",
          scenarioTitle: "Sales",
          personaName: "Client",
          date: "2026-11-17T15:30:00.000Z", // Tuesday
          relativeDate: "Yesterday",
          dateGroup: "This Week",
          durationSeconds: 300, // 5 min
          status: "Completed",
          transcript: [],
          userNotes: [],
        },
        {
          id: "rec-3",
          scenarioId: "s-3",
          scenarioTitle: "Short",
          personaName: "Client",
          date: "2026-11-17T18:00:00.000Z",
          relativeDate: "Yesterday",
          dateGroup: "This Week",
          durationSeconds: 10,
          status: "Too short", // must be excluded
          transcript: [],
          userNotes: [],
        },
        {
          id: "rec-4",
          scenarioId: "s-4",
          scenarioTitle: "Old",
          personaName: "Lead",
          date: "2026-11-09T10:00:00.000Z", // Previous week Monday
          relativeDate: "Last week",
          dateGroup: "Earlier",
          durationSeconds: 600,
          status: "Completed",
          transcript: [],
          userNotes: [],
        },
      ];

      const stats = computeWeekStats(recordings, 5, now);
      assert.strictEqual(stats.completedThisWeekCount, 2);
      assert.strictEqual(stats.practiceTimeMinutesThisWeek, 8); // 180s + 300s = 480s = 8m
      assert.strictEqual(stats.goalTarget, 5);
      assert.strictEqual(stats.goalProgressRatio, 2 / 5);
      assert.strictEqual(stats.totalCompletedSessions, 3); // 2 this week + 1 last week
      // Streak: today (Wed 18) has none, but yesterday (Tue 17) and day before (Mon 16) have completed
      assert.strictEqual(stats.currentStreakDays, 2);

      const mon = stats.weekDays.find((d) => d.dayName === "Mon");
      assert.ok(mon?.isCompleted);
      const tue = stats.weekDays.find((d) => d.dayName === "Tue");
      assert.ok(tue?.isCompleted);
      const wed = stats.weekDays.find((d) => d.dayName === "Wed");
      assert.strictEqual(wed?.isCompleted, false);
      assert.strictEqual(wed?.isToday, true);
    });

    it("handles DST transition day gracefully without skipping dates", () => {
      // In US/EU, spring forward / fall back occurs in March/November.
      // E.g., Nov 1, 2026 or March 29, 2026.
      // Regardless of time-shift, date strings and calendar day offsets must produce 7 unique days.
      const marchDate = new Date(2026, 2, 29, 12, 0); // March 29, 2026
      const stats = computeWeekStats([], 5, marchDate);
      assert.strictEqual(stats.weekDays.length, 7);
      const uniqueDates = new Set(stats.weekDays.map((d) => d.dateIso));
      assert.strictEqual(uniqueDates.size, 7);
    });

    it("handles midnight edges (23:59 vs 00:01)", () => {
      // Wednesday 23:59:59
      const wedMidnight = new Date(2026, 10, 18, 23, 59, 59);
      const recordings: Recording[] = [
        {
          id: "rec-late",
          scenarioId: "s-1",
          scenarioTitle: "Late Night",
          personaName: "Partner",
          date: wedMidnight.toISOString(),
          relativeDate: "Today",
          dateGroup: "Today",
          durationSeconds: 120,
          status: "Completed",
          transcript: [],
          userNotes: [],
        },
      ];

      const statsWed = computeWeekStats(recordings, 5, wedMidnight);
      assert.strictEqual(statsWed.completedThisWeekCount, 1);
      assert.strictEqual(statsWed.currentStreakDays, 1);

      // Thursday 00:01:00
      const thuMorning = new Date(2026, 10, 19, 0, 1, 0);
      const statsThu = computeWeekStats(recordings, 5, thuMorning);
      // Yesterday had the session, so streak is still 1
      assert.strictEqual(statsThu.currentStreakDays, 1);
    });
  });
});
