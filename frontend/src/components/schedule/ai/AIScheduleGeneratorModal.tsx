import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Brain, CheckCircle2, X, ChevronRight, BookOpen, Clock, Target } from "lucide-react";
import clsx from "clsx";
import AIGeneratedCard from "./AIGeneratedCard";
import { api, getAccessToken } from "../../../lib/api";
import { useToastStore } from "../../../store/toast";
import type { RoadmapResponse, PageResponse, PlanningContext, AiPlannedTask } from "../../../lib/types";

interface AIScheduleGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onCommitted: () => void;
}

interface AIPlan {
  planOverview: string;
  dailyPlans: {
    dayLabel: string;
    totalLoadMinutes: number;
    tasks: AiPlannedTask[];
  }[];
}

export default function AIScheduleGeneratorModal({ open, onClose, onCommitted }: AIScheduleGeneratorModalProps) {
  const toast = useToastStore((s) => s.push);
  const [step, setStep] = useState<"select" | "generating" | "review" | "committing">("select");
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [selectedRoadmaps, setSelectedRoadmaps] = useState<Set<number>>(new Set());
  const [context, setContext] = useState<PlanningContext | null>(null);
  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [streamedPlan, setStreamedPlan] = useState<AIPlan | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100")
        .then((res) => setRoadmaps(res.items))
        .catch(() => {});
      setStep("select");
      setPlan(null);
      setStreamedPlan(null);
      setContext(null);
    }
  }, [open]);

  const generateFallback = useCallback(async (ctx: PlanningContext) => {
    try {
      const result = await api.post<AIPlan>("/schedule/ai/generate", {
        roadmapIds: Array.from(selectedRoadmaps),
      });
      setPlan(result);
      setStep("review");
    } catch {
      if (ctx) {
        const fallbackPlan: AIPlan = {
          planOverview: `Plan covering ${ctx.pendingTopics.length} topics across available days.`,
          dailyPlans: ctx.pendingTopics.slice(0, 14).map((t, i) => ({
            dayLabel: `Day ${i + 1}`,
            totalLoadMinutes: 60,
            tasks: [{
              topicId: t.id,
              taskType: "new_learning" as const,
              approxDurationMinutes: 60,
              reasoning: `Study ${t.title}`,
            }],
          })),
        };
        setPlan(fallbackPlan);
        setStep("review");
      }
    }
  }, [selectedRoadmaps]);

  const handleGenerate = useCallback(async () => {
    if (selectedRoadmaps.size === 0) { toast("Select at least one roadmap", { tone: "error" }); return; }
    setGenerating(true);
    setStep("generating");
    setStreamedPlan(null);

    let ctx: PlanningContext | null = null;
    try {
      ctx = await api.post<PlanningContext>("/schedule/ai/context", {
        roadmapIds: Array.from(selectedRoadmaps),
      });
      setContext(ctx);
    } catch {
      toast("Failed to fetch planning context", { tone: "error" });
      setGenerating(false);
      setStep("select");
      return;
    }

    // Stream via fetch POST + ReadableStream (EventSource can't do POST/headers)
    const rawBase = import.meta.env.VITE_API_URL || "https://jumpstart-production.up.railway.app";
    const baseUrl = rawBase.replace(/\/+$/, "");
    const apiBase = baseUrl.endsWith("/api") ? baseUrl : baseUrl + "/api";
    const token = getAccessToken();

    try {
      const response = await fetch(`${apiBase}/schedule/ai/generate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roadmapIds: Array.from(selectedRoadmaps) }),
      });

      if (!response.ok || !response.body) throw new Error("Stream unavailable: " + response.status);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let streamFinalized = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let evt = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              evt = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed && parsed.dailyPlans) {
                  if (evt === "plan-complete") {
                    setPlan(parsed as AIPlan);
                    setStreamedPlan(null);
                    setStep("review");
                    streamFinalized = true;
                  } else {
                    setStreamedPlan(parsed as AIPlan);
                  }
                }
              } catch { /* partial data — skip */ }
            }
          }
        }
      }

      // If streaming ended without a complete event, use sync fallback
      if (!streamFinalized && ctx) {
        await generateFallback(ctx);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("SSE streaming failed, falling back to sync", err);
      if (ctx) await generateFallback(ctx);
      else { toast("AI generation unavailable", { tone: "error" }); setStep("select"); }
    } finally {
      setGenerating(false);
    }
  }, [selectedRoadmaps, toast, generateFallback]);

  async function handleCommit() {
    if (!plan) return;
    setStep("committing");
    try {
      await api.post("/schedule/ai/commit", plan);
      toast("AI plan locked in! Check your schedule.", { tone: "success" });
      onCommitted();
      onClose();
    } catch {
      toast("Failed to commit plan", { tone: "error" });
      setStep("review");
    }
  }

  const displayPlan = streamedPlan || plan;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-cyan-400" />
                <h3 className="text-[16px] font-semibold text-paper">AI Schedule Generator</h3>
              </div>
              <button onClick={onClose} className="text-mist-600 hover:text-mist-200">
                <X size={16} />
              </button>
            </div>

            {/* Step: Select Roadmaps */}
            {step === "select" && (
              <div>
                <p className="text-[12px] text-mist-500 mb-3">Select roadmaps to plan. The AI will analyze prerequisites, difficulty, and your pace to create an optimal schedule.</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {roadmaps.filter((r) => !r.archived).map((r) => (
                    <button key={r.id} onClick={() => setSelectedRoadmaps((prev) => {
                      const next = new Set(prev);
                      next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                      return next;
                    })} className={clsx("px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                      selectedRoadmaps.has(r.id) ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "border-slate-700 text-mist-500 hover:text-mist-200")}>
                      <BookOpen size={12} className="inline mr-1.5" />{r.title}
                    </button>
                  ))}
                </div>
                <button onClick={handleGenerate} disabled={selectedRoadmaps.size === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 text-ink-900 text-[13px] font-medium py-2.5 hover:bg-cyan-400 disabled:opacity-40 transition-all">
                  <Sparkles size={16} /> Generate AI Schedule
                </button>
              </div>
            )}

            {/* Step: Generating (Streaming) */}
            {step === "generating" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[12px] text-mist-500 mb-3">
                  <Loader2 size={14} className="animate-spin text-cyan-400" />
                  {plan ? "Generation complete! Click below to review." : "Analyzing roadmaps & building optimal sequence..."}
                </div>

                {/* Animated progress dots */}
                {!displayPlan && (
                  <div className="flex items-center gap-2 mb-4">
                    {["Scanning topics", "Checking prereqs", "Applying pace", "Building schedule"].map((step, i) => (
                      <div key={step} className="flex items-center gap-1.5">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                          className={clsx("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-cyan-400" : "bg-slate-600")}
                        />
                        <span className={clsx("text-[9px]", i === 0 ? "text-cyan-400" : "text-mist-600")}>{step}</span>
                        {i < 3 && <span className="text-mist-700 text-[8px]">›</span>}
                      </div>
                    ))}
                  </div>
                )}

                {displayPlan ? (
                  displayPlan.dailyPlans.map((day, di) => (
                    <div key={di} className="panel p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[12px] font-semibold text-paper flex items-center gap-1.5">
                          <Clock size={12} className="text-cyan-400" /> {day.dayLabel}
                        </h4>
                        <span className={clsx("text-[10px] font-mono", streamedPlan ? "text-cyan-400" : "text-mist-500")}>
                          {day.totalLoadMinutes} min
                        </span>
                      </div>
                      <div className="space-y-2">
                        {day.tasks.map((task, ti) => (
                          <AIGeneratedCard
                            key={`${di}-${ti}`}
                            title={task.title || `Topic #${task.topicId}`}
                            taskType={task.taskType}
                            durationMinutes={task.approxDurationMinutes}
                            reasoning={task.reasoning || "AI scheduled task"}
                            topicId={task.topicId}
                          />
                        ))}
                        {streamedPlan && !plan && day.tasks.length < 3 && (
                          <div className="flex gap-2">
                            {Array.from({ length: 3 - day.tasks.length }).map((_, si) => (
                              <div key={si} className="flex-1 h-14 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  /* Glassmorphism skeleton shimmer */
                  Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="panel p-3 space-y-2"
                    >
                      <div className="h-4 w-28 bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded animate-pulse" />
                      {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
                        <div key={j} className="h-14 rounded-xl bg-gradient-to-r from-slate-800/60 via-slate-700/20 to-slate-800/60 animate-pulse border border-slate-700/20" />
                      ))}
                    </motion.div>
                  ))
                )}

                {plan && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 pt-2"
                  >
                    <div className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-lg px-3 py-2.5">
                      <p className="text-[11px] text-cyan-300 leading-relaxed">{plan.planOverview}</p>
                    </div>
                    <button onClick={() => setStep("review")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 text-ink-900 text-[13px] font-medium py-2.5 hover:bg-cyan-400 active:scale-[0.98] transition-all">
                      Review Plan <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && plan && (
              <div className="space-y-3">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 mb-3">
                  <p className="text-[12px] text-cyan-300 italic">🧠 {plan.planOverview}</p>
                </div>

                {plan.dailyPlans.map((day, di) => (
                  <div key={di} className="panel p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[12px] font-semibold text-paper flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-400" /> {day.dayLabel}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-mist-500">{day.totalLoadMinutes} min</span>
                        <span className="text-[10px] text-mist-600">{day.tasks.length} tasks</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {day.tasks.map((task, ti) => (
                        <AIGeneratedCard
                          key={`${di}-${ti}`}
                          title={task.title || `Topic #${task.topicId}`}
                          taskType={task.taskType}
                          durationMinutes={task.approxDurationMinutes}
                          reasoning={task.reasoning || "AI scheduled task"}
                          topicId={task.topicId}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <div className="flex items-center justify-between text-[11px] text-mist-500 pt-2 px-1">
                  <span className="flex items-center gap-1">
                    <Target size={12} /> {plan.dailyPlans.length} days
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {plan.dailyPlans.reduce((s, d) => s + d.totalLoadMinutes, 0)} total min
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain size={12} /> {plan.dailyPlans.reduce((s, d) => s + d.tasks.length, 0)} tasks
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setStep("select"); setPlan(null); }}
                    className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2.5 hover:bg-slate-700 transition-all">
                    Regenerate
                  </button>
                  <button onClick={handleCommit}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-ink-900 text-[13px] font-medium py-2.5 hover:bg-emerald-400 transition-all">
                    <CheckCircle2 size={16} /> Lock In Plan
                  </button>
                </div>
              </div>
            )}

            {/* Step: Committing */}
            {step === "committing" && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 size={28} className="animate-spin text-emerald-400 mb-3" />
                <p className="text-[13px] text-paper font-medium">Locking in your AI plan...</p>
                <p className="text-[11px] text-mist-500 mt-1">Creating schedule sessions and syncing goals.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
