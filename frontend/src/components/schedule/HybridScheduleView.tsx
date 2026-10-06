import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useDroppable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import clsx from "clsx";
import DailyAgendaList from "./DailyAgendaList";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import { utcToLocal, localToUtc } from "../../lib/timezone";
import type { GoalResponse, PageResponse, ScheduleSessionResponse, StudyScheduleItem } from "../../lib/types";

interface HybridScheduleViewProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  refreshKey: number;
  onCreateClick: (date: Date) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  classNames: string[];
  extendedProps: Record<string, unknown>;
}

const TOPIC_COLORS = [
  { bg: "#3b82f6", border: "#2563eb" },
  { bg: "#8b5cf6", border: "#7c3aed" },
  { bg: "#10b981", border: "#059669" },
  { bg: "#f59e0b", border: "#d97706" },
  { bg: "#ef4444", border: "#dc2626" },
  { bg: "#06b6d4", border: "#0891b2" },
  { bg: "#84cc16", border: "#65a30d" },
];

const NO_SHOW_COLOR = { bg: "#475569", border: "#334155" };
const COMPLETED_COLOR = { bg: "#10b981", border: "#059669" };
const SKIPPED_COLOR = { bg: "#6b7280", border: "#4b5563" };

function getTopicColor(topicId: number | null) {
  if (topicId === null) return { bg: "#6366f1", border: "#4f46e5" };
  return TOPIC_COLORS[topicId % TOPIC_COLORS.length];
}

function getSessionColor(status: string, topicId: number | null) {
  if (status === "NO_SHOW") return NO_SHOW_COLOR;
  if (status === "COMPLETED") return COMPLETED_COLOR;
  if (status === "SKIPPED") return SKIPPED_COLOR;
  return getTopicColor(topicId);
}

/* Droppable wrapper around FullCalendar */
function CalendarDroppableArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "calendar-drop" });

  return (
    <div ref={setNodeRef} className={clsx("relative", isOver && "ring-2 ring-cyan-500/40 rounded-xl")}>
      {children}
    </div>
  );
}

export default function HybridScheduleView({ weekStart, onWeekChange, refreshKey, onCreateClick }: HybridScheduleViewProps) {
  const toast = useToastStore((s) => s.push);
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agendaGoals, setAgendaGoals] = useState<GoalResponse[]>([]);

  const weekStartStr = weekStart.toISOString().split("T")[0];

  /* Fetch calendar events */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const [legacyItems, sessionItems] = await Promise.all([
        api.get<StudyScheduleItem[]>(`/schedule?weekStart=${weekStartStr}`).catch(() => []),
        api.get<ScheduleSessionResponse[]>(`/schedule/sessions?start=${localToUtc(weekStart)}&end=${localToUtc(weekEnd)}`).catch(() => []),
      ]);

      const mapped: CalendarEvent[] = [
        ...legacyItems.map((item) => {
          const date = item.scheduledDate;
          const start = new Date(`${date}T09:00:00`);
          const end = new Date(start.getTime() + item.plannedMinutes * 60000);
          const color = getTopicColor(item.topicId);
          return {
            id: `legacy-${item.id}`,
            title: item.topicTitle,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: "rgba(99,102,241,0.2)",
            borderColor: "rgba(99,102,241,0.4)",
            textColor: "#a5b4fc",
            classNames: ["rounded-md", "text-[11px]", "font-medium", "backdrop-blur-sm", "border-dashed"],
            extendedProps: { type: "legacy", scheduleId: item.id, topicId: item.topicId, plannedMinutes: item.plannedMinutes },
          };
        }),
        ...sessionItems.map((item) => {
          const color = getSessionColor(item.status, item.topicId);
          return {
            id: `session-${item.id}`,
            title: item.title,
            start: item.plannedStartTime,
            end: item.plannedEndTime,
            backgroundColor: item.status === "PLANNED" ? `${color.bg}33` : color.bg,
            borderColor: item.status === "PLANNED" ? `${color.border}66` : color.border,
            textColor: "#fff",
            classNames: ["rounded-md", "text-[11px]", "font-medium", "shadow-sm",
              item.status === "COMPLETED" ? "line-through opacity-60" : "",
              item.status === "NO_SHOW" ? "opacity-40" : "",
              item.status === "SKIPPED" ? "opacity-30" : "",
            ].filter(Boolean),
            extendedProps: { type: "session", sessionId: item.id, topicId: item.topicId, status: item.status },
          };
        }),
      ];
      setEvents(mapped);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [weekStartStr, weekStart]);

  /* Fetch agenda goals */
  const fetchAgenda = useCallback(async () => {
    try {
      const res = await api.get<PageResponse<GoalResponse>>("/goals?size=50&complete=false");
      setAgendaGoals(res.items);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents, refreshKey]);
  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

  function handleDateClick(info: { date: Date }) {
    onCreateClick(info.date);
  }

  function handleEventDrop(info: any) {
    const id = info.event.id;
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    const type = info.event.extendedProps.type;
    if (type === "session") {
      const sessionId = info.event.extendedProps.sessionId;
      api.patch(`/schedule/sessions/${sessionId}/timings?newStart=${localToUtc(start)}&newEnd=${localToUtc(end)}`, {})
        .then(() => toast("Rescheduled", { tone: "success" }))
        .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
    }
  }

  function handleEventResize(info: any) {
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    const sessionId = info.event.extendedProps.sessionId;
    api.patch(`/schedule/sessions/${sessionId}/timings?newStart=${localToUtc(start)}&newEnd=${localToUtc(end)}`, {})
      .then(() => toast("Duration updated", { tone: "success" }))
      .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
  }

  function handleEventClick(info: any) {
    const type = info.event.extendedProps.type;
    if (type === "session") {
      const sessionId = info.event.extendedProps.sessionId;
      const choice = window.confirm(`Start timer for "${info.event.title}"?`);
      if (choice) {
        onCreateClick(new Date(info.event.start));
      }
    }
  }

  function handleDatesSet(arg: any) {
    const monday = new Date(arg.start);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    onWeekChange(monday);
  }

  /* Handle drop from agenda onto calendar */
  async function handleAgendaDropOnCalendar(goal: GoalResponse, date: Date, durationMinutes: number) {
    try {
      const end = new Date(date.getTime() + durationMinutes * 60000);
      const request = {
        title: `Focus: ${goal.label}`,
        plannedStartTime: date.toISOString(),
        plannedEndTime: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        topicId: goal.topicId ?? undefined,
        notes: `Linked to goal: ${goal.label}`,
      };
      const session = await api.post<ScheduleSessionResponse>("/schedule/sessions", request);
      toast(`"${goal.label}" scheduled!`, { tone: "success" });
      fetchEvents();
    } catch {
      toast("Failed to schedule", { tone: "error" });
    }
  }

  return (
    <div className="flex gap-4">
      {/* Left: Agenda */}
      <div className="w-[30%] min-w-[220px] shrink-0">
        <div className="panel p-3">
          <DailyAgendaList goals={agendaGoals} onDropOnCalendar={handleAgendaDropOnCalendar} />
        </div>
      </div>

      {/* Right: Calendar */}
      <div className="flex-1 min-w-0">
        <CalendarDroppableArea>
          <div className="calendar-container">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              dateClick={handleDateClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              initialDate={weekStartStr}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              editable
              eventDurationEditable
              snapDuration="00:15:00"
              slotDuration="00:30:00"
              nowIndicator
              locale="en"
              firstDay={1}
              droppable
              buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
            />
          </div>
        </CalendarDroppableArea>
      </div>
    </div>
  );
}
