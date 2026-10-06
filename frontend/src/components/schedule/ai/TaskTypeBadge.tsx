import { Brain, Wrench, RotateCcw } from "lucide-react";
import clsx from "clsx";

export type TaskType = "new_learning" | "deep_practice" | "spaced_review";

interface TaskTypeBadgeProps {
  taskType: TaskType;
  size?: "sm" | "md";
}

const META: Record<TaskType, { icon: typeof Brain; label: string; colors: string }> = {
  new_learning: {
    icon: Brain,
    label: "New Learning",
    colors: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  },
  deep_practice: {
    icon: Wrench,
    label: "Deep Practice",
    colors: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  spaced_review: {
    icon: RotateCcw,
    label: "Spaced Review",
    colors: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
};

export default function TaskTypeBadge({ taskType, size = "sm" }: TaskTypeBadgeProps) {
  const meta = META[taskType];
  const Icon = meta.icon;

  return (
    <span className={clsx(
      "inline-flex items-center gap-1 rounded-md border font-medium",
      meta.colors,
      size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
    )}>
      <Icon size={size === "sm" ? 9 : 11} />
      {meta.label}
    </span>
  );
}
