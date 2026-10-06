import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Target, BookOpen, Clock, CheckCircle2, Zap } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { MonthlyPlanResponse, RoadmapResponse, PageResponse, MonthlyPlanChunk, PlanDifficulty } from "../../lib/types";

interface MonthlyPlanViewProps {
  onDaySelect: (dateStr: string) => void;
  selectedDate: string | null;
  groqApiKey?: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROADMAP_COLORS: Record<string, string> = {
  MOSS: "#4C7A5E", EMBER: "#E8743B", GOLD: "#D4A04A",
  CYAN: "#06b6d4", VIOLET: "#8b5cf6", ROSE: "#f43f5e",
};

function getRoadmapColor(color: string | null): string {
  return ROADMAP_COLORS[color ?? ""] || "#6366f1";
}

export default function MonthlyPlanView({ onDaySelect, selectedDate, groqApiKey }: MonthlyPlanViewProps) {
  const toast = useToastStore((s) => s.push);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => YearMonth.from(today));
  const [plans, setPlans] = useState<Record<string, MonthlyPlanResponse[]>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamPct, setStreamPct] = useState(0);
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [selectedRoadmaps, setSelectedRoadmaps] = useState<Set<number>>(new Set());
  const [dailyMinutes, setDailyMinutes] = useState(120);
  const [showGenerator, setShowGenerator] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const monthKey = currentMonth.toString();
  const firstDay = currentMonth.atDay(1);
  const daysInMonth = currentMonth.lengthOfMonth();
  const startDayOfWeek = firstDay.getDay();

  useEffect(() => {
    api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100")
      .then((res) => setRoadmaps(res.items))
      .catch(() => {});
  }, []);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MonthlyPlanResponse[]>(`/schedule/monthly-plan/${monthKey}`).catch(() => []);
      const grouped: Record<string, MonthlyPlanResponse[]> = {};
      for (const p of data) {
        if (!grouped[p.date]) grouped[p.date] = [];
        grouped[p.date].push(p);
      }
      setPlans(grouped);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  async function handleGenerate() {
    if (selectedRoadmaps.size === 0) { toast("Select at least one roadmap", { tone: "error" }); return; }
    setGenerating(true);
    setStreamPct(0);

    // Try streaming first, fallback to sync
    const token = localStorage.getItem("jumpstart_access_token");
    const rawBase = import.meta.env.VITE_API_URL || "https://jumpstart-production.up.railway.app";
    const baseUrl = rawBase.replace(/\/+$/, "");
    const apiBase = baseUrl.endsWith("/api") ? baseUrl : baseUrl + "/api";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${apiBase}/schedule/monthly-plan/generate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ monthKey, roadmapIds: Array.from(selectedRoadmaps), groqApiKey: groqApiKey || undefined, dailyMinutes }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream not available");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let totalChunks = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (currentEvent === "month-chunk" || Array.isArray(parsed)) {
                  const chunks = parsed as MonthlyPlanChunk[];
                  totalChunks += chunks.length;
                  setStreamPct(Math.min(90, Math.round((totalChunks / 20) * 100)));
                  setPlans((prev) => {
                    const next = { ...prev };
                    for (const c of chunks) {
                      const ds = `${monthKey}-${String(c.day).padStart(2, "0")}`;
                      const diff = c.difficulty as PlanDifficulty;
                      if (!next[ds]) next[ds] = [];
                      const exists = next[ds].some((p) => p.taskTitle === c.title);
                      if (!exists) {
                        next[ds] = [...next[ds], {
                          id: -Math.abs(c.day * 1000 + next[ds].length),
                          userId: 0, monthKey, date: ds,
                          taskTitle: c.title, topicId: null, topicTitle: c.title,
                          roadmapId: null, roadmapTitle: "", roadmapColor: "CYAN",
                          estimatedMinutes: c.estimatedMinutes, sortOrder: next[ds].length,
                          status: "PENDING" as const, difficulty: diff,
                        }];
                      }
                    }
                    return next;
                  });
                } else if (currentEvent === "month-complete" || !Array.isArray(parsed)) {
                  const fullPlan = parsed as MonthlyPlanResponse[];
                  const grouped: Record<string, MonthlyPlanResponse[]> = {};
                  for (const p of fullPlan) {
                    if (!grouped[p.date]) grouped[p.date] = [];
                    grouped[p.date].push(p);
                  }
                  setPlans(grouped);
                  setStreamPct(100);
                  toast("Monthly plan streamed successfully!", { tone: "success" });
                  setShowGenerator(false);
                }
              } catch { /* skip malformed line */ }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      // Fallback to synchronous
      console.warn("Streaming failed, falling back to sync", err);
      try {
        const result = await api.post<MonthlyPlanResponse[]>("/schedule/monthly-plan/generate", {
          monthKey, roadmapIds: Array.from(selectedRoadmaps), groqApiKey: groqApiKey || undefined, dailyMinutes,
        });
        const grouped: Record<string, MonthlyPlanResponse[]> = {};
        for (const p of result) {
          if (!grouped[p.date]) grouped[p.date] = [];
          grouped[p.date].push(p);
        }
        setPlans(grouped);
        toast("Monthly plan generated!", { tone: "success" });
        setShowGenerator(false);
      } catch {
        toast("Failed to generate plan", { tone: "error" });
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function navigateMonth(delta: number) {
    setCurrentMonth(delta < 0 ? currentMonth.minusMonths(1) : currentMonth.plusMonths(1));
  }

  function goToToday() {
    setCurrentMonth(YearMonth.from(today));
  }

  /* Generate calendar grid */
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) for (let i = 0; i < remaining; i++) calendarDays.push(null);

  const todayStr = today.toISOString().split("T")[0];
  const totalTasks = Object.values(plans).flat();
  const totalCompleted = totalTasks.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="rounded-lg p-2 text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-all">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-[18px] font-display text-paper min-w-[160px] text-center">
            {currentMonth.format("MMMM yyyy")}
          </h2>
          <button onClick={() => navigateMonth(1)} className="rounded-lg p-2 text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-all">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToToday} className="ml-2 text-[11px] text-mist-500 hover:text-mist-200 px-2 py-1 rounded-lg border border-slate-700 hover:border-slate-600 transition-all">
            Today
          </button>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className={clsx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
            showGenerator ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30" : "text-mist-500 hover:text-mist-200 border border-transparent")}
        >
          <Sparkles size={13} /> AI Month Plan
        </button>
      </div>

      {/* Generator panel */}
      <AnimatePresence>
        {showGenerator && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="panel p-3 overflow-hidden">
            <p className="text-[11px] text-mist-500 mb-2">Select roadmaps to plan across {monthKey}. Groq AI will mix topics from multiple roadmaps and distribute them evenly across days.</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {roadmaps.filter((r) => !r.archived).map((r) => (
                <button key={r.id} onClick={() => setSelectedRoadmaps((prev) => {
                  const next = new Set(prev); next.has(r.id) ? next.delete(r.id) : next.add(r.id); return next;
                })} className={clsx("px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors",
                  selectedRoadmaps.has(r.id) ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "border-slate-700 text-mist-500 hover:text-mist-200")}>
                  <BookOpen size={10} className="inline mr-1" />{r.title}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-mist-500">Minutes/day:</span>
              <input type="number" value={dailyMinutes} onChange={(e) => setDailyMinutes(Math.max(15, Number(e.target.value)))}
                className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[12px] text-paper outline-none focus:border-cyan-500/50" />
            </div>
            <button onClick={handleGenerate} disabled={generating || selectedRoadmaps.size === 0}
              className="w-full rounded-lg bg-cyan-500 text-ink-900 text-[12px] font-medium py-2 hover:bg-cyan-400 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? `Streaming... ${streamPct}%` : `Generate ${monthKey} Plan`}
            </button>

            {/* Streaming progress bar */}
            {generating && streamPct > 0 && streamPct < 100 && (
              <div className="mt-2 h-1 w-full rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${streamPct}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live streaming indicator */}
      {generating && (
        <div className="flex items-center gap-2 text-[11px] text-cyan-400 mb-1">
          <Zap size={12} className="animate-pulse" />
          <span>AI is distributing topics across the month — watch it build in real-time</span>
        </div>
      )}

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-mist-600 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-mist-500" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="min-h-[90px] rounded-lg bg-slate-800/10" />;

            const dateStr = `${currentMonth.toString()}-${String(day).padStart(2, "0")}`;
            const dayPlans = plans[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const completedCount = dayPlans.filter((p) => p.status === "COMPLETED").length;
            const isStreaming = generating && dayPlans.length > 0;
            const shimmerCount = generating ? Math.max(0, 3 - dayPlans.slice(0, 3).length) : 0;

            return (
              <motion.button
                key={dateStr}
                onClick={() => onDaySelect(dateStr)}
                whileTap={{ scale: 0.97 }}
                className={clsx(
                  "min-h-[90px] rounded-xl border p-1.5 text-left transition-all relative overflow-hidden",
                  isSelected ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.1)]" :
                  isToday ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-700/40 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40",
                  isStreaming && "border-cyan-500/20",
                )}
              >
                <span className={clsx("text-[11px] font-mono tabular-nums", isToday ? "text-emerald-400 font-bold" : isSelected ? "text-cyan-300" : "text-mist-500")}>
                  {day}
                </span>

                {/* Topic pills */}
                <div className="mt-1 space-y-0.5">
                  {dayPlans.slice(0, 3).map((p, pi) => (
                    <motion.div
                      key={p.id || `stream-${pi}`}
                      initial={p.id < 0 ? { opacity: 0, x: -4 } : undefined}
                      animate={p.id < 0 ? { opacity: 1, x: 0 } : undefined}
                      className={clsx(
                        "flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-medium truncate",
                        p.status === "COMPLETED" ? "opacity-50" : "opacity-90",
                        p.id < 0 && "border border-cyan-500/20",
                      )}
                      style={{ backgroundColor: `${getRoadmapColor(p.roadmapColor)}22`, borderLeft: `2px solid ${getRoadmapColor(p.roadmapColor)}` }}
                    >
                      <span className="truncate">{p.taskTitle}</span>
                      <span className="shrink-0 font-mono opacity-70">{p.estimatedMinutes}m</span>
                    </motion.div>
                  ))}
                  {dayPlans.length > 3 && (
                    <span className="text-[8px] text-mist-600 pl-1">+{dayPlans.length - 3} more</span>
                  )}
                  {/* Shimmer pills during streaming */}
                  {Array.from({ length: shimmerCount }).map((_, si) => (
                    <div key={`shimmer-${si}`} className="h-4 rounded bg-gradient-to-r from-slate-700/30 via-slate-600/20 to-slate-700/30 animate-pulse" />
                  ))}
                </div>

                {/* Completion indicator */}
                {completedCount > 0 && (
                  <div className="absolute top-1 right-1">
                    <div className="flex items-center gap-0.5 text-[8px] text-emerald-400">
                      <CheckCircle2 size={8} /> {completedCount}
                    </div>
                  </div>
                )}

                {/* Streaming dot indicator */}
                {isStreaming && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {totalTasks.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[10px] text-mist-500 pt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Today</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Has tasks</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> Completed</span>
          <span className="text-[10px] text-mist-600 ml-auto">
            Total: {totalTasks.length} tasks, {totalTasks.reduce((s, p) => s + p.estimatedMinutes, 0)} min
          </span>
          {generating && (
            <span className="text-[10px] text-cyan-400 animate-pulse flex items-center gap-1">
              <Zap size={10} /> Streaming...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simple YearMonth utility (no dependency needed)
class YearMonth {
  private constructor(private year: number, private month: number) {}
  static from(d: Date): YearMonth { return new YearMonth(d.getFullYear(), d.getMonth() + 1); }
  static parse(s: string): YearMonth {
    const [y, m] = s.split("-").map(Number);
    return new YearMonth(y, m);
  }
  toString(): string { return `${this.year}-${String(this.month).padStart(2, "0")}`; }
  atDay(d: number): Date { return new Date(this.year, this.month - 1, d); }
  lengthOfMonth(): number { return new Date(this.year, this.month, 0).getDate(); }
  getDay(): number { return new Date(this.year, this.month - 1, 1).getDay(); }
  plusMonths(n: number): YearMonth {
    const d = new Date(this.year, this.month - 1 + n, 1);
    return YearMonth.from(d);
  }
  minusMonths(n: number): YearMonth { return this.plusMonths(-n); }
  format(fmt: string): string {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return fmt.replace("MMMM", months[this.month - 1]).replace("yyyy", String(this.year));
  }
}
