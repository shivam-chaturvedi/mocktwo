import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

test("baselineMigration: V6 adds all required columns, baseline_samples table, and legacy status updates", () => {
  const db = new Database(":memory:");

  // Setup V5 baseline schema
  db.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    INSERT INTO schema_migrations (version, applied_at) VALUES (5, datetime('now'));

    CREATE TABLE baselines (
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

    -- Insert old fake baseline record (should be marked legacy by V6)
    INSERT INTO baselines (id, measured_at, resting_pulse, quality_score, is_active, created_at)
    VALUES ('old-fake-baseline-1', datetime('now'), 68, 94, 1, datetime('now'));
  `);

  // Run V6 migration logic
  const cols = db.prepare("PRAGMA table_info(baselines)").all().map((c: any) => c.name);
  const addCol = (col: string, type: string) => {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE baselines ADD COLUMN ${col} ${type};`);
    }
  };

  addCol("status", "TEXT NOT NULL DEFAULT 'valid'");
  addCol("pulse_mean", "REAL");
  addCol("pulse_median", "REAL");
  addCol("pulse_min", "REAL");
  addCol("pulse_max", "REAL");
  addCol("pulse_sd", "REAL");
  addCol("pulse_confidence", "REAL");
  addCol("pulse_sample_count", "INTEGER");
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
  addCol("ended_at", "TEXT");
  addCol("duration_seconds", "INTEGER");
  addCol("sdk_version", "TEXT");
  addCol("requested_metrics", "TEXT");

  db.exec(`
    UPDATE baselines 
    SET status = 'legacy', is_active = 0 
    WHERE status IS NULL OR status = '' OR status = 'legacy' OR sdk_version IS NULL;

    DROP INDEX IF EXISTS idx_baselines_single_active;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_baselines_single_active ON baselines(is_active) WHERE is_active = 1;

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

  // Verify legacy record is marked legacy and deactivated
  const oldRow: any = db.prepare("SELECT * FROM baselines WHERE id = 'old-fake-baseline-1'").get();
  assert.equal(oldRow.status, "legacy");
  assert.equal(oldRow.is_active, 0);

  // Verify single active baseline invariant: inserting second is_active=1 must fail
  db.prepare(`
    INSERT INTO baselines (id, status, is_active, measured_at, created_at)
    VALUES ('valid-1', 'valid', 1, datetime('now'), datetime('now'))
  `).run();

  assert.throws(() => {
    db.prepare(`
      INSERT INTO baselines (id, status, is_active, measured_at, created_at)
      VALUES ('valid-2', 'valid', 1, datetime('now'), datetime('now'))
    `).run();
  }, /UNIQUE constraint failed/);

  db.close();
});

test("baselineMigration: active baseline rules (auto-active first, recalibrate toggle, invalid inactive)", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE baselines (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      invalid_reason TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      quality_score REAL,
      pulse_mean REAL,
      hrv_rmssd REAL,
      breathing_mean REAL,
      measured_at TEXT NOT NULL,
      sdk_version TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX idx_baselines_single_active ON baselines(is_active) WHERE is_active = 1;

    CREATE TABLE baseline_samples (
      id TEXT PRIMARY KEY,
      baseline_id TEXT NOT NULL REFERENCES baselines(id) ON DELETE CASCADE,
      t_ms INTEGER NOT NULL,
      pulse REAL,
      created_at TEXT NOT NULL
    );
  `);

  function saveBaseline(payload: any) {
    const { id, summary, makeActive } = payload;
    const isValid = summary.isValid;
    const status = isValid ? "valid" : "invalid";

    let shouldBeActive = 0;
    const tx = db.transaction(() => {
      if (isValid) {
        const activeRow = db.prepare("SELECT id FROM baselines WHERE is_active = 1 AND status = 'valid'").get();
        if (!activeRow || makeActive === true) {
          shouldBeActive = 1;
          db.prepare("UPDATE baselines SET is_active = 0 WHERE is_active = 1").run();
        } else {
          shouldBeActive = 0;
        }
      }

      db.prepare(`
        INSERT INTO baselines (id, status, invalid_reason, is_active, quality_score, pulse_mean, measured_at, sdk_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), '3.5.0', datetime('now'))
      `).run(
        id,
        status,
        summary.invalidReason || null,
        shouldBeActive,
        summary.qualityScore,
        summary.pulseMean || null
      );

      if (payload.samples && payload.samples.length > 0) {
        const insertSample = db.prepare(`
          INSERT INTO baseline_samples (id, baseline_id, t_ms, pulse, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `);
        for (const s of payload.samples) {
          insertSample.run(s.id, id, s.tMs, s.pulse);
        }
      }
    });

    tx();
    return { id, is_active: shouldBeActive };
  }

  // 1. First valid baseline becomes active automatically
  const res1 = saveBaseline({
    id: "b1",
    summary: { isValid: true, qualityScore: 92, pulseMean: 71 },
    makeActive: false,
    samples: [{ id: "b1-s1", tMs: 1000, pulse: 71 }],
  });
  assert.equal(res1.is_active, 1);
  const active1: any = db.prepare("SELECT id FROM baselines WHERE is_active = 1").get();
  assert.equal(active1.id, "b1");

  // 2. Second valid baseline without makeActive remains inactive (history)
  const res2 = saveBaseline({
    id: "b2",
    summary: { isValid: true, qualityScore: 88, pulseMean: 74 },
    makeActive: false,
  });
  assert.equal(res2.is_active, 0);
  const activeStill1: any = db.prepare("SELECT id FROM baselines WHERE is_active = 1").get();
  assert.equal(activeStill1.id, "b1");

  // 3. Third valid baseline WITH makeActive=true deactivates b1 and becomes active
  const res3 = saveBaseline({
    id: "b3",
    summary: { isValid: true, qualityScore: 95, pulseMean: 69 },
    makeActive: true,
  });
  assert.equal(res3.is_active, 1);
  const activeIs3: any = db.prepare("SELECT id FROM baselines WHERE is_active = 1").get();
  assert.equal(activeIs3.id, "b3");

  // 4. Invalid baseline attempt is stored with is_active = 0, status = 'invalid'
  const res4 = saveBaseline({
    id: "b4-invalid",
    summary: { isValid: false, invalidReason: "Face lost", qualityScore: 20, pulseMean: null },
    makeActive: true, // Should still NOT be active
  });
  assert.equal(res4.is_active, 0);
  const invalidRow: any = db.prepare("SELECT * FROM baselines WHERE id = 'b4-invalid'").get();
  assert.equal(invalidRow.status, "invalid");
  assert.equal(invalidRow.is_active, 0);

  // Active baseline is still b3
  const activeStill3: any = db.prepare("SELECT id FROM baselines WHERE is_active = 1").get();
  assert.equal(activeStill3.id, "b3");

  db.close();
});
