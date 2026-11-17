import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  active?: boolean;
  barsCount?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  level?: number; // Real audio RMS level: 0.0 to 1.0 (fallback / test mode)
  stream?: MediaStream | null; // Direct live stream for zero-render Web Audio RMS
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active = true,
  barsCount = 6,
  color = "var(--success-color)",
  size = "md",
  level,
  stream,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const getDimensions = () => {
    switch (size) {
      case "sm":
        return { maxHeight: 14, barWidth: "2px", gap: "2px" };
      case "lg":
        return { maxHeight: 28, barWidth: "3px", gap: "3px" };
      case "md":
      default:
        return { maxHeight: 20, barWidth: "2.5px", gap: "2.5px" };
    }
  };

  const { maxHeight, barWidth, gap } = getDimensions();

  // Helper to apply height to bar elements directly without React re-renders
  const applyBarHeights = React.useCallback(
    (rms: number) => {
      const center = (barsCount - 1) / 2;
      for (let i = 0; i < barsCount; i++) {
        const el = barRefs.current[i];
        if (!el) continue;
        if (!active || rms < 0.015) {
          el.style.height = "15%";
          continue;
        }
        const dist = Math.abs(i - center) / (center || 1);
        const curve = Math.cos(dist * (Math.PI / 3));
        const clamped = Math.min(1, Math.max(0, rms));
        const pct = Math.min(100, Math.max(15, Math.round(15 + clamped * 85 * curve)));
        el.style.height = `${pct}%`;
      }
    },
    [active, barsCount]
  );

  // If level prop is passed directly (tests or external feed)
  useEffect(() => {
    if (stream) return; // stream-based animation handles it
    if (typeof level === "number") {
      applyBarHeights(level);
    }
  }, [level, active, stream, applyBarHeights]);

  // Live AudioContext and AnalyserNode animation per stream
  useEffect(() => {
    if (!active || !stream) {
      applyBarHeights(0);
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      applyBarHeights(0);
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let rafId: number | null = null;
    let isDisposed = false;

    try {
      ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.3;

      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser); // Never connect to ctx.destination to avoid feedback

      const buffer = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (isDisposed || !analyser) return;

        analyser.getFloatTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        // Normalized with noise gate
        const scaled = rms < 0.02 ? 0 : Math.min(1, (rms - 0.02) * 4);
        applyBarHeights(scaled);

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[AudioVisualizer] AudioContext setup failed:", err);
    }

    return () => {
      isDisposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (source) {
        try {
          source.disconnect();
        } catch {}
      }
      if (ctx) {
        ctx.close().catch(() => {});
      }
      applyBarHeights(0);
    };
  }, [active, stream, applyBarHeights]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        height: `${maxHeight}px`,
      }}
    >
      {Array.from({ length: barsCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          style={{
            width: barWidth,
            height: "15%",
            backgroundColor: color,
            borderRadius: "1px",
            transition: "height 60ms ease-out",
          }}
        />
      ))}
    </div>
  );
};
