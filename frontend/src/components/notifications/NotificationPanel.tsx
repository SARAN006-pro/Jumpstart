import { useState, useRef, useEffect } from "react";
import { Bell, BellDot, Clock, Calendar, X, CheckCheck, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useNotificationStore, type NotificationItem } from "../../store/notifications";

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  SESSION_SOON: Clock,
  WEEKLY_DIGEST: Calendar,
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const connected = useNotificationStore((s) => s.connected);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function iconFor(type: string) {
    const Icon = NOTIFICATION_ICONS[type] || Bell;
    return <Icon size={14} className="text-ember-400 shrink-0" />;
  }

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
          open ? "bg-slate-700 text-paper" : "text-mist-400 hover:text-mist-200 hover:bg-slate-800",
        )}
      >
        {unread > 0 ? <BellDot size={17} /> : <Bell size={17} />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-ember-500 text-[9px] font-bold text-ink-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 sm:w-96 rounded-xl border border-slate-700 bg-ink-900 shadow-2xl shadow-black/40 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-paper">Notifications</h3>
              {!connected && (
                <span className="flex items-center gap-1 text-[10px] text-mist-500">
                  <Loader2 size={10} className="animate-spin" /> offline
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-ember-400 hover:text-ember-300 flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-mist-500">
                <Bell size={24} className="mb-2 opacity-30" />
                <p className="text-[12px]">No notifications yet</p>
              </div>
            ) : (
              items.map((item, i) => (
                <button
                  key={`${item.timestamp}-${i}`}
                  onClick={() => { markRead(i); }}
                  className={clsx(
                    "w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/40 border-b border-slate-700/30 last:border-b-0",
                    !item.read && "bg-ember-500/5",
                  )}
                >
                  <div className="mt-0.5">{iconFor(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={clsx("text-[12.5px] truncate", item.read ? "text-mist-300" : "text-paper font-medium")}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-mist-500 mt-0.5 line-clamp-2">{item.message}</p>
                    <p className="text-[10px] text-mist-600 mt-1">{timeAgo(item.timestamp)}</p>
                  </div>
                  {!item.read && (
                    <div className="shrink-0 mt-1.5">
                      <div className="w-2 h-2 rounded-full bg-ember-500" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
