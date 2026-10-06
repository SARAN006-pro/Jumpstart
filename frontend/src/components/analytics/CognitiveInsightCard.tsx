import { motion } from "framer-motion";
import clsx from "clsx";

interface CognitiveInsightCardProps {
  label: string;
  items: string[];
  tone: "emerald" | "amber" | "violet";
  icon: React.ReactNode;
}

export default function CognitiveInsightCard({ label, items, tone, icon }: CognitiveInsightCardProps) {
  const borderColor = tone === "emerald" ? "from-emerald-500 to-cyan-500"
    : tone === "amber" ? "from-amber-500 to-orange-500"
    : "from-violet-500 to-cyan-500";

  return (
    <div className={`bg-gradient-to-r ${borderColor} p-[1px] rounded-xl overflow-hidden`}>
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl p-4 h-full">
        <div className="flex items-center gap-2 mb-2">
          <span className={clsx(
            tone === "emerald" && "text-emerald-400",
            tone === "amber" && "text-amber-400",
            tone === "violet" && "text-violet-400",
          )}>
            {icon}
          </span>
          <span className={clsx(
            "text-[10px] font-bold uppercase tracking-[0.15em]",
            tone === "emerald" && "text-emerald-300",
            tone === "amber" && "text-amber-300",
            tone === "violet" && "text-violet-300",
          )}>
            {label}
          </span>
        </div>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.35 }}
              className="text-[12px] text-mist-200 leading-relaxed flex items-start gap-1.5"
            >
              <span className={clsx(
                "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                tone === "emerald" && "bg-emerald-400",
                tone === "amber" && "bg-amber-400",
                tone === "violet" && "bg-violet-400",
              )} />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
