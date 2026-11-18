/**
 * tavusClient.cjs
 *
 * Dedicated client for Tavus API communication from Electron main process.
 * Enforces 15s timeouts, GET retry logic, error classification, and secret redaction.
 */

const DEFAULT_BASE_URL = "https://tavusapi.com";
const { getConfig } = require("../config/seedConfig.cjs");

function redactSecrets(str) {
  if (typeof str !== "string") {
    try {
      str = JSON.stringify(str);
    } catch {
      str = String(str);
    }
  }
  return str
    .replace(/tvsk_[a-zA-Z0-9_-]+/g, "tvsk_***REDACTED***")
    .replace(/(x-api-key\s*[:=]\s*)[^\s,]+/gi, "$1***REDACTED***")
    .replace(/(authorization\s*[:=]\s*Bearer\s+)[^\s,]+/gi, "$1***REDACTED***");
}

class TavusApiError extends Error {
  constructor(code, message, status = 0, details = null) {
    super(redactSecrets(message));
    this.name = "TavusApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class TavusClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.TAVUS_API_KEY || "";
    this.baseUrl = (options.baseUrl || process.env.TAVUS_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  getHeaders() {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new TavusApiError("no_api_key", "Tavus API key is not configured.");
    }
    return {
      "x-api-key": this.apiKey.trim(),
      "Content-Type": "application/json",
    };
  }

  async request(method, path, body = null, isIdempotent = false, options = {}) {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    let headers;
    try {
      headers = this.getHeaders();
    } catch (err) {
      throw err;
    }

    const conf = getConfig();
    const timeoutMs = options.timeoutMs || conf.TAVUS_REQUEST_TIMEOUT_MS;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : conf.TAVUS_REQUEST_MAX_RETRIES;
    const maxAttempts = isIdempotent ? Math.max(1, maxRetries + 1) : 1;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const fetchOptions = {
          method,
          headers,
          signal: controller.signal,
        };
        if (body !== null && method !== "GET" && method !== "HEAD") {
          fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        const response = await this.fetchImpl(url, fetchOptions);
        clearTimeout(timer);

        if (response.status === 204) {
          return null;
        }

        let responseData = null;
        const text = await response.text();
        if (text) {
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = text;
          }
        }

        if (response.ok) {
          return responseData;
        }

        // Map HTTP error statuses
        const status = response.status;
        let code = "server";
        let message = `Tavus API returned status ${status}`;

        if (responseData && typeof responseData === "object") {
          message = responseData.message || responseData.error || responseData.detail || message;
        } else if (typeof responseData === "string" && responseData.length > 0) {
          message = responseData.slice(0, 300);
        }

        if (status === 401) {
          code = "unauthorized";
          message = "Tavus API key is invalid or unauthorized (401).";
        } else if (status === 402 || status === 403) {
          code = "plan_limit";
          message = `Tavus plan limit or permission denied (${status}): ${message}`;
        } else if (status === 400 || status === 422) {
          code = "validation";
        } else if (status === 429) {
          code = "rate_limited";
          message = "Tavus API rate limit exceeded (429). Please try again shortly.";
        } else if (status >= 500) {
          code = "server";
        }

        const apiErr = new TavusApiError(code, message, status, responseData);

        // If idempotent and 5xx, retry
        if (isIdempotent && status >= 500 && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }

        throw apiErr;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof TavusApiError) {
          throw err;
        }

        const isTimeout = err.name === "AbortError";
        const code = isTimeout ? "timeout" : "offline";
        const message = isTimeout
          ? `Request to Tavus timed out after ${timeoutMs / 1000}s.`
          : `Network request failed: ${err.message}`;

        lastError = new TavusApiError(code, message, 0);

        if (isIdempotent && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new TavusApiError("server", "Unexpected request failure");
  }

  /**
   * Get single face (pre-flight health check).
   */
  async getFace(faceId) {
    if (!faceId) throw new TavusApiError("validation", "faceId is required");
    return this.request("GET", `/v2/faces/${encodeURIComponent(faceId)}`, null, true);
  }

  /**
   * List system stock faces (page size governed by config).
   */
  async listFaces(params = {}) {
    const conf = getConfig();
    const defaultPageSize = conf.TAVUS_FACES_PAGE_SIZE;
    const cleanLimit = Math.max(1, Math.min(Number(params.limit) || defaultPageSize, 100));
    const queryObj = {
      face_type: "system",
      verbose: "true",
      page: String(params.page || 1),
      limit: String(cleanLimit),
    };
    if (params.model_name || conf.TAVUS_FACE_MODEL_NAME) {
      queryObj.model_name = params.model_name || conf.TAVUS_FACE_MODEL_NAME;
    }
    const q = new URLSearchParams(queryObj);
    return this.request("GET", `/v2/faces?${q.toString()}`, null, true);
  }

  /**
   * List system stock voices (page size governed by config).
   */
  async listVoices(params = {}) {
    const conf = getConfig();
    const defaultPageSize = conf.SEED_BATCH_SIZE;
    const cleanLimit = Math.max(1, Math.min(Number(params.limit) || defaultPageSize, 100));
    const q = new URLSearchParams({
      source: "system",
      page: String(params.page || 1),
      limit: String(cleanLimit),
      sort: "asc",
    });
    return this.request("GET", `/v2/voices?${q.toString()}`, null, true);
  }

  /**
   * List PALs (page size governed by config).
   */
  async listPals(params = {}) {
    const conf = getConfig();
    const defaultPageSize = conf.SEED_BATCH_SIZE;
    const cleanLimit = Math.max(1, Math.min(Number(params.limit) || defaultPageSize, 100));
    const q = new URLSearchParams();
    q.set("page", String(params.page || 1));
    q.set("limit", String(cleanLimit));
    const qs = q.toString();
    return this.request("GET", `/v2/pals?${qs}`, null, true);
  }

  /**
   * Get single PAL.
   */
  async getPal(palId) {
    if (!palId) throw new TavusApiError("validation", "palId is required");
    return this.request("GET", `/v2/pals/${encodeURIComponent(palId)}`, null, true);
  }

  /**
   * Create PAL.
   */
  async createPal(palPayload) {
    return this.request("POST", "/v2/pals", palPayload, false);
  }

  /**
   * Patch PAL using RFC 6902 JSON Patch.
   */
  async patchPal(palId, patchOps, options = {}) {
    if (!palId) throw new TavusApiError("validation", "palId is required");
    if (!Array.isArray(patchOps)) throw new TavusApiError("validation", "patchOps must be an array");
    const q = options.force ? "?force=true" : "";
    return this.request("PATCH", `/v2/pals/${encodeURIComponent(palId)}${q}`, patchOps, false);
  }

  /**
   * Delete PAL.
   */
  async deletePal(palId) {
    if (!palId) throw new TavusApiError("validation", "palId is required");
    try {
      return await this.request("DELETE", `/v2/pals/${encodeURIComponent(palId)}`, null, false);
    } catch (err) {
      if (err.status === 404) {
        // Treat 404 on delete as success (already gone)
        return null;
      }
      throw err;
    }
  }

  /**
   * Create Conversation (CVI).
   */
  async createConversation(payload, options = {}) {
    if (!payload || typeof payload !== "object") {
      throw new TavusApiError("validation", "Conversation payload must be an object");
    }
    return this.request("POST", "/v2/conversations", payload, false, options);
  }

  /**
   * Get Conversation status/details.
   */
  async getConversation(conversationId, options = {}) {
    if (!conversationId) throw new TavusApiError("validation", "conversationId is required");
    return this.request("GET", `/v2/conversations/${encodeURIComponent(conversationId)}`, null, true, options);
  }

  /**
   * End Conversation.
   * Routine cleanup: idempotent, safe to call if already ended or 404.
   */
  async endConversation(conversationId, options = {}) {
    if (!conversationId) throw new TavusApiError("validation", "conversationId is required");
    try {
      return await this.request("POST", `/v2/conversations/${encodeURIComponent(conversationId)}/end`, null, false, options);
    } catch (err) {
      if (err.status === 404 || (err.details && String(err.details.error || "").toLowerCase().includes("ended"))) {
        return { ended: true };
      }
      throw err;
    }
  }
}

module.exports = {
  TavusClient,
  TavusApiError,
  redactSecrets,
};
