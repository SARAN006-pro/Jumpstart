import { useSyncExternalStore, useMemo } from "react";
import { useFocusStore } from "../store/focusOrb";

function subscribeToFocusStore(callback: () => void) {
  const unsub = useFocusStore.subscribe(callback);
  return unsub;
}

function getSnapshot() {
  const s = useFocusStore.getState();
  return {
    goalId: s.goalId,
    sessionElapsedMinutes: s.sessionElapsedMinutes,
    orbPhase: s.orbPhase,
  };
}

export function useGoalFueling(goalId: number) {
  const snapshot = useSyncExternalStore(subscribeToFocusStore, getSnapshot);

  const isActivelyFueling = snapshot.orbPhase === "active" && snapshot.goalId === goalId;

  return useMemo(() => ({
    isActivelyFueling,
    liveFuelMinutes: isActivelyFueling ? snapshot.sessionElapsedMinutes : 0,
  }), [isActivelyFueling, snapshot.sessionElapsedMinutes]);
}
