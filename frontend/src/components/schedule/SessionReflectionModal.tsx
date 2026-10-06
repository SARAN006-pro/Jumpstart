import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send } from "lucide-react";
import clsx from "clsx";

interface SessionReflectionModalProps {
  open: boolean;
  sessionTitle: string;
  onSubmit: (rating: number, notes: string) => void;
}

const RATING_LABELS = ["", "Struggled", "Tough", "Okay", "Good", "Excellent"];

export default function SessionReflectionModal({ open, sessionTitle, onSubmit }: SessionReflectionModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    if (rating === 0) return;
    onSubmit(rating, notes);
    setRating(0);
    setNotes("");
  }

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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-paper">Session Complete</h3>
              <span className="text-[11px] text-mist-500 truncate max-w-[160px]">{sessionTitle}</span>
            </div>

            {/* Rating */}
            <p className="text-[12px] text-mist-500 mb-2">How was your focus?</p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-center transition-all",
                    (hoverRating || rating) >= n
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-slate-800 text-mist-600 hover:text-mist-400",
                  )}
                >
                  <Star size={16} className={clsx(
                    "mx-auto",
                    (hoverRating || rating) >= n ? "fill-amber-400" : ""
                  )} />
                  <span className="block text-[9px] mt-0.5">{RATING_LABELS[n]}</span>
                </button>
              ))}
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What worked? What distracted you? (optional)"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-[12px] text-paper placeholder:text-mist-600 outline-none focus:border-cyan-500/50 resize-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setNotes("")}
                className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-cyan-400 disabled:opacity-40 transition-colors"
              >
                <Send size={14} /> Submit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
