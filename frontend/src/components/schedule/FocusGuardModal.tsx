import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface FocusGuardModalProps {
  open: boolean;
  currentSession: string;
  newSession: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FocusGuardModal({ open, currentSession, newSession, onConfirm, onCancel }: FocusGuardModalProps) {
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
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-amber-500/10 p-2 shrink-0 mt-0.5">
                <AlertTriangle size={18} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-paper">Switch Context?</h3>
                <p className="text-[12px] text-mist-500 mt-1 leading-relaxed">
                  You're currently focused on <strong className="text-mist-200">{currentSession}</strong>.
                  Do you want to abandon it and start <strong className="text-mist-200">{newSession}</strong>?
                </p>
              </div>
              <button onClick={onCancel} className="text-mist-600 hover:text-mist-200 shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-800/60 rounded-lg px-3 py-2 mb-4">
              <p className="text-[11px] text-amber-400">Current progress will be saved before switching.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700 transition-colors"
              >
                Keep Current
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-lg bg-amber-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-amber-400 transition-colors"
              >
                Switch
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
