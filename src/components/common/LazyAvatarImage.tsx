import React, { useState, useEffect, useRef } from "react";

// Global concurrency limiter for remote avatar image requests (max 6 active concurrent network loads)
class ImageRequestQueue {
  private activeCount = 0;
  private queue: (() => void)[] = [];
  private maxConcurrent = 6;
  private cache = new Map<string, boolean>();
  private maxCacheSize = 200;

  async acquire(url: string, signal?: AbortSignal): Promise<boolean> {
    if (this.cache.has(url)) {
      return true;
    }

    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          const idx = this.queue.indexOf(resume);
          if (idx !== -1) this.queue.splice(idx, 1);
          reject(new DOMException("Aborted", "AbortError"));
        };

        const resume = () => {
          if (signal) signal.removeEventListener("abort", onAbort);
          resolve();
        };

        if (signal?.aborted) {
          return reject(new DOMException("Aborted", "AbortError"));
        }

        if (signal) signal.addEventListener("abort", onAbort, { once: true });
        this.queue.push(resume);
      });
    }

    this.activeCount++;
    return false;
  }

  release(url: string, success: boolean) {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (success) {
      if (this.cache.size >= this.maxCacheSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(url, true);
    }
    const next = this.queue.shift();
    if (next) next();
  }

  hasCached(url: string): boolean {
    return this.cache.has(url);
  }
}

const globalImageQueue = new ImageRequestQueue();

interface LazyAvatarImageProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LazyAvatarImage
 * Viewport-aware lazy loaded avatar with LRU caching, concurrency control,
 * decoding="async", explicit dimensions, and monogram fallback.
 */
export const LazyAvatarImage: React.FC<LazyAvatarImageProps> = ({
  src,
  alt = "",
  name = "User",
  size = 36,
  borderRadius = "50%",
  className,
  style,
}) => {
  const cleanSrc = src && typeof src === "string" ? src.trim() : "";
  const isPreCached = cleanSrc ? globalImageQueue.hasCached(cleanSrc) : false;

  const [isIntersecting, setIsIntersecting] = useState<boolean>(() => !cleanSrc || isPreCached);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isPreCached);
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport IntersectionObserver
  useEffect(() => {
    if (!cleanSrc || isIntersecting) {
      return;
    }

    const elem = containerRef.current;
    if (!elem || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "60px" } // Pre-fetch 60px before entering viewport
    );

    observer.observe(elem);
    return () => observer.disconnect();
  }, [cleanSrc, isIntersecting]);

  // Concurrency-throttled image loader
  useEffect(() => {
    if (!cleanSrc || !isIntersecting || isLoaded) return;

    const abortController = new AbortController();
    let isMounted = true;

    globalImageQueue
      .acquire(cleanSrc, abortController.signal)
      .then((alreadyCached) => {
        if (!isMounted) {
          globalImageQueue.release(cleanSrc, false);
          return;
        }
        if (alreadyCached) {
          setIsLoaded(true);
          return;
        }

        const img = new Image();
        img.decoding = "async";

        img.onload = () => {
          if (isMounted) {
            setIsLoaded(true);
            setHasError(false);
          }
          globalImageQueue.release(cleanSrc, true);
        };

        img.onerror = () => {
          if (isMounted) {
            setHasError(true);
            setIsLoaded(false);
          }
          globalImageQueue.release(cleanSrc, false);
        };

        img.src = cleanSrc;
      })
      .catch(() => {
        // Aborted or cancelled on unmount
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [cleanSrc, isIntersecting, isLoaded]);

  const monogram = (name || "AV")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: size > 40 ? "13px" : "11px",
    fontWeight: 650,
    flexShrink: 0,
    ...style,
  };

  if (!cleanSrc || hasError || (!isLoaded && !isPreCached)) {
    return (
      <div ref={containerRef} className={className} style={containerStyle} aria-label={alt || name}>
        {monogram}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      <img
        src={cleanSrc}
        alt={alt || name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
