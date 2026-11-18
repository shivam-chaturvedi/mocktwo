// scripts/tavus-smoke.mjs
// Standalone Tavus API smoke test

import { TavusClient } from "../electron/tavus/tavusClient.cjs";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

console.log("=== TAVUS SMOKE TEST ===");
console.log("TAVUS_API_KEY present:", Boolean(process.env.TAVUS_API_KEY));
if (process.env.TAVUS_API_KEY) {
  console.log("TAVUS_API_KEY prefix:", process.env.TAVUS_API_KEY.slice(0, 8) + "...");
}

const client = new TavusClient({ apiKey: process.env.TAVUS_API_KEY });

// Check SQLite for Victor Hale
const dbPath = path.join(os.homedir(), "Library/Application Support/mocktwo/mocktwo.db");
const db = new Database(dbPath, { readonly: true });
const victor = db.prepare("SELECT * FROM personas WHERE id = 'persona-seed-starter_victor_hale'").get();
console.log("Victor Hale in DB:", {
  id: victor?.id,
  name: victor?.name,
  tavus_pal_id: victor?.tavus_pal_id,
  tavus_face_id: victor?.tavus_face_id,
  tavus_voice_id: victor?.tavus_voice_id,
  sync_status: victor?.sync_status,
});

async function run() {
  // 1. Test listing PALs to verify auth and see existing PALs on Tavus account
  try {
    console.log("\n1. Testing GET /v2/pals...");
    const pals = await client.listPals({ limit: 10 });
    console.log("GET /v2/pals SUCCESS! Count:", pals?.data?.length || 0);
    if (pals?.data?.length > 0) {
      console.log("Sample PALs:", pals.data.map(p => ({ pal_id: p.pal_id, name: p.name, face_id: p.face_id })));
    }
  } catch (err) {
    console.error("GET /v2/pals FAILED:", err.status, err.code, err.message, err.details);
  }

  // 2. Test POST /v2/conversations
  // Let's test with face_id or pal_id
  try {
    console.log("\n2. Testing POST /v2/conversations...");
    const payload = {
      face_id: victor?.tavus_face_id || "r9d30b0e55ac",
      custom_greeting: "Hello, I am testing the conversation connection.",
      conversational_context: "This is a smoke test conversation.",
      properties: {
        max_call_duration: 120,
        participant_left_timeout: 30,
        participant_absent_timeout: 60,
      }
    };
    if (victor?.tavus_pal_id) {
      payload.pal_id = victor.tavus_pal_id;
    }
    console.log("Conversation Request Payload:", JSON.stringify(payload, null, 2));

    const conv = await client.request("POST", "/v2/conversations", payload, false);
    console.log("POST /v2/conversations SUCCESS!");
    console.log("Conversation ID:", conv?.conversation_id);
    console.log("Conversation URL:", conv?.conversation_url);
    console.log("Room URL:", conv?.room_url);
    console.log("Status:", conv?.status);

    if (conv?.conversation_id) {
      // 3. Test GET /v2/conversations/{id}
      console.log("\n3. Testing GET /v2/conversations/" + conv.conversation_id);
      const fetched = await client.request("GET", `/v2/conversations/${conv.conversation_id}`, null, true);
      console.log("GET conversation result status:", fetched?.status);

      // 4. Test POST /v2/conversations/{id}/end
      console.log("\n4. Testing POST /v2/conversations/" + conv.conversation_id + "/end");
      const endRes = await client.request("POST", `/v2/conversations/${conv.conversation_id}/end`, null, false);
      console.log("POST end result:", endRes);

      // 5. Verify ended status
      const ended = await client.request("GET", `/v2/conversations/${conv.conversation_id}`, null, true);
      console.log("Conversation final status:", ended?.status);
    }
  } catch (err) {
    console.error("Conversation test FAILED:", err.status, err.code, err.message, err.details);
  }
}

run().catch(console.error);
