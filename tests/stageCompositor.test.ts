import test from "node:test";
import assert from "node:assert/strict";
import { StageCompositor } from "../src/services/recording/stageCompositor.ts";

test("StageCompositor: Initializes canvas stream, mixes audio graph, updates captions, and cleans up on destroy", () => {
  // 1. Mock document.createElement("canvas")
  const originalDocument = (globalThis as any).document;
  const originalWindow = (globalThis as any).window;
  const originalAudioContext = (globalThis as any).AudioContext;
  const originalMediaStream = (globalThis as any).MediaStream;
  const originalRaf = (globalThis as any).requestAnimationFrame;
  const originalCaf = (globalThis as any).cancelAnimationFrame;

  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

  let canvasStreamStopped = false;
  let audioContextClosed = false;
  let micGainValue = 1.0;

  class MockMediaStream {
    tracks: any[] = [];
    constructor(tracks: any[] = []) {
      this.tracks = tracks;
    }
    getVideoTracks() {
      return this.tracks.filter((t) => t.kind === "video");
    }
    getAudioTracks() {
      return this.tracks.filter((t) => t.kind === "audio");
    }
    getTracks() {
      return this.tracks;
    }
  }

  (globalThis as any).MediaStream = MockMediaStream;

  const mockTrack = {
    kind: "video",
    readyState: "live",
    stop: () => {
      canvasStreamStopped = true;
    },
  };

  const mockAudioTrack = {
    kind: "audio",
    readyState: "live",
    stop: () => {},
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      fillRect: () => {},
      drawImage: () => {},
      fillText: () => {},
      measureText: () => ({ width: 100 }),
      beginPath: () => {},
      arc: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      clip: () => {},
      translate: () => {},
      scale: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
    captureStream: () => ({
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => [],
      getTracks: () => [mockTrack],
    }),
  };

  const mockDestination = {
    stream: {
      getAudioTracks: () => [mockAudioTrack],
    },
  };

  const mockGainNode = {
    gain: {
      value: 1.0,
      setValueAtTime: (val: number) => {
        micGainValue = val;
      },
    },
    connect: () => {},
  };

  class MockAudioContext {
    currentTime = 0;
    state = "running";
    createMediaStreamDestination() {
      return mockDestination;
    }
    createMediaStreamSource() {
      return {
        connect: () => {},
        disconnect: () => {},
      };
    }
    createGain() {
      return mockGainNode;
    }
    async close() {
      audioContextClosed = true;
      this.state = "closed";
    }
  }

  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === "canvas") return mockCanvas;
      if (tag === "video") return { play: async () => {}, srcObject: null };
      return {};
    },
  };

  (globalThis as any).window = globalThis;
  (globalThis as any).AudioContext = MockAudioContext;

  try {
    const userMicTrack = {
      kind: "audio",
      readyState: "live",
      stop: () => {},
    } as unknown as MediaStreamTrack;

    const remoteAudioTrack = {
      kind: "audio",
      readyState: "live",
      stop: () => {},
    } as unknown as MediaStreamTrack;

    const compositor = new StageCompositor({
      remoteVideoElement: null,
      userVideoElement: null,
      userMicTrack,
      remoteAudioTrack,
      isUserCameraActive: () => true,
      personaName: "Dr. Amara Bennett",
      userInitials: "SH",
      getElapsedSeconds: () => 45,
    });

    const stream = compositor.getStream();
    assert.ok(stream, "Compositor must return a valid MediaStream");

    // Test mic muting gain control
    compositor.setMicMuted(true);
    assert.strictEqual(micGainValue, 0, "Gain value should be 0 when mic is muted");
    compositor.setMicMuted(false);
    assert.strictEqual(micGainValue, 1, "Gain value should be 1 when mic is unmuted");

    // Test remote audio reconnect
    compositor.setRemoteAudioTrack(null);
    compositor.setRemoteAudioTrack(remoteAudioTrack);

    // Test setting captions
    compositor.setCaption("Dr. Amara Bennett", "Let us discuss the contract renewal.");
    compositor.setCaption("You", "I agree, let's explore terms.");

    // Test teardown idempotency
    compositor.destroy();
    compositor.destroy(); // Second call must be a safe no-op
    assert.strictEqual(canvasStreamStopped, true, "Canvas tracks must be stopped on destroy");
    assert.strictEqual(audioContextClosed, true, "AudioContext must be closed on destroy");
  } finally {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
    (globalThis as any).AudioContext = originalAudioContext;
    (globalThis as any).MediaStream = originalMediaStream;
    (globalThis as any).requestAnimationFrame = originalRaf;
    (globalThis as any).cancelAnimationFrame = originalCaf;
  }
});
