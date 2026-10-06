import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Edit3, X, Target } from "lucide-react";
import clsx from "clsx";

interface FocusConfirmModalProps {
  open: boolean;
  taskTitle: string;
  estimatedMinutes: number;
  goalTitle?: string | null;
  difficulty?: string;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
}

export default function FocusConfirmModal({
  open, taskTitle, estimatedMinutes, goalTitle, difficulty, onConfirm, onCancel,
}: FocusConfirmModalProps) {
  const [minutes, setMinutes] = useState(estimatedMinutes);
  const [editing, setEditing] = useState(false);

  const presets = [15, 25, 30, 45, 60, 90];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-paper">Ready to Focus</h3>
                <p className="text-[12px] text-mist-500 mt-1">{taskTitle}</p>
              </div>
              <button onClick={onCancel} className="text-mist-600 hover:text-mist-200">
                <X size={16} />
              </button>
            </div>

            {goalTitle && (
              <div className="flex items-center gap-1.5 text-[11px] text-mist-500 mb-3 bg-slate-800/50 rounded-lg px-3 py-1.5">
                <Target size={12} className="text-cyan-400" /> Linked to: {goalTitle}
              </div>
            )}

            {difficulty && (
              <div className="flex items-center gap-2 mb-4">
                <span className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-md border font-medium",
                  difficulty === "BEGINNER" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  difficulty === "INTERMEDIATE" && "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  difficulty === "ADVANCED" && "text-red-400 bg-red-500/10 border-red-500/20",
                )}>
                  {difficulty}
                </span>
              </div>
            )}

            {/* Time selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-mist-500 font-medium">Duration</span>
                <button
                  onClick={() => setEditing(!editing)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Edit3 size={10} /> {editing ? "Done" : "Custom"}
                </button>
              </div>

              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))}
                    min={1}
                    max={480}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-[20px] font-display text-paper text-center outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-[12px] text-mist-500">min</span>
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => setMinutes(p)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                        minutes === p
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                          : "border-slate-700 text-mist-500 hover:border-slate-600 hover:text-mist-200",
                      )}
                    >
                      {p} min
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
              <Clock size={13} className="text-cyan-400" />
              <span className="text-[12px] text-mist-400">
                <strong className="text-paper">{minutes}</strong> minute focus session
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(minutes)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-cyan-400 transition-all"
              >
                <Play size={15} /> Start {minutes} min
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

