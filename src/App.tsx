import React, { useEffect, useState, Suspense } from "react";
import { AppProvider, useApp } from "./context";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Primary tabs are eagerly imported for instant, zero-flicker tab switching
import { TodayScreen } from "./screens/TodayScreen";
import { ScenariosScreen } from "./screens/ScenariosScreen";
import { RecordingsScreen } from "./screens/RecordingsScreen";
import { ProgressScreen } from "./screens/ProgressScreen";

// Heavy/modal screens remain code-split
const SignInScreen = React.lazy(() => import("./screens/SignInScreen").then((m) => ({ default: m.SignInScreen })));
const LiveSimulationScreen = React.lazy(() => import("./screens/LiveSimulationScreen").then((m) => ({ default: m.LiveSimulationScreen })));
const ProcessingScreen = React.lazy(() => import("./screens/ProcessingScreen").then((m) => ({ default: m.ProcessingScreen })));

/**
 * Minimal delayed loader: only renders if loading takes > 500ms.
 * Avoids any flash of loader or blank screen during fast transitions.
 */
const DelayedLoader: React.FC<{ delayMs?: number }> = ({ delayMs = 500 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        minHeight: "300px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-window)",
      }}
    >
      <div
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.12)",
          borderTopColor: "var(--accent-blue, #0a84ff)",
          animation: "spin 0.75s linear infinite",
        }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

const MainContent: React.FC = () => {
  const { currentScreen, isAuthenticated } = useApp();

  return (
    <Suspense fallback={<DelayedLoader delayMs={500} />}>
      {!isAuthenticated || currentScreen === "sign-in" ? (
        <SignInScreen />
      ) : (
        (() => {
          switch (currentScreen) {
            case "today":
              return <TodayScreen />;
            case "scenarios":
              return <ScenariosScreen />;
            case "recordings":
              return <RecordingsScreen />;
            case "progress":
              return <ProgressScreen />;
            case "simulation":
              return <LiveSimulationScreen />;
            case "processing":
              return <ProcessingScreen />;
            default:
              return <TodayScreen />;
          }
        })()
      )}
    </Suspense>
  );
};

export function App() {
  // Global window-level crash and unhandled rejection guards
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[mocktwo] Unhandled promise rejection:", event.reason);
      try {
        const electronAPI = (window as unknown as {
          electronAPI?: { logError?: (payload: Record<string, unknown>) => void };
        }).electronAPI;
        if (electronAPI && typeof electronAPI.logError === "function") {
          electronAPI.logError({
            type: "unhandled-rejection",
            reason: String(event.reason),
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // ignore
      }
      // Prevent browser default popups or crashes
      event.preventDefault();
    };

    const handleWindowError = (
      event: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      console.error("[mocktwo] Window error caught:", { event, source, lineno, colno, error });
      try {
        const electronAPI = (window as unknown as {
          electronAPI?: { logError?: (payload: Record<string, unknown>) => void };
        }).electronAPI;
        if (electronAPI && typeof electronAPI.logError === "function") {
          electronAPI.logError({
            type: "window-error",
            message: typeof event === "string" ? event : error?.message || "Unknown",
            source: source || "",
            lineno: lineno || 0,
            colno: colno || 0,
            stack: error?.stack || "",
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.onerror = handleWindowError;

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.onerror = null;
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Application encountered an error">
      <AppProvider>
        <AppLayout>
          <MainContent />
        </AppLayout>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
