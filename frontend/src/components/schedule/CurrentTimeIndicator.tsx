import { useEffect, useState } from "react";

export default function CurrentTimeIndicator() {
  const [top, setTop] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (hours < 6 || hours >= 22) {
        setVisible(false);
        return;
      }
      setVisible(true);
      // 6:00 = 0%, 22:00 = 100% (slotMinTime=06:00, slotMaxTime=22:00)
      const totalSlots = 16 * 60; // 16 hours * 60 min
      const elapsed = (hours - 6) * 60 + minutes;
      const pct = (elapsed / totalSlots) * 100;
      setTop(pct);
    }

    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}%` }}
    >
      <div className="relative flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse -ml-1.5 z-10" />
        <div className="flex-1 h-px bg-red-500/60 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
      </div>
    </div>
  );
}
