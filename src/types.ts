export interface TaskItem {
  id: string;
  day: string;
  time: string;
  task: string;
  duration: string;
  category: "thesis" | "presentation" | "appointment" | "break" | "general";
  completed: boolean;
  description: string;
  driveFileId?: string;
}

export interface ScheduleBlueprint {
  motif: string;
  tasks: TaskItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "custom";
  preferred_time?: string; // e.g., "morning" or "07:30"
  duration_minutes?: number; // e.g., 10
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD format
  history: string[]; // Array of YYYY-MM-DD completion dates
  createdAt: string; // YYYY-MM-DD
}
