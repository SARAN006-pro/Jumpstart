import { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2, Flame } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { GoalResponse, PageResponse } from "../../lib/types";

interface DailyCheckInModalProps {
  open: boolean;
  onClose: () => void;
  onCheckedIn: () => void;
}

export default function DailyCheckInModal({ open, onClose, onCheckedIn }: DailyCheckInModalProps) {
  const toast = useToastStore((s) => s.push);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PageResponse<GoalResponse>>("/goals?status=active&size=100");
      const manualDaily = res.items.filter(
        (g) => g.cadence === "DAILY" && g.trackingType === "MANUAL" && !g.complete
      );
      setGoals(manualDaily);
      const initial: Record<number, number> = {};
      manualDaily.forEach((g) => {
        initial[g.id] = g.metricType === "HOURS" ? 1 : 1;
      });
      setValues(initial);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchGoals();
  }, [open, fetchGoals]);

  async function handleCheckIn(goal: GoalResponse) {
    const value = values[goal.id] ?? 1;
    setSubmitting((s) => ({ ...s, [goal.id]: true }));
    try {
      await api.post(`/goals/${goal.id}/checkin?value=${value}&notes=daily check-in`);
      toast(`Logged ${value} ${goal.unit || "units"} for "${goal.label}"`, { tone: "success" });
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      onCheckedIn();
    } catch {
      toast("Failed to check in", { tone: "error" });
    } finally {
      setSubmitting((s) => ({ ...s, [goal.id]: false }));
    }
  }

  async function handleCheckAll() {
    for (const goal of goals) {
      await handleCheckIn(goal);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-paper">Daily Check-in</h2>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-200"><X size={16} /></button>
        </div>
        <p className="text-[12px] text-mist-500 mb-4">
          Log your progress for today's manual goals.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-ember-400" /></div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8">
            <Check size={24} className="mx-auto text-moss-400 mb-2" />
            <p className="text-[13px] text-moss-400 font-medium">All caught up!</p>
            <p className="text-[11px] text-mist-500 mt-1">No pending daily check-ins.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-700 p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-medium text-paper">{g.label}</p>
                    <p className="text-[11px] text-mist-500 mt-0.5">
                      {g.metricType === "HOURS" ? "Hours studied" : g.metricType === "TOPICS" ? "Topics completed" : g.unit || "units"}
                      {' '}· target {g.targetValue} {g.unit || ""}
                    </p>
                  </div>
                  <Flame size={14} className={g.streakCount > 0 ? "text-ember-400" : "text-mist-600"} />
                </div>
                {g.streakCount > 0 && (
                  <p className="text-[10px] text-ember-400 mb-2">{g.streakCount}-day streak</p>
                )}
                <div className="flex items-center gap-2">
                  {g.metricType === "HOURS" ? (
                    <input
                      type="range"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={values[g.id] ?? 1}
                      onChange={(e) => setValues((v) => ({ ...v, [g.id]: Number(e.target.value) }))}
                      className="flex-1 accent-ember-500 h-1.5"
                    />
                  ) : (
                    <div className="flex gap-1.5 flex-1">
                      {[1, 2, 3, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setValues((v) => ({ ...v, [g.id]: n }))}
                          className={clsx(
                            "w-8 h-8 rounded-lg text-[11px] font-mono font-medium border",
                            (values[g.id] ?? 1) === n
                              ? "bg-ember-500/10 border-ember-500/40 text-ember-400"
                              : "border-slate-700 text-mist-500 hover:border-slate-600"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleCheckIn(g)}
                    disabled={submitting[g.id]}
                    className="shrink-0 rounded-lg bg-moss-500/10 border border-moss-500/30 px-3 py-1.5 text-[11px] text-moss-400 hover:bg-moss-500/20 disabled:opacity-50 flex items-center gap-1"
                  >
                    {submitting[g.id] ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Log
                  </button>
                </div>
                <p className="text-[10px] text-mist-600 mt-1">
                  {values[g.id] ?? 1} {g.unit || ""} logged
                </p>
              </div>
            ))}
            {goals.length > 1 && (
              <button onClick={handleCheckAll} className="w-full rounded-lg bg-ember-500 text-ink-900 text-[12px] font-medium py-2 hover:bg-ember-400">
                Check in all ({goals.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
