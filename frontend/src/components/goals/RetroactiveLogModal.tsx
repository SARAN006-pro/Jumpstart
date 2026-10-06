import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { GoalResponse } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
  goals: GoalResponse[];
}

export default function RetroactiveLogModal({ open, onClose, onLogged, goals }: Props) {
  const toast = useToastStore((s) => s.push);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!goalId || !minutes) return;
    setSaving(true);
    try {
      await api.post("/goals/retroactive", {
        goalId,
        durationMinutes: parseFloat(minutes),
        date,
        notes: notes || undefined,
      });
      toast("Time logged retroactively", { tone: "success" });
      onLogged();
      setGoalId(null);
      setMinutes("");
      setNotes("");
    } catch {
      toast("Failed to log time", { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  const activeGoals = goals.filter((g) => !g.complete && !g.locked);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className="text-amber-400" />
                <h2 className="text-[15px] font-semibold text-paper">Log Time Retroactively</h2>
              </div>
              <button onClick={onClose} className="text-mist-500 hover:text-mist-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-mist-400 mb-1">Goal</label>
                <select
                  value={goalId ?? ""}
                  onChange={(e) => setGoalId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-[13px] text-paper px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select a goal...</option>
                  {activeGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-mist-400 mb-1">
                  <Clock size={12} className="inline mr-1" />Minutes
                </label>
                <input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-[13px] text-paper px-3 py-2 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-mist-400 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-[13px] text-paper px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-mist-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you work on?"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-[13px] text-paper px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-700 text-mist-300 px-4 py-2 text-[12px] font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!goalId || !minutes || saving}
                className={clsx(
                  "flex-1 rounded-lg px-4 py-2 text-[12px] font-medium transition-colors",
                  saving
                    ? "bg-amber-500/30 text-amber-300 cursor-not-allowed"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                )}
              >
                {saving ? "Saving..." : "Log Time"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
