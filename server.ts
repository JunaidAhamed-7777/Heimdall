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
    const { messages, currentSchedule, currentHabits = [], currentDay = "Tuesday" } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message payload." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
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

      Your goals: 1. Address the user's message thoughtfully.
      2. Under the hood, you can invoke actions via the JSON "action" property depending on the conversation phase:
      - "suggest_schedule": Use this when recommending or presenting a list of tasks/schedule to the user.
      - "create_calendar_events": After presenting a schedule, if the user explicitly confirms or expresses approval (e.g., "looks good", "yes", "confirm", "do it"), immediately call "create_calendar_events" with the confirmed events. Do NOT call this automatically without user consent.
      - "add_habit": When a user agrees to start a brand-new habit or tracker. Parameters: {"habit_name": string, "frequency": string, "preferred_time"?: string, "duration_minutes"?: number}.
      - "log_habit": When a user says they completed or did a habit today. Parameters: {"habit_name": string, "date"?: string}.
      - "check_habit_status": Proactively check the list of habits for slips. Parameters: {"days_to_check": number}.

      3. **Onboarding & Setup**: Early in the first conversation, after learning about the user's tasks, ask: "Would you like me to help you build some daily habits? Things like exercise, reading, or meditation can be scheduled just like tasks. What's one small habit you'd like to start?"
      - When they describe a habit, trigger the "add_habit" action.

      4. **Daily Check-Ins & Nudges**: If the user simulates a morning/new day or asks about habit status, check their habits.
      - If all habits are on track, give quick positive reinforced celebration.
      - If a habit has been missed for 2 days: "I noticed you haven't meditated in 2 days. Want me to block 10 minutes this morning to get back on track?"
      - If a habit has been missed for 3+ days: "You've lost your 12-day meditation streak. Let's restart today — I've already blocked 07:30–07:40 for you. Just confirm and I'll add it to the calendar." Then call "suggest_schedule" or be ready to schedule!

      5. Always return a valid JSON object matching this schema:
      {
        "advisorResponse": "Your written advice",
        "updatedTasks": [ ... optional list of updated tasks ... ] or null,
        "action": {
          "name": "suggest_schedule" | "create_calendar_events" | "add_habit" | "log_habit" | "check_habit_status",
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
                name: { type: Type.STRING },
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
- ACTION_REQUIRED: The email demands some action from the user (e.g., "Please submit", "Review required", "Action needed").
- EVENT_CONFIRMED: The email confirms that an event/appointment/booking has been confirmed.
- INFO: The email shares information without requiring immediate action.
- UNRELATED: Spam, personal messages, etc.

2. Provide a reason explaining your choice.
3. Include a confidence score (0-100).

Return a JSON object matching this schema:
{
  "classification": "ACTION_REQUIRED" | "EVENT_CONFIRMED" | "INFO" | "UNRELATED",
  "reason": "string",
  "confidence": number
}

Examples:
1) Email: "Hi there, please review the attached document and provide feedback by EOD Friday."
Output: {"classification": "ACTION_REQUIRED", "reason": "Email explicitly requests user action", "confidence": 98}

2) Email: "Your dentist appointment is confirmed for Wednesday, June 24 at 2:30 PM"
Output: {"classification": "EVENT_CONFIRMED", "reason": "Email confirms an appointment", "confidence": 100}
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