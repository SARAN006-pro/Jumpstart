import { useState, useEffect } from "react";
import { X, Check, SkipForward, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import { localDateToUtcIso } from "../../lib/timezone";
import type { ScheduleSessionResponse } from "../../lib/types";

interface DailyReconciliationModalProps {
  userId: number | null;
}

export default function DailyReconciliationModal({ userId }: DailyReconciliationModalProps) {
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ScheduleSessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId || dismissed) return;
    const now = new Date();
    const hour = now.getHours();
    if (hour < 20) return;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    api.get<ScheduleSessionResponse[]>(
      `/schedule/sessions/daily?dayStart=${localDateToUtcIso(todayStart)}&dayEnd=${localDateToUtcIso(todayEnd)}`
    ).then((items) => {
      const planned = items.filter((s) => s.status === "PLANNED");
      if (planned.length > 0) {
        setSessions(planned);
        setOpen(true);
      }
    }).catch(() => {});
  }, [userId, dismissed]);

  async function handleComplete(session: ScheduleSessionResponse, minutes?: number) {
    try {
      await api.post(`/schedule/sessions/${session.id}/complete?actualDuration=${minutes ?? 0}`);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast("Session marked complete", { tone: "success" });
      if (sessions.length <= 1) setOpen(false);
    } catch {
      toast("Failed to update", { tone: "error" });
    }
  }

  async function handleSkip(session: ScheduleSessionResponse) {
    try {
      await api.post(`/schedule/sessions/${session.id}/skip`);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast("Session skipped", { tone: "default" });
      if (sessions.length <= 1) setOpen(false);
    } catch {
      toast("Failed to update", { tone: "error" });
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-paper">Daily Check-in</h2>
          <button onClick={handleDismiss} className="text-mist-500 hover:text-mist-200">
            <X size={16} />
          </button>
        </div>
        <p className="text-[12px] text-mist-500 mb-4">
          {sessions.length} planned session{sessions.length !== 1 ? "s" : ""} still need your update.
          Did you complete them?
        </p>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-700 p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[13px] font-medium text-paper">{s.title}</p>
                  <p className="text-[11px] text-mist-500 mt-0.5">
                    {new Date(s.plannedStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(s.plannedEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSkip(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 text-mist-300 text-[11px] py-1.5 hover:bg-slate-700"
                >
                  <SkipForward size={12} /> Skipped
                </button>
                <div className="flex-1 flex gap-1">
                  {[15, 30, 60, 120].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleComplete(s, m)}
                      className="flex-1 flex items-center justify-center rounded-lg bg-moss-500/10 text-moss-400 text-[10px] py-1.5 hover:bg-moss-500/20 font-mono"
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleDismiss} className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
