/**
 * seedConfig.cjs
 *
 * Single source of truth for seeding and tuning configuration.
 * Reads environment variables, layers over shipped non-secret defaults,
 * validates strictly using Zod, bounds worker pools to available CPUs,
 * and freezes the returned config object.
 */

const os = require("os");
const path = require("path");
const fs = require("fs");
const { z } = require("zod");

// 1. Shipped non-secret defaults
const DEFAULTS_PATH = path.join(__dirname, "defaultSeedConfig.json");
let shippedDefaults = {};
try {
  if (fs.existsSync(DEFAULTS_PATH)) {
    shippedDefaults = JSON.parse(fs.readFileSync(DEFAULTS_PATH, "utf8"));
  }
} catch (err) {
  console.warn("[seedConfig] Failed to read shipped defaults:", err.message);
}

// 2. Load .env properly for dev and packaged Electron app
function loadDotenv(app) {
  try {
    const dotenv = require("dotenv");
    const candidates = [];
    if (app) {
      if (typeof app.getPath === "function") {
        candidates.push(path.join(app.getPath("userData"), ".env"));
      }
      if (typeof app.getAppPath === "function") {
        candidates.push(path.join(app.getAppPath(), ".env"));
      }
      if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, ".env"));
      }
    }
    candidates.push(path.join(process.cwd(), ".env"));

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
      }
    }
  } catch (err) {
    console.warn("[seedConfig] dotenv loading warning:", err.message);
  }
}

// 3. Schema definition with strict type conversions
const SeedConfigSchema = z
  .object({
    SEED_ENABLED: z.boolean(),
    SEED_BATCH_SIZE: z.number().int().min(1).max(500),
    SEED_WORKER_MIN_THREADS: z.number().int().min(1),
    SEED_WORKER_MAX_THREADS: z.number().int().min(1),
    SEED_WORKER_IDLE_MS: z.number().int().min(500).max(300000),
    SEED_MAX_ATTEMPTS_PER_SESSION: z.number().int().min(1).max(50),
    SEED_BACKOFF_BASE_MS: z.number().int().min(100).max(60000),
    SEED_BACKOFF_MAX_MS: z.number().int().min(1000).max(300000),
    SEED_FACE_POOL_MULTIPLIER: z.number().int().min(1).max(20),
    SEED_STARTUP_DELAY_MS: z.number().int().min(0).max(60000),

    TAVUS_FACES_PAGE_SIZE: z.number().int().min(1).max(100),
    TAVUS_FACES_MAX_PAGES: z.number().int().min(1).max(100),
    TAVUS_FACE_MODEL_NAME: z.string(),
    TAVUS_REQUEST_TIMEOUT_MS: z.number().int().min(1000).max(120000),
    TAVUS_REQUEST_MAX_RETRIES: z.number().int().min(0).max(10),
    TAVUS_CATALOG_CACHE_TTL_MS: z.number().int().min(1000).max(604800000),

    UI_LIST_PAGE_SIZE: z.number().int().min(1).max(200),
    MAIN_THREAD_LAG_BUDGET_MS: z.number().int().min(10).max(1000),
  })
  .refine((data) => data.SEED_WORKER_MIN_THREADS <= data.SEED_WORKER_MAX_THREADS, {
    message: "SEED_WORKER_MIN_THREADS must be <= SEED_WORKER_MAX_THREADS",
    path: ["SEED_WORKER_MIN_THREADS"],
  })
  .refine((data) => data.SEED_BACKOFF_BASE_MS <= data.SEED_BACKOFF_MAX_MS, {
    message: "SEED_BACKOFF_BASE_MS must be <= SEED_BACKOFF_MAX_MS",
    path: ["SEED_BACKOFF_BASE_MS"],
  });

function parseEnvValue(key, envVal, defaultVal) {
  if (envVal === undefined || envVal === null || envVal === "") {
    return defaultVal;
  }
  if (typeof defaultVal === "boolean") {
    return envVal === "true" || envVal === "1";
  }
  if (typeof defaultVal === "number") {
    const num = Number(envVal);
    return isNaN(num) ? envVal : num;
  }
  return envVal;
}

let cachedConfig = null;
let configError = null;

function initConfig(appInstance) {
  if (cachedConfig) return cachedConfig;
  loadDotenv(appInstance);

  const raw = {};
  for (const [key, defaultVal] of Object.entries(shippedDefaults)) {
    raw[key] = parseEnvValue(key, process.env[key], defaultVal);
  }

  // Also clamp worker threads to available parallelism:
  // Pool max threads = clamp(SEED_WORKER_MAX_THREADS, 1, max(1, os.availableParallelism() - 1))
  const cpuCount = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  const maxAllowedThreads = Math.max(1, cpuCount - 1);

  if (typeof raw.SEED_WORKER_MAX_THREADS === "number") {
    raw.SEED_WORKER_MAX_THREADS = Math.min(Math.max(1, raw.SEED_WORKER_MAX_THREADS), maxAllowedThreads);
  }
  if (typeof raw.SEED_WORKER_MIN_THREADS === "number") {
    raw.SEED_WORKER_MIN_THREADS = Math.min(Math.max(1, raw.SEED_WORKER_MIN_THREADS), raw.SEED_WORKER_MAX_THREADS);
  }

  const result = SeedConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    configError = `Invalid seeding configuration: ${issues}`;
    console.error(`[seedConfig] ERROR: ${configError}. Seeding will be disabled.`);
    // Return a safe disabled config so the app can start normally
    cachedConfig = Object.freeze({
      ...shippedDefaults,
      SEED_ENABLED: false,
      __configError: configError,
    });
    return cachedConfig;
  }

  cachedConfig = Object.freeze({
    ...result.data,
    __configError: null,
  });

  // Log resolved config without secrets
  console.log("[seedConfig] Resolved Seeding Configuration:", JSON.stringify(cachedConfig, null, 2));
  return cachedConfig;
}

function getConfig(appInstance) {
  if (!cachedConfig) {
    return initConfig(appInstance);
  }
  return cachedConfig;
}

/**
 * Returns safe public client config for renderer (never includes secrets).
 */
function getClientConfig(appInstance) {
  const conf = getConfig(appInstance);
  return Object.freeze({
    seedEnabled: conf.SEED_ENABLED,
    uiListPageSize: conf.UI_LIST_PAGE_SIZE,
    seedBatchSize: conf.SEED_BATCH_SIZE,
    error: conf.__configError,
  });
}

// For unit testing only: allows resetting cached config
function _resetConfigForTest() {
  cachedConfig = null;
  configError = null;
}

module.exports = {
  initConfig,
  getConfig,
  getClientConfig,
  SeedConfigSchema,
  _resetConfigForTest,
};
