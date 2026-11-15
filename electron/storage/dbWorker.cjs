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
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersionRow = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
  const currentVersion = currentVersionRow && currentVersionRow.version ? currentVersionRow.version : 0;

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
        const rows = db.prepare("SELECT * FROM personas ORDER BY name ASC").all();
        result = rows.map((r) => ({
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
          scenariosCount: r.scenarios_count,
          pressureLevel: r.pressure_level || "Moderate",
          source: r.source,
        }));
        break;
      }

      case "personas:create": {
        const item = payload;
        const now = new Date().toISOString();
        const id = item.id || `persona-${Date.now()}`;
        const monogram = item.monogram || (item.name ? item.name.slice(0, 2).toUpperCase() : "PA");
        db.prepare(`
          INSERT INTO personas (
            id, name, avatar_url, monogram, title, context_setting, seniority,
            language, temperament_traits, voice, backstory, communication_notes,
            scenarios_count, pressure_level, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          item.name || "Practice Partner",
          item.avatarUrl || null,
          monogram,
          item.title || item.role || "Specialist",
          item.contextSetting || item.setting || "General Rehearsal",
          item.seniority || "Professional",
          item.language || "English (US)",
          JSON.stringify(item.temperamentTraits || []),
          item.voice || "Default",
          item.backstory || "",
          item.communicationNotes || "",
          item.scenariosCount || 0,
          item.pressureLevel || "Moderate",
          item.source || "Mine",
          now,
          now
        );
        result = { ...item, id, monogram };
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
            updated_at = ?
          WHERE id = ?
        `).run(
          p.name || existing.name,
          p.avatarUrl !== undefined ? p.avatarUrl : existing.avatar_url,
          monogram,
          p.title || existing.title || "Specialist",
          p.contextSetting || existing.context_setting || "Meeting",
          p.seniority || existing.seniority || "Mid-Level",
          p.language || existing.language || "English (US)",
          JSON.stringify(p.temperamentTraits || JSON.parse(existing.temperament_traits || "[]")),
          p.voice || existing.voice || "Default",
          p.backstory !== undefined ? p.backstory : existing.backstory,
          p.communicationNotes !== undefined ? p.communicationNotes : existing.communication_notes,
          p.scenariosCount !== undefined ? p.scenariosCount : existing.scenarios_count,
          p.pressureLevel || existing.pressure_level || "Moderate",
          p.source || existing.source || "Mine",
          now,
          targetId
        );
        result = { ...existing, ...p, id: targetId, monogram };
        break;
      }

      case "personas:delete": {
        if (typeof payload !== "string" || !payload.trim()) {
          result = false;
          break;
        }
        db.prepare("DELETE FROM personas WHERE id = ?").run(payload.trim());
        result = true;
        break;
      }

      // Scenarios
      case "scenarios:list": {
        const rows = db.prepare("SELECT * FROM scenarios ORDER BY created_at DESC").all();
        result = rows.map((r) => ({
          id: r.id,
          title: r.title,
          personaId: r.persona_id || undefined,
          personaName: r.persona_name,
          contextSetting: r.context_setting,
          seniority: r.seniority,
          interactionType: r.interaction_type,
          difficulty: r.difficulty,
          durationMinutes: r.duration_minutes,
          summary: r.summary,
          context: r.context,
          personaMood: r.persona_mood || undefined,
          learningObjectives: JSON.parse(r.learning_objectives || "[]"),
          keyChallenges: JSON.parse(r.key_challenges || "[]"),
          recommendedPhrases: JSON.parse(r.recommended_phrases || "[]"),
          personaAvatarUrl: r.persona_avatar_url || undefined,
          personaSummary: r.persona_summary || undefined,
          source: r.source,
          submissionStatus: r.submission_status || undefined,
          createdAt: r.created_at,
        }));
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
            persona_avatar_url, persona_summary, source, submission_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          sc.source || "Mine",
          sc.submissionStatus || null,
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
        db.prepare("DELETE FROM scenarios WHERE id = ?").run(payload.trim());
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

      default:
        throw new Error(`Unknown storage operation: ${type}`);
    }

    parentPort.postMessage({ id, success: true, result });
  } catch (error) {
    parentPort.postMessage({ id, success: false, error: error.message });
  }
});
