import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles, Target, Clock, TrendingUp, Zap } from "lucide-react";
import clsx from "clsx";
import CognitiveInsightCard from "./CognitiveInsightCard";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { CognitiveAnalysisResponse } from "../../lib/types";

export default function CognitiveDashboard() {
  const toast = useToastStore((s) => s.push);
  const [analysis, setAnalysis] = useState<CognitiveAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.post<CognitiveAnalysisResponse>("/analytics/cognitive");
      setAnalysis(result);
    } catch {
      toast("Cognitive analysis unavailable", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  if (!analysis) {
    return (
      <div className="panel p-5">
        <div className="flex flex-col items-center text-center py-6">
          <Brain size={32} className="text-violet-400 mb-3" />
          <h3 className="text-[15px] font-display text-paper mb-1">Cognitive Analysis</h3>
          <p className="text-[12px] text-mist-500 max-w-md mb-4">
            Groq AI analyzes your last 30 days of study data to identify strengths, bottlenecks,
            and your optimal learning strategy.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-[12px] font-medium px-4 py-2 hover:opacity-90 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Analyzing..." : "Run Cognitive Analysis"}
          </button>
        </div>
      </div>
    );
  }

  const { strengths, bottlenecks, optimalStrategy, predictedBurnoutRisk, studyStats } = analysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-[14px] font-display text-paper">Cognitive Analysis</h3>
          <span className={clsx(
            "text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider",
            predictedBurnoutRisk === "high" && "bg-red-500/10 text-red-300",
            predictedBurnoutRisk === "medium" && "bg-amber-500/10 text-amber-300",
            predictedBurnoutRisk === "low" && "bg-emerald-500/10 text-emerald-300",
          )}>
            Burnout: {predictedBurnoutRisk}
          </span>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="text-[10px] text-mist-500 hover:text-mist-200 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <StatBox icon={<Clock size={12} />} label="Avg Session" value={`${Math.round(studyStats.avgSessionMinutes)}m`} />
        <StatBox icon={<Target size={12} />} label="Sessions" value={String(studyStats.totalSessions)} />
        <StatBox icon={<TrendingUp size={12} />} label="Total Focus" value={`${Math.round(studyStats.totalFocusMinutes / 60)}h`} />
        <StatBox icon={<Zap size={12} />} label="Best Streak" value={`${studyStats.longestStreakDays}d`} />
        <StatBox icon={<Zap size={12} />} label="Current Streak" value={`${studyStats.currentStreakDays}d`} />
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CognitiveInsightCard
          label="Strengths"
          items={strengths}
          tone="emerald"
          icon={<TrendingUp size={14} />}
        />
        <CognitiveInsightCard
          label="Bottlenecks"
          items={bottlenecks}
          tone="amber"
          icon={<Target size={14} />}
        />
        <CognitiveInsightCard
          label="Optimal Strategy"
          items={[optimalStrategy]}
          tone="violet"
          icon={<Brain size={14} />}
        />
      </div>
    </motion.div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 px-3 py-2">
      <div className="flex items-center gap-1 text-[9px] text-mist-600 uppercase tracking-wider mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-[16px] font-display text-paper tabular-nums">{value}</p>
    </div>
  );
}
