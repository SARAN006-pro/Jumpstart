import { useState } from "react";
import { GripVertical, Target, Clock, Search, Loader2 } from "lucide-react";
import clsx from "clsx";

interface AgendaItem {
  id: number;
  title: string;
  goalLabel: string;
  durationMinutes: number;
  cadence: string;
  priority: string;
}

interface TaskAgendaProps {
  items: AgendaItem[];
  loading?: boolean;
}

export default function TaskAgenda({ items, loading }: TaskAgendaProps) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || i.goalLabel.toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleDragStart = (e: React.DragEvent, item: AgendaItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      goalId: item.id,
      goalTitle: item.title,
      goalLabel: item.goalLabel,
      durationMinutes: item.durationMinutes,
    }));
    e.dataTransfer.effectAllowed = "copy";
    (e.currentTarget as HTMLElement).classList.add("opacity-40", "scale-95");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("opacity-40", "scale-95");
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/30">
        <h3 className="text-[11px] font-semibold text-paper uppercase tracking-wider flex items-center gap-1.5">
          <Target size={12} className="text-cyan-400" />
          Task Agenda
        </h3>
        <p className="text-[9px] text-mist-600 mt-0.5">Drag tasks into the calendar</p>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-slate-700/20">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2 py-1">
          <Search size={11} className="text-mist-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tasks..."
            className="bg-transparent text-[11px] text-paper outline-none w-full placeholder:text-mist-600"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="max-h-[500px] overflow-y-auto space-y-0.5 p-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={14} className="animate-spin text-mist-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[11px] text-mist-600 text-center py-6">{search ? "No matches" : "No unplanned goals"}</p>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              className={clsx(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none border border-transparent",
                "hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:translate-x-0.5 group",
              )}
            >
              <GripVertical size={12} className="shrink-0 text-mist-600 group-hover:text-cyan-400 transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-paper truncate">{item.goalLabel}</p>
                <p className="text-[9px] text-mist-600 truncate">{item.title}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono text-mist-500 flex items-center gap-0.5">
                  <Clock size={8} /> {item.durationMinutes}m
                </span>
                <span className={clsx(
                  "text-[8px] px-1 py-0.5 rounded font-medium",
                  item.priority === "high" ? "bg-red-500/10 text-red-300" :
                  item.priority === "medium" ? "bg-amber-500/10 text-amber-300" :
                  "bg-slate-700/30 text-mist-500",
                )}>
                  {item.priority}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instruction footer */}
      <div className="px-3 py-1.5 border-t border-slate-700/20">
        <p className="text-[8px] text-mist-600 text-center">
          Drag any task to a time slot in the calendar to schedule it
        </p>
      </div>
    </div>
  );
}
