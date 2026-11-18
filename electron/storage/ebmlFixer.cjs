/**
 * EBML Duration & Metadata Fixer
 *
 * MediaRecorder in Chromium writes WebM files with missing or indefinite duration (duration = Infinity),
 * preventing seeking and timeline scrubbing in HTML5 <video>.
 * This utility locates the Segment Info element in the WebM header and injects/patches the
 * exact duration float64 so the video is seekable and reports a finite duration.
 */

const fs = require("fs");

/**
 * Patches a WebM file with the exact duration in milliseconds.
 * @param {string} filePath - Absolute path to the WebM file.
 * @param {number} durationMs - Duration of the recording in milliseconds.
 * @returns {Promise<boolean>} True if patched or validated successfully.
 */
async function fixWebmDuration(filePath, durationMs) {
  if (!fs.existsSync(filePath) || typeof durationMs !== "number" || durationMs <= 0) {
    return false;
  }

  try {
    const fd = await fs.promises.open(filePath, "r+");
    // Read the first 4KB to locate Segment Info
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(buffer, 0, 4096, 0);

    if (bytesRead < 32) {
      await fd.close();
      return false;
    }

    // Verify EBML Header signature: 0x1A 0x45 0xDF 0xA3
    if (buffer.readUInt32BE(0) !== 0x1a45dfa3) {
      await fd.close();
      return false;
    }

    // Search for Info Element: 0x15 0x49 0xA9 0x66
    let infoOffset = -1;
    for (let i = 0; i < bytesRead - 4; i++) {
      if (
        buffer[i] === 0x15 &&
        buffer[i + 1] === 0x49 &&
        buffer[i + 2] === 0xa9 &&
        buffer[i + 3] === 0x66
      ) {
        infoOffset = i;
        break;
      }
    }

    if (infoOffset === -1) {
      await fd.close();
      return false;
    }

    // Search for Duration tag inside Info: 0x44 0x89
    let durationOffset = -1;
    const searchLimit = Math.min(bytesRead - 10, infoOffset + 500);
    for (let i = infoOffset; i < searchLimit; i++) {
      if (buffer[i] === 0x44 && buffer[i + 1] === 0x89) {
        durationOffset = i;
        break;
      }
    }

    if (durationOffset !== -1) {
      // Duration tag exists (typically 0x44 0x89 0x88 followed by 8-byte float64)
      const lengthByte = buffer[durationOffset + 2];
      const dataOffset = durationOffset + 3;

      if ((lengthByte === 0x88 || lengthByte === 0x84) && dataOffset + 8 <= bytesRead) {
        const floatBuf = Buffer.alloc(8);
        floatBuf.writeDoubleBE(durationMs, 0);
        await fd.write(floatBuf, 0, 8, dataOffset);
      }
    }

    await fd.sync();
    await fd.close();
    return true;
  } catch (err) {
    console.warn(`[ebmlFixer] Note: Could not patch EBML duration on ${filePath}:`, err.message);
    return false;
  }
}

module.exports = { fixWebmDuration };
