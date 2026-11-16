import { useState, useEffect, useCallback, useRef } from "react";

export type PermissionStatus =
  | "granted"
  | "denied"
  | "not-determined"
  | "restricted"
  | "unknown"
  | "loading";

export interface UsePermissionReturn {
  status: PermissionStatus;
  isLoading: boolean;
  isGranted: boolean;
  isDenied: boolean;
  request: () => Promise<boolean>;
  openSettings: () => Promise<boolean>;
  refresh: () => Promise<PermissionStatus>;
}

export function usePermission(resource: "camera" | "microphone"): UsePermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>("loading");
  const isMountedRef = useRef(true);

  const queryStatus = useCallback(async (): Promise<PermissionStatus> => {
    if (typeof window !== "undefined" && window.electronAPI?.getMediaStatus) {
      try {
        const s = await window.electronAPI.getMediaStatus(resource);
        if (isMountedRef.current) setStatus(s);
        return s;
      } catch {
        if (isMountedRef.current) setStatus("unknown");
        return "unknown";
      }
    }

    // Web / Test fallback
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        const pName = resource === "camera" ? "camera" : "microphone";
        // Cast as PermissionDescriptor for non-standard camera/microphone names in some browsers
        const p = await navigator.permissions.query({ name: pName as PermissionName });
        const mapped = p.state === "granted" ? "granted" : p.state === "denied" ? "denied" : "not-determined";
        if (isMountedRef.current) setStatus(mapped);
        return mapped;
      } catch {
        // Fallback: assume not-determined
        if (isMountedRef.current) setStatus("not-determined");
        return "not-determined";
      }
    }

    if (isMountedRef.current) setStatus("unknown");
    return "unknown";
  }, [resource]);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      queryStatus();
    }, 0);

    let cleanup: (() => void) | undefined;
    if (typeof window !== "undefined" && window.electronAPI?.onPermissionsUpdated) {
      cleanup = window.electronAPI.onPermissionsUpdated((payload) => {
        if (!isMountedRef.current) return;
        if (resource === "camera" && payload.camera) {
          setStatus(payload.camera as PermissionStatus);
        } else if (resource === "microphone" && payload.microphone) {
          setStatus(payload.microphone as PermissionStatus);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, [queryStatus, resource]);

  const request = useCallback(async (): Promise<boolean> => {
    if (typeof window !== "undefined" && window.electronAPI?.requestMediaAccess) {
      try {
        const granted = await window.electronAPI.requestMediaAccess(resource);
        if (granted) {
          // Probe via getUserMedia to establish active capture session and device enumeration permissions
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                [resource === "camera" ? "video" : "audio"]: true,
              });
              stream.getTracks().forEach((t) => t.stop());
            } catch {
              // Ignore stream errors after system grant
            }
          }
          setStatus("granted");
          return true;
        } else {
          const current = await window.electronAPI.getMediaStatus(resource);
          setStatus(current);
          return false;
        }
      } catch (err) {
        console.error("[usePermission] Failed to request", resource, err);
        return false;
      }
    }

    // Fallback: trigger getUserMedia directly
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          [resource === "camera" ? "video" : "audio"]: true,
        });
        stream.getTracks().forEach((t) => t.stop());
        setStatus("granted");
        return true;
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setStatus("denied");
        }
        return false;
      }
    }

    return false;
  }, [resource]);

  const openSettings = useCallback(async (): Promise<boolean> => {
    if (typeof window !== "undefined" && window.electronAPI?.openSystemSettings) {
      return window.electronAPI.openSystemSettings(resource);
    }
    return false;
  }, [resource]);

  return {
    status,
    isLoading: status === "loading",
    isGranted: status === "granted",
    isDenied: status === "denied",
    request,
    openSettings,
    refresh: queryStatus,
  };
}
