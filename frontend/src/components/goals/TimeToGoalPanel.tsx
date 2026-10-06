import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";

interface GoalProjection {
  goalId: number;
  goalTitle: string;
  targetValue: number;
  progressValue: number;
  remainingValue: number;
  unit: string;
  dueDate: string | null;
  avgDailyMinutes: number;
  estimatedDaysRemaining: number;
  projectedCompletionDate: string;
  onTrack: boolean;
  insight: string;
}

export default function TimeToGoalPanel() {
  const [projections, setProjections] = useState<GoalProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get<GoalProjection[]>("/goals/projections")
      .then(setProjections)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (projections.length === 0) return null;

  const atRisk = projections.filter((p) => !p.onTrack);
  const healthy = projections.filter((p) => p.onTrack);

  return (
    <div className="panel mb-5 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-cyan-400" />
          <h3 className="text-[12px] font-semibold text-paper uppercase tracking-wider">Time to Goal</h3>
          {atRisk.length > 0 && (
            <span className="text-[9px] text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} /> {atRisk.length} at risk
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown size={14} className="text-mist-500" /> : <ChevronUp size={14} className="text-mist-500" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* At-risk goals */}
              {atRisk.map((p) => (
                <div key={p.goalId} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-paper truncate">{p.goalTitle}</p>
                      <p className="text-[10px] text-red-300 mt-0.5">{p.insight}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-mono text-red-400">{p.estimatedDaysRemaining}d</p>
                      <p className="text-[8px] text-mist-600">projected</p>
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-slate-700/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (p.progressValue / p.targetValue) * 100)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-mist-600 mt-1">
                    <span>{Math.round(p.progressValue)} / {Math.round(p.targetValue)} {p.unit}</span>
                    <span>{p.avgDailyMinutes.toFixed(0)} min/day avg</span>
                  </div>
                </div>
              ))}

              {/* Healthy goals */}
              {healthy.map((p) => (
                <div key={p.goalId} className="rounded-lg border border-emerald-500/10 bg-slate-800/30 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-paper truncate">{p.goalTitle}</p>
                      <p className="text-[10px] text-emerald-300 mt-0.5">{p.insight}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={9} /> {p.projectedCompletionDate}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-slate-700/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (p.progressValue / p.targetValue) * 100)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
