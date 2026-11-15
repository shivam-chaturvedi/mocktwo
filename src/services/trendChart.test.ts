import test from "node:test";
import assert from "node:assert/strict";
import { computeTrendYDomain } from "./trendChart.ts";

test("computeTrendYDomain with flat data (all equal)", () => {
  const domain = computeTrendYDomain([80, 80]);
  assert.deepEqual(domain, [77, 83]);

  const domain3 = computeTrendYDomain([75, 75, 75]);
  assert.deepEqual(domain3, [72, 78]);
});

test("computeTrendYDomain with 2 different points", () => {
  const domain = computeTrendYDomain([76, 82]);
  assert.deepEqual(domain, [73, 85]);
});

test("computeTrendYDomain clamping near 0", () => {
  const domain = computeTrendYDomain([2, 5]);
  assert.deepEqual(domain, [0, 8]);

  const domainZero = computeTrendYDomain([0, 0]);
  assert.deepEqual(domainZero, [0, 3]);
});

test("computeTrendYDomain clamping near 100", () => {
  const domain = computeTrendYDomain([98, 99]);
  assert.deepEqual(domain, [95, 100]);

  const domainHundred = computeTrendYDomain([100, 100]);
  assert.deepEqual(domainHundred, [97, 100]);
});

test("computeTrendYDomain with typical 7-point session series", () => {
  const domain = computeTrendYDomain([72, 74, 71, 79, 78, 82, 86]);
  // min is 71 -> 68, max is 86 -> 89
  assert.deepEqual(domain, [68, 89]);
});

test("computeTrendYDomain handles empty array", () => {
  const domain = computeTrendYDomain([]);
  assert.deepEqual(domain, [0, 100]);
});
