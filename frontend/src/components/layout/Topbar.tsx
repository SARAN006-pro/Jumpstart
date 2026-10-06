import { Search, Flame, Menu } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import NotificationPanel from "../notifications/NotificationPanel";
import { useNotificationStore } from "../../store/notifications";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { type DashboardResponse } from "../../lib/types";

export default function Topbar({ title, mobileMenu }: { title?: string; mobileMenu?: () => void }) {
  const { setCommandOpen } = useUIStore();
  const { user: authUser, isAuthenticated } = useAuthStore();
  const connect = useNotificationStore((s) => s.connect);
  const disconnect = useNotificationStore((s) => s.disconnect);

  useEffect(() => {
    if (isAuthenticated && authUser) {
      connect(authUser.id);
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isAuthenticated, authUser?.id]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let active = true;
    api.get<DashboardResponse>("/dashboard").then((d) => {
      if (active) setStreak(d.currentStreak);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const displayName = authUser?.name ?? "User";

  return (
    <header className="h-16 shrink-0 border-b border-slate-700 bg-ink-800/80 backdrop-blur flex items-center gap-3 px-4 md:px-6">
      <button onClick={mobileMenu} className="md:hidden text-mist-300 p-1.5 -ml-1.5" aria-label="Open menu">
        <Menu size={20} />
      </button>

      {title && <h1 className="hidden md:block font-display text-[17px] text-paper mr-2 shrink-0">{title}</h1>}

      <button
        onClick={() => setCommandOpen(true)}
        className="flex-1 max-w-md flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-mist-500 hover:border-slate-600 transition-colors text-left"
      >
        <Search size={15} />
        <span className="text-[13px]">Search roadmaps, topics, notes, projects…</span>
        <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10.5px] font-mono text-mist-500">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {streak > 2 && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-ember-500/30 bg-ember-500/10 px-3 py-1.5">
            <Flame size={14} className="text-ember-400 animate-flicker" />
            <span className="font-mono text-[12.5px] text-ember-400 font-medium">{streak} day streak</span>
          </div>
        )}

        <NotificationPanel />

        <div className="w-8 h-8 rounded-full bg-moss-500 flex items-center justify-center text-[12px] font-semibold text-ink-900">
          {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      </div>
    </header>
  );
}
