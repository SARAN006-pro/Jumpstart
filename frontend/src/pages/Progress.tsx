import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, RotateCcw, BookOpen, CheckCircle, Target,
  Clock, TrendingUp, Activity, ArrowRight, Bookmark,
  Play, ChevronDown, ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import Heatmap from "../components/ui/Heatmap";
import WeeklyBar from "../components/charts/WeeklyBar";
import { api, ApiError } from "../lib/api";
import {
  type WorkspaceResponse,
  type RecentActivityResponse,
  type DashboardResponse,
  type ResourceProgressResponse,
  type RoadmapProgressResponse,
  type TopicProgressResponse,
  colorThemeToTone,
  RESOURCE_STATUSES,
} from "../lib/types";
import { colorMap, relativeTime } from "../lib/utils";
import CognitiveDashboard from "../components/analytics/CognitiveDashboard";
import MonthlyReportButton from "../components/report/MonthlyReportButton";

export default function Progress() {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [activity, setActivity] = useState<RecentActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRoadmaps, setExpandedRoadmaps] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      api.get<WorkspaceResponse>("/progress/workspace"),
      api.get<DashboardResponse>("/dashboard"),
      api.get<RecentActivityResponse[]>("/recent-activity?limit=30"),
    ]);

    const wResult = results[0];
    const dResult = results[1];
    const aResult = results[2];

    if (wResult.status === "fulfilled") setWorkspace(wResult.value);
    if (dResult.status === "fulfilled") setDashboard(dResult.value);
    if (aResult.status === "fulfilled") setActivity(aResult.value);

    if (wResult.status === "rejected" && dResult.status === "rejected") {
      setError("Failed to load progress data.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRoadmap = (id: number) => {
    setExpandedRoadmaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <AppShell title="Progress">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ember-400" />
        </div>
      </AppShell>
    );
  }

  if (error && !workspace) {
    return (
      <AppShell title="Progress">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[14px] text-ember-400 mb-4">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-100 hover:bg-slate-800">
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </AppShell>
    );
  }

  if (!workspace) return null;

  const allSessions = dashboard?.activityHeatmap ?? [];

  return (
    <AppShell title="Progress">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[26px] text-paper">Progress &amp; analytics</h1>
          <p className="text-[13px] text-mist-500 mt-1">A clear-eyed view of where your time and mastery are going.</p>
        </div>
        <MonthlyReportButton workspace={workspace} dashboard={dashboard} activity={activity} />
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="panel p-4 flex flex-col items-center text-center">
          <Target size={22} className="text-ember-400 mb-2" />
          <p className="num text-[22px] text-paper">{workspace.dashboardProgress}%</p>
          <p className="text-[11px] text-mist-500 uppercase tracking-wider font-bold mt-0.5">Overall progress</p>
        </div>
        <div className="panel p-4 flex flex-col items-center text-center">
          <BookOpen size={22} className="text-moss-400 mb-2" />
          <p className="num text-[22px] text-paper">{workspace.totalResources}</p>
          <p className="text-[11px] text-mist-500 uppercase tracking-wider font-bold mt-0.5">Total resources</p>
        </div>
        <div className="panel p-4 flex flex-col items-center text-center">
          <Activity size={22} className="text-gold-400 mb-2" />
          <p className="num text-[22px] text-paper">{workspace.inProgressCount}</p>
          <p className="text-[11px] text-mist-500 uppercase tracking-wider font-bold mt-0.5">In progress</p>
        </div>
        <div className="panel p-4 flex flex-col items-center text-center">
          <CheckCircle size={22} className="text-moss-400 mb-2" />
          <p className="num text-[22px] text-paper">{workspace.completedResources}</p>
          <p className="text-[11px] text-mist-500 uppercase tracking-wider font-bold mt-0.5">Completed</p>
        </div>
      </div>

      {/* ── Cognitive Analysis (Phase 3.1) ── */}
      <div className="mb-6">
        <CognitiveDashboard />
      </div>

      {/* ── Continue Learning + Completed Today/Week ── */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <ResourceSection
          title="Continue Learning"
          icon={<Play size={15} className="text-ember-400" />}
          resources={workspace.continueLearning}
          empty="Keep going — in-progress resources will show here."
        />
        <ResourceSection
          title="Completed Today"
          icon={<CheckCircle size={15} className="text-moss-400" />}
          resources={workspace.completedToday}
          empty="No resources completed today yet."
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <ResourceSection
          title="Completed This Week"
          icon={<TrendingUp size={15} className="text-gold-400" />}
          resources={workspace.completedThisWeek}
          empty="No resources completed this week yet."
        />
        <ResourceSection
          title="Bookmarked"
          icon={<Bookmark size={15} className="text-ember-400" />}
          resources={workspace.bookmarked}
          empty="No bookmarked resources yet."
        />
      </div>

      {/* ── Activity Heatmap + Weekly Bar (reuse from Dashboard) ── */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="panel p-5">
          <h2 className="text-[14.5px] font-semibold text-paper mb-1">Activity heatmap</h2>
          <p className="text-[12px] text-mist-500 mb-4">Every study session, last 18 weeks.</p>
          {allSessions.length > 0 ? (
            <Heatmap data={allSessions} />
          ) : (
            <p className="text-[13px] text-mist-600 py-6 text-center">No study sessions logged yet.</p>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="text-[14.5px] font-semibold text-paper mb-1">This week</h2>
          <p className="text-[12px] text-mist-500 mb-2">Hours studied per day.</p>
          {dashboard ? <WeeklyBar data={dashboard.weeklyHours} /> : <p className="text-[13px] text-mist-600 py-6 text-center">Weekly data unavailable.</p>}
        </div>
      </div>

      {/* ── Roadmap Progress ── */}
      <div className="panel p-5 mb-5">
        <h2 className="text-[14.5px] font-semibold text-paper mb-1">Roadmap progress</h2>
        <p className="text-[12px] text-mist-500 mb-4">Completion across all your roadmaps.</p>
        {workspace.roadmapProgress.length === 0 ? (
          <p className="text-[13px] text-mist-600 py-4 text-center">No roadmaps yet.</p>
        ) : (
          <div className="space-y-4">
            {workspace.roadmapProgress.map((r) => {
              const tone = colorThemeToTone(r.colorTheme);
              const cm = colorMap[tone];
              const expanded = expandedRoadmaps.has(r.roadmapId);
              return (
                <div key={r.roadmapId}>
                  <button
                    onClick={() => toggleRoadmap(r.roadmapId)}
                    className="w-full flex items-center gap-3 group text-left"
                  >
                    <div className="shrink-0">
                      {expanded ? <ChevronDown size={14} className="text-mist-500" /> : <ChevronRight size={14} className="text-mist-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-medium text-paper group-hover:text-ember-400 transition-colors truncate">
                          {r.roadmapTitle}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-[11px] text-mist-500">
                            {r.completedResources}/{r.totalResources} resources
                          </span>
                          <span className="font-mono text-[11.5px] text-mist-400">{r.progressPercent}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={clsx("h-full rounded-full transition-all duration-700", cm.bg)}
                          style={{ width: `${r.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {expanded && r.topics && r.topics.length > 0 && (
                    <div className="ml-7 mt-3 space-y-2 border-l border-slate-700 pl-4">
                      {r.topics.map((t) => (
                        <TopicProgressRow key={t.topicId} topic={t} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="panel p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14.5px] font-semibold text-paper">Recent activity</h2>
          <Activity size={16} className="text-mist-500" />
        </div>
        {activity.length === 0 ? (
          <p className="text-[13px] text-mist-600 py-4 text-center">No recent activity yet.</p>
        ) : (
          <div className="space-y-1">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                <ActivityDot type={a.activityType} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-paper truncate">{a.title}</p>
                  {a.subtitle && (
                    <p className="text-[11.5px] text-mist-500 truncate">{a.subtitle}</p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-mist-700 shrink-0 mt-0.5">
                  {relativeTime(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-6 py-8 text-[12px] text-mist-600">
        <Link to="/app/roadmaps" className="hover:text-mist-300 transition-colors inline-flex items-center gap-1">
          Roadmaps <ArrowRight size={12} />
        </Link>
        <Link to="/app/resources" className="hover:text-mist-300 transition-colors inline-flex items-center gap-1">
          Resources <ArrowRight size={12} />
        </Link>
        <Link to="/app/notes" className="hover:text-mist-300 transition-colors inline-flex items-center gap-1">
          Notes <ArrowRight size={12} />
        </Link>
      </div>
    </AppShell>
  );
}

/* ── Helpers ── */

function statusColor(status: string) {
  const s = RESOURCE_STATUSES.find((rs) => rs.value === status);
  if (!s) return "text-slate-500";
  if (s.color === "moss") return "text-moss-400";
  if (s.color === "ember") return "text-ember-400";
  return "text-slate-500";
}

function statusSymbol(status: string) {
  const s = RESOURCE_STATUSES.find((rs) => rs.value === status);
  return s ? s.symbol : "○";
}

/* ── Sub-components ── */

function ResourceSection({
  title,
  icon,
  resources,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  resources: ResourceProgressResponse[];
  empty: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-[14px] font-semibold text-paper">{title}</h2>
        <span className="text-[11px] font-mono text-mist-500 ml-auto">{resources.length}</span>
      </div>
      {resources.length === 0 ? (
        <p className="text-[12.5px] text-mist-600 py-3 text-center italic">{empty}</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const href = r.url || "#";
            return (
              <a
                key={r.id}
                href={href}
                target={r.url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors group"
              >
                <span className={clsx("text-[13px] font-mono shrink-0", statusColor(r.status))}>
                  {statusSymbol(r.status)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-paper truncate group-hover:text-ember-400 transition-colors">
                    {r.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10.5px] text-mist-600">
                    <span>{r.type}</span>
                    {r.progressPercent > 0 && r.progressPercent < 100 && (
                      <span className="font-mono">{r.progressPercent}%</span>
                    )}
                    {r.completedAt && (
                      <span className="text-moss-600">done {relativeTime(r.completedAt)}</span>
                    )}
                  </div>
                </div>
                {r.favorite && (
                  <span className="text-[11px] text-gold-400 shrink-0" title="Favorite">★</span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopicProgressRow({ topic }: { topic: TopicProgressResponse }) {
  const isCompleted = topic.status === "COMPLETED" || topic.status === "DONE";
  const pct = topic.progressPercent;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className={clsx("text-[10px] font-mono shrink-0 w-7 text-right", isCompleted ? "text-moss-400" : "text-slate-500")}>
        {pct}%
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-mist-200 truncate">{topic.topicTitle}</span>
          <span className="text-[10px] text-mist-600 shrink-0 ml-2">
            {topic.completedResources}/{topic.totalResources}
          </span>
        </div>
        <div className="h-1 rounded-full bg-slate-700 overflow-hidden mt-1">
          <div
            className={clsx("h-full rounded-full transition-all duration-500", isCompleted ? "bg-moss-500" : "bg-ember-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const color =
    type.startsWith("RESOURCE_COMPLETED") || type.startsWith("NOTE_")
      ? "bg-moss-500"
      : type.startsWith("RESOURCE_STARTED")
        ? "bg-ember-500"
        : type === "RESOURCE_RESET"
          ? "bg-gold-500"
          : "bg-slate-600";
  return <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", color)} />;
}
