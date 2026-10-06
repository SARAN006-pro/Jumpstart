import { useRef, useState, useEffect } from "react";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../../lib/api";
import type {
  WorkspaceResponse,
  DashboardResponse,
  RecentActivityResponse,
  GoalResponse,
  PageResponse,
  RoadmapProgressResponse,
  TopicProgressResponse,
} from "../../lib/types";

interface Props {
  workspace: WorkspaceResponse;
  dashboard: DashboardResponse | null;
  activity: RecentActivityResponse[];
}

export default function MonthlyReportButton({ workspace, dashboard, activity }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [goals, setGoals] = useState<GoalResponse[]>([]);

  useEffect(() => {
    api.get<PageResponse<GoalResponse>>("/goals?size=100").then((res) => {
      if (res.items) setGoals(res.items);
    }).catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
      } as unknown as Partial<Record<string, unknown>>);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const now = new Date();
      const month = now.toLocaleString("default", { month: "long" });
      const year = now.getFullYear();
      pdf.save(`Jumpstart_Progress_${month}_${year}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const roadmapProgress = workspace.roadmapProgress;
  const topicProgress = workspace.topicProgress ?? [];

  const completedGoals = goals.filter((g) => g.complete);
  const activeGoals = goals.filter((g) => !g.complete && !g.locked);

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2 text-[13px] font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {generating ? "Generating..." : "Download Monthly Report"}
      </button>

      {/* Hidden report content for PDF capture */}
      <div className="fixed -left-[9999px] top-0" aria-hidden>
        <div ref={reportRef} className="w-[800px] p-10" style={{ background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #334155" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Monthly Progress Report</h1>
            <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>{month} {year} &middot; Jumpstart OS</p>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Generated {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Overall Progress", value: `${workspace.dashboardProgress}%` },
              { label: "Resources", value: `${workspace.completedResources}/${workspace.totalResources}` },
              { label: "In Progress", value: String(workspace.inProgressCount) },
              { label: "Streak", value: dashboard ? `${dashboard.currentStreak} days` : "—" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#06b6d4", margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Study Hours */}
          {dashboard && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: "0 0 12px 0" }}>Study Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#10b981", margin: 0 }}>{dashboard.totalStudyHours}h</p>
                  <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Total Study Hours</p>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", margin: 0 }}>{dashboard.weekStudyHours}h</p>
                  <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>This Week</p>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa", margin: 0 }}>{dashboard.goalsOnTrack}/{dashboard.totalGoals}</p>
                  <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Goals on Track</p>
                </div>
              </div>
            </div>
          )}

          {/* Skills / Topics */}
          {topicProgress.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: "0 0 12px 0" }}>Skills &amp; Topics</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topicProgress.map((t) => (
                  <div key={t.topicId} style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{t.topicTitle}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{t.completedResources}/{t.totalResources} &middot; {t.progressPercent}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#334155", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${t.progressPercent}%`, borderRadius: 3, background: "linear-gradient(90deg, #10b981, #06b6d4)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: "0 0 12px 0" }}>Goals</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeGoals.slice(0, 10).map((g) => (
                  <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#1e293b", borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, color: "#e2e8f0" }}>{g.label}</span>
                      <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>{g.cadence}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{g.progressValue}/{g.targetValue} {g.unit || ""}</span>
                  </div>
                ))}
                {activeGoals.length > 10 && (
                  <p style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>+{activeGoals.length - 10} more active goals</p>
                )}
              </div>
              {completedGoals.length > 0 && (
                <div style={{ marginTop: 8, padding: "8px 14px", background: "#064e3b30", borderRadius: 8, border: "1px solid #065f4630" }}>
                  <p style={{ fontSize: 12, color: "#34d399", margin: 0 }}>Completed: {completedGoals.length} goal{completedGoals.length !== 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
          )}

          {/* Roadmap Progress */}
          {roadmapProgress.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: "0 0 12px 0" }}>Roadmap Progress</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roadmapProgress.map((r) => (
                  <div key={r.roadmapId} style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{r.roadmapTitle}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{r.completedResources}/{r.totalResources} &middot; {r.progressPercent}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#334155", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${r.progressPercent}%`, borderRadius: 3, background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                    </div>
                    {r.topics && r.topics.length > 0 && (
                      <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid #334155" }}>
                        {r.topics.map((t) => (
                          <div key={t.topicId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{t.topicTitle}</span>
                            <span style={{ fontSize: 10, color: "#64748b" }}>{t.progressPercent}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {activity.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", margin: "0 0 12px 0" }}>Recent Activity</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activity.slice(0, 15).map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#1e293b", borderRadius: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.activityType.startsWith("RESOURCE_COMPLETED") ? "#10b981" : a.activityType.startsWith("NOTE_") ? "#8b5cf6" : "#64748b", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#e2e8f0", flex: 1 }}>{a.title}</span>
                    {a.subtitle && <span style={{ fontSize: 10, color: "#64748b" }}>{a.subtitle}</span>}
                  </div>
                ))}
                {activity.length > 15 && (
                  <p style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>+{activity.length - 15} more events</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: 24, borderTop: "1px solid #334155", marginTop: 32 }}>
            <p style={{ fontSize: 11, color: "#475569" }}>Jumpstart OS &mdash; AI-Powered Learning Platform</p>
            <p style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>Progress tracking since {monthStart}</p>
          </div>
        </div>
      </div>
    </>
  );
}
