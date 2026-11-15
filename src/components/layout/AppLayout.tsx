import React from "react";
import { useApp } from "../../context";
import { TitleBar } from "./TitleBar";
import { BriefingSheet } from "../common/BriefingSheet";
import { StudioSheet } from "../common/StudioSheet";
import { QuickPracticeModal } from "../common/QuickPracticeModal";
import { CommandPalette } from "../common/CommandPalette";
import { SettingsModal } from "../common/SettingsModal";
import { SignOutConfirmSheet } from "../common/SignOutConfirmSheet";
import { BaselineSheet } from "../common/BaselineSheet";
import { ToastNotification } from "../common/ToastNotification";
import { ErrorBoundary } from "../common/ErrorBoundary";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentScreen, isAuthenticated } = useApp();

  // If in sign-in screen, render full-window minimal layout
  if (currentScreen === "sign-in" || !isAuthenticated) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-window)",
          overflow: "hidden"
        }}
      >
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            placeItems: "center"
          }}
        >
          <ErrorBoundary>
            <ErrorBoundary>
          {children}
        </ErrorBoundary>
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  // During live simulation, render completely immersive full-window
  if (currentScreen === "simulation") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "#0b0b0c",
          overflow: "hidden"
        }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    );
  }

  // Standard full authenticated layout (Unified top toolbar, 4 tabs, zero sidebar)
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-window)",
        overflow: "hidden"
      }}
    >
      <TitleBar />

      <main
        className="app-shell-content"
        style={{
          flex: 1,
          minHeight: 0,
          height: "calc(100vh - 52px)",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Global Native Sheets, Modals & Toast (Protected by Error Boundaries) */}
      <ErrorBoundary fallbackTitle="Session briefing encountered an error">
        <BriefingSheet />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Studio encountered an error">
        <StudioSheet />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Quick practice encountered an error">
        <QuickPracticeModal />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Command palette encountered an error">
        <CommandPalette />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Settings encountered an error">
        <SettingsModal />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Confirmation encountered an error">
        <SignOutConfirmSheet />
      </ErrorBoundary>
      <ErrorBoundary fallbackTitle="Baseline calibration encountered an error">
        <BaselineSheet />
      </ErrorBoundary>
      <ToastNotification />
    </div>
  );
};
