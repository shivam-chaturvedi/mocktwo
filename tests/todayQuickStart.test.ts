import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { INTERACTION_TYPES, type PracticeScenario } from "../src/types/index.ts";
import {
  CATEGORY_MEMBERS,
  BASE_CATEGORY_CHIPS,
  type QuickStartCategory,
  pickScenario,
} from "../src/utils/quickStart.ts";
import scenarioEnums from "../electron/validators/scenarioEnums.cjs";

const { CATEGORIES: cjsCategories } = scenarioEnums;

// Load real scenarios seed file
const seedPath = path.resolve(process.cwd(), "electron/seed/scenarios.seed.json");
const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const seedScenarios: PracticeScenario[] = seedData.scenarios.map((s: any, idx: number) => ({
  id: `sc-seed-${idx}`,
  title: s.title,
  interactionType: s.interactionType,
  difficulty: s.difficulty,
  personaId: s.personaKey,
  personaName: "Seed Persona",
  contextSetting: "Seed Context",
  situationContext: s.context,
  learningObjectives: s.learningObjectives,
  keyChallenges: s.keyChallenges,
  openingLine: s.openingLine,
  source: "Library",
}));

test("Data Integrity: Every seed scenario interactionType is in INTERACTION_TYPES", () => {
  for (const sc of seedScenarios) {
    assert.ok(
      (INTERACTION_TYPES as readonly string[]).includes(sc.interactionType),
      `Seed scenario '${sc.title}' has invalid interactionType: '${sc.interactionType}'`
    );
  }
});

test("Data Integrity: INTERACTION_TYPES matches scenarioEnums.cjs exactly", () => {
  assert.strictEqual(
    INTERACTION_TYPES.length,
    cjsCategories.length,
    "Length mismatch between TS INTERACTION_TYPES and CJS CATEGORIES"
  );
  for (let i = 0; i < INTERACTION_TYPES.length; i++) {
    assert.strictEqual(
      INTERACTION_TYPES[i],
      cjsCategories[i],
      `Mismatch at index ${i}: ${INTERACTION_TYPES[i]} vs ${cjsCategories[i]}`
    );
  }
});

test("Data Integrity: Every Quick Start category chip has at least one seed scenario via CATEGORY_MEMBERS", () => {
  for (const item of BASE_CATEGORY_CHIPS) {
    const members = CATEGORY_MEMBERS[item.filter];
    assert.ok(members && members.length > 0, `Missing members for category '${item.filter}'`);
    const count = seedScenarios.filter((s) => members.includes(s.interactionType)).length;
    assert.ok(
      count > 0,
      `Category chip '${item.label}' (filter: '${item.filter}') has 0 matching scenarios in seed!`
    );
  }
});

test("pickScenario: Returns matching scenario for all 7 Quick Start categories", () => {
  for (const item of BASE_CATEGORY_CHIPS) {
    const result = pickScenario(seedScenarios, item.filter, []);
    assert.ok(result !== null, `Failed to pick scenario for '${item.filter}'`);
    const validMembers = CATEGORY_MEMBERS[item.filter];
    assert.ok(
      validMembers.includes(result.scenario.interactionType),
      `Picked scenario type '${result.scenario.interactionType}' not in '${item.filter}' members`
    );
    assert.strictEqual(result.nextSeen.length, 1);
  }
});

test("pickScenario: Hospitality includes Front Desk scenarios", () => {
  const frontDeskOnly: PracticeScenario[] = [
    {
      id: "fd-1",
      title: "Front Desk Dispute",
      interactionType: "Front Desk",
      difficulty: "Intermediate",
      personaId: "p1",
      personaName: "Marcus",
      contextSetting: "Front Desk",
      situationContext: "Context",
      learningObjectives: [],
      keyChallenges: [],
      source: "Library",
    },
  ];

  const result = pickScenario(frontDeskOnly, "Hospitality", []);
  assert.ok(result !== null);
  assert.strictEqual(result.scenario.id, "fd-1");
  assert.strictEqual(result.scenario.interactionType, "Front Desk");
});

test("pickScenario: Shuffle bag visits all N scenarios before any repeat", () => {
  const testPool: PracticeScenario[] = [
    { id: "s1", title: "Scenario 1", interactionType: "Interviews", difficulty: "Foundational", personaId: "p1", personaName: "P1", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
    { id: "s2", title: "Scenario 2", interactionType: "Interviews", difficulty: "Foundational", personaId: "p1", personaName: "P1", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
    { id: "s3", title: "Scenario 3", interactionType: "Interviews", difficulty: "Foundational", personaId: "p1", personaName: "P1", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
  ];

  let seen: string[] = [];
  const pickedIds: string[] = [];

  // Round 1: exactly 3 items
  for (let i = 0; i < 3; i++) {
    const res = pickScenario(testPool, "Interviews", seen, () => 0); // deterministic pick first fresh item
    assert.ok(res !== null);
    pickedIds.push(res.scenario.id);
    seen = res.nextSeen;
  }

  // All 3 must be unique
  const uniqueSet = new Set(pickedIds);
  assert.strictEqual(uniqueSet.size, 3);
  assert.strictEqual(seen.length, 3);

  // Round 2, pick 1: bag refreshes
  const resRound2 = pickScenario(testPool, "Interviews", seen, () => 0);
  assert.ok(resRound2 !== null);
  // Next seen should have 1 item (new round started)
  assert.strictEqual(resRound2.nextSeen.length, 1);
});

test("pickScenario: First pick of a new round is never the last pick of the previous round", () => {
  const testPool: PracticeScenario[] = [
    { id: "sA", title: "A", interactionType: "Negotiation", difficulty: "Foundational", personaId: "p1", personaName: "P1", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
    { id: "sB", title: "B", interactionType: "Negotiation", difficulty: "Foundational", personaId: "p1", personaName: "P1", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
  ];

  // Exhaust round with last pick = sB
  const seenAfterRound1 = ["sA", "sB"];

  // When next round starts, sB must not immediately repeat even if rng tries to pick it
  const res = pickScenario(testPool, "Negotiation", seenAfterRound1, () => 0);
  assert.ok(res !== null);
  assert.strictEqual(res.scenario.id, "sA", "Must pick sA because sB was the last pick of round 1");
});

test("pickScenario: Returns null on empty category", () => {
  const result = pickScenario([], "Interviews", []);
  assert.strictEqual(result, null);
});

test("pickScenario: Never returns out-of-category scenario", () => {
  const unrelated: PracticeScenario[] = [
    { id: "neg-1", title: "Victor Hale Negotiation", interactionType: "Negotiation", difficulty: "Advanced", personaId: "p1", personaName: "Victor", contextSetting: "C", situationContext: "C", learningObjectives: [], keyChallenges: [], source: "Library" },
  ];

  const result = pickScenario(unrelated, "Interviews", []);
  assert.strictEqual(result, null, "Must return null when requested category has no matches, never Victor Hale!");
});
