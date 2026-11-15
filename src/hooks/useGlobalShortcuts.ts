import { useEffect } from "react";
import { useApp } from "../context";

export function useGlobalShortcuts() {
  const {
    navigateTo,
    openSettings,
    openQuickPractice,
    isSearchOpen,
    openSearch,
    closeSearch,
  } = useApp();

  useEffect(() => {
    // 1. Electron menu action listener (via preload bridge)
    const electronAPI = (window as unknown as {
      electronAPI?: {
        onMenuAction?: (callback: (action: string) => void) => () => void;
      };
    }).electronAPI;

    let cleanupMenuListener: (() => void) | undefined;
    if (electronAPI && typeof electronAPI.onMenuAction === "function") {
      cleanupMenuListener = electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case "open-settings":
            openSettings();
            break;
          case "quick-practice":
            openQuickPractice();
            break;
          case "navigate-today":
            navigateTo("today");
            break;
          case "navigate-scenarios":
            navigateTo("scenarios");
            break;
          case "navigate-recordings":
            navigateTo("recordings");
            break;
          case "navigate-progress":
            navigateTo("progress");
            break;
          case "toggle-search":
            if (isSearchOpen) closeSearch();
            else openSearch();
            break;
        }
      });
    }

    // 2. Window keydown fallback / standard web accelerator handler
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      // Do not intercept standard text editing shortcuts inside text inputs
      const target = e.target as HTMLElement | null;
      const isInputElement =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const key = e.key.toLowerCase();

      // Cmd/Ctrl+K: Search / Command Palette
      if (key === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (isSearchOpen) closeSearch();
        else openSearch();
        return;
      }

      // If typing inside an input/textarea, let text editing proceed
      if (isInputElement && key !== ",") return;

      // Cmd/Ctrl+,: Preferences
      if (key === ",") {
        e.preventDefault();
        openSettings();
        return;
      }

      // Cmd/Ctrl+Shift+P: Quick Practice
      if (key === "p" && e.shiftKey) {
        e.preventDefault();
        openQuickPractice();
        return;
      }

      // Cmd/Ctrl+1..4: Primary Navigation Tabs
      if (!e.shiftKey && !e.altKey) {
        switch (key) {
          case "1":
            e.preventDefault();
            navigateTo("today");
            break;
          case "2":
            e.preventDefault();
            navigateTo("scenarios");
            break;
          case "3":
            e.preventDefault();
            navigateTo("recordings");
            break;
          case "4":
            e.preventDefault();
            navigateTo("progress");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (cleanupMenuListener) cleanupMenuListener();
    };
  }, [
    navigateTo,
    openSettings,
    openQuickPractice,
    isSearchOpen,
    openSearch,
    closeSearch,
  ]);
}
