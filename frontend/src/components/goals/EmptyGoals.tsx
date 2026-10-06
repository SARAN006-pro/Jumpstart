import { Plus } from "lucide-react";

interface EmptyGoalsProps {
  onCreateClick: () => void;
}

export default function EmptyGoals({ onCreateClick }: EmptyGoalsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="mb-6 opacity-60">
        <defs>
          <linearGradient id="mountain-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>
        {/* Mountain */}
        <path d="M10 95 L40 35 L55 55 L70 25 L110 95 Z" fill="url(#mountain-grad)" stroke="#475569" strokeWidth="1.5" />
        {/* Snow cap */}
        <path d="M65 28 L70 25 L75 30 L72 28 L70 32 L68 28 L65 30 Z" fill="#475569" />
        {/* Flag */}
        <line x1="70" y1="25" x2="70" y2="12" stroke="#475569" strokeWidth="1.5" />
        <path d="M70 12 L82 16 L70 20 Z" fill="#f59e0b" opacity="0.6" />
        {/* Ground */}
        <rect x="0" y="95" width="120" height="25" fill="#0f172a" />
        {/* Small dots representing path */}
        <circle cx="40" cy="75" r="1.5" fill="#475569" opacity="0.5" />
        <circle cx="50" cy="65" r="1.5" fill="#475569" opacity="0.5" />
        <circle cx="60" cy="55" r="1.5" fill="#475569" opacity="0.5" />
      </svg>
      <h3 className="text-[15px] font-semibold text-paper mb-1">Ready to set your sights higher?</h3>
      <p className="text-[12px] text-mist-500 mb-5 max-w-[280px]">
        Create your first objective. Set daily, weekly, monthly, or long-term goals to track your learning journey.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 text-[13px] text-emerald-400 font-medium hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
      >
        <Plus size={15} /> Create Goal
      </button>
    </div>
  );
}
