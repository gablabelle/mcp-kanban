import { useState, useEffect, useCallback } from "react";

export type ScrollMode = "column" | "page";

export function useScrollMode() {
  const [scrollMode, setScrollModeState] = useState<ScrollMode>(() => {
    const stored = localStorage.getItem("mcp-kanban-scroll-mode") as ScrollMode | null;
    return stored === "page" ? "page" : "column";
  });

  const setScrollMode = useCallback((mode: ScrollMode) => {
    setScrollModeState(mode);
    localStorage.setItem("mcp-kanban-scroll-mode", mode);
  }, []);

  // Sync with server config on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.scrollMode && !localStorage.getItem("mcp-kanban-scroll-mode")) {
          setScrollMode(data.scrollMode as ScrollMode);
        }
      })
      .catch(() => {});
  }, [setScrollMode]);

  return { scrollMode, setScrollMode };
}
