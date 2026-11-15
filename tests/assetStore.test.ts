import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveAssetPath,
  downloadFaceAsset,
  toAssetUrl,
  sanitizeId,
} = require("../electron/tavus/assetStore.cjs");

const TEST_DIR = path.join(process.cwd(), "tmp_test_assets_" + Date.now());

describe("Milestone M5: Asset Store & Traversal Security", () => {
  before(() => {
    fs.mkdirSync(path.join(TEST_DIR, "images", "faces"), { recursive: true });
    // Write a sample dummy asset
    fs.writeFileSync(path.join(TEST_DIR, "images", "faces", "sample.png"), "png_bytes");
  });

  after(() => {
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("Resolves valid relative paths inside images directory", () => {
    const resolved = resolveAssetPath(TEST_DIR, "faces/sample.png");
    assert.ok(resolved);
    assert.equal(resolved, path.resolve(TEST_DIR, "images", "faces", "sample.png"));
  });

  test("Rejects directory traversal attempts", () => {
    const traversal1 = resolveAssetPath(TEST_DIR, "../../etc/passwd");
    assert.equal(traversal1, null);

    const traversal2 = resolveAssetPath(TEST_DIR, "faces/../../secret.txt");
    assert.equal(traversal2, null);

    const traversal3 = resolveAssetPath(TEST_DIR, "/absolute/path/outside");
    assert.equal(traversal3, null);
  });

  test("Converts relative paths to mocktwo-asset:// protocol URLs", () => {
    const url = toAssetUrl("faces/sample.png");
    assert.equal(url, "mocktwo-asset://faces/sample.png");
  });

  test("Sanitizes face identifiers cleanly", () => {
    assert.equal(sanitizeId("face/123?foo=bar#baz"), "face_123_foo_bar_baz");
    assert.equal(sanitizeId("rc9cff32ceba"), "rc9cff32ceba");
  });

  test("Rejects insecure HTTP URLs when downloading", async () => {
    await assert.rejects(
      async () => {
        await downloadFaceAsset(TEST_DIR, "face_1", "http://insecure.com/face.png");
      },
      (err: any) => {
        assert.match(err.message, /Insecure protocol/);
        return true;
      }
    );
  });

  test("Downloads and saves valid HTTPS image with correct extension", async () => {
    const mockFetch = async () => ({
      ok: true,
      headers: {
        get: (h: string) => (h === "content-type" ? "image/png" : null),
      },
      arrayBuffer: async () => Buffer.from("mock_png_data"),
    });

    const relPath = await downloadFaceAsset(TEST_DIR, "face_test_1", "https://cdn.example.com/face.png", mockFetch as any);
    assert.ok(relPath);
    assert.equal(relPath, path.join("faces", "face_test_1.png"));
    assert.ok(fs.existsSync(path.join(TEST_DIR, "images", relPath)));
  });
});
