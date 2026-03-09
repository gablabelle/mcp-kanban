import { useState, useEffect, useCallback } from "react";

export type VisualTheme = "default" | "brutalist" | "glass" | "softnight";
export type ColorMode = "light" | "dark" | "system";

/** Legacy compat: "dark" → "default:dark", "system" → "default:system" */
function parseThemeString(raw: string): { visual: VisualTheme; mode: ColorMode } {
  if (raw === "light" || raw === "dark" || raw === "system") {
    return { visual: "default", mode: raw };
  }
  const [visual, mode] = raw.split(":") as [string, string];
  const validVisuals: VisualTheme[] = ["default", "brutalist", "glass", "softnight"];
  const validModes: ColorMode[] = ["light", "dark", "system"];
  return {
    visual: validVisuals.includes(visual as VisualTheme) ? (visual as VisualTheme) : "default",
    mode: validModes.includes(mode as ColorMode) ? (mode as ColorMode) : "system",
  };
}

function serializeTheme(visual: VisualTheme, mode: ColorMode): string {
  return `${visual}:${mode}`;
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const VISUAL_THEME_CLASSES = ["theme-brutalist", "theme-glass", "theme-softnight"] as const;

function applyTheme(visual: VisualTheme, resolvedMode: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedMode === "dark");
  for (const cls of VISUAL_THEME_CLASSES) {
    root.classList.remove(cls);
  }
  if (visual === "brutalist") root.classList.add("theme-brutalist");
  if (visual === "glass") root.classList.add("theme-glass");
  if (visual === "softnight") root.classList.add("theme-softnight");
}

export function useTheme() {
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(() => {
    const stored = localStorage.getItem("mcp-kanban-theme");
    return stored ? parseThemeString(stored).visual : "default";
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem("mcp-kanban-theme");
    return stored ? parseThemeString(stored).mode : "system";
  });

  const resolvedMode = colorMode === "system" ? getSystemTheme() : colorMode;

  const persist = useCallback((visual: VisualTheme, mode: ColorMode) => {
    const serialized = serializeTheme(visual, mode);
    localStorage.setItem("mcp-kanban-theme", serialized);
  }, []);

  const setVisualTheme = useCallback((v: VisualTheme) => {
    setVisualThemeState(v);
    setColorModeState((prev) => {
      persist(v, prev);
      return prev;
    });
  }, [persist]);

  const setColorMode = useCallback((m: ColorMode) => {
    setColorModeState(m);
    setVisualThemeState((prev) => {
      persist(prev, m);
      return prev;
    });
  }, [persist]);

  // Sync with server config on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.theme && !localStorage.getItem("mcp-kanban-theme")) {
          const parsed = parseThemeString(data.theme);
          setVisualThemeState(parsed.visual);
          setColorModeState(parsed.mode);
          persist(parsed.visual, parsed.mode);
        }
      })
      .catch(() => {});
  }, [persist]);

  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(visualTheme, resolvedMode);
  }, [visualTheme, resolvedMode]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (colorMode === "system") {
        applyTheme(visualTheme, getSystemTheme());
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [colorMode, visualTheme]);

  return { visualTheme, colorMode, resolvedMode, setVisualTheme, setColorMode };
}
