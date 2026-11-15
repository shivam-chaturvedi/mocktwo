/**
 * syncService.cjs
 *
 * Coordinates saving and syncing Personas with Tavus PALs.
 * Enforces per-persona mutexes, payload hashing, JSON Patch diffing on updates,
 * interrupted sync recovery, and explicit error handling.
 */

const crypto = require("crypto");
const { buildSystemPrompt } = require("./promptBuilder.cjs");
const { TavusClient, TavusApiError } = require("./tavusClient.cjs");

class SyncService {
  constructor(storageManager, options = {}) {
    this.storage = storageManager;
    this.tavusClient = options.tavusClient || new TavusClient();
    this.activeSyncs = new Map(); // personaId -> Promise
  }

  computeHash(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  /**
   * Builds the PAL payload to send to Tavus.
   */
  buildPalPayload(persona, promptResult) {
    const languageCode = (persona.language || "en").toLowerCase().slice(0, 5);
    const languages = [languageCode];

    const payload = {
      pal_name: persona.name,
      system_prompt: promptResult.prompt,
      pipeline_mode: "full",
      default_face_id: persona.tavusFaceId,
      languages,
      layers: {
        perception: {
          perception_model: "off",
        },
        conversational_flow: {
          turn_detection_model: "sparrow-2",
          turn_taking_patience: promptResult.flowConfig.turnTakingPatience,
          pal_interruptibility: promptResult.flowConfig.palInterruptibility,
        },
      },
    };

    if (persona.greeting && persona.greeting.trim().length > 0) {
      payload.greeting = persona.greeting.trim();
    }

    if (persona.tavusVoiceId && persona.tavusVoiceId.trim().length > 0) {
      payload.layers.tts = {
        voice_id: persona.tavusVoiceId.trim(),
      };
    }

    return payload;
  }

  /**
   * Generates RFC 6902 JSON Patch operations for changed fields.
   */
  diffPalPayload(oldPayload, newPayload) {
    const ops = [];

    if (oldPayload.pal_name !== newPayload.pal_name) {
      ops.push({ op: "replace", path: "/pal_name", value: newPayload.pal_name });
    }
    if (oldPayload.system_prompt !== newPayload.system_prompt) {
      ops.push({ op: "replace", path: "/system_prompt", value: newPayload.system_prompt });
    }
    if (oldPayload.default_face_id !== newPayload.default_face_id) {
      ops.push({ op: "replace", path: "/default_face_id", value: newPayload.default_face_id });
    }
    if (oldPayload.greeting !== newPayload.greeting) {
      if (newPayload.greeting) {
        ops.push({ op: "add", path: "/greeting", value: newPayload.greeting });
      } else {
        ops.push({ op: "remove", path: "/greeting" });
      }
    }
    if (JSON.stringify(oldPayload.languages) !== JSON.stringify(newPayload.languages)) {
      ops.push({ op: "replace", path: "/languages", value: newPayload.languages });
    }

    const oldFlow = (oldPayload.layers && oldPayload.layers.conversational_flow) || {};
    const newFlow = (newPayload.layers && newPayload.layers.conversational_flow) || {};
    if (oldFlow.turn_taking_patience !== newFlow.turn_taking_patience) {
      ops.push({
        op: "replace",
        path: "/layers/conversational_flow/turn_taking_patience",
        value: newFlow.turn_taking_patience,
      });
    }
    if (oldFlow.pal_interruptibility !== newFlow.pal_interruptibility) {
      ops.push({
        op: "replace",
        path: "/layers/conversational_flow/pal_interruptibility",
        value: newFlow.pal_interruptibility,
      });
    }

    const oldVoice = oldPayload.layers && oldPayload.layers.tts && oldPayload.layers.tts.voice_id;
    const newVoice = newPayload.layers && newPayload.layers.tts && newPayload.layers.tts.voice_id;
    if (oldVoice !== newVoice) {
      if (newVoice) {
        ops.push({ op: "add", path: "/layers/tts/voice_id", value: newVoice });
      } else {
        ops.push({ op: "remove", path: "/layers/tts/voice_id" });
      }
    }

    return ops;
  }

  /**
   * Synchronizes a persona with Tavus.
   * Enforces per-persona mutex to prevent race conditions or duplicate creations.
   */
  async syncPersona(personaId) {
    if (this.activeSyncs.has(personaId)) {
      return this.activeSyncs.get(personaId);
    }

    const syncPromise = this._doSync(personaId).finally(() => {
      this.activeSyncs.delete(personaId);
    });

    this.activeSyncs.set(personaId, syncPromise);
    return syncPromise;
  }

  async _doSync(personaId) {
    const persona = await this.storage.execute("personas:get", personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    // 1. Check Tavus API key
    const hasKey = Boolean(process.env.TAVUS_API_KEY && process.env.TAVUS_API_KEY.trim().length > 0);
    if (!hasKey) {
      await this.storage.execute("personas:update-sync", {
        id: personaId,
        syncStatus: "draft",
        syncErrorCode: "no_api_key",
        syncError: "Tavus API key is not configured in .env",
      });
      return await this.storage.execute("personas:get", personaId);
    }

    // 2. Check face selection
    if (!persona.tavusFaceId || !persona.tavusFaceId.trim()) {
      await this.storage.execute("personas:update-sync", {
        id: personaId,
        syncStatus: "draft",
        syncErrorCode: "no_face",
        syncError: "No avatar face selected for Tavus PAL synchronization",
      });
      return await this.storage.execute("personas:get", personaId);
    }

    // 3. Compile prompt
    const promptResult = buildSystemPrompt(persona);
    if (promptResult.error) {
      await this.storage.execute("personas:update-sync", {
        id: personaId,
        syncStatus: "failed",
        syncErrorCode: "prompt_too_long",
        syncError: promptResult.error,
        compiledSystemPrompt: promptResult.prompt,
      });
      return await this.storage.execute("personas:get", personaId);
    }

    // 4. Build payload and compute hash
    const palPayload = this.buildPalPayload(persona, promptResult);
    const newHash = this.computeHash(palPayload);

    // If already synced with same hash and has pal_id, no-op
    if (persona.syncStatus === "synced" && persona.syncHash === newHash && persona.tavusPalId) {
      return persona;
    }

    // 5. Transition to syncing
    const attemptAt = new Date().toISOString();
    await this.storage.execute("personas:update-sync", {
      id: personaId,
      syncStatus: "syncing",
      syncAttemptAt: attemptAt,
      compiledSystemPrompt: promptResult.prompt,
    });

    try {
      if (!persona.tavusPalId) {
        // Handle interrupted recovery if previous status was interrupted
        let adoptedPalId = null;
        if (persona.syncErrorCode === "interrupted" && persona.syncAttemptAt) {
          try {
            const palList = await this.tavusClient.listPals();
            if (palList && Array.isArray(palList.data)) {
              const match = palList.data.find(
                (p) => p.pal_name === persona.name && p.created_at && p.created_at >= persona.syncAttemptAt
              );
              if (match) {
                adoptedPalId = match.pal_id;
              }
            }
          } catch {
            // list fallback fails, proceed to normal create
          }
        }

        let palId = adoptedPalId;
        if (!palId) {
          const createRes = await this.tavusClient.createPal(palPayload);
          palId = createRes && (createRes.pal_id || createRes.id);
        }

        if (!palId) {
          throw new TavusApiError("server", "Tavus did not return a valid pal_id");
        }

        const now = new Date().toISOString();
        await this.storage.execute("personas:update-sync", {
          id: personaId,
          syncStatus: "synced",
          syncErrorCode: null,
          syncError: null,
          syncHash: newHash,
          lastSyncedAt: now,
          tavusPalId: palId,
          compiledSystemPrompt: promptResult.prompt,
        });
      } else {
        // Existing PAL: update via JSON Patch
        let oldPayload = {};
        if (persona.palSettings && persona.palSettings._lastPayload) {
          oldPayload = persona.palSettings._lastPayload;
        }

        const patchOps = this.diffPalPayload(oldPayload, palPayload);

        if (patchOps.length > 0) {
          await this.tavusClient.patchPal(persona.tavusPalId, patchOps, { force: true });
        }

        const now = new Date().toISOString();
        await this.storage.execute("personas:update-sync", {
          id: personaId,
          syncStatus: "synced",
          syncErrorCode: null,
          syncError: null,
          syncHash: newHash,
          lastSyncedAt: now,
          compiledSystemPrompt: promptResult.prompt,
        });
      }

      return await this.storage.execute("personas:get", personaId);
    } catch (err) {
      let code = "server";
      let message = err.message || "Failed to sync with Tavus";

      if (err instanceof TavusApiError) {
        code = err.code;
        if (err.status === 404) {
          code = "pal_missing";
          message = "PAL not found on Tavus. You can recreate it.";
        }
      }

      await this.storage.execute("personas:update-sync", {
        id: personaId,
        syncStatus: "failed",
        syncErrorCode: code,
        syncError: message,
      });

      return await this.storage.execute("personas:get", personaId);
    }
  }

  /**
   * Deletes a persona, optionally deleting the remote Tavus PAL.
   */
  async deletePersona(personaId, options = {}) {
    const persona = await this.storage.execute("personas:get", personaId);
    if (!persona) return false;

    if (options.deleteTavusPal && persona.tavusPalId) {
      try {
        await this.tavusClient.deletePal(persona.tavusPalId);
      } catch (err) {
        console.warn(`[SyncService] Failed to delete remote PAL ${persona.tavusPalId}:`, err.message);
      }
    }

    return await this.storage.execute("personas:delete", personaId);
  }
}

module.exports = {
  SyncService,
};
