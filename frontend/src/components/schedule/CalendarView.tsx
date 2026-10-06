import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import { useFloatingTimerStore } from "../../store/floatingTimerStore";
import { utcToLocal, localToUtc } from "../../lib/timezone";
import type { StudyScheduleItem, ScheduleSessionResponse } from "../../lib/types";

interface CalendarViewProps {
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
  { bg: "#ec4899", border: "#db2777" },
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

export default function CalendarView({ weekStart, onWeekChange, refreshKey, onCreateClick }: CalendarViewProps) {
  const toast = useToastStore((s) => s.push);
  const startTimer = useFloatingTimerStore((s) => s.startTimer);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStartStr = weekStart.toISOString().split("T")[0];

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const [legacyItems, sessionItems] = await Promise.all([
        api.get<StudyScheduleItem[]>(`/schedule?weekStart=${weekStartStr}`).catch(() => [] as StudyScheduleItem[]),
        api.get<ScheduleSessionResponse[]>(
          `/schedule/sessions?start=${localToUtc(weekStart)}&end=${localToUtc(weekEnd)}`
        ).catch(() => [] as ScheduleSessionResponse[]),
      ]);

      const mapped: CalendarEvent[] = [
        ...legacyItems.map((item) => {
          const date = item.scheduledDate;
          const minutes = item.plannedMinutes;
          const start = new Date(`${date}T09:00:00`);
          const end = new Date(start.getTime() + minutes * 60000);
          const color = getTopicColor(item.topicId);
          return {
            id: `legacy-${item.id}`,
            title: item.topicTitle,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: color.bg,
            borderColor: color.border,
            textColor: "#fff",
            classNames: ["rounded-md", "text-xs", "font-medium", "shadow-sm", "cursor-pointer"],
            extendedProps: {
              type: "legacy",
              scheduleId: item.id,
              topicId: item.topicId,
              plannedMinutes: item.plannedMinutes,
              note: item.note,
            },
          };
        }),
        ...sessionItems.map((item) => {
          const color = getSessionColor(item.status, item.topicId);
          return {
            id: `session-${item.id}`,
            title: item.title,
            start: item.plannedStartTime,
            end: item.plannedEndTime,
            backgroundColor: color.bg,
            borderColor: color.border,
            textColor: "#fff",
            classNames: [
              "rounded-md", "text-xs", "font-medium", "shadow-sm", "cursor-pointer",
              item.status === "COMPLETED" ? "line-through opacity-70" : "",
              item.status === "NO_SHOW" ? "opacity-50" : "",
              item.status === "SKIPPED" ? "opacity-40" : "",
            ].filter(Boolean),
            extendedProps: {
              type: "session",
              sessionId: item.id,
              topicId: item.topicId,
              status: item.status,
              timezone: item.timezone,
              recurrenceRule: item.recurrenceRule,
              notes: item.notes,
            },
          };
        }),
      ];
      setEvents(mapped);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, weekStart]);

  useEffect(() => { fetchEvents(); }, [fetchEvents, refreshKey]);

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
        .then(() => toast("Session rescheduled", { tone: "success" }))
        .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
    } else {
      const scheduleId = info.event.extendedProps.scheduleId;
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      const date = start.toISOString().split("T")[0];
      api.put(`/schedule/${scheduleId}`, {
        topicId: info.event.extendedProps.topicId,
        scheduledDate: date,
        plannedMinutes: minutes,
      })
        .then(() => toast("Rescheduled", { tone: "success" }))
        .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
    }
  }

  function handleEventResize(info: any) {
    const id = info.event.id;
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    const type = info.event.extendedProps.type;

    if (type === "session") {
      const sessionId = info.event.extendedProps.sessionId;
      api.patch(`/schedule/sessions/${sessionId}/timings?newStart=${localToUtc(start)}&newEnd=${localToUtc(end)}`, {})
        .then(() => toast("Duration updated", { tone: "success" }))
        .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
    } else {
      const scheduleId = info.event.extendedProps.scheduleId;
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      api.put(`/schedule/${scheduleId}`, {
        topicId: info.event.extendedProps.topicId,
        scheduledDate: start.toISOString().split("T")[0],
        plannedMinutes: minutes,
      })
        .then(() => toast("Duration updated", { tone: "success" }))
        .catch(() => { toast("Failed to update", { tone: "error" }); fetchEvents(); });
    }
  }

  function handleEventClick(info: any) {
    const type = info.event.extendedProps.type;
    if (type === "session") {
      const sessionId = info.event.extendedProps.sessionId;
      const choice = confirm(`Start timer for "${info.event.title}"?\n\nCancel = delete session`);
      if (choice) {
        startTimer(info.event.extendedProps.topicId ?? 1, info.event.title);
      } else {
        if (confirm("Delete this session?")) {
          api.del(`/schedule/sessions/${sessionId}`)
            .then(() => { fetchEvents(); toast("Session deleted", { tone: "default" }); })
            .catch(() => toast("Failed to delete", { tone: "error" }));
        }
      }
    }
  }

  function handleDatesSet(arg: any) {
    const monday = new Date(arg.start);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    onWeekChange(monday);
  }

  return (
    <div className="calendar-container">
      <style>{`
        .fc { background: transparent; color: #e2e8f0; }
        .fc .fc-toolbar-title { color: #f1f5f9; font-size: 1.1rem !important; }
        .fc .fc-button-primary { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        .fc .fc-button-primary:hover { background: #334155; }
        .fc .fc-button-primary:disabled { opacity: 0.4; }
        .fc .fc-button-primary.fc-button-active { background: #f59e0b; border-color: #d97706; color: #000; }
        .fc .fc-daygrid-day { background: #111827; }
        .fc .fc-daygrid-day.fc-day-today { background: #1a2234; }
        .fc .fc-timegrid-col { background: #111827; }
        .fc .fc-timegrid-col.fc-day-today { background: #1a2234; }
        .fc .fc-timegrid-slot { border-color: #1e293b; }
        .fc .fc-col-header-cell { background: #0f172a; border-color: #1e293b; }
        .fc .fc-col-header-cell-cushion { color: #94a3b8; }
        .fc .fc-daygrid-day-number { color: #94a3b8; }
        .fc .fc-timegrid-axis { color: #64748b; }
        .fc .fc-timegrid-slot-label { color: #64748b; }
        .fc .fc-more-popover { background: #1e293b; border-color: #334155; }
        .fc .fc-popover-header { background: #0f172a; }
        .fc .fc-event { border-radius: 4px; padding: 2px 4px; font-size: 11px; }
        .fc .fc-event:hover { filter: brightness(1.15); }
        .fc .fc-scrollgrid { border-color: #1e293b; }
        .fc .fc-scrollgrid-section > td { border-color: #1e293b; }
      `}</style>
      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      )}
      <FullCalendar
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
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
        }}
      />
    </div>
  );
}
