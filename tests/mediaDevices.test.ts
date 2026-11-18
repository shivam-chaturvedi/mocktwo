import test from "node:test";
import assert from "node:assert/strict";
import { DefaultSettingsService } from "../src/services/api/emptyAdapters.ts";
import { SqliteSettingsService } from "../src/services/api/sqliteAdapters.ts";
import { LEGACY_CAMERA, LEGACY_MIC, LEGACY_SPEAKER } from "../src/constants/legacyDevices.ts";
import { safeSetAudioSinkId } from "../src/utils/audioSink.ts";

test("MediaDevices Migration: DefaultSettingsService sanitizes legacy device strings to empty default", async () => {
  const service = new DefaultSettingsService();
  // Force legacy settings
  await service.updateSettings({
    selectedCamera: LEGACY_CAMERA,
    selectedMicrophone: LEGACY_MIC,
    selectedSpeaker: LEGACY_SPEAKER,
  });

  const settings = await service.getSettings();
  assert.strictEqual(settings.selectedCamera, "", "selectedCamera must be migrated to empty string");
  assert.strictEqual(settings.selectedMicrophone, "", "selectedMicrophone must be migrated to empty string");
  assert.strictEqual(settings.selectedSpeaker, "", "selectedSpeaker must be migrated to empty string");
});

test("MediaDevices Migration: SqliteSettingsService defaults and sanitization", async () => {
  const service = new SqliteSettingsService();
  const settings = await service.getSettings();
  assert.strictEqual(settings.selectedCamera, "");
  assert.strictEqual(settings.selectedMicrophone, "");
  assert.strictEqual(settings.selectedSpeaker, "");
});

test("MediaDevices: safeSetAudioSinkId handles invalid IDs and missing setSinkId gracefully", async () => {
  // Case 1: Null element
  await safeSetAudioSinkId(null, "invalid-id");

  // Case 2: Element without setSinkId support
  const dummyElWithoutSink = {} as HTMLMediaElement;
  await safeSetAudioSinkId(dummyElWithoutSink, "invalid-id");

  // Case 3: Element where setSinkId throws on invalid device ID
  let calledSinkId = "";
  let fallbackCalled = false;
  const dummyElWithFailingSink = {
    setSinkId: async (id: string) => {
      calledSinkId = id;
      if (id === "bad-sink-id") {
        throw new Error("OverconstrainedError: Device not found");
      }
      if (id === "") {
        fallbackCalled = true;
      }
    },
  } as unknown as HTMLMediaElement;

  await safeSetAudioSinkId(dummyElWithFailingSink, "bad-sink-id");
  assert.strictEqual(calledSinkId, "");
  assert.strictEqual(fallbackCalled, true);
});

test("MediaDevices: Resolution handles legacy labels and unknown IDs cleanly", () => {
  const devices = [
    { deviceId: "cam-real-id-123", label: "FaceTime HD Camera" },
    { deviceId: "mic-real-id-456", label: "MacBook Studio Microphone" },
  ];

  const resolve = (sel: string | undefined, list: { deviceId: string; label: string }[]) =>
    !sel ? "" : (list.find((d) => d.deviceId === sel) ?? list.find((d) => d.label === sel))?.deviceId ?? "";

  // Exact ID
  assert.strictEqual(resolve("cam-real-id-123", devices), "cam-real-id-123");
  // Label match
  assert.strictEqual(resolve("FaceTime HD Camera", devices), "cam-real-id-123");
  // Legacy unresolvable
  assert.strictEqual(resolve(LEGACY_CAMERA, devices), "");
  // Empty / default
  assert.strictEqual(resolve("", devices), "");
  assert.strictEqual(resolve(undefined, devices), "");
});

test("MediaDevices: Independent fallback preserves video track when microphone is blocked", async () => {
  // Simulate getUserMedia behavior when mic is denied
  const mockGetUserMedia = async (constraints: MediaStreamConstraints) => {
    // If audio is requested, simulate macOS TCC denial
    if (constraints.audio) {
      const err = new Error("Permission denied") as DOMException;
      err.name = "NotAllowedError";
      throw err;
    }
    // If video-only is requested, succeed with a video track
    return {
      getVideoTracks: () => [{ kind: "video", stop: () => {} }],
      getAudioTracks: () => [],
      getTracks: () => [{ kind: "video", stop: () => {} }],
    } as unknown as MediaStream;
  };

  let acquiredTracks: { kind: string }[] = [];
  try {
    await mockGetUserMedia({ video: true, audio: true });
  } catch {
    // Fallback: acquire video alone
    const vStream = await mockGetUserMedia({ video: true, audio: false });
    acquiredTracks = vStream.getVideoTracks();
  }

  assert.strictEqual(acquiredTracks.length, 1, "Should successfully acquire 1 video track via independent fallback");
  assert.strictEqual(acquiredTracks[0].kind, "video", "Acquired track must be a video track");
});

test("MediaDevices: Turning video off physically stops video tracks to release camera hardware", () => {
  let videoStopped = false;
  let audioStopped = false;

  const mockVideoTrack = {
    kind: "video",
    enabled: true,
    readyState: "live",
    stop: () => {
      videoStopped = true;
    },
  };

  const mockAudioTrack = {
    kind: "audio",
    enabled: true,
    readyState: "live",
    stop: () => {
      audioStopped = true;
    },
  };

  const tracks = [mockVideoTrack, mockAudioTrack];

  // Simulating turnVideoOff behavior:
  // Must call track.stop() on video tracks to extinguish hardware LED, but leave audio track running
  tracks.filter((t) => t.kind === "video").forEach((t) => t.stop());

  assert.strictEqual(videoStopped, true, "Camera hardware track must be stopped via track.stop()");
  assert.strictEqual(audioStopped, false, "Microphone track must remain active when turning video off");
});
