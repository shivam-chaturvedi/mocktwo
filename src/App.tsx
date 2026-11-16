import React, { useEffect, Suspense } from "react";
import { AppProvider, useApp } from "./context";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const SignInScreen = React.lazy(() => import("./screens/SignInScreen").then((m) => ({ default: m.SignInScreen })));
const TodayScreen = React.lazy(() => import("./screens/TodayScreen").then((m) => ({ default: m.TodayScreen })));
const ScenariosScreen = React.lazy(() => import("./screens/ScenariosScreen").then((m) => ({ default: m.ScenariosScreen })));
const RecordingsScreen = React.lazy(() => import("./screens/RecordingsScreen").then((m) => ({ default: m.RecordingsScreen })));
const ProgressScreen = React.lazy(() => import("./screens/ProgressScreen").then((m) => ({ default: m.ProgressScreen })));
const LiveSimulationScreen = React.lazy(() => import("./screens/LiveSimulationScreen").then((m) => ({ default: m.LiveSimulationScreen })));
const ProcessingScreen = React.lazy(() => import("./screens/ProcessingScreen").then((m) => ({ default: m.ProcessingScreen })));

const MainContent: React.FC = () => {
  const { currentScreen, isAuthenticated } = useApp();

  return (
    <Suspense fallback={<div className="flex-1 bg-surface-base animate-pulse" />}>
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
