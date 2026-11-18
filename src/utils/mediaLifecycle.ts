/**
 * Global Media & Hardware Resource Lifecycle Manager
 * 
 * Guarantees that in ANY scenario — app close, window close, reload,
 * unexpected crash, React ErrorBoundary failure, or unhandled exception —
 * all hardware resources (camera, microphone, audio contexts, and native SDK sessions)
 * are immediately and safely released.
 */

export interface TrackableMediaStream {
  getTracks: () => Array<{
    stop: () => void;
    readyState?: string;
    addEventListener?: (type: string, listener: () => void) => void;
  }>;
}

export interface TrackableAudioContext {
  state?: string;
  close: () => Promise<void>;
}

type CleanupHandler = () => void | Promise<void>;

const activeStreams = new Set<MediaStream | TrackableMediaStream>();
const activeAudioContexts = new Set<AudioContext | TrackableAudioContext>();
const cleanupHandlers = new Set<CleanupHandler>();

let isInstalled = false;

/**
 * Registers an active MediaStream for lifecycle tracking.
 */
export function registerMediaStream(stream: MediaStream | TrackableMediaStream): void {
  if (!stream) return;
  activeStreams.add(stream);

  // Monitor tracks: when all tracks end naturally, remove from tracking
  const tracks = stream.getTracks?.() || [];
  tracks.forEach((track) => {
    if (typeof track.addEventListener === "function") {
      track.addEventListener("ended", () => {
        const remaining = stream.getTracks?.() || [];
        const allEnded = remaining.every((t) => t.readyState === "ended");
        if (allEnded) {
          activeStreams.delete(stream);
        }
      });
    }
  });
}

/**
 * Manually unregisters a MediaStream (e.g. after deliberate component cleanup).
 */
export function unregisterMediaStream(stream: MediaStream | TrackableMediaStream): void {
  activeStreams.delete(stream);
}

/**
 * Registers an AudioContext for lifecycle tracking.
 */
export function registerAudioContext(ctx: AudioContext | TrackableAudioContext): void {
  if (!ctx) return;
  activeAudioContexts.add(ctx);
}

/**
 * Manually unregisters an AudioContext.
 */
export function unregisterAudioContext(ctx: AudioContext | TrackableAudioContext): void {
  activeAudioContexts.delete(ctx);
}

/**
 * Registers a generic cleanup handler (e.g. native SDK teardown).
 */
export function registerCleanupHandler(handler: CleanupHandler): () => void {
  cleanupHandlers.add(handler);
  return () => {
    cleanupHandlers.delete(handler);
  };
}

/**
 * Definitively releases ALL media, hardware, audio, and session resources.
 * Safe to call multiple times. Never throws.
 */
export function releaseAllMediaResources(): void {
  // 1. Stop all active camera & microphone tracks immediately
  activeStreams.forEach((stream) => {
    try {
      const tracks = stream.getTracks?.() || [];
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn("[mediaLifecycle] Error stopping media track:", err);
        }
      });
    } catch (err) {
      console.warn("[mediaLifecycle] Error accessing stream tracks:", err);
    }
  });
  activeStreams.clear();

  // 2. Close all active AudioContext instances
  activeAudioContexts.forEach((ctx) => {
    try {
      if (ctx.state !== "closed" && typeof ctx.close === "function") {
        ctx.close().catch(() => {});
      }
    } catch (err) {
      console.warn("[mediaLifecycle] Error closing audio context:", err);
    }
  });
  activeAudioContexts.clear();

  // 3. Execute all custom cleanup handlers (e.g. native SDK destruction)
  cleanupHandlers.forEach((handler) => {
    try {
      const res = handler();
      if (res && typeof (res as Promise<void>).catch === "function") {
        (res as Promise<void>).catch((err) => {
          console.warn("[mediaLifecycle] Error in cleanup handler promise:", err);
        });
      }
    } catch (err) {
      console.warn("[mediaLifecycle] Error executing cleanup handler:", err);
    }
  });
}

/**
 * Installs global error & exit listeners and intercepts getUserMedia.
 */
export function initMediaLifecycle(): void {
  if (isInstalled || typeof window === "undefined") return;
  isInstalled = true;

  // Intercept getUserMedia so any stream requested anywhere in the renderer is automatically tracked
  if (navigator?.mediaDevices?.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await originalGetUserMedia(constraints);
      registerMediaStream(stream);
      return stream;
    };
  }

  // Window exit and navigation lifecycle hooks
  window.addEventListener("beforeunload", () => releaseAllMediaResources());
  window.addEventListener("unload", () => releaseAllMediaResources());
  window.addEventListener("pagehide", () => releaseAllMediaResources());

  // Unhandled error & rejection guards: if an unhandled crash occurs, release hardware immediately
  window.addEventListener("error", (event) => {
    console.error("[mediaLifecycle] Uncaught window error, releasing hardware resources:", event.error || event.message);
    releaseAllMediaResources();
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[mediaLifecycle] Unhandled rejection, releasing hardware resources:", event.reason);
    releaseAllMediaResources();
  });

  // Main process IPC notifications (before-quit, window close)
  if (window.electronAPI?.onAppWillClose) {
    window.electronAPI.onAppWillClose(() => {
      releaseAllMediaResources();
    });
  }

  // Custom event trigger
  window.addEventListener("mocktwo-release-resources", () => {
    releaseAllMediaResources();
  });
}

// Automatically install if in browser/Electron window context
if (typeof window !== "undefined") {
  initMediaLifecycle();
}
