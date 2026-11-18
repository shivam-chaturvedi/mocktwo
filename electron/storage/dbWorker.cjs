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

function rowToBaseline(b) {
  if (!b) return null;
  let missingSignals = undefined;
  if (b.missing_signals) {
    try {
      missingSignals = JSON.parse(b.missing_signals);
    } catch {
      missingSignals = b.missing_signals.split(",").map((s) => s.trim());
    }
  }

  return {
    id: b.id,
    status: b.status,
    invalidReason: b.invalid_reason || null,
    missingSignals,
    targetSeconds: b.target_seconds ?? 90,
    actualSeconds: b.actual_seconds ?? (b.duration_seconds || 90),
    isActive: Boolean(b.is_active),
    qualityScore: b.quality_score ?? null,
    // Pulse
    pulseMean: b.pulse_mean ?? b.resting_pulse ?? null,
    pulseMedian: b.pulse_median ?? null,
    pulseMin: b.pulse_min ?? null,
    pulseMax: b.pulse_max ?? null,
    pulseSd: b.pulse_sd ?? null,
    pulseConfidence: b.pulse_confidence ?? null,
    pulseSampleCount: b.pulse_sample_count ?? 0,
    // HRV
    hrvRmssd: b.hrv_rmssd ?? b.resting_hrv_rmssd ?? null,
    hrvSdnn: b.hrv_sdnn ?? null,
    hrvMeanNn: b.hrv_mean_nn ?? null,
    hrvBaevsky: b.hrv_baevsky ?? b.resting_baevsky ?? null,
    hrvConfidence: b.hrv_confidence ?? null,
    hrvSampleCount: b.hrv_sample_count ?? 0,
    // Breathing
    breathingMean: b.breathing_mean ?? b.resting_breathing_rate ?? null,
    breathingSd: b.breathing_sd ?? null,
    breathingConfidence: b.breathing_confidence ?? null,
    breathingSampleCount: b.breathing_sample_count ?? 0,
    // Blinking & Expressions
    blinkCount: b.blink_count ?? 0,
    blinkRatePerMin: b.blink_rate_per_min ?? 0,
    expressionMap: b.expression_map ? JSON.parse(b.expression_map) : {},
    dominantExpression: b.dominant_expression || null,
    // EDA
    edaMean: b.eda_mean ?? null,
    edaSd: b.eda_sd ?? null,
    edaSlope: b.eda_slope ?? null,
    // Quality & Provenance
    facePresentRatio: b.face_present_ratio ?? 0,
    talkingRatio: b.talking_ratio ?? 0,
    motionRatio: b.motion_ratio ?? 0,
    validationHistogram: b.validation_histogram ? JSON.parse(b.validation_histogram) : {},
    cameraLabel: b.camera_label || null,
    cameraResolution: b.camera_resolution || null,
    cameraFps: b.camera_fps ?? null,
    localDate: b.local_date || null,
    timezone: b.timezone || null,
    startedAt: b.started_at || b.measured_at,
    endedAt: b.ended_at || null,
    durationSeconds: b.duration_seconds || 90,
    measuredAt: b.measured_at,
    sdkVersion: b.sdk_version || null,
    requestedMetrics: b.requested_metrics ? JSON.parse(b.requested_metrics) : null,
    // Backward-compatibility aliases
    restingPulse: b.pulse_mean ?? b.resting_pulse ?? null,
    restingHrvRmssd: b.hrv_rmssd ?? b.resting_hrv_rmssd ?? null,
    restingBreathingRate: b.breathing_mean ?? b.resting_breathing_rate ?? null,
    restingBaevsky: b.hrv_baevsky ?? b.resting_baevsky ?? null,
    isCalibrated: Boolean(b.is_active && b.status === "valid"),
  };
}

function runMigrations() {
  const tableExists = (tbl) => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tbl);
    return Boolean(row);
  };

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

  if (currentVersion < 5) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v4-${Date.now()}.db`);
      db.backup(backupPath);
    } catch (err) {
      console.error("Failed to backup db before v5 migration:", err);
    }

    const migrateV5 = db.transaction(() => {
      // 1. Upgrade recordings via table rebuild (clean schema, strict foreign keys, normalized status)
      db.exec(`
        CREATE TABLE IF NOT EXISTS recordings_new (
          id TEXT PRIMARY KEY,
          scenario_id TEXT REFERENCES scenarios(id) ON DELETE SET NULL,
          scenario_title TEXT NOT NULL,
          persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
          persona_name TEXT NOT NULL,
          persona_avatar_url TEXT,
          baseline_id TEXT REFERENCES baselines(id) ON DELETE SET NULL,
          interaction_type TEXT NOT NULL DEFAULT 'Difficult Conversations',
          started_at TEXT NOT NULL,
          ended_at TEXT,
          local_date TEXT NOT NULL,
          timezone TEXT NOT NULL DEFAULT 'UTC',
          planned_duration_seconds INTEGER NOT NULL DEFAULT 180,
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          duration_minutes REAL,
          status TEXT NOT NULL DEFAULT 'completed',
          end_reason TEXT,
          video_path TEXT,
          audio_path TEXT,
          file_size_bytes INTEGER,
          mime_type TEXT,
          composure_score REAL,
          avg_pulse REAL,
          peak_pulse REAL,
          avg_hrv_rmssd REAL,
          recovery_seconds INTEGER,
          user_notes TEXT NOT NULL DEFAULT '[]',
          self_reflection_notes TEXT,
          created_at TEXT NOT NULL
        );
      `);

      const tableExists = (tbl) => {
          const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tbl);
          return Boolean(row);
        };

        if (tableExists("recordings")) {
          db.exec(`
            INSERT INTO recordings_new (
              id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
              started_at, ended_at, local_date, duration_seconds, duration_minutes,
              status, end_reason, video_path, audio_path, composure_score,
              user_notes, self_reflection_notes, created_at
            )
            SELECT 
              id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
              COALESCE(date, created_at),
              COALESCE(date, created_at),
              substr(COALESCE(date, created_at), 1, 10),
              duration_seconds, duration_minutes,
              CASE 
                WHEN LOWER(status) IN ('completed') THEN 'completed'
                WHEN LOWER(status) IN ('too short', 'abandoned') THEN 'abandoned'
                WHEN LOWER(status) IN ('interrupted') THEN 'interrupted'
                ELSE 'failed'
              END,
              'completed',
              NULL,
              audio_path,
              composure_score,
              user_notes, self_reflection_notes, created_at
            FROM recordings;

            DROP TABLE recordings;
          `);
        }

        db.exec(`ALTER TABLE recordings_new RENAME TO recordings;`);

        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_recordings_streak ON recordings(status, duration_seconds, local_date DESC);
          CREATE INDEX IF NOT EXISTS idx_recordings_scenario ON recordings(scenario_id);
          CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings(interaction_type);
        `);

        // 2. Upgrade baselines table
        if (!tableExists("baselines")) {
          db.exec(`
            CREATE TABLE IF NOT EXISTS baselines (
              id TEXT PRIMARY KEY,
              measured_at TEXT NOT NULL,
              started_at TEXT,
              resting_pulse REAL,
              hrv_rmssd REAL,
              breathing_rate REAL,
              clean_frames_pct REAL,
              quality_score INTEGER,
              quality_rating TEXT,
              is_active INTEGER NOT NULL DEFAULT 0,
              invalid_reason TEXT,
              video_path TEXT,
              created_at TEXT NOT NULL
            );
          `);
        } else {
          const cols = db.prepare("PRAGMA table_info(baselines)").all().map((c) => c.name);
          if (!cols.includes("started_at")) db.exec("ALTER TABLE baselines ADD COLUMN started_at TEXT;");
          if (!cols.includes("quality_score")) db.exec("ALTER TABLE baselines ADD COLUMN quality_score INTEGER;");
          if (!cols.includes("quality_rating")) db.exec("ALTER TABLE baselines ADD COLUMN quality_rating TEXT;");
          if (!cols.includes("is_active")) db.exec("ALTER TABLE baselines ADD COLUMN is_active INTEGER NOT NULL DEFAULT 0;");
          if (!cols.includes("invalid_reason")) db.exec("ALTER TABLE baselines ADD COLUMN invalid_reason TEXT;");
          if (!cols.includes("video_path")) db.exec("ALTER TABLE baselines ADD COLUMN video_path TEXT;");

          db.exec(`
            UPDATE baselines SET started_at = measured_at WHERE started_at IS NULL;
            UPDATE baselines SET is_active = 0;
            UPDATE baselines 
            SET is_active = 1 
            WHERE id = (
              SELECT id FROM baselines 
              WHERE is_calibrated = 1 
              ORDER BY measured_at DESC LIMIT 1
            );
          `);
        }

        db.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_baselines_single_active ON baselines(is_active) WHERE is_active = 1;

          -- 3. Create transcript_segments
          CREATE TABLE IF NOT EXISTS transcript_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
            seq INTEGER NOT NULL,
            speaker TEXT NOT NULL,
            text TEXT NOT NULL,
            start_ms INTEGER NOT NULL,
            end_ms INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_transcript_recording ON transcript_segments(recording_id, seq ASC);
        `);

        if (tableExists("vitals_samples")) {
          const vCols = db.prepare("PRAGMA table_info(vitals_samples)").all().map((c) => c.name);
          if (!vCols.includes("hrv_rmssd")) db.exec("ALTER TABLE vitals_samples ADD COLUMN hrv_rmssd REAL;");
          if (!vCols.includes("breathing_rate")) db.exec("ALTER TABLE vitals_samples ADD COLUMN breathing_rate REAL;");
        }

        db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(5, new Date().toISOString());
      });

    migrateV5();
    currentVersion = 5;
  }

  if (currentVersion < 6) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v5-${Date.now()}.db`);
      db.backup(backupPath);
    } catch (err) {
      console.error("Failed to backup db before v6 migration:", err);
    }

    const migrateV6 = db.transaction(() => {
      // 1. Upgrade baselines table
      if (!tableExists("baselines")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS baselines (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'valid',
            invalid_reason TEXT,
            is_active INTEGER NOT NULL DEFAULT 0,
            quality_score REAL,
            pulse_mean REAL,
            pulse_median REAL,
            pulse_min REAL,
            pulse_max REAL,
            pulse_sd REAL,
            pulse_confidence REAL,
            pulse_sample_count INTEGER,
            hrv_rmssd REAL,
            hrv_sdnn REAL,
            hrv_mean_nn REAL,
            hrv_baevsky REAL,
            hrv_confidence REAL,
            hrv_sample_count INTEGER,
            breathing_mean REAL,
            breathing_sd REAL,
            breathing_confidence REAL,
            breathing_sample_count INTEGER,
            blink_count INTEGER,
            blink_rate_per_min REAL,
            expression_map TEXT,
            dominant_expression TEXT,
            eda_mean REAL,
            eda_sd REAL,
            eda_slope REAL,
            face_present_ratio REAL,
            talking_ratio REAL,
            motion_ratio REAL,
            validation_histogram TEXT,
            camera_label TEXT,
            camera_resolution TEXT,
            camera_fps REAL,
            local_date TEXT,
            timezone TEXT,
            started_at TEXT,
            ended_at TEXT,
            duration_seconds INTEGER,
            measured_at TEXT NOT NULL,
            sdk_version TEXT,
            requested_metrics TEXT,
            video_path TEXT,
            created_at TEXT NOT NULL
          );
        `);
      } else {
        const cols = db.prepare("PRAGMA table_info(baselines)").all().map((c) => c.name);
        const addCol = (col, type) => {
          if (!cols.includes(col)) {
            db.exec(`ALTER TABLE baselines ADD COLUMN ${col} ${type};`);
          }
        };

        addCol("status", "TEXT NOT NULL DEFAULT 'valid'");
        addCol("invalid_reason", "TEXT");
        addCol("is_active", "INTEGER NOT NULL DEFAULT 0");
        addCol("quality_score", "REAL");
        addCol("pulse_mean", "REAL");
        addCol("pulse_median", "REAL");
        addCol("pulse_min", "REAL");
        addCol("pulse_max", "REAL");
        addCol("pulse_sd", "REAL");
        addCol("pulse_confidence", "REAL");
        addCol("pulse_sample_count", "INTEGER");
        addCol("hrv_rmssd", "REAL");
        addCol("hrv_sdnn", "REAL");
        addCol("hrv_mean_nn", "REAL");
        addCol("hrv_baevsky", "REAL");
        addCol("hrv_confidence", "REAL");
        addCol("hrv_sample_count", "INTEGER");
        addCol("breathing_mean", "REAL");
        addCol("breathing_sd", "REAL");
        addCol("breathing_confidence", "REAL");
        addCol("breathing_sample_count", "INTEGER");
        addCol("blink_count", "INTEGER");
        addCol("blink_rate_per_min", "REAL");
        addCol("expression_map", "TEXT");
        addCol("dominant_expression", "TEXT");
        addCol("eda_mean", "REAL");
        addCol("eda_sd", "REAL");
        addCol("eda_slope", "REAL");
        addCol("face_present_ratio", "REAL");
        addCol("talking_ratio", "REAL");
        addCol("motion_ratio", "REAL");
        addCol("validation_histogram", "TEXT");
        addCol("camera_label", "TEXT");
        addCol("camera_resolution", "TEXT");
        addCol("camera_fps", "REAL");
        addCol("local_date", "TEXT");
        addCol("timezone", "TEXT");
        addCol("started_at", "TEXT");
        addCol("ended_at", "TEXT");
        addCol("duration_seconds", "INTEGER");
        addCol("sdk_version", "TEXT");
        addCol("requested_metrics", "TEXT");

        // Existing rows created from old/fake flow must be marked legacy
        // so they are never treated as a real active baseline.
        db.exec(`
          UPDATE baselines 
          SET status = 'legacy', is_active = 0 
          WHERE status IS NULL OR status = '' OR status = 'legacy' OR sdk_version IS NULL;
        `);
      }

      // Ensure partial unique index exists so at most ONE baseline can be active
      db.exec(`
        DROP INDEX IF EXISTS idx_baselines_single_active;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_baselines_single_active ON baselines(is_active) WHERE is_active = 1;
      `);

      // 2. Create baseline_samples table for downsampled time-series telemetry
      db.exec(`
        CREATE TABLE IF NOT EXISTS baseline_samples (
          id TEXT PRIMARY KEY,
          baseline_id TEXT NOT NULL REFERENCES baselines(id) ON DELETE CASCADE,
          t_ms INTEGER NOT NULL,
          pulse REAL,
          pulse_conf REAL,
          pulse_stable INTEGER,
          breathing REAL,
          breathing_conf REAL,
          breathing_stable INTEGER,
          hrv_rmssd REAL,
          hrv_sdnn REAL,
          hrv_conf REAL,
          hrv_stable INTEGER,
          eda REAL,
          blink INTEGER,
          validation_code TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_baseline_samples ON baseline_samples(baseline_id, t_ms ASC);
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(6, new Date().toISOString());
    });

    migrateV6();
    currentVersion = 6;
  }

  if (currentVersion < 7) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v6-${Date.now()}.db`);
      if (typeof db.backup === "function") {
        db.backup(backupPath).catch((err) => console.error("Failed to backup db before v7 migration:", err));
      }
    } catch (err) {
      console.error("Failed to backup db before v7 migration:", err);
    }

    const migrateV7 = db.transaction(() => {
      // 1. Add tavus_conversation_id column to recordings
      const rCols = db.prepare("PRAGMA table_info(recordings)").all().map((c) => c.name);
      if (!rCols.includes("tavus_conversation_id")) {
        db.exec("ALTER TABLE recordings ADD COLUMN tavus_conversation_id TEXT;");
      }

      // 2. Data cleanup: remove fabricated canned transcript rows and invalidate affected recordings
      const CANNED_1 = Buffer.from("SSB1bmRlcnN0YW5kIHlvdXIgcGVyc3BlY3RpdmUsIGxldCdzIGV4cGxvcmUgb3B0aW9ucy4=", "base64").toString("utf8");
      const CANNED_2 = Buffer.from("TGV0J3MgcmV2aWV3IHRoZSB0ZXJtcyBhbmQgU0xBIGNvbW1pdG1lbnRzLg==", "base64").toString("utf8");

      const affectedRows = db.prepare("SELECT DISTINCT recording_id FROM transcript_segments WHERE text IN (?, ?)").all(CANNED_1, CANNED_2);
      const affectedRecordings = affectedRows.map((r) => r.recording_id);

      db.prepare("DELETE FROM transcript_segments WHERE text IN (?, ?)").run(CANNED_1, CANNED_2);

      for (const recId of affectedRecordings) {
        const remainingCount = db.prepare("SELECT count(*) as c FROM transcript_segments WHERE recording_id = ?").get(recId).c;
        if (remainingCount === 0) {
          db.prepare(
            "UPDATE recordings SET status = ?, end_reason = ?, self_reflection_notes = COALESCE(self_reflection_notes || CHAR(10), '') || ? WHERE id = ?"
          ).run("invalidated", "purged_fabricated_facade", "[INVALIDATED: Canned facade transcript purged.]", recId);
        }
      }

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(7, new Date().toISOString());
    });

    migrateV7();
    currentVersion = 7;
  }

  if (currentVersion < 8) {
    try {
      const backupDir = path.join(path.dirname(dbPath), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `mocktwo-v7-${Date.now()}.db`);
      if (typeof db.backup === "function") {
        db.backup(backupPath).catch((err) => console.error("Failed to backup db before v8 migration:", err));
      }
    } catch (err) {
      console.error("Failed to backup db before v8 migration:", err);
    }

    const migrateV8 = db.transaction(() => {
      // 1. Add session summary and coaching columns
      const rCols = db.prepare("PRAGMA table_info(recordings)").all().map((c) => c.name);
      const addCol = (col, type) => {
        if (!rCols.includes(col)) {
          db.exec(`ALTER TABLE recordings ADD COLUMN ${col} ${type};`);
        }
      };

      addCol("measured_seconds", "INTEGER");
      addCol("coverage_ratio", "REAL");
      addCol("video_off_seconds", "INTEGER DEFAULT 0");
      addCol("readiness_status", "TEXT");
      addCol("nervousness_level", "TEXT");
      addCol("pressure_skills", "TEXT");
      addCol("pressure_coaching", "TEXT");
      addCol("signals_available_count", "INTEGER");
      addCol("is_partial_score", "INTEGER DEFAULT 0");

      // 2. Data cleanup: remove 0s ghost sessions that have 0 transcripts and 0 duration
      const ghosts = db.prepare("SELECT id FROM recordings WHERE duration_seconds = 0 AND status = 'interrupted' AND id NOT IN (SELECT DISTINCT recording_id FROM transcript_segments)").all();
      const delStmt = db.prepare("DELETE FROM recordings WHERE id = ?");
      for (const g of ghosts) {
        delStmt.run(g.id);
        try {
          const folder = path.join(path.dirname(dbPath), "recordings", "sessions", g.id);
          if (fs.existsSync(folder)) {
            fs.rmSync(folder, { recursive: true, force: true });
          }
        } catch {}
      }

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(8, new Date().toISOString());
    });

    migrateV8();
    currentVersion = 8;
  }

  // Migration V9: Add recordings.layout ('stage_v1' | 'camera_only')
  if (currentVersion < 9) {
    try {
      const backupPath = `${dbPath}.backup-v8-${Date.now()}`;
      if (typeof db.backup === "function") {
        db.backup(backupPath).catch((err) => console.error("Failed to backup db before v9 migration:", err));
      }
    } catch (err) {
      console.error("Failed to backup db before v9 migration:", err);
    }

    const migrateV9 = db.transaction(() => {
      const rCols = db.prepare("PRAGMA table_info(recordings)").all().map((c) => c.name);
      if (!rCols.includes("layout")) {
        db.exec("ALTER TABLE recordings ADD COLUMN layout TEXT DEFAULT 'stage_v1';");
      }
      db.exec("UPDATE recordings SET layout = 'camera_only' WHERE layout IS NULL OR id IN ('session-1794941699660', 'session-1794944491711');");
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(9, new Date().toISOString());
    });

    migrateV9();
    currentVersion = 9;
  }

  // Migration V10: Add baselines.target_seconds, actual_seconds, missing_signals & invalidate pulse-only baselines
  if (currentVersion < 10) {
    try {
      const backupPath = `${dbPath}.backup-v9-${Date.now()}`;
      if (typeof db.backup === "function") {
        db.backup(backupPath).catch((err) => console.error("Failed to backup db before v10 migration:", err));
      }
    } catch (err) {
      console.error("Failed to backup db before v10 migration:", err);
    }

    const migrateV10 = db.transaction(() => {
      const bCols = db.prepare("PRAGMA table_info(baselines)").all().map((c) => c.name);
      if (!bCols.includes("target_seconds")) {
        db.exec("ALTER TABLE baselines ADD COLUMN target_seconds INTEGER DEFAULT 90;");
      }
      if (!bCols.includes("actual_seconds")) {
        db.exec("ALTER TABLE baselines ADD COLUMN actual_seconds INTEGER;");
      }
      if (!bCols.includes("missing_signals")) {
        db.exec("ALTER TABLE baselines ADD COLUMN missing_signals TEXT;");
      }

      // Invalidate any existing baselines where breathing or HRV was never captured
      db.exec(`
        UPDATE baselines
        SET status = 'incomplete', is_active = 0, invalid_reason = 'Incomplete calibration: Missing stable breathing or HRV signals'
        WHERE is_active = 1 AND (
          breathing_sample_count IS NULL OR breathing_sample_count = 0 OR
          hrv_sample_count IS NULL OR hrv_sample_count = 0
        );
      `);

      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(10, new Date().toISOString());
    });

    migrateV10();
    currentVersion = 10;
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

  // Reconcile complete baselines: if samples contain valid HRV that was under-counted by strict gate, reconcile and activate
  try {
    const recoverable = db.prepare(`
      SELECT b.id, AVG(s.hrv_rmssd) as avg_rmssd, COUNT(s.id) as cnt
      FROM baselines b
      JOIN baseline_samples s ON s.baseline_id = b.id
      WHERE (b.status = 'incomplete' OR b.is_active = 0)
        AND s.hrv_rmssd IS NOT NULL AND s.hrv_rmssd >= 5
        AND b.pulse_mean IS NOT NULL
        AND b.breathing_mean IS NOT NULL
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT 1
    `).get();

    if (recoverable && recoverable.cnt >= 2) {
      const activeExists = db.prepare("SELECT id FROM baselines WHERE is_active = 1 AND status = 'valid'").get();
      if (!activeExists) {
        db.prepare(`
          UPDATE baselines
          SET status = 'valid',
              is_active = 1,
              is_calibrated = 1,
              invalid_reason = null,
              missing_signals = null,
              hrv_rmssd = ?,
              resting_hrv_rmssd = ?,
              hrv_sample_count = ?
          WHERE id = ?
        `).run(
          Number(recoverable.avg_rmssd.toFixed(1)),
          Number(recoverable.avg_rmssd.toFixed(1)),
          recoverable.cnt,
          recoverable.id
        );
      }
    }
  } catch (err) {
    console.warn("[dbWorker] Error in baseline startup reconciliation:", err.message);
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

      case "scenarios:get": {
        const targetId = typeof payload === "string" ? payload.trim() : (payload && payload.id);
        if (!targetId) {
          result = null;
          break;
        }
        const r = db.prepare("SELECT * FROM scenarios WHERE id = ?").get(targetId);
        result = r ? rowToScenario(r) : null;
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

      // -----------------------------------------------------------------------
      // Recordings (Practice Sessions)
      // -----------------------------------------------------------------------
      case "recordings:start": {
        const p = payload || {};
        const id = p.id;
        const now = new Date().toISOString();
        const startedAt = p.startedAt || now;
        const localDate = p.localDate || startedAt.slice(0, 10);
        const timezone = p.timezone || "UTC";
        const scenarioTitle = p.scenarioTitle || "Practice Session";
        const personaName = p.personaName || "Practice Partner";
        const plannedDuration = Number(p.plannedDurationSeconds) || 180;
        const interactionType = p.interactionType || "Difficult Conversations";

        db.prepare(`
          INSERT INTO recordings (
            id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
            baseline_id, interaction_type, started_at, local_date, timezone,
            planned_duration_seconds, duration_seconds, status, video_path, tavus_conversation_id, user_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          p.scenarioId || null,
          scenarioTitle,
          p.personaId || null,
          personaName,
          p.personaAvatarUrl || null,
          p.baselineId || null,
          interactionType,
          startedAt,
          localDate,
          timezone,
          plannedDuration,
          0,
          "recording",
          p.videoPath || null,
          p.tavusConversationId || null,
          "[]",
          now
        );
        result = { id };
        break;
      }

      case "recordings:append-transcript": {
        const { recordingId, segments } = payload || {};
        if (recordingId && Array.isArray(segments) && segments.length > 0) {
          const stmt = db.prepare(`
            INSERT INTO transcript_segments (recording_id, seq, speaker, text, start_ms, end_ms)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          db.transaction(() => {
            for (const s of segments) {
              stmt.run(recordingId, s.seq || 0, s.speaker || "user", s.text || "", s.startMs || 0, s.endMs || 0);
            }
          })();
        }
        result = true;
        break;
      }

      case "recordings:append-vitals": {
        const { recordingId, samples } = payload || {};
        if (recordingId && Array.isArray(samples) && samples.length > 0) {
          const stmt = db.prepare(`
            INSERT INTO vitals_samples (recording_id, timestamp_offset_ms, pulse_bpm, hrv_rmssd, breathing_rate, confidence, is_clean)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          db.transaction(() => {
            for (const s of samples) {
              stmt.run(
                recordingId,
                s.timestampOffsetMs || 0,
                s.pulseBpm ?? null,
                s.hrvRmssd ?? null,
                s.breathingRate ?? null,
                s.confidence ?? null,
                s.isClean ? 1 : 0
              );
            }
          })();
        }
        result = true;
        break;
      }

      case "recordings:finalize": {
        const p = payload || {};
        const id = p.id;
        const now = new Date().toISOString();
        const durationSeconds = Math.max(0, Number(p.durationSeconds) || 0);
        const status = p.status || (durationSeconds >= 30 ? "completed" : "abandoned");
        const endReason = p.endReason || (status === "completed" ? "completed" : "user_quit");

        db.prepare(`
          UPDATE recordings SET
            ended_at = ?,
            duration_seconds = ?,
            duration_minutes = ?,
            status = ?,
            end_reason = ?,
            video_path = COALESCE(?, video_path),
            file_size_bytes = COALESCE(?, file_size_bytes),
            mime_type = COALESCE(?, mime_type),
            layout = COALESCE(?, layout),
            tavus_conversation_id = COALESCE(?, tavus_conversation_id),
            composure_score = ?,
            avg_pulse = ?,
            peak_pulse = ?,
            avg_hrv_rmssd = ?,
            recovery_seconds = ?,
            measured_seconds = ?,
            coverage_ratio = ?,
            video_off_seconds = ?,
            readiness_status = ?,
            nervousness_level = ?,
            pressure_skills = ?,
            pressure_coaching = ?,
            signals_available_count = ?,
            is_partial_score = ?,
            self_reflection_notes = COALESCE(?, self_reflection_notes)
          WHERE id = ?
        `).run(
          p.endedAt || now,
          durationSeconds,
          Math.round((durationSeconds / 60) * 10) / 10,
          status,
          endReason,
          p.videoPath || null,
          p.fileSizeBytes || null,
          p.mimeType || null,
          p.layout || null,
          p.tavusConversationId || null,
          p.composureScore ?? null,
          p.avgPulse ?? null,
          p.peakPulse ?? null,
          p.avgHrvRmssd ?? null,
          p.recoverySeconds ?? null,
          p.measuredSeconds ?? null,
          p.coverageRatio ?? null,
          p.videoOffSeconds ?? 0,
          p.readinessStatus || null,
          p.nervousnessLevel || null,
          p.pressureSkills ? JSON.stringify(p.pressureSkills) : null,
          p.pressureCoaching ? JSON.stringify(p.pressureCoaching) : null,
          p.signalsAvailableCount ?? null,
          p.isPartialScore ? 1 : 0,
          p.selfReflectionNotes || null,
          id
        );
        result = { id, status };
        break;
      }

      case "recordings:reconcile-in-flight": {
        const now = new Date().toISOString();
        const rows = db.prepare("SELECT id, video_path, tavus_conversation_id FROM recordings WHERE status = 'recording'").all();
        db.prepare(`
          UPDATE recordings SET
            status = 'interrupted',
            end_reason = 'app_closed',
            ended_at = ?
          WHERE status = 'recording'
        `).run(now);
        result = rows;
        break;
      }

      case "recordings:get-streak-dates": {
        const rows = db.prepare(`
          SELECT DISTINCT local_date
          FROM recordings
          WHERE status = 'completed' AND duration_seconds >= 30
          ORDER BY local_date DESC
        `).all();
        result = rows.map((r) => r.local_date);
        break;
      }

      case "recordings:list": {
        const cleanLimit = Math.max(1, Math.min(Number(payload?.limit) || 100, 1000));
        const cleanOffset = Math.max(0, Number(payload?.offset) || 0);
        const rows = db.prepare(`
          SELECT id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
                 baseline_id, interaction_type, started_at, ended_at, local_date, timezone,
                 duration_seconds, duration_minutes, status, end_reason, video_path, audio_path,
                 file_size_bytes, mime_type, composure_score, avg_pulse, peak_pulse, avg_hrv_rmssd,
                 recovery_seconds, measured_seconds, coverage_ratio, video_off_seconds, readiness_status,
                 nervousness_level, pressure_skills, pressure_coaching, signals_available_count,
                 is_partial_score, tavus_conversation_id, layout, user_notes, self_reflection_notes, created_at
          FROM recordings
          WHERE NOT (status = 'interrupted' AND duration_seconds = 0)
          ORDER BY started_at DESC
          LIMIT ? OFFSET ?
        `).all(cleanLimit, cleanOffset);

        result = rows.map((r) => ({
          id: r.id,
          scenarioId: r.scenario_id,
          scenarioTitle: r.scenario_title,
          personaId: r.persona_id || undefined,
          personaName: r.persona_name,
          personaAvatarUrl: r.persona_avatar_url || undefined,
          baselineId: r.baseline_id || undefined,
          interactionType: r.interaction_type,
          startedAt: r.started_at,
          endedAt: r.ended_at || undefined,
          localDate: r.local_date,
          date: r.started_at,
          durationSeconds: r.duration_seconds,
          durationMinutes: r.duration_minutes || undefined,
          status: r.status,
          endReason: r.end_reason || undefined,
          videoPath: r.video_path || undefined,
          audioUrl: r.video_path || r.audio_path || undefined,
          fileSizeBytes: r.file_size_bytes || undefined,
          mimeType: r.mime_type || undefined,
          composureScore: r.composure_score ?? undefined,
          avgPulse: r.avg_pulse ?? undefined,
          peakPulse: r.peak_pulse ?? undefined,
          avgHrvRmssd: r.avg_hrv_rmssd ?? undefined,
          recoverySeconds: r.recovery_seconds ?? undefined,
          measuredSeconds: r.measured_seconds ?? undefined,
          coverageRatio: r.coverage_ratio ?? undefined,
          videoOffSeconds: r.video_off_seconds ?? 0,
          readinessStatus: r.readiness_status || undefined,
          nervousnessLevel: r.nervousness_level || undefined,
          pressureSkills: r.pressure_skills ? JSON.parse(r.pressure_skills) : undefined,
          pressureCoaching: r.pressure_coaching ? JSON.parse(r.pressure_coaching) : undefined,
          signalsAvailableCount: r.signals_available_count ?? undefined,
          isPartialScore: Boolean(r.is_partial_score),
          tavusConversationId: r.tavus_conversation_id || undefined,
          layout: r.layout || "stage_v1",
          transcript: [],
          userNotes: JSON.parse(r.user_notes || "[]"),
          selfReflectionNotes: r.self_reflection_notes || undefined,
          createdAt: r.created_at,
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
          const vitalsSamples = db.prepare(
            "SELECT * FROM vitals_samples WHERE recording_id = ? ORDER BY timestamp_offset_ms ASC"
          ).all(idToGet);
          const transcriptSegments = db.prepare(
            "SELECT seq, speaker, text, start_ms AS startMs, end_ms AS endMs FROM transcript_segments WHERE recording_id = ? ORDER BY seq ASC"
          ).all(idToGet);

          result = {
            id: r.id,
            scenarioId: r.scenario_id,
            scenarioTitle: r.scenario_title,
            personaId: r.persona_id || undefined,
            personaName: r.persona_name,
            personaAvatarUrl: r.persona_avatar_url || undefined,
            baselineId: r.baseline_id || undefined,
            interactionType: r.interaction_type,
            startedAt: r.started_at,
            endedAt: r.ended_at || undefined,
            localDate: r.local_date,
            date: r.started_at,
            durationSeconds: r.duration_seconds,
            durationMinutes: r.duration_minutes || undefined,
            status: r.status,
            endReason: r.end_reason || undefined,
            videoPath: r.video_path || undefined,
            audioUrl: r.video_path || r.audio_path || undefined,
            fileSizeBytes: r.file_size_bytes || undefined,
            mimeType: r.mime_type || undefined,
            composureScore: r.composure_score ?? undefined,
            avgPulse: r.avg_pulse ?? undefined,
            peakPulse: r.peak_pulse ?? undefined,
            avgHrvRmssd: r.avg_hrv_rmssd ?? undefined,
            recoverySeconds: r.recovery_seconds ?? undefined,
            measuredSeconds: r.measured_seconds ?? undefined,
            coverageRatio: r.coverage_ratio ?? undefined,
            videoOffSeconds: r.video_off_seconds ?? 0,
            readinessStatus: r.readiness_status || undefined,
            nervousnessLevel: r.nervousness_level || undefined,
            pressureSkills: r.pressure_skills ? JSON.parse(r.pressure_skills) : undefined,
            pressureCoaching: r.pressure_coaching ? JSON.parse(r.pressure_coaching) : undefined,
            signalsAvailableCount: r.signals_available_count ?? undefined,
            isPartialScore: Boolean(r.is_partial_score),
            tavusConversationId: r.tavus_conversation_id || undefined,
            layout: r.layout || "stage_v1",
            transcript: transcriptSegments,
            transcriptSegments,
            userNotes: notes,
            notes,
            vitalsSamples,
            selfReflectionNotes: r.self_reflection_notes || undefined,
            createdAt: r.created_at,
          };
        }
        break;
      }

      case "recordings:save": {
        const rec = payload;
        const now = new Date().toISOString();
        const id = rec.id || `rec-${Date.now()}`;
        const startedAt = rec.startedAt || rec.date || now;
        const localDate = rec.localDate || startedAt.slice(0, 10);
        const durationSeconds = rec.durationSeconds ?? 0;

        db.prepare(`
          INSERT INTO recordings (
            id, scenario_id, scenario_title, persona_id, persona_name, persona_avatar_url,
            started_at, ended_at, local_date, timezone, planned_duration_seconds,
            duration_seconds, status, video_path, composure_score, avg_pulse, peak_pulse,
            avg_hrv_rmssd, recovery_seconds, user_notes, self_reflection_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            scenario_title = excluded.scenario_title,
            user_notes = excluded.user_notes,
            composure_score = excluded.composure_score,
            self_reflection_notes = excluded.self_reflection_notes
        `).run(
          id,
          rec.scenarioId || null,
          rec.scenarioTitle || "Rehearsal Session",
          rec.personaId || null,
          rec.personaName || "Practice Partner",
          rec.personaAvatarUrl || null,
          startedAt,
          rec.endedAt || now,
          localDate,
          rec.timezone || "UTC",
          rec.plannedDurationSeconds || 180,
          durationSeconds,
          rec.status || (durationSeconds >= 30 ? "completed" : "abandoned"),
          rec.videoPath || rec.audioUrl || null,
          rec.composureScore ?? null,
          rec.avgPulse ?? null,
          rec.peakPulse ?? null,
          rec.avgHrvRmssd ?? null,
          rec.recoverySeconds ?? null,
          JSON.stringify(rec.notes || rec.userNotes || []),
          rec.selfReflectionNotes || null,
          rec.createdAt || now
        );

        // Insert vitals samples if provided (delete+reinsert for idempotency)
        if (Array.isArray(rec.vitalsSamples) && rec.vitalsSamples.length > 0) {
          db.prepare("DELETE FROM vitals_samples WHERE recording_id = ?").run(id);
          const insertVital = db.prepare(`
            INSERT INTO vitals_samples (recording_id, timestamp_offset_ms, pulse_bpm, hrv_rmssd, breathing_rate, confidence, is_clean)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const v of rec.vitalsSamples) {
            insertVital.run(
              id,
              v.timestampMs ?? v.timestamp_offset_ms ?? 0,
              v.pulseRateBpm ?? v.pulse_bpm ?? null,
              v.hrv_rmssd ?? v.hrvRmssd ?? null,
              v.breathingRate ?? v.breathing_rate ?? null,
              v.pulseConfidence ?? v.confidence ?? null,
              v.pulseStable ? 1 : 0
            );
          }
        }

        // Sync initial notes into recording_notes table (on INSERT only, skip on UPDATE)
        const initialNotes = rec.notes || rec.userNotes || [];
        if (Array.isArray(initialNotes) && initialNotes.length > 0) {
          const existingNoteCount = db.prepare("SELECT count(*) as c FROM recording_notes WHERE recording_id = ?").get(id);
          if (existingNoteCount && existingNoteCount.c === 0) {
            const insertNote = db.prepare(`
              INSERT OR IGNORE INTO recording_notes (id, recording_id, timestamp_seconds, note_text, author, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            const nowNote = new Date().toISOString();
            for (const n of initialNotes) {
              insertNote.run(
                n.id || `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                id,
                n.timestampSeconds || 0,
                n.text || n.noteText || "",
                n.author || "User",
                n.createdAt || nowNote
              );
            }
          }
        }

        result = { ...rec, id };
        break;
      }

      case "recordings:delete": {
        const idToDelete = payload;
        if (typeof idToDelete !== "string" || !idToDelete.trim()) {
          result = false;
          break;
        }
        const cleanId = idToDelete.trim();
        const row = db.prepare("SELECT video_path, audio_path FROM recordings WHERE id = ?").get(cleanId);
        db.prepare("DELETE FROM recordings WHERE id = ?").run(cleanId);

        // Delete associated recording directory if exists
        try {
          const sessionDir = path.join(recordingsDir, "sessions", cleanId);
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
          if (row?.audio_path && fs.existsSync(row.audio_path)) {
            fs.unlinkSync(row.audio_path);
          }
        } catch (err) {
          console.warn("[dbWorker] Error cleaning up recording files:", err.message);
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

      // -----------------------------------------------------------------------
      // Baselines (Calm Baseline Calibration)
      // -----------------------------------------------------------------------
      case "baseline:get":
      case "baseline:get-active":
      case "baselines:get-active": {
        // Query single active valid baseline (legacy rows are excluded)
        const b = db.prepare("SELECT * FROM baselines WHERE is_active = 1 AND status = 'valid' ORDER BY measured_at DESC LIMIT 1").get();
        result = rowToBaseline(b);
        break;
      }

      case "baselines:finalize":
      case "baseline:save": {
        const payloadObj = payload || {};
        const summary = payloadObj.summary || payloadObj;
        const samples = payloadObj.samples || [];
        const provenance = payloadObj.provenance || {};
        const now = new Date().toISOString();
        const baseId = payloadObj.id || `baseline-${Date.now()}-${crypto.randomUUID()}`;

        const isValid = summary.isValid !== undefined ? Boolean(summary.isValid) : Boolean(payloadObj.isCalibrated ?? true);
        const status = isValid ? "valid" : (summary.status === "incomplete" ? "incomplete" : "invalid");
        const invalidReason = summary.invalidReason || payloadObj.invalidReason || null;
        const missingSignals = summary.missingSignals || payloadObj.missingSignals || null;
        const targetSeconds = payloadObj.targetSeconds ?? summary.targetSeconds ?? 90;
        const actualSeconds = payloadObj.actualSeconds ?? summary.actualSeconds ?? summary.durationSeconds ?? 90;

        let shouldBeActive = 0;

        db.transaction(() => {
          if (isValid) {
            const activeRow = db.prepare("SELECT id FROM baselines WHERE is_active = 1 AND status = 'valid'").get();
            const hasActive = Boolean(activeRow);
            if (!hasActive || payloadObj.makeActive === true) {
              shouldBeActive = 1;
              db.prepare("UPDATE baselines SET is_active = 0 WHERE is_active = 1").run();
            } else {
              shouldBeActive = 0;
            }
          } else {
            shouldBeActive = 0;
          }

          const pulseVal = summary.pulseMean ?? payloadObj.restingPulse ?? null;
          const hrvVal = summary.hrvRmssd ?? payloadObj.restingHrvRmssd ?? null;
          const breathingVal = summary.breathingMean ?? payloadObj.restingBreathingRate ?? null;
          const baevskyVal = summary.hrvBaevsky ?? payloadObj.restingBaevsky ?? null;

          db.prepare(`
            INSERT INTO baselines (
              id, status, invalid_reason, missing_signals, is_active, quality_score,
              target_seconds, actual_seconds,
              pulse_mean, pulse_median, pulse_min, pulse_max, pulse_sd, pulse_confidence, pulse_sample_count,
              hrv_rmssd, hrv_sdnn, hrv_mean_nn, hrv_baevsky, hrv_confidence, hrv_sample_count,
              breathing_mean, breathing_sd, breathing_confidence, breathing_sample_count,
              blink_count, blink_rate_per_min, expression_map, dominant_expression,
              eda_mean, eda_sd, eda_slope,
              face_present_ratio, talking_ratio, motion_ratio, validation_histogram,
              camera_label, camera_resolution, camera_fps, local_date, timezone,
              started_at, ended_at, duration_seconds, measured_at,
              sdk_version, requested_metrics, video_path,
              resting_pulse, resting_hrv_rmssd, resting_breathing_rate, resting_baevsky,
              is_calibrated, created_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              invalid_reason = excluded.invalid_reason,
              missing_signals = excluded.missing_signals,
              target_seconds = excluded.target_seconds,
              actual_seconds = excluded.actual_seconds,
              is_active = excluded.is_active,
              quality_score = excluded.quality_score,
              pulse_mean = excluded.pulse_mean,
              hrv_rmssd = excluded.hrv_rmssd,
              breathing_mean = excluded.breathing_mean,
              measured_at = excluded.measured_at
          `).run(
            baseId,
            status,
            invalidReason,
            missingSignals ? JSON.stringify(missingSignals) : null,
            shouldBeActive,
            summary.qualityScore ?? null,
            targetSeconds,
            actualSeconds,
            summary.pulseMean ?? null,
            summary.pulseMedian ?? null,
            summary.pulseMin ?? null,
            summary.pulseMax ?? null,
            summary.pulseSd ?? null,
            summary.pulseConfidence ?? null,
            summary.pulseSampleCount ?? 0,
            summary.hrvRmssd ?? null,
            summary.hrvSdnn ?? null,
            summary.hrvMeanNn ?? null,
            summary.hrvBaevsky ?? null,
            summary.hrvConfidence ?? null,
            summary.hrvSampleCount ?? 0,
            summary.breathingMean ?? null,
            summary.breathingSd ?? null,
            summary.breathingConfidence ?? null,
            summary.breathingSampleCount ?? 0,
            summary.blinkCount ?? 0,
            summary.blinkRatePerMin ?? 0,
            summary.expressionMap ? JSON.stringify(summary.expressionMap) : null,
            summary.dominantExpression || null,
            summary.edaMean ?? null,
            summary.edaSd ?? null,
            summary.edaSlope ?? null,
            summary.facePresentRatio ?? 0,
            summary.talkingRatio ?? 0,
            summary.motionRatio ?? 0,
            summary.validationHistogram ? JSON.stringify(summary.validationHistogram) : null,
            provenance.cameraLabel || null,
            provenance.cameraResolution || null,
            provenance.cameraFps ?? null,
            provenance.localDate || null,
            provenance.timezone || null,
            provenance.startedAt || now,
            provenance.endedAt || now,
            actualSeconds,
            now,
            provenance.sdkVersion || "3.5.0",
            provenance.requestedMetrics ? JSON.stringify(provenance.requestedMetrics) : null,
            payloadObj.videoPath || null,
            pulseVal,
            hrvVal,
            breathingVal,
            baevskyVal,
            isValid ? 1 : 0,
            now
          );

          // Insert downsampled telemetry samples if provided
          if (Array.isArray(samples) && samples.length > 0) {
            const insertSampleStmt = db.prepare(`
              INSERT OR REPLACE INTO baseline_samples (
                id, baseline_id, t_ms, pulse, pulse_conf, pulse_stable,
                breathing, breathing_conf, breathing_stable,
                hrv_rmssd, hrv_sdnn, hrv_conf, hrv_stable,
                eda, blink, validation_code, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (let i = 0; i < samples.length; i++) {
              const s = samples[i];
              const sampleId = `${baseId}-s-${i}`;
              insertSampleStmt.run(
                sampleId,
                baseId,
                s.tMs || (i * 1000),
                s.pulse ?? null,
                s.pulseConfidence ?? null,
                s.pulseStable ? 1 : 0,
                s.breathingRate ?? null,
                s.breathingConfidence ?? null,
                s.breathingStable ? 1 : 0,
                s.hrvRmssd ?? null,
                s.hrvSdnn ?? null,
                s.hrvConfidence ?? null,
                s.hrvStable ? 1 : 0,
                s.eda ?? null,
                s.blinkDetected ? 1 : 0,
                s.validationCode != null ? String(s.validationCode) : null,
                now
              );
            }
          }
        })();

        const savedRow = db.prepare("SELECT * FROM baselines WHERE id = ?").get(baseId);
        result = rowToBaseline(savedRow);
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
