/**
 * src/utils/audioSink.ts
 *
 * Safe wrapper for HTMLMediaElement.setSinkId (speaker output routing).
 * If the selected sinkId is invalid, unsupported, or rejected, falls back to the system default ("").
 */

export async function safeSetAudioSinkId(
  element: HTMLMediaElement | null | undefined,
  sinkId: string | undefined
): Promise<void> {
  if (!element) return;
  const target = sinkId || "";
  const elWithSink = element as HTMLMediaElement & {
    setSinkId?: (sinkId: string) => Promise<void>;
  };

  if (typeof elWithSink.setSinkId !== "function") return;

  try {
    if (target) {
      await elWithSink.setSinkId(target);
    } else {
      await elWithSink.setSinkId("");
    }
  } catch (err) {
    console.warn(`[audioSink] Failed to set sinkId '${target}', falling back to default:`, err);
    try {
      await elWithSink.setSinkId("");
    } catch {
      // ignore secondary fallback error
    }
  }
}
