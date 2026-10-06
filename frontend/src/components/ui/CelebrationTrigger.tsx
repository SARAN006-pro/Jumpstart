import { useCallback, useRef, type ReactNode } from "react";

interface CelebrationTriggerProps {
  children: ReactNode;
  accentColor?: "cyan" | "emerald" | "amber";
  onTrigger?: () => void;
}

const COLORS: Record<string, string[]> = {
  cyan: ["#06b6d4", "#22d3ee", "#67e8f9"],
  emerald: ["#10b981", "#34d399", "#6ee7b7"],
  amber: ["#f59e0b", "#fbbf24", "#fcd34d"],
};

export default function CelebrationTrigger({ children, accentColor = "cyan", onTrigger }: CelebrationTriggerProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async () => {
    onTrigger?.();

    try {
      const confetti = (await import("canvas-confetti")).default;
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      const colors = COLORS[accentColor] || COLORS.cyan;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x, y },
        colors,
        shapes: ["circle", "square"],
        gravity: 1.2,
        ticks: 200,
      });
    } catch {
      // canvas-confetti not available
    }
  }, [accentColor, onTrigger]);

  return (
    <div ref={buttonRef} onClick={handleClick} className="inline-block cursor-pointer">
      {children}
    </div>
  );
}
