import { Coffee, Plus } from "lucide-react";

interface EmptyScheduleProps {
  onCreateClick: () => void;
}

export default function EmptySchedule({ onCreateClick }: EmptyScheduleProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="mb-6 opacity-60">
        <defs>
          <linearGradient id="coffee-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        {/* Desk */}
        <rect x="10" y="80" width="100" height="4" rx="2" fill="#334155" />
        {/* Coffee cup body */}
        <path d="M40 45 L42 75 L78 75 L80 45 Z" fill="url(#coffee-grad)" stroke="#475569" strokeWidth="1.5" />
        {/* Handle */}
        <path d="M80 52 Q92 52 92 60 Q92 68 80 68" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        {/* Steam */}
        <path d="M50 40 Q53 32 50 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
          <animate attributeName="d" values="M50 40 Q53 32 50 24;M50 40 Q47 32 50 24;M50 40 Q53 32 50 24" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M60 38 Q63 30 60 22" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
          <animate attributeName="d" values="M60 38 Q63 30 60 22;M60 38 Q57 30 60 22;M60 38 Q63 30 60 22" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Book */}
        <rect x="18" y="55" width="20" height="25" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="20" y="58" width="16" height="2" rx="1" fill="#334155" />
        <rect x="20" y="63" width="12" height="2" rx="1" fill="#334155" />
      </svg>
      <h3 className="text-[15px] font-semibold text-paper mb-1">Clear skies ahead</h3>
      <p className="text-[12px] text-mist-500 mb-5 max-w-[240px]">
        Plan your next focus session. Click a date or time on the calendar to create a study block.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-5 py-2.5 text-[13px] text-cyan-400 font-medium hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
      >
        <Plus size={15} /> Create Session
      </button>
    </div>
  );
}
