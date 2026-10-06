import { motion } from "framer-motion";
import clsx from "clsx";

interface StreakBadgeProps {
  count: number;
  size?: "sm" | "md";
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-yellow-400">
      <path d="M12 2L15 9L22 9L16.5 14L18.5 21L12 16.5L5.5 21L7.5 14L2 9L9 9L12 2Z" fill="currentColor" />
    </svg>
  );
}

function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="text-orange-500"
      animate={{ scale: [1, 1.08, 1], filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M12 23C15.866 23 19 19.866 19 16C19 12 15.5 9 12 2C8.5 9 5 12 5 16C5 19.866 8.134 23 12 23Z"
        fill="currentColor"
      />
      <path
        d="M12 20C14.209 20 16 18.209 16 16C16 13.5 14 11.5 12 8C10 11.5 8 13.5 8 16C8 18.209 9.791 20 12 20Z"
        fill="#fef08a"
        opacity="0.6"
      />
    </motion.svg>
  );
}

export default function StreakBadge({ count, size = "md" }: StreakBadgeProps) {
  if (count <= 0) return null;

  const textSize = size === "sm" ? "text-[10px]" : "text-[12px]";

  if (count < 7) {
    return (
      <div className="flex items-center gap-1">
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <SparkIcon size={size === "sm" ? 12 : 14} />
        </motion.div>
        <span className={clsx("font-mono font-bold tabular-nums text-yellow-400", textSize)}>{count}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <FlameIcon size={size === "sm" ? 16 : 20} />
      <span className={clsx("font-mono font-bold tabular-nums text-orange-400", textSize)}>{count}</span>
    </div>
  );
}
