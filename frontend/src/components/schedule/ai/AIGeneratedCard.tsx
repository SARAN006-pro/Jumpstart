import { motion } from "framer-motion";
import { Brain, Wrench, RotateCcw } from "lucide-react";
import clsx from "clsx";
import TaskTypeBadge from "./TaskTypeBadge";

export type TaskType = "new_learning" | "deep_practice" | "spaced_review";

interface AIGeneratedCardProps {
  title: string;
  taskType: TaskType;
  durationMinutes: number;
  reasoning: string;
  topicId?: number | null;
}

const TASK_META: Record<TaskType, { icon: typeof Brain; gradient: string; color: string }> = {
  new_learning: { icon: Brain, gradient: "from-cyan-500/20 to-cyan-600/5", color: "text-cyan-400" },
  deep_practice: { icon: Wrench, gradient: "from-violet-500/20 to-violet-600/5", color: "text-violet-400" },
  spaced_review: { icon: RotateCcw, gradient: "from-amber-500/20 to-amber-600/5", color: "text-amber-400" },
};

export default function AIGeneratedCard({ title, taskType, durationMinutes, reasoning, topicId }: AIGeneratedCardProps) {
  const meta = TASK_META[taskType];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 transition-all hover:border-slate-600 group"
    >
      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-[-1px] rounded-xl" style={{
          background: `conic-gradient(from 0deg, transparent 30%, ${taskType === "new_learning" ? "#06b6d4" : taskType === "deep_practice" ? "#8b5cf6" : "#f59e0b"}80 50%, transparent 70%)`,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 1px), #000 calc(100% - 0.5px))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1px), #000 calc(100% - 0.5px))",
          animation: "spin-slow 8s linear infinite",
        }} />
      </div>

      <div className="relative z-10 flex items-start gap-3">
        <div className={clsx("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br", meta.gradient)}>
          <Icon size={16} className={meta.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-paper truncate">{title}</p>
            {topicId && <span className="text-[9px] text-mist-600 font-mono shrink-0">#{topicId}</span>}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <TaskTypeBadge taskType={taskType} />
            <span className="text-[10px] font-mono text-mist-500">{durationMinutes} min</span>
          </div>

          <p className="text-[10px] text-mist-600 italic mt-1.5 leading-relaxed">{reasoning}</p>
        </div>
      </div>
    </motion.div>
  );
}
