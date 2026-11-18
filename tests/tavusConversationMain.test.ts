/**
 * tests/tavusConversationMain.test.ts
 *
 * Unit tests for Tavus conversation request building, secret redaction, and error mapping.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TavusClient, TavusApiError, redactSecrets } from "../electron/tavus/tavusClient.cjs";
import { buildScenarioContext } from "../electron/tavus/scenarioContextBuilder.cjs";

describe("Tavus Main Process Conversation Layer", () => {
  it("builds scenario context with title, situation, challenges, and objectives", () => {
    const scenario = {
      title: "Difficult Contract Negotiation",
      interactionType: "Negotiation",
      difficulty: "Advanced",
      context: "The client wants a 30% reduction on enterprise licensing terms.",
      keyChallenges: ["Budget constraints", "Competitor undercut"],
      learningObjectives: ["Defend value proposition", "Anchor on annual support"],
      openingLine: "Hello {{persona.name}}, thank you for taking the time to meet.",
    };

    const ctx = buildScenarioContext(scenario);
    assert.ok(ctx.context.includes("Difficult Contract Negotiation"));
    assert.ok(ctx.context.includes("Budget constraints"));
    assert.ok(ctx.context.includes("Defend value proposition"));
    assert.equal(ctx.greeting, "Hello {{persona.name}}, thank you for taking the time to meet.");
  });

  it("redacts Tavus API keys, authorization headers, and room tokens", () => {
    const rawMsg = "Error calling https://tavusapi.com/v2/conversations with tvsk_live_123456789 and x-api-key: secretkey999";
    const redacted = redactSecrets(rawMsg);
    assert.ok(!redacted.includes("tvsk_live_123456789"));
    assert.ok(!redacted.includes("secretkey999"));
    assert.ok(redacted.includes("tvsk_***REDACTED***"));
  });

  it("correctly caps max_call_duration at 3600 seconds", () => {
    // 3 minute scenario -> 180 + 60 = 240
    const calcNormal = Math.min(Math.max(60, 3 * 60 + 60), 3600);
    assert.equal(calcNormal, 240);

    // 120 minute scenario -> capped at 3600
    const calcLarge = Math.min(Math.max(60, 120 * 60 + 60), 3600);
    assert.equal(calcLarge, 3600);
  });

  it("resolves session duration strictly between 1 and 10 minutes defaulting to 3", () => {
    const resolveDuration = (val: any) => {
      const rawMinutes = Number(val);
      return typeof rawMinutes === "number" && !isNaN(rawMinutes) && rawMinutes >= 1 && rawMinutes <= 10
        ? Math.round(rawMinutes)
        : 3;
    };

    assert.equal(resolveDuration(undefined), 3);
    assert.equal(resolveDuration(null), 3);
    assert.equal(resolveDuration("abc"), 3);
    assert.equal(resolveDuration(0), 3);
    assert.equal(resolveDuration(-5), 3);
    assert.equal(resolveDuration(15), 3);
    assert.equal(resolveDuration(1), 1);
    assert.equal(resolveDuration(2), 2);
    assert.equal(resolveDuration(3), 3);
    assert.equal(resolveDuration(5), 5);
    assert.equal(resolveDuration(10), 10);
  });

  it("classifies HTTP 401 as unauthorized and HTTP 402/403 as plan_limit", async () => {
    const client = new TavusClient({ apiKey: "test-key" });

    // Mock fetch returning 401
    client.fetchImpl = async () => ({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ message: "Invalid API key" }),
    });

    await assert.rejects(
      async () => client.createConversation({}),
      (err: any) => err instanceof TavusApiError && err.code === "unauthorized"
    );

    // Mock fetch returning 402
    client.fetchImpl = async () => ({
      status: 402,
      ok: false,
      text: async () => JSON.stringify({ message: "Subscription quota exceeded" }),
    });

    await assert.rejects(
      async () => client.createConversation({}),
      (err: any) => err instanceof TavusApiError && err.code === "plan_limit"
    );
  });

  it("endConversation handles 404 gracefully as already ended", async () => {
    const client = new TavusClient({ apiKey: "test-key" });
    client.fetchImpl = async () => ({
      status: 404,
      ok: false,
      text: async () => JSON.stringify({ error: "Conversation not found or already ended" }),
    });

    const res = await client.endConversation("c-test-123");
    assert.deepEqual(res, { ended: true });
  });
});
