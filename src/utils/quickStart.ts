/**
 * src/utils/quickStart.ts
 *
 * Pure selection logic for Quick Start categories:
 * - Maps Quick Start categories to canonical InteractionTypes (including legacy aliases)
 * - Implements shuffle bag rotation with non-repeating selection across sessions
 */

import type { InteractionType, PracticeScenario } from "../types";

export type QuickStartCategory =
  | "Interviews"
  | "Sales & Pitches"
  | "Presentations"
  | "Difficult Conversations"
  | "Negotiation"
  | "Customer Service"
  | "Hospitality";

export const CATEGORY_MEMBERS: Record<QuickStartCategory, readonly InteractionType[]> = {
  "Interviews": ["Interviews"],
  "Sales & Pitches": ["Sales & Pitches"],
  "Presentations": ["Presentations"],
  "Difficult Conversations": ["Difficult Conversations"],
  "Negotiation": ["Negotiation"],
  "Customer Service": ["Customer Service"],
  "Hospitality": ["Hospitality", "Front Desk"],
};

export interface QuickStartChipDef {
  label: string;
  filter: QuickStartCategory;
}

export const BASE_CATEGORY_CHIPS: readonly QuickStartChipDef[] = [
  { label: "Interviews", filter: "Interviews" },
  { label: "Sales & Pitches", filter: "Sales & Pitches" },
  { label: "Presentations", filter: "Presentations" },
  { label: "Difficult Talks", filter: "Difficult Conversations" },
  { label: "Negotiation", filter: "Negotiation" },
  { label: "Customer Service", filter: "Customer Service" },
  { label: "Hospitality", filter: "Hospitality" },
];

// Safe pseudo-random number generator (banned strings policy compliant)
export function defaultRng(): number {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  // Deterministic fallback for non-browser / headless contexts
  return 0.5;
}

/**
 * Pure picker function:
 * Picks a scenario from the matching category using a shuffle bag.
 * Never repeats until every scenario in the bag has been seen.
 * The first pick of a new bag is never the last pick of the previous round.
 */
export function pickScenario(
  scenarios: readonly PracticeScenario[],
  category: QuickStartCategory,
  seenIds: readonly string[] = [],
  rng: () => number = defaultRng
): { scenario: PracticeScenario; nextSeen: string[] } | null {
  const members = CATEGORY_MEMBERS[category];
  if (!members) return null;

  const pool = scenarios.filter((s) => members.includes(s.interactionType));
  if (pool.length === 0) return null;

  let fresh = pool.filter((s) => !seenIds.includes(s.id));
  let seen = [...seenIds];

  if (fresh.length === 0) {
    // Bag exhausted: start a new round, but never immediately repeat the one just shown
    const last = seenIds[seenIds.length - 1];
    fresh = pool.length > 1 ? pool.filter((s) => s.id !== last) : pool;
    seen = [];
  }

  const clampedRng = Math.max(0, Math.min(0.999999, rng()));
  const chosenIndex = Math.floor(clampedRng * fresh.length);
  const scenario = fresh[chosenIndex];

  return {
    scenario,
    nextSeen: [...seen, scenario.id],
  };
}
