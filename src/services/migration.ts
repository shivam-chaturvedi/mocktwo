export const CURRENT_DATA_VERSION = 2;
export const DATA_VERSION_KEY = "mocktwo_data_version";

export interface MigrationResult {
  migrated: boolean;
  clearedKeys: string[];
  previousVersion: number | null;
  currentVersion: number;
}

/**
 * Runs a one-time migration on application startup.
 * If dataVersion is missing or less than CURRENT_DATA_VERSION,
 * deletes all legacy mock data keys from localStorage.
 */
export function runDataMigration(storage: Storage = window.localStorage): MigrationResult {
  const versionRaw = storage.getItem(DATA_VERSION_KEY);
  const previousVersion = versionRaw ? parseInt(versionRaw, 10) : null;

  if (previousVersion !== null && previousVersion >= CURRENT_DATA_VERSION) {
    return {
      migrated: false,
      clearedKeys: [],
      previousVersion,
      currentVersion: CURRENT_DATA_VERSION,
    };
  }

  const clearedKeys: string[] = [];
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;

    // Identify legacy keys from old Hotel Coach or mocktwo demo runs
    if (
      key.startsWith("hc_") ||
      key.startsWith("m2_") ||
      key.startsWith("hotel_") ||
      key.startsWith("mocktwo_demo_") ||
      key.startsWith("mocktwo_persisted_") ||
      key === "mocktwo_user" ||
      key === "mocktwo_scenarios" ||
      key === "mocktwo_recordings"
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
    clearedKeys.push(key);
  }

  storage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION));

  return {
    migrated: true,
    clearedKeys,
    previousVersion,
    currentVersion: CURRENT_DATA_VERSION,
  };
}
