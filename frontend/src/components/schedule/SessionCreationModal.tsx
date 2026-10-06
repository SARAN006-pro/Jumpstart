import { useState, useEffect } from "react";
import { X, Plus, Minus, Loader2 } from "lucide-react";
import clsx from "clsx";
import { RRule, Frequency } from "rrule";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import { getLocalTimezone, localDateToUtcIso } from "../../lib/timezone";
import type { ScheduleSessionResponse, TopicResponse, PageResponse } from "../../lib/types";

interface SessionCreationModalProps {
  open: boolean;
  onClose: () => void;
  prefilledDate?: string;
  onCreated: () => void;
}

type RecurrenceType = "none" | "daily" | "weekly" | "custom";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SessionCreationModal({ open, onClose, prefilledDate, onCreated }: SessionCreationModalProps) {
  const toast = useToastStore((s) => s.push);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);
  const [date, setDate] = useState(() => {
    if (prefilledDate) return prefilledDate.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [recurrenceEnd, setRecurrenceEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (open) {
      api.get<PageResponse<TopicResponse>>("/topics?size=200").then((res) => setTopics(res.items)).catch(() => {});
    }
  }, [open]);

  function toggleCustomDay(idx: number) {
    setCustomDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  }

  function buildRruleString(): string | undefined {
    if (recurrence === "none") return undefined;
    const startDate = new Date(`${date}T${startTime}:00`);
    const until = new Date(`${recurrenceEnd}T23:59:59`);

    let freq: Frequency;
    let byweekday: number[] | undefined;

    switch (recurrence) {
      case "daily":
        freq = Frequency.DAILY;
        break;
      case "weekly":
        freq = Frequency.WEEKLY;
        byweekday = [startDate.getDay() === 0 ? 6 : startDate.getDay() - 1];
        break;
      case "custom":
        freq = Frequency.WEEKLY;
        byweekday = customDays;
        break;
      default:
        return undefined;
    }

    const rule = new RRule({
      freq,
      dtstart: startDate,
      until,
      byweekday,
    });
    return rule.toString();
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast("Enter a session title", { tone: "error" });
      return;
    }
    if (startTime >= endTime) {
      toast("End time must be after start time", { tone: "error" });
      return;
    }

    setLoading(true);
    try {
      const startDt = new Date(`${date}T${startTime}:00`);
      const endDt = new Date(`${date}T${endTime}:00`);

      await api.post<ScheduleSessionResponse>("/schedule/sessions", {
        title: title.trim(),
        topicId: topicId ?? undefined,
        plannedStartTime: localDateToUtcIso(startDt),
        plannedEndTime: localDateToUtcIso(endDt),
        timezone: getLocalTimezone(),
        recurrenceRule: buildRruleString(),
        notes: notes.trim() || undefined,
      });

      toast("Session created", { tone: "success" });
      onCreated();
      handleClose();
    } catch {
      toast("Failed to create session", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle("");
    setTopicId(null);
    setStartTime("09:00");
    setEndTime("10:00");
    setNotes("");
    setRecurrence("none");
    setCustomDays([1, 3, 5]);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-paper">New Study Session</h2>
          <button onClick={handleClose} className="text-mist-500 hover:text-mist-200">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. React Hooks Deep Dive"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50"
            />
          </div>

          <div>
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Topic</label>
            <select
              value={topicId ?? ""}
              onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50"
            >
              <option value="">No topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Timezone</label>
              <input value={getLocalTimezone()} disabled className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-[12px] text-mist-400 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Start time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">End time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
          </div>

          <div>
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Recurrence</label>
            <div className="flex gap-2">
              {(["none", "daily", "weekly", "custom"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRecurrence(r)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                    recurrence === r ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:text-mist-200"
                  )}
                >
                  {r === "none" ? "Once" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {recurrence === "custom" && (
            <>
              <div>
                <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Repeat on</label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => toggleCustomDay(i)}
                      className={clsx(
                        "w-9 h-9 rounded-lg text-[10px] font-medium border transition-colors",
                        customDays.includes(i) ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500"
                      )}
                    >
                      {name[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Repeat until</label>
                <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
              </div>
            </>
          )}

          <div>
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="flex-1 rounded-lg bg-ember-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-ember-400 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Creating..." : "Create Session"}
          </button>
          <button onClick={handleClose} className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
