import React from "react";
import { AppProvider, useApp } from "./context";
import { AppLayout } from "./components/layout/AppLayout";
import { SignInScreen } from "./screens/SignInScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { ScenariosScreen } from "./screens/ScenariosScreen";
import { RecordingsScreen } from "./screens/RecordingsScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { LiveSimulationScreen } from "./screens/LiveSimulationScreen";
import { ProcessingScreen } from "./screens/ProcessingScreen";

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
  return (
    <AppProvider>
      <AppLayout>
        <MainContent />
      </AppLayout>
    </AppProvider>
  );
}

export default App;
