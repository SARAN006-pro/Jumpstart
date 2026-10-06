import { useMemo } from "react";
import { useDraggable, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Clock, Target, GripVertical } from "lucide-react";
import clsx from "clsx";
import type { GoalResponse } from "../../lib/types";

interface AgendaItem {
  id: string;
  goalId: number;
  title: string;
  metricType: string;
  remaining: number;
  target: number;
  unit: string;
}

function DraggableCard({ item, index }: { item: AgendaItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
        isDragging
          ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg scale-105 opacity-90"
          : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-mist-600 hover:text-mist-300 cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Drag to calendar"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-paper font-medium truncate">{item.title}</p>
        <p className="text-[10px] text-mist-500 flex items-center gap-1 mt-0.5">
          <Target size={9} />
          {item.remaining}/{item.target} {item.unit} remaining
        </p>
      </div>
      <span className="text-[10px] font-mono text-mist-600 shrink-0">
        {item.metricType === "HOURS" ? `${item.remaining}h` : `${item.remaining}`}
      </span>
    </div>
  );
}

interface DailyAgendaListProps {
  goals: GoalResponse[];
  onDropOnCalendar: (goal: GoalResponse, date: Date, durationMinutes: number) => void;
}

export default function DailyAgendaList({ goals, onDropOnCalendar }: DailyAgendaListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const items: AgendaItem[] = useMemo(() => {
    return goals
      .filter((g) => !g.complete && g.targetValue > 0)
      .map((g) => ({
        id: `agenda-${g.id}`,
        goalId: g.id,
        title: g.label,
        metricType: g.metricType,
        remaining: Math.max(0, g.targetValue - g.progressValue),
        target: g.targetValue,
        unit: g.unit || (g.metricType === "HOURS" ? "hrs" : "units"),
      }))
      .filter((item) => item.remaining > 0);
  }, [goals]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active) return;

    const item = active.data.current as AgendaItem | undefined;
    if (!item) return;

    const goal = goals.find((g) => g.id === item.goalId);
    if (!goal) return;

    // If dropped on calendar (over is null or a calendar slot), we need the calendar
    // to handle this via its droppable. But if over is null, we can still pass to parent.
    if (!over) return;

    // The calendar view handles the actual drop via the droppable area
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[11px] text-mist-600 italic">All goals are on track!</p>
        <p className="text-[10px] text-mist-700 mt-1">Drag goals from here to your calendar to schedule them.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock size={12} className="text-cyan-400" />
          <h3 className="text-[11px] font-semibold text-paper uppercase tracking-wider">Unscheduled Tasks</h3>
          <span className="text-[10px] text-mist-600 font-mono ml-auto">{items.length}</span>
        </div>
        {items.map((item, i) => (
          <DraggableCard key={item.id} item={item} index={i} />
        ))}
        <p className="text-[9px] text-mist-700 mt-2 text-center">Drag a task onto the calendar to schedule it</p>
      </div>
    </DndContext>
  );
}
