import { useCallback, useRef } from "react";
import { useFocusStore } from "../store/focusOrb";
import { api } from "../lib/api";
import { useToastStore } from "../store/toast";
import type { ScheduleSessionResponse, GoalResponse, TimerSessionResponse } from "../lib/types";

interface FocusSession {
  sessionId: number | null;
  sessionTitle: string;
  goalId: number | null;
  goalTitle: string;
  topicId: number | null;
}

export function useFocusSession() {
  const toast = useToastStore((s) => s.push);
  const bindSession = useFocusStore((s) => s.bindSession);
  const startFocus = useFocusStore((s) => s.startFocus);
  const complete = useFocusStore((s) => s.complete);
  const reset = useFocusStore((s) => s.reset);
  const sessionId = useFocusStore((s) => s.sessionId);
  const topicId = useFocusStore((s) => s.topicId);
  const goalId = useFocusStore((s) => s.goalId);
  const orbPhase = useFocusStore((s) => s.orbPhase);
  const sessionElapsedMinutes = useFocusStore((s) => s.sessionElapsedMinutes);
  const sessionDurationMs = useFocusStore((s) => s.sessionDurationMs);

  const latestRef = useRef<FocusSession>({ sessionId: null, sessionTitle: "", goalId: null, goalTitle: "", topicId: null });

  /**
   * Start a focus session. If sessionId is provided, binds to that session.
   * Otherwise auto-selects the current time block from schedule.
   */
  const beginFocus = useCallback(async (opts?: { sessionId?: number; goalId?: number; durationMs?: number }) => {
    const { sessionId: sid, goalId: gid, durationMs } = opts || {};

    if (sid) {
      try {
        const session = await api.get<ScheduleSessionResponse>(`/schedule/sessions/${sid}`);
        let linkedGoalTitle = "";
        if (gid) {
          try {
            const goal = await api.get<GoalResponse>(`/goals/${gid}`);
            linkedGoalTitle = goal.label;
          } catch { /* ignore */ }
        }
        latestRef.current = {
          sessionId: sid,
          sessionTitle: session.title,
          goalId: gid ?? null,
          goalTitle: linkedGoalTitle,
          topicId: session.topicId,
        };
        bindSession(sid, session.title, session.topicId, gid ?? null, linkedGoalTitle);
      } catch {
        toast("Failed to load session", { tone: "error" });
        return;
      }
    } else {
      // Auto-select session happening NOW
      try {
        const now = new Date();
        const start = new Date(now.getTime() - 60 * 60 * 1000);
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        const sessions = await api.get<ScheduleSessionResponse[]>(
          `/schedule/sessions?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        const current = sessions.find((s) => {
          const sStart = new Date(s.plannedStartTime);
          const sEnd = new Date(s.plannedEndTime);
          return sStart <= now && sEnd >= now && s.status === "PLANNED";
        });
        if (current) {
          latestRef.current = {
            sessionId: current.id,
            sessionTitle: current.title,
            goalId: null,
            goalTitle: "",
            topicId: current.topicId,
          };
          bindSession(current.id, current.title, current.topicId, null, "");
        } else {
          latestRef.current = { sessionId: null, sessionTitle: "Focus Session", goalId: null, goalTitle: "", topicId: null };
          bindSession(null as any, "Focus Session", null, null, "");
        }
      } catch {
        latestRef.current = { sessionId: null, sessionTitle: "Focus Session", goalId: null, goalTitle: "", topicId: null };
        bindSession(null as any, "Focus Session", null, null, "");
      }
    }

    startFocus(durationMs);
  }, [bindSession, startFocus, toast]);

  /**
   * Preview what the goal progress will be if the session completes now.
   */
  const previewGoalProgress = useCallback((): { projectedValue: number; targetValue: number } | null => {
    if (!goalId) return null;
    const elapsedMinutes = sessionElapsedMinutes;
    // Projected: current session time adds to goal progress
    return { projectedValue: elapsedMinutes, targetValue: 0 };
  }, [goalId, sessionElapsedMinutes]);

  /**
   * Complete the focus session: update ScheduleSession, bump Goal progress.
   */
  const completeFocusSession = useCallback(async (rating?: number, notes?: string) => {
    const { sessionId: sid } = latestRef.current;
    if (!sid) {
      complete();
      return;
    }

    try {
      const elapsedMs = sessionDurationMs;
      await api.patch(`/schedule/sessions/${sid}/timings`, {
        actualDuration: Math.round(elapsedMs / 1000 / 60),
        actualEndTime: new Date().toISOString(),
        rating: rating ?? null,
        notes: notes ?? null,
      });

      // Trigger goal engine
      try {
        await api.post(`/goals/engine/process-session?sessionId=${sid}`, {});
      } catch { /* engine may not be wired yet */ }
    } catch {
      toast("Failed to save session", { tone: "error" });
    }

    complete();
  }, [sessionDurationMs, complete, toast]);

  /**
   * Mark the current session as interrupted (partial focus)
   */
  const interruptFocusSession = useCallback(async () => {
    const { sessionId: sid } = latestRef.current;
    if (!sid) {
      reset();
      return;
    }
    try {
      const elapsedMs = sessionDurationMs - useFocusStore.getState().remainingMs;
      await api.patch(`/schedule/sessions/${sid}/timings`, {
        actualDuration: Math.round(elapsedMs / 1000 / 60),
        actualEndTime: new Date().toISOString(),
      });
    } catch { /* ignore */ }
    reset();
  }, [sessionDurationMs, reset]);

  return {
    beginFocus,
    previewGoalProgress,
    completeFocusSession,
    interruptFocusSession,
    isActive: orbPhase === "active",
    sessionId,
    topicId,
    goalId,
  };
}
