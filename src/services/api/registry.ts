import type { ServiceRegistry } from "./types";
import {
  EmptyAuthService,
  EmptyProfileService,
  EmptyScenarioService,
  EmptyPersonaService,
  EmptySessionService,
  EmptyRecordingService,
  EmptyProgressService,
  EmptyBiometricsService,
  DefaultSettingsService,
} from "./emptyAdapters";
import {
  SqliteProfileService,
  SqliteScenarioService,
  SqlitePersonaService,
  SqliteRecordingService,
  SqliteProgressService,
  SqliteBiometricsService,
  SqliteSettingsService,
  migrateLocalStorageToSqlite,
} from "./sqliteAdapters";

export function createDefaultServiceRegistry(): ServiceRegistry {
  const hasSqlite = typeof window !== "undefined" && Boolean(window.electronAPI?.storage);

  if (hasSqlite) {
    migrateLocalStorageToSqlite().catch((err) => {
      console.error("[registry] LocalStorage to SQLite migration error:", err);
    });

    const profile = new SqliteProfileService();
    const personas = new SqlitePersonaService();
    const scenarios = new SqliteScenarioService();
    const recordings = new SqliteRecordingService();
    const progress = new SqliteProgressService(recordings, profile);
    const biometrics = new SqliteBiometricsService();
    const settings = new SqliteSettingsService();

    return {
      auth: new EmptyAuthService(),
      profile,
      scenarios,
      personas,
      session: new EmptySessionService(),
      recordings,
      progress,
      biometrics,
      settings,
    };
  }

  return {
    auth: new EmptyAuthService(),
    profile: new EmptyProfileService(),
    scenarios: new EmptyScenarioService(),
    personas: new EmptyPersonaService(),
    session: new EmptySessionService(),
    recordings: new EmptyRecordingService(),
    progress: new EmptyProgressService(),
    biometrics: new EmptyBiometricsService(),
    settings: new DefaultSettingsService(),
  };
}

// Global service registry instance for the application
export const serviceRegistry: ServiceRegistry = createDefaultServiceRegistry();
