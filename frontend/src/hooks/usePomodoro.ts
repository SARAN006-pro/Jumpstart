import { useReducer, useEffect, useCallback, useRef, type Reducer } from "react";

type PomodoroPhase = "idle" | "running" | "paused" | "break" | "completed";

interface PomodoroState {
  phase: PomodoroPhase;
  targetTimestamp: number;
  remainingMs: number;
  sessionDurationMs: number;
  pomodoroCount: number;
  breakSuggestion: string;
}

type PomodoroAction =
  | { type: "START"; durationMs: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "TICK"; now: number }
  | { type: "COMPLETE" }
  | { type: "START_BREAK"; durationMs: number }
  | { type: "SKIP_BREAK" }
  | { type: "RESET" };

const BREAK_SUGGESTIONS = [
  "Stand up and stretch your arms, neck and back.",
  "Look 20 feet away for 20 seconds — the 20-20-20 rule.",
  "Drink a glass of water and refill your bottle.",
  "Take 5 deep breaths: in through nose, out through mouth.",
  "Walk around the room for a minute or two.",
  "Close your eyes for 30 seconds and let them rest.",
];

function randomSuggestion(): string {
  return BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
}

const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const LONG_BREAK_MS = 15 * 60 * 1000;
const POMOS_BEFORE_LONG = 4;

function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case "START": {
      const now = Date.now();
      return {
        ...state,
        phase: "running",
        targetTimestamp: now + action.durationMs,
        remainingMs: action.durationMs,
        sessionDurationMs: action.durationMs,
      };
    }
    case "PAUSE": {
      if (state.phase !== "running") return state;
      const remaining = state.targetTimestamp - Date.now();
      return { ...state, phase: "paused", remainingMs: Math.max(0, remaining) };
    }
    case "RESUME": {
      if (state.phase !== "paused") return state;
      return {
        ...state,
        phase: "running",
        targetTimestamp: Date.now() + state.remainingMs,
      };
    }
    case "TICK": {
      if (state.phase !== "running") return state;
      const remaining = state.targetTimestamp - action.now;
      if (remaining <= 0) {
        return { ...state, remainingMs: 0, phase: "completed" };
      }
      return { ...state, remainingMs: remaining };
    }
    case "COMPLETE": {
      return { ...state, phase: "completed", remainingMs: 0 };
    }
    case "START_BREAK": {
      const isLongBreak = (state.pomodoroCount + 1) % POMOS_BEFORE_LONG === 0;
      const breakDuration = isLongBreak ? LONG_BREAK_MS : action.durationMs;
      return {
        ...state,
        phase: "break",
        pomodoroCount: state.pomodoroCount + 1,
        targetTimestamp: Date.now() + breakDuration,
        remainingMs: breakDuration,
        sessionDurationMs: breakDuration,
        breakSuggestion: randomSuggestion(),
      };
    }
    case "SKIP_BREAK": {
      return { ...state, phase: "idle", remainingMs: 0, breakSuggestion: randomSuggestion() };
    }
    case "RESET": {
      return { ...initialState, breakSuggestion: randomSuggestion() };
    }
    default:
      return state;
  }
}

const initialState: PomodoroState = {
  phase: "idle",
  targetTimestamp: 0,
  remainingMs: 0,
  sessionDurationMs: 0,
  pomodoroCount: 0,
  breakSuggestion: randomSuggestion(),
};

export interface UsePomodoroReturn {
  phase: PomodoroPhase;
  remainingMs: number;
  remainingSeconds: number;
  pomodoroCount: number;
  breakSuggestion: string;
  isRunning: boolean;
  isBreak: boolean;
  progress: number;
  start: (durationMs?: number) => void;
  pause: () => void;
  resume: () => void;
  skipBreak: () => void;
  reset: () => void;
}

export function usePomodoro(onComplete?: () => void): UsePomodoroReturn {
  const [state, dispatch] = useReducer<Reducer<PomodoroState, PomodoroAction>>(pomodoroReducer, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tick = useCallback(() => {
    dispatch({ type: "TICK", now: Date.now() });
  }, []);

  useEffect(() => {
    if (state.phase === "running") {
      intervalRef.current = setInterval(tick, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.phase, tick]);

  useEffect(() => {
    if (state.phase === "completed") {
      const elapsed = state.sessionDurationMs - state.remainingMs;
      if (elapsed >= state.sessionDurationMs) {
        onCompleteRef.current?.();
      }
      const breakDuration = (state.pomodoroCount + 1) % POMOS_BEFORE_LONG === 0
        ? LONG_BREAK_MS : BREAK_MS;
      dispatch({ type: "START_BREAK", durationMs: breakDuration });
    }
  }, [state.phase, state.pomodoroCount, state.remainingMs, state.sessionDurationMs]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && state.phase === "running") {
        dispatch({ type: "TICK", now: Date.now() });
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.phase]);

  function playBeep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Web Audio API not available
    }
  }

  useEffect(() => {
    if (state.phase === "completed") {
      playBeep();
    }
  }, [state.phase]);

  const start = useCallback((durationMs = FOCUS_MS) => {
    dispatch({ type: "START", durationMs });
  }, []);

  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const skipBreak = useCallback(() => dispatch({ type: "SKIP_BREAK" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    phase: state.phase,
    remainingMs: state.remainingMs,
    remainingSeconds: Math.ceil(state.remainingMs / 1000),
    pomodoroCount: state.pomodoroCount,
    breakSuggestion: state.breakSuggestion,
    isRunning: state.phase === "running",
    isBreak: state.phase === "break",
    progress: state.sessionDurationMs > 0
      ? 1 - state.remainingMs / state.sessionDurationMs
      : 0,
    start,
    pause,
    resume,
    skipBreak,
    reset,
  };
}
