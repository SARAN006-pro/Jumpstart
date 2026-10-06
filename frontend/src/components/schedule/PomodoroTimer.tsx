import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { usePomodoro } from "../../hooks/usePomodoro";
import { Play, Pause, RotateCcw, Zap, Clock } from "lucide-react";

interface PomodoroTimerProps {
  className?: string;
}

export default function PomodoroTimer({ className }: PomodoroTimerProps) {
  const pomodoro = usePomodoro();
  const progress = useMotionValue(pomodoro.progress);

  useEffect(() => {
    animate(progress, pomodoro.progress, { duration: 0.3, ease: "easeOut" });
  }, [pomodoro.progress, progress]);

  const size = 200;
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = useTransform(progress, [0, 1], [c, 0]);

  const isActive = pomodoro.isRunning || pomodoro.phase === "paused";
  const breakPhase = pomodoro.isBreak;
  const glow = isActive
    ? breakPhase
      ? "0 0 30px rgba(139, 92, 246, 0.4)"
      : "0 0 30px rgba(6, 182, 212, 0.5)"
    : "none";

  const strokeColor = breakPhase ? "#8b5cf6" : "#06b6d4";
  const trackColor = breakPhase ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)";

  const minutes = Math.floor(pomodoro.remainingSeconds / 60);
  const seconds = pomodoro.remainingSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const showTimer = isActive || pomodoro.phase === "completed" || pomodoro.phase === "break";

  return (
    <div className={clsx("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Ambient glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: glow !== "none" ? [glow, glow.replace("0.5", "0.8").replace("0.4", "0.7"), glow] : "none",
            scale: breakPhase ? [1, 1.02, 1] : [1, 1.01, 1],
          }}
          transition={{
            duration: breakPhase ? 4 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Track circle */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            style={{ strokeDashoffset: offset }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showTimer ? (
            <>
              <span className="text-[36px] font-mono font-bold tabular-nums text-paper tracking-tight">
                {display}
              </span>
              {breakPhase && (
                <span className="text-[11px] text-violet-400 font-medium mt-1">Break time</span>
              )}
              {pomodoro.phase === "completed" && (
                <span className="text-[11px] text-emerald-400 font-medium mt-1">Done!</span>
              )}
            </>
          ) : (
            <>
              <Clock size={28} className="text-mist-500 mb-1" />
              <span className="text-[11px] text-mist-500 font-medium">Pomodoro</span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-4">
        {pomodoro.phase === "idle" && (
          <button onClick={() => pomodoro.start()} className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-5 py-2.5 text-[13px] text-cyan-400 font-medium hover:bg-cyan-500/20 transition-colors">
            <Play size={15} /> Start Focus
          </button>
        )}
        {pomodoro.isRunning && (
          <button onClick={pomodoro.pause} className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-[13px] text-amber-400 font-medium hover:bg-amber-500/20 transition-colors">
            <Pause size={15} /> Pause
          </button>
        )}
        {pomodoro.phase === "paused" && (
          <>
            <button onClick={pomodoro.resume} className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-[13px] text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors">
              <Play size={15} /> Resume
            </button>
            <button onClick={pomodoro.reset} className="flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-[13px] text-mist-400 hover:bg-slate-700 transition-colors">
              <RotateCcw size={14} />
            </button>
          </>
        )}
        {pomodoro.isBreak && (
          <button onClick={pomodoro.skipBreak} className="flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-2.5 text-[13px] text-mist-400 hover:bg-slate-700 transition-colors">
            <Zap size={15} /> Skip Break
          </button>
        )}
      </div>

      {/* Pomodoro count */}
      {pomodoro.pomodoroCount > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {Array.from({ length: Math.min(pomodoro.pomodoroCount, 4) }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                "w-2 h-2 rounded-full",
                i < pomodoro.pomodoroCount % 4 ? "bg-cyan-400" : "bg-slate-700"
              )}
            />
          ))}
          <span className="text-[10px] text-mist-600 ml-1">
            {pomodoro.pomodoroCount} session{pomodoro.pomodoroCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {pomodoro.isBreak && pomodoro.breakSuggestion && (
        <p className="text-[11px] text-mist-500 mt-3 text-center max-w-[200px] leading-relaxed">
          {pomodoro.breakSuggestion}
        </p>
      )}
    </div>
  );
}
