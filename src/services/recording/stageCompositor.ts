/**
 * Stage Compositor (Recording Engine Approach B)
 *
 * Composites the full call stage into a 1280x720 30fps canvas stream:
 * - Persona AI video frame (cover)
 * - User camera PiP bottom-right (rounded, mirrored, or avatar placeholder when camera is off)
 * - Session timer & persona name
 * - Real-time speaker caption bar (last 1-2 real utterances)
 * - Dual-source Web Audio pipeline: user microphone + counterpart WebRTC audio track
 */

export interface StageCompositorOptions {
  remoteVideoElement: HTMLVideoElement | null;
  userVideoElement?: HTMLVideoElement | null;
  getUserVideoElement?: () => HTMLVideoElement | null;
  userStream?: MediaStream | null;
  userMicTrack: MediaStreamTrack | null;
  remoteAudioTrack?: MediaStreamTrack | null;
  isUserCameraActive: () => boolean;
  personaName?: string;
  userInitials?: string;
  getElapsedSeconds?: () => number;
}

export interface StageCaption {
  speaker: string;
  text: string;
  timestampMs?: number;
}

export class StageCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream;
  private audioCtx: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private userMicSource: MediaStreamAudioSourceNode | null = null;
  private userMicGain: GainNode | null = null;
  private remoteAudioSource: MediaStreamAudioSourceNode | null = null;

  private remoteVideo: HTMLVideoElement | null = null;
  private userVideo: HTMLVideoElement | null = null;
  private internalUserVideo: HTMLVideoElement | null = null;
  private getUserVideoElement?: () => HTMLVideoElement | null;
  private isUserCameraActive: () => boolean;
  private personaName: string;
  private userInitials: string;
  private getElapsedSeconds: () => number;

  private currentCaption: StageCaption | null = null;
  private captionTimeout: ReturnType<typeof setTimeout> | null = null;

  private isDestroyed = false;
  private animFrameId: number | null = null;
  private timerPumpId: ReturnType<typeof setInterval> | null = null;
  private rVfcId: number | null = null;

  constructor(options: StageCompositorOptions) {
    this.remoteVideo = options.remoteVideoElement;
    this.userVideo = options.userVideoElement || null;
    this.getUserVideoElement = options.getUserVideoElement;
    this.isUserCameraActive = options.isUserCameraActive;
    this.personaName = options.personaName || "AI Counterpart";
    this.userInitials = options.userInitials || "YOU";
    this.getElapsedSeconds = options.getElapsedSeconds || (() => 0);

    // Setup dedicated offscreen video element for user stream if provided
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      try {
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.autoplay = true;
        if (options.userStream && options.userStream.getVideoTracks().some((t) => t.readyState === "live")) {
          v.srcObject = options.userStream;
          v.play().catch(() => {});
        }
        this.internalUserVideo = v;
      } catch {}
    }

    const width = 1280;
    const height = 720;

    // 1. Setup offscreen 1280x720 Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d", { alpha: false });

    // 2. Setup Audio Graph
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // User Microphone track -> Gain Node -> Destination
      if (options.userMicTrack && options.userMicTrack.readyState === "live") {
        const micStream = new MediaStream([options.userMicTrack]);
        this.userMicSource = this.audioCtx.createMediaStreamSource(micStream);
        this.userMicGain = this.audioCtx.createGain();
        this.userMicGain.gain.value = 1.0;
        this.userMicSource.connect(this.userMicGain);
        this.userMicGain.connect(this.audioDestination);
      }

      // Remote Audio track -> Destination
      if (options.remoteAudioTrack && options.remoteAudioTrack.readyState === "live") {
        this.setRemoteAudioTrack(options.remoteAudioTrack);
      }
    } catch (err) {
      console.warn("[StageCompositor] AudioContext initialization error:", err);
    }

    // 3. Create canvas stream at 30fps
    const canvasStream = this.canvas.captureStream ? this.canvas.captureStream(30) : new MediaStream();
    const videoTrack = canvasStream.getVideoTracks()[0];

    const tracks: MediaStreamTrack[] = [];
    if (videoTrack) tracks.push(videoTrack);
    if (this.audioDestination) {
      const mixedAudioTrack = this.audioDestination.stream.getAudioTracks()[0];
      if (mixedAudioTrack) tracks.push(mixedAudioTrack);
    }

    this.stream = new MediaStream(tracks);

    // 4. Start frame render loop
    this.startPump();
  }

  getStream(): MediaStream {
    return this.stream;
  }

  setUserStream(stream: MediaStream | null): void {
    if (this.internalUserVideo) {
      if (stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled)) {
        this.internalUserVideo.srcObject = stream;
        this.internalUserVideo.play().catch(() => {});
      } else {
        this.internalUserVideo.srcObject = null;
      }
    }
  }

  setMicMuted(muted: boolean): void {
    if (this.userMicGain && this.audioCtx) {
      this.userMicGain.gain.setValueAtTime(muted ? 0 : 1, this.audioCtx.currentTime);
    }
  }

  setRemoteAudioTrack(track: MediaStreamTrack | null): void {
    if (!this.audioCtx || !this.audioDestination) return;

    if (this.remoteAudioSource) {
      try {
        this.remoteAudioSource.disconnect();
      } catch {}
      this.remoteAudioSource = null;
    }

    if (track && track.readyState === "live") {
      try {
        const remoteStream = new MediaStream([track]);
        this.remoteAudioSource = this.audioCtx.createMediaStreamSource(remoteStream);
        this.remoteAudioSource.connect(this.audioDestination);
      } catch (err) {
        console.warn("[StageCompositor] Failed to connect remote audio track:", err);
      }
    }
  }

  setCaption(speaker: string, text: string): void {
    if (this.captionTimeout) {
      clearTimeout(this.captionTimeout);
    }
    this.currentCaption = { speaker, text, timestampMs: Date.now() };

    // Auto-clear caption after 5.5s of silence
    this.captionTimeout = setTimeout(() => {
      this.currentCaption = null;
    }, 5500);
  }

  private startPump(): void {
    const renderFrame = () => {
      if (this.isDestroyed) return;
      this.render();

      // Prioritize requestVideoFrameCallback on persona video for smooth sync
      if (this.remoteVideo && typeof (this.remoteVideo as any).requestVideoFrameCallback === "function") {
        this.rVfcId = (this.remoteVideo as any).requestVideoFrameCallback(() => {
          renderFrame();
        });
      } else {
        this.animFrameId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    // Secondary fallback pump (ensures at least 25fps even if window is minimized or rVfc drops)
    this.timerPumpId = setInterval(() => {
      if (!this.isDestroyed) {
        this.render();
      }
    }, 1000 / 30);
  }

  private render(): void {
    if (this.isDestroyed || !this.ctx) return;
    const ctx = this.ctx;
    const width = 1280;
    const height = 720;

    // --- Layer 1: Persona Video Frame (Cover 1280x720) ---
    const hasRemote =
      this.remoteVideo &&
      this.remoteVideo.readyState >= 2 &&
      !this.remoteVideo.paused &&
      this.remoteVideo.videoWidth > 0;

    if (hasRemote && this.remoteVideo) {
      try {
        ctx.drawImage(this.remoteVideo, 0, 0, width, height);
      } catch {
        this.drawPersonaPlaceholder(ctx, width, height);
      }
    } else {
      this.drawPersonaPlaceholder(ctx, width, height);
    }

    // --- Layer 2: Top Header Bar (Persona Name & Timer) ---
    this.drawTopHeader(ctx, width);

    // --- Layer 3: User Camera PiP (Bottom-Right, 280x158) ---
    this.drawUserPip(ctx, width, height);

    // --- Layer 4: Live Caption Bar (Bottom-Center) ---
    this.drawCaptionBar(ctx, width, height);
  }

  private drawPersonaPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.personaName, width / 2, height / 2 - 12);

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    ctx.fillText("Live AI Simulation Active", width / 2, height / 2 + 20);
  }

  private drawTopHeader(ctx: CanvasRenderingContext2D, width: number): void {
    const elapsed = this.getElapsedSeconds();
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    const timerStr = `${mm}:${ss}`;

    ctx.save();
    // Top gradient scrim
    const grad = ctx.createLinearGradient(0, 0, 0, 80);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 80);

    // Left: Persona Name Pill
    this.drawRoundedRect(ctx, 24, 20, 200, 36, 18);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 13.5px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.personaName, 42, 43);

    // Right: Live Timer Pill
    this.drawRoundedRect(ctx, width - 110, 20, 86, 36, 18);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'SF Pro Text', monospace";
    ctx.textAlign = "center";
    ctx.fillText(timerStr, width - 67, 43);

    ctx.restore();
  }

  private drawUserPip(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pipW = 280;
    const pipH = 158;
    const pipX = width - pipW - 24;
    const pipY = height - pipH - 24;
    const pipRadius = 12;

    const dynamicVideo = this.getUserVideoElement ? this.getUserVideoElement() : null;
    const candidateVideo =
      dynamicVideo && dynamicVideo.readyState >= 2 && dynamicVideo.videoWidth > 0 && !dynamicVideo.paused
        ? dynamicVideo
        : this.internalUserVideo && this.internalUserVideo.readyState >= 2 && this.internalUserVideo.videoWidth > 0
        ? this.internalUserVideo
        : this.userVideo && this.userVideo.readyState >= 2 && this.userVideo.videoWidth > 0 && !this.userVideo.paused
        ? this.userVideo
        : null;

    const hasUserCam = this.isUserCameraActive() && Boolean(candidateVideo);

    ctx.save();

    // Drop shadow behind PiP
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    this.drawRoundedRect(ctx, pipX, pipY, pipW, pipH, pipRadius);
    ctx.fillStyle = "#111113";
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.clip();

    // Always translate to PiP coordinates
    ctx.translate(pipX, pipY);

    if (hasUserCam && candidateVideo) {
      // Mirror self-view like native camera
      ctx.translate(pipW, 0);
      ctx.scale(-1, 1);
      try {
        ctx.drawImage(candidateVideo, 0, 0, pipW, pipH);
      } catch {
        ctx.scale(-1, 1);
        ctx.translate(-pipW, 0);
        this.drawPipPlaceholder(ctx, pipW, pipH);
      }
    } else {
      this.drawPipPlaceholder(ctx, pipW, pipH);
    }

    ctx.restore();

    // Border around PiP
    ctx.save();
    this.drawRoundedRect(ctx, pipX, pipY, pipW, pipH, pipRadius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private drawPipPlaceholder(ctx: CanvasRenderingContext2D, pipW: number, pipH: number): void {
    ctx.fillStyle = "#161618";
    ctx.fillRect(0, 0, pipW, pipH);

    // Initials circle
    ctx.beginPath();
    ctx.arc(pipW / 2, pipH / 2 - 10, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.userInitials, pipW / 2, pipH / 2 - 5);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Camera Off", pipW / 2, pipH / 2 + 25);
  }

  private drawCaptionBar(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentCaption || !this.currentCaption.text.trim()) return;

    ctx.save();
    const captionText = this.currentCaption.text.trim();
    const speakerLabel = `${this.currentCaption.speaker}: `;

    ctx.font = "13.5px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    const speakerWidth = ctx.measureText(speakerLabel).width;
    ctx.font = "500 13.5px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    const textWidth = ctx.measureText(captionText).width;

    const totalContentWidth = Math.min(width - 400, speakerWidth + textWidth);
    const boxW = totalContentWidth + 36;
    const boxH = 40;
    const boxX = (width - boxW) / 2;
    const boxY = height - 76;

    this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 20);
    ctx.fillStyle = "rgba(10, 10, 12, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Speaker label (Blue/Gold accent)
    ctx.fillStyle = this.currentCaption.speaker.toLowerCase() === "you" ? "var(--accent-blue, #0a84ff)" : "#ff9f0a";
    ctx.font = "650 13.5px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(speakerLabel, boxX + 18, boxY + 25);

    // Caption text
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 13.5px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
    const truncatedText =
      textWidth > width - 450 ? captionText.slice(0, 65) + "…" : captionText;
    ctx.fillText(truncatedText, boxX + 18 + speakerWidth, boxY + 25);

    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.rVfcId && this.remoteVideo && typeof (this.remoteVideo as any).cancelVideoFrameCallback === "function") {
      (this.remoteVideo as any).cancelVideoFrameCallback(this.rVfcId);
      this.rVfcId = null;
    }
    if (this.timerPumpId) {
      clearInterval(this.timerPumpId);
      this.timerPumpId = null;
    }
    if (this.captionTimeout) {
      clearTimeout(this.captionTimeout);
      this.captionTimeout = null;
    }

    if (this.internalUserVideo) {
      try {
        this.internalUserVideo.srcObject = null;
      } catch {}
      this.internalUserVideo = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
