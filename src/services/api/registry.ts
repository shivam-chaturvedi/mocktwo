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

export function createDefaultServiceRegistry(): ServiceRegistry {
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
