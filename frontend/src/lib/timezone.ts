export function utcToLocal(utcIso: string): Date {
  const d = new Date(utcIso);
  return d;
}

export function localToUtc(date: Date): string {
  return date.toISOString();
}

export function formatLocal(utcIso: string, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(utcIso);
  return d.toLocaleString(undefined, options ?? {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function localDateToUtcIso(date: Date): string {
  return date.toISOString();
}

export function utcIsoToCalendarInput(utcIso: string): string {
  const d = new Date(utcIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function calendarInputToUtc(localInput: string): string {
  const d = new Date(localInput);
  return d.toISOString();
}
