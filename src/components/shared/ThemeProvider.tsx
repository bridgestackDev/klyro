"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "klyro-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

function applyClass(resolved: ResolvedTheme) {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
}

/**
 * Dashboard-only theme provider. Deliberately hand-rolled rather than using
 * next-themes: next-themes is a Client Component that renders its no-flash
 * <script> inside the React tree, which trips React 19's "script tag while
 * rendering" warning whenever the dashboard subtree mounts on the client.
 *
 * No-flash on full page loads is handled by a server-rendered inline script in
 * the (dashboard) layout (see THEME_NO_FLASH_SCRIPT); this provider only owns
 * the live state, persistence, and OS-change subscription. On unmount it clears
 * the theme class from <html> so the marketing landing / booking surfaces keep
 * their default-dark tokens even after a light-mode dashboard session.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read storage so the first client render already carries
  // the right value (SSR falls back to "system"/"dark"). No setState-in-effect.
  const [theme, setThemeState] = useState<Theme>(() => readStored());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    const stored = readStored();
    return stored === "system" ? systemTheme() : stored;
  });

  // Apply the class on mount (covers client-navigation entry, where the inline
  // no-flash script didn't run) and clear it on unmount so non-dashboard
  // surfaces keep their default-dark tokens.
  useEffect(() => {
    const stored = readStored();
    applyClass(stored === "system" ? systemTheme() : stored);

    return () => {
      const el = document.documentElement;
      el.classList.remove("light", "dark");
      el.style.colorScheme = "";
    };
  }, []);

  // Follow OS changes while on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolved(r);
      applyClass(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    const r = next === "system" ? systemTheme() : next;
    setResolved(r);
    applyClass(r);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Safe outside the provider (e.g. on non-dashboard surfaces): returns a
 * read-only "system"/"dark" default with a no-op setter.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "system", resolvedTheme: "dark", setTheme: () => {} };
  }
  return ctx;
}
