import test from "node:test";
import assert from "node:assert/strict";
import { runDataMigration, CURRENT_DATA_VERSION, DATA_VERSION_KEY } from "./migration.ts";

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test("runDataMigration clears legacy keys when no version exists", () => {
  const storage = new MockStorage();
  storage.setItem("hc_last_guest_123", "guest-1");
  storage.setItem("m2_last_persona_abc", "persona-1");
  storage.setItem("mocktwo_persisted_scenarios", "[{}]");
  storage.setItem("unrelated_key", "keep-me");

  const result = runDataMigration(storage);

  assert.equal(result.migrated, true);
  assert.equal(result.previousVersion, null);
  assert.equal(result.currentVersion, CURRENT_DATA_VERSION);
  assert.ok(result.clearedKeys.includes("hc_last_guest_123"));
  assert.ok(result.clearedKeys.includes("m2_last_persona_abc"));
  assert.ok(result.clearedKeys.includes("mocktwo_persisted_scenarios"));
  assert.equal(storage.getItem("hc_last_guest_123"), null);
  assert.equal(storage.getItem("m2_last_persona_abc"), null);
  assert.equal(storage.getItem("unrelated_key"), "keep-me");
  assert.equal(storage.getItem(DATA_VERSION_KEY), String(CURRENT_DATA_VERSION));
});

test("runDataMigration is a no-op if already on CURRENT_DATA_VERSION", () => {
  const storage = new MockStorage();
  storage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION));
  storage.setItem("hc_new_test", "will-not-clear-without-version-bump");

  const result = runDataMigration(storage);
  assert.equal(result.migrated, false);
  assert.equal(result.clearedKeys.length, 0);
  assert.equal(result.previousVersion, CURRENT_DATA_VERSION);
  assert.equal(storage.getItem("hc_new_test"), "will-not-clear-without-version-bump");
});
