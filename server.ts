import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization helper for Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Please add it to your secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Endpoint 1: Generate Schedule from a Stress/Deadline Prompt
app.post("/api/generate-schedule", async (req, res) => {
  try {
    const { rawInput, currentDay = "Tuesday" } = req.body;
    if (!rawInput) {
      return res.status(400).json({ error: "No scheduling prompt was provided." });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are Heimdall, an elite, structured productivity companion.
      The user is highly stressed and has shared their workload, deadlines, and preferences:
      "${rawInput}"

      Today's context: Today is ${currentDay}.
      Generate a professional, fully optimized daily timetable leading up to their deadlines.
      Categorize each task block. Categories available: "thesis", "presentation", "appointment", "break", "general".

      Strict requirements:
      - The timetable must break down these overwhelming goals into manageable 1.5 to 3 hour structured blocks.
      - Ensure proper prioritization (e.g. if thesis is due Friday, schedule thesis blocks heavily on Tuesday, Wednesday, and Thursday, finishing draft by Thursday evening/Friday morning).
      - Schedule around fixed events (like doctor appointments, classes).
      - Honor their focus peak times (e.g., if they focus best in the early morning, schedule the heaviest writing first thing, like 07:00 - 09:30).
      - Provide a clear, actionable focus motif/brief summary.
      - Every task must have a helpful description of what to do during that time.

      Return a JSON object matching this schema:
      {
        "motif": "Focus draft completion with early mornings prioritizing high-cognitive writing, slotting secondary preparation after fixed milestones.",
        "tasks": [
          {
            "id": "t1",
            "day": "Wednesday",
            "time": "07:00 - 09:30",
            "task": "Thesis: Literature Review & Background",
            "duration": "2.5 hours",
            "category": "thesis",
            "completed": false,
            "description": "Write background research and draft literature review focusing on core theories."
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            motif: {
              type: Type.STRING,
              description: "A short, de-stressing motif or strategy statement summarizing the weekly plan."
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  day: { type: Type.STRING, description: "e.g. Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Monday" },
                  time: { type: Type.STRING, description: "e.g. 07:00 - 09:30" },
                  task: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  category: { type: Type.STRING, description: "Must be one of: 'thesis', 'presentation', 'appointment', 'break', 'general'" },
                  completed: { type: Type.BOOLEAN },
                  description: { type: Type.STRING },
                },
                required: ["id", "day", "time", "task", "duration", "category", "completed", "description"]
              }
            }
          },
          required: ["motif", "tasks"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error generating schedule:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating the schedule." });
  }
});

// Endpoint 2: Chat with Heimdall for scheduling advice, rescheduling, and proactive habit tracking
app.post("/api/chat-advisor", async (req, res) => {
  try {
    const { 
      messages, 
      currentSchedule, 
      currentHabits = [], 
      currentDay = "Tuesday",
      currentDeadlines = [],
      currentCategories = [],
      isDirectCommand = false
    } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message payload." });
    }

    const ai = getGeminiClient();

    const directCommandPrompt = isDirectCommand 
      ? `The user is issuing a direct command from the schedule generator. Execute the requested action immediately without asking any follow-up questions. Assume all necessary details are provided.\nWhen isDirectCommand is true, do NOT ask any questions. Assume the user wants immediate execution. If the request is unclear, do your best with the information available.`
      : "";

    const systemInstruction = `
      ${directCommandPrompt}
      You are Heimdall, an elite, warm, authoritative, and deeply supportive AI productivity companion.
      You speak with professional composure, clarity, and balanced encouragement. Avoid robotic tech lingo or over-excited sales pitch hype. Speak like a helpful personal coach.
      "Life happens, let's get back on track together."

      Context: The active simulated day of the week is ${currentDay}.
      To accurately format dates (YYYY-MM-DD) for days of the week in 2026, use this mapping:
      - Tuesday is "2026-06-23"
      - Wednesday is "2026-06-24"
      - Thursday is "2026-06-25"
      - Friday is "2026-06-26"
      - Saturday is "2026-06-27"
      - Sunday is "2026-06-28"
      - Monday is "2026-06-29"

      You have access to the user's current schedule:
      ${JSON.stringify(currentSchedule, null, 2)}

      You have access to the user's active custom habits & streaks:
      ${JSON.stringify(currentHabits, null, 2)}

      You have access to the user's current deadlines:
      ${JSON.stringify(currentDeadlines, null, 2)}

      You have access to the user's current category tags:
      ${JSON.stringify(currentCategories, null, 2)}

Your goals: 1. Address the user's message thoughtfully.
       2. Under the hood, you can invoke actions via the JSON "action" property depending on the conversation phase:
       - "suggest_schedule": Use this when recommending or presenting a list of tasks/schedule to the user.
       - "create_calendar_events": After presenting a schedule, if the user explicitly confirms or expresses approval (e.g., "looks good", "yes", "confirm", "do it"), immediately call "create_calendar_events" with the confirmed events. Do NOT call this automatically without user consent.
       - "add_habit": When a user agrees to start a brand-new habit or tracker. Parameters: {"habit_name": string, "frequency": string, "preferred_time"?: string, "duration_minutes"?: number}.
       - "log_habit": When a user says they completed or did a habit today. Parameters: {"habit_name": string, "date"?: string}.
       - "check_habit_status": Proactively check the list of habits for slips. Parameters: {"days_to_check": number}.
       - "detect_gaps_and_nudge": Scans today's schedule for free gaps between commitments, finds matching micro-tasks from the user's task list, and returns a nudge message. Parameters: {"schedule": array, "task_pool": array, "habits"?: array, "user_preferences"?: object}.
       - "register_drive_document": When a user provides a Google Drive file link or ID for a task they mentioned working on. Parameters: {"taskTitle": string, "fileId": string}.
       - "add_deadline": When the user asks to create/add a deadline. Parameters: {"name": string, "date": string} where date is YYYY-MM-DD.
       - "edit_deadline": When the user asks to edit/modify/update an existing deadline. Parameters: {"id": string, "name": string, "date": string}.
       - "delete_deadline": When the user asks to delete/remove an existing deadline. Parameters: {"id": string}.

       3. **Onboarding & Setup**: Early in the first conversation, after learning about the user's tasks, ask: "Would you like me to help you build some daily habits? Things like exercise, reading, or meditation can be scheduled just like tasks. What's one small habit you'd like to start?"
       - When they describe a habit, trigger the "add_habit" action.

       4. **Document Monitoring Integration**: When the user mentions working on a document (like a thesis, report, etc.), ask if it's stored in Google Drive. If they agree and provide a link or file ID, use the "register_drive_document" action to track it for progress monitoring.

       5. **Daily Check-Ins & Nudges**: If the user simulates a morning/new day or asks about habit status, check their habits.
       - If all habits are on track, give quick positive reinforced celebration.
       - If a habit has been missed for habit has been missed for 2 days: "I noticed you haven't meditated in 2 days. Want me to block 10 minutes this morning to get back on track?"
       - If a habit has been missed for 3+ days: "You've lost your 12-day meditation streak. Let's restart today — I've already blocked 07:30–07:40 for you. Just confirm and I'll add it to the calendar." Then call "suggest_schedule" or be ready to schedule!
       - Additionally, during daily check-ins, check registered documents for inactivity (no edits in 2+ days) and issue appropriate nudges.

       6. **Deadlines & Categories Management**: The user may ask to create, edit, or delete deadlines. Use the provided functions to manage deadlines. Deadlines have a name and a date. When the user says 'create a deadline named X for Y date', you should immediately create it without asking for confirmation (unless the request is ambiguous, in which case you may ask for clarification, but only in non-direct-command mode).

       7. Always return a valid JSON object matching this schema:
      {
        "advisorResponse": "Your written advice",
        "updatedTasks": [ ... optional list of updated tasks ... ] or null,
        "action": {
          "name": "suggest_schedule" | "create_calendar_events" | "add_habit" | "log_habit" | "check_habit_status" | "detect_gaps_and_nudge" | "register_drive_document" | "add_deadline" | "edit_deadline" | "delete_deadline",
          "parameters": { ... }
        } or null
      }
    `;

    const chatContents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Here is my current schedule and my request: ${JSON.stringify(currentSchedule)}. My active habits: ${JSON.stringify(currentHabits)}` }] },
        ...chatContents
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advisorResponse: { type: Type.STRING },
            updatedTasks: {
              type: Type.ARRAY,
              description: "List of modified or re-allocated tasks if the user requested a scheduling adjustment.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  day: { type: Type.STRING },
                  time: { type: Type.STRING },
                  task: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  category: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                  description: { type: Type.STRING }
                },
                required: ["id", "day", "time", "task", "duration", "category", "completed", "description"]
              }
            },
action: {
               type: Type.OBJECT,
               properties: {
                 name: { type: Type.STRING, enum: ["suggest_schedule", "create_calendar_events", "add_habit", "log_habit", "check_habit_status", "detect_gaps_and_nudge", "register_drive_document", "add_deadline", "edit_deadline", "delete_deadline"] },
                 parameters: { type: Type.OBJECT }
               }
             }
          },
          required: ["advisorResponse"]
        }
      }
    });

    const bodyText = response.text || "{}";
    const data = JSON.parse(bodyText);
    res.json(data);
  } catch (error: any) {
    console.error("Error in advisor chat:", error);
    res.status(500).json({ error: error.message || "An error occurred during advisor feedback." });
  }
});

// Endpoint 2b: Expose Habits Management API to simulate real persistent server-side actions
app.post("/api/habit/add", (req, res) => {
  const { habit_name, frequency = "daily", preferred_time, duration_minutes = 10 } = req.body;
  if (!habit_name) {
    return res.status(400).json({ error: "mising habit_name" });
  }
  res.json({
    success: true,
    message: `Habit "${habit_name}" added successfully. Note: Persistent storage leverages Firestore in real production; local safeStorage active for immediate preview sessions!`,
    habit: {
      id: "habit-" + Date.now(),
      name: habit_name,
      frequency,
      preferred_time,
      duration_minutes,
      streak: 0,
      history: [],
      createdAt: new Date().toISOString().split("T")[0]
    }
  });
});

app.post("/api/habit/log", (req, res) => {
  const { habit_name, date } = req.body;
  if (!habit_name) {
    return res.status(400).json({ error: "missing habit_name" });
  }
  const logDate = date || new Date().toISOString().split("T")[0];
  res.json({
    success: true,
    message: `Habit "${habit_name}" completed on ${logDate}! Streak incremented.`,
    history_added: logDate,
    overall_productivity_score: 95
  });
});

app.post("/api/habit/status", (req, res) => {
  const { days_to_check = 3, habitsStatus = [] } = req.body;
  const report = habitsStatus.map((h: any) => {
    return {
      name: h.name,
      streak: h.streak,
      days_missed: h.lastCompletedDate ? Math.min(days_to_check, 2) : days_to_check,
      flagged_for_nudge: h.streak === 0 || !h.lastCompletedDate
    };
  });
  res.json({ report });
});

// Helper for Url-Safe Base64 Body Decoding
function decodeBase64Safe(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (e) {
    console.error("Failed to decode base64 body:", e);
    return "";
  }
}

// Recursive helper to get plain text or HTML body from Gmail payload
function getEmailBody(part: any): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body && part.body.data) {
    return decodeBase64Safe(part.body.data);
  }
  if (part.parts && Array.isArray(part.parts)) {
    let text = "";
    for (const subPart of part.parts) {
      const body = getEmailBody(subPart);
      if (body) text += body + "\n";
    }
    if (text) return text;
  }
  if (part.mimeType === "text/html" && part.body && part.body.data) {
    return decodeBase64Safe(part.body.data);
  }
  if (part.body && part.body.data) {
    return decodeBase64Safe(part.body.data);
  }
  return "";
}

// Constant for extraction prompt
const EXTRACTION_PROMPT = `
You are the Heimdall action item extraction agent.

Today's Date: Tuesday, June 23, 2026

Task: Extract actionable tasks and deadlines from the provided email.

Provide a JSON response matching this schema:
{
  "task_title": "Descriptive title of the task",
  "deadline": "YYYY-MM-DD format when available (e.g. 2026-06-29)" or null,
  "deadline_time": "HH:MM format (24-hour) when available" or null,
  "estimated_duration_minutes": number in minutes,
  "additional_notes": "Optional freeform notes from email",
  "needs_more_info": false
}

Examples:
1) Email body includes: "Please review the attached spec by Thursday COB"
 -> deadline="2026-06-25", deadline_time=null, estimated_duration_minutes=30

2) Email body includes: "Sync call at 2:30 PM tomorrow for 45 minutes"
 -> deadline="2026-06-24", deadline_time="14:30", estimated_duration_minutes=45

Return only valid JSON conforming to the above schema.`;

// Helper to parse date from text using relative keywords
function parseDateFromText(text?: string): { date?: string; needsMoreInfo?: boolean } {
  if (!text) return {};
  const base = new Date("2026-06-23"); // Tuesday
  const dayMap: Record<string, number> = {
    today: 0,
    tomorrow: 1,
    "day after tomorrow": 2,
    this: 3, Friday: 3, friday: 3,
    monday: 6,
    tuesday: 0, wednesday: 1, thursday: 2,
    saturday: 4, sunday: 5,
  };

  const lower = text.toLowerCase();
  let delta = 0;

  for (const [phrase, d] of Object.entries(dayMap)) {
    if (lower.includes(phrase)) {
      delta = d;
      break;
    }
  }

  if (delta !== undefined) {
    const next = new Date(base);
    next.setDate(base.getDate() + delta);
    return { date: next.toISOString().split("T")[0], needsMoreInfo: false };
  }

  const isoMatch = /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/.exec(text);
  if (isoMatch) return { date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, needsMoreInfo: false };

  return { needsMoreInfo: true };
}

// Helper to parse minutes from text
function parseMinutesFromText(text?: string): number {
  if (!text) return 30;
  const patterns = [
    /(\d+)\s*(?:minute|min|mins?)\b/i,
    /(\d+)\s*(?:hour|hr|h)\b.*(\d+)\s*(?:minute|min)/i,
    /about\s+(\d+)/i,
  ];
  for (const rx of patterns) {
    const match = rx.exec(text);
    if (match) return parseInt(match[1], 10);
  }
  return 30;
}

// Implement extract_action_items function
export async function extract_action_items(email_subject: string, email_body: string, sender: string): Promise<{
  task_title: string;
  deadline: string | null;
  deadline_time: string | null;
  estimated_duration_minutes: number;
  source_email: { subject: string; sender: string };
  additional_notes?: string;
}> {
  const ai = getGeminiClient();
  const prompt = `${EXTRACTION_PROMPT}
Email Subject: ${email_subject}
Email Body: ${email_body}
Sender: ${sender}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          task_title: { type: Type.STRING },
          deadline: { type: Type.STRING },
          deadline_time: { type: Type.STRING },
          estimated_duration_minutes: { type: Type.NUMBER },
          source_email: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              sender: { type: Type.STRING },
            },
          },
          additional_notes: { type: Type.STRING },
        },
        required: ["task_title", "deadline", "deadline_time", "estimated_duration_minutes", "source_email"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return {
    ...parsed,
    deadline: parsed.deadline === null ? null : String(parsed.deadline),
    deadline_time: parsed.deadline_time === null ? null : String(parsed.deadline_time),
  };
}

export async function extract_event_details(email_subject: string, email_body: string, sender: string): Promise<{
  event_name: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  needs_more_info: boolean;
  missing_critical_info_reason?: string;
}> {
  const ai = getGeminiClient();
  const prompt = `You are the Heimdall event extraction agent.
Today's Date: Tuesday, June 23, 2026.

Task: Extract specific appointment/booking/event details from the provided email body.
If the event is happening relative to today (e.g., "tomorrow", "this Friday"), calculate the correct date based on Today's Date (Tuesday, June 23, 2026).
If the event date is completely missing or cannot be deduced, set "needs_more_info" to true and "event_date" to null.

Provide a JSON response matching this schema:
{
  "event_name": "Descriptive title of the event (e.g., Dentist Appointment, Flight to Oslo, Dinner with Sarah)",
  "event_date": "YYYY-MM-DD format (e.g., 2026-06-24)" or null,
  "start_time": "HH:MM format (24-hour)" or null,
  "end_time": "HH:MM format (24-hour)" or null,
  "needs_more_info": boolean,
  "missing_critical_info_reason": "string describing why details are missing" or null
}

Email Subject: ${email_subject}
Email Body:
${email_body.slice(0, 4000)}
Sender: ${sender}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const parsed = JSON.parse(response.text ?? "{}");
    return {
      event_name: parsed.event_name || email_subject || "Event",
      event_date: parsed.event_date || null,
      start_time: parsed.start_time || "09:00",
      end_time: parsed.end_time || "10:00",
      needs_more_info: !!parsed.needs_more_info,
      missing_critical_info_reason: parsed.missing_critical_info_reason || null,
    };
  } catch {
    return {
      event_name: email_subject || "Event",
      event_date: null,
      start_time: "09:00",
      end_time: "10:00",
      needs_more_info: true,
      missing_critical_info_reason: "Failed to parse details dynamically",
    };
  }
}

// Define TaskItem type for type safety
export interface TaskItem {
  id: string;
  task: string;
  description: string;
  day: string;
  time: string;
  duration: string;
  category: string;
  completed: boolean;
  estimated_duration_minutes: number;
  deadline: string | null;
  deadline_time: string | null;
  source_email?: { subject: string; sender: string };
  is_email_task?: boolean;
  driveFileId?: string;
  calendarEventId?: string;
}

// Add task from email to tasks array
export async function add_task_from_email(task: any, currentTasks: TaskItem[]): Promise<{success: boolean; message: string; tasks: TaskItem[]}> {
  const hasSimilarTask = currentTasks.some((existingTask) => {
    return (
      existingTask.task === task.task_title ||
      existingTask.task === task.task ||
      existingTask.description.includes(task.task_title) ||
      existingTask.description.includes(task.task)
    );
  });

  if (hasSimilarTask) {
    return {
      success: false,
      message: "A similar task already exists in the schedule",
      tasks: [...currentTasks],
    };
  }

  const newTask: TaskItem = {
    id: `task-${Date.now()}`,
    task: task.task_title,
    description: task.additional_notes || "",
    source_email: {
      subject: task.source_email?.subject || "",
      sender: task.source_email?.sender || "",
    },
    estimated_duration_minutes: task.estimated_duration_minutes || 60,
    deadline: task.deadline ? task.deadline : null,
    deadline_time: task.deadline_time || null,
    is_email_task: true,
    day: "",
    time: "",
    duration: `${task.estimated_duration_minutes / 60} hours`,
    category: "general",
    completed: false,
  };

  return {
    success: true,
    message: "Task added from email successfully",
    tasks: [...currentTasks, newTask],
  };
}

// Endpoint 3: Analyze raw email (fallback simulation pasted by the user)
app.post("/api/analyze-email", async (req, res) => {
  try {
    const { emailText, subject = "No Subject", sender = "Unknown Sender" } = req.body;
    if (!emailText) {
      return res.status(400).json({ error: "Email text is required." });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are the Heimdall email analysis agent. Analyse the following email content and classify it.

      Sender: ${sender}
      Subject: ${subject}
      Date: ${new Date().toLocaleDateString()}
      Body:
      ${emailText}

      Today's Date: Tuesday, June 23, 2026.

      Your task is to: 1. Classify the email into ONE of these 4 categories:
      - ACTION_REQUIRED: The email demands some action from the user.
      - EVENT_CONFIRMED: The email confirms that an event/appointment/booking has been booked.
      - INFO: The email shares information without requiring immediate action.
      - UNRELATED: Spam, personal messages, etc.

      2. Provide a reason and confidence score.

      Return a JSON object matching this schema:
      {
        "classification": "ACTION_REQUIRED" | "EVENT_CONFIRMED" | "INFO" | "UNRELATED",
        "reason": "string",
        "confidence": number
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedAnalysis = JSON.parse(response.text || "{}");
    res.json(parsedAnalysis);
  } catch (error: any) {
    console.error("Error in analyze-email:", error);
    res.status(500).json({ error: error.message || "An error occurred during email classification." });
  }
});

// Endpoint 4: Extract action items from email
app.post("/api/extract-action-items", async (req, res) => {
  try {
    const { email_subject, email_body, sender } = req.body;
    if (!email_body) {
      return res.status(400).json({ error: "Email body is required." });
    }

    const result = await extract_action_items(
      email_subject || "No Subject",
      email_body,
      sender || "Unknown Sender"
    );

    res.json(result);
  } catch (error: any) {
    console.error("Error extracting action items:", error);
    res.status(500).json({ error: error.message || "An error occurred while extracting action items." });
  }
});

// Mock currentTasks array for local preview
const currentTasksMock: TaskItem[] = [];

// Drive document monitoring storage
const driveDocs: Record<string, { fileId: string; lastModified: string | null }> = {
  "Thesis: Literature Review & Background": {
    fileId: "file-thesis-lit-rev",
    lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
};

// Helper to classify email and return structured analysis
async function classifyEmail(fullEmailText: string, from: string, subject: string): Promise<any> {
  const prompt = `You are the Heimdall email analysis agent. Analyse the following email content and classify it.
Sender: ${from}
Subject: ${subject}
Date: ${new Date().toLocaleDateString()}
Body:
${fullEmailText.slice(0, 5000)}

Today's Date: Tuesday, June 23, 2026.

Your task is to: 1. Classify the email into ONE of these 4 categories:
- ACTION_REQUIRED: The email demands some specific action from the user (e.g., "Please submit", "Review required", "Action needed").
- EVENT_CONFIRMED: The email confirms that an event/appointment/booking has been booked or confirmed (e.g., dentist appointment confirmed, hotel reservation, flight booked, ticket confirmation).
- INFO: The email shares information without requiring immediate action.
- IGNORE: Promotional emails, marketing material, general requests or invitations (where the meeting/event is NOT yet booked or confirmed), spam, newsletters, or personal updates.

2. Provide a reason explaining your choice.
3. Include a confidence score (0-100).

Return a JSON object matching this schema:
{
  "classification": "ACTION_REQUIRED" | "EVENT_CONFIRMED" | "INFO" | "IGNORE",
  "reason": "string",
  "confidence": number
}

Examples:
1) Email: "Hi there, please review the attached document and provide feedback by EOD Friday."
Output: {"classification": "ACTION_REQUIRED", "reason": "Email explicitly requests user action", "confidence": 98}

2) Email: "Your dentist appointment is confirmed for Wednesday, June 24 at 2:30 PM"
Output: {"classification": "EVENT_CONFIRMED", "reason": "Email confirms an appointment", "confidence": 100}

3) Email: "Check out our new weekly sale on shoes! Get 20% off today only!"
Output: {"classification": "IGNORE", "reason": "Promotional marketing/sale email", "confidence": 95}
`;

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

// Endpoint 5: Direct Gmail inbox monitoring scanning
app.post("/api/check-gmail", async (req, res) => {
  try {
    const { accessToken, processedIds = [] } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Gmail access token is required." });
    }

    // 1. Fetch latest 8 messages from Gmail
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!listRes.ok) {
      if (listRes.status === 401) {
        return res.status(401).json({ error: "Gmail session expired. Please sign in again." });
      }
      throw new Error(`Gmail API returned status ${listRes.status}`);
    }

    const resJson = await listRes.json();
    const messages = resJson.messages || [];
    const processedSet = new Set(processedIds);

    // Filter down to messages not already processed
    const newMessages = messages.filter((m: any) => m && m.id && !processedSet.has(m.id));

    if (newMessages.length === 0) {
      return res.json({ analyzedEmails: [] });
    }

    // Only process up to 3 most recent new messages
    const messagesToProcess = newMessages.slice(0, 3);
    const analyzedEmails: any[] = [];

    for (const msg of messagesToProcess) {
      // 2. Fetch body of each message
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!msgRes.ok) {
        console.error(`Failed to fetch message details for ${msg.id}: status ${msgRes.status}`);
        continue;
      }

      const rawMsg = await msgRes.json();
      const payload = rawMsg.payload || {};
      const headers = payload.headers || [];

      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

      const subject = subjectHeader ? subjectHeader.value : "No Subject";
      const from = fromHeader ? fromHeader.value : "Unknown";
      const dateStr = dateHeader ? dateHeader.value : "";

      // Decode the payload's body recursively
      const bodyPartContent = getEmailBody(payload);

      // Parse full email text for classification
      const fullEmailText = `From: ${from}\nSubject: ${subject}\nDate: ${dateStr}\nBody:\n${bodyPartContent}`;

      // Classify the email
      const parsedAnalysis = await classifyEmail(fullEmailText, from, subject);

      if (parsedAnalysis.classification === 'ACTION_REQUIRED') {
        // Extract action items from ACTION_REQUIRED emails
        try {
          const extractedTask = await extract_action_items(subject, bodyPartContent, from);
          analyzedEmails.push({
            id: msg.id,
            subject,
            from,
            classification: 'ACTION_REQUIRED',
            actionable: extractedTask,
          });
        } catch (extractError) {
          console.error("Failed to extract action items:", extractError);
          analyzedEmails.push({
            id: msg.id,
            subject,
            from,
            classification: 'ACTION_REQUIRED',
            error: "Action extraction failed",
          });
        }
      } else if (parsedAnalysis.classification === 'EVENT_CONFIRMED') {
        // Automatically extract event details
        try {
          const details = await extract_event_details(subject, bodyPartContent, from);
          analyzedEmails.push({
            id: msg.id,
            subject,
            from,
            classification: 'EVENT_CONFIRMED',
            event_name: details.event_name,
            event_date: details.event_date,
            start_time: details.start_time,
            end_time: details.end_time,
            needs_more_info: details.needs_more_info,
            missing_critical_info_reason: details.missing_critical_info_reason,
          });
        } catch (extractError) {
          console.error("Failed to extract event details:", extractError);
          analyzedEmails.push({
            id: msg.id,
            subject,
            from,
            classification: 'EVENT_CONFIRMED',
            needs_more_info: true,
            missing_critical_info_reason: "Failed to extract event details automatically",
          });
        }
      } else {
        analyzedEmails.push({
          id: msg.id,
          subject,
          from,
          ...parsedAnalysis,
        });
      }
    }

    res.json({ analyzedEmails });
  } catch (error: any) {
    console.error("Error in check-gmail endpoint:", error);
    res.status(500).json({ error: error.message || "An error occurred while scanning your inbox." });
  }
});

// Helper to parse times like "09:00", "9:00 AM", "2:30 PM", "14:30"
function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  
  // Try matching HH:MM format with optional AM/PM
  const match = clean.match(/(\d+):(\d+)\s*(am|pm)?/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3];
    
    if (meridiem === "pm" && hours < 12) {
      hours += 12;
    } else if (meridiem === "am" && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }
  
  // Try matching just hours like "9 AM" or "14"
  const hourMatch = clean.match(/(\d+)\s*(am|pm)?/);
  if (hourMatch) {
    let hours = parseInt(hourMatch[1], 10);
    const meridiem = hourMatch[2];
    if (meridiem === "pm" && hours < 12) {
      hours += 12;
    } else if (meridiem === "am" && hours === 12) {
      hours = 0;
    }
    return hours * 60;
  }
  
  return 0;
}

// Convert minutes from midnight back to 24-hour time HH:MM format
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function computeGapsAndNudge(
  schedule: Array<{ title: string; start_time: string; end_time: string }>,
  task_pool: Array<{ title: string; estimated_duration_minutes?: number; priority?: string }>,
  habits?: Array<{ name: string; duration_minutes: number }>,
  user_preferences?: { nudge_enabled?: boolean; decline_count_today?: number }
) {
  // Respect preference
  if (user_preferences?.nudge_enabled === false) {
    return {
      nudge_message: "Nudges are currently disabled per your preferences.",
      gaps: [],
      suggested_task: null
    };
  }

  // Parse events into minutes
  const events = schedule
    .map(event => {
      const start = parseTime(event.start_time);
      const end = parseTime(event.end_time);
      return {
        title: event.title,
        start,
        end,
        original_start: event.start_time,
        original_end: event.end_time
      };
    })
    .filter(e => e.end > e.start)
    .sort((a, b) => a.start - b.start);

  // Standard waking hours: 08:00 (480 mins) to 20:00 (1200 mins)
  const DAY_START = 8 * 60;
  const DAY_END = 20 * 60;

  // Find busy intervals
  const busyPeriods: Array<{ start: number; end: number; titles: string[] }> = [];
  for (const e of events) {
    if (busyPeriods.length === 0) {
      busyPeriods.push({ start: e.start, end: e.end, titles: [e.title] });
    } else {
      const last = busyPeriods[busyPeriods.length - 1];
      if (e.start < last.end) {
        // Overlap, merge them
        last.end = Math.max(last.end, e.end);
        last.titles.push(e.title);
      } else {
        busyPeriods.push({ start: e.start, end: e.end, titles: [e.title] });
      }
    }
  }

  // Find gaps in waking hours
  const gaps: Array<{ start: number; end: number; duration_minutes: number; before?: string; after?: string }> = [];
  
  if (busyPeriods.length === 0) {
    // If no events, the whole day is a gap!
    gaps.push({
      start: DAY_START,
      end: DAY_END,
      duration_minutes: DAY_END - DAY_START,
      before: "Start of Day",
      after: "End of Day"
    });
  } else {
    // Gap before the first event
    if (busyPeriods[0].start > DAY_START) {
      gaps.push({
        start: DAY_START,
        end: busyPeriods[0].start,
        duration_minutes: busyPeriods[0].start - DAY_START,
        before: "Start of Day",
        after: busyPeriods[0].titles.join(" / ")
      });
    }

    // Gaps between consecutive events
    for (let i = 0; i < busyPeriods.length - 1; i++) {
      const start = busyPeriods[i].end;
      const end = busyPeriods[i + 1].start;
      if (end - start >= 10) { // Gap must be at least 10 minutes
        gaps.push({
          start,
          end,
          duration_minutes: end - start,
          before: busyPeriods[i].titles.join(" / "),
          after: busyPeriods[i + 1].titles.join(" / ")
        });
      }
    }

    // Gap after the last event
    const last = busyPeriods[busyPeriods.length - 1];
    if (DAY_END > last.end) {
      gaps.push({
        start: last.end,
        end: DAY_END,
        duration_minutes: DAY_END - last.end,
        before: last.titles.join(" / "),
        after: "End of Day"
      });
    }
  }

  // Let's match tasks
  // Combine custom tasks with habits if available (prioritizing tasks, then habits)
  const pool = [
    ...task_pool.map(t => ({
      title: t.title,
      duration: t.estimated_duration_minutes || 30,
      priority: t.priority || "medium",
      is_habit: false
    })),
    ...(habits || []).map(h => ({
      title: h.name,
      duration: h.duration_minutes || 15,
      priority: "medium",
      is_habit: true
    }))
  ];

  // Look for a perfect fit
  let bestGap: any = null;
  let bestTask: any = null;

  for (const gap of gaps) {
    const matchingTasks = pool.filter(t => t.duration <= gap.duration_minutes);
    if (matchingTasks.length > 0) {
      // Sort matching tasks: High priority first, then closer fit in duration
      matchingTasks.sort((a, b) => {
        const ap = a.priority === "high" ? 3 : a.priority === "low" ? 1 : 2;
        const bp = b.priority === "high" ? 3 : b.priority === "low" ? 1 : 2;
        if (ap !== bp) return bp - ap;
        return Math.abs(a.duration - gap.duration_minutes) - Math.abs(b.duration - gap.duration_minutes);
      });
      bestGap = gap;
      bestTask = matchingTasks[0];
      break;
    }
  }

  let nudge_message = "";
  if (bestGap && bestTask) {
    const startTimeStr = formatMinutes(bestGap.start);
    const endTimeStr = formatMinutes(bestGap.end);
    if (bestTask.is_habit) {
      nudge_message = `Heimdall Nudge: I noticed a ${bestGap.duration_minutes}-minute slot between "${bestGap.before}" and "${bestGap.after}" (from ${startTimeStr} to ${endTimeStr}). This is a golden opportunity to complete your daily "${bestTask.title}" habit (${bestTask.duration} mins)! Shall we lock it in?`;
    } else {
      nudge_message = `Heimdall Nudge: I've spotted a free ${bestGap.duration_minutes}-minute gap from ${startTimeStr} to ${endTimeStr} (between "${bestGap.before}" and "${bestGap.after}"). It fits your "${bestTask.title}" task perfectly (${bestTask.duration} mins). Let's maximize this window to keep your momentum going!`;
    }
  } else if (gaps.length > 0) {
    // We have gaps but no tasks fit, or pool is empty
    const largestGap = [...gaps].sort((a, b) => b.duration_minutes - a.duration_minutes)[0];
    const startTimeStr = formatMinutes(largestGap.start);
    const endTimeStr = formatMinutes(largestGap.end);
    nudge_message = `Heimdall Nudge: You have a clear ${largestGap.duration_minutes}-minute block from ${startTimeStr} to ${endTimeStr}. Perfect time to step away, rest, reset, or work on whatever feels right right now.`;
  } else {
    nudge_message = "Heimdall Nudge: Your day is fully optimized with back-to-back blocks. Focus on executing each segment with absolute precision, and remember to check them off once completed!";
  }

  return {
    nudge_message,
    gaps: gaps.map(g => ({
      start_time: formatMinutes(g.start),
      end_time: formatMinutes(g.end),
      duration_minutes: g.duration_minutes,
      before: g.before,
      after: g.after
    })),
    suggested_task: bestTask ? {
      title: bestTask.title,
      duration_minutes: bestTask.duration,
      priority: bestTask.priority,
      is_habit: bestTask.is_habit
    } : null,
    suggested_gap: bestGap ? {
      start_time: formatMinutes(bestGap.start),
      end_time: formatMinutes(bestGap.end),
      duration_minutes: bestGap.duration_minutes,
      before: bestGap.before,
      after: bestGap.after
    } : null
  };
}

// Endpoint 6: Detect gaps and nudge
app.post("/api/detect-gaps-and-nudge", (req, res) => {
  try {
    const { schedule = [], task_pool = [], habits = [], user_preferences = {} } = req.body;
    
    // Explicit schema parameter check as per instructions
    if (!req.body || (req.body.schedule === undefined && req.body.task_pool === undefined)) {
      return res.status(400).json({ error: "Missing required properties: 'schedule' and/or 'task_pool'" });
    }

    const result = computeGapsAndNudge(schedule, task_pool, habits, user_preferences);
    return res.json(result);
  } catch (error: any) {
    console.error("Error in detect-gaps-and-nudge:", error);
    return res.status(500).json({ error: error.message || "An error occurred while computing schedule gaps." });
  }
});

// Endpoint 6B: Detect gaps and analyze schedule using Gemini
app.post("/api/detect-gaps-analysis", async (req, res) => {
  try {
    const { tasks = [], deadlines = [], currentDay = "Tuesday" } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `
      You are Heimdall's core timeline intelligence system.
      Analyze the user's upcoming tasks and deadlines for the next 14 days (current simulated day of the week is ${currentDay}).
      
      Identify:
      1. Timeline Inefficiencies (e.g. poor pacing, clustering of high-stress tasks on one day, logical sequence issues, or missing gaps).
      2. Scheduling Conflicts & Overlaps (overlapping times, tasks scheduled at the same time, or extremely tight schedules).
      3. Strategic Recommendations (e.g., an upcoming deadline is approaching but no preparatory tasks are scheduled, or missing breaks).
      
      You must respond with a JSON object containing exactly these fields:
      - inefficiencies: Array of objects. Each object must have:
        - id: string (the ID of the task or deadline to update)
        - type: string (either "task" or "deadline")
        - description: string (why it is inefficient)
        - suggestedChange: string (what is being changed, e.g., "Move 'Draft methodology' from Wednesday to Thursday afternoon to resolve clustering")
        - updatedItem: Object (The modified task or deadline object. Keep all other fields of the item the same, but update fields like 'day', 'time', 'duration' as suggested)
      - conflicts: Array of strings (e.g., "Conflict: Research Seminar overlaps with Dr. appointment on Wednesday"). If there are none, return an empty array.
      - recommendations: Array of objects. Each object must have:
        - description: string (the recommendation explanation, e.g., "Deadline for 'Presentation draft' is approaching on Friday, but no prep work is scheduled on Wednesday or Thursday.")
        - proposedAction: string (optional, explanation of the action to execute, e.g., "Auto-schedule 30m prep tasks on Wed & Thu")
        - tasksToCreate: Array of objects (optional, complete new TaskItem objects to create if the user clicks Confirm. Each task should have a unique random/timestamp-based ID, 'completed' set to false, and a logical day, time, duration, and category).
        
      Be precise, realistic, and highly supportive in your suggestions. Formulate realistic schedule adjustments.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Here are the current tasks:\n${JSON.stringify(tasks)}\n\nHere are the active deadlines:\n${JSON.stringify(deadlines)}` }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            inefficiencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestedChange: { type: Type.STRING },
                  updatedItem: { type: Type.OBJECT }
                },
                required: ["id", "type", "description", "suggestedChange", "updatedItem"]
              }
            },
            conflicts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  proposedAction: { type: Type.STRING },
                  tasksToCreate: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT }
                  }
                },
                required: ["description"]
              }
            }
          },
          required: ["inefficiencies", "conflicts", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }
    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error("Error in detect-gaps-analysis:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze schedule." });
  }
});

// Drive Document Monitoring Endpoints

// POST /api/register-drive-document
app.post("/api/register-drive-document", (req, res) => {
  try {
    const { taskTitle, fileId } = req.body;
    
    if (!taskTitle || !fileId) {
      return res.status(400).json({ 
        success: false, 
        message: "Both taskTitle and fileId are required" 
      });
    }
    
    // Store in server-side dictionary
    driveDocs[taskTitle] = { fileId, lastModified: null };
    
    res.json({ 
      success: true, 
      message: `Registered document for task "${taskTitle}"` 
    });
  } catch (error: any) {
    console.error("Error registering drive document:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "An error occurred while registering the document" 
    });
  }
});

// GET /api/check-drive-document?taskTitle=...
app.get("/api/check-drive-document", async (req, res) => {
  try {
const { taskTitle } = req.query;
     
     if (!taskTitle || typeof taskTitle !== 'string') {
       return res.status(400).json({ 
         error: "taskTitle query parameter is required" 
       });
     }
    
    const docEntry = driveDocs[taskTitle];
    
    if (!docEntry) {
      return res.status(404).json({ 
        error: `No document registered for task "${taskTitle}"` 
      });
    }
    
    let lastModified: string | null = null;
    let daysSinceLastEdit: number;
    
    // Check if Google Drive API key is configured
    if (process.env.GOOGLE_DRIVE_API_KEY) {
      try {
        // Call Google Drive API to get file metadata
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${docEntry.fileId}?fields=modifiedTime&key=${process.env.GOOGLE_DRIVE_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error(`Google Drive API error: ${response.status}`);
        }
        
        const data = await response.json();
        lastModified = data.modifiedTime;
        
        // Update our stored lastModified time
        driveDocs[taskTitle].lastModified = lastModified;
      } catch (apiError) {
        console.error("Error calling Google Drive API:", apiError);
        // Fall back to simulated store if API fails
        lastModified = docEntry.lastModified;
      }
    } else {
      // Use simulated store
      lastModified = docEntry.lastModified;
    }
    
    // Calculate days since last edit
    if (lastModified) {
      const lastModifiedDate = new Date(lastModified);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastModifiedDate.getTime());
      daysSinceLastEdit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // If never modified, set to a large number (e.g., 999 days)
      daysSinceLastEdit = 999;
    }
    
    res.json({
      taskTitle,
      lastModified: lastModified || new Date(0).toISOString(), // Far past date if never set
      daysSinceLastEdit
    });
  } catch (error: any) {
    console.error("Error checking drive document:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred while checking the document" 
    });
  }
});

// POST /api/simulate-drive-edit
app.post("/api/simulate-drive-edit", (req, res) => {
  try {
    const { taskTitle } = req.body;
    
    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: "taskTitle is required" 
      });
    }
    
    const docEntry = driveDocs[taskTitle];
    
    if (!docEntry) {
      return res.status(404).json({ 
        success: false, 
        message: `No document registered for task "${taskTitle}"` 
      });
    }
    
    // Update last modified time to now
    const now = new Date().toISOString();
    driveDocs[taskTitle].lastModified = now;
    
    res.json({ 
      success: true, 
      lastModified: now 
    });
  } catch (error: any) {
    console.error("Error simulating drive edit:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "An error occurred while simulating the edit" 
    });
  }
});

// Endpoint 7: Generate Productivity Insights
app.post("/api/generate-insights", async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks array is required" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `
      You are Heimdall, an elite productivity analyst. Analyze the user's weekly task data and provide insights.
      
      Today's Date: Tuesday, June 23, 2026.
      
      User's tasks for the week:
      ${JSON.stringify(tasks, null, 2)}
      
      Your task is to:
      1. Calculate completion rates by category (thesis, presentation, appointment, break, general)
      2. Identify productivity patterns (e.g., most productive days, times)
      3. Provide actionable recommendations for improvement
      4. Highlight strengths and areas for growth
      
      Return a JSON object matching this schema:
      {
        "overview": {
          "totalTasks": number,
          "completedTasks": number,
          "completionRate": number (0-100),
          "productivityTrend": "improving" | "declining" | "stable"
        },
        "categoryBreakdown": [
          {
            "category": string,
            "total": number,
            "completed": number,
            "completionRate": number (0-100)
          }
        ],
        "dailyPattern": [
          {
            "day": string (e.g., "Monday"),
            "tasksCompleted": number,
            "productivityScore": number (0-100)
          }
        ],
        "insights": [
          {
            "type": "strength" | "opportunity",
            "title": string,
            "description": string
          }
        ],
        "recommendations": [
          {
            "priority": "high" | "medium" | "low",
            "action": string,
            "expectedImpact": string
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.OBJECT,
              properties: {
                totalTasks: { type: Type.INTEGER },
                completedTasks: { type: Type.INTEGER },
                completionRate: { type: Type.NUMBER },
                productivityTrend: { 
                  type: Type.STRING, 
                  enum: ["improving", "declining", "stable"] 
                }
              },
              required: ["totalTasks", "completedTasks", "completionRate", "productivityTrend"]
            },
            categoryBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  total: { type: Type.INTEGER },
                  completed: { type: Type.INTEGER },
                  completionRate: { type: Type.NUMBER }
                },
                required: ["category", "total", "completed", "completionRate"]
              }
            },
            dailyPattern: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  tasksCompleted: { type: Type.INTEGER },
                  productivityScore: { type: Type.NUMBER }
                },
                required: ["day", "tasksCompleted", "productivityScore"]
              }
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["strength", "opportunity"] },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["type", "title", "description"]
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  action: { type: Type.STRING },
                  expectedImpact: { type: Type.STRING }
                },
                required: ["priority", "action", "expectedImpact"]
              }
            }
          },
          required: ["overview", "categoryBreakdown", "dailyPattern", "insights", "recommendations"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.warn("Gemini API call for insights failed, falling back to local analytical calculations:", error.message || error);
    
    // Programmatic backup generator for high-reliability fallback
    const categories = ["thesis", "presentation", "appointment", "break", "general"];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const productivityTrend = completionRate >= 70 ? "improving" : completionRate >= 40 ? "stable" : "declining";

    const categoryBreakdown = categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const catTotal = catTasks.length;
      const catCompleted = catTasks.filter(t => t.completed).length;
      const catRate = catTotal > 0 ? (catCompleted / catTotal) * 100 : 0;
      return {
        category: cat,
        total: catTotal,
        completed: catCompleted,
        completionRate: catRate
      };
    });

    const dailyPattern = days.map(day => {
      const dayTasks = tasks.filter(t => t.day === day);
      const dayTotal = dayTasks.length;
      const dayCompleted = dayTasks.filter(t => t.completed).length;
      const productivityScore = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 50;
      return {
        day,
        tasksCompleted: dayCompleted,
        productivityScore
      };
    });

    const insightsList: any[] = [];
    const recommendationsList: any[] = [];

    if (totalTasks === 0) {
      insightsList.push({
        type: "opportunity",
        title: "Establish Your Weekly Playbook",
        description: "You don't have any tasks logged for this week yet. Start by defining your key thesis, presentation, and daily commitments."
      });
      recommendationsList.push({
        priority: "high",
        action: "Log your first set of academic and general tasks",
        expectedImpact: "Provides a clear visual structure for your week."
      });
    } else {
      if (completionRate >= 60) {
        insightsList.push({
          type: "strength",
          title: "Superb Execution Momentum",
          description: `With a ${completionRate.toFixed(0)}% completion rate, you are translating plans into results with exceptional precision.`
        });
      } else {
        insightsList.push({
          type: "opportunity",
          title: "Tackle High-Impact Commitments",
          description: `Your weekly completion rate sits at ${completionRate.toFixed(0)}%. Focus on completing existing high-priority tasks before scheduling new ones.`
        });
      }

      const thesisCB = categoryBreakdown.find(c => c.category === "thesis");
      if (thesisCB && thesisCB.total > 0) {
        if (thesisCB.completionRate < 50) {
          insightsList.push({
            type: "opportunity",
            title: "Thesis Progress Interinertia",
            description: `Only ${thesisCB.completed} of ${thesisCB.total} thesis milestones are completed. Thesis work requires deep, uninterrupted focus blocks.`
          });
          recommendationsList.push({
            priority: "high",
            action: "Schedule dedicated 90-minute blocks for thesis writing",
            expectedImpact: "Breaks academic inertia and accelerates draft progression."
          });
        } else {
          insightsList.push({
            type: "strength",
            title: "Steady Thesis Progression",
            description: `You have completed ${thesisCB.completed} out of ${thesisCB.total} thesis goals. Keep up the high consistency.`
          });
        }
      }

      if (insightsList.length < 2) {
        insightsList.push({
          type: "strength",
          title: "Structured Time Management",
          description: "Your daily schedule shows a balanced distribution of academic goals and routine appointments."
        });
      }

      recommendationsList.push({
        priority: "medium",
        action: "Implement a 25-minute Pomodoro protocol for general tasks",
        expectedImpact: "Sustains high cognitive performance and avoids mental fatigue."
      });

      recommendationsList.push({
        priority: "low",
        action: "Pre-schedule rest breaks on Wednesday and Thursday evenings",
        expectedImpact: "Prevents mid-week burnout and aids memory consolidation."
      });
    }

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        completionRate,
        productivityTrend
      },
      categoryBreakdown,
      dailyPattern,
      insights: insightsList,
      recommendations: recommendationsList
    });
  }
});

// --- Google Calendar Integration Endpoints ---

// Create Google Calendar Event
app.post("/api/calendar/create-event", async (req, res) => {
  try {
    const { accessToken, event } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    if (!event) {
      return res.status(400).json({ error: "Event data is required" });
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    res.json({ eventId: data.id });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: error.message || "An error occurred while creating the calendar event" });
  }
});

// Update Google Calendar Event
app.post("/api/calendar/update-event", async (req, res) => {
  try {
    const { accessToken, eventId, event } = req.body;
    if (!accessToken || !eventId || !event) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar API responded with status ${response.status}: ${errText}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({ error: error.message || "An error occurred while updating the calendar event" });
  }
});

// Delete Google Calendar Event
app.post("/api/calendar/delete-event", async (req, res) => {
  try {
    const { accessToken, eventId } = req.body;
    if (!accessToken || !eventId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      throw new Error(`Google Calendar API responded with status ${response.status}: ${errText}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({ error: error.message || "An error occurred while deleting the calendar event" });
  }
});

// Check Duplicate Google Calendar Event
app.post("/api/calendar/check-duplicate", async (req, res) => {
  try {
    const { accessToken, summary, startDateTime } = req.body;
    if (!accessToken || !summary || !startDateTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&maxResults=100", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API responded with status ${response.status}`);
    }

    const data = await response.json();
    const events = data.items || [];

    const duplicate = events.find((evt: any) => {
      if (!evt.summary) return false;
      const cleanSummary = evt.summary.replace(/^✅ \[COMPLETED\]\s*/, "");
      const targetSummary = summary.replace(/^✅ \[COMPLETED\]\s*/, "");
      
      const evtStart = evt.start?.dateTime || evt.start?.date || "";
      const targetStart = startDateTime;
      
      return cleanSummary.toLowerCase() === targetSummary.toLowerCase() && 
             evtStart.substring(0, 16) === targetStart.substring(0, 16);
    });

    if (duplicate) {
      return res.json({ isDuplicate: true, eventId: duplicate.id });
    }

    res.json({ isDuplicate: false });
  } catch (error: any) {
    console.error("Error checking duplicate calendar event:", error);
    res.status(500).json({ error: error.message || "An error occurred while checking duplicate" });
  }
});

// List Google Calendar Events
app.post("/api/calendar/list-events", async (req, res) => {
  try {
    const { accessToken, userEmail } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&maxResults=150", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const events = data.items || [];

    const filteredEvents = events.filter((evt: any) => {
      const organizerEmail = evt.organizer?.email;
      const isOrganizerUser = evt.organizer?.self === true || (organizerEmail && organizerEmail === userEmail);
      
      if (!isOrganizerUser) return false;
      if (evt.eventType && evt.eventType !== 'default') return false;
      
      const summaryLower = (evt.summary || '').toLowerCase();
      if (summaryLower.includes('holiday') || summaryLower.includes('birthday') || summaryLower.includes('anniversary')) {
        return false;
      }
      
      if (evt.transparency === 'transparent') {
        if (summaryLower.includes('holiday') || summaryLower.includes('birthday')) return false;
      }

      return true;
    });

    res.json({ events: filteredEvents });
  } catch (error: any) {
    console.error("Error listing calendar events:", error);
    res.status(500).json({ error: error.message || "An error occurred while listing calendar events" });
  }
});

// Configure Vite or Static Production Serve

// Configure Vite or Static Production Serve
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Heimdall Server] Active and running on http://localhost:${PORT}`);
  });
}

initServer();