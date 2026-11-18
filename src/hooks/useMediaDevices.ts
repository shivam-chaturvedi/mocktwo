import { useCallback, useEffect, useRef, useState } from "react";
import { registerMediaStream, unregisterMediaStream } from "../utils/mediaLifecycle";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

interface Options {
  enabled: boolean;
  selectedCameraId?: string;
  selectedMicrophoneId?: string;
  onCameraChange?: (id: string) => void;
  onMicrophoneChange?: (id: string) => void;
}

const same = (a: MediaDeviceOption[], b: MediaDeviceOption[]) =>
  a.length === b.length && a.every((x, i) => x.deviceId === b[i].deviceId && x.label === b[i].label);

// Match by deviceId first, then legacy label, fallback to system default ("")
const resolve = (sel: string | undefined, list: MediaDeviceOption[]) =>
  !sel ? "" : (list.find((d) => d.deviceId === sel) ?? list.find((d) => d.label === sel))?.deviceId ?? "";

export function useMediaDevices({
  enabled,
  selectedCameraId,
  selectedMicrophoneId,
  onCameraChange,
  onMicrophoneChange,
}: Options) {
  const camCb = useRef(onCameraChange);
  const micCb = useRef(onMicrophoneChange);
  useEffect(() => {
    camCb.current = onCameraChange;
    micCb.current = onMicrophoneChange;
  });

  const [cameras, setCameras] = useState<MediaDeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<"camera" | "microphone" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const videoOffRef = useRef(videoOff);
  videoOffRef.current = videoOff;
  const [audioLevel, setAudioLevel] = useState(0);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return { cams: [], mics: [] };
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const pick = (kind: MediaDeviceKind, fallbackName: string) =>
        all
          .filter((d) => d.kind === kind && d.deviceId)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallbackName} ${i + 1}` }));
      const cams = pick("videoinput", "Camera");
      const mics = pick("audioinput", "Microphone");
      setCameras((p) => (same(p, cams) ? p : cams));
      setMicrophones((p) => (same(p, mics) ? p : mics));
      return { cams, mics };
    } catch {
      return { cams: [], mics: [] };
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopAllTracks = useCallback(() => {
    stopAudioAnalysis();
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      unregisterMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }
    setStream(null);
  }, [stopAudioAnalysis]);

  /**
   * Physically stops all video tracks to extinguish camera sensor hardware
   * and the macOS green indicator light.
   */
  const turnVideoOff = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getVideoTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
        activeStreamRef.current?.removeTrack(t);
      });
      const remainingTracks = activeStreamRef.current.getTracks();
      const updated = remainingTracks.length > 0 ? new MediaStream(remainingTracks) : null;
      if (updated) {
        registerMediaStream(updated);
      }
      activeStreamRef.current = updated;
      setStream(updated);
    }
    setVideoOff(true);
    videoOffRef.current = true;
  }, []);

  /**
   * Re-acquires physical camera hardware and adds the live track back to the active stream.
   */
  const turnVideoOn = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setIsLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined" && window.electronAPI?.requestMediaAccess) {
        try {
          await window.electronAPI.requestMediaAccess("camera");
        } catch {}
      }

      const pre = await enumerate();
      const resolvedCamId = resolve(selectedCameraId, pre.cams);
      const vConstraints: boolean | MediaTrackConstraints = resolvedCamId ? { deviceId: { ideal: resolvedCamId } } : true;

      let freshVideoTrack: MediaStreamTrack | null = null;
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: vConstraints, audio: false });
        freshVideoTrack = vStream.getVideoTracks()[0] ?? null;
      } catch {
        try {
          const fallbackV = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: "user" },
            audio: false,
          });
          freshVideoTrack = fallbackV.getVideoTracks()[0] ?? null;
        } catch {
          const fallbackSimple = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          freshVideoTrack = fallbackSimple.getVideoTracks()[0] ?? null;
        }
      }

      if (freshVideoTrack) {
        if (activeStreamRef.current) {
          activeStreamRef.current.addTrack(freshVideoTrack);
          const updated = new MediaStream(activeStreamRef.current.getTracks());
          registerMediaStream(updated);
          setStream(updated);
        } else {
          const newStream = new MediaStream([freshVideoTrack]);
          activeStreamRef.current = newStream;
          registerMediaStream(newStream);
          setStream(newStream);
        }
        setVideoOff(false);
        videoOffRef.current = false;
        setPermissionError(null);
      }
    } catch (err: any) {
      console.warn("[useMediaDevices] Failed to turn video on:", err);
      setError(err?.name || "CameraReacquireError");
    } finally {
      setIsLoading(false);
    }
  }, [enumerate, selectedCameraId]);

  const toggleVideo = useCallback(async () => {
    if (!videoOffRef.current) {
      turnVideoOff();
    } else {
      await turnVideoOn();
    }
  }, [turnVideoOff, turnVideoOn]);

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices) {
      stopAllTracks();
      return;
    }

    let cancelled = false;
    let acquiredStream: MediaStream | null = null;

    (async () => {
      setIsLoading(true);
      setError(null);

      // 1. Explicitly ensure macOS / OS-level media access upfront
      if (typeof window !== "undefined" && window.electronAPI?.requestMediaAccess) {
        try {
          await window.electronAPI.requestMediaAccess("camera");
          await window.electronAPI.requestMediaAccess("microphone");
        } catch {}
      }

      if (cancelled) return;

      const pre = await enumerate();
      const resolvedCamId = resolve(selectedCameraId, pre.cams);
      const resolvedMicId = resolve(selectedMicrophoneId, pre.mics);

      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      let videoError: string | null = null;
      let audioError: string | null = null;

      // 2. Independent Video Acquisition ONLY if camera is NOT turned off
      if (!videoOffRef.current) {
        try {
          const vConstraints: boolean | MediaTrackConstraints = resolvedCamId ? { deviceId: { ideal: resolvedCamId } } : true;
          const vStream = await navigator.mediaDevices.getUserMedia({ video: vConstraints, audio: false });
          videoTrack = vStream.getVideoTracks()[0] ?? null;
        } catch {
          try {
            const fallbackV = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480, facingMode: "user" },
              audio: false,
            });
            videoTrack = fallbackV.getVideoTracks()[0] ?? null;
          } catch {
            try {
              const fallbackSimple = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              videoTrack = fallbackSimple.getVideoTracks()[0] ?? null;
            } catch (fallbackVErr) {
              videoError = (fallbackVErr as DOMException)?.name || "VideoAcquisitionError";
            }
          }
        }
      }

      if (cancelled) {
        videoTrack?.stop();
        return;
      }

      // 3. Independent Audio Acquisition
      try {
        const aConstraints: boolean | MediaTrackConstraints = resolvedMicId ? { deviceId: { ideal: resolvedMicId } } : true;
        const aStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: aConstraints });
        audioTrack = aStream.getAudioTracks()[0] ?? null;
      } catch {
        try {
          const fallbackA = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          audioTrack = fallbackA.getAudioTracks()[0] ?? null;
        } catch (fallbackAErr) {
          audioError = (fallbackAErr as DOMException)?.name || "AudioAcquisitionError";
        }
      }

      if (cancelled) {
        videoTrack?.stop();
        audioTrack?.stop();
        return;
      }

      const tracks: MediaStreamTrack[] = [];
      if (videoTrack) tracks.push(videoTrack);
      if (audioTrack) tracks.push(audioTrack);

      if (tracks.length > 0) {
        const s = new MediaStream(tracks);
        acquiredStream = s;
        activeStreamRef.current = s;
        registerMediaStream(s);
        setStream(s);

        // Surface permission error only if the respective track failed due to permission denial
        if (!videoTrack && !videoOffRef.current && (videoError === "NotAllowedError" || videoError === "PermissionDeniedError")) {
          setPermissionError("camera");
        } else if (!audioTrack && (audioError === "NotAllowedError" || audioError === "PermissionDeniedError")) {
          setPermissionError("microphone");
        } else {
          setPermissionError(null);
        }

        // Start live audio visualizer analyzer if audio track is active
        if (audioTrack && audioTrack.enabled) {
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          } catch {}
        }
      } else {
        activeStreamRef.current = null;
        setStream(null);
        if (videoError === "NotAllowedError" || videoError === "PermissionDeniedError") {
          setPermissionError("camera");
        } else if (audioError === "NotAllowedError" || audioError === "PermissionDeniedError") {
          setPermissionError("microphone");
        }
        setError(videoError || audioError || "MediaAcquisitionError");
      }

      // Re-enumerate to get human-readable labels now that permissions are granted
      await enumerate();
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      stopAudioAnalysis();
      acquiredStream?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      if (acquiredStream) {
        unregisterMediaStream(acquiredStream);
      }
      if (activeStreamRef.current === acquiredStream) {
        activeStreamRef.current = null;
      }
      setStream(null);
    };
  }, [enabled, selectedCameraId, selectedMicrophoneId, enumerate, stopAllTracks, stopAudioAnalysis]);

  // Apply audio mute state without recreating the stream
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !micMuted;
    });
  }, [stream, micMuted]);

  // Listen to physical USB device changes
  useEffect(() => {
    if (!navigator.mediaDevices) return;
    const h = () => {
      void enumerate();
    };
    navigator.mediaDevices.addEventListener("devicechange", h);
    return () => navigator.mediaDevices.removeEventListener("devicechange", h);
  }, [enumerate]);

  return {
    cameras,
    microphones,
    stream,
    error,
    permissionError,
    setPermissionError,
    isLoading,
    micMuted,
    videoOff,
    cameraOff: videoOff,
    audioLevel,
    toggleMic: () => setMicMuted((v) => !v),
    toggleMute: () => setMicMuted((v) => !v),
    turnVideoOff,
    turnVideoOn,
    toggleVideo,
    stopAllTracks,
  };
}
