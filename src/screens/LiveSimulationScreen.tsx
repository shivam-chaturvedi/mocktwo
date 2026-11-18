import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context";
import { useMediaRecorder } from "../hooks/useMediaRecorder";
import { createVitalsSession, type VitalsSession } from "../services/vitals/presageSession";
import {
  computeSessionMetrics,
  type TelemetrySample,
  type BaselineReference,
} from "../utils/analyticsScoring";
import { AudioVisualizer } from "../components/common/AudioVisualizer";
import { Button } from "../components/common/Button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ListOrdered,
  Target,
  Maximize2,
  Activity,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { VALIDATION_HINTS, type ValidationStatusCode } from "../types";
import { CameraOffWarningModal } from "../components/common/CameraOffWarningModal";
import { CviSession, type CviUtterance, type CviUtteranceStreaming, type CviSpeakingEvent } from "../services/tavus/cviSession";
import { StageCompositor } from "../services/recording/stageCompositor";

const VALIDATION_CODE_MAP: Record<number, ValidationStatusCode> = {
  0: "OK",
  1: "NO_FACE_FOUND",
  2: "MULTIPLE_FACES_FOUND",
  3: "FACE_NOT_CENTERED",
  4: "FACE_TOO_CLOSE",
  5: "TOO_DARK",
  6: "TOO_BRIGHT",
  7: "CHEST_NOT_VISIBLE",
  10: "CAMERA_TUNING",
  11: "FRAME_RATE_TOO_LOW",
  12: "EXCESSIVE_MOTION",
  13: "FACE_TOO_CLOSE",
  14: "FACE_TOO_FAR",
  15: "FACE_TOO_HIGH",
  16: "FACE_TOO_LOW",
  17: "FACE_NOT_FORWARD",
};

interface CviBlockingError {
  code: string;
  message: string;
}

export const LiveSimulationScreen: React.FC = () => {
  const { selectedScenario, activeSessionPersona, finishSimulation, user, activeSessionId, navigateTo } = useApp();

  const currentPersona = useMemo(() => {
    return (
      activeSessionPersona || {
        id: selectedScenario.id,
        name: selectedScenario.personaName || selectedScenario.guestName,
        avatarUrl: selectedScenario.personaAvatarUrl || selectedScenario.guestAvatarUrl,
        setting: selectedScenario.setting || selectedScenario.roomNumber,
        seniority: selectedScenario.seniority || selectedScenario.loyaltyTier,
        temperamentTraits: [selectedScenario.personaTone || selectedScenario.guestMood],
        voice: "Alloy (Warm British)",
      }
    );
  }, [activeSessionPersona, selectedScenario]);

  // Scenario duration: configured minutes converted to seconds (1 to 10 min, default 3 min)
  const totalSessionSeconds = useMemo(() => {
    const rawMinutes = Number(selectedScenario.durationMinutes);
    const validMinutes = typeof rawMinutes === "number" && !isNaN(rawMinutes) && rawMinutes >= 1 && rawMinutes <= 10
      ? Math.round(rawMinutes)
      : 3;
    return validMinutes * 60;
  }, [selectedScenario.durationMinutes]);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const cameraOffRef = useRef(cameraOff);
  useEffect(() => {
    cameraOffRef.current = cameraOff;
  }, [cameraOff]);
  const [sessionPhase, setSessionPhase] = useState<"gate" | "connecting" | "live" | "ended">("gate");
  const [showCameraOffModal, setShowCameraOffModal] = useState(false);
  const compositeSessionRef = useRef<StageCompositor | null>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSpeakerActive, setIsSpeakerActive] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showObjectivesPanel, setShowObjectivesPanel] = useState(false);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);
  const [livePulse, setLivePulse] = useState<number | null>(null);
  const [liveValidation, setLiveValidation] = useState<{
    code: ValidationStatusCode;
    hint: string;
  }>({ code: "OK", hint: VALIDATION_HINTS.OK });

  // Tavus CVI Live States
  const [cviConnecting, setCviConnecting] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [counterpartSpeaking, setCounterpartSpeaking] = useState(false);
  const [streamingCaption, setStreamingCaption] = useState<{ role: string; text: string } | null>(null);
  const [cviError, setCviError] = useState<CviBlockingError | null>(null);
  const [isSyncingPersona, setIsSyncingPersona] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // References for unmount/cleanup and media pipelines
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFinishedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const turnSeqRef = useRef(0);

  const gateVideoRef = useRef<HTMLVideoElement | null>(null);
  const livePipVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    userStreamRef.current = userStream;
  }, [userStream]);
  const cviSessionRef = useRef<CviSession | null>(null);
  const tavusConversationIdRef = useRef<string | null>(null);

  const recorder = useMediaRecorder();
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  // SmartSpectra live vitals state & samples
  const vitalsSessionRef = useRef<VitalsSession | null>(null);
  const allVitalsSamplesRef = useRef<TelemetrySample[]>([]);
  const pendingVitalsBatchRef = useRef<TelemetrySample[]>([]);
  const activeBaselineRef = useRef<any>(null);

  // Fetch active baseline on mount
  useEffect(() => {
    let isMounted = true;
    if (window.electronAPI?.storage?.getActiveBaseline) {
      window.electronAPI.storage.getActiveBaseline().then((base) => {
        if (isMounted) activeBaselineRef.current = base;
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, []);

  // Flush pending vitals samples to SQLite in batches
  useEffect(() => {
    const vitalsFlushInterval = setInterval(() => {
      if (pendingVitalsBatchRef.current.length > 0) {
        const toFlush = [...pendingVitalsBatchRef.current];
        pendingVitalsBatchRef.current = [];
        recorderRef.current.appendVitals(toFlush).catch(() => {});
      }
    }, 2000);
    return () => clearInterval(vitalsFlushInterval);
  }, []);

  // Finalize session helper
  const endAndFinalizeSession = useCallback(
    async (elapsed: number, endReason: string = "completed") => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setShowEndModal(false);

      // 1. Flush any remaining vitals batch
      if (pendingVitalsBatchRef.current.length > 0) {
        const toFlush = [...pendingVitalsBatchRef.current];
        pendingVitalsBatchRef.current = [];
        await recorderRef.current.appendVitals(toFlush).catch(() => {});
      }

      // 2. Stop SmartSpectra session
      if (vitalsSessionRef.current) {
        try {
          await vitalsSessionRef.current.stop();
          await vitalsSessionRef.current.destroy();
        } catch {}
        vitalsSessionRef.current = null;
      }

      // 3. End Tavus CVI call and clean up call object
      const convId = tavusConversationIdRef.current;
      if (convId && window.electronAPI?.tavus?.endConversation) {
        try {
          await window.electronAPI.tavus.endConversation(convId);
        } catch {}
      }
      if (cviSessionRef.current) {
        try {
          await cviSessionRef.current.destroy();
        } catch {}
        cviSessionRef.current = null;
      }

      // 4. Compare with active calm baseline
      const base = activeBaselineRef.current;
      const baselineRef: BaselineReference | null =
        base && (base.pulseMean || base.restingPulse)
          ? {
              restingPulse: Number(base.pulseMean || base.restingPulse),
              restingHrvRmssd: base.hrvRmssd ?? base.restingHrvRmssd ?? null,
              restingBreathingRate: base.breathingMean ?? base.restingBreathingRate ?? null,
            }
          : null;

      const metrics = computeSessionMetrics(allVitalsSamplesRef.current, baselineRef);
      const cleanSamplesCount = allVitalsSamplesRef.current.filter((s) => s.isClean && s.pulseBpm !== null).length;
      const measuredSec = metrics.avgPulse ? Math.min(elapsed, Math.max(1, Math.round(cleanSamplesCount * 0.5))) : 0;

      // 5. Finalize recording with real metrics and tavus_conversation_id FIRST
      // This guarantees MediaRecorder writes all pending chunks before the stream is closed
      try {
        await recorderRef.current.stop({
          scenarioId: selectedScenario.id,
          scenarioTitle: selectedScenario.title,
          personaId: currentPersona.id,
          personaName: currentPersona.name,
          durationSeconds: elapsed,
          status: elapsed >= 30 ? "completed" : "interrupted",
          endReason,
          layout: "stage_v1",
          tavusConversationId: convId || undefined,
          composureScore: metrics.composureScore ?? undefined,
          avgPulse: metrics.avgPulse ?? undefined,
          peakPulse: metrics.peakPulse ?? undefined,
          avgHrvRmssd: metrics.avgHrvRmssd ?? undefined,
          recoverySeconds: metrics.recoverySeconds ?? undefined,
          measuredSeconds: measuredSec,
          coverageRatio: `${measuredSec} of ${elapsed} s measured cleanly`,
          readinessStatus: elapsed >= 60 ? "Full read" : "Too short",
          nervousnessLevel: metrics.nervousness || undefined,
          signalsAvailableCount: metrics.avgPulse ? (metrics.avgHrvRmssd ? 4 : 3) : 0,
          isPartialScore: !metrics.avgHrvRmssd,
        });
      } catch {}

      // 6. Clean up composite recorder AFTER media recorder has stopped
      if (compositeSessionRef.current) {
        compositeSessionRef.current.destroy();
        compositeSessionRef.current = null;
      }

      // 7. Physically stop and release local camera and microphone hardware tracks
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        userStreamRef.current = null;
      }
      setUserStream(null);

      finishSimulation(elapsed);
    },
    [finishSimulation, selectedScenario, currentPersona]
  );

  const endAndFinalizeSessionRef = useRef(endAndFinalizeSession);
  endAndFinalizeSessionRef.current = endAndFinalizeSession;

  // Main preview lifecycle: acquires local camera & mic for readiness gate
  useEffect(() => {
    let isCancelled = false;

    const initPreview = async () => {
      try {
        if (typeof window !== "undefined" && window.electronAPI?.requestMediaAccess) {
          try {
            await window.electronAPI.requestMediaAccess("camera");
            await window.electronAPI.requestMediaAccess("microphone");
          } catch {}
        }

        let stream: MediaStream | null = null;
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 1280, height: 720, facingMode: "user" },
              audio: true,
            });
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
              } catch {
                if (isCancelled) return;
                setCviError({
                  code: "media_denied",
                  message: "Camera and microphone access could not be acquired. Please enable permissions in macOS System Settings.",
                });
                return;
              }
            }
          }
        }

        if (isCancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          setUserStream(stream);
          userStreamRef.current = stream;

          // Start validation checks for readiness gate
          let presageConfig = { configured: false, apiKey: "", telemetry: false };
          try {
            if (window.electronAPI?.getPresageConfig) {
              presageConfig = await window.electronAPI.getPresageConfig();
            }
          } catch {}

          if (presageConfig.configured && presageConfig.apiKey) {
            try {
              const previewSession = createVitalsSession({
                stream,
                apiKey: presageConfig.apiKey,
                enableTelemetry: presageConfig.telemetry,
                onValidation: (code, _timestampUs, hint) => {
                  const statusCode = VALIDATION_CODE_MAP[code] || "OK";
                  setLiveValidation({
                    code: statusCode,
                    hint: hint || VALIDATION_HINTS[statusCode] || "Camera and framing optimal",
                  });
                },
                onError: (code, msg) => {
                  console.warn(`[LiveSimulationScreen] Preview validation warning ${code}: ${msg}`);
                },
              });
              await previewSession.start();
              vitalsSessionRef.current = previewSession;
            } catch {}
          }
        }
      } catch (err: any) {
        if (isCancelled) return;
        setCviError({
          code: "media_denied",
          message: err.message || "Failed to acquire camera/microphone preview.",
        });
      }
    };

    initPreview();

    return () => {
      isCancelled = true;
      if (compositeSessionRef.current) {
        compositeSessionRef.current.destroy();
        compositeSessionRef.current = null;
      }
      if (vitalsSessionRef.current) {
        try {
          vitalsSessionRef.current.stop();
          vitalsSessionRef.current.destroy();
        } catch {}
        vitalsSessionRef.current = null;
      }
      const activeConvId = tavusConversationIdRef.current;
      if (activeConvId && window.electronAPI?.tavus?.endConversation) {
        window.electronAPI.tavus.endConversation(activeConvId).catch(() => {});
      }
      if (cviSessionRef.current) {
        cviSessionRef.current.destroy().catch(() => {});
        cviSessionRef.current = null;
      }
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
        userStreamRef.current = null;
      }
      if (!hasFinishedRef.current) {
        recorderRef.current.abort().catch(() => {});
      }
    };
  }, [retryCount]);

  // Starts the live conversation once Readiness Gate passes
  const startLiveCallFromGate = useCallback(async () => {
    if (!userStreamRef.current) return;
    setSessionPhase("connecting");
    setCviConnecting(true);
    setCviError(null);

    const sessionId = activeSessionId || `session-${Date.now()}`;
    sessionIdRef.current = sessionId;
    sessionStartTimeRef.current = Date.now();
    turnSeqRef.current = 0;
    startTimeRef.current = performance.now();
    hasFinishedRef.current = false;

    try {
      // Step A: Setup Stage Compositor (Full Call Stage Video + Mixed Audio)
      const userMic = userStreamRef.current.getAudioTracks()[0] || null;
      const stageCompositor = new StageCompositor({
        userStream: userStreamRef.current,
        getUserVideoElement: () => livePipVideoRef.current,
        remoteVideoElement: remoteVideoRef.current,
        userMicTrack: userMic,
        isUserCameraActive: () => !cameraOffRef.current && Boolean(userStreamRef.current?.getVideoTracks().some(t => t.enabled && t.readyState === "live")),
        personaName: currentPersona.name,
        userInitials: user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "YOU",
        getElapsedSeconds: () => (startTimeRef.current ? Math.floor((performance.now() - startTimeRef.current) / 1000) : 0),
      });
      if (micMuted) {
        stageCompositor.setMicMuted(true);
      }
      compositeSessionRef.current = stageCompositor;

      allVitalsSamplesRef.current = [];
      pendingVitalsBatchRef.current = [];

      await recorderRef.current.start(stageCompositor.getStream(), {
        id: sessionId,
        kind: "sessions",
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        personaId: currentPersona.id,
        personaName: currentPersona.name,
        personaAvatarUrl: currentPersona.avatarUrl,
        plannedDurationSeconds: totalSessionSeconds,
      });

      // Step B: Start SmartSpectra Vitals Telemetry Session
      let presageConfig = { configured: false, apiKey: "", telemetry: false };
      try {
        if (window.electronAPI?.getPresageConfig) {
          presageConfig = await window.electronAPI.getPresageConfig();
        }
      } catch {}

      if (presageConfig.configured && presageConfig.apiKey && userStreamRef.current) {
        try {
          if (vitalsSessionRef.current) {
            try {
              await vitalsSessionRef.current.stop();
              await vitalsSessionRef.current.destroy();
            } catch {}
            vitalsSessionRef.current = null;
          }

          const localVitalsSession = createVitalsSession({
            stream: userStreamRef.current,
            apiKey: presageConfig.apiKey,
            enableTelemetry: presageConfig.telemetry,
            onSample: (sample) => {
              const nowMs = sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0;
              const isClean = sample.validationCode === 0 || sample.validationCode === null || sample.validationCode === undefined;
              const point: TelemetrySample = {
                timestampOffsetMs: nowMs,
                pulseBpm: sample.pulse ?? null,
                hrvRmssd: sample.hrvRmssd ?? null,
                breathingRate: sample.breathingRate ?? null,
                confidence: sample.pulseConfidence ?? null,
                isClean,
              };
              allVitalsSamplesRef.current.push(point);
              pendingVitalsBatchRef.current.push(point);
              if (sample.pulse && isClean) {
                setLivePulse(sample.pulse);
              }
            },
            onValidation: (code, _timestampUs, hint) => {
              const statusCode = VALIDATION_CODE_MAP[code] || "OK";
              setLiveValidation({
                code: statusCode,
                hint: hint || VALIDATION_HINTS[statusCode] || "Camera and framing optimal",
              });
            },
            onError: (code, msg) => {
              console.warn(`[LiveSimulationScreen] SmartSpectra warning ${code}: ${msg}`);
            },
          });
          await localVitalsSession.start();
          vitalsSessionRef.current = localVitalsSession;
        } catch (err) {
          console.warn("[LiveSimulationScreen] Failed to start SmartSpectra session:", err);
        }
      }

      // Step C: Create real Tavus Conversation
      if (!window.electronAPI?.tavus?.createConversation && !window.electronAPI?.createConversation) {
        throw new Error("Electron Tavus conversation bridge is not available.");
      }

      const createFn = window.electronAPI.tavus?.createConversation || window.electronAPI.createConversation!;
      const convResult = await createFn({
        scenarioId: selectedScenario.id,
        personaId: currentPersona.id,
        scenario: selectedScenario,
      });

      if (!convResult || !convResult.ok || !convResult.conversationUrl) {
        throw new Error(convResult?.error || "Failed to initiate Tavus AI conversation.");
      }

      const conversationId = convResult.conversationId!;
      tavusConversationIdRef.current = conversationId;

      // Step D: Instantiate CviSession and join Daily WebRTC call
      const localCviSession = new CviSession({
        onRemoteVideoTrack: (track) => {
          if (track) {
            setHasRemoteVideo(true);
            setCviConnecting(false);
            setSessionPhase("live");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = new MediaStream([track]);
              remoteVideoRef.current.play().catch(() => {});
            }
          } else {
            setHasRemoteVideo(false);
          }
        },
        onRemoteAudioTrack: (track) => {
          if (track) {
            compositeSessionRef.current?.setRemoteAudioTrack(track);
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = new MediaStream([track]);
              remoteAudioRef.current.play().catch(() => {});
            }
          } else {
            compositeSessionRef.current?.setRemoteAudioTrack(null);
          }
        },
        onUtterance: (utterance: CviUtterance) => {
          const nowMs = sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0;
          const seq = turnSeqRef.current++;
          const durationMs = utterance.duration ? Math.round(utterance.duration * 1000) : 3000;
          const startMs = Math.max(0, nowMs - durationMs);
          const speakerName = (utterance.role === "persona" ? currentPersona.name : (user?.name || "You")) || "Speaker";

          compositeSessionRef.current?.setCaption(speakerName, utterance.text);

          recorderRef.current.appendTranscript([
            {
              seq,
              speaker: utterance.role,
              text: utterance.text,
              startMs,
              endMs: nowMs,
            },
          ]).catch(() => {});

          setStreamingCaption({
            role: utterance.role,
            text: utterance.text,
          });

          if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
          captionTimeoutRef.current = setTimeout(() => {
            setStreamingCaption(null);
          }, 4500);
        },
        onUtteranceStreaming: (streaming: CviUtteranceStreaming) => {
          const speakerName = (streaming.role === "persona" ? currentPersona.name : (user?.name || "You")) || "Speaker";
          compositeSessionRef.current?.setCaption(speakerName, streaming.text);
          setStreamingCaption({
            role: streaming.role,
            text: streaming.text,
          });
        },
        onSpeaking: (speakingEvent: CviSpeakingEvent) => {
          if (speakingEvent.role === "persona") {
            setCounterpartSpeaking(speakingEvent.speaking);
          }
        },
        onError: (err) => {
          console.warn("[LiveSimulationScreen] CVI Session error:", err);
          setCviError({
            code: (err as any)?.code || "call_error",
            message: err.message,
          });
        },
        onEnded: (reason) => {
          if (!hasFinishedRef.current) {
            const elapsed = startTimeRef.current ? Math.floor((performance.now() - startTimeRef.current) / 1000) : 0;
            endAndFinalizeSessionRef.current(elapsed, reason || "remote_ended");
          }
        },
      });

      cviSessionRef.current = localCviSession;

      await localCviSession.join({
        url: convResult.conversationUrl,
        token: convResult.meetingToken,
        localStream: userStreamRef.current,
        conversationId,
      });

    } catch (err: any) {
      console.error("[LiveSimulationScreen] Failed to start live call:", err);
      setCviError({
        code: err.code || "unknown",
        message: err.message || "An unexpected error occurred while starting the rehearsal call.",
      });
      setCviConnecting(false);
      setSessionPhase("gate");
    }
  }, [selectedScenario.id, selectedScenario.title, currentPersona.id, currentPersona.name, currentPersona.avatarUrl, totalSessionSeconds, micMuted, activeSessionId]);

  // Confirmed turning camera off (triggered from red confirmation modal)
  const confirmTurnCameraOff = useCallback(async () => {
    setShowCameraOffModal(false);
    // 1. Mute video in Daily call
    cviSessionRef.current?.setLocalVideo(false);
    // 2. Stop SmartSpectra from processing empty frames
    if (vitalsSessionRef.current) {
      try {
        await vitalsSessionRef.current.stop();
      } catch {}
    }
    // 3. Physically stop all video tracks to extinguish camera hardware and green indicator light
    if (userStreamRef.current) {
      userStreamRef.current.getVideoTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
        userStreamRef.current?.removeTrack(t);
      });
      setUserStream(new MediaStream(userStreamRef.current.getTracks()));
    }
    if (livePipVideoRef.current) {
      livePipVideoRef.current.srcObject = null;
    }
    setCameraOff(true);
    cameraOffRef.current = true;
    compositeSessionRef.current?.setUserStream(null);
    setLiveValidation({
      code: "NO_FACE_FOUND",
      hint: "Camera is turned off",
    });
  }, []);

  // Toggle camera button: prompts with red modal if camera is on; turns on immediately if off
  const handleToggleCamera = useCallback(async () => {
    if (!cameraOff) {
      setShowCameraOffModal(true);
    } else {
      // User is turning camera back ON:
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
          audio: false,
        });
        const freshTrack = freshStream.getVideoTracks()[0];
        if (freshTrack) {
          let updated: MediaStream;
          if (userStreamRef.current) {
            // Remove any ended tracks
            userStreamRef.current.getVideoTracks().forEach((t) => {
              try { t.stop(); } catch {}
              userStreamRef.current?.removeTrack(t);
            });
            userStreamRef.current.addTrack(freshTrack);
            updated = new MediaStream(userStreamRef.current.getTracks());
          } else {
            updated = new MediaStream([freshTrack]);
            userStreamRef.current = updated;
          }
          setUserStream(updated);
          if (livePipVideoRef.current) {
            livePipVideoRef.current.srcObject = updated;
            livePipVideoRef.current.play().catch(() => {});
          }
          compositeSessionRef.current?.setUserStream(updated);
          // 2. Unmute in Daily call
          cviSessionRef.current?.setLocalVideo(true);
          // 3. Resume SmartSpectra
          if (vitalsSessionRef.current && userStreamRef.current) {
            try {
              await vitalsSessionRef.current.start();
            } catch {}
          }
        }
        setCameraOff(false);
        cameraOffRef.current = false;
      } catch (err) {
        console.warn("[LiveSimulationScreen] Failed to re-enable camera:", err);
      }
    }
  }, [cameraOff]);

  const handleToggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      if (userStreamRef.current) {
        userStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      compositeSessionRef.current?.setMicMuted(next);
      cviSessionRef.current?.setLocalAudio(!next);
      return next;
    });
  }, []);

  // Speaker mute synchronization with remote audio element
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerActive;
    }
  }, [isSpeakerActive]);

  // Monotonic timer using performance.now to prevent background timer drift
  useEffect(() => {
    const timer = setInterval(() => {
      if (startTimeRef.current === null || cviConnecting || cviError) return;
      const elapsed = Math.floor((performance.now() - startTimeRef.current) / 1000);
      const clampedElapsed = Math.min(totalSessionSeconds, elapsed);
      setSecondsElapsed(clampedElapsed);

      // Provide a 15-second conversational grace period past target duration so calls don't cut off mid-speech
      if (elapsed >= totalSessionSeconds + 15 && !hasFinishedRef.current) {
        clearInterval(timer);
        endAndFinalizeSession(totalSessionSeconds, "duration_limit");
      }
    }, 250);

    return () => clearInterval(timer);
  }, [endAndFinalizeSession, totalSessionSeconds, cviConnecting, cviError]);

  // Auto-hide top bar after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setIsTopBarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsTopBarVisible(false);
    }, 3500);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Handle Escape to confirm end session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEndModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleEndEarly = async () => {
    await endAndFinalizeSession(secondsElapsed, "user_quit");
  };

  const handleRetrySync = async () => {
    if (!window.electronAPI?.personaRetrySync) return;
    setIsSyncingPersona(true);
    try {
      await window.electronAPI.personaRetrySync(currentPersona.id);
      window.location.reload();
    } catch (e: any) {
      setCviError({
        code: "sync_failed",
        message: e.message || "Failed to sync persona to Tavus PAL.",
      });
    } finally {
      setIsSyncingPersona(false);
    }
  };

  const toggleFullscreen = () => {
    (window as unknown as { electronAPI?: { sendWindowAction?: (action: string) => void } }).electronAPI?.sendWindowAction?.("toggle-fullscreen");
  };

  const currentValidationStatus = useMemo(() => {
    if (cameraOff) {
      return {
        code: "NO_FACE_FOUND" as ValidationStatusCode,
        hint: VALIDATION_HINTS.NO_FACE_FOUND,
      };
    }
    return liveValidation;
  }, [cameraOff, liveValidation]);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0b0b0c",
        position: "fixed",
        inset: 0,
        zIndex: 500,
        overflow: "hidden"
      }}
    >
      {/* Remote Audio Output Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Minimal Translucent Top Bar (Auto-hides) */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(11, 11, 12, 0.75)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          zIndex: 510,
          opacity: isTopBarVisible ? 1 : 0,
          transform: isTopBarVisible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: isTopBarVisible ? "auto" : "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
            {currentPersona.name}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            • {selectedScenario.title}
          </span>
        </div>

        {/* Minimal Session Timer Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(42, 42, 44, 0.6)",
            padding: "4px 14px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "0.03em"
            }}
          >
            {formatTime(secondsElapsed)} / {formatTime(totalSessionSeconds)}
          </span>
        </div>

        {/* Live Status & Fullscreen toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: cviError
                  ? "var(--accent-red)"
                  : cviConnecting
                  ? "var(--accent-orange)"
                  : "var(--accent-green)",
                boxShadow: cviError
                  ? "0 0 8px rgba(255, 69, 58, 0.6)"
                  : cviConnecting
                  ? "0 0 8px rgba(255, 159, 10, 0.6)"
                  : "0 0 8px rgba(48, 209, 88, 0.6)"
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              {cviError ? "Call Disconnected" : cviConnecting ? "Connecting PAL…" : "Live AI Video Call"}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Toggle Full Screen (⌃⌘F)"
            style={{
              padding: "4px",
              color: "var(--text-tertiary)",
              borderRadius: "var(--radius-sm)"
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </header>

      {/* Optical Sensor Validation Hint Pill */}
      {currentValidationStatus.code !== "OK" && !cviError && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 512,
            backgroundColor: "rgba(255, 159, 10, 0.18)",
            border: "1px solid rgba(255, 159, 10, 0.4)",
            backdropFilter: "blur(16px)",
            padding: "5px 14px",
            borderRadius: "var(--radius-full)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-orange)" }} />
          <span style={{ fontSize: "11.5px", color: "#ffffff", fontWeight: 500 }}>
            {currentValidationStatus.hint}
          </span>
        </div>
      )}

      {/* Main Simulation Stage */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        {/* Blocking Honest Error Screen: No Mocks / No Fake Fallbacks */}
        {cviError ? (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              maxWidth: "480px",
              padding: "32px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255, 69, 58, 0.3)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.7)",
              textAlign: "center",
              zIndex: 30,
              backgroundColor: "rgba(22, 22, 24, 0.88)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 69, 58, 0.15)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                color: "var(--accent-red)",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3
              style={{
                fontSize: "19px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 10px 0",
                letterSpacing: "-0.015em",
              }}
            >
              {cviError.code === "no_api_key"
                ? "Tavus API Key Required"
                : cviError.code === "persona_not_synced"
                ? "Persona Not Synced to Tavus PAL"
                : cviError.code === "plan_limit"
                ? "Tavus Usage Limit Reached"
                : "Unable to Start Live AI Call"}
            </h3>

            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
                margin: "0 0 24px 0",
              }}
            >
              {cviError.message}
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              {cviError.code === "persona_not_synced" ? (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSyncingPersona}
                  onClick={handleRetrySync}
                  style={{ flex: 1 }}
                >
                  {isSyncingPersona ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Syncing PAL…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Sync Persona PAL</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setCviError(null);
                    setCviConnecting(true);
                    setRetryCount((c) => c + 1);
                  }}
                  style={{ flex: 1 }}
                >
                  <RefreshCw size={14} />
                  <span>Retry Connection</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  if (userStreamRef.current) {
                    userStreamRef.current.getTracks().forEach((t) => {
                      try {
                        t.stop();
                      } catch {}
                    });
                    userStreamRef.current = null;
                  }
                  navigateTo("scenarios");
                }}
                style={{ flex: 1 }}
              >
                Back to Scenarios
              </Button>
            </div>
          </div>
        ) : (
          /* Live Counterpart Stage */
          <>
            {/* Ambient Speaking Halo */}
            <div
              style={{
                position: "absolute",
                width: "560px",
                height: "560px",
                borderRadius: "50%",
                background: counterpartSpeaking
                  ? "radial-gradient(circle, rgba(10, 132, 255, 0.16) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
                transition: "background 0.5s ease"
              }}
            />

            {/* Central Video Frame */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 10
              }}
            >
              <div
                style={{
                  width: "320px",
                  height: "320px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: counterpartSpeaking
                    ? "3px solid var(--accent-blue)"
                    : hasRemoteVideo
                    ? "2px solid rgba(255, 255, 255, 0.2)"
                    : "1.5px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: counterpartSpeaking
                    ? "0 0 44px rgba(10, 132, 255, 0.45), 0 16px 40px rgba(0, 0, 0, 0.6)"
                    : "0 16px 40px rgba(0, 0, 0, 0.6)",
                  transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                  marginBottom: "20px",
                  position: "relative",
                  backgroundColor: "#161618",
                }}
              >
                {/* Connecting overlay with poster */}
                {cviConnecting && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(18, 18, 20, 0.9)",
                      backdropFilter: "blur(8px)",
                      zIndex: 2,
                    }}
                  >
                    <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-blue)", marginBottom: "12px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Connecting to {currentPersona.name}…
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      Establishing live video stream
                    </span>
                  </div>
                )}

                {/* Remote Tavus CVI Replica Video Element */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: hasRemoteVideo ? 1 : 0,
                    transition: "opacity 0.4s ease",
                  }}
                />
              </div>

              {/* Persona Metadata & Live Speaking Pill */}
              <div style={{ textAlign: "center" }}>
                <h2
                  className="font-serif-luxury"
                  style={{
                    fontSize: "22px",
                    fontWeight: 650,
                    color: "var(--text-primary)",
                    margin: "0 0 8px 0",
                    letterSpacing: "-0.015em"
                  }}
                >
                  {currentPersona.name}
                </h2>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12.5px",
                    color: counterpartSpeaking ? "var(--accent-blue)" : "var(--text-secondary)",
                    backgroundColor: "rgba(42, 42, 44, 0.6)",
                    padding: "4px 14px",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  <span style={{ fontWeight: 550 }}>
                    {cviConnecting
                      ? "Connecting…"
                      : counterpartSpeaking
                      ? `${currentPersona.name} Speaking`
                      : "Listening to you"}
                  </span>
                  <AudioVisualizer
                    active={counterpartSpeaking}
                    barsCount={8}
                    color={counterpartSpeaking ? "var(--accent-blue)" : "var(--text-tertiary)"}
                    size="sm"
                  />
                </div>
              </div>

              {/* Streaming Live Subtitles (Real Utterance Partials) */}
              {streamingCaption && (
                <div
                  style={{
                    marginTop: "16px",
                    maxWidth: "560px",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "rgba(18, 18, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    fontSize: "13px",
                    lineHeight: 1.45,
                    color: streamingCaption.role === "user" ? "#5ac8fa" : "#ffffff",
                    textAlign: "center",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                    animation: "fadeIn 0.15s ease",
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: "6px", opacity: 0.7 }}>
                    {streamingCaption.role === "user" ? "You:" : `${currentPersona.name}:`}
                  </span>
                  <span>{streamingCaption.text}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Collapsible Session Objectives Glass Panel (Right edge) */}
        {showObjectivesPanel && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              position: "absolute",
              top: "70px",
              right: "24px",
              width: "320px",
              maxHeight: "calc(100vh - 160px)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-modal)",
              padding: "18px 20px",
              zIndex: 515,
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.12)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", fontWeight: 600 }}>
                Session Objectives
              </span>
              <button
                onClick={() => setShowObjectivesPanel(false)}
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Hide
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedScenario.learningObjectives.map((obj, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Target size={13} style={{ color: "var(--accent-blue)", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.45 }}>
                    {obj}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Picture-in-Picture User Camera Preview (Bottom Right Corner) */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            right: "28px",
            width: "200px",
            height: "125px",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "rgba(30, 30, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(16px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 502
          }}
        >
          {cameraOff || !userStream?.getVideoTracks()?.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-control)",
                  border: "1px solid var(--separator)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "4px"
                }}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {cameraOff ? "Camera Off" : "Starting camera…"}
              </span>
            </div>
          ) : (
            <video
              ref={(el) => {
                livePipVideoRef.current = el;
                if (el && userStream && el.srcObject !== userStream) {
                  el.srcObject = userStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          )}

          {livePulse !== null && !cameraOff && (
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: "11px",
                fontWeight: 650,
                color: "#ff453a",
                fontFamily: "var(--font-mono)",
                zIndex: 4,
              }}
            >
              <Activity size={12} style={{ color: "#ff453a" }} />
              <span>{livePulse} bpm</span>
            </div>
          )}

          {micMuted && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                padding: "2px 6px",
                backgroundColor: "rgba(255, 69, 58, 0.2)",
                border: "1px solid rgba(255, 69, 58, 0.4)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                color: "var(--accent-red)",
                fontWeight: 500,
                zIndex: 4,
              }}
            >
              <MicOff size={11} />
              <span>Muted</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom HUD Pill (Center) */}
      <footer
        style={{
          position: "absolute",
          bottom: "24px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 510,
          pointerEvents: "auto"
        }}
      >
        <div
          className="glass-surface"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 14px",
            borderRadius: "var(--radius-full)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(255, 255, 255, 0.12)"
          }}
        >
          {/* Objectives Toggle Button */}
          <button
            onClick={() => setShowObjectivesPanel((prev) => !prev)}
            style={{
              height: "40px",
              padding: "0 14px",
              borderRadius: "var(--radius-full)",
              backgroundColor: showObjectivesPanel ? "rgba(10, 132, 255, 0.2)" : "var(--bg-control)",
              color: showObjectivesPanel ? "var(--accent-blue)" : "var(--text-secondary)",
              border: showObjectivesPanel ? "1px solid var(--accent-blue)" : "1px solid var(--separator)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              fontWeight: 500,
              transition: "all 0.12s ease"
            }}
          >
            <ListOrdered size={15} />
            <span>Objectives</span>
          </button>

          <div style={{ width: "1px", height: "24px", backgroundColor: "var(--separator)" }} />

          {/* Mic Button */}
          <button
            onClick={handleToggleMic}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: micMuted ? "rgba(255, 69, 58, 0.2)" : "var(--bg-control)",
              color: micMuted ? "var(--accent-red)" : "var(--text-primary)",
              border: micMuted ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Camera Button */}
          <button
            onClick={handleToggleCamera}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: cameraOff ? "rgba(255, 69, 58, 0.2)" : "var(--bg-control)",
              color: cameraOff ? "var(--accent-red)" : "var(--text-primary)",
              border: cameraOff ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {cameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerActive((prev) => !prev)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-control)",
              color: isSpeakerActive ? "var(--text-primary)" : "var(--text-tertiary)",
              border: "1px solid var(--separator)",
              display: "grid",
              placeItems: "center",
              transition: "all 0.12s ease"
            }}
            title={isSpeakerActive ? "Mute Speaker" : "Unmute Speaker"}
          >
            {isSpeakerActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <div style={{ width: "1px", height: "24px", backgroundColor: "var(--separator)" }} />

          {/* Destructive End Session Button */}
          <button
            onClick={() => setShowEndModal(true)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--accent-red)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              boxShadow: "0 2px 10px rgba(255, 69, 58, 0.4)",
              cursor: "pointer"
            }}
          >
            <PhoneOff size={15} />
            <span>End Session</span>
          </button>
        </div>
      </footer>

      {/* End Session Confirmation Modal */}
      {showEndModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
            display: "grid",
            placeItems: "center",
            padding: "20px"
          }}
          onClick={() => setShowEndModal(false)}
        >
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "420px",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-modal)",
              padding: "24px",
              border: "1px solid var(--separator)",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
                letterSpacing: "-0.015em"
              }}
            >
              End session now?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                margin: "0 0 20px 0"
              }}
            >
              Your completed session of {formatTime(secondsElapsed)} will be analyzed for pressure response and composure.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <Button variant="secondary" size="md" onClick={() => setShowEndModal(false)} style={{ flex: 1 }}>
                Continue Session
              </Button>
              <Button variant="danger" size="md" onClick={handleEndEarly} style={{ flex: 1 }}>
                End & View Debrief
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Readiness Gate Overlay */}
      {sessionPhase === "gate" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            backgroundColor: "#0b0b0c",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(10, 132, 255, 0.15)",
                color: "var(--accent-blue)",
                fontSize: "11px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              <Target size={12} />
              <span>Readiness Calibration</span>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Position your face in view
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px", marginBottom: "20px" }}>
              Rehearsal with <strong>{currentPersona.name}</strong> • {selectedScenario.title} • {Math.round(totalSessionSeconds / 60)} min
            </p>

            {/* Video Framing Box */}
            <div
              style={{
                width: "480px",
                height: "270px",
                borderRadius: "16px",
                overflow: "hidden",
                backgroundColor: "#161618",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                position: "relative",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6)",
              }}
            >
              {userStream ? (
                <video
                  ref={(el) => {
                    gateVideoRef.current = el;
                    if (el && userStream && el.srcObject !== userStream) {
                      el.srcObject = userStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--text-tertiary)" }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
              )}

              {/* Face Guide Target Ring */}
              <div
                style={{
                  position: "absolute",
                  inset: "20px 90px",
                  border: currentValidationStatus.code === "OK" ? "2px dashed rgba(48, 209, 88, 0.6)" : "2px dashed rgba(255, 159, 10, 0.4)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />

              {/* Status Pill */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: currentValidationStatus.code === "OK" ? "var(--accent-green)" : "var(--accent-orange)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: currentValidationStatus.code === "OK" ? "var(--accent-green)" : "var(--accent-orange)",
                  }}
                />
                {currentValidationStatus.code === "OK" ? "Framing optimal · Body signals ready" : currentValidationStatus.hint}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <button
                onClick={() => {
                  if (userStreamRef.current) {
                    userStreamRef.current.getTracks().forEach((t) => {
                      try { t.stop(); } catch {}
                    });
                    userStreamRef.current = null;
                  }
                  setUserStream(null);
                  finishSimulation(0);
                }}
                className="mac-btn focus-ring"
                style={{
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 500,
                  backgroundColor: "var(--bg-control)",
                  color: "var(--text-secondary)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--separator)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={startLiveCallFromGate}
                disabled={!userStream}
                className="mac-btn focus-ring"
                style={{
                  padding: "9px 26px",
                  fontSize: "13px",
                  fontWeight: 650,
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: userStream ? "pointer" : "not-allowed",
                  opacity: userStream ? 1 : 0.6,
                  boxShadow: "0 2px 10px rgba(0, 122, 255, 0.4)",
                }}
              >
                Begin Rehearsal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video-Off Confirmation Warning Modal */}
      <CameraOffWarningModal
        isOpen={showCameraOffModal}
        onKeepOn={() => setShowCameraOffModal(false)}
        onTurnOffAnyway={confirmTurnCameraOff}
      />
    </div>
  );
};
