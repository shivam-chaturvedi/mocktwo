import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context";
import { Button } from "./Button";
import { PermissionPrompt } from "./PermissionPrompt";
import { usePermission } from "../../hooks/usePermission";
import { MocktwoLogo } from "./MocktwoLogo";
import {
  X,
  Sliders,
  Mic,
  Shield,
  Film,
  Activity,
  ExternalLink,
  Trash2,
  FolderOpen,
  Camera,
  Volume2,
} from "lucide-react";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics";
import { playTurnSound } from "../../utils/audioFeedback";

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    settings,
    updateSettings,
    baseline,
    showToast,
    openBaselineSheet,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"general" | "hardware" | "privacy" | "recordings">("general");

  // Real Microphone Testing State
  const [micTestingState, setMicTestingState] = useState<"idle" | "listening" | "success" | "silent">("idle");
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingBuffers, setIsClearingBuffers] = useState(false);

  // Clean up any ongoing microphone test when closing or switching tabs
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (micAnimFrameRef.current) {
        cancelAnimationFrame(micAnimFrameRef.current);
        micAnimFrameRef.current = null;
      }
    };
  }, [isSettingsOpen, activeTab]);

  const cameraPermission = usePermission("camera");
  const micPermission = usePermission("microphone");

  const [realCameras, setRealCameras] = useState<{ id: string; label: string }[]>([]);
  const [realMics, setRealMics] = useState<{ id: string; label: string }[]>([]);
  const [realSpeakers, setRealSpeakers] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!isSettingsOpen || activeTab !== "hardware" || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cams = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        const mics = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
        const spks = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({ id: d.deviceId, label: d.label || `Speaker ${i + 1}` }));
        if (cams.length > 0) setRealCameras(cams);
        if (mics.length > 0) setRealMics(mics);
        if (spks.length > 0) setRealSpeakers(spks);
      })
      .catch(() => {});
  }, [isSettingsOpen, activeTab]);

  useEffect(() => {
    const handleOpenPrivacy = () => setActiveTab("privacy");
    window.addEventListener("mocktwo-open-privacy-tab", handleOpenPrivacy);
    return () => window.removeEventListener("mocktwo-open-privacy-tab", handleOpenPrivacy);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.metaKey && e.key === "w")) {
        e.preventDefault();
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings]);

  if (!isSettingsOpen) return null;

  // Real Microphone Audio Meter Test
  const handleStartMicTest = async () => {
    if (micTestingState === "listening") return;
    try {
      setMicTestingState("listening");
      setMicVolumeLevel(0);

      const constraints: MediaStreamConstraints = {
        audio: settings.selectedMicrophone ? { deviceId: { exact: settings.selectedMicrophone } } : true,
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let peakVolume = 0;
      const startTime = Date.now();

      const sample = () => {
        if (!micStreamRef.current) return;
        const elapsed = Date.now() - startTime;
        if (elapsed > 3500) {
          stream.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
          ctx.close().catch(() => {});

          if (peakVolume > 8) {
            setMicTestingState("success");
            showToast(`Microphone active: peak input volume was ${Math.round(peakVolume)}%`);
          } else {
            setMicTestingState("silent");
            showToast("Microphone active, but no speaking volume detected.");
          }

          setTimeout(() => {
            setMicTestingState("idle");
            setMicVolumeLevel(0);
          }, 3500);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        if (normalized > peakVolume) peakVolume = normalized;
        setMicVolumeLevel(normalized);

        micAnimFrameRef.current = requestAnimationFrame(sample);
      };

      micAnimFrameRef.current = requestAnimationFrame(sample);
    } catch (err: any) {
      console.warn("[SettingsModal] Test mic error:", err);
      setMicTestingState("idle");
      showToast("Could not access microphone: " + (err.message || "Permission required"));
    }
  };

  const handleRecalibrateBaseline = () => {
    closeSettings();
    openBaselineSheet();
  };

  const handleClearCachedBuffers = async () => {
    setIsClearingBuffers(true);
    try {
      if (window.electronAPI?.storage?.clearVideoCache) {
        const res = await window.electronAPI.storage.clearVideoCache();
        const mb = res?.clearedBytes ? (res.clearedBytes / (1024 * 1024)).toFixed(1) : "0";
        showToast(`Cleared ${mb} MB of cached video buffers (${res?.filesRemoved || 0} temporary chunks removed)`);
      } else {
        showToast("Local recording cache cleared");
      }
    } catch (err: any) {
      showToast("Failed to clear video cache: " + err.message);
    } finally {
      setIsClearingBuffers(false);
    }
  };

  const tabs: { id: "general" | "hardware" | "privacy" | "recordings"; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Sliders size={13} /> },
    { id: "hardware", label: "Audio, Video & Sensors", icon: <Mic size={13} /> },
    { id: "privacy", label: "Privacy & Data", icon: <Shield size={13} /> },
    { id: "recordings", label: "Recordings", icon: <Film size={13} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
      onClick={closeSettings}
    >
      <div
        className="glass-surface animate-sheet-in"
        style={{
          width: "100%",
          maxWidth: "700px",
          height: "560px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--separator)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="mocktwo Preferences"
      >
        {/* Settings Header Toolbar */}
        <div
          style={{
            height: "76px",
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderBottom: "1px solid var(--separator)",
            backgroundColor: "rgba(42, 42, 44, 0.4)",
            position: "relative",
          }}
        >
          <button
            onClick={closeSettings}
            aria-label="Close"
            className="hover-subtle focus-ring"
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              color: "var(--text-tertiary)",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>

          <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)" }}>
            Preferences
          </span>

          {/* Segmented Toolbar Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              backgroundColor: "var(--bg-control)",
              padding: "2px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--separator)",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="focus-ring"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    fontWeight: isActive ? 600 : 450,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                    boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.35)" : "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Body */}
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Turn-Taking Sounds */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ maxWidth: "460px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Turn-taking sounds
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4, display: "block", marginTop: "2px" }}>
                      Plays a subtle harmonic chime when the AI counterpart finishes speaking, indicating that it is your turn to respond.
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => playTurnSound("preview")}
                      className="mac-btn mac-btn-secondary focus-ring"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                      title="Listen to a preview of the turn chime"
                    >
                      <Volume2 size={12} />
                      Test chime
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.hapticFeedback}
                      onChange={(e) => updateSettings({ hapticFeedback: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>

              {/* Reduced Motion Accessibility Option */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ maxWidth: "460px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Reduce UI motion
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4, display: "block", marginTop: "2px" }}>
                      Minimizes animations, pulse ring transitions, and decorative movement across windows.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* About mocktwo */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <MocktwoLogo size={36} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
                    {import.meta.env.VITE_APP_NAME || "mocktwo"}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    Version {import.meta.env.VITE_APP_VERSION || "1.0.0"} • Desktop rehearsal & composure sensing
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUDIO, VIDEO & SENSORS TAB */}
          {activeTab === "hardware" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {!cameraPermission.isGranted ? (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    Camera Source
                  </label>
                  <PermissionPrompt
                    resource="camera"
                    status={cameraPermission.status}
                    onRequest={cameraPermission.request}
                    onOpenSettings={cameraPermission.openSettings}
                    compact
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    Camera Source
                  </label>
                  <select
                    value={settings.selectedCamera}
                    onChange={(e) => updateSettings({ selectedCamera: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    {realCameras.length > 0 ? (
                      realCameras.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))
                    ) : (
                      <option value="">Default Camera</option>
                    )}
                  </select>
                </div>
              )}

              {!micPermission.isGranted ? (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    Microphone Input
                  </label>
                  <PermissionPrompt
                    resource="microphone"
                    status={micPermission.status}
                    onRequest={micPermission.request}
                    onOpenSettings={micPermission.openSettings}
                    compact
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                    Microphone Input
                  </label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <select
                      value={settings.selectedMicrophone}
                      onChange={(e) => updateSettings({ selectedMicrophone: e.target.value })}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "var(--bg-control)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    >
                      {realMics.length > 0 ? (
                        realMics.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))
                      ) : (
                        <option value="">Default Microphone</option>
                      )}
                    </select>
                    <Button
                      variant={micTestingState === "listening" ? "primary" : "secondary"}
                      size="sm"
                      onClick={handleStartMicTest}
                      disabled={micTestingState === "listening"}
                      style={{ minWidth: "105px" }}
                    >
                      {micTestingState === "listening" ? `Listening… ${micVolumeLevel}%` : micTestingState === "success" ? `Mic OK (${micVolumeLevel}%)` : "Test Mic"}
                    </Button>
                  </div>

                  {/* Real Live Volume Meter during Test */}
                  {micTestingState === "listening" && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text-tertiary)", marginBottom: "3px" }}>
                        <span>Speak normally into your microphone...</span>
                        <span>{micVolumeLevel}%</span>
                      </div>
                      <div style={{ width: "100%", height: "4px", backgroundColor: "var(--bg-control)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${micVolumeLevel}%`,
                            height: "100%",
                            backgroundColor: micVolumeLevel > 70 ? "var(--accent-orange)" : "var(--accent-green)",
                            transition: "width 0.05s linear",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "6px" }}>
                  Speaker Output
                </label>
                <select
                  value={settings.selectedSpeaker}
                  onChange={(e) => updateSettings({ selectedSpeaker: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                >
                  {realSpeakers.length > 0 ? (
                    realSpeakers.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))
                  ) : (
                    <option value="">Default Speakers</option>
                  )}
                </select>
              </div>

              {/* SENSORS SECTION: CAMERA PULSE MEASUREMENT */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Activity size={15} style={{ color: "var(--accent-red)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>
                    Camera Optical Telemetry
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
                  Measures resting pulse, heart rate variability (HRV), and respiration rate using your built-in optical webcam. No wearable straps or cloud processing required.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--separator)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Resting Baseline Calibration
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {baseline ? (
                        <span>
                          Current calm baseline: <strong>{baseline.restingPulse || baseline.restingHR} bpm</strong> · Breathing {baseline.restingBreathingRate || "—"} br/m · HRV {baseline.restingHrvRmssd || baseline.restingHRV || "—"} ms
                        </span>
                      ) : (
                        "No baseline calibrated yet"
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRecalibrateBaseline}
                  >
                    Recalibrate baseline (90s)
                  </Button>
                </div>

                {/* Telemetry Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Anonymous Diagnostics &amp; Telemetry
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Share anonymous crash logs and SDK calibration timing to improve mocktwo. Disabled by default.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telemetryEnabled)}
                    onChange={(e) => {
                      updateSettings({ telemetryEnabled: e.target.checked });
                      showToast(e.target.checked ? "Anonymous diagnostics enabled" : "Anonymous diagnostics disabled");
                    }}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                </div>

                {/* Device-Only Privacy Notice */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(10, 132, 255, 0.06)",
                    border: "1px solid rgba(10, 132, 255, 0.2)",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>Device-Only Privacy: </strong>
                  Video is analyzed on your device. Results are stored locally. {WELLNESS_DISCLAIMER}
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY & DATA TAB */}
          {activeTab === "privacy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  Hardware &amp; OS Permissions
                </h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                  mocktwo requests camera and microphone permissions just-in-time when you start a baseline calibration or rehearsal simulation.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Camera Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Camera size={16} style={{ color: "var(--text-secondary)" }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                          Camera Access
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                          Used exclusively for local optical pulse, breathing, and composure sensing
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "10px",
                          backgroundColor:
                            cameraPermission.status === "granted"
                              ? "rgba(48, 209, 88, 0.15)"
                              : cameraPermission.status === "denied"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                          color:
                            cameraPermission.status === "granted"
                              ? "#34d399"
                              : cameraPermission.status === "denied"
                                ? "#f87171"
                                : "#fbbf24",
                        }}
                      >
                        {cameraPermission.status === "granted"
                          ? "Allowed"
                          : cameraPermission.status === "denied"
                            ? "Turned off"
                            : "Not configured"}
                      </span>
                      {cameraPermission.status === "denied" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ExternalLink size={12} />}
                          onClick={cameraPermission.openSettings}
                          style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
                        >
                          Settings
                        </Button>
                      ) : cameraPermission.status !== "granted" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cameraPermission.request}
                          style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
                        >
                          Allow
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Microphone Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-control)",
                      border: "1px solid var(--separator)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Mic size={16} style={{ color: "var(--text-secondary)" }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                          Microphone Access
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                          Used for simulation dialogue and vocal cadence feedback
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "10px",
                          backgroundColor:
                            micPermission.status === "granted"
                              ? "rgba(48, 209, 88, 0.15)"
                              : micPermission.status === "denied"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                          color:
                            micPermission.status === "granted"
                              ? "#34d399"
                              : micPermission.status === "denied"
                                ? "#f87171"
                                : "#fbbf24",
                        }}
                      >
                        {micPermission.status === "granted"
                          ? "Allowed"
                          : micPermission.status === "denied"
                            ? "Turned off"
                            : "Not configured"}
                      </span>
                      {micPermission.status === "denied" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ExternalLink size={12} />}
                          onClick={micPermission.openSettings}
                          style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
                        >
                          Settings
                        </Button>
                      ) : micPermission.status !== "granted" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={micPermission.request}
                          style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
                        >
                          Allow
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* 100% On-Device Guarantee Card */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <Shield size={16} style={{ color: "#60a5fa", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#93c5fd" }}>
                    100% On-Device Storage
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.45 }}>
                    All recordings, physiological vitals, personal baselines, and notes remain strictly on this computer in a local SQLite database. No video or biometric telemetry is ever sent to external cloud servers.
                  </div>
                </div>
              </div>

              {/* Diagnostic Logs & Data Reset */}
              <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                      Diagnostic Logs
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                      Rotated local log files tracking application events and hardware states.
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FolderOpen size={12} />}
                    onClick={async () => {
                      if (window.electronAPI?.revealLogs) {
                        showToast("Opening logs directory in Finder...");
                        await window.electronAPI.revealLogs();
                      }
                    }}
                  >
                    Reveal Logs
                  </Button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--separator)", paddingTop: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#ef4444", display: "block" }}>
                      Clear All Local Data
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                      Permanently wipe all stored recordings, baselines, scenarios, and preferences.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 size={12} />}
                    onClick={() => setShowClearConfirm(true)}
                    style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                  >
                    Clear All Data…
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* RECORDINGS TAB */}
          {activeTab === "recordings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  Recording Retention Policy
                </h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                  Automatically remove completed session recordings after a set period to preserve storage.
                </p>

                <select
                  value={settings.recordingsRetentionDays || 90}
                  onChange={async (e) => {
                    const days = Number(e.target.value);
                    updateSettings({ recordingsRetentionDays: days });
                    if (days > 0 && window.electronAPI?.storage?.enforceRetention) {
                      const res = await window.electronAPI.storage.enforceRetention(days);
                      if (res?.deletedCount && res.deletedCount > 0) {
                        showToast(`Retention policy applied: Removed ${res.deletedCount} recordings older than ${days} days.`);
                      } else {
                        showToast(`Retention policy updated: Keep recordings for ${days} days.`);
                      }
                    } else if (days === 0) {
                      showToast("Retention policy updated: Never auto-delete.");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: "1px solid var(--separator)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <option value={30}>Keep for 30 days, then delete</option>
                  <option value={90}>Keep for 90 days (Recommended)</option>
                  <option value={365}>Keep for 1 year</option>
                  <option value={0}>Never auto-delete (Keep indefinitely)</option>
                </select>
              </div>

              {/* Encryption & Security Card */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(48, 209, 88, 0.08)",
                  border: "1px solid rgba(48, 209, 88, 0.25)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <Shield size={18} style={{ color: "var(--accent-green)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Local macOS Application Storage
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                    Video buffers, body-signal metrics, and transcripts are stored locally inside the application sandbox on this Mac.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isClearingBuffers}
                  onClick={handleClearCachedBuffers}
                >
                  {isClearingBuffers ? "Clearing…" : "Clear Cached Video Buffers"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear All Data Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isClearing) setShowClearConfirm(false);
          }}
        >
          <div
            className="glass-surface"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "#161618",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={18} style={{ color: "#ef4444" }} />
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#f3f4f6" }}>
                Clear All Local Data?
              </h3>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", lineHeight: 1.5, color: "#9ca3af" }}>
              This will permanently delete all your rehearsal recordings, baseline calibrations, scenarios, and local settings from this computer. This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button
                variant="secondary"
                size="md"
                disabled={isClearing}
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    if (window.electronAPI?.storage) {
                      await window.electronAPI.storage.clearAllData();
                    }
                    if (typeof localStorage !== "undefined") {
                      localStorage.clear();
                    }
                    showToast("All local data has been erased.");
                    setShowClearConfirm(false);
                    closeSettings();
                    window.location.reload();
                  } catch (err) {
                    console.error("Failed to clear data:", err);
                    setIsClearing(false);
                  }
                }}
                style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
              >
                {isClearing ? "Clearing…" : "Yes, Erase Everything"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
