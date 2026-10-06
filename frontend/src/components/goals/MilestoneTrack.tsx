import clsx from "clsx";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { MilestoneResponse } from "../../lib/types";
import { api } from "../../lib/api";

interface MilestoneTrackProps {
  goalId: number;
  progressPercent: number;
}

export default function MilestoneTrack({ goalId, progressPercent }: MilestoneTrackProps) {
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MilestoneResponse[]>(`/goals/${goalId}/milestones`)
      .then(setMilestones)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [goalId]);

  if (loading || milestones.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-700/60">
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-700 rounded" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded transition-all duration-700"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />

        {/* Nodes */}
        {milestones.map((m, i) => {
          const filled = m.isCompleted || progressPercent >= m.targetPercentage;
          const pos = `${(i / (milestones.length - 1)) * 100}%`;
          return (
            <div
              key={m.id}
              className="relative z-10 flex flex-col items-center"
              style={{ marginLeft: i === 0 ? 0 : undefined, marginRight: i === milestones.length - 1 ? 0 : undefined }}
            >
              <div
                className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
                  filled
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                    : "bg-slate-700 border border-slate-600"
                )}
              >
                {filled ? (
                  <Check size={10} className="text-ink-900" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                )}
              </div>
              <span className={clsx(
                "text-[9px] mt-1 font-medium",
                filled ? "text-emerald-400" : "text-mist-600"
              )}>
                {Math.round(m.targetPercentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
