export function getSimulatedDate(day: string): string {
  if (day && day.match(/^\d{4}-\d{2}-\d{2}$/)) return day;
  const mapping: Record<string, string> = {
    Tuesday: "2026-06-23",
    Wednesday: "2026-06-24",
    Thursday: "2026-06-25",
    Friday: "2026-06-26",
    Saturday: "2026-06-27",
    Sunday: "2026-06-28",
    Monday: "2026-06-29",
  };
  return mapping[day] || new Date().toISOString().slice(0, 10);
}

export function getDayLabelFromDate(dateStr: string): string {
  if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
  }
  return "Wednesday";
}

export function generateWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function getDefaultSimulatedDate(): string {
  return new Date().toISOString().slice(0, 10);
}
