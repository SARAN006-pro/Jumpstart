import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export type FocusOrbPhase = "idle" | "active" | "break" | "review" | "completed";

interface FocusState {
  /* Orb UI state */
  orbPhase: FocusOrbPhase;
  orbExpanded: boolean;
  position: { x: number; y: number };

  /* Active session binding */
  sessionId: number | null;
  sessionTitle: string;
  goalId: number | null;
  goalTitle: string;
  topicId: number | null;

  /* Timer state (drift-free targetTimestamp model) */
  targetTimestamp: number;
  remainingMs: number;
  sessionDurationMs: number;
  pomodoroCount: number;
  breakSuggestion: string;
  sessionElapsedMinutes: number;

  /* Review state (post-session edit & commit) */
  reviewDurationMinutes: number;

  /* Actions */
  setPosition: (pos: { x: number; y: number }) => void;
  setOrbExpanded: (open: boolean) => void;
  bindSession: (sessionId: number, title: string, topicId: number | null, goalId: number | null, goalTitle: string) => void;
  startFocus: (durationMs?: number) => void;
  pause: () => void;
  resume: () => void;
  tick: () => void;
  complete: () => void;
  commitReview: (editedMinutes: number) => Promise<void>;
  discardReview: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  reset: () => void;
  setBreakSuggestion: (s: string) => void;
}

const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const LONG_BREAK_MS = 15 * 60 * 1000;
const POMOS_BEFORE_LONG = 4;

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

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

const POS_KEY = "focus_orb_position";

function loadPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* ignore */ }
  return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      orbPhase: "idle",
      orbExpanded: false,
      position: loadPos(),
      sessionId: null,
      sessionTitle: "",
      goalId: null,
      goalTitle: "",
      topicId: null,
      targetTimestamp: 0,
      remainingMs: 0,
      sessionDurationMs: 0,
      pomodoroCount: 0,
      breakSuggestion: randomSuggestion(),
      sessionElapsedMinutes: 0,
      reviewDurationMinutes: 0,

      setPosition: (pos) => {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
        set({ position: pos });
      },

      setOrbExpanded: (open) => set({ orbExpanded: open }),

      bindSession: (sessionId, title, topicId, goalId, goalTitle) =>
        set({ sessionId, sessionTitle: title, topicId, goalId, goalTitle }),

      startFocus: (durationMs = FOCUS_MS) => {
        const now = Date.now();
        set({
          orbPhase: "active",
          targetTimestamp: now + durationMs,
          remainingMs: durationMs,
          sessionDurationMs: durationMs,
          sessionElapsedMinutes: 0,
        });
      },

      pause: () => {
        const { orbPhase, targetTimestamp } = get();
        if (orbPhase !== "active") return;
        set({ remainingMs: Math.max(0, targetTimestamp - Date.now()), targetTimestamp: 0 });
      },

      resume: () => {
        const { remainingMs } = get();
        if (remainingMs <= 0) return;
        set({ targetTimestamp: Date.now() + remainingMs });
      },

      tick: () => {
        const { orbPhase, targetTimestamp, sessionDurationMs } = get();
        if (orbPhase !== "active") return;
        const remaining = targetTimestamp - Date.now();
        if (remaining <= 0) {
          const newCount = get().pomodoroCount + 1;
          const reviewMin = Math.round(sessionDurationMs / 60000);
          set({
            remainingMs: 0,
            pomodoroCount: newCount,
            orbPhase: "review",
            reviewDurationMinutes: reviewMin,
          });
        } else {
          const elapsed = Math.floor((sessionDurationMs - remaining) / 60000);
          set({ remainingMs: remaining, sessionElapsedMinutes: elapsed });
        }
      },

      complete: () => {
        const newCount = get().pomodoroCount + 1;
        const sessionDurationMs = get().sessionDurationMs;
        const reviewMin = Math.round(sessionDurationMs / 60000);
        set({
          remainingMs: 0,
          pomodoroCount: newCount,
          orbPhase: "review",
          reviewDurationMinutes: reviewMin,
        });
      },

      commitReview: async (editedMinutes) => {
        const { sessionId } = get();
        if (sessionId) {
          try {
            await api.patch(`/schedule/sessions/${sessionId}/timings`, {
              actualDuration: editedMinutes,
              actualEndTime: new Date().toISOString(),
            });
            try {
              await api.post(`/goals/engine/process-session?sessionId=${sessionId}`, {});
            } catch { /* engine may not be wired yet */ }
          } catch { /* best-effort */ }
        }
        set({ orbPhase: "completed", reviewDurationMinutes: editedMinutes });
      },

      discardReview: () => {
        set({ orbPhase: "completed" });
      },

      startBreak: () => {
        const count = get().pomodoroCount;
        const isLong = count % POMOS_BEFORE_LONG === 0;
        const breakMs = isLong ? LONG_BREAK_MS : BREAK_MS;
        set({
          orbPhase: "break",
          targetTimestamp: Date.now() + breakMs,
          remainingMs: breakMs,
          sessionDurationMs: breakMs,
          breakSuggestion: randomSuggestion(),
        });
      },

      skipBreak: () => {
        set({ orbPhase: "idle", remainingMs: 0, breakSuggestion: randomSuggestion() });
      },

      reset: () => {
        set({
          orbPhase: "idle",
          targetTimestamp: 0,
          remainingMs: 0,
          sessionDurationMs: 0,
          sessionElapsedMinutes: 0,
          reviewDurationMinutes: 0,
          sessionId: null,
          sessionTitle: "",
          goalId: null,
          goalTitle: "",
          topicId: null,
          breakSuggestion: randomSuggestion(),
        });
      },

      setBreakSuggestion: (s) => set({ breakSuggestion: s }),
    }),
    {
      name: "jumpstart_focus_orb",
      partialize: (s) => ({
        pomodoroCount: s.pomodoroCount,
        position: s.position,
      }),
    },
  ),
);
