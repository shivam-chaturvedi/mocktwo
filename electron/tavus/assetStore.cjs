/**
 * assetStore.cjs
 *
 * Manages downloading, storing, and resolving local cached assets (faces/previews)
 * within the Electron userData directory.
 * Enforces HTTPS-only downloads, 5MB limits, MIME validation, and traversal protection.
 */

const fs = require("fs");
const path = require("path");

const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

function sanitizeId(id) {
  if (!id || typeof id !== "string") return "unknown";
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
}

/**
 * Resolves a relative asset path safely inside <userData>/images.
 * Throws or returns null if path traversal is detected.
 */
function resolveAssetPath(userDataPath, relativePath) {
  if (!userDataPath || !relativePath || typeof relativePath !== "string") {
    return null;
  }

  if (relativePath.includes("\0")) {
    return null;
  }

  // Reject absolute paths on filesystem
  if (path.isAbsolute(relativePath)) {
    return null;
  }

  const baseDir = path.resolve(userDataPath, "images");
  // Normalize and clean leading slashes/hostnames from URL paths
  const cleanRelative = relativePath.replace(/^mocktwo-asset:\/\//, "").replace(/^\/+/, "");
  const targetPath = path.resolve(baseDir, cleanRelative);

  // Traversal guard: target must start with baseDir
  if (!targetPath.startsWith(baseDir + path.sep) && targetPath !== baseDir) {
    return null;
  }

  return targetPath;
}

/**
 * Downloads a remote HTTPS asset and stores it in <userData>/images/faces/<faceId>.<ext>.
 *
 * @param {string} userDataPath
 * @param {string} faceId
 * @param {string} remoteUrl
 * @param {Function} [fetchImpl]
 * @returns {Promise<string|null>} Relative path under images/ or null on skip/error
 */
async function downloadFaceAsset(userDataPath, faceId, remoteUrl, fetchImpl = globalThis.fetch) {
  if (!remoteUrl || typeof remoteUrl !== "string") return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(remoteUrl);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(`Insecure protocol: ${parsedUrl.protocol}. Only HTTPS is permitted.`);
  }

  const safeFaceId = sanitizeId(faceId);
  const targetDir = path.join(userDataPath, "images", "faces");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetchImpl(remoteUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_ASSET_SIZE_BYTES) {
      throw new Error(`Asset exceeds 5 MB limit (${arrayBuffer.byteLength} bytes)`);
    }

    let ext = ".bin";
    if (contentType === "image/jpeg") ext = ".jpg";
    else if (contentType === "image/png") ext = ".png";
    else if (contentType === "image/webp") ext = ".webp";
    else if (contentType === "video/mp4") ext = ".mp4";
    else if (contentType === "video/webm") ext = ".webm";

    const fileName = `${safeFaceId}${ext}`;
    const filePath = path.join(targetDir, fileName);

    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return path.join("faces", fileName);
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Formats a relative path into a mocktwo-asset:// URL
 */
function toAssetUrl(relativePath) {
  if (!relativePath) return "";
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `mocktwo-asset://${clean}`;
}

module.exports = {
  resolveAssetPath,
  downloadFaceAsset,
  toAssetUrl,
  sanitizeId,
  MAX_ASSET_SIZE_BYTES,
};
