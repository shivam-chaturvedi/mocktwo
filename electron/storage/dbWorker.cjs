const { parentPort, workerData } = require("worker_threads");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dbPath = workerData.dbPath;
const recordingsDir = path.join(path.dirname(dbPath), "recordings");

let db;

function initDatabase() {
  let isCorrupted = false;
  try {
    if (fs.existsSync(dbPath)) {
      const testDb = new Database(dbPath);
      const row = testDb.pragma("integrity_check", { simple: true });
      testDb.close();
      if (row !== "ok") {
        isCorrupted = true;
      }
    }
  } catch {
    isCorrupted = true;
  }

  if (isCorrupted) {
    const backupPath = `${dbPath}.corrupt.${Date.now()}`;
    try {
      if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, backupPath);
      }
    } catch {
      // ignore
    }
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  runMigrations();

  // Startup recovery: any persona left in 'syncing' becomes 'failed' with code 'interrupted'
  try {
    db.prepare(`
      UPDATE personas
      SET sync_status = 'failed',
          sync_error_code = 'interrupted',
          sync_error = 'Sync was interrupted by application shutdown'
      WHERE sync_status = 'syncing'
    `).run();
  } catch (err) {
    console.error("Failed to run startup sync recovery:", err);
  }
}

function makeSummary(context, maxLen = 140) {
  if (!context || typeof context !== "string") return "";
  const cleaned = context.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "...";
}

function rowToScenario(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    personaId: r.persona_id || undefined,
    personaName: r.persona_name,
    contextSetting: r.context_setting,
    seniority: r.seniority,
    interactionType: r.interaction_type,
    difficulty: r.difficulty,
    durationMinutes: r.duration_minutes !== undefined ? r.duration_minutes : 3,
    summary: r.summary,
    context: r.context,
    personaMood: r.persona_mood || undefined,
    learningObjectives: JSON.parse(r.learning_objectives || "[]"),
    keyChallenges: JSON.parse(r.key_challenges || "[]"),
    recommendedPhrases: JSON.parse(r.recommended_phrases || "[]"),
    personaAvatarUrl: r.persona_avatar_url || undefined,
    personaSummary: r.persona_summary || undefined,
    openingLine: r.opening_line || undefined,
    builtinKey: r.builtin_key || undefined,
    seedVersion: r.seed_version || undefined,
    userModified: Boolean(r.user_modified),
    hidden: Boolean(r.hidden),
    source: r.source,
    submissionStatus: r.submission_status || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToPersona(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    avatarUrl: r.avatar_url || undefined,
    monogram: r.monogram,
    title: r.title,
    contextSetting: r.context_setting,
    seniority: r.seniority,
    language: r.language,
    temperamentTraits: JSON.parse(r.temperament_traits || "[]"),
    voice: r.voice,
    backstory: r.backstory,
    communicationNotes: r.communication_notes,
    scenariosCount: Number(r.scenarios_count || 0),
    pressureLevel: r.pressure_level || "Moderate",
    source: r.source,
    tavusPalId: r.tavus_pal_id || undefined,
    tavusFaceId: r.tavus_face_id || undefined,
    tavusVoiceId: r.tavus_voice_id || undefined,
    faceName: r.face_name || undefined,
    faceImagePath: r.face_image_path || undefined,
    greeting: r.greeting || "",
    compiledSystemPrompt: r.compiled_system_prompt || "",
    palSettings: r.pal_settings ? JSON.parse(r.pal_settings) : null,
    syncStatus: r.sync_status || "draft",
    syncErrorCode: r.sync_error_code || undefined,
    syncError: r.sync_error || undefined,
    syncHash: r.sync_hash || undefined,
    syncAttemptAt: r.sync_attempt_at || undefined,
    lastSyncedAt: r.last_synced_at || undefined,
    builtinKey: r.builtin_key || undefined,
    seedVersion: r.seed_version || undefined,
    userModified: Boolean(r.user_modified),
    hidden: Boolean(r.hidden),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersionRow = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
  let currentVersion = currentVersionRow && currentVersionRow.version ? currentVersionRow.version : 0;

  if (currentVersion < 1) {
    const migrateV1 = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          role TEXT,
          team TEXT,
          workspace TEXT,
          property TEXT,
          avatar_url TEXT,
          streak_days INTEGER NOT NULL DEFAULT 0,
          completed_sessions_count INTEGER NOT NULL DEFAULT 0,
          average_composure REAL NOT NULL DEFAULT 0,
          average_rating REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS permissions (
          resource TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          explainer_shown INTEGER NOT NULL DEFAULT 0,
          declined_at TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS baselines (
          id TEXT PRIMARY KEY,
          resting_pulse REAL NOT NULL,
          resting_hrv_rmssd REAL,
          resting_baevsky REAL,
          resting_breathing_rate REAL,
          resting_eda_arousal REAL,
          resting_expressions TEXT,
          measured_at TEXT NOT NULL,
          is_calibrated INTEGER NOT NULL DEFAULT 1,
          duration_seconds INTEGER,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS personas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar_url TEXT,
          monogram TEXT NOT NULL,
          title TEXT NOT NULL,
          context_setting TEXT NOT NULL,
          seniority TEXT NOT NULL,
          language TEXT NOT NULL,
          temperament_traits TEXT NOT NULL,
          voice TEXT NOT NULL,
          backstory TEXT NOT NULL,
          communication_notes TEXT NOT NULL,
          scenarios_count INTEGER NOT NULL DEFAULT 0,
          pressure_level TEXT,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scenarios (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
          persona_name TEXT NOT NULL,
          context_setting TEXT NOT NULL,
          seniority TEXT NOT NULL,
          interaction_type TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL,
          summary TEXT NOT NULL,
          context TEXT NOT NULL,
          persona_mood TEXT,
          learning_objectives TEXT NOT NULL,
          key_challenges TEXT NOT NULL,
          recommended_phrases TEXT NOT NULL,
          persona_avatar_url TEXT,
          persona_summary TEXT,
          source TEXT NOT NULL,
          submission_status TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY,
          scenario_id TEXT REFERENCES scenarios(id) ON DELETE SET NULL,
          scenario_title TEXT NOT NULL,
          persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
          persona_name TEXT NOT NULL,
          persona_avatar_url TEXT,
          date TEXT NOT NULL,
          relative_date TEXT NOT NULL,
          date_group TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          duration_minutes REAL,
          composure_score REAL,
          score REAL,
          composure_tier TEXT,
          nervousness_level TEXT,
          readiness_status TEXT,
          status TEXT NOT NULL,
          audio_path TEXT,
          waveform_path TEXT,
          transcript TEXT NOT NULL,
          session_biometrics TEXT,
          pressure_coaching TEXT,
          user_notes TEXT NOT NULL,
          self_reflection_notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vitals_samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
          timestamp_offset_ms INTEGER NOT NULL,
          pulse_bpm REAL,
          confidence INTEGER,
          is_clean INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS recording_notes (
          id TEXT PRIMARY KEY,
          recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
          timestamp_seconds REAL NOT NULL,
          note_text TEXT NOT NULL,
          author TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_recordings_date ON recordings(date DESC);
        CREATE INDEX IF NOT EXISTS idx_recordings_scenario ON recordings(scenario_id);
        CREATE INDEX IF NOT EXISTS idx_vitals_recording ON vitals_samples(recording_id, timestamp_offset_ms);
        CREATE INDEX IF NOT EXISTS idx_notes_recording ON recording_notes(recording_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_persona ON scenarios(persona_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(interaction_type);
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        1,
        new Date().toISOString()
      );
    });

    migrateV1();
    currentVersion = 1;
  }

  if (currentVersion < 2) {
    try {
      if (fs.existsSync(dbPath)) {
        const backupPath = `${dbPath}.v1.bak.${Date.now()}`;
        fs.copyFileSync(dbPath, backupPath);
      }
    } catch (err) {
      console.error("Failed to backup db before v2 migration:", err);
    }

    const migrateV2 = db.transaction(() => {
      db.exec(`
        ALTER TABLE personas ADD COLUMN tavus_pal_id TEXT;
        ALTER TABLE personas ADD COLUMN tavus_face_id TEXT;
        ALTER TABLE personas ADD COLUMN tavus_voice_id TEXT;
        ALTER TABLE personas ADD COLUMN face_name TEXT;
        ALTER TABLE personas ADD COLUMN face_image_path TEXT;
        ALTER TABLE personas ADD COLUMN greeting TEXT;
        ALTER TABLE personas ADD COLUMN compiled_system_prompt TEXT;
        ALTER TABLE personas ADD COLUMN pal_settings TEXT;
        ALTER TABLE personas ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'draft';
        ALTER TABLE personas ADD COLUMN sync_error_code TEXT;
        ALTER TABLE personas ADD COLUMN sync_error TEXT;
        ALTER TABLE personas ADD COLUMN sync_hash TEXT;
        ALTER TABLE personas ADD COLUMN sync_attempt_at TEXT;
        ALTER TABLE personas ADD COLUMN last_synced_at TEXT;
        ALTER TABLE personas ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

        CREATE INDEX IF NOT EXISTS idx_personas_pal_id ON personas(tavus_pal_id);
        CREATE INDEX IF NOT EXISTS idx_personas_sync_status ON personas(sync_status);

        CREATE TABLE IF NOT EXISTS tavus_catalog_cache (
          kind TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          fetched_at TEXT NOT NULL
        );
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        2,
        new Date().toISOString()
      );
    });

    migrateV2();
    currentVersion = 2;
  }

  if (currentVersion < 3) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v2-${Date.now()}.db`);
      db.backup(backupPath);

      const existingBackups = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith("mocktwo-v2-") && f.endsWith(".db"))
        .sort()
        .map((f) => path.join(backupDir, f));
      while (existingBackups.length > 3) {
        const oldest = existingBackups.shift();
        try { fs.unlinkSync(oldest); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to backup db before v3 migration:", err);
    }

    const migrateV3 = db.transaction(() => {
      const hasScenarios = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scenarios'").get();
      if (!hasScenarios) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
            persona_name TEXT NOT NULL,
            context_setting TEXT NOT NULL,
            seniority TEXT NOT NULL,
            interaction_type TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            summary TEXT NOT NULL,
            context TEXT NOT NULL,
            persona_mood TEXT,
            learning_objectives TEXT NOT NULL,
            key_challenges TEXT NOT NULL,
            recommended_phrases TEXT NOT NULL,
            persona_avatar_url TEXT,
            persona_summary TEXT,
            opening_line TEXT,
            builtin_key TEXT,
            hidden INTEGER NOT NULL DEFAULT 0,
            source TEXT NOT NULL,
            submission_status TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
      } else {
        const scenarioCols = db.prepare("PRAGMA table_info(scenarios)").all().map((c) => c.name);
        if (!scenarioCols.includes("opening_line")) {
          db.exec("ALTER TABLE scenarios ADD COLUMN opening_line TEXT;");
        }
        if (!scenarioCols.includes("builtin_key")) {
          db.exec("ALTER TABLE scenarios ADD COLUMN builtin_key TEXT;");
        }
        if (!scenarioCols.includes("hidden")) {
          db.exec("ALTER TABLE scenarios ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;");
        }
      }

      db.exec(`
        DROP INDEX IF EXISTS idx_scenarios_builtin_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_scenarios_builtin_key ON scenarios(builtin_key);
        CREATE INDEX IF NOT EXISTS idx_scenarios_hidden ON scenarios(hidden);
        CREATE INDEX IF NOT EXISTS idx_scenarios_hidden_created ON scenarios(hidden, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_personas_hidden_name ON personas(hidden, name ASC);

        CREATE TRIGGER IF NOT EXISTS trg_personas_restrict_delete BEFORE DELETE ON personas
        WHEN EXISTS (SELECT 1 FROM scenarios WHERE persona_id = OLD.id AND hidden = 0)
        BEGIN SELECT RAISE(ABORT, 'RESTRICT_PERSONA_HAS_SCENARIOS'); END;
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        3,
        new Date().toISOString()
      );
    });

    migrateV3();
    currentVersion = 3;
  }

  if (currentVersion < 4) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v3-${Date.now()}.db`);
      db.backup(backupPath);

      const existingBackups = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith("mocktwo-v3-") && f.endsWith(".db"))
        .sort()
        .map((f) => path.join(backupDir, f));
      while (existingBackups.length > 3) {
        const oldest = existingBackups.shift();
        try { fs.unlinkSync(oldest); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to backup db before v4 migration:", err);
    }

    const migrateV4 = db.transaction(() => {
      // 1. Create seed_state table
      db.exec(`
        CREATE TABLE IF NOT EXISTS seed_state (
          key TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          seed_version INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. Alter personas table
      const personaCols = db.prepare("PRAGMA table_info(personas)").all().map((c) => c.name);
      if (!personaCols.includes("builtin_key")) {
        db.exec("ALTER TABLE personas ADD COLUMN builtin_key TEXT;");
      }
      if (!personaCols.includes("seed_version")) {
        db.exec("ALTER TABLE personas ADD COLUMN seed_version INTEGER;");
      }
      if (!personaCols.includes("user_modified")) {
        db.exec("ALTER TABLE personas ADD COLUMN user_modified INTEGER NOT NULL DEFAULT 0;");
      }

      // 3. Alter scenarios table
      const scenarioCols = db.prepare("PRAGMA table_info(scenarios)").all().map((c) => c.name);
      if (!scenarioCols.includes("seed_version")) {
        db.exec("ALTER TABLE scenarios ADD COLUMN seed_version INTEGER;");
      }
      if (!scenarioCols.includes("user_modified")) {
        db.exec("ALTER TABLE scenarios ADD COLUMN user_modified INTEGER NOT NULL DEFAULT 0;");
      }

      // 4. Create compound indexes
      db.exec(`
        DROP INDEX IF EXISTS idx_personas_builtin_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_builtin_key ON personas(builtin_key);
        CREATE INDEX IF NOT EXISTS idx_personas_face_id ON personas(tavus_face_id);
        CREATE INDEX IF NOT EXISTS idx_personas_hidden ON personas(hidden);
        CREATE INDEX IF NOT EXISTS idx_personas_user_modified ON personas(user_modified);
        CREATE INDEX IF NOT EXISTS idx_scenarios_user_modified ON scenarios(user_modified);
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        4,
        new Date().toISOString()
      );
    });

    migrateV4();
    currentVersion = 4;
  }

  // Ensure non-partial unique indexes exist on builtin_key for ON CONFLICT target compatibility
  try {
    const scenarioIdx = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_scenarios_builtin_key'").get();
    if (!scenarioIdx || (scenarioIdx.sql && scenarioIdx.sql.includes("WHERE"))) {
      db.exec(`
        DROP INDEX IF EXISTS idx_scenarios_builtin_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_scenarios_builtin_key ON scenarios(builtin_key);
      `);
    }
    const personaIdx = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_personas_builtin_key'").get();
    if (!personaIdx || (personaIdx.sql && personaIdx.sql.includes("WHERE"))) {
      db.exec(`
        DROP INDEX IF EXISTS idx_personas_builtin_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_builtin_key ON personas(builtin_key);
      `);
    }
  } catch (err) {
    console.warn("[dbWorker] Error reconciling builtin_key unique indexes:", err.message);
  }
}

// -----------------------------------------------------------------------------
// Message Dispatcher
// -----------------------------------------------------------------------------
initDatabase();

parentPort.on("message", ({ id, type, payload }) => {
  try {
    let result = null;

    switch (type) {
      // Profiles
      case "profile:get": {
        result = db.prepare("SELECT * FROM profiles LIMIT 1").get() || null;
        if (result) {
          result = {
            id: result.id,
            name: result.name,
            email: result.email || "",
            role: result.role || "",
            team: result.team || "",
            workspace: result.workspace || "",
            property: result.property || "",
            userId: result.id,
            avatarUrl: result.avatar_url || "",
            streakDays: result.streak_days,
            completedSessionsCount: result.completed_sessions_count,
            averageComposure: result.average_composure,
            averageRating: result.average_rating,
          };
        }
        break;
      }

      case "profile:save": {
        const p = payload;
        const now = new Date().toISOString();
        const existing = db.prepare("SELECT id FROM profiles LIMIT 1").get();
        const profileId = p.id || p.userId || (existing ? existing.id : "USR-0001");

        db.prepare(`
          INSERT INTO profiles (
            id, name, email, role, team, workspace, property, avatar_url,
            streak_days, completed_sessions_count, average_composure, average_rating, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            role = excluded.role,
            team = excluded.team,
            workspace = excluded.workspace,
            property = excluded.property,
            avatar_url = excluded.avatar_url,
            streak_days = excluded.streak_days,
            completed_sessions_count = excluded.completed_sessions_count,
            average_composure = excluded.average_composure,
            average_rating = excluded.average_rating,
            updated_at = excluded.updated_at
        `).run(
          profileId,
          p.name || "User",
          p.email || "",
          p.role || "",
          p.team || "",
          p.workspace || "",
          p.property || "",
          p.avatarUrl || "",
          p.streakDays || 0,
          p.completedSessionsCount || 0,
          p.averageComposure || 0,
          p.averageRating || 0,
          now,
          now
        );
        result = { ...p, id: profileId, userId: profileId };
        break;
      }

      // Personas
      case "personas:list": {
        const rows = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM scenarios s WHERE s.persona_id = p.id AND s.hidden = 0) as scenarios_count
          FROM personas p
          WHERE p.hidden = 0
          ORDER BY p.name ASC
        `).all();
        result = rows.map(rowToPersona);
        break;
      }

      case "personas:get": {
        const targetId = typeof payload === "string" ? payload.trim() : (payload && payload.id);
        if (!targetId) {
          result = null;
          break;
        }
        const r = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM scenarios s WHERE s.persona_id = p.id AND s.hidden = 0) as scenarios_count
          FROM personas p
          WHERE p.id = ?
        `).get(targetId);
        result = r ? rowToPersona(r) : null;
        break;
      }

      case "personas:create": {
        const item = payload;
        const now = new Date().toISOString();
        const id = item.id || `persona-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const monogram = item.monogram || (item.name ? item.name.slice(0, 2).toUpperCase() : "PA");
        db.prepare(`
          INSERT INTO personas (
            id, name, avatar_url, monogram, title, context_setting, seniority,
            language, temperament_traits, voice, backstory, communication_notes,
            scenarios_count, pressure_level, source,
            tavus_pal_id, tavus_face_id, tavus_voice_id, face_name, face_image_path,
            greeting, compiled_system_prompt, pal_settings, sync_status,
            sync_error_code, sync_error, sync_hash, sync_attempt_at, last_synced_at, hidden,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          item.name || "Practice Partner",
          item.avatarUrl || null,
          monogram,
          item.title || item.role || "Specialist",
          item.contextSetting || item.setting || "General Rehearsal",
          item.seniority || "Professional",
          item.language || "en",
          JSON.stringify(item.temperamentTraits || []),
          item.voice || "Default",
          item.backstory || "",
          item.communicationNotes || "",
          item.scenariosCount || 0,
          item.pressureLevel || "Moderate",
          item.source || "Mine",
          item.tavusPalId || null,
          item.tavusFaceId || null,
          item.tavusVoiceId || null,
          item.faceName || null,
          item.faceImagePath || null,
          item.greeting || null,
          item.compiledSystemPrompt || null,
          item.palSettings ? JSON.stringify(item.palSettings) : null,
          item.syncStatus || "draft",
          item.syncErrorCode || null,
          item.syncError || null,
          item.syncHash || null,
          item.syncAttemptAt || null,
          item.lastSyncedAt || null,
          item.hidden ? 1 : 0,
          now,
          now
        );
        result = {
          ...item,
          id,
          monogram,
          syncStatus: item.syncStatus || "draft",
          hidden: Boolean(item.hidden),
        };
        break;
      }

      case "personas:update": {
        const { id: targetId, persona: p } = payload || {};
        if (!targetId || !p || typeof p !== "object") {
          result = null;
          break;
        }
        const existing = db.prepare("SELECT * FROM personas WHERE id = ?").get(targetId);
        if (!existing) {
          result = null;
          break;
        }
        const now = new Date().toISOString();
        const monogram = p.monogram || existing.monogram || (p.name ? p.name.slice(0, 2).toUpperCase() : "NA");
        db.prepare(`
          UPDATE personas SET
            name = ?,
            avatar_url = ?,
            monogram = ?,
            title = ?,
            context_setting = ?,
            seniority = ?,
            language = ?,
            temperament_traits = ?,
            voice = ?,
            backstory = ?,
            communication_notes = ?,
            scenarios_count = ?,
            pressure_level = ?,
            source = ?,
            tavus_pal_id = ?,
            tavus_face_id = ?,
            tavus_voice_id = ?,
            face_name = ?,
            face_image_path = ?,
            greeting = ?,
            compiled_system_prompt = ?,
            pal_settings = ?,
            sync_status = ?,
            sync_error_code = ?,
            sync_error = ?,
            sync_hash = ?,
            sync_attempt_at = ?,
            last_synced_at = ?,
            hidden = ?,
            user_modified = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          p.name !== undefined ? p.name : existing.name,
          p.avatarUrl !== undefined ? p.avatarUrl : existing.avatar_url,
          monogram,
          p.title !== undefined ? p.title : existing.title,
          p.contextSetting !== undefined ? p.contextSetting : existing.context_setting,
          p.seniority !== undefined ? p.seniority : existing.seniority,
          p.language !== undefined ? p.language : existing.language,
          JSON.stringify(p.temperamentTraits !== undefined ? p.temperamentTraits : JSON.parse(existing.temperament_traits || "[]")),
          p.voice !== undefined ? p.voice : existing.voice,
          p.backstory !== undefined ? p.backstory : existing.backstory,
          p.communicationNotes !== undefined ? p.communicationNotes : existing.communication_notes,
          p.scenariosCount !== undefined ? p.scenariosCount : existing.scenarios_count,
          p.pressureLevel !== undefined ? p.pressureLevel : existing.pressure_level,
          p.source !== undefined ? p.source : existing.source,
          p.tavusPalId !== undefined ? p.tavusPalId : existing.tavus_pal_id,
          p.tavusFaceId !== undefined ? p.tavusFaceId : existing.tavus_face_id,
          p.tavusVoiceId !== undefined ? p.tavusVoiceId : existing.tavus_voice_id,
          p.faceName !== undefined ? p.faceName : existing.face_name,
          p.faceImagePath !== undefined ? p.faceImagePath : existing.face_image_path,
          p.greeting !== undefined ? p.greeting : existing.greeting,
          p.compiledSystemPrompt !== undefined ? p.compiledSystemPrompt : existing.compiled_system_prompt,
          p.palSettings !== undefined ? (p.palSettings ? JSON.stringify(p.palSettings) : null) : existing.pal_settings,
          p.syncStatus !== undefined ? p.syncStatus : existing.sync_status,
          p.syncErrorCode !== undefined ? p.syncErrorCode : existing.sync_error_code,
          p.syncError !== undefined ? p.syncError : existing.sync_error,
          p.syncHash !== undefined ? p.syncHash : existing.sync_hash,
          p.syncAttemptAt !== undefined ? p.syncAttemptAt : existing.sync_attempt_at,
          p.lastSyncedAt !== undefined ? p.lastSyncedAt : existing.last_synced_at,
          p.hidden !== undefined ? (p.hidden ? 1 : 0) : existing.hidden,
          (p.name !== undefined || p.title !== undefined || p.backstory !== undefined || p.communicationNotes !== undefined || p.userModified) ? 1 : (existing.user_modified || 0),
          now,
          targetId
        );

        // Propagate updated persona copies to linked scenarios without bumping scenarios.updated_at
        const pRow = db.prepare("SELECT * FROM personas WHERE id = ?").get(targetId);
        if (pRow) {
          const pSummary = `${pRow.title || "Specialist"}, ${pRow.context_setting || "General Rehearsal"}`;
          db.prepare(`
            UPDATE scenarios SET
              persona_name = ?,
              context_setting = ?,
              seniority = ?,
              persona_avatar_url = ?,
              persona_summary = ?
            WHERE persona_id = ?
          `).run(pRow.name, pRow.context_setting, pRow.seniority, pRow.avatar_url || null, pSummary, targetId);
        }

        result = { ...existing, ...p, id: targetId, monogram };
        break;
      }

      case "personas:update-sync": {
        const p = payload || {};
        if (!p.id) {
          result = false;
          break;
        }
        const existing = db.prepare("SELECT * FROM personas WHERE id = ?").get(p.id);
        if (!existing) {
          result = false;
          break;
        }
        const now = new Date().toISOString();
        db.prepare(`
          UPDATE personas SET
            sync_status = COALESCE(?, sync_status),
            sync_error_code = ?,
            sync_error = ?,
            sync_hash = COALESCE(?, sync_hash),
            sync_attempt_at = COALESCE(?, sync_attempt_at),
            last_synced_at = COALESCE(?, last_synced_at),
            tavus_pal_id = COALESCE(?, tavus_pal_id),
            compiled_system_prompt = COALESCE(?, compiled_system_prompt),
            updated_at = ?
          WHERE id = ?
        `).run(
          p.syncStatus !== undefined ? p.syncStatus : null,
          p.syncErrorCode !== undefined ? p.syncErrorCode : existing.sync_error_code,
          p.syncError !== undefined ? p.syncError : existing.sync_error,
          p.syncHash !== undefined ? p.syncHash : null,
          p.syncAttemptAt !== undefined ? p.syncAttemptAt : null,
          p.lastSyncedAt !== undefined ? p.lastSyncedAt : null,
          p.tavusPalId !== undefined ? p.tavusPalId : null,
          p.compiledSystemPrompt !== undefined ? p.compiledSystemPrompt : null,
          now,
          p.id
        );
        result = true;
        break;
      }

      case "tavus:cache:get": {
        const row = db.prepare("SELECT * FROM tavus_catalog_cache WHERE kind = ?").get(payload);
        if (!row) {
          result = null;
        } else {
          try {
            result = {
              kind: row.kind,
              payload: JSON.parse(row.payload),
              fetchedAt: row.fetched_at,
            };
          } catch {
            result = null;
          }
        }
        break;
      }

      case "tavus:cache:set": {
        const { kind, payload: cachePayload } = payload || {};
        if (!kind || cachePayload === undefined) {
          result = false;
          break;
        }
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO tavus_catalog_cache (kind, payload, fetched_at)
          VALUES (?, ?, ?)
          ON CONFLICT(kind) DO UPDATE SET
            payload = excluded.payload,
            fetched_at = excluded.fetched_at
        `).run(kind, JSON.stringify(cachePayload), now);
        result = true;
        break;
      }

      case "personas:delete": {
        const targetId = typeof payload === "string" ? payload.trim() : (payload && payload.id);
        if (!targetId) {
          result = false;
          break;
        }
        const assignedScenarios = db.prepare("SELECT title FROM scenarios WHERE persona_id = ? AND hidden = 0").all(targetId);
        if (assignedScenarios.length > 0) {
          result = {
            ok: false,
            code: "has_scenarios",
            count: assignedScenarios.length,
            titles: assignedScenarios.map((s) => s.title),
          };
          break;
        }
        db.prepare("DELETE FROM personas WHERE id = ?").run(targetId);
        result = { ok: true };
        break;
      }

      // Scenarios
      case "scenarios:list": {
        const rows = db.prepare("SELECT * FROM scenarios WHERE hidden = 0 ORDER BY created_at DESC").all();
        result = rows.map(rowToScenario);
        break;
      }

      case "scenarios:save-studio": {
        const sc = payload;
        const personaId = sc && sc.personaId;
        if (!personaId) {
          result = { ok: false, code: "persona_not_found", error: "Persona ID is required." };
          break;
        }
        const personaRow = db.prepare("SELECT * FROM personas WHERE id = ? AND hidden = 0").get(personaId);
        if (!personaRow) {
          result = { ok: false, code: "persona_not_found", error: "Assigned counterpart persona not found." };
          break;
        }
        let personaMood = "Direct";
        try {
          const traits = JSON.parse(personaRow.temperament_traits || "[]");
          personaMood = Array.isArray(traits) && traits.length > 0 ? traits.join(" & ") : "Direct";
        } catch {
          personaMood = personaRow.temperament_traits || "Direct";
        }
        const personaSummary = `${personaRow.title || "Specialist"}, ${personaRow.context_setting || "General Rehearsal"}`;
        const now = new Date().toISOString();
        const id = sc.id || `sc-mine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const summary = makeSummary(sc.context || "", 140);

        const saveStudioTx = db.transaction(() => {
          db.prepare(`
            INSERT INTO scenarios (
              id, title, persona_id, persona_name, context_setting, seniority,
              interaction_type, difficulty, duration_minutes, summary, context,
              persona_mood, learning_objectives, key_challenges, recommended_phrases,
              persona_avatar_url, persona_summary, opening_line, builtin_key, hidden,
              source, submission_status, seed_version, user_modified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 0, 'Mine', 'published', NULL, 0, ?, ?)
          `).run(
            id,
            sc.title,
            personaRow.id,
            personaRow.name,
            personaRow.context_setting || "General",
            personaRow.seniority || "Peer",
            sc.interactionType,
            sc.difficulty,
            summary,
            sc.context,
            personaMood,
            JSON.stringify(sc.learningObjectives || []),
            JSON.stringify(sc.keyChallenges || []),
            personaRow.avatar_url || null,
            personaSummary,
            sc.openingLine ? sc.openingLine.trim() : null,
            sc.builtinKey || null,
            now,
            now
          );
          const inserted = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(id);
          return { ok: true, scenario: rowToScenario(inserted) };
        });

        result = saveStudioTx();
        break;
      }

      case "scenarios:update-studio": {
        const sc = payload;
        const targetId = sc && sc.id;
        if (!targetId) {
          result = { ok: false, code: "invalid_id", error: "Scenario ID is required for update." };
          break;
        }

        const updateStudioTx = db.transaction(() => {
          const existing = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(targetId);
          if (!existing) {
            return { ok: false, code: "scenario_not_found", error: "Scenario not found." };
          }

          let personaId = existing.persona_id;
          let personaName = existing.persona_name;
          let contextSetting = existing.context_setting;
          let seniority = existing.seniority;
          let personaAvatarUrl = existing.persona_avatar_url;
          let personaMood = existing.persona_mood;
          let personaSummary = existing.persona_summary;

          if (sc.personaId && sc.personaId !== existing.persona_id) {
            const personaRow = db.prepare("SELECT * FROM personas WHERE id = ? AND hidden = 0").get(sc.personaId);
            if (!personaRow) {
              return { ok: false, code: "persona_not_found", error: "Assigned counterpart persona not found." };
            }
            personaId = personaRow.id;
            personaName = personaRow.name;
            contextSetting = personaRow.context_setting;
            seniority = personaRow.seniority;
            personaAvatarUrl = personaRow.avatar_url || null;
            try {
              const traits = JSON.parse(personaRow.temperament_traits || "[]");
              personaMood = Array.isArray(traits) && traits.length > 0 ? traits.join(" & ") : "Direct";
            } catch {
              personaMood = personaRow.temperament_traits || "Direct";
            }
            personaSummary = `${personaRow.title || "Specialist"}, ${personaRow.context_setting || "General Rehearsal"}`;
          }

          const title = sc.title !== undefined ? sc.title : existing.title;
          const interactionType = sc.interactionType !== undefined ? sc.interactionType : existing.interaction_type;
          const difficulty = sc.difficulty !== undefined ? sc.difficulty : existing.difficulty;
          const context = sc.context !== undefined ? sc.context : existing.context;
          const summary = sc.context !== undefined ? makeSummary(context, 140) : existing.summary;
          const learningObjectives = sc.learningObjectives !== undefined ? JSON.stringify(sc.learningObjectives) : existing.learning_objectives;
          const keyChallenges = sc.keyChallenges !== undefined ? JSON.stringify(sc.keyChallenges) : existing.key_challenges;
          const openingLine = sc.openingLine !== undefined ? (sc.openingLine ? sc.openingLine.trim() : null) : existing.opening_line;
          const now = new Date().toISOString();

          db.prepare(`
            UPDATE scenarios SET
              title = ?,
              persona_id = ?,
              persona_name = ?,
              context_setting = ?,
              seniority = ?,
              interaction_type = ?,
              difficulty = ?,
              summary = ?,
              context = ?,
              persona_mood = ?,
              learning_objectives = ?,
              key_challenges = ?,
              opening_line = ?,
              persona_avatar_url = ?,
              persona_summary = ?,
              user_modified = 1,
              updated_at = ?
            WHERE id = ?
          `).run(
            title,
            personaId,
            personaName,
            contextSetting,
            seniority,
            interactionType,
            difficulty,
            summary,
            context,
            personaMood,
            learningObjectives,
            keyChallenges,
            openingLine,
            personaAvatarUrl,
            personaSummary,
            now,
            targetId
          );

          const updatedRow = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(targetId);
          return { ok: true, scenario: rowToScenario(updatedRow) };
        });

        result = updateStudioTx();
        break;
      }

      case "scenarios:create": {
        const sc = payload;
        const now = new Date().toISOString();
        const id = sc.id || `sc-${Date.now()}`;
        db.prepare(`
          INSERT INTO scenarios (
            id, title, persona_id, persona_name, context_setting, seniority,
            interaction_type, difficulty, duration_minutes, summary, context,
            persona_mood, learning_objectives, key_challenges, recommended_phrases,
            persona_avatar_url, persona_summary, opening_line, builtin_key, hidden,
            source, submission_status, seed_version, user_modified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            persona_id = excluded.persona_id,
            persona_name = excluded.persona_name,
            context_setting = excluded.context_setting,
            seniority = excluded.seniority,
            interaction_type = excluded.interaction_type,
            difficulty = excluded.difficulty,
            summary = excluded.summary,
            context = excluded.context,
            persona_mood = excluded.persona_mood,
            learning_objectives = excluded.learning_objectives,
            key_challenges = excluded.key_challenges,
            recommended_phrases = excluded.recommended_phrases,
            persona_avatar_url = excluded.persona_avatar_url,
            persona_summary = excluded.persona_summary,
            opening_line = excluded.opening_line,
            user_modified = 1,
            updated_at = excluded.updated_at
        `).run(
          id,
          sc.title || "Practice Scenario",
          sc.personaId || null,
          sc.personaName || "Practice Partner",
          sc.contextSetting || sc.setting || "General Rehearsal",
          sc.seniority || "Professional",
          sc.interactionType || "Simulation",
          sc.difficulty || "Intermediate",
          sc.durationMinutes || sc.targetDurationMin || 3,
          sc.summary || sc.description || "",
          sc.context || "",
          sc.personaMood || null,
          JSON.stringify(sc.learningObjectives || []),
          JSON.stringify(sc.keyChallenges || []),
          JSON.stringify(sc.recommendedPhrases || []),
          sc.personaAvatarUrl || null,
          sc.personaSummary || null,
          sc.openingLine || null,
          sc.builtinKey || null,
          sc.hidden ? 1 : 0,
          sc.source || "Mine",
          sc.submissionStatus || null,
          sc.seedVersion || null,
          sc.userModified ? 1 : 0,
          sc.createdAt || now,
          now
        );
        result = { ...sc, id };
        break;
      }

      case "scenarios:delete": {
        if (typeof payload !== "string" || !payload.trim()) {
          result = false;
          break;
        }
        const now = new Date().toISOString();
        db.prepare("UPDATE scenarios SET hidden = 1, updated_at = ? WHERE id = ?").run(now, payload.trim());
        result = true;
        break;
      }

      // Recordings (Paginated list view without bulky vitals blobs)
      case "recordings:list": {
        const cleanLimit = Math.max(1, Math.min(Number(payload?.limit) || 100, 1000));
        const cleanOffset = Math.max(0, Number(payload?.offset) || 0);
        const rows = db.prepare(`
          SELECT id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
                 date, relative_date, date_group, duration_seconds, duration_minutes,
                 composure_score, score, composure_tier, nervousness_level, readiness_status,
                 status, audio_path, waveform_path, user_notes, created_at
          FROM recordings
          ORDER BY date DESC
          LIMIT ? OFFSET ?
        `).all(cleanLimit, cleanOffset);

        result = rows.map((r) => ({
          id: r.id,
          scenarioId: r.scenario_id,
          scenarioTitle: r.scenario_title,
          personaId: r.persona_id || undefined,
          personaName: r.persona_name,
          personaAvatarUrl: r.persona_avatar_url || undefined,
          date: r.date,
          relativeDate: r.relative_date,
          dateGroup: r.date_group,
          durationSeconds: r.duration_seconds,
          durationMinutes: r.duration_minutes || undefined,
          composureScore: r.composure_score ?? undefined,
          score: r.score ?? undefined,
          composureTier: r.composure_tier || undefined,
          nervousnessLevel: r.nervousness_level || undefined,
          readinessStatus: r.readiness_status || undefined,
          status: r.status,
          audioUrl: r.audio_path || undefined,
          transcript: [],
          userNotes: JSON.parse(r.user_notes || "[]"),
        }));
        break;
      }

      case "recordings:get": {
        const idToGet = payload;
        if (typeof idToGet !== "string" || !idToGet.trim()) {
          result = null;
          break;
        }
        const r = db.prepare("SELECT * FROM recordings WHERE id = ?").get(idToGet.trim());
        if (!r) {
          result = null;
        } else {
          const notes = JSON.parse(r.user_notes || "[]");
          const vitalsSamples = db.prepare("SELECT * FROM vitals_samples WHERE recording_id = ? ORDER BY timestamp_offset_ms ASC").all(idToGet);
          result = {
            id: r.id,
            scenarioId: r.scenario_id,
            scenarioTitle: r.scenario_title,
            personaId: r.persona_id || undefined,
            personaName: r.persona_name,
            personaAvatarUrl: r.persona_avatar_url || undefined,
            date: r.date,
            relativeDate: r.relative_date,
            dateGroup: r.date_group,
            durationSeconds: r.duration_seconds,
            durationMinutes: r.duration_minutes || undefined,
            composureScore: r.composure_score ?? undefined,
            score: r.score ?? undefined,
            composureTier: r.composure_tier || undefined,
            nervousnessLevel: r.nervousness_level || undefined,
            readinessStatus: r.readiness_status || undefined,
            status: r.status,
            audioUrl: r.audio_path || undefined,
            transcript: JSON.parse(r.transcript || "[]"),
            sessionBiometrics: r.session_biometrics ? JSON.parse(r.session_biometrics) : undefined,
            pressureCoaching: r.pressure_coaching ? JSON.parse(r.pressure_coaching) : undefined,
            userNotes: notes,
            notes,
            vitalsSamples,
            selfReflectionNotes: r.self_reflection_notes || undefined,
          };
        }
        break;
      }

      case "recordings:save": {
        const rec = payload;
        const now = new Date().toISOString();
        const id = rec.id || `rec-${Date.now()}`;
        const date = rec.date || rec.createdAt || now;
        const relativeDate = rec.relativeDate || "Just now";
        const scenarioTitle = rec.scenarioTitle || "Rehearsal Session";
        const personaName = rec.personaName || "Practice Partner";
        const durationSeconds = rec.durationSeconds ?? 60;

        let safeAudioPath = null;
        const candidateAudio = rec.audioUrl || rec.audioPath;
        if (candidateAudio && typeof candidateAudio === "string" && candidateAudio.trim()) {
          const base = path.resolve(recordingsDir);
          const fileName = path.basename(candidateAudio);
          const expected = path.join(base, fileName);
          if (candidateAudio === expected || candidateAudio === fileName) {
            safeAudioPath = expected;
          }
        }

        const insertRecording = db.transaction(() => {
          db.prepare(`
            INSERT INTO recordings (
              id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
              date, relative_date, date_group, duration_seconds, duration_minutes,
              composure_score, score, composure_tier, nervousness_level, readiness_status,
              status, audio_path, waveform_path, transcript, session_biometrics, pressure_coaching,
              user_notes, self_reflection_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              scenario_title = excluded.scenario_title,
              user_notes = excluded.user_notes,
              transcript = excluded.transcript,
              self_reflection_notes = excluded.self_reflection_notes
          `).run(
            id,
            rec.scenarioId || null,
            scenarioTitle,
            rec.personaId || null,
            personaName,
            rec.personaAvatarUrl || null,
            date,
            relativeDate,
            rec.dateGroup || "Today",
            durationSeconds,
            rec.durationMinutes || null,
            rec.composureScore ?? null,
            rec.score ?? null,
            rec.composureTier || null,
            rec.nervousnessLevel || null,
            rec.readinessStatus || null,
            rec.status || "Completed",
            safeAudioPath,
            null,
            JSON.stringify(rec.transcript || []),
            rec.sessionBiometrics ? JSON.stringify(rec.sessionBiometrics) : null,
            rec.pressureCoaching ? JSON.stringify(rec.pressureCoaching) : null,
            JSON.stringify(rec.notes || rec.userNotes || []),
            rec.selfReflectionNotes || null,
            rec.createdAt || now
          );

          // Clean up existing child samples and notes on re-save to prevent row duplication
          if (Array.isArray(rec.vitalsSamples) || (rec.sessionBiometrics && rec.sessionBiometrics.pulse)) {
            db.prepare("DELETE FROM vitals_samples WHERE recording_id = ?").run(id);
          }
          if (Array.isArray(rec.notes || rec.userNotes)) {
            db.prepare("DELETE FROM recording_notes WHERE recording_id = ?").run(id);
          }

          const insertSampleStmt = db.prepare(`
            INSERT INTO vitals_samples (recording_id, timestamp_offset_ms, pulse_bpm, confidence, is_clean)
            VALUES (?, ?, ?, ?, ?)
          `);

          // Insert from rec.vitalsSamples if provided
          if (Array.isArray(rec.vitalsSamples)) {
            for (const s of rec.vitalsSamples) {
              insertSampleStmt.run(
                id,
                s.timestampMs || s.timestampOffsetMs || 0,
                s.pulseRateBpm || s.pulseBpm || 70,
                s.pulseConfidence ?? s.confidence ?? 100,
                s.motionWarning ? 0 : 1
              );
            }
          } else if (rec.sessionBiometrics && rec.sessionBiometrics.pulse && Array.isArray(rec.sessionBiometrics.pulse.rate)) {
            for (const s of rec.sessionBiometrics.pulse.rate) {
              insertSampleStmt.run(
                id,
                Math.round((s.timestampSeconds || 0) * 1000),
                s.pulseBpm || 70,
                s.confidence || 0,
                s.outOfRange ? 0 : 1
              );
            }
          }

          // Also insert into recording_notes if notes array provided
          const notesArr = rec.notes || rec.userNotes;
          if (Array.isArray(notesArr)) {
            const insertNoteStmt = db.prepare(`
              INSERT INTO recording_notes (id, recording_id, timestamp_seconds, note_text, author, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const n of notesArr) {
              insertNoteStmt.run(
                n.id || `n-${Date.now()}-${crypto.randomUUID()}`,
                id,
                n.timestampSeconds || 0,
                n.text || n.noteText || "",
                n.author || "User",
                n.createdAt || now
              );
            }
          }
        });

        insertRecording();
        result = { ...rec, id };
        break;
      }

      case "recordings:delete": {
        const idToDelete = payload;
        if (typeof idToDelete !== "string" || !idToDelete.trim()) {
          result = false;
          break;
        }
        const row = db.prepare("SELECT audio_path, waveform_path FROM recordings WHERE id = ?").get(idToDelete.trim());
        db.prepare("DELETE FROM recordings WHERE id = ?").run(idToDelete.trim());
        if (row) {
          const isSafeFile = (filePath) => {
            if (!filePath || typeof filePath !== "string" || !filePath.trim()) return false;
            const base = path.resolve(recordingsDir);
            const fileName = path.basename(filePath);
            const expected = path.join(base, fileName);
            return filePath === expected;
          };
          if (row.audio_path && isSafeFile(row.audio_path) && fs.existsSync(row.audio_path)) {
            try { fs.unlinkSync(row.audio_path); } catch { /* ignore */ }
          }
          if (row.waveform_path && isSafeFile(row.waveform_path) && fs.existsSync(row.waveform_path)) {
            try { fs.unlinkSync(row.waveform_path); } catch { /* ignore */ }
          }
        }
        result = true;
        break;
      }

      case "recordings:add-note": {
        const { recordingId, note } = payload || {};
        if (!recordingId || !note) {
          result = false;
          break;
        }
        const row = db.prepare("SELECT user_notes FROM recordings WHERE id = ?").get(recordingId);
        if (row) {
          let notes = [];
          try {
            notes = JSON.parse(row.user_notes || "[]");
            if (!Array.isArray(notes)) notes = [];
          } catch {
            notes = [];
          }
          notes.push(note);
          const now = new Date().toISOString();
          const noteId = note.id || `n-${Date.now()}-${crypto.randomUUID()}`;
          db.transaction(() => {
            db.prepare("UPDATE recordings SET user_notes = ? WHERE id = ?").run(
              JSON.stringify(notes),
              recordingId
            );
            db.prepare(`
              INSERT INTO recording_notes (id, recording_id, timestamp_seconds, note_text, author, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              noteId,
              recordingId,
              note.timestampSeconds || 0,
              note.text || note.noteText || "",
              note.author || "User",
              note.createdAt || now
            );
          })();
        }
        result = true;
        break;
      }

      // Baselines
      case "baseline:get": {
        const b = db.prepare("SELECT * FROM baselines ORDER BY created_at DESC LIMIT 1").get();
        if (!b) {
          result = null;
        } else {
          result = {
            restingPulse: b.resting_pulse,
            restingHrvRmssd: b.resting_hrv_rmssd || 54,
            restingBaevsky: b.resting_baevsky || 82,
            restingBreathingRate: b.resting_breathing_rate || 14,
            restingEdaArousal: b.resting_eda_arousal || 0.22,
            restingExpressions: b.resting_expressions ? JSON.parse(b.resting_expressions) : undefined,
            measuredAt: b.measured_at,
            isCalibrated: Boolean(b.is_calibrated),
            durationSeconds: b.duration_seconds || 60,
            restingHR: b.resting_pulse,
            restingHRV: b.resting_hrv_rmssd || 54,
          };
        }
        break;
      }

      case "baseline:save": {
        const b = payload;
        const now = new Date().toISOString();
        const baseId = `baseline-${Date.now()}`;
        db.prepare(`
          INSERT INTO baselines (
            id, resting_pulse, resting_hrv_rmssd, resting_baevsky, resting_breathing_rate,
            resting_eda_arousal, resting_expressions, measured_at, is_calibrated, duration_seconds, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          baseId,
          b.restingPulse || b.restingHR || 68,
          b.restingHrvRmssd || b.restingHRV || 54,
          b.restingBaevsky || 82,
          b.restingBreathingRate || 14,
          b.restingEdaArousal || 0.22,
          b.restingExpressions ? JSON.stringify(b.restingExpressions) : null,
          b.measuredAt || now,
          b.isCalibrated ? 1 : 0,
          b.durationSeconds || 60,
          now
        );
        result = b;
        break;
      }

      case "baseline:clear": {
        db.prepare("DELETE FROM baselines").run();
        result = true;
        break;
      }

      // Settings
      case "settings:get-all": {
        const rows = db.prepare("SELECT key, value FROM settings").all();
        const map = Object.create(null);
        for (const r of rows) {
          if (r.key === "__proto__" || r.key === "constructor" || r.key === "prototype") continue;
          try {
            map[r.key] = JSON.parse(r.value);
          } catch {
            map[r.key] = r.value;
          }
        }
        result = { ...map };
        break;
      }

      case "settings:set": {
        const { key, value } = payload;
        if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
          throw new Error("Invalid setting key");
        }
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).run(key, JSON.stringify(value), now);
        result = true;
        break;
      }

      // Permissions Cache
      case "permissions:get": {
        const row = db.prepare("SELECT * FROM permissions WHERE resource = ?").get(payload);
        result = row || null;
        break;
      }

      case "permissions:save": {
        const { resource, status, explainerShown, declinedAt } = payload || {};
        if (!resource || !status) {
          result = false;
          break;
        }
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO permissions (resource, status, explainer_shown, declined_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(resource) DO UPDATE SET
            status = excluded.status,
            explainer_shown = excluded.explainer_shown,
            declined_at = excluded.declined_at,
            updated_at = excluded.updated_at
        `).run(
          resource,
          status,
          explainerShown ? 1 : 0,
          declinedAt || null,
          now
        );
        result = true;
        break;
      }

      // Atomic Clear All Data + VACUUM
      case "data:clear-all": {
        const clearAll = db.transaction(() => {
          db.prepare("DELETE FROM recording_notes").run();
          db.prepare("DELETE FROM vitals_samples").run();
          db.prepare("DELETE FROM recordings").run();
          db.prepare("DELETE FROM baselines").run();
          db.prepare("DELETE FROM scenarios WHERE source = 'Mine'").run();
          db.prepare("DELETE FROM personas WHERE source = 'Mine'").run();
          db.prepare("DELETE FROM settings").run();
          db.prepare("DELETE FROM permissions").run();
        });
        clearAll();
        db.pragma("VACUUM");

        // Wipe audio recordings on disk for complete data hygiene (GDPR erasure compliance)
        if (fs.existsSync(recordingsDir)) {
          try {
            const files = fs.readdirSync(recordingsDir);
            for (const file of files) {
              const fullPath = path.join(recordingsDir, file);
              try {
                if (fs.statSync(fullPath).isFile()) {
                  fs.unlinkSync(fullPath);
                }
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        }

        result = true;
        break;
      }

      // Developer Full Database Reset + Complete Wipe
      case "data:reset-database-dev": {
        const resetAll = db.transaction(() => {
          db.prepare("DELETE FROM recording_notes").run();
          db.prepare("DELETE FROM vitals_samples").run();
          db.prepare("DELETE FROM recordings").run();
          db.prepare("DELETE FROM baselines").run();
          db.prepare("DELETE FROM scenarios").run();
          db.prepare("DELETE FROM personas").run();
          db.prepare("DELETE FROM seed_state").run();
          db.prepare("DELETE FROM settings").run();
          db.prepare("DELETE FROM permissions").run();
          db.prepare("DELETE FROM tavus_catalog_cache").run();
        });
        resetAll();
        db.pragma("VACUUM");

        if (fs.existsSync(recordingsDir)) {
          try {
            const files = fs.readdirSync(recordingsDir);
            for (const file of files) {
              const fullPath = path.join(recordingsDir, file);
              try {
                if (fs.statSync(fullPath).isFile()) {
                  fs.unlinkSync(fullPath);
                }
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        }

        result = true;
        break;
      }

      // Seeding Handlers
      case "seed:get-state": {
        const pState = db.prepare("SELECT * FROM seed_state WHERE key = 'personas'").get() || null;
        const sState = db.prepare("SELECT * FROM seed_state WHERE key = 'scenarios'").get() || null;
        const pCounts = db.prepare(`
          SELECT 
            COUNT(*) as total_seeded,
            SUM(CASE WHEN tavus_face_id IS NOT NULL AND tavus_face_id != '' THEN 1 ELSE 0 END) as bound_faces,
            SUM(CASE WHEN hidden = 1 THEN 1 ELSE 0 END) as hidden_count
          FROM personas WHERE builtin_key IS NOT NULL
        `).get();
        const sCounts = db.prepare(`
          SELECT 
            COUNT(*) as total_seeded,
            SUM(CASE WHEN hidden = 1 THEN 1 ELSE 0 END) as hidden_count
          FROM scenarios WHERE builtin_key IS NOT NULL
        `).get();

        result = {
          personas: pState ? {
            status: pState.status,
            seedVersion: pState.seed_version,
            attempts: pState.attempts,
            lastError: pState.last_error,
            updatedAt: pState.updated_at,
          } : null,
          scenarios: sState ? {
            status: sState.status,
            seedVersion: sState.seed_version,
            attempts: sState.attempts,
            lastError: sState.last_error,
            updatedAt: sState.updated_at,
          } : null,
          personasCounts: {
            total: pCounts?.total_seeded || 0,
            bound: pCounts?.bound_faces || 0,
            hidden: pCounts?.hidden_count || 0,
          },
          scenariosCounts: {
            total: sCounts?.total_seeded || 0,
            hidden: sCounts?.hidden_count || 0,
          },
        };
        break;
      }

      case "seed:set-state": {
        const { key, status, seedVersion, attempts, lastError } = payload || {};
        if (!key || !status) {
          result = { ok: false, error: "key and status are required" };
          break;
        }
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO seed_state (key, status, seed_version, attempts, last_error, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            status = excluded.status,
            seed_version = excluded.seed_version,
            attempts = excluded.attempts,
            last_error = excluded.last_error,
            updated_at = excluded.updated_at
        `).run(key, status, seedVersion || 1, attempts || 0, lastError || null, now);
        result = { ok: true };
        break;
      }

      case "seed:upsert-personas": {
        const { items, seedVersion } = payload || {};
        if (!Array.isArray(items)) {
          result = { count: 0 };
          break;
        }
        const insertStmt = db.prepare(`
          INSERT INTO personas (
            id, name, avatar_url, monogram, title, context_setting, seniority,
            language, temperament_traits, voice, backstory, communication_notes,
            scenarios_count, pressure_level, source,
            tavus_pal_id, tavus_face_id, tavus_voice_id, face_name, face_image_path,
            greeting, compiled_system_prompt, pal_settings, sync_status,
            sync_error_code, sync_error, sync_hash, sync_attempt_at, last_synced_at,
            hidden, builtin_key, seed_version, user_modified, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            0, ?, 'Library',
            NULL, NULL, NULL, NULL, NULL,
            ?, '', NULL, 'draft',
            NULL, NULL, NULL, NULL, NULL,
            0, ?, ?, 0, ?, ?
          )
          ON CONFLICT(builtin_key) DO NOTHING
        `);

        const upsertTx = db.transaction((personaList) => {
          let inserted = 0;
          for (const item of personaList) {
            const now = new Date().toISOString();
            const id = `persona-seed-${item.builtinKey}`;
            const monogram = item.monogram || (item.name ? item.name.slice(0, 2).toUpperCase() : "PA");
            const traitsJson = JSON.stringify(item.temperamentTraits || []);
            const res = insertStmt.run(
              id, item.name, item.avatarUrl || null, monogram, item.title || "",
              item.contextSetting || "", item.seniority || "Peer",
              item.language || "en", traitsJson, item.voice || "Default",
              item.backstory || "", item.communicationNotes || "",
              item.pressureLevel || "Moderate", item.greeting || "",
              item.builtinKey, seedVersion || 1, now, now
            );
            if (res.changes > 0) inserted++;
          }
          return inserted;
        });

        result = { count: upsertTx(items) };
        break;
      }

      case "seed:bind-faces": {
        const { bindings } = payload || {};
        if (!Array.isArray(bindings)) {
          result = { updated: 0 };
          break;
        }
        const updateStmt = db.prepare(`
          UPDATE personas SET
            tavus_face_id = ?,
            tavus_voice_id = ?,
            face_name = ?,
            face_image_path = ?,
            avatar_url = COALESCE(?, avatar_url),
            updated_at = ?
          WHERE builtin_key = ? AND (user_modified = 0 OR tavus_face_id IS NULL)
        `);
        const bindTx = db.transaction((list) => {
          let updatedCount = 0;
          const now = new Date().toISOString();
          for (const b of list) {
            const res = updateStmt.run(
              b.tavusFaceId,
              b.tavusVoiceId || null,
              b.faceName || null,
              b.faceImagePath || null,
              b.avatarUrl || null,
              now,
              b.builtinKey
            );
            if (res.changes > 0) updatedCount++;
          }
          return updatedCount;
        });
        result = { updated: bindTx(bindings) };
        break;
      }

      case "seed:get-unbound-personas": {
        const rows = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM scenarios s WHERE s.persona_id = p.id AND s.hidden = 0) as scenarios_count
          FROM personas p
          WHERE p.builtin_key IS NOT NULL
            AND (p.tavus_face_id IS NULL OR p.tavus_face_id = '')
            AND p.hidden = 0
          ORDER BY p.name ASC
        `).all();
        result = rows.map(rowToPersona);
        break;
      }

      case "seed:upsert-scenarios": {
        const { items, seedVersion } = payload || {};
        if (!Array.isArray(items)) {
          result = { count: 0 };
          break;
        }
        const insertStmt = db.prepare(`
          INSERT INTO scenarios (
            id, title, persona_id, persona_name, context_setting, seniority,
            interaction_type, difficulty, duration_minutes, summary, context,
            persona_mood, learning_objectives, key_challenges, recommended_phrases,
            persona_avatar_url, persona_summary, opening_line, builtin_key, hidden,
            source, submission_status, seed_version, user_modified, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, 3, ?, ?,
            ?, ?, ?, '[]',
            ?, ?, ?, ?, 0,
            'Library', 'published', ?, 0, ?, ?
          )
          ON CONFLICT(builtin_key) DO NOTHING
        `);

        const upsertTx = db.transaction((scenarioList) => {
          let inserted = 0;
          for (const item of scenarioList) {
            const personaRow = db.prepare("SELECT * FROM personas WHERE builtin_key = ?").get(item.personaKey);
            if (!personaRow) {
              console.warn(`[dbWorker] Skipping scenario '${item.builtinKey}': personaKey '${item.personaKey}' not found.`);
              continue;
            }
            let mood = "Direct";
            try {
              const traits = JSON.parse(personaRow.temperament_traits || "[]");
              mood = Array.isArray(traits) && traits.length > 0 ? traits.join(" & ") : "Direct";
            } catch {}
            const pSummary = `${personaRow.title || "Specialist"}, ${personaRow.context_setting || "General"}`;
            const now = new Date().toISOString();
            const id = `scenario-seed-${item.builtinKey}`;
            const summary = makeSummary(item.context, 140);
            const res = insertStmt.run(
              id, item.title, personaRow.id, personaRow.name,
              personaRow.context_setting || "General", personaRow.seniority || "Peer",
              item.interactionType, item.difficulty, summary, item.context,
              mood, JSON.stringify(item.learningObjectives || []),
              JSON.stringify(item.keyChallenges || []),
              personaRow.avatar_url || null, pSummary,
              item.openingLine || null, item.builtinKey,
              seedVersion || 1, now, now
            );
            if (res.changes > 0) inserted++;
          }
          return inserted;
        });

        result = { count: upsertTx(items) };
        break;
      }

      default:
        throw new Error(`Unknown storage operation: ${type}`);
    }

    parentPort.postMessage({ id, success: true, result });
  } catch (error) {
    parentPort.postMessage({ id, success: false, error: error.message });
  }
});
