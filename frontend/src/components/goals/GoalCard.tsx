import { useRef } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Clock, Target, AlertTriangle, Lock } from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";
import StreakBadge from "./StreakBadge";
import MilestoneTrack from "./MilestoneTrack";
import { useGoalFueling } from "../../hooks/useGoalFueling";
import type { GoalResponse } from "../../lib/types";

interface GoalCardProps {
  goal: GoalResponse;
  onEdit?: (goal: GoalResponse) => void;
  variant?: "daily" | "compact" | "featured";
}

function GradientProgressRing({ percent, size = 56, strokeWidth = 5, atRisk, ghostPercent }: { percent: number; size?: number; strokeWidth?: number; atRisk?: boolean; ghostPercent?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  const ringRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ringRef, { once: true, margin: "-50px" });
  const progress = useMotionValue(0);
  const offset = useTransform(progress, [0, 100], [c, 0]);

  useEffect(() => {
    if (inView) {
      animate(progress, Math.min(percent, 100), {
        type: "spring",
        stiffness: 60,
        damping: 15,
        duration: 1.2,
      });
    }
  }, [inView, percent, progress]);

  const gradientId = `progress-grad-${percent}-${size}`;
  const color1 = atRisk ? "#f59e0b" : "#10b981";
  const color2 = atRisk ? "#ef4444" : "#06b6d4";

  return (
    <div ref={ringRef} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        {/* Pace car dashed ring */}
        {ghostPercent !== undefined && ghostPercent > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#06b6d4" strokeWidth={strokeWidth}
            strokeDasharray={`${c * ghostPercent / 100} ${c * (1 - ghostPercent / 100)}`}
            strokeLinecap="round"
            opacity={0.3}
          />
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold font-mono tabular-nums text-paper">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}

function isAtRisk(goal: GoalResponse): boolean {
  if (!goal.dueDate || goal.complete) return false;
  const due = new Date(goal.dueDate);
  const now = new Date();
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return true;
  const progress = goal.targetValue > 0 ? goal.progressValue / goal.targetValue : 0;
  return progress < 0.3 && daysLeft < Math.ceil(goal.targetValue * 0.3);
}

export default function GoalCard({ goal, onEdit, variant = "compact" }: GoalCardProps) {
  const percent = goal.targetValue > 0 ? Math.min(100, Math.round((goal.progressValue / goal.targetValue) * 100)) : 0;
  const atRisk = isAtRisk(goal);
  const isFeatured = variant === "featured";
  const isDaily = variant === "daily";

  const { isActivelyFueling, liveFuelMinutes } = useGoalFueling(goal.id);
  const ghostPercent = isActivelyFueling && goal.targetValue > 0
    ? Math.min(100, Math.round(((goal.progressValue + liveFuelMinutes) / goal.targetValue) * 100))
    : undefined;

  const isLocked = goal.locked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={clsx(
        "relative rounded-xl border transition-all group",
        isLocked && "opacity-60 grayscale",
        atRisk
          ? "border-red-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          : "border-slate-700 hover:border-slate-600",
        isDaily ? "p-3" : isFeatured ? "p-5" : "p-4",
        isFeatured && "row-span-2 col-span-2"
      )}
      style={atRisk ? { animation: "pulseBorder 2s ease-in-out infinite" } : undefined}
    >
      {isLocked && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-slate-600/30 border border-slate-500/30 px-2 py-0.5 z-10">
          <Lock size={10} className="text-mist-400" />
          <span className="text-[9px] text-mist-400 font-semibold">Locked</span>
        </div>
      )}
      {atRisk && !isLocked && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 z-10">
          <AlertTriangle size={10} className="text-red-400" />
          <span className="text-[9px] text-red-400 font-semibold">At Risk</span>
        </div>
      )}

      {/* Glass overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

      <div className={clsx("relative z-10 flex", isDaily ? "items-center gap-3" : "items-start gap-3")}>
        <GradientProgressRing
          percent={percent}
          size={isDaily ? 40 : isFeatured ? 64 : 48}
          strokeWidth={isDaily ? 4 : isFeatured ? 6 : 5}
          atRisk={atRisk || isLocked}
          ghostPercent={ghostPercent}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={clsx("font-medium truncate", isFeatured ? "text-[15px]" : "text-[13px]", "text-paper")}>{goal.label}</p>
            <div className="flex items-center gap-2 shrink-0">
              <StreakBadge count={goal.streakCount} size="sm" />
              {onEdit && (
                <button onClick={() => onEdit(goal)} className="text-[10px] text-mist-500 hover:text-mist-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit
                </button>
              )}
            </div>
          </div>

          {goal.description && (
            <p className={clsx("text-mist-500 truncate mt-0.5", isFeatured ? "text-[12px]" : "text-[11px]")}>{goal.description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <span className={clsx("font-mono text-mist-400", isFeatured ? "text-[12px]" : "text-[11px]")}>
              {goal.progressValue}/{goal.targetValue} {goal.unit || ""}
            </span>
            {goal.dueDate && (
              <span className="flex items-center gap-1 text-[11px] text-mist-500">
                <Clock size={11} /> {goal.dueDate}
              </span>
            )}
            {isActivelyFueling && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-400 animate-pulse">
                +{liveFuelMinutes}m fueling
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-slate-700 overflow-hidden mt-2 relative">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-700 relative",
                percent >= 100 ? "bg-gradient-to-r from-emerald-500 to-cyan-400" : "bg-gradient-to-r from-amber-500 to-emerald-400"
              )}
              style={{ width: `${percent}%` }}
            />
            {ghostPercent !== undefined && ghostPercent > percent && (
              <div
                className="absolute top-0 h-full rounded-full bg-gradient-to-r from-cyan-500/40 to-cyan-300/40 border-r border-cyan-400/50"
                style={{ left: `${percent}%`, width: `${ghostPercent - percent}%` }}
              />
            )}
          </div>

          {/* Behind schedule warning */}
          {atRisk && !isLocked && (
            <p className="text-[10px] text-red-400 mt-1">Behind schedule</p>
          )}

          {/* Milestones for LONGTERM */}
          {goal.cadence === "LONGTERM" && (
            <MilestoneTrack goalId={goal.id} progressPercent={percent} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
