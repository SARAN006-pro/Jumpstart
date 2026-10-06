import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Loader2, Target, Clock, BookOpen, FolderGit2 } from "lucide-react";
import clsx from "clsx";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { GoalResponse, RoadmapResponse, PageResponse } from "../../lib/types";

interface SmartGoalWizardProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const METRICS = [
  { value: "HOURS", label: "Study Hours", icon: Clock, desc: "Track hours spent studying" },
  { value: "TOPICS", label: "Topics", icon: BookOpen, desc: "Count completed topics" },
  { value: "PROJECTS", label: "Projects", icon: FolderGit2, desc: "Track project completions" },
  { value: "CUSTOM", label: "Custom", icon: Target, desc: "Set your own metric" },
] as const;

const CADENCE_LABELS: Record<string, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", LONGTERM: "Long-term",
};

export default function SmartGoalWizard({ open, onClose, onSaved }: SmartGoalWizardProps) {
  const toast = useToastStore((s) => s.push);
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState("DAILY");
  const [metricType, setMetricType] = useState("HOURS");
  const [targetValue, setTargetValue] = useState(10);
  const [trackingType, setTrackingType] = useState("MANUAL");
  const [roadmapId, setRoadmapId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setTitle("");
      setDescription("");
      setCadence("DAILY");
      setMetricType("HOURS");
      setTargetValue(10);
      setTrackingType("MANUAL");
      setRoadmapId(null);
      api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100").then((r) => setRoadmaps(r.items)).catch(() => {});
    }
  }, [open]);

  function canProceed(): boolean {
    switch (step) {
      case 1: return title.trim().length > 0;
      case 2: return targetValue > 0;
      case 3: return true;
      case 4: return deadline.length > 0;
      default: return false;
    }
  }

  function getTargetLabel(): string {
    switch (metricType) {
      case "HOURS": return "Target hours";
      case "TOPICS": return "Number of topics";
      case "PROJECTS": return "Number of projects";
      default: return "Target value";
    }
  }

  function getTargetPlaceholder(): string {
    switch (metricType) {
      case "HOURS": return "e.g. 40";
      case "TOPICS": return "e.g. 12";
      case "PROJECTS": return "e.g. 3";
      default: return "e.g. 100";
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await api.post<GoalResponse>("/goals", {
        label: title.trim(),
        description: description.trim() || undefined,
        cadence,
        targetValue,
        progressValue: 0,
        unit: metricType === "HOURS" ? "hours" : metricType === "TOPICS" ? "topics" : metricType === "PROJECTS" ? "projects" : undefined,
        metricType,
        trackingType,
        dueDate: cadence !== "LONGTERM" ? undefined : deadline,
        roadmapId: roadmapId ?? undefined,
      });
      toast("Goal created!", { tone: "success" });
      onSaved();
      onClose();
    } catch {
      toast("Failed to create goal", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
  }

  if (!open) return null;

  const stepTitles = ["Type & Name", "Metric", "Tracking", "Deadline"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-paper">New Goal</h2>
            <div className="flex items-center gap-1.5 mt-2">
              {([1, 2, 3, 4] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                    step === s ? "bg-ember-500 text-ink-900" : step > s ? "bg-moss-500 text-ink-900" : "bg-slate-700 text-mist-500"
                  )}>{step > s ? "✓" : s}</div>
                  <span className={clsx("text-[10px] hidden sm:inline", step === s ? "text-ember-400" : "text-mist-600")}>
                    {stepTitles[s - 1]}
                  </span>
                  {s < 4 && <div className="w-4 h-px bg-slate-700" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleClose} className="text-mist-500 hover:text-mist-200"><X size={16} /></button>
        </div>

        {/* Step 1: Type & Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Goal title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete React Nanodegree" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this goal involve?" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50 resize-none" />
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CADENCE_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => setCadence(key)} className={clsx(
                    "px-4 py-2.5 rounded-lg text-[12px] font-medium border text-left transition-colors",
                    cadence === key ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:border-slate-600"
                  )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Metric */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">What are you measuring?</label>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.value} onClick={() => setMetricType(m.value)} className={clsx(
                    "px-4 py-3 rounded-lg text-left border transition-colors",
                    metricType === m.value ? "bg-ember-500/10 border-ember-500/40" : "border-slate-700 hover:border-slate-600"
                  )}>
                    <Icon size={16} className={clsx("mb-1", metricType === m.value ? "text-ember-400" : "text-mist-500")} />
                    <p className={clsx("text-[12px] font-medium", metricType === m.value ? "text-ember-300" : "text-mist-300")}>{m.label}</p>
                    <p className="text-[10px] text-mist-600">{m.desc}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">{getTargetLabel()} *</label>
              <input type="range" min={1} max={metricType === "HOURS" ? 200 : metricType === "TOPICS" ? 100 : 50} value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} className="w-full accent-ember-500" />
              <div className="flex items-center justify-between mt-1">
                <input type="number" value={targetValue} onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value)))} className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[13px] text-paper outline-none text-center font-mono focus:border-ember-500/50" />
                <span className="text-[11px] text-mist-500">{getTargetPlaceholder()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tracking */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Tracking method</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "MANUAL", label: "Manual check-in", desc: "I'll log progress myself" }, { value: "AUTOMATIC", label: "Auto-tracked", desc: "Progress syncs from sessions" }].map((t) => (
                  <button key={t.value} onClick={() => setTrackingType(t.value)} className={clsx(
                    "px-4 py-3 rounded-lg text-left border transition-colors",
                    trackingType === t.value ? "bg-ember-500/10 border-ember-500/40" : "border-slate-700 hover:border-slate-600"
                  )}>
                    <p className={clsx("text-[12px] font-medium", trackingType === t.value ? "text-ember-300" : "text-mist-300")}>{t.label}</p>
                    <p className="text-[10px] text-mist-600">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Link to Roadmap (optional)</label>
              <select value={roadmapId ?? ""} onChange={(e) => setRoadmapId(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50">
                <option value="">No roadmap</option>
                {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              {trackingType === "AUTOMATIC" && (
                <p className="text-[11px] text-mist-600 mt-2">Auto-tracked goals sync progress from completed study sessions matching this roadmap.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Deadline */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
            {cadence === "LONGTERM" && (
              <div className="rounded-lg border border-ember-500/20 bg-ember-500/5 px-4 py-3">
                <p className="text-[12px] text-amber-400 font-medium">Milestones will be auto-generated</p>
                <p className="text-[11px] text-mist-500 mt-1">25%, 50%, 75%, and 100% milestones are created automatically for long-term goals.</p>
              </div>
            )}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h4 className="text-[12px] font-semibold text-paper mb-2">Summary</h4>
              <div className="text-[11px] text-mist-400 space-y-1">
                <p><span className="text-mist-500">Goal:</span> {title}</p>
                <p><span className="text-mist-500">Type:</span> {CADENCE_LABELS[cadence]} &middot; {METRICS.find((m) => m.value === metricType)?.label}</p>
                <p><span className="text-mist-500">Target:</span> {targetValue} {metricType === "HOURS" ? "hours" : metricType === "TOPICS" ? "topics" : metricType === "PROJECTS" ? "projects" : "units"}</p>
                <p><span className="text-mist-500">Tracking:</span> {trackingType === "AUTOMATIC" ? "Auto" : "Manual"}</p>
                {deadline && <p><span className="text-mist-500">Deadline:</span> {deadline}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as WizardStep)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-[12.5px] text-mist-300 hover:bg-slate-700">
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>
          {step < 4 ? (
            <button onClick={() => setStep((s) => (s + 1) as WizardStep)} disabled={!canProceed()} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 text-ink-900 px-5 py-2 text-[12.5px] font-medium hover:bg-ember-400 disabled:opacity-50">
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !canProceed()} className="inline-flex items-center gap-1.5 rounded-lg bg-moss-500 text-ink-900 px-5 py-2 text-[12.5px] font-medium hover:bg-moss-400 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Creating..." : "Create Goal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
