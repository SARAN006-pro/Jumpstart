import { useState, useEffect, useCallback } from "react";
import { Target, Loader2, Plus, Sparkles, Activity, Clock, CheckCircle2, Play } from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import GoalCard from "../components/goals/GoalCard";
import SmartGoalWizard from "../components/goals/SmartGoalWizard";
import DailyCheckInModal from "../components/goals/DailyCheckInModal";
import RetroactiveLogModal from "../components/goals/RetroactiveLogModal";
import EmptyGoals from "../components/goals/EmptyGoals";
import StreakBadge from "../components/goals/StreakBadge";
import TimeToGoalPanel from "../components/goals/TimeToGoalPanel";
import { api } from "../lib/api";
import { useToastStore } from "../store/toast";
import { useFocusSession } from "../hooks/useFocusSession";
import { useFocusStore } from "../store/focusOrb";
import type { GoalResponse, PageResponse, DailyPlanResponse } from "../lib/types";

type CadenceFilter = "ALL" | "DAILY" | "WEEKLY" | "MONTHLY" | "LONGTERM";

const CADENCE_LABELS: Record<CadenceFilter, string> = {
  ALL: "All", DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", LONGTERM: "Long-term",
};

export default function Goals() {
  const toast = useToastStore((s) => s.push);
  const { beginFocus, completeFocusSession, interruptFocusSession, isActive } = useFocusSession();
  const orbPhase = useFocusStore((s) => s.orbPhase);

  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("ALL");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [retroLogOpen, setRetroLogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | undefined>();
  const [stats, setStats] = useState({ total: 0, completed: 0, atRisk: 0 });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = cadenceFilter === "ALL" ? "?size=100" : `?size=100&cadence=${cadenceFilter}`;
      const res = await api.get<PageResponse<GoalResponse>>(`/goals${params}`);
      setGoals(res.items);
      setStats({
        total: res.items.length,
        completed: res.items.filter((g) => g.complete).length,
        atRisk: res.items.filter((g) => {
          if (!g.dueDate || g.complete || g.locked) return false;
          const due = new Date(g.dueDate);
          const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) return true;
          const progress = g.targetValue > 0 ? g.progressValue / g.targetValue : 0;
          return progress < 0.3 && daysLeft < Math.ceil(g.targetValue * 0.3);
        }).length,
      });
    } catch {
      toast("Failed to load goals", { tone: "error" });
    } finally { setLoading(false); }
  }, [cadenceFilter, toast]);

  const fetchDailyPlans = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const plans = await api.get<DailyPlanResponse[]>(`/schedule/ai-plan/${today}`).catch(() => [] as DailyPlanResponse[]);
      setDailyPlans(plans);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);
  useEffect(() => { fetchDailyPlans(); }, [fetchDailyPlans]);

  function handleCreated() { setWizardOpen(false); fetchGoals(); }
  function handleCheckIn() { setCheckInOpen(true); }
  function handleCheckInDone() { setCheckInOpen(false); fetchGoals(); }

  async function handleStartPlanTask(plan: DailyPlanResponse) {
    if (isActive) { toast("Finish current focus first", { tone: "error" }); return; }
    try {
      await api.patch(`/schedule/ai-plan/${plan.id}/status`, { status: "IN_PROGRESS" });
      await beginFocus({ durationMs: plan.estimatedMinutes * 60 * 1000 });
      const taskId = plan.id;
      const unsub = useFocusStore.subscribe((state, prev) => {
        if (prev.orbPhase === "active" && state.orbPhase === "completed") {
          api.patch(`/schedule/ai-plan/${taskId}/status`, { status: "COMPLETED" }).catch(() => {});
          fetchDailyPlans();
          unsub();
        }
      });
      fetchDailyPlans();
    } catch {
      toast("Failed to start focus", { tone: "error" });
    }
  }

  const bentoClass = (goal: GoalResponse, index: number): string => {
    if (goal.cadence === "LONGTERM") return "col-span-2 row-span-2";
    if (goal.cadence === "DAILY") return "col-span-1 row-span-1 self-start";
    return index % 3 === 0 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
  };

  const cardVariant = (goal: GoalResponse): "daily" | "compact" | "featured" => {
    if (goal.cadence === "DAILY") return "daily";
    if (goal.cadence === "LONGTERM") return "featured";
    return "compact";
  };

  const pendingPlans = dailyPlans.filter((p) => p.status === "PENDING" || p.status === "IN_PROGRESS");
  const achievedGoals = goals.filter((g) => g.complete);
  const activeGoals = goals.filter((g) => !g.complete);

  return (
    <AppShell title="Goals">
      <SmartGoalWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onSaved={handleCreated} />
      <DailyCheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)} onCheckedIn={handleCheckInDone} />
      <RetroactiveLogModal open={retroLogOpen} onClose={() => setRetroLogOpen(false)} onLogged={() => { setRetroLogOpen(false); fetchGoals(); }} goals={goals} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-emerald-400" />
          <h1 className="font-display text-[24px] text-paper">Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCheckIn} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 text-[13px] font-medium hover:bg-emerald-500/20 transition-colors">
            <Activity size={14} /> Check-in
          </button>
          <button onClick={() => setRetroLogOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 text-[13px] font-medium hover:bg-amber-500/20 transition-colors">
            <Activity size={14} /> Log Time
          </button>
          <button onClick={() => setWizardOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 text-ink-900 px-4 py-2 text-[13px] font-medium hover:bg-cyan-400 transition-colors">
            <Plus size={14} /> New Goal
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-mist-500">
        <span className="flex items-center gap-1"><Activity size={12} /> {stats.total} total</span>
        <span className="flex items-center gap-1"><Sparkles size={12} className="text-emerald-400" /> {stats.completed} done</span>
        {stats.atRisk > 0 && <span className="flex items-center gap-1 text-red-400"><Activity size={12} /> {stats.atRisk} at risk</span>}
        {goals.length > 0 && (
          <span className="flex items-center gap-1 ml-auto">
            <StreakBadge count={Math.max(...goals.map((g) => g.streakCount || 0), 0)} size="sm" /> Best streak
          </span>
        )}
      </div>

      {/* Time-to-Goal Projections */}
      <TimeToGoalPanel />

      {/* Today's AI-Planned Agenda */}
      {pendingPlans.length > 0 && (
        <div className="panel p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={13} className="text-cyan-400" />
            <h3 className="text-[12px] font-semibold text-paper uppercase tracking-wider">Today's AI Plan</h3>
            <span className="text-[10px] text-mist-600 font-mono ml-auto">
              {dailyPlans.filter((p) => p.status === "COMPLETED").length}/{dailyPlans.length}
            </span>
          </div>
          <div className="space-y-1">
            {pendingPlans.slice(0, 5).map((plan) => (
              <div key={plan.id} className={clsx(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all",
                plan.status === "IN_PROGRESS" ? "bg-cyan-500/8 border border-cyan-500/20" : "bg-slate-800/40 hover:bg-slate-800/60",
              )}>
                <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", plan.status === "COMPLETED" ? "bg-emerald-400" : plan.status === "IN_PROGRESS" ? "bg-cyan-400 animate-pulse" : "bg-mist-600")} />
                <span className={clsx("flex-1 truncate", plan.status === "IN_PROGRESS" && "text-cyan-300")}>{plan.taskTitle}</span>
                <span className="text-mist-600 font-mono shrink-0">{plan.estimatedMinutes}m</span>
                {plan.status === "PENDING" && (
                  <button onClick={() => handleStartPlanTask(plan)} className="text-cyan-400 hover:text-cyan-300 shrink-0">
                    <Play size={11} />
                  </button>
                )}
                {plan.status === "IN_PROGRESS" && (
                  <span className="text-[9px] text-cyan-400 animate-pulse shrink-0">Focusing...</span>
                )}
              </div>
            ))}
            {pendingPlans.length > 5 && (
              <p className="text-[10px] text-mist-600 text-center pt-1">+{pendingPlans.length - 5} more tasks</p>
            )}
          </div>
        </div>
      )}

      {/* Cadence filter */}
      <div className="flex gap-1.5 mb-5">
        {(Object.keys(CADENCE_LABELS) as CadenceFilter[]).map((key) => (
          <button key={key} onClick={() => setCadenceFilter(key)} className={clsx(
            "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
            cadenceFilter === key ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "text-mist-500 border border-transparent hover:text-mist-200",
          )}>
            {CADENCE_LABELS[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-mist-500"><Loader2 size={20} className="animate-spin" /></div>
      ) : goals.length === 0 ? (
        <EmptyGoals onCreateClick={() => setWizardOpen(true)} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 auto-rows-auto">
            {activeGoals.map((goal, i) => (
              <div key={goal.id} className={bentoClass(goal, i)}>
                <GoalCard goal={goal} onEdit={setEditingGoal} variant={cardVariant(goal)} />
              </div>
            ))}
          </div>

          {achievedGoals.length > 0 && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 text-[12px] font-semibold text-mist-500 mb-3 uppercase tracking-wide">
                <Sparkles size={13} className="text-emerald-400" /> Achieved ({achievedGoals.length})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {achievedGoals.map((goal, i) => (
                  <div key={goal.id} className={bentoClass(goal, i)}>
                    <GoalCard goal={goal} variant={cardVariant(goal)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
