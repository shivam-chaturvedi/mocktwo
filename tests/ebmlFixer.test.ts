import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { fixWebmDuration } = require("../electron/storage/ebmlFixer.cjs");

test("ebmlFixer: handles non-existent or invalid files safely without throwing", async () => {
  const result = await fixWebmDuration("/tmp/non-existent-recording.webm", 60000);
  assert.strictEqual(result, false);

  const tmpFile = path.join(os.tmpdir(), `test-invalid-${Date.now()}.webm`);
  fs.writeFileSync(tmpFile, Buffer.from("NOT_A_WEBM"));
  try {
    const res = await fixWebmDuration(tmpFile, 60000);
    assert.strictEqual(res, false);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test("ebmlFixer: patches EBML header duration tag correctly", async () => {
  const tmpFile = path.join(os.tmpdir(), `test-valid-${Date.now()}.webm`);
  // Synthesize minimal valid EBML header with Info element and Duration tag
  const buf = Buffer.alloc(128);
  buf.writeUInt32BE(0x1a45dfa3, 0); // EBML ID
  buf[4] = 0x15; buf[5] = 0x49; buf[6] = 0xa9; buf[7] = 0x66; // Info Element
  buf[8] = 0x44; buf[9] = 0x89; buf[10] = 0x88; // Duration Tag (8-byte float)
  buf.writeDoubleBE(0, 11); // Initial 0 duration

  fs.writeFileSync(tmpFile, buf);
  try {
    const res = await fixWebmDuration(tmpFile, 65000);
    assert.strictEqual(res, true);

    const patched = fs.readFileSync(tmpFile);
    const patchedDuration = patched.readDoubleBE(11);
    assert.strictEqual(patchedDuration, 65000);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});
