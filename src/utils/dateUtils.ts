// The "anchor" date for the simulated week (Tuesday = June 23, 2026)
const WEEK_START = new Date("2026-06-23"); // Tuesday

export function getSimulatedDate(day: string): string {
  const mapping: Record<string, string> = {
    Tuesday: "2026-06-23",
    Wednesday: "2026-06-24",
    Thursday: "2026-06-25",
    Friday: "2026-06-26",
    Saturday: "2026-06-27",
    Sunday: "2026-06-28",
    Monday: "2026-06-29",
  };
  return mapping[day] || "2026-06-24";
}

export function getDayLabelFromDate(dateStr: string): string {
  const mapping: Record<string, string> = {
    "2026-06-23": "Tuesday",
    "2026-06-24": "Wednesday",
    "2026-06-25": "Thursday",
    "2026-06-26": "Friday",
    "2026-06-27": "Saturday",
    "2026-06-28": "Sunday",
    "2026-06-29": "Monday",
  };
  return mapping[dateStr] || "Wednesday";
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

// Get today's date in the simulated world (default to Tuesday if not set)
export function getDefaultSimulatedDate(): string {
  return "2026-06-24"; // Wednesday
}