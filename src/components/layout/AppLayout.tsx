import React from "react";
import { useApp } from "../../context";
import { TitleBar } from "./TitleBar";
import { BriefingSheet } from "../common/BriefingSheet";
import { StudioSheet } from "../common/StudioSheet";
import { QuickPracticeModal } from "../common/QuickPracticeModal";
import { CommandPalette } from "../common/CommandPalette";
import { SettingsModal } from "../common/SettingsModal";
import { SignOutConfirmSheet } from "../common/SignOutConfirmSheet";
import { ToastNotification } from "../common/ToastNotification";

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
          {children}
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
        {children}
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
        style={{
          flex: 1,
          height: "calc(100vh - 52px)",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative"
        }}
      >
        {children}
      </main>

      {/* Global Native Sheets, Modals & Toast */}
      <BriefingSheet />
      <StudioSheet />
      <QuickPracticeModal />
      <CommandPalette />
      <SettingsModal />
      <SignOutConfirmSheet />
      <ToastNotification />
    </div>
  );
};
