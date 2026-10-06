import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";

interface TimeSlotSession {
  id: number;
  title: string;
  dayStr: string;
  startHour: number;
  endHour: number;
  status: string;
  goalTitle?: string;
}

interface WeeklyTimeGridProps {
  weekStart: Date;
  sessions: TimeSlotSession[];
  onSessionCreated: () => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = HOURS.map((h) => `${h.toString().padStart(2, "0")}:00`);

export default function WeeklyTimeGrid({ weekStart, sessions, onSessionCreated }: WeeklyTimeGridProps) {
  const toast = useToastStore((s) => s.push);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const baseMidnight = useMemo(() => {
    const d = new Date(weekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const target = (e.currentTarget as HTMLElement).dataset.slot;
    if (target) setDropTarget(target);
  }, []);

  const handleDragLeave = useCallback(() => setDropTarget(null), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const slot = (e.currentTarget as HTMLElement).dataset.slot;
    if (!slot) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      const { goalId, goalTitle, durationMinutes, goalLabel } = data;
      if (!goalId) { toast("Invalid drag data", { tone: "error" }); return; }

      setCreating(true);
      const [dayStr, hourStr] = slot.split("@");
      const dayIndex = DAYS.indexOf(dayStr);
      if (dayIndex < 0) return;

      const slotDate = new Date(baseMidnight);
      slotDate.setDate(slotDate.getDate() + dayIndex);
      slotDate.setHours(parseInt(hourStr), 0, 0, 0);

      const endDate = new Date(slotDate);
      const mins = durationMinutes || 60;
      endDate.setMinutes(endDate.getMinutes() + mins);

      await api.post("/schedule/sessions", {
        title: goalTitle || goalLabel || "Study Session",
        plannedStartTime: slotDate.toISOString(),
        plannedEndTime: endDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: `Dragged from goal: ${goalLabel}`,
      });

      toast(`Session created: ${goalLabel || goalTitle}`, { tone: "success" });
      onSessionCreated();
    } catch (err) {
      toast("Failed to create session", { tone: "error" });
    } finally {
      setCreating(false);
    }
  }, [baseMidnight, toast, onSessionCreated]);

  function getSessionForSlot(day: string, hour: number): TimeSlotSession | undefined {
    return sessions.find((s) => s.dayStr === day && s.startHour <= hour && s.endHour > hour);
  }

  return (
    <div className="relative">
      {creating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-sm">
          <Loader2 size={20} className="animate-spin text-cyan-400" />
        </div>
      )}

      <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-slate-700/30 rounded-xl overflow-hidden border border-slate-700/50">
        {/* Header row */}
        <div className="bg-slate-800/60 p-1" />
        {DAYS.map((day, i) => {
          const d = new Date(baseMidnight);
          d.setDate(d.getDate() + i);
          const today = new Date();
          const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
          return (
            <div key={day} className={clsx("text-center py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-800/60",
              isToday ? "text-cyan-300" : "text-mist-500")}>
              {day}
              <span className={clsx("block text-[13px] font-mono mt-0.5", isToday && "text-cyan-300")}>{d.getDate()}</span>
            </div>
          );
        })}

        {/* Time rows */}
        {HOURS.map((hour) => (
          <div key={`row-${hour}`} className="contents">
            {/* Time label */}
            <div className="bg-slate-800/40 p-1 flex items-start justify-end pr-2 text-[9px] font-mono text-mist-600 border-t border-slate-700/30">
              {HOUR_LABELS[HOURS.indexOf(hour)]}
            </div>

            {/* Day columns */}
            {DAYS.map((day) => {
              const slotKey = `${day}@${hour}`;
              const session = getSessionForSlot(day, hour);
              const isDropTarget = dropTarget === slotKey;

              return (
                <div
                  key={slotKey}
                  data-slot={slotKey}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={clsx(
                    "min-h-[36px] relative border-t border-slate-700/20 transition-colors",
                    isDropTarget && "bg-cyan-500/15 ring-1 ring-cyan-400/40",
                    session ? "bg-slate-800/30" : "hover:bg-slate-700/20",
                  )}
                >
                  {session && (
                    <div className={clsx(
                      "absolute inset-0.5 rounded px-1 py-0.5 text-[9px] font-medium truncate flex items-center gap-1",
                      session.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-300" : "bg-cyan-500/10 text-cyan-200",
                    )}>
                      {session.status === "COMPLETED" ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                      {session.title}
                    </div>
                  )}

                  {isDropTarget && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0.5 rounded border-2 border-dashed border-cyan-400/40 bg-cyan-400/5 flex items-center justify-center"
                    >
                      <span className="text-[8px] text-cyan-400 font-medium">Drop here</span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
