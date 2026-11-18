import { useCallback, useMemo, useRef, useState } from "react";

export interface MediaRecorderOptions {
  timesliceMs?: number;
}

export interface StartRecordingParams {
  id: string;
  kind?: "sessions" | "baseline";
  scenarioId?: string;
  scenarioTitle?: string;
  personaId?: string;
  personaName?: string;
  personaAvatarUrl?: string;
  baselineId?: string;
  interactionType?: string;
  plannedDurationSeconds?: number;
}

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const clonedStreamRef = useRef<MediaStream | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const activeKindRef = useRef<"sessions" | "baseline">("sessions");
  const seqRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const inFlightChunksRef = useRef<Promise<boolean>[]>([]);

  const start = useCallback(
    async (sourceStream: MediaStream, params: StartRecordingParams) => {
      try {
        setError(null);
        if (!sourceStream) {
          throw new Error("No source stream provided to useMediaRecorder");
        }

        const id = params.id;
        const kind = params.kind || "sessions";
        activeIdRef.current = id;
        activeKindRef.current = kind;
        seqRef.current = 0;
        inFlightChunksRef.current = [];

        // 1. Notify Electron main process to prepare write stream & SQLite row
        if (window.electronAPI?.recording) {
          const now = new Date();
          const localDate = now.toISOString().slice(0, 10);
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          await window.electronAPI.recording.start({
            id,
            kind,
            scenarioId: params.scenarioId,
            scenarioTitle: params.scenarioTitle,
            personaId: params.personaId,
            personaName: params.personaName,
            personaAvatarUrl: params.personaAvatarUrl,
            baselineId: params.baselineId,
            interactionType: params.interactionType,
            startedAt: now.toISOString(),
            localDate,
            timezone,
            plannedDurationSeconds: params.plannedDurationSeconds || 180,
          });
        }

        // 2. Select tracks to record
        const tracksToRecord: MediaStreamTrack[] = [];
        const videoTracks = sourceStream.getVideoTracks();
        if (videoTracks.length > 0) {
          tracksToRecord.push(videoTracks[0]);
        }

        // Baseline is strictly VIDEO-ONLY; practice sessions record audio
        if (kind !== "baseline") {
          const audioTracks = sourceStream.getAudioTracks();
          for (const aTrack of audioTracks) {
            tracksToRecord.push(aTrack);
          }
        }

        if (tracksToRecord.length === 0) {
          throw new Error("No tracks available to record");
        }

        const recordingStream = new MediaStream(tracksToRecord);
        clonedStreamRef.current = recordingStream;

        // 3. Determine best supported WebM mimeType
        const mimeTypes = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ];
        let selectedMimeType = "";
        for (const mt of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mt)) {
            selectedMimeType = mt;
            break;
          }
        }

        const recorder = selectedMimeType
          ? new MediaRecorder(recordingStream, { mimeType: selectedMimeType })
          : new MediaRecorder(recordingStream);

        recorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (!event.data || event.data.size === 0) return;
          const currentId = activeIdRef.current;
          if (!currentId) return;

          const currentSeq = seqRef.current++;
          const chunkPromise = event.data.arrayBuffer().then((buffer) => {
            if (window.electronAPI?.recording) {
              return window.electronAPI.recording.chunk({
                id: currentId,
                seq: currentSeq,
                chunk: buffer,
              });
            }
            return true;
          });
          inFlightChunksRef.current.push(chunkPromise);
        };

        recorder.onerror = (e) => {
          console.error("[useMediaRecorder] Recorder error:", e);
          setError("MediaRecorder encountered an error");
        };

        // Anchor timestamp right at start event
        startTimeRef.current = performance.now();
        recorder.start(1000); // 1000ms timeslices

        setRecordingId(id);
        setIsRecording(true);
        return true;
      } catch (err) {
        console.error("[useMediaRecorder] Failed to start recording:", err);
        const msg = err instanceof Error ? err.message : "Failed to start recording";
        setError(msg);
        return false;
      }
    },
    []
  );

  const stop = useCallback(
    async (finalizePayload: Record<string, unknown> = {}) => {
      const currentId = activeIdRef.current;
      const currentKind = activeKindRef.current;
      const recorder = recorderRef.current;
      const clonedStream = clonedStreamRef.current;

      const durationMs = startTimeRef.current ? Math.round(performance.now() - startTimeRef.current) : 0;

      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch {
            resolve();
          }
        });
      }

      // Stop cloned tracks
      if (clonedStream) {
        clonedStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        clonedStreamRef.current = null;
      }

      recorderRef.current = null;
      setIsRecording(false);
      setRecordingId(null);
      activeIdRef.current = null;

      // Wait for all in-flight chunk writes to complete
      await Promise.all(inFlightChunksRef.current).catch(() => {});
      inFlightChunksRef.current = [];

      // Finalize in main process
      if (currentId && window.electronAPI?.recording) {
        return window.electronAPI.recording.finalize({
          ...finalizePayload,
          id: currentId,
          kind: currentKind,
          durationMs,
        });
      }
      return null;
    },
    []
  );

  const abort = useCallback(async () => {
    const currentId = activeIdRef.current;
    const currentKind = activeKindRef.current;
    const recorder = recorderRef.current;
    const clonedStream = clonedStreamRef.current;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {}
    }

    if (clonedStream) {
      clonedStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      clonedStreamRef.current = null;
    }

    recorderRef.current = null;
    setIsRecording(false);
    setRecordingId(null);
    activeIdRef.current = null;
    inFlightChunksRef.current = [];

    if (currentId && window.electronAPI?.recording) {
      await window.electronAPI.recording.abort({ id: currentId, kind: currentKind });
    }
  }, []);

  const appendTranscript = useCallback(
    async (segments: Array<{ seq: number; speaker: string; text: string; startMs: number; endMs: number }>) => {
      const currentId = activeIdRef.current;
      if (!currentId || !window.electronAPI?.recording) return false;
      return window.electronAPI.recording.appendTranscript({ recordingId: currentId, segments });
    },
    []
  );

  const appendVitals = useCallback(
    async (
      samples: Array<{
        timestampOffsetMs: number;
        pulseBpm: number | null;
        hrvRmssd: number | null;
        breathingRate: number | null;
        confidence: number | null;
        isClean: boolean;
      }>
    ) => {
      const currentId = activeIdRef.current;
      if (!currentId || !window.electronAPI?.recording) return false;
      return window.electronAPI.recording.appendVitals({ recordingId: currentId, samples });
    },
    []
  );

  return useMemo(
    () => ({
      isRecording,
      recordingId,
      error,
      start,
      stop,
      abort,
      appendTranscript,
      appendVitals,
    }),
    [isRecording, recordingId, error, start, stop, abort, appendTranscript, appendVitals]
  );
}
