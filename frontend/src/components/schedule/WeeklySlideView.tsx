import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, Play, Sparkles } from "lucide-react";
import clsx from "clsx";

interface DayData {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  taskCount: number;
  completedCount: number;
  totalMinutes: number;
}

interface WeeklySlideViewProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  onDaySelect: (date: Date) => void;
  selectedDate: string | null;
  dayData?: Record<string, { taskCount: number; completedCount: number; totalMinutes: number }>;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function generateWeekDays(weekStart: Date, dayStats?: Record<string, { taskCount: number; completedCount: number; totalMinutes: number }>): DayData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    const stats = dayStats?.[ds];
    days.push({
      date: d,
      dateStr: ds,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      isToday: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate(),
      taskCount: stats?.taskCount ?? 0,
      completedCount: stats?.completedCount ?? 0,
      totalMinutes: stats?.totalMinutes ?? 0,
    });
  }
  return days;
}

export default function WeeklySlideView({ weekStart, onWeekChange, onDaySelect, selectedDate, dayData }: WeeklySlideViewProps) {
  const days = generateWeekDays(weekStart, dayData);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.5;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); onWeekChange(d); }}
          className="rounded-lg p-2 text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-cyan-400" />
          <span className="text-[13px] font-semibold text-paper">
            {days[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" — "}
            {days[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); onWeekChange(d); }}
          className="rounded-lg p-2 text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day slides (horizontal scroll) */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-1 snap-x snap-mandatory">
        {days.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const progress = day.taskCount > 0 ? day.completedCount / day.taskCount : 0;
          return (
            <motion.button
              key={day.dateStr}
              layout
              onClick={() => onDaySelect(day.date)}
              className={clsx(
                "snap-start shrink-0 w-[110px] rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-cyan-500/50 bg-cyan-500/8 shadow-[0_0_16px_rgba(6,182,212,0.12)]"
                  : day.isToday
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-slate-700/60 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50",
              )}
              whileTap={{ scale: 0.97 }}
            >
              <p className={clsx("text-[10px] font-medium uppercase tracking-wider", day.isToday ? "text-emerald-400" : "text-mist-500")}>
                {day.dayName}
              </p>
              <p className={clsx("text-[22px] font-display mt-0.5", isSelected ? "text-cyan-200" : day.isToday ? "text-emerald-200" : "text-paper")}>
                {day.dayNum}
              </p>

              {/* Task count & progress */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-mist-500">
                  <Clock size={9} />
                  <span>{day.totalMinutes > 0 ? `${day.totalMinutes}m` : "—"}</span>
                </div>
                {day.taskCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={clsx("h-full rounded-full transition-all", progress >= 1 ? "bg-emerald-400" : "bg-cyan-400")}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-mist-600">{day.completedCount}/{day.taskCount}</span>
                  </div>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div layoutId="slide-selector" className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-cyan-400" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
