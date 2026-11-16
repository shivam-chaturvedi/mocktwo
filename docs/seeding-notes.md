# Seeding & Tavus Audit Notes

## Phase 0 Audit Findings

### 1. Hard-Coded Limits & Tunables Audit
| File | Line | Current Value | Meaning | Target Config Variable |
|---|---|---|---|---|
| `electron/tavus/tavusClient.cjs` | 9 | `15000` | HTTP Request Timeout (ms) | `TAVUS_REQUEST_TIMEOUT_MS` |
| `electron/tavus/tavusClient.cjs` | 61 | `3` | Max Idempotent HTTP Retries | `TAVUS_REQUEST_MAX_RETRIES` |
| `electron/tavus/tavusClient.cjs` | 165 | `20` | Max Faces per Page | `TAVUS_FACES_PAGE_SIZE` |
| `electron/tavus/tavusClient.cjs` | 179 | `20` | Max Voices per Page | `SEED_BATCH_SIZE` / `TAVUS_FACES_PAGE_SIZE` |
| `electron/tavus/tavusClient.cjs` | 193 | `20` | Max PALs per Page | `SEED_BATCH_SIZE` |
| `electron/main.cjs` | 1189 | `24 * 60 * 60 * 1000` | Tavus Catalog Cache TTL (24h) | `TAVUS_CATALOG_CACHE_TTL_MS` |
| `electron/main.cjs` | 1209 | `20` | Faces IPC limit | `TAVUS_FACES_PAGE_SIZE` |
| `electron/main.cjs` | 1230 | `24 * 60 * 60 * 1000` | Voices IPC Cache TTL | `TAVUS_CATALOG_CACHE_TTL_MS` |
| `electron/main.cjs` | 1250 | `20` | Voices IPC limit | `SEED_BATCH_SIZE` |
| `electron/storage/dbWorker.cjs` | 515 | `20` | Personas page size limit default | `UI_LIST_PAGE_SIZE` |
| `electron/storage/dbWorker.cjs` | 905 | `20` | Scenarios page size limit default | `UI_LIST_PAGE_SIZE` |
| `src/context/AppContext.tsx` | 130 | `20` | Scenario list fetch limit | `UI_LIST_PAGE_SIZE` |
| `src/context/AppContext.tsx` | 142 | `20` | Persona list fetch limit | `UI_LIST_PAGE_SIZE` |
| `src/context/AppContext.tsx` | 151 | `20` | Recording list fetch limit | `UI_LIST_PAGE_SIZE` |
| `src/components/common/StudioSheet.tsx` | 219 | `20` | Initial visible stock avatar count | `UI_LIST_PAGE_SIZE` |
| `src/components/common/StudioSheet.tsx` | 277 | `20` | Visible face count reset on load | `UI_LIST_PAGE_SIZE` |
| `src/components/common/StudioSheet.tsx` | 2022 | `20` | Avatar "Load More" increment | `UI_LIST_PAGE_SIZE` |
| `src/components/common/CommandPalette.tsx` | 44 | `20` | Quick search slice limit | `UI_LIST_PAGE_SIZE` |

### 2. Current SQLite Schema & Validators Analysis
- **Migrations Run:**
  - `schema_migrations` records applied versions (`version INTEGER PRIMARY KEY`, `applied_at TEXT`).
  - Migration transactions use `db.transaction()` around `db.exec(...)`.
- **Personas Schema (`personas` table):**
  - Columns present: `id`, `name`, `avatar_url`, `monogram`, `title`, `context_setting`, `seniority`, `language`, `temperament_traits`, `voice`, `backstory`, `communication_notes`, `scenarios_count`, `pressure_level`, `source`, `created_at`, `updated_at`, `tavus_pal_id`, `tavus_face_id`, `tavus_voice_id`, `face_name`, `face_image_path`, `greeting`, `compiled_system_prompt`, `pal_settings`, `sync_status`, `sync_error_code`, `sync_error`, `sync_hash`, `sync_attempt_at`, `last_synced_at`, `hidden`.
  - Column name verification: The column is `tavus_face_id` (NOT `tavus_replica_id`).
  - Pressure level: Values are `"Moderate" | "High" | "Intense"` (per `electron/tavus/validation.cjs` and `promptBuilder.cjs`).
- **Scenarios Schema (`scenarios` table):**
  - Columns present: `id`, `title`, `persona_id`, `persona_name`, `context_setting`, `seniority`, `interaction_type`, `difficulty`, `duration_minutes` (NOT NULL, legacy default 3), `summary`, `context` (stores the situation), `persona_mood`, `learning_objectives`, `key_challenges`, `recommended_phrases`, `persona_avatar_url`, `persona_summary`, `source`, `submission_status`, `created_at`, `updated_at`, `opening_line`, `builtin_key` (UNIQUE), `hidden`.
- **Zod Validator Contracts:**
  - `PersonaInputSchema`: `name` (1–80), `title` (max 120), `contextSetting` (max 120), `seniority` (max 60), `language` (max 16), `pressureLevel` (`"Moderate" | "High" | "Intense"`), `temperamentTraits` (array max 15 of max 40 chars), `backstory` (max 1200), `communicationNotes` (max 1000), `greeting` (max 160), `monogram` (max 8).
  - `ScenarioStudioSchema`: `title` (3–100), `personaId` (1–100), `interactionType` (enum `CATEGORIES`), `difficulty` (enum `DIFFICULTIES`), `context` (10–2000), `keyChallenges` (0–5 items of 1–200 chars), `learningObjectives` (1–5 items of 1–200 chars), `openingLine` (0–160 chars).

### 3. Real Tavus API Response Shape (Observed via live dev call)
- **Endpoint:** `GET https://tavusapi.com/v2/faces?face_type=system&verbose=true&page=1&limit=2`
- **Envelope:**
  ```json
  {
    "data": [ ... ],
    "total_count": 142
  }
  ```
- **Real Record Fields:**
  - `face_id`: string (e.g. `"r9d30b0e55ac"`)
  - `face_name`: string (e.g. `"Luna"`)
  - `face_type`: `"system"`
  - `status`: `"completed"`
  - `model_name`: `"phoenix-3"`
  - `default_voice_id`: string (e.g. `"v650ca13b1237"`)
  - `original_voice_id`: string (e.g. `"v650ca13b1237"`)
  - `thumbnail_video_url`: string (`.mp4` URL)
  - `thumbnail_image_url`: string (`.jpg` URL)
  - `available_for_plan`: boolean (`true`)
  - `tags`: array of objects:
    ```json
    [
      { "tag_id": "casual", "tag_name": "casual", "tag_display_name": "Casual" },
      { "tag_id": "female", "tag_name": "female", "tag_display_name": "Female" },
      { "tag_id": "home", "tag_name": "home", "tag_display_name": "Home" }
    ]
    ```
- **Important Observations:**
  - Gender is not a top-level string property; it is stored inside `tags` as an object where `tag_id === "female"` or `tag_id === "male"`.
  - Usable stock faces have `status === "completed"` and a non-empty `default_voice_id`.
