import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context";
import { AppLayout } from "./components/layout/AppLayout";
import { SignInScreen } from "./screens/SignInScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { ScenariosScreen } from "./screens/ScenariosScreen";
import { RecordingsScreen } from "./screens/RecordingsScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { LiveSimulationScreen } from "./screens/LiveSimulationScreen";
import { ProcessingScreen } from "./screens/ProcessingScreen";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const MainContent: React.FC = () => {
  const { currentScreen, isAuthenticated } = useApp();

  if (!isAuthenticated || currentScreen === "sign-in") {
    return <SignInScreen />;
  }

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
