import { useState, useEffect, useCallback, useMemo } from "react";
import { Sparkles, LayoutGrid, CalendarDays, Loader2, Brain, Columns2 } from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import WeeklySlideView from "../components/schedule/WeeklySlideView";
import DailyPlanView from "../components/schedule/DailyPlanView";
import MonthlyPlanView from "../components/schedule/MonthlyPlanView";
import FocusConfirmModal from "../components/schedule/FocusConfirmModal";
import SessionReflectionModal from "../components/schedule/SessionReflectionModal";
import FocusGuardModal from "../components/schedule/FocusGuardModal";
import DailyReconciliationModal from "../components/schedule/DailyReconciliationModal";
import AIScheduleGeneratorModal from "../components/schedule/ai/AIScheduleGeneratorModal";
import WeeklyTimeGrid from "../components/schedule/WeeklyTimeGrid";
import TaskAgenda from "../components/schedule/TaskAgenda";
import { useFocusStore } from "../store/focusOrb";
import { useFocusSession } from "../hooks/useFocusSession";
import { api } from "../lib/api";
import { useToastStore } from "../store/toast";
import { useAuthStore } from "../store/auth";
import type { DailyPlanResponse, GoalResponse, PageResponse } from "../lib/types";

type ViewMode = "weekly" | "monthly" | "grid";

export default function Schedule() {
  const toast = useToastStore((s) => s.push);
  const { user: authUser } = useAuthStore();
  const { beginFocus, completeFocusSession, interruptFocusSession, isActive } = useFocusSession();
  const orbPhase = useFocusStore((s) => s.orbPhase);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [weekStart, setWeekStart] = useState(monday);
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0]);
  const [plans, setPlans] = useState<DailyPlanResponse[]>([]);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [weekStats, setWeekStats] = useState<Record<string, { taskCount: number; completedCount: number; totalMinutes: number }>>({});
  const [loading, setLoading] = useState(true);

  /* Modals */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState<DailyPlanResponse | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionSession, setReflectionSession] = useState("");
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [gridSessions, setGridSessions] = useState<any[]>([]);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);

  /* Fetch plans for selected date */
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, goalRes] = await Promise.all([
        api.get<DailyPlanResponse[]>(`/schedule/ai-plan/${selectedDate}`).catch(() => [] as DailyPlanResponse[]),
        api.get<PageResponse<GoalResponse>>("/goals?size=100").catch(() => ({ items: [] as GoalResponse[] })),
      ]);
      setPlans(planRes);
      setGoals(goalRes.items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selectedDate]);

  /* Fetch weekly stats */
  const fetchWeekStats = useCallback(async () => {
    const stats: Record<string, { taskCount: number; completedCount: number; totalMinutes: number }> = {};
    try {
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        const dayPlans = await api.get<DailyPlanResponse[]>(`/schedule/ai-plan/${ds}`).catch(() => [] as DailyPlanResponse[]);
        if (dayPlans.length > 0) {
          stats[ds] = {
            taskCount: dayPlans.length,
            completedCount: dayPlans.filter((p) => p.status === "COMPLETED").length,
            totalMinutes: dayPlans.reduce((s, p) => s + p.estimatedMinutes, 0),
          };
        }
      }
    } catch { /* silent */ }
    setWeekStats(stats);
  }, [weekStart]);

  const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  /* Fetch grid sessions + agenda items */
  const fetchGridData = useCallback(async () => {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const [sessionsRes, goalsRes] = await Promise.all([
        api.get<any[]>(`/schedule/sessions?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`).catch(() => []),
        api.get<PageResponse<GoalResponse>>("/goals?size=100").catch(() => ({ items: [] })),
      ]);
      setGridSessions(sessionsRes.map((s: any) => {
        const start = new Date(s.plannedStartTime);
        const end = new Date(s.plannedEndTime);
        return {
          id: s.id,
          title: s.title,
          dayStr: DAYS_SHORT[start.getDay()],
          startHour: start.getHours(),
          endHour: end.getHours(),
          status: s.status,
          goalTitle: s.topicTitle || s.title,
        };
      }));
      setAgendaItems(
        goalsRes.items
          .filter((g: GoalResponse) => !g.complete)
          .map((g: GoalResponse) => ({
            id: g.id,
            title: g.label,
            goalLabel: g.label,
            durationMinutes: g.metricType === "HOURS" ? 60 : 30,
            cadence: g.cadence,
            priority: g.priority || "medium",
          }))
      );
    } catch { /* silent */ }
  }, [weekStart]);

  /* Parse selectedDate as local-time Date (avoid UTC-shift issue) */
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => {
    if (viewMode === "weekly") fetchWeekStats();
    if (viewMode === "grid") fetchGridData();
  }, [viewMode, fetchWeekStats, fetchGridData]);

  useEffect(() => {
    if (orbPhase === "completed") {
      setReflectionSession(useFocusStore.getState().sessionTitle || "Focus Session");
      setReflectionOpen(true);
    }
  }, [orbPhase]);

  function handleDaySelect(date: Date) {
    setSelectedDate(date.toISOString().split("T")[0]);
  }

  function handleMonthlyDaySelect(dateStr: string) {
    setSelectedDate(dateStr);
    setViewMode("weekly");
  }

  function handleStartTask(plan: DailyPlanResponse) {
    if (isActive) { setGuardOpen(true); return; }
    setConfirmTask(plan);
    setConfirmOpen(true);
  }

  async function handleConfirmFocus(minutes: number) {
    if (!confirmTask) return;
    setConfirmOpen(false);
    try { await api.patch(`/schedule/ai-plan/${confirmTask.id}/status`, { status: "IN_PROGRESS" }); } catch {}
    await beginFocus({ durationMs: minutes * 60 * 1000 });
    const taskId = confirmTask.id;
    const unsubscribe = useFocusStore.subscribe((state, prev) => {
      if (prev.orbPhase === "active" && state.orbPhase === "completed") {
        api.patch(`/schedule/ai-plan/${taskId}/status`, { status: "COMPLETED" }).catch(() => {});
        fetchPlans();
        unsubscribe();
      }
    });
    setConfirmTask(null);
    fetchPlans();
  }

  function handleReflectionSubmit(rating: number, notes: string) {
    completeFocusSession(rating, notes);
    setReflectionOpen(false);
    useFocusStore.getState().startBreak();
    fetchPlans();
  }

  function handleReflectionSkip() {
    completeFocusSession();
    setReflectionOpen(false);
    useFocusStore.getState().startBreak();
    fetchPlans();
  }

  return (
    <AppShell title="Schedule">
      <DailyReconciliationModal userId={authUser?.id ?? null} />
      <FocusGuardModal
        open={guardOpen}
        currentSession={useFocusStore.getState().sessionTitle || "current focus"}
        newSession={confirmTask?.taskTitle || "new task"}
        onConfirm={() => { setGuardOpen(false); interruptFocusSession(); if (confirmTask) setConfirmOpen(true); }}
        onCancel={() => { setGuardOpen(false); setConfirmTask(null); }}
      />
      <FocusConfirmModal
        open={confirmOpen}
        taskTitle={confirmTask?.taskTitle || ""}
        estimatedMinutes={confirmTask?.estimatedMinutes || 25}
        goalTitle={confirmTask?.goalTitle}
        difficulty={confirmTask?.difficulty}
        onConfirm={handleConfirmFocus}
        onCancel={() => { setConfirmOpen(false); setConfirmTask(null); }}
      />
      <SessionReflectionModal
        open={reflectionOpen}
        sessionTitle={reflectionSession}
        onSubmit={handleReflectionSubmit}
      />
      <AIScheduleGeneratorModal
        open={aiGenOpen}
        onClose={() => setAiGenOpen(false)}
        onCommitted={fetchPlans}
      />

      {/* View mode tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-800/60 rounded-lg p-0.5 w-fit border border-slate-700/50">
        <button onClick={() => setViewMode("grid")} className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
          viewMode === "grid" ? "bg-cyan-500/10 text-cyan-300 shadow-sm" : "text-mist-500 hover:text-mist-200",
        )}>
          <Columns2 size={14} /> Grid
        </button>
        <button onClick={() => setViewMode("weekly")} className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
          viewMode === "weekly" ? "bg-cyan-500/10 text-cyan-300 shadow-sm" : "text-mist-500 hover:text-mist-200",
        )}>
          <LayoutGrid size={14} /> Weekly
        </button>
        <button onClick={() => setViewMode("monthly")} className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
          viewMode === "monthly" ? "bg-cyan-500/10 text-cyan-300 shadow-sm" : "text-mist-500 hover:text-mist-200",
        )}>
          <CalendarDays size={14} /> Monthly
        </button>
      </div>

      {viewMode === "weekly" ? (
        <>
          {/* Weekly Slide View */}
          <div className="mb-6">
            <WeeklySlideView
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              onDaySelect={handleDaySelect}
              selectedDate={selectedDate}
              dayData={weekStats}
            />
          </div>

          {/* Daily Plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-display text-paper">
                {selectedDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
              <button
                onClick={() => setAiGenOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all"
              >
                <Brain size={13} /> AI Schedule
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-mist-500 mr-2" />
                <span className="text-[13px] text-mist-500">Loading plan...</span>
              </div>
            ) : (
              <DailyPlanView
                dateStr={selectedDate}
                plans={plans}
                onRefresh={fetchPlans}
                onStartTask={handleStartTask}
                goals={goals}
              />
            )}
          </div>
        </>
      ) : viewMode === "grid" ? (
        /* Grid View with Drag & Drop */
        <div className="flex gap-4">
          <div className="w-64 shrink-0">
            <TaskAgenda items={agendaItems} loading={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-display text-paper">
                {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h2>
            </div>
            <WeeklyTimeGrid
              weekStart={weekStart}
              sessions={gridSessions}
              onSessionCreated={fetchGridData}
            />
          </div>
        </div>
      ) : (
        /* Monthly View */
        <MonthlyPlanView
          onDaySelect={handleMonthlyDaySelect}
          selectedDate={selectedDate}
        />
      )}
    </AppShell>
  );
}
