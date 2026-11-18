/**
 * CameraManager
 *
 * Single source of truth and lifecycle owner for video capture hardware across mocktwo.
 * Enforces true physical release of macOS camera hardware (stopping tracks, not just enabled=false).
 */

export type TrackListener = (track: MediaStreamTrack | null) => void;

interface TrackRegistryEntry {
  consumerId: string;
  track: MediaStreamTrack;
  createdAt: number;
  stack?: string;
}

class CameraManagerService {
  private activeSourceTrack: MediaStreamTrack | null = null;
  private currentDeviceId: string | undefined = undefined;
  private listeners = new Set<TrackListener>();
  private consumerRegistry = new Map<string, TrackRegistryEntry>();

  /**
   * Acquires the physical camera hardware with requested deviceId or system default.
   */
  async acquire(deviceId?: string): Promise<MediaStreamTrack> {
    this.currentDeviceId = deviceId;

    // If an existing live track matches the requested device, return it
    if (this.activeSourceTrack && this.activeSourceTrack.readyState === "live") {
      const currentSetting = this.activeSourceTrack.getSettings?.();
      if (!deviceId || currentSetting?.deviceId === deviceId) {
        return this.activeSourceTrack;
      }
    }

    // Otherwise release any existing track first
    this.release();

    if (typeof window !== "undefined" && window.electronAPI?.requestMediaAccess) {
      try {
        await window.electronAPI.requestMediaAccess("camera");
      } catch {}
    }

    const vConstraints: boolean | MediaTrackConstraints = deviceId
      ? { deviceId: { ideal: deviceId } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };

    let track: MediaStreamTrack | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: vConstraints, audio: false });
      track = stream.getVideoTracks()[0] || null;
    } catch {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        track = fallback.getVideoTracks()[0] || null;
      } catch {
        const simple = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        track = simple.getVideoTracks()[0] || null;
      }
    }

    if (!track) {
      throw new Error("CameraAcquisitionFailed: No video track returned by device.");
    }

    this.activeSourceTrack = track;

    // Listen to hardware ended event (e.g. device unplugged)
    track.onended = () => {
      this.release();
    };

    // Notify all subscribed listeners of new live track
    this.notifyListeners(track);

    return track;
  }

  /**
   * Registers a consumer's track or derived clone for tracking and coordinated hard release.
   */
  registerConsumer(consumerId: string, track: MediaStreamTrack): () => void {
    const entry: TrackRegistryEntry = {
      consumerId,
      track,
      createdAt: Date.now(),
      stack: process.env.NODE_ENV !== "production" ? new Error().stack : undefined,
    };
    this.consumerRegistry.set(consumerId, entry);

    return () => {
      this.consumerRegistry.delete(consumerId);
    };
  }

  /**
   * Subscribes to track changes (new track acquired or released to null).
   */
  onTrack(listener: TrackListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current state
    listener(this.activeSourceTrack);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Physically releases camera hardware by stopping the source track and all registered consumer tracks.
   * Extinguishes macOS green camera indicator LED within seconds.
   */
  release(): void {
    // 1. Stop all registered consumer tracks/clones
    for (const entry of this.consumerRegistry.values()) {
      try {
        if (entry.track.readyState === "live") {
          entry.track.stop();
        }
      } catch {}
    }
    this.consumerRegistry.clear();

    // 2. Stop source track
    if (this.activeSourceTrack) {
      try {
        if (this.activeSourceTrack.readyState === "live") {
          this.activeSourceTrack.stop();
        }
      } catch {}
      this.activeSourceTrack = null;
    }

    // 3. Notify listeners
    this.notifyListeners(null);
  }

  getCurrentDeviceId(): string | undefined {
    return this.currentDeviceId;
  }

  getActiveTrack(): MediaStreamTrack | null {
    if (this.activeSourceTrack && this.activeSourceTrack.readyState === "live") {
      return this.activeSourceTrack;
    }
    return null;
  }

  isCameraActive(): boolean {
    return Boolean(this.activeSourceTrack && this.activeSourceTrack.readyState === "live");
  }

  /**
   * Diagnostics: returns count of live video tracks in registry and active source.
   */
  getLiveTrackCount(): number {
    let count = 0;
    if (this.activeSourceTrack && this.activeSourceTrack.readyState === "live") {
      count++;
    }
    for (const entry of this.consumerRegistry.values()) {
      if (entry.track.readyState === "live") {
        count++;
      }
    }
    return count;
  }

  private notifyListeners(track: MediaStreamTrack | null): void {
    for (const listener of this.listeners) {
      try {
        listener(track);
      } catch (err) {
        console.warn("[CameraManager] Listener error:", err);
      }
    }
  }
}

export const cameraManager = new CameraManagerService();

// Register global window cleanup handlers
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cameraManager.release();
  });
}
