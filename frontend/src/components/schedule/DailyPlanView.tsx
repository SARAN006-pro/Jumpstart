import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, CheckCircle2, Clock, Sparkles, Target, BookOpen, ChevronDown, ChevronUp, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useFocusStore } from "../../store/focusOrb";
import { useFocusSession } from "../../hooks/useFocusSession";
import { useToastStore } from "../../store/toast";
import type { DailyPlanResponse, AiPlanRequest, GoalResponse, PageResponse } from "../../lib/types";

interface DailyPlanViewProps {
  dateStr: string;
  plans: DailyPlanResponse[];
  onRefresh: () => void;
  onStartTask: (plan: DailyPlanResponse) => void;
  groqApiKey?: string;
  goals?: GoalResponse[];
}

const DIFFICULTY_ORDER: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };
const DIFF_COLORS: Record<string, string> = {
  BEGINNER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  INTERMEDIATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  ADVANCED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function DailyPlanView({ dateStr, plans, onRefresh, onStartTask, groqApiKey, goals }: DailyPlanViewProps) {
  const toast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(new Set());
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  const pending = plans.filter((p) => p.status === "PENDING");
  const inProgress = plans.filter((p) => p.status === "IN_PROGRESS");
  const completed = plans.filter((p) => p.status === "COMPLETED");

  async function handleAiPlan() {
    if (selectedGoals.size === 0) {
      toast("Select at least one goal to plan", { tone: "error" });
      return;
    }
    setLoading(true);
    try {
      const selectedGoalList = goals?.filter((g) => selectedGoals.has(g.id)) ?? [];
      const tasks = selectedGoalList.map((g) => ({
        title: g.label,
        topicTitle: "",
        goalId: g.id,
        goalTitle: g.label,
        difficulty: g.cadence === "LONGTERM" ? "ADVANCED" : g.cadence === "WEEKLY" ? "INTERMEDIATE" : "BEGINNER",
        estimatedMinutes: g.metricType === "HOURS" ? 60 : 30,
      }));

      const request: AiPlanRequest = {
        date: dateStr,
        tasks,
        groqApiKey,
      };

      const plan = await api.post<{ date: string; tasks: any[] }>("/schedule/ai-plan", request);
      toast("AI plan generated! Tasks ordered from basic to advanced.", { tone: "success" });
      onRefresh();
    } catch {
      toast("AI planning failed. You can manually reorder tasks.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(planId: number, status: string) {
    try {
      await api.patch(`/schedule/ai-plan/${planId}/status`, { status });
      onRefresh();
    } catch {
      toast("Failed to update status", { tone: "error" });
    }
  }

  function renderTaskList(items: DailyPlanResponse[], showStatus: boolean) {
    return items.map((plan) => (
      <motion.div
        key={plan.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "rounded-xl border p-3 transition-all",
          plan.status === "COMPLETED"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : plan.status === "IN_PROGRESS"
              ? "border-cyan-500/40 bg-cyan-500/8 shadow-[0_0_12px_rgba(6,182,212,0.08)]"
              : "border-slate-700/60 bg-slate-800/30 hover:border-slate-600",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Difficulty indicator + status */}
          <button
            onClick={() => plan.status === "PENDING" && handleStatusChange(plan.id, "COMPLETED")}
            className={clsx(
              "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all",
              plan.status === "COMPLETED"
                ? "border-emerald-400 bg-emerald-400 text-ink-900"
                : plan.status === "IN_PROGRESS"
                  ? "border-cyan-400 border-dashed animate-pulse"
                  : "border-slate-600 hover:border-emerald-500/50",
            )}
          >
            {plan.status === "COMPLETED" && <CheckCircle2 size={14} />}
            {plan.status === "IN_PROGRESS" && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={clsx("text-[13px] font-medium", plan.status === "COMPLETED" ? "text-mist-500 line-through" : "text-paper")}>
                {plan.taskTitle}
              </p>
              <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-md border font-medium", DIFF_COLORS[plan.difficulty] || DIFF_COLORS.BEGINNER)}>
                {plan.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[11px] text-mist-500">
                <Clock size={11} /> {plan.estimatedMinutes} min
              </span>
              {plan.goalTitle && (
                <span className="flex items-center gap-1 text-[11px] text-mist-500">
                  <Target size={11} /> {plan.goalTitle}
                </span>
              )}
              {plan.topicTitle && (
                <span className="flex items-center gap-1 text-[11px] text-mist-500">
                  <BookOpen size={11} /> {plan.topicTitle}
                </span>
              )}
            </div>
          </div>

          {/* Start button */}
          {plan.status === "PENDING" && (
            <button
              onClick={() => onStartTask(plan)}
              className="shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 text-[11px] font-medium hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <Play size={12} /> Start
            </button>
          )}
          {plan.status === "IN_PROGRESS" && (
            <span className="shrink-0 text-[10px] text-cyan-400 font-medium animate-pulse">Focusing...</span>
          )}
        </div>
      </motion.div>
    ));
  }

  const totalMinutes = plans.reduce((s, p) => s + p.estimatedMinutes, 0);
  const completedMinutes = completed.reduce((s, p) => s + p.estimatedMinutes, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[12px] text-mist-500">
          <span className="flex items-center gap-1"><Clock size="13" /> {totalMinutes} min planned</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size="13" /> {completed.length}/{plans.length} done
          </span>
        </div>
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
            showAiPanel ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30" : "text-mist-500 hover:text-mist-200 border border-transparent",
          )}
        >
          <Sparkles size="13" /> AI Plan {showAiPanel ? <ChevronUp size="13" /> : <ChevronDown size="13" />}
        </button>
      </div>

      {/* AI planning panel */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="panel p-3 overflow-hidden"
          >
            <p className="text-[11px] text-mist-500 mb-2">Select goals to plan. Groq AI will order them from basic to advanced with time estimates.</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(goals ?? []).filter((g) => !g.complete).map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoals((prev) => {
                    const next = new Set(prev);
                    next.has(goal.id) ? next.delete(goal.id) : next.add(goal.id);
                    return next;
                  })}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors",
                    selectedGoals.has(goal.id)
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                      : "border-slate-700 text-mist-500 hover:text-mist-200",
                  )}
                >
                  <Target size={10} className="inline mr-1" />{goal.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleAiPlan}
              disabled={loading || selectedGoals.size === 0}
              className="w-full rounded-lg bg-cyan-500 text-ink-900 text-[12px] font-medium py-2 hover:bg-cyan-400 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? "Planning..." : "Generate AI Plan"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list by status */}
      {plans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-mist-500">No tasks planned for this day.</p>
          <p className="text-[11px] text-mist-600 mt-1">Use the AI Planner above to generate a schedule.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* In progress */}
          {inProgress.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">In Progress</h4>
              {renderTaskList(inProgress, true)}
            </div>
          )}

          {/* Pending (ordered) */}
          {pending.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-mist-500 font-semibold mb-2">Up Next</h4>
              <div className="space-y-2">{renderTaskList(pending, false)}</div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedTask(expandedTask === 1 ? null : 1)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-2 hover:text-emerald-400 transition-colors"
              >
                <CheckCircle2 size={12} /> Completed ({completed.length}) {expandedTask === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {expandedTask === 1 && <div className="space-y-2 opacity-60">{renderTaskList(completed, true)}</div>}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Quick action buttons */}
      {plans.length > 0 && completed.length < plans.length && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              const next = pending[0];
              if (next) onStartTask(next);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 text-ink-900 text-[12px] font-medium py-2.5 hover:bg-cyan-400 transition-all"
          >
            <Play size={14} /> Start Next Task
          </button>
        </div>
      )}
    </div>
  );
}
