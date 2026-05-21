"use client";

import { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export type SidebarMode = "collapsed" | "expanded" | "hover";

const STORAGE_KEY = "klyro_sidebar_mode";
const VALID_MODES: SidebarMode[] = ["collapsed", "expanded", "hover"];

interface DashboardShellProps {
  children: React.ReactNode;
  locale: string;
  userEmail?: string;
  userInitial?: string;
}

export function DashboardShell({
  children,
  locale,
  userEmail,
  userInitial,
}: DashboardShellProps) {
  // Default "collapsed" matches server render; localStorage read happens after
  // hydration so server/client HTML stays in sync on first paint.
  const [mode, setMode] = useState<SidebarMode>("collapsed");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SidebarMode | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && VALID_MODES.includes(saved)) setMode(saved);
    } catch {}
  }, []);

  const handleModeChange = (next: SidebarMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg-base)]">
      <Navbar
        locale={locale}
        userEmail={userEmail}
        userInitial={userInitial}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar locale={locale} mode={mode} onModeChange={handleModeChange} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
