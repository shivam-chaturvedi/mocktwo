/**
 * cviSession.ts
 *
 * Framework-agnostic client session for Tavus Conversational Video Interface (CVI)
 * powered by Daily.co (@daily-co/daily-js) in call-object mode.
 *
 * Responsibilities:
 * - Creates CallObject with avoidEval: true (CSP compliant).
 * - Binds local camera & microphone tracks from application MediaStream without double-capturing.
 * - Manages remote replica video and audio track lifecycles.
 * - Subscribes to Daily app-message events for real-time utterance streaming,
 *   turn-taking started/stopped speaking, and deduplicates legacy/replica duplicates.
 * - Exposes interaction helpers (respond, interrupt, echo, appendContext).
 * - Enforces StrictMode-safe and idempotent leave() and destroy() lifecycle.
 */

import DailyIframe, { type DailyCall, type DailyEventObjectTrack, type DailyEventObjectAppMessage } from "@daily-co/daily-js";

export type CviRole = "user" | "persona";

export interface CviUtterance {
  role: CviRole;
  text: string;
  inferenceId?: string;
  seq?: number;
  timestampSec?: number;
  duration?: number;
  interrupted?: boolean;
  participantId?: string;
  participantName?: string;
}

export interface CviUtteranceStreaming {
  role: CviRole;
  text: string;
  inferenceId?: string;
  partial: boolean;
  interrupted?: boolean;
}

export interface CviSpeakingEvent {
  role: CviRole;
  speaking: boolean;
  duration?: number;
  interrupted?: boolean;
}

export interface CviParticipantState {
  participantCount: number;
  remoteJoined: boolean;
  remoteName?: string;
  localJoined: boolean;
}

export interface CviSessionCallbacks {
  onRemoteVideoTrack?: (track: MediaStreamTrack | null) => void;
  onRemoteAudioTrack?: (track: MediaStreamTrack | null) => void;
  onUtterance?: (utterance: CviUtterance) => void;
  onUtteranceStreaming?: (streaming: CviUtteranceStreaming) => void;
  onSpeaking?: (event: CviSpeakingEvent) => void;
  onParticipantState?: (state: CviParticipantState) => void;
  onNetworkQuality?: (quality: string) => void;
  onError?: (error: Error) => void;
  onEnded?: (reason?: string) => void;
}

export interface CviJoinOptions {
  url: string;
  token?: string | null;
  localStream?: MediaStream | null;
  conversationId?: string;
}

export class CviSession {
  private call: DailyCall | null = null;
  private callbacks: CviSessionCallbacks;
  private conversationId: string | null = null;
  private seenInferenceIds = new Set<string>();
  private isDestroyed = false;
  private isJoiningOrJoined = false;
  private remoteVideoTrack: MediaStreamTrack | null = null;
  private remoteAudioTrack: MediaStreamTrack | null = null;
  private participantState: CviParticipantState = {
    participantCount: 0,
    remoteJoined: false,
    localJoined: false,
  };

  constructor(callbacks: CviSessionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Initializes Daily call object and joins Tavus CVI conversation.
   */
  async join(options: CviJoinOptions): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("[CviSession] Cannot join on a destroyed session.");
    }
    if (this.isJoiningOrJoined) {
      return;
    }
    this.isJoiningOrJoined = true;
    this.conversationId = options.conversationId || null;

    try {
      // 1. Create CallObject with avoidEval: true for Content Security Policy compliance
      const call = DailyIframe.createCallObject({
        dailyConfig: {
          avoidEval: true,
        },
      });
      this.call = call;

      // 2. Register Daily lifecycle & track events
      this.bindDailyEvents(call);

      // 3. Prepare local tracks if stream is provided
      let videoSource: MediaStreamTrack | boolean = false;
      let audioSource: MediaStreamTrack | boolean = false;

      if (options.localStream) {
        const vTrack = options.localStream.getVideoTracks()[0];
        const aTrack = options.localStream.getAudioTracks()[0];
        if (vTrack && vTrack.readyState === "live") {
          videoSource = vTrack;
        }
        if (aTrack && aTrack.readyState === "live") {
          audioSource = aTrack;
        }
      }

      // 4. Join room
      const joinOptions: Record<string, any> = {
        url: options.url,
      };

      // Only pass token if explicitly provided as a non-empty string
      if (typeof options.token === "string" && options.token.trim().length > 0) {
        joinOptions.token = options.token.trim();
      }

      joinOptions.videoSource = videoSource;
      joinOptions.audioSource = audioSource;

      await call.join(joinOptions);

      this.participantState.localJoined = true;
      this.notifyParticipantState();
    } catch (err: any) {
      this.isJoiningOrJoined = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Registers event handlers on the Daily call object.
   */
  private bindDailyEvents(call: DailyCall): void {
    call.on("track-started", (event: DailyEventObjectTrack) => {
      if (this.isDestroyed || !event.participant) return;
      if (event.participant.local) return; // Remote tracks only

      if (event.track.kind === "video") {
        this.remoteVideoTrack = event.track;
        this.callbacks.onRemoteVideoTrack?.(event.track);
      } else if (event.track.kind === "audio") {
        this.remoteAudioTrack = event.track;
        this.callbacks.onRemoteAudioTrack?.(event.track);
      }
    });

    call.on("track-stopped", (event: DailyEventObjectTrack) => {
      if (this.isDestroyed || !event.participant) return;
      if (event.participant.local) return;

      if (event.track.kind === "video") {
        if (this.remoteVideoTrack === event.track) {
          this.remoteVideoTrack = null;
          this.callbacks.onRemoteVideoTrack?.(null);
        }
      } else if (event.track.kind === "audio") {
        if (this.remoteAudioTrack === event.track) {
          this.remoteAudioTrack = null;
          this.callbacks.onRemoteAudioTrack?.(null);
        }
      }
    });

    call.on("participant-joined", () => {
      if (this.isDestroyed) return;
      this.updateParticipantsFromCall(call);
    });

    call.on("participant-updated", () => {
      if (this.isDestroyed) return;
      this.updateParticipantsFromCall(call);
    });

    call.on("participant-left", () => {
      if (this.isDestroyed) return;
      this.updateParticipantsFromCall(call);
    });

    call.on("left-meeting", () => {
      if (this.isDestroyed) return;
      this.callbacks.onEnded?.("left-meeting");
    });

    call.on("error", (event: any) => {
      if (this.isDestroyed) return;
      const msg = event?.errorMsg || event?.error || "Daily WebRTC error";
      this.callbacks.onError?.(new Error(msg));
    });

    call.on("network-quality-change", (event: any) => {
      if (this.isDestroyed) return;
      const q = event?.threshold || "normal";
      this.callbacks.onNetworkQuality?.(q);
    });

    // App-message: Tavus real-time Interactions Protocol handler
    call.on("app-message", (event: DailyEventObjectAppMessage) => {
      if (this.isDestroyed || !event?.data) return;
      this.handleAppMessage(event.data);
    });
  }

  /**
   * Parses Tavus Interactions Protocol events delivered via Daily app-message.
   */
  public handleAppMessage(data: any): void {
    if (!data || typeof data !== "object") return;
    const eventType = String(data.event_type || "");

    // 1. Final turn utterance
    if (eventType === "conversation.utterance") {
      const props = data.properties || {};
      const rawRole = String(props.role || "").toLowerCase();

      // Skip duplicate legacy 'replica' messages when 'pal' is delivered
      if (rawRole === "replica") {
        // If we already received pal, or will receive pal, map cleanly
        const infId = String(data.inference_id || "");
        if (infId && this.seenInferenceIds.has(`pal_${infId}`)) {
          return; // Ignore replica duplicate
        }
      }

      const role: CviRole = rawRole === "user" ? "user" : "persona";
      const text = String(props.speech || props.text || "").trim();
      const inferenceId = data.inference_id ? String(data.inference_id) : undefined;

      // Deduplicate by inferenceId
      if (inferenceId) {
        const dedupeKey = `${role}_${inferenceId}`;
        if (this.seenInferenceIds.has(dedupeKey)) {
          return;
        }
        this.seenInferenceIds.add(dedupeKey);
        if (rawRole === "pal") {
          this.seenInferenceIds.add(`pal_${inferenceId}`);
        }
      }

      if (text.length > 0) {
        this.callbacks.onUtterance?.({
          role,
          text,
          inferenceId,
          seq: typeof data.seq === "number" ? data.seq : undefined,
          timestampSec: typeof data.timestamp === "number" ? data.timestamp : undefined,
          duration: typeof props.duration === "number" ? props.duration : undefined,
          interrupted: Boolean(props.interrupted),
          participantId: props.participant_id,
          participantName: props.participant_name,
        });
      }
      return;
    }

    // 2. Streaming utterance chunk
    if (eventType === "conversation.utterance.streaming") {
      const props = data.properties || {};
      const rawRole = String(props.role || "").toLowerCase();
      if (rawRole === "replica") return; // Skip legacy duplicate

      const role: CviRole = rawRole === "user" ? "user" : "persona";
      const text = String(props.speech || props.text || "");
      if (text.length > 0) {
        this.callbacks.onUtteranceStreaming?.({
          role,
          text,
          inferenceId: data.inference_id ? String(data.inference_id) : undefined,
          partial: true,
          interrupted: Boolean(props.interrupted),
        });
      }
      return;
    }

    // 3. Speaking status: conversation.started_speaking / conversation.stopped_speaking
    if (eventType === "conversation.started_speaking") {
      const props = data.properties || {};
      const rawRole = String(props.role || "").toLowerCase();
      if (rawRole === "replica") return;
      const role: CviRole = rawRole === "user" ? "user" : "persona";
      this.callbacks.onSpeaking?.({
        role,
        speaking: true,
      });
      return;
    }

    if (eventType === "conversation.stopped_speaking") {
      const props = data.properties || {};
      const rawRole = String(props.role || "").toLowerCase();
      if (rawRole === "replica") return;
      const role: CviRole = rawRole === "user" ? "user" : "persona";
      this.callbacks.onSpeaking?.({
        role,
        speaking: false,
        duration: typeof props.duration === "number" ? props.duration : undefined,
        interrupted: Boolean(props.interrupted),
      });
      return;
    }
  }

  /**
   * Updates internal participant state from CallObject participants list.
   */
  private updateParticipantsFromCall(call: DailyCall): void {
    const participants = call.participants();
    const count = Object.keys(participants).length;
    let remoteJoined = false;
    let remoteName: string | undefined = undefined;

    for (const p of Object.values(participants)) {
      if (!p.local) {
        remoteJoined = true;
        if (p.user_name) remoteName = p.user_name;
        // If remote video track is available and not yet set
        if (p.videoTrack && !this.remoteVideoTrack) {
          this.remoteVideoTrack = p.videoTrack;
          this.callbacks.onRemoteVideoTrack?.(p.videoTrack);
        }
        if (p.audioTrack && !this.remoteAudioTrack) {
          this.remoteAudioTrack = p.audioTrack;
          this.callbacks.onRemoteAudioTrack?.(p.audioTrack);
        }
      }
    }

    this.participantState = {
      participantCount: count,
      remoteJoined,
      remoteName,
      localJoined: Boolean(participants.local),
    };
    this.notifyParticipantState();
  }

  private notifyParticipantState(): void {
    this.callbacks.onParticipantState?.({ ...this.participantState });
  }

  /**
   * Selects audio output speaker device.
   */
  async setOutputDeviceAsync(deviceId: string): Promise<boolean> {
    if (!this.call || this.isDestroyed) return false;
    try {
      if (typeof (this.call as any).setOutputDeviceAsync === "function") {
        await (this.call as any).setOutputDeviceAsync({ outputDeviceId: deviceId });
        return true;
      }
    } catch (err) {
      console.warn("[CviSession] Failed to set output device:", err);
    }
    return false;
  }

  /**
   * Sends user text respond interaction (PAL responds as if user said this).
   */
  sendRespond(text: string): boolean {
    if (!this.call || this.isDestroyed) return false;
    try {
      this.call.sendAppMessage(
        {
          message_type: "conversation",
          event_type: "conversation.respond",
          conversation_id: this.conversationId,
          properties: { text },
        },
        "*"
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Interrupts the PAL while it is speaking.
   */
  sendInterrupt(): boolean {
    if (!this.call || this.isDestroyed) return false;
    try {
      this.call.sendAppMessage(
        {
          message_type: "conversation",
          event_type: "conversation.interrupt",
          conversation_id: this.conversationId,
        },
        "*"
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggles local video mute state in Daily.
   */
  setLocalVideo(enabled: boolean): void {
    if (!this.call || this.isDestroyed) return;
    try {
      this.call.setLocalVideo(enabled);
    } catch (err) {
      console.warn("[CviSession] setLocalVideo error:", err);
    }
  }

  /**
   * Toggles local audio mute state in Daily.
   */
  setLocalAudio(enabled: boolean): void {
    if (!this.call || this.isDestroyed) return;
    try {
      this.call.setLocalAudio(enabled);
    } catch (err) {
      console.warn("[CviSession] setLocalAudio error:", err);
    }
  }

  /**
   * Sends echo interaction for PAL to speak directly.
   */
  sendEcho(text: string): boolean {
    if (!this.call || this.isDestroyed) return false;
    try {
      this.call.sendAppMessage(
        {
          message_type: "conversation",
          event_type: "conversation.echo",
          conversation_id: this.conversationId,
          properties: {
            modality: "text",
            text,
            done: true,
          },
        },
        "*"
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends live conversational context.
   */
  sendAppendContext(context: string): boolean {
    if (!this.call || this.isDestroyed) return false;
    try {
      this.call.sendAppMessage(
        {
          message_type: "conversation",
          event_type: "conversation.append_context",
          conversation_id: this.conversationId,
          properties: { context },
        },
        "*"
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Idempotent, safe teardown for React StrictMode and unmount.
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isJoiningOrJoined = false;

    const call = this.call;
    this.call = null;

    if (call) {
      try {
        await call.leave().catch(() => {});
      } catch {}
      try {
        await call.destroy().catch(() => {});
      } catch {}
    }

    this.remoteVideoTrack = null;
    this.remoteAudioTrack = null;
    this.seenInferenceIds.clear();
  }
}
