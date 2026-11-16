/**
 * seedWorker.cjs
 *
 * Dedicated worker thread for executing heavy seed operations off the main thread:
 * - JSON loading and Zod schema validation
 * - Face filtering, candidate pool selection, and PRNG deterministic assignment
 * - Face validation diffing
 */

const { parentPort } = require("worker_threads");
const {
  SeedPersonasFileSchema,
  SeedScenariosFileSchema,
  validateSeedCrossReferences,
  validateSeedFiles,
} = require("./seedSchemas.cjs");

// Deterministic Mulberry32 PRNG for reproducible face assignment
function createPrng(seedStr = "mocktwo-seed-prng") {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  let a = (h ^ (h >>> 16)) >>> 0;

  return function nextRandom() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithPrng(array, prng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hasGenderTag(face, targetGender) {
  if (!face || !Array.isArray(face.tags) || !targetGender) return false;
  const target = targetGender.toLowerCase();
  return face.tags.some((t) => {
    const id = (t?.tag_id || t?.tag_name || "").toLowerCase();
    return id === target;
  });
}

function handleValidateSeedFiles(payload) {
  const { personasContent, scenariosContent } = payload || {};
  return validateSeedFiles(personasContent, scenariosContent);
}

function handleFilterAndAssignFaces(payload) {
  const { unboundPersonas, rawFaces, existingAssignedFaceIds = [], seedKey = "install-seed" } = payload || {};
  if (!Array.isArray(unboundPersonas) || !Array.isArray(rawFaces)) {
    return { bindings: [], unassigned: [] };
  }

  const prng = createPrng(seedKey);

  // 1. Filter usable faces: status completed and has a non-empty default_voice_id
  const usableFaces = rawFaces.filter((f) => {
    const isCompleted = !f.status || f.status === "completed";
    const hasVoice = Boolean(f.default_voice_id && String(f.default_voice_id).trim().length > 0);
    return isCompleted && hasVoice && f.face_id;
  });

  const usedFaceIds = new Set(existingAssignedFaceIds.map(String));
  const bindings = [];
  const unassigned = [];

  // Track remaining usable pool
  let availablePool = usableFaces.filter((f) => !usedFaceIds.has(String(f.face_id)));
  availablePool = shuffleWithPrng(availablePool, prng);

  for (const persona of unboundPersonas) {
    const preferredNames = (persona.face?.preferredNames || []).map((n) => n.trim().toLowerCase());
    const preferredGender = persona.face?.gender;

    let chosenIndex = -1;

    // Rule 1: Match preferred name case-insensitively
    if (preferredNames.length > 0) {
      chosenIndex = availablePool.findIndex((f) => {
        const fname = (f.face_name || "").trim().toLowerCase();
        return preferredNames.includes(fname);
      });
    }

    // Rule 2: Match gender hint if provided
    if (chosenIndex === -1 && preferredGender && preferredGender !== "any") {
      chosenIndex = availablePool.findIndex((f) => hasGenderTag(f, preferredGender));
    }

    // Rule 3: Pick next available face from the randomized pool
    if (chosenIndex === -1 && availablePool.length > 0) {
      chosenIndex = 0;
    }

    if (chosenIndex !== -1) {
      const chosen = availablePool.splice(chosenIndex, 1)[0];
      usedFaceIds.add(String(chosen.face_id));
      bindings.push({
        builtinKey: persona.builtinKey,
        tavusFaceId: chosen.face_id,
        tavusVoiceId: chosen.default_voice_id,
        faceName: chosen.face_name || persona.name,
        avatarUrl: chosen.thumbnail_image_url || null,
        thumbnailVideoUrl: chosen.thumbnail_video_url || null,
      });
    } else {
      unassigned.push(persona.builtinKey);
    }
  }

  return {
    bindings,
    unassigned,
    usablePoolCount: usableFaces.length,
    remainingPoolCount: availablePool.length,
  };
}

parentPort.on("message", (msg) => {
  const { taskId, type, payload } = msg || {};

  try {
    let result = null;
    switch (type) {
      case "validateSeedFiles":
        result = handleValidateSeedFiles(payload);
        break;
      case "filterAndAssignFaces":
        result = handleFilterAndAssignFaces(payload);
        break;
      default:
        throw new Error(`Unknown task type in seedWorker: ${type}`);
    }

    parentPort.postMessage({ taskId, success: true, result });
  } catch (err) {
    parentPort.postMessage({
      taskId,
      success: false,
      error: err.message || "seedWorker task failed",
    });
  }
});
