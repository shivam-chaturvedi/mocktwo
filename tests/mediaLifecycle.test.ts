import { test } from "node:test";
import assert from "node:assert/strict";
import {
  registerMediaStream,
  unregisterMediaStream,
  registerAudioContext,
  unregisterAudioContext,
  registerCleanupHandler,
  releaseAllMediaResources,
  type TrackableMediaStream,
  type TrackableAudioContext,
} from "../src/utils/mediaLifecycle.ts";

test("mediaLifecycle: stops all tracks on registered streams when releaseAllMediaResources is called", () => {
  let videoStopped = false;
  let audioStopped = false;

  const mockStream: TrackableMediaStream = {
    getTracks: () => [
      {
        stop: () => {
          videoStopped = true;
        },
        readyState: "live",
      },
      {
        stop: () => {
          audioStopped = true;
        },
        readyState: "live",
      },
    ],
  };

  registerMediaStream(mockStream);
  releaseAllMediaResources();

  assert.equal(videoStopped, true, "Video track must be stopped");
  assert.equal(audioStopped, true, "Audio track must be stopped");
});

test("mediaLifecycle: closes all registered AudioContext instances on releaseAllMediaResources", async () => {
  let closed = false;

  const mockAudioContext: TrackableAudioContext = {
    state: "running",
    close: async () => {
      closed = true;
    },
  };

  registerAudioContext(mockAudioContext);
  releaseAllMediaResources();

  assert.equal(closed, true, "AudioContext must be closed");
});

test("mediaLifecycle: executes all custom cleanup handlers (e.g. native SDK destroy) on release", () => {
  let customCleanupExecuted = false;

  const unregister = registerCleanupHandler(() => {
    customCleanupExecuted = true;
  });

  releaseAllMediaResources();

  assert.equal(customCleanupExecuted, true, "Cleanup handler must be executed");
});

test("mediaLifecycle: resilient to throwing track.stop() or context.close()", () => {
  let secondTrackStopped = false;

  const failingStream: TrackableMediaStream = {
    getTracks: () => [
      {
        stop: () => {
          throw new Error("Hardware device disconnect error");
        },
      },
      {
        stop: () => {
          secondTrackStopped = true;
        },
      },
    ],
  };

  registerMediaStream(failingStream);

  assert.doesNotThrow(() => {
    releaseAllMediaResources();
  }, "releaseAllMediaResources must never throw when tracks fail");

  assert.equal(secondTrackStopped, true, "Remaining tracks must still be stopped");
});

test("mediaLifecycle: unregister removes stream from release list", () => {
  let stopped = false;

  const mockStream: TrackableMediaStream = {
    getTracks: () => [
      {
        stop: () => {
          stopped = true;
        },
      },
    ],
  };

  registerMediaStream(mockStream);
  unregisterMediaStream(mockStream);

  releaseAllMediaResources();

  assert.equal(stopped, false, "Unregistered stream should not be stopped again by lifecycle manager");
});
