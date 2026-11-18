/**
 * tests/cviSession.test.ts
 *
 * Unit tests for CviSession (Tavus Interactions Protocol & Daily CallObject lifecycle).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CviSession, type CviUtterance, type CviSpeakingEvent } from "../src/services/tavus/cviSession.ts";

describe("CviSession - Tavus CVI Interactions Protocol & Deduplication", () => {
  it("parses valid user and pal utterances cleanly", () => {
    const receivedUtterances: CviUtterance[] = [];
    const session = new CviSession({
      onUtterance: (u) => receivedUtterances.push(u),
    });

    // 1. User utterance
    session.handleAppMessage({
      message_type: "conversation",
      event_type: "conversation.utterance",
      seq: 1,
      inference_id: "inf-user-1",
      properties: {
        role: "user",
        speech: "Hello, good morning.",
      },
    });

    // 2. PAL utterance
    session.handleAppMessage({
      message_type: "conversation",
      event_type: "conversation.utterance",
      seq: 2,
      inference_id: "inf-pal-1",
      properties: {
        role: "pal",
        speech: "Good morning! How can I assist you with your reservation?",
      },
    });

    assert.equal(receivedUtterances.length, 2);
    assert.equal(receivedUtterances[0].role, "user");
    assert.equal(receivedUtterances[0].text, "Hello, good morning.");
    assert.equal(receivedUtterances[1].role, "persona");
    assert.equal(receivedUtterances[1].text, "Good morning! How can I assist you with your reservation?");
  });

  it("deduplicates identical inference_id events", () => {
    const receivedUtterances: CviUtterance[] = [];
    const session = new CviSession({
      onUtterance: (u) => receivedUtterances.push(u),
    });

    const msg = {
      message_type: "conversation",
      event_type: "conversation.utterance",
      seq: 10,
      inference_id: "inf-dup-123",
      properties: {
        role: "user",
        speech: "Test repeated utterance.",
      },
    };

    session.handleAppMessage(msg);
    session.handleAppMessage(msg); // exact duplicate
    session.handleAppMessage(msg); // triplicate

    assert.equal(receivedUtterances.length, 1);
    assert.equal(receivedUtterances[0].text, "Test repeated utterance.");
  });

  it("suppresses duplicate legacy 'replica' messages when 'pal' is delivered", () => {
    const receivedUtterances: CviUtterance[] = [];
    const session = new CviSession({
      onUtterance: (u) => receivedUtterances.push(u),
    });

    // Tavus sends duplicate app-message with 'pal' and 'replica' for the same turn
    const palMsg = {
      message_type: "conversation",
      event_type: "conversation.utterance",
      seq: 50,
      inference_id: "inf-turn-50",
      properties: {
        role: "pal",
        speech: "I understand the situation and will look into it.",
      },
    };

    const replicaMsg = {
      message_type: "conversation",
      event_type: "conversation.utterance",
      seq: 50,
      inference_id: "inf-turn-50",
      properties: {
        role: "replica",
        speech: "I understand the situation and will look into it.",
      },
    };

    session.handleAppMessage(palMsg);
    session.handleAppMessage(replicaMsg);

    assert.equal(receivedUtterances.length, 1);
    assert.equal(receivedUtterances[0].role, "persona");
    assert.equal(receivedUtterances[0].text, "I understand the situation and will look into it.");
  });

  it("handles started_speaking and stopped_speaking turn events", () => {
    const speakingEvents: CviSpeakingEvent[] = [];
    const session = new CviSession({
      onSpeaking: (e) => speakingEvents.push(e),
    });

    session.handleAppMessage({
      event_type: "conversation.started_speaking",
      properties: { role: "pal" },
    });

    session.handleAppMessage({
      event_type: "conversation.stopped_speaking",
      properties: { role: "pal", duration: 3.5, interrupted: false },
    });

    session.handleAppMessage({
      event_type: "conversation.started_speaking",
      properties: { role: "user" },
    });

    assert.equal(speakingEvents.length, 3);
    assert.deepEqual(speakingEvents[0], { role: "persona", speaking: true });
    assert.deepEqual(speakingEvents[1], { role: "persona", speaking: false, duration: 3.5, interrupted: false });
    assert.deepEqual(speakingEvents[2], { role: "user", speaking: true });
  });

  it("handles streaming utterance partial chunks", () => {
    const chunks: string[] = [];
    const session = new CviSession({
      onUtteranceStreaming: (s) => chunks.push(s.text),
    });

    session.handleAppMessage({
      event_type: "conversation.utterance.streaming",
      properties: { role: "pal", text: "I can help" },
    });
    session.handleAppMessage({
      event_type: "conversation.utterance.streaming",
      properties: { role: "pal", text: "I can help you with that right away." },
    });

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0], "I can help");
    assert.equal(chunks[1], "I can help you with that right away.");
  });

  it("destroy is idempotent and safe against multiple calls (StrictMode safety)", async () => {
    const session = new CviSession();
    await session.destroy();
    await session.destroy(); // should not throw
    assert.doesNotThrow(async () => {
      await session.destroy();
    });
  });

  it("safely handles setLocalVideo and setLocalAudio when uninitialized or destroyed", () => {
    const session = new CviSession();
    assert.doesNotThrow(() => {
      session.setLocalVideo(false);
      session.setLocalVideo(true);
      session.setLocalAudio(false);
      session.setLocalAudio(true);
    });
  });
});
