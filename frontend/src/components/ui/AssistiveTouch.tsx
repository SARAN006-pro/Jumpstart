import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame, Timer, Coffee, Zap, Target, Bot, X, Play, RotateCcw, SkipForward, Clock, CheckCircle2, Calendar, Check
} from "lucide-react";
import confetti from "canvas-confetti";
import clsx from "clsx";
import { useFocusStore } from "../../store/focusOrb";
import { useTimerStore, durationForPhase, type TimerPhase } from "../../store/timer";
import { toast } from "../../store/toast";
import { clamp } from "../../lib/utils";

const BTN = 60;
const ITEM = 44;
const RADIUS = 100;
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD = 8;
const POS_KEY = "focus_orb_position";

interface Pos { x: number; y: number }

function clampPos(x: number, y: number): Pos {
  const maxX = window.innerWidth - BTN;
  const maxY = window.innerHeight - BTN;
  return {
    x: clamp(x, 4, Math.max(4, maxX - 4)),
    y: clamp(y, 4, Math.max(4, maxY - 4)),
  };
}

function defaultPos(): Pos {
  const isMobile = window.innerWidth < 768;
  return clampPos(
    window.innerWidth - BTN - (isMobile ? 16 : 24),
    window.innerHeight - BTN - (isMobile ? 88 : 24),
  );
}

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Pos;
      if (typeof p.x === "number" && typeof p.y === "number") return clampPos(p.x, p.y);
    }
  } catch { /* ignore */ }
  return defaultPos();
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AssistiveTouch() {
  const navigate = useNavigate();

  /* Focus Orb store */
  const orbPhase = useFocusStore((s) => s.orbPhase);
  const orbExpanded = useFocusStore((s) => s.orbExpanded);
  const setOrbExpanded = useFocusStore((s) => s.setOrbExpanded);
  const sessionTitle = useFocusStore((s) => s.sessionTitle);
  const goalTitle = useFocusStore((s) => s.goalTitle);
  const remainingMs = useFocusStore((s) => s.remainingMs);
  const sessionDurationMs = useFocusStore((s) => s.sessionDurationMs);
  const pomodoroCount = useFocusStore((s) => s.pomodoroCount);
  const breakSuggestion = useFocusStore((s) => s.breakSuggestion);
  const targetTimestamp = useFocusStore((s) => s.targetTimestamp);

  const startFocus = useFocusStore((s) => s.startFocus);
  const startBreak = useFocusStore((s) => s.startBreak);
  const skipBreak = useFocusStore((s) => s.skipBreak);
  const reset = useFocusStore((s) => s.reset);
  const tick = useFocusStore((s) => s.tick);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const setPosition = useFocusStore((s) => s.setPosition);

  /* Legacy timer store (for break pending, today counts) */
  const legacyPhase = useTimerStore((s) => s.phase);
  const legacyBreakPending = useTimerStore((s) => s.breakPending);
  const legacySecondsLeft = useTimerStore((s) => s.secondsLeft);
  const todayFocusMinutes = useTimerStore((s) => s.todayFocusMinutes);
  const legacyEnsureDay = useTimerStore((s) => s.ensureDay);
  const legacyTick = useTimerStore((s) => s.tick);
  const legacySkipBreak = useTimerStore((s) => s.skipBreak);
  const legacyStartBreak = useTimerStore((s) => s.startBreak);
  const legacyLastCompleted = useTimerStore((s) => s.lastFocusCompletedAt);

  const [position, setLocalPos] = useState<Pos>(() => loadPos());
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [showWarn, setShowWarn] = useState(false);

  const startRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const movedRef = useRef(false);
  const longPressFiredRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const warnedRef = useRef(false);

  /* Synced position */
  useEffect(() => { setLocalPos(useFocusStore.getState().position); }, []);

  /* ── Central tick ── */
  useEffect(() => {
    legacyEnsureDay();
    const i = window.setInterval(() => {
      legacyTick();
      tick();
    }, 1000);
    return () => window.clearInterval(i);
  }, [tick, legacyTick, legacyEnsureDay]);

  /* ── Re-clamp on resize ── */
  useEffect(() => {
    function onResize() { setLocalPos((p) => clampPos(p.x, p.y)); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Activity tracking ── */
  useEffect(() => {
    let throttle = 0;
    const onAct = () => {
      const now = Date.now();
      if (now - throttle > 5000) { throttle = now; lastActivityRef.current = now; }
    };
    window.addEventListener("mousemove", onAct);
    window.addEventListener("keydown", onAct);
    return () => {
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  useEffect(() => {
    const i = window.setInterval(() => {
      const recentlyActive = Date.now() - lastActivityRef.current < 60000;
      if (recentlyActive && orbPhase !== "break") {
        setActiveMinutes((m) => m + 1);
      }
    }, 60000);
    return () => window.clearInterval(i);
  }, [orbPhase]);

  useEffect(() => {
    if (orbPhase === "break") { setActiveMinutes(0); warnedRef.current = false; setShowWarn(false); }
  }, [orbPhase]);

  useEffect(() => {
    const shouldWarn = activeMinutes >= 90 && orbPhase !== "break";
    setShowWarn(shouldWarn);
    if (shouldWarn && !warnedRef.current) {
      warnedRef.current = true;
      toast.show("You've been focused for 90 min. Your brain needs a break!", { tone: "default", duration: 6000 });
    }
  }, [activeMinutes, orbPhase]);

  /* ── Completion celebration ── */
  useEffect(() => {
    if (orbPhase !== "completed") return;
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.7 } });
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("Session complete! 🎯", { body: `You finished ${sessionTitle || "a focus session"}.` }); } catch { /* ignore */ }
    }
    toast.success("Session complete! Great focus.");
  }, [orbPhase, sessionTitle]);

  /* ── Fan menu ── */
  const handleStartFocus = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    startFocus();
    setMenuOpen(false);
    setPanelOpen(true);
    toast.show("Focus session started. 🔥");
  }, [startFocus]);

  const handleManualBreak = useCallback(() => {
    const st = useTimerStore.getState();
    if (st.breakPending) { legacyStartBreak(); setMenuOpen(false); }
    else if (st.phase === "break" || st.phase === "longBreak") { toast.show("Already on break!"); }
    else { toast.show("Start a focus session first!"); }
  }, [legacyStartBreak]);

  const fanItems = [
    { icon: Timer, label: "Pomodoro", tone: "ember", onClick: handleStartFocus },
    { icon: Coffee, label: "Break", tone: "moss", onClick: handleManualBreak },
    { icon: Zap, label: "Quick Note", tone: "gold", onClick: () => { setMenuOpen(false); navigate("/app/notes"); } },
    { icon: Target, label: "Daily Goal", tone: "ember", onClick: () => { setMenuOpen(false); navigate("/app/goals"); } },
    { icon: Calendar, label: "Schedule", tone: "moss", onClick: () => { setMenuOpen(false); navigate("/app/schedule"); } },
  ];
  const allFan = [...fanItems, { icon: X, label: "Close", tone: "mist", onClick: () => setMenuOpen(false) }];

  const cx = position.x + BTN / 2;
  const openLeft = cx > window.innerWidth / 2;
  const n = allFan.length;
  const base = openLeft ? 170 : 10;
  const dir = openLeft ? -1 : 1;
  const span = 120;

  /* ── Pointer logic ── */
  const clearLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (menuOpen) { setMenuOpen(false); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y };
    movedRef.current = false;
    longPressFiredRef.current = false;
    longPressTimer.current = window.setTimeout(() => {
      if (!movedRef.current) { longPressFiredRef.current = true; setMenuOpen(true); setPanelOpen(false); }
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true; clearLongPress(); setDragging(true); setMenuOpen(false);
    }
    if (movedRef.current) {
      const newPos = clampPos(startRef.current.px + dx, startRef.current.py + dy);
      setLocalPos(newPos);
      setPosition(newPos);
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPress();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (movedRef.current) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(position)); } catch { /* ignore */ }
      setDragging(false);
    } else if (!longPressFiredRef.current) {
      setPanelOpen((v) => !v); setMenuOpen(false);
    }
    startRef.current = null;
  };

  /* ── Derived display state ── */
  const isActive = orbPhase === "active";
  const isBreak = orbPhase === "break";
  const isReview = orbPhase === "review";
  const isCompleted = orbPhase === "completed";
  const isIdle = orbPhase === "idle";

  /* Review editable time */
  const reviewDurationMinutes = useFocusStore((s) => s.reviewDurationMinutes);
  const commitReview = useFocusStore((s) => s.commitReview);
  const discardReview = useFocusStore((s) => s.discardReview);
  const [editMinutes, setEditMinutes] = useState(reviewDurationMinutes);
  const editRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isReview) {
      setEditMinutes(reviewDurationMinutes);
      setTimeout(() => editRef.current?.select(), 100);
    }
  }, [isReview, reviewDurationMinutes]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = sessionDurationMs > 0 ? 1 - remainingMs / sessionDurationMs : 0;
  const isPaused = targetTimestamp === 0 && remainingMs > 0;

  /* Glassmorphism + conic gradient ring */
  const ringR = (BTN - 7) / 2;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - progress * ringC;

  const PANEL_W = 260;
  const panelBelow = position.y < 250;
  const panelLeftOffset = clamp(BTN / 2 - PANEL_W / 2, 8 - position.x, window.innerWidth - PANEL_W - 8 - position.x);

  return (
    <>
      {/* Outside click catcher */}
      {(menuOpen || panelOpen) && (
        <div className="fixed inset-0 z-[109]" onClick={() => { setMenuOpen(false); setPanelOpen(false); }} />
      )}

      {/* Review widget (post-session edit & commit) */}
      {isReview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          className="fixed z-[112] rounded-xl border border-emerald-400/50 bg-emerald-900/80 backdrop-blur-xl p-4 shadow-2xl"
          style={{
            left: clamp(position.x - 90, 8, window.innerWidth - 230),
            top: clamp(position.y - 10, 8, window.innerHeight - 210),
            width: 220,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300 mb-1">
            Session Complete
          </p>
          {sessionTitle && (
            <p className="text-[12px] text-paper font-medium truncate mb-3">{sessionTitle}</p>
          )}

          {/* Editable time input */}
          <div className="flex items-center justify-center mb-3">
            <input
              ref={editRef}
              type="number"
              min={1}
              max={480}
              value={editMinutes}
              onChange={(e) => setEditMinutes(Math.max(1, Math.min(480, Number(e.target.value) || 1)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitReview(editMinutes);
                if (e.key === "Escape") discardReview();
              }}
              className="w-20 bg-transparent text-center text-[32px] font-mono tabular-nums text-emerald-200 outline-none border-b border-emerald-400/30 focus:border-emerald-400/70 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[13px] font-mono text-emerald-400/70 ml-1">min</span>
          </div>

          {/* Commit / Discard buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => discardReview()}
              className="flex-1 rounded-lg text-[11px] text-emerald-300/60 hover:text-emerald-200 py-2 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => commitReview(editMinutes)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-ink-900 text-[11px] font-semibold py-2 hover:bg-emerald-400 transition-all animate-pulse"
            >
              <Check size={13} /> Commit
            </button>
          </div>
        </motion.div>
      )}

      {/* Break warning */}
      {showWarn && (
        <div className="fixed z-[111] pointer-events-none" style={{
          left: clamp(position.x - 168, 8, window.innerWidth - 196),
          top: position.y - 46,
        }}>
          <div className="rounded-lg border border-amber-500/50 bg-amber-600/20 backdrop-blur px-3 py-2 text-[11.5px] text-amber-400 shadow-panel whitespace-nowrap">
            90 min focused — time for a break!
          </div>
        </div>
      )}

      {/* Floating countdown chip */}
      {(isActive || isBreak) && !menuOpen && !isReview && !isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-[111] pointer-events-none"
          style={{ left: position.x - 4, top: position.y + BTN + 6 }}
        >
          <div className={clsx(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-mono tabular-nums shadow-panel backdrop-blur-sm",
            isActive ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-violet-500/40 bg-violet-500/10 text-violet-300",
          )}>
            {isPaused ? "PAUSED" : fmt(remainingSeconds)}
          </div>
        </motion.div>
      )}

      {/* Hide the Orb button during review — the review widget replaces it */}
      {!isReview && (
      <div className="fixed z-[110]" style={{ left: position.x, top: position.y, width: BTN, height: BTN }}>
        {/* Fan menu */}
        <AnimatePresence>
          {menuOpen && allFan.map((item, i) => {
            const angle = base + dir * ((span * i) / (n - 1));
            const rad = (angle * Math.PI) / 180;
            const ox = RADIUS * Math.cos(rad);
            const oy = -RADIUS * Math.sin(rad);
            const left = BTN / 2 + ox - ITEM / 2;
            const top = BTN / 2 + oy - ITEM / 2;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, scale: 0.3, left: BTN / 2 - ITEM / 2, top: BTN / 2 - ITEM / 2 }}
                animate={{ opacity: 1, scale: 1, left, top }}
                exit={{ opacity: 0, scale: 0.3, left: BTN / 2 - ITEM / 2, top: BTN / 2 - ITEM / 2 }}
                transition={{ duration: 0.2, delay: i * 0.035, ease: "easeOut" }}
                onClick={item.onClick}
                title={item.label}
                className={clsx("absolute flex items-center justify-center rounded-full transition-colors shadow-lg backdrop-blur-sm border border-white/10",
                  item.tone === "ember" && "bg-ember-500 text-ink-900 hover:bg-ember-400",
                  item.tone === "moss" && "bg-moss-500 text-ink-900 hover:bg-moss-400",
                  item.tone === "gold" && "bg-gold-500 text-ink-900 hover:bg-gold-400",
                  item.tone === "mist" && "bg-slate-700/80 text-mist-100 hover:bg-slate-600",
                )}
                style={{ width: ITEM, height: ITEM }}
              >
                <Icon size={19} strokeWidth={2.2} />
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Quick panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: panelBelow ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute w-[260px] rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl z-[112]"
              style={{
                left: panelLeftOffset,
                [panelBelow ? "top" : "bottom"]: BTN + 14,
              } as React.CSSProperties}
            >
              {/* Session info */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-mist-600">
                  {isActive && "FOCUS"}
                  {isBreak && "BREAK"}
                  {isIdle && "READY"}
                  {isCompleted && "DONE"}
                </span>
                <button onClick={() => setPanelOpen(false)} className="text-mist-600 hover:text-mist-200 transition-colors">
                  <X size={13} />
                </button>
              </div>

              {sessionTitle && (
                <p className="text-[13px] text-paper font-medium truncate mb-0.5">{sessionTitle}</p>
              )}
              {goalTitle && (
                <p className="text-[10px] text-mist-500 truncate mb-2 flex items-center gap-1">
                  <Target size={10} /> {goalTitle}
                </p>
              )}

              <div className="text-center mb-2">
                <p className={clsx(
                  "num font-display leading-none",
                  isBreak ? "text-[28px] text-violet-300" : "text-[32px] text-paper"
                )}>
                  {isCompleted ? "✓" : isPaused ? "⏸" : fmt(remainingSeconds)}
                </p>
                {isBreak && breakSuggestion && (
                  <p className="text-[11px] text-mist-500 mt-1 leading-snug">{breakSuggestion}</p>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-slate-700/60 overflow-hidden mb-3">
                <div className={clsx(
                  "h-full rounded-full transition-all duration-1000",
                  isActive ? "bg-gradient-to-r from-cyan-500 to-blue-500" : isBreak ? "bg-gradient-to-r from-violet-500 to-purple-500" : "bg-slate-600",
                )} style={{ width: `${progress * 100}%` }} />
              </div>

              {/* Phase-specific actions */}
              <div className="flex flex-col gap-1.5">
                {isIdle && !legacyBreakPending && (
                  <button onClick={handleStartFocus} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500/90 text-ink-900 font-medium px-3 py-2 text-[12px] hover:bg-cyan-400 transition-all">
                    <Play size={14} /> Start Focus · 25 min
                  </button>
                )}
                {(isActive || isPaused) && (
                  <div className="flex gap-1.5">
                    {isActive && !isPaused ? (
                      <button onClick={pause} className="flex-1 rounded-lg border border-slate-600 text-mist-100 text-[12px] py-2 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all">
                        Pause
                      </button>
                    ) : (
                      <button onClick={resume} className="flex-1 rounded-lg bg-cyan-500/90 text-ink-900 text-[12px] font-medium py-2 hover:bg-cyan-400 transition-all">
                        Resume
                      </button>
                    )}
                    <button onClick={() => { reset(); toast.show("Session reset."); }} className="rounded-lg border border-slate-600 text-mist-300 text-[12px] px-3 py-2 hover:border-red-500/50 hover:text-red-400 transition-all">
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}
                {legacyBreakPending && (
                  <div className="flex gap-1.5">
                    <button onClick={() => { legacyStartBreak(); setPanelOpen(false); }} className="flex-1 rounded-lg bg-violet-500/90 text-ink-900 font-medium text-[12px] py-2 hover:bg-violet-400 transition-all">
                      <Coffee size={13} className="inline mr-1" />Break
                    </button>
                    <button onClick={() => { legacySkipBreak(); }} className="rounded-lg border border-slate-600 text-mist-300 text-[12px] px-3 py-2 hover:bg-slate-700 transition-all">
                      <SkipForward size={13} />
                    </button>
                  </div>
                )}
                {isBreak && !legacyBreakPending && (
                  <button onClick={skipBreak} className="w-full rounded-lg border border-slate-600 text-mist-100 text-[12px] py-2 hover:border-slate-500 hover:bg-slate-800 transition-all">
                    <SkipForward size={13} className="inline mr-1" />Skip Break
                  </button>
                )}
              </div>

              {/* Stats footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-mist-600">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <Timer size={10} /> {pomodoroCount} pomodoros
                </span>
                <span className="tabular-nums flex items-center gap-1">
                  <Clock size={10} /> {todayFocusMinutes} min today
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Focus Orb button */}
        <motion.button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { clearLongPress(); setDragging(false); startRef.current = null; }}
          className={clsx(
            "relative rounded-full touch-none select-none",
            "flex items-center justify-center",
            dragging && "cursor-grabbing scale-105",
            !dragging && "cursor-grab",
          )}
          style={{ width: BTN, height: BTN }}
          whileTap={{ scale: 0.95 }}
          aria-label="Focus Orb"
        >
          {/* Glassmorphism background */}
          <div className={clsx(
            "absolute inset-0 rounded-full",
            "bg-white/[0.06] backdrop-blur-xl",
            "border border-white/[0.12]",
            isActive && "shadow-[0_0_40px_rgba(6,182,212,0.4)]",
            isBreak && "shadow-[0_0_40px_rgba(139,92,246,0.35)]",
            isCompleted && "shadow-[0_0_40px_rgba(16,185,129,0.4)]",
          )} />

          {/* Conic gradient border ring (SVG progress) */}
          <svg
            width={BTN}
            height={BTN}
            className="absolute inset-0 -rotate-90 pointer-events-none"
          >
            {(isActive || isBreak) && (
              <>
                {/* Track ring */}
                <circle
                  cx={BTN / 2}
                  cy={BTN / 2}
                  r={ringR}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={3}
                />
                {/* Progress ring with gradient */}
                <defs>
                  <linearGradient id="orb-progress-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={isActive ? "#06b6d4" : isBreak ? "#8b5cf6" : "#10b981"} />
                    <stop offset="100%" stopColor={isActive ? "#3b82f6" : isBreak ? "#a855f7" : "#34d399"} />
                  </linearGradient>
                </defs>
                <motion.circle
                  cx={BTN / 2}
                  cy={BTN / 2}
                  r={ringR}
                  fill="none"
                  stroke="url(#orb-progress-grad)"
                  strokeWidth={3}
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.9s linear" }}
                />
              </>
            )}
          </svg>

          {/* Rotating conic border when active (loading spinner effect) */}
          {isActive && (
            <motion.div
              className="absolute inset-[-2px] rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, transparent 30%, rgba(6,182,212,0.3) 50%, transparent 70%)",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Center icon */}
          <span className="relative z-10 flex items-center justify-center">
            {isBreak ? (
              <Coffee size={22} className="text-violet-200" strokeWidth={2.2} />
            ) : isActive ? (
              <Timer size={22} className="text-cyan-200" strokeWidth={2.2} />
            ) : isCompleted ? (
              <CheckCircle2 size={22} className="text-emerald-300" strokeWidth={2.2} />
            ) : (
              <Flame size={24} className="text-ember-300" strokeWidth={2.3} />
            )}
          </span>
        </motion.button>
      </div>
      )}
    </>
  );
}
