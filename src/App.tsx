import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  BookOpen,
  Presentation,
  Stethoscope,
  Coffee,
  CheckCircle2,
  Circle,
  Send,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Plus,
  Trash2,
  Undo2,
  Sparkles,
  HelpCircle,
  Play,
  Check,
  ChevronRight,
  Info,
  CalendarDays,
  Zap,
  RotateCcw,
  Download,
  Mail,
  FileCode,
  Flame,
  Award,
  TrendingUp
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { TaskItem, ChatMessage, ScheduleBlueprint } from "./types";
import { INITIAL_TASKS, INITIAL_MOTIF } from "./utils/initialData";

// Helper function to generate an ICS calendar content string
const generateICSFile = (events: Array<{ title: string; day: string; start_time: string; end_time: string }>): string => {
  const icsLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Heimdall Productivity Companion//NONSGML v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  events.forEach((evt, idx) => {
    if (!evt) return;
    const titleVal = evt.title || "Task Block";
    const dayVal = typeof evt.day === "string" ? evt.day : "2026-06-23";
    const startTimeVal = typeof evt.start_time === "string" ? evt.start_time : "09:00";
    const endTimeVal = typeof evt.end_time === "string" ? evt.end_time : "10:00";

    // day comes in format "YYYY-MM-DD", let's remove dashes -> "YYYYMMDD"
    const datePart = dayVal.replace(/-/g, "");
    // start_time / end_time comes in "HH:MM", let's format -> "HHMM00"
    const startPart = startTimeVal.replace(/:/g, "") + "00";
    const endPart = endTimeVal.replace(/:/g, "") + "00";

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:heimdall-event-${Date.now()}-${idx}@heimdall.ai`);
    icsLines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    icsLines.push(`DTSTART:${datePart}T${startPart}`);
    icsLines.push(`DTEND:${datePart}T${endPart}`);
    icsLines.push(`SUMMARY:${titleVal}`);
    icsLines.push("DESCRIPTION:Scheduled via Heimdall Executive Productivity Companion.");
    icsLines.push("END:VEVENT");
  });

  icsLines.push("END:VCALENDAR");
  return icsLines.join("\r\n");
};

// Safe wrapper for iframe localStorage compatibility
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("Storage item fetch failed:", e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("Storage item save failed:", e);
    }
  }
};

// Safe helper for prompt confirmations that doesn't crash on sandboxed iframes
const safeConfirm = (message: string): boolean => {
  try {
    if (typeof window !== "undefined" && window.confirm) {
      return window.confirm(message);
    }
  } catch (e) {
    console.warn("Confirm dialog blocked, auto-confirming", e);
  }
  return true; // Bypass confirmation in highly secure sandbox frames
};

export default function App() {
  // --- Persistent States (backed by safe localStorage) ---
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = safeStorage.getItem("heimdall_tasks");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_TASKS;
  });

  const [motif, setMotif] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem("heimdall_motif");
      return saved || INITIAL_MOTIF;
    } catch {
      return INITIAL_MOTIF;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = safeStorage.getItem("heimdall_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: "msg-1",
        role: "model",
        content: "Hello! I am Heimdall, your executive productivity advisor. I keep an eye on your Gmail for any confirmations — bookings, registrations, appointments — so I can automatically add them to your calendar. You can also discuss rescheduling, request advice, or update your progress. Let's bypass stress with precise execution.",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  // --- App View & Simulation States ---
  const [currentView, setCurrentView] = useState<"protocol" | "chat">("protocol");
  const [simulatedDay, setSimulatedDay] = useState<string>("Wednesday");
  const [allDaysList] = useState<string[]>(["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday"]);

  // --- Habits & Goals Tracking States ---
  const [habits, setHabits] = useState<any[]>(() => {
    try {
      const saved = safeStorage.getItem("heimdall_habits");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    // Seed standard high-fidelity initial habits for the Thesis draft Author context!
    return [
      {
        id: "habit-1",
        name: "Morning Meditation",
        frequency: "daily",
        preferred_time: "07:30",
        duration_minutes: 10,
        streak: 3,
        lastCompletedDate: "2026-06-22", // Monday (Yesterday)
        history: ["2026-06-20", "2026-06-21", "2026-06-22"],
        createdAt: "2026-06-20"
      },
      {
        id: "habit-2",
        name: "Thesis Writing Block",
        frequency: "daily",
        preferred_time: "09:00",
        duration_minutes: 120,
        streak: 5,
        lastCompletedDate: "2026-06-22", // Monday (Yesterday)
        history: ["2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22"],
        createdAt: "2026-06-18"
      }
    ];
  });
  const [streakBadgeAlert, setStreakBadgeAlert] = useState<{ habitName: string; streak: number } | null>(null);
  const [showAddHabitForm, setShowAddHabitForm] = useState<boolean>(false);
  const [newHabitName, setNewHabitName] = useState<string>("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly" | "custom">("daily");
  const [newHabitTime, setNewHabitTime] = useState<string>("07:30");
  const [newHabitDur, setNewHabitDur] = useState<number>(10);
  
  // --- Inline Motif Editing States ---
  const [isEditingMotif, setIsEditingMotif] = useState<boolean>(false);
  const [tempMotif, setTempMotif] = useState<string>("");
  
  const habitsRef = useRef<any[]>(habits);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);
  
  // --- Form & Interactive States ---
  const [chatInput, setChatInput] = useState<string>("");
  const [rawPromptInput, setRawPromptInput] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [scheduleAlertVisible, setScheduleAlertVisible] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // --- Gmail Monitoring Integration States ---
  const [gmailToken, setGmailToken] = useState<string | null>(() => {
    return safeStorage.getItem("heimdall_gmail_token") || null;
  });
  const [gmailUser, setGmailUser] = useState<any>(() => {
    try {
      const savedUser = safeStorage.getItem("heimdall_gmail_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [gmailProcessedIds, setGmailProcessedIds] = useState<string[]>(() => {
    try {
      const savedIds = safeStorage.getItem("heimdall_gmail_processed_ids");
      return savedIds ? JSON.parse(savedIds) : [];
    } catch {
      return [];
    }
  });

  // Keep a mutable ref of processed IDs to avoid closure staleness and infinite loops
  const processedIdsRef = useRef<string[]>(gmailProcessedIds);
  useEffect(() => {
    processedIdsRef.current = gmailProcessedIds;
  }, [gmailProcessedIds]);

  const [isCheckingGmail, setIsCheckingGmail] = useState<boolean>(false);
  const [lastGmailCheck, setLastGmailCheck] = useState<string | null>(null);
  
  // Custom paste simulation modal fields
  const [showPasteEmailModal, setShowPasteEmailModal] = useState<boolean>(false);
  const [pasteSubject, setPasteSubject] = useState<string>("");
  const [pasteSender, setPasteSender] = useState<string>("");
  const [pasteBody, setPasteBody] = useState<string>("");

  // Helper: map a date (e.g. "2026-06-23") back to simulated day label
  const getDayLabelFromDate = (dateStr: string): string => {
    const mapping: { [key: string]: string } = {
      "2026-06-23": "Tuesday",
      "2026-06-24": "Wednesday",
      "2026-06-25": "Thursday",
      "2026-06-26": "Friday",
      "2026-06-27": "Saturday",
      "2026-06-28": "Sunday",
      "2026-06-29": "Monday",
    };
    return mapping[dateStr] || "Wednesday";
  };

  // Helper: check if two hourly ranges overlap
  const checkTimeOverlap = (rangeA: string, rangeB: string): boolean => {
    const parseTime = (tStr: string) => {
      const parts = tStr.trim().split(":");
      const h = parseInt(parts[0] || "0", 10);
      const m = parseInt(parts[1] || "0", 10);
      return h * 60 + m;
    };
    
    try {
      const [startAStr, endAStr] = rangeA.split("-");
      const [startBStr, endBStr] = rangeB.split("-");
      if (!startAStr || !endAStr || !startBStr || !endBStr) return false;
      
      const startA = parseTime(startAStr);
      const endA = parseTime(endAStr);
      const startB = parseTime(startBStr);
      const endB = parseTime(endBStr);
      
      return Math.max(startA, startB) < Math.min(endA, endB);
    } catch {
      return false; 
    }
  };

  // Helper: check if an event is a duplicate on the schedule/calendar
  const checkDuplicateEvent = (evtDate: string, startTime: string, title: string) => {
    const dayLabel = getDayLabelFromDate(evtDate);
    return tasks.some((t) => {
      if (!t) return false;
      const matchDay = t.day.toLowerCase() === dayLabel.toLowerCase();
      const matchTitle = t.task.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(t.task.toLowerCase());
      const matchTime = t.time.includes(startTime);
      return matchDay && (matchTitle || matchTime);
    });
  };

  // --- Calendar Integration States ---
  const [createdEvents, setCreatedEvents] = useState<Array<{ title: string; day: string; start_time: string; end_time: string }> | null>(null);
  const [calendarSummary, setCalendarSummary] = useState<string | null>(null);
  const [downloadIcsUrl, setDownloadIcsUrl] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  const create_calendar_events = (
    events: Array<{ title: string; day: string; start_time: string; end_time: string }>,
    summary: string
  ) => {
    console.log("create_calendar_events called with:", events, summary);
    if (!events || !Array.isArray(events)) {
      console.warn("create_calendar_events called with invalid events array");
      return;
    }
    setCreatedEvents(events);
    setCalendarSummary(summary);
    setShowCalendarModal(true);

    try {
      const icsText = generateICSFile(events);
      const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      setDownloadIcsUrl(url);
    } catch (e) {
      console.error("Error generating ICS file:", e);
    }
  };

  // Handler to process newly found/extracted events
  const handleNewExtractedEvent = async (eventData: any) => {
    if (!eventData.event_date || !eventData.event_name) return;

    const eventTitle = eventData.event_name;
    const eventDate = eventData.event_date; 
    const resolvedDayName = getDayLabelFromDate(eventDate);
    const startTime = eventData.start_time || "09:00";
    const endTime = eventData.end_time || "10:00";
    const timeRange = `${startTime} - ${endTime}`;

    let durationStr = "1 hour";
    try {
      const parseTime = (tStr: string) => {
        const parts = tStr.split(":");
        const h = parseInt(parts[0] || "0", 10);
        const m = parseInt(parts[1] || "0", 10);
        return h * 60 + m;
      };
      const diffMins = parseTime(endTime) - parseTime(startTime);
      if (diffMins > 0) {
        const hrs = diffMins / 60;
        durationStr = hrs === 1 ? "1 hour" : `${hrs} hours`;
      }
    } catch {}

    if (checkDuplicateEvent(eventDate, startTime, eventTitle)) {
      console.log(`Skipping duplicate event: ${eventTitle} on ${eventDate}`);
      return;
    }

    const singleEventArray = [{
      title: eventTitle,
      day: eventDate,
      start_time: startTime,
      end_time: endTime
    }];
    
    create_calendar_events(singleEventArray, `Discovered confirmation in your inbox. Extracted event: ${eventTitle}.`);

    const newTaskObj: TaskItem = {
      id: `gmail-task-${Date.now()}`,
      day: resolvedDayName,
      time: timeRange,
      task: eventTitle,
      duration: durationStr,
      category: "appointment",
      completed: false,
      description: `Discovered and auto-extracted from your messages. Sent by: ${eventData.from || "Simulated Source"}`
    };

    const conflictingTasks = tasks.filter(t => 
      t && t.day.toLowerCase() === resolvedDayName.toLowerCase() && checkTimeOverlap(t.time, timeRange)
    );

    setTasks((prev) => [...prev, newTaskObj]);

    let conflictWarningMessage = "";
    if (conflictingTasks.length > 0) {
      const conflictNames = conflictingTasks.map(t => `"${t.task}" (${t.time})`).join(", ");
      conflictWarningMessage = `\n\n⚠️ **CONFLICT DETECTED**: This overlaps with your existing scheduled block(s): ${conflictNames}. Would you like me to adjust your timetable to reschedule them?`;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-extracted-${Date.now()}`,
        role: "model",
        content: `I just found a confirmation in your Gmail: **${eventTitle}** on ${resolvedDayName} (${eventDate}) at ${timeRange} and added it to your calendar. 📅 Since you now have ${eventTitle} on ${resolvedDayName}, should I adjust your schedule to make room?${conflictWarningMessage}`,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Gmail OAuth popup triggers
  const handleConnectGmail = async () => {
    setApiError(null);
    try {
      const res = await fetch("/firebase-applet-config.json");
      if (!res.ok) {
        throw new Error("Local backend firebase-applet-config.json is not configured yet. Please use the simulated Paste Fallback to test!");
      }
      const config = await res.json();
      const app = initializeApp(config);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const token = credential.accessToken;
        setGmailToken(token);
        safeStorage.setItem("heimdall_gmail_token", token);
        
        if (result.user) {
          const userObj = {
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
          };
          setGmailUser(userObj);
          safeStorage.setItem("heimdall_gmail_user", JSON.stringify(userObj));
        }
        
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-gmail-${Date.now()}`,
            role: "model",
            content: `🔓 Gmail connected successfully! I am now monitoring your mailbox in the background for confirmation events.`,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error("Could not acquire an OAuth access token from Google.");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to authenticate. Running in simulated fallback mode.");
    }
  };

  const handleDisconnectGmail = () => {
    setGmailToken(null);
    setGmailUser(null);
    safeStorage.setItem("heimdall_gmail_token", "");
    safeStorage.setItem("heimdall_gmail_user", "");
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-gmail-${Date.now()}`,
        role: "model",
        content: `🔒 Gmail disconnected. Background email monitoring is now inactive.`,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Gmail inbox check service scan caller
  const checkGmailInbox = async (explicitToken?: string) => {
    const token = explicitToken || gmailToken;
    if (!token) return;

    setIsCheckingGmail(true);
    try {
      const res = await fetch("/api/check-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          processedIds: processedIdsRef.current,
        }),
      });

      if (res.status === 401) {
        handleDisconnectGmail();
        setApiError("Your connected Google/Gmail session has expired. Please authorize again.");
        return;
      }

      const data = await res.json();
      if (data.analyzedEmails && Array.isArray(data.analyzedEmails)) {
        const newlyProcessedIds = [...processedIdsRef.current];
        
        for (const email of data.analyzedEmails) {
          if (!email || !email.id) continue;
          newlyProcessedIds.push(email.id);

          if (email.classification === "CONFIRMED_EVENT") {
            await handleNewExtractedEvent(email);
          }
        }

        setGmailProcessedIds(newlyProcessedIds);
        safeStorage.setItem("heimdall_gmail_processed_ids", JSON.stringify(newlyProcessedIds));
        setLastGmailCheck(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (e: any) {
      console.error("Failed to check Gmail inbox:", e);
    } finally {
      setIsCheckingGmail(false);
    }
  };

  // Background polling effect
  useEffect(() => {
    if (gmailToken) {
      checkGmailInbox();
      
      const interval = setInterval(() => {
        checkGmailInbox();
      }, 45000); 
      return () => clearInterval(interval);
    }
  }, [gmailToken]);

  // Bind to window for testability and runtime correctness
  const createCalendarEventsRef = useRef(create_calendar_events);
  useEffect(() => {
    createCalendarEventsRef.current = create_calendar_events;
  });

  useEffect(() => {
    (window as any).create_calendar_events = (...args: any[]) => {
      if (createCalendarEventsRef.current) {
        (createCalendarEventsRef.current as any)(...args);
      }
    };
    return () => {
      delete (window as any).create_calendar_events;
    };
  }, []);

  // --- Spinner/Loading States ---
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState<boolean>(false);
  const [isLoadingRegen, setIsLoadingRegen] = useState<boolean>(false);

  // --- Active New Task Form Fields ---
  const [newTaskName, setNewTaskName] = useState<string>("");
  const [newTaskDay, setNewTaskDay] = useState<string>("Wednesday");
  const [newTaskTime, setNewTaskTime] = useState<string>("09:00 - 10:30");
  const [newTaskDuration, setNewTaskDuration] = useState<string>("1.5 hours");
  const [newTaskCategory, setNewTaskCategory] = useState<"thesis" | "presentation" | "appointment" | "break" | "general">("thesis");
  const [newTaskDesc, setNewTaskDesc] = useState<string>("");

  // Sync to localStorage on change safely
  useEffect(() => {
    safeStorage.setItem("heimdall_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeStorage.setItem("heimdall_motif", motif);
  }, [motif]);

  useEffect(() => {
    safeStorage.setItem("heimdall_chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    safeStorage.setItem("heimdall_habits", JSON.stringify(habits));
  }, [habits]);

  // Track simulated day transitions to execute proactive audits automatically!
  const prevDayRef = useRef<string>(simulatedDay);
  useEffect(() => {
    if (prevDayRef.current !== simulatedDay) {
      prevDayRef.current = simulatedDay;
      handleProactiveDayTransition(simulatedDay);
    }
  }, [simulatedDay]);

  // --- Habits & Goals Tracking Core Engines ---
  const getSimulatedDate = (day: string): string => {
    const mapping: { [key: string]: string } = {
      "Tuesday": "2026-06-23",
      "Wednesday": "2026-06-24",
      "Thursday": "2026-06-25",
      "Friday": "2026-06-26",
      "Saturday": "2026-06-27",
      "Sunday": "2026-06-28",
      "Monday": "2026-06-29"
    };
    return mapping[day] || "2026-06-23";
  };

  const getSimulatedDateIndex = (dateStr: string): number => {
    const dates = [
      "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22", // Past dates
      "2026-06-23", // Tue
      "2026-06-24", // Wed
      "2026-06-25", // Thu
      "2026-06-26", // Fri
      "2026-06-27", // Sat
      "2026-06-28", // Sun
      "2026-06-29"  // Mon
    ];
    if (!dateStr) return -1;
    const idx = dates.indexOf(dateStr);
    if (idx !== -1) return idx;
    try {
      const baseDate = new Date("2026-06-23");
      const target = new Date(dateStr);
      const diffTime = target.getTime() - baseDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return 5 + diffDays;
    } catch {
      return -1;
    }
  };

  const getYesterdayDate = (dateStr: string): string => {
    const dates = [
      "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22",
      "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28", "2026-06-29"
    ];
    if (!dateStr) return "";
    const idx = dates.indexOf(dateStr);
    if (idx > 0) return dates[idx - 1];
    return "";
  };

  // 1. Add Habit
  const executeAddHabit = (name: string, frequency: "daily" | "weekly" | "custom" = "daily", preferredTime?: string, durMinutes?: number) => {
    if (!name || typeof name !== "string" || !name.trim()) return;
    
    const cleanName = name.trim();
    // Skip if already exists
    if (habitsRef.current.some(h => h.name && h.name.toLowerCase() === cleanName.toLowerCase())) {
      return;
    }

    const newHab = {
      id: "habit-" + Date.now(),
      name: cleanName,
      frequency: frequency,
      preferred_time: preferredTime || "morning",
      duration_minutes: durMinutes || 10,
      streak: 0,
      history: [],
      createdAt: getSimulatedDate(simulatedDay)
    };

    setHabits(prev => {
      const updated = [...prev, newHab];
      safeStorage.setItem("heimdall_habits", JSON.stringify(updated));
      return updated;
    });

    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-add-habit-${Date.now()}`,
        role: "model",
        content: `⚡ **Success:** Added new habit tracker: **${cleanName}** (${frequency}, scheduled at ${preferredTime || "morning"}). I've initialized your streak! Let's execute this together.`,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Backend hit for alignment
    fetch("/api/habit/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habit_name: cleanName,
        frequency,
        preferred_time: preferredTime,
        duration_minutes: durMinutes
      })
    }).catch(err => console.error("Habit register log err:", err));
  };

  // 2. Log Habit Completion
  const executeLogHabit = (habitIdOrName: string, dateStr?: string) => {
    if (!habitIdOrName || typeof habitIdOrName !== "string") return;
    const targetDate = dateStr || getSimulatedDate(simulatedDay);
    let habitToCelebrate: any = null;

    setHabits(prev => {
      const updated = prev.map(h => {
        const isMatch = h.id === habitIdOrName || (h.name && h.name.toLowerCase() === habitIdOrName.toLowerCase());
        if (isMatch) {
          if (h.history.includes(targetDate)) return h; // Already done

          const newHistory = [...h.history, targetDate].sort();
          let newStreak = h.streak || 0;
          const yesterdayDate = getYesterdayDate(targetDate);

          if (h.lastCompletedDate === yesterdayDate || !h.lastCompletedDate || h.streak === 0) {
            newStreak += 1;
          } else if (h.lastCompletedDate === targetDate) {
            // Already logged
          } else {
            // Streak reset
            newStreak = 1;
          }

          habitToCelebrate = { ...h, streak: newStreak, lastCompletedDate: targetDate, history: newHistory };
          return habitToCelebrate;
        }
        return h;
      });
      safeStorage.setItem("heimdall_habits", JSON.stringify(updated));
      return updated;
    });

    // Celebrate Milestone Badge
    if (habitToCelebrate) {
      const currentStreak = habitToCelebrate.streak;
      if (currentStreak === 1 || currentStreak === 3 || currentStreak === 7 || currentStreak === 14 || currentStreak === 30 || currentStreak === 100) {
        setStreakBadgeAlert({
          habitName: habitToCelebrate.name,
          streak: currentStreak
        });
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-log-habit-${Date.now()}`,
          role: "model",
          content: `🔥 **Completed:** Marked **${habitToCelebrate.name}** as done on ${targetDate}! Current streak: **${currentStreak} days**. ${
            currentStreak >= 5 ? "Incredible stamina! Keep piling up the wins." : "Outstanding launch! Solid block checked."
          }`,
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }

    fetch("/api/habit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_name: habitIdOrName, date: targetDate })
    }).catch(err => console.error("Habit completion log err:", err));
  };

// 3. Check Habit Status (queries status for nudges)
   const executeCheckHabitStatus = (daysToCheck: number = 3) => {
     const todayDateStr = getSimulatedDate(simulatedDay);
     const todayIdx = getSimulatedDateIndex(todayDateStr);

     const reports = habitsRef.current.map(h => {
       const lastCompletedVal = h.lastCompletedDate || h.createdAt;
       if (!lastCompletedVal) {
         return { name: h.name, daysSince: daysToCheck, streak: h.streak || 0 };
       }
       const lastCompletedIdx = getSimulatedDateIndex(lastCompletedVal);
       const daysSince = lastCompletedIdx !== -1 ? (todayIdx - lastCompletedIdx) : daysToCheck;
       return { name: h.name, daysSince, streak: h.streak || 0 };
     });

     console.log("Habit status audits executed:", reports);
     return reports;
   };

   // Register a Google Drive document for a task
   const executeRegisterDriveDocument = async (taskTitle: string, fileIdOrUrl: string) => {
     if (!taskTitle || !fileIdOrUrl) {
       setChatMessages(prev => [
         ...prev,
         {
           id: `msg-drive-reg-error-${Date.now()}`,
           role: "model",
           content: "I need both a task title and a file ID or URL to register your document.",
           timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
         }
       ]);
       return;
     }

     // Extract file ID from Google Drive URL if needed
     let fileId = fileIdOrUrl.trim();
     if (fileId.includes("drive.google.com")) {
       // Try to extract file ID from common Google Drive URL patterns
       const patterns = [
         /\/d\/([a-zA-Z0-9_-]+)/, // Standard format: https://drive.google.com/file/d/FILE_ID/view
         /[?&]id=([a-zA-Z0-9_-]+)/, // Parameter format: https://drive.google.com/?id=FILE_ID
         /\/file\/d\/([a-zA-Z0-9_-]+)/ // Alternative format
       ];
       
       for (const pattern of patterns) {
         const match = fileId.match(pattern);
         if (match && match[1]) {
           fileId = match[1];
           break;
         }
       }
       
       // If we couldn't extract an ID, show an error
       if (fileId === fileIdOrUrl.trim() && fileId.includes("drive.google.com")) {
         setChatMessages(prev => [
           ...prev,
           {
             id: `msg-drive-reg-error-${Date.now()}`,
             role: "model",
             content: "I couldn't extract a file ID from the Google Drive link you provided. Please share just the file ID or make sure the link is in a standard format.",
             timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
           }
         ]);
         return;
       }
     }

     try {
       const response = await fetch("/api/register-drive-document", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ taskTitle, fileId })
       });

       if (!response.ok) {
         throw new Error(`Registration failed: ${response.status}`);
       }

       const data = await response.json();

       // Update the task with the driveFileId
       setTasks(prev =>
         prev.map(task =>
           task.task === taskTitle
             ? { ...task, driveFileId: fileId }
             : task
         )
       );

       setChatMessages(prev => [
         ...prev,
         {
           id: `msg-drive-reg-success-${Date.now()}`,
           role: "model",
           content: data.message || `Got it! I'll keep an eye on your "${taskTitle}" document.`,
           timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
         }
       ]);
     } catch (error) {
       console.error("Error registering drive document:", error);
       setChatMessages(prev => [
         ...prev,
         {
           id: `msg-drive-reg-error-${Date.now()}`,
           role: "model",
           content: "I had trouble registering your document. Please try again.",
           timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
         }
       ]);
     }
   };



   // 5. Detect schedule gaps and match micro-tasks
   const executeDetectGapsAndNudge = async () => {
    const parseTimeStr = (tStr: string) => {
      const parts = tStr.trim().split(":");
      const h = parseInt(parts[0] || "0", 10);
      const m = parseInt(parts[1] || "0", 10);
      return h * 60 + m;
    };

    const formatMins = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    const scheduleItems = tasks
      .filter(t => t.time && t.time !== "Unscheduled" && t.time.includes(":") && t.day === simulatedDay)
      .map(t => {
        const durMatch = t.duration.match(/(\d+)/);
        const durationMins = durMatch ? parseInt(durMatch[1], 10) : 30;
        const startMin = parseTimeStr(t.time);
        const endMin = startMin + durationMins;
        return {
          title: t.task,
          start_time: t.time,
          end_time: formatMins(endMin)
        };
      });

    const taskPool = tasks
      .filter(t => !t.completed && t.day === simulatedDay)
      .map(t => {
        const durMatch = t.duration.match(/(\d+)/);
        const durationMins = durMatch ? parseInt(durMatch[1], 10) : 30;
        return {
          title: t.task,
          estimated_duration_minutes: durationMins,
          priority: t.category === "thesis" || t.category === "presentation" ? "high" : "medium"
        };
      });

    const habitsPayload = habits.map(h => ({
      name: h.name,
      duration_minutes: h.duration_minutes || 15
    }));

    try {
      const res = await fetch("/api/detect-gaps-and-nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: scheduleItems,
          task_pool: taskPool,
          habits: habitsPayload,
          user_preferences: { nudge_enabled: true }
        })
      });

      if (!res.ok) {
        throw new Error(`Gaps service returned status ${res.status}`);
      }

      const result = await res.json();
      if (result.nudge_message) {
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg-nudge-scan-${Date.now()}`,
            role: "model",
            content: result.nudge_message,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      console.error("Failed to detect gaps and nudge:", err);
    }
  };

   // Check drive documents for inactivity and send nudges if needed
   const executeCheckDriveDocuments = async () => {
     try {
       // Get all tasks that have driveFileId
       const tasksWithDriveFiles = tasks.filter(task => task.driveFileId);
       
       if (tasksWithDriveFiles.length === 0) {
         setChatMessages(prev => [
           ...prev,
           {
             id: `msg-drive-none-${Date.now()}`,
             role: "model",
             content: "You haven't registered any Google Drive documents yet. When you mention working on a document, I'll ask if it's in Google Drive so I can help you stay on track.",
             timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
           }
         ]);
         return;
       }

       // Check each document
       for (const task of tasksWithDriveFiles) {
         try {
           const response = await fetch(`/api/check-drive-document?taskTitle=${encodeURIComponent(task.task)}`);
           
           if (!response.ok) {
             throw new Error(`Failed to check document for task: ${task.task}`);
           }
           
           const data = await response.json();
           
           // If document hasn't been edited in over 2 days and task is not completed
           if (data.daysSinceLastEdit > 2 && !task.completed) {
             setChatMessages(prev => [
               ...prev,
               {
                 id: `msg-drive-nudge-${task.id}-${Date.now()}`,
                 role: "model",
                 content: `I noticed you haven't edited your "${task.task}" document in ${data.daysSinceLastEdit} days. Want me to block some time this afternoon to get back into it?`,
                 timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
               }
             ]);
           } else if (data.daysSinceLastEdit <= 2 && !task.completed) {
             // Positive reinforcement for recently edited documents
             setChatMessages(prev => [
               ...prev,
               {
                 id: `msg-drive-positive-${task.id}-${Date.now()}`,
                 role: "model",
                 content: `Great job! I see you worked on your "${task.task}" document ${data.daysSinceLastEdit === 0 ? 'today' : 'yesterday'}. Keep that momentum going!`,
                 timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
               }
             ]);
           }
         } catch (docError) {
           console.error(`Error checking document for task ${task.task}:`, docError);
           // Continue with other documents even if one fails
         }
       }
     } catch (error) {
       console.error("Error checking drive documents:", error);
       setChatMessages(prev => [
         ...prev,
         {
           id: `msg-drive-error-${Date.now()}`,
           role: "model",
           content: "I encountered an error checking your documents. Please try again later.",
           timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
         }
       ]);
     }
   };

   // Proactive Day Transition audit (runs trigger when user swaps 'Simulate Day')
   const handleProactiveDayTransition = (newDay: string) => {
     const todayDateStr = getSimulatedDate(newDay);
     const todayIdx = getSimulatedDateIndex(todayDateStr);

     let nudgesGenerated = 0;
     const currentLatestHabits = habitsRef.current;

     currentLatestHabits.forEach(h => {
       const lastCompletedVal = h.lastCompletedDate || h.createdAt;
       if (!lastCompletedVal) return;
       const lastIdx = getSimulatedDateIndex(lastCompletedVal);
       if (lastIdx === -1) return;
       const diffDays = todayIdx - lastIdx;

       if (diffDays === 2) {
         // Missed for 2 days nudge
         nudgesGenerated++;
         setTimeout(() => {
           setChatMessages(prev => [
             ...prev,
             {
               id: `msg-nudge-2-${Date.now()}-${h.id}`,
               role: "model",
               content: `⚠️ **Heimdall Audit:** I noticed you haven't logged **${h.name}** in 2 days. Want me to block ${h.duration_minutes || 10} minutes this morning to get back on track?`,
               timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
             }
           ]);
         }, 500 * nudgesGenerated);
       } else if (diffDays >= 3) {
         // Lost streak warning
         nudgesGenerated++;
         setTimeout(() => {
           // Setup suggestions automatically as high priority task!
           const blockStartTime = h.preferred_time && h.preferred_time.includes(":") ? h.preferred_time : "07:30";
           let startMin = 7 * 60 + 30; // default 07:30
           if (blockStartTime.includes(":")) {
             const parts = blockStartTime.split(":");
             const hrs = parseInt(parts[0], 10);
             const mins = parseInt(parts[1], 10);
             if (!isNaN(hrs) && !isNaN(mins)) {
               startMin = hrs * 60 + mins;
             }
           }
           const endMin = startMin + (h.duration_minutes || 10);
           const blockEndTime = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;

           setChatMessages(prev => [
             ...prev,
             {
               id: `msg-nudge-3-${Date.now()}-${h.id}`,
               role: "model",
               content: `💔 **Heimdall Alert:** You've lost your ${h.streak || 0}-day **${h.name}** streak. Let's restart today — "Life happens, let's get back on track together." I've already blocked out **${blockStartTime}–${blockEndTime}** for you as a high-priority self-care session. Just confirm and I'll add it to your calendar!`,
               timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
             }
           ]);
         }, 500 * nudgesGenerated);
       }
     });

     if (nudgesGenerated === 0 && currentLatestHabits.length > 0) {
       // All habits are on track, congratulate!
       setTimeout(() => {
         setChatMessages(prev => [
           ...prev,
           {
             id: `msg-nudge-ok-${Date.now()}`,
             role: "model",
             content: `🌟 **Protocol Clear:** All daily habits are on track! You've maintained consistency beautifully. "You have logged habits successfully! 🔥" Let's keep the streak thriving!`,
             timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
           }
         ]);
       }, 500);
     }
     
     // Also check drive documents for inactivity
     executeCheckDriveDocuments();
   };


  // --- Dynamic Calculator Helpers ---
  const parseDurationHours = (durStr: string | undefined | null): number => {
    if (!durStr || typeof durStr !== "string") return 1;
    const match = durStr.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  };

  // Calculates workload sums
  const getWeeklyHoursByDay = (dayName: string): number => {
    return tasks
      .filter((t) => t && t.day && typeof t.day === "string" && t.day.toLowerCase() === dayName.toLowerCase())
      .reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
  };

  // Resource Allocation percentages
  const thesisTasks = tasks.filter((t) => t && t.category === "thesis");
  const totalThesisHours = thesisTasks.reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
  const completedThesisHours = thesisTasks
    .filter((t) => t && t.completed)
    .reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
  const thesisPercent = totalThesisHours > 0 ? Math.round((completedThesisHours / totalThesisHours) * 100) : 0;

  const presentationTasks = tasks.filter((t) => t && t.category === "presentation");
  const totalPresHours = presentationTasks.reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
  const completedPresHours = presentationTasks
    .filter((t) => t && t.completed)
    .reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
  const presPercent = totalPresHours > 0 ? Math.round((completedPresHours / totalPresHours) * 100) : 0;

  // Deadline Counter computation helper
  const getSimulatedMilestoneCountdown = () => {
    const dayIndices: { [key: string]: number } = {
      Tuesday: 0,
      Wednesday: 1,
      Thursday: 2,
      Friday: 3,
      Saturday: 4,
      Sunday: 5,
      Monday: 6,
    };
    const currentIdx = dayIndices[simulatedDay] ?? 1;
    const targetIdx = dayIndices["Friday"];
    const diffDays = targetIdx - currentIdx;
    
    if (diffDays > 0) {
      return `${diffDays * 24} hrs`;
    } else if (diffDays === 0) {
      return `8 hrs`;
    } else {
      return "Submitted";
    }
  };

  // --- Event Handlers ---
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    if (safeConfirm("Are you sure you want to remove this task block from your plan?")) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const handleResetSchedule = () => {
    if (safeConfirm("Reset current timetable back to original recommended Heimdall framework? Note: This deletes custom edits.")) {
      setTasks(INITIAL_TASKS);
      setMotif(INITIAL_MOTIF);
      setApiError(null);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const added: TaskItem = {
      id: `task-${Date.now()}`,
      day: newTaskDay,
      time: newTaskTime,
      task: newTaskName,
      duration: newTaskDuration,
      category: newTaskCategory,
      completed: false,
      description: newTaskDesc || "Custom session logs added by user."
    };

    setTasks((prev) => [...prev, added]);
    setNewTaskName("");
    setNewTaskDesc("");
    setShowAddForm(false);
  };

  const handleAnalyzePastedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteBody.trim()) return;

    setIsLoadingAdvisor(true);
    setApiError(null);

    try {
      const response = await fetch("/api/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText: pasteBody,
          subject: pasteSubject || "Manual Simulation Input",
          sender: pasteSender || "custom-simulation@test.com",
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis service returned status ${response.status}`);
      }

      const analyzedResult = await response.json();
      
      if (analyzedResult.classification === "CONFIRMED_EVENT") {
        if (analyzedResult.needs_more_info) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `msg-paste-unresolved-${Date.now()}`,
              role: "model",
              content: `🔍 I noticed a confirmation event listed in this email for **${analyzedResult.event_name || 'Event'}**, but could not deduce the specific scheduled date: "${analyzedResult.missing_critical_info_reason || 'Date missing'}". Please let me know what day to file it under!`,
              timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          // Process event!
          await handleNewExtractedEvent({
            event_name: analyzedResult.event_name,
            event_date: analyzedResult.event_date,
            start_time: analyzedResult.start_time,
            end_time: analyzedResult.end_time,
            from: pasteSender || "Simulation Manual Paste",
          });
        }
      } else {
        const catLabel = analyzedResult.classification === "INVITATION_OR_GENERAL" ? "Invitation / Marketing" : "Unrelated Update";
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-paste-ignored-${Date.now()}`,
            role: "model",
            content: `📥 Checked manual email. Classification returned: **${catLabel}**. No calendar modifications authorized. Heimdall filters out invitation spam.`,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      // reset pasture
      setPasteBody("");
      setPasteSubject("");
      setPasteSender("");
      setShowPasteEmailModal(false);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Email analysis failed. Ensure GEMINI_API_KEY is active.");
    } finally {
      setIsLoadingAdvisor(false);
    }
  };

  // --- API Endpoint 1: Generate Schedule ---
  const handleAIGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawPromptInput.trim()) return;

    setIsLoadingRegen(true);
    setApiError(null);

    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: rawPromptInput,
          currentDay: simulatedDay,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate schedule. Server returned ${response.status}`);
      }

      const data: ScheduleBlueprint = await response.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        if (data.motif) {
          setMotif(data.motif);
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: "model",
            content: `✨ I have successfully analyzed your workload and restructured your daily protocol! Motif: "${data.motif || 'Custom schedule design'}"`,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setRawPromptInput("");
      } else {
        throw new Error("Invalid format received from the AI advisor.");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "An error occurred. Check that GEMINI_API_KEY is configured.");
    } finally {
      setIsLoadingRegen(false);
    }
  };

  // --- API Endpoint 2: Chat Advisor ---
  const triggerAdvisorAPI = async (userMsgText: string, currentList: TaskItem[]) => {
    setIsLoadingAdvisor(true);
    setApiError(null);

    const updatedHistory = [
      ...chatMessages,
      {
        id: `msg-user-${Date.now()}`,
        role: "user" as const,
        content: userMsgText,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setChatMessages(updatedHistory);

    try {
      const payloadMessages = updatedHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          currentSchedule: currentList,
          currentHabits: habits,
          currentDay: simulatedDay
        }),
      });

      if (!response.ok) {
        throw new Error(`Advisor service returned status code ${response.status}`);
      }

      const data = await response.json();

      if (data.advisorResponse) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-model-${Date.now()}`,
            role: "model",
            content: data.advisorResponse,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

if (data.action && data.action.name && data.action.parameters) {
         const actionName = data.action.name;
         const params = data.action.parameters;
         if (actionName === "create_calendar_events") {
           create_calendar_events(params.events, params.summary);
         } else if (actionName === "add_habit") {
           executeAddHabit(params.habit_name, params.frequency, params.preferred_time, params.duration_minutes);
         } else if (actionName === "log_habit") {
           executeLogHabit(params.habit_name, params.date);
         } else if (actionName === "check_habit_status") {
           executeCheckHabitStatus(params.days_to_check);
         } else if (actionName === "detect_gaps_and_nudge") {
           executeDetectGapsAndNudge();
         } else if (actionName === "register_drive_document") {
           executeRegisterDriveDocument(params.taskTitle, params.fileId);
         }
       }

      if (data.updatedTasks && Array.isArray(data.updatedTasks)) {
        setTasks(data.updatedTasks);
        setScheduleAlertVisible(true);
        setTimeout(() => {
          setScheduleAlertVisible(false);
        }, 6000);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Heimdall Advisor unavailable. Verify API Key settings.");
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: "model",
          content: `⚠️ (Advisor Simulation Mode): I understand your request. If your GEMINI_API_KEY is unset, I cannot modify the timetable dynamically via AI, but you can check tasks off, manually add segments, or edit tasks here in real-time. Let me know if you want to perform standard edits.`,
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoadingAdvisor(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    triggerAdvisorAPI(msg, tasks);
  };

  const handleQuickChatPrompt = (topicText: string) => {
    triggerAdvisorAPI(topicText, tasks);
  };

  // Category decorator badge helpers
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "thesis":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
          label: "Thesis Focus"
        };
      case "presentation":
        return {
          bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
          icon: <Presentation className="w-4 h-4 text-blue-400" />,
          label: "Presentation"
        };
      case "appointment":
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          icon: <Stethoscope className="w-4 h-4 text-amber-400" />,
          label: "Healthcare"
        };
      case "break":
        return {
          bg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
          icon: <Coffee className="w-4 h-4 text-purple-400" />,
          label: "Recharge"
        };
      default:
        return {
          bg: "bg-slate-800 border-slate-700 text-slate-300",
          icon: <Clock className="w-4 h-4 text-slate-300" />,
          label: "General"
        };
    }
  };

  // Filter tasks for the selected day in Simulated Context
  const filteredTasks = tasks.filter(
    (t) => t && t.day && typeof t.day === "string" && t.day.toLowerCase() === simulatedDay.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row overflow-x-hidden font-sans select-none antialiased">
      
      {/* 1. ASIDE SIDEBAR navigation block */}
      <aside className="w-20 bg-slate-900/90 border-r border-slate-800/80 flex flex-col items-center py-8 justify-between shrink-0">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo Brand Accent */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-500/20 tracking-tighter">
            H
          </div>
          
          <nav className="flex flex-col space-y-5">
            <button
              id="view-protocol-btn"
              onClick={() => setCurrentView("protocol")}
              title="Daily Protocol Agenda"
              className={`p-3 rounded-xl transition-all cursor-pointer border ${
                currentView === "protocol"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </button>

            <button
              id="view-chat-btn"
              onClick={() => setCurrentView("chat")}
              title="Heimdall Advisor Room"
              className={`p-3 rounded-xl transition-all cursor-pointer border ${
                currentView === "chat"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <button
            id="reset-plan-btn"
            onClick={handleResetSchedule}
            title="Reset Weekly Plan"
            className="p-2.5 rounded-lg border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="h-20 border-b border-slate-800/60 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-display">Daily Protocol</h1>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono font-bold tracking-wider">Active Run</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Simulated Calendar Timeline • Week of Draft Deadlines
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase font-bold font-mono mr-2.5">Simulate Day:</span>
              <div className="flex items-center bg-slate-950 px-1 py-0.5 rounded border border-slate-800/80">
                <select
                  value={simulatedDay}
                  onChange={(e) => setSimulatedDay(e.target.value)}
                  className="bg-transparent text-xs text-emerald-400 font-mono focus:outline-none cursor-pointer pr-1 animate-none selection:bg-slate-800"
                >
                  {allDaysList.map((day) => (
                    <option key={day} value={day} className="bg-slate-900 text-slate-200 font-mono">
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={executeDetectGapsAndNudge}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-mono font-medium transition-all"
              title="Scan schedule for gaps and match micro-tasks"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Detect Gaps</span>
            </button>

            <button
              onClick={executeCheckDriveDocuments}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-mono font-medium transition-all"
              title="Check document editing status"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Check Documents</span>
            </button>

            <button
              onClick={() => {
                // For demo purposes, simulate an edit on the first task with a drive file
                const taskWithDrive = tasks.find(t => t.driveFileId);
                if (taskWithDrive && taskWithDrive.task) {
                  fetch(`/api/simulate-drive-edit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskTitle: taskWithDrive.task })
                  }).then(async () => {
                    const response = await fetch(`/api/check-drive-document?taskTitle=${encodeURIComponent(taskWithDrive.task)}`);
                    const data = await response.json();
                    setChatMessages(prev => [
                      ...prev,
                      {
                        id: `msg-sim-edit-${Date.now()}`,
                        role: "model",
                        content: `I've simulated an edit on your "${taskWithDrive.task}" document. Last modified: ${new Date(data.lastModified).toLocaleString()}`,
                        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                  });
                } else {
                  setChatMessages(prev => [
                    ...prev,
                    {
                      id: `msg-sim-edit-none-${Date.now()}`,
                      role: "model",
                      content: "No documents registered for simulation. Please register a document first.",
                      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-mono font-medium transition-all"
              title="Simulate document edit (for testing)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulate Edit</span>
            </button>

            <div className="hidden md:flex bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800/80 flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Thesis Progress</span>
              <span className="text-sm font-mono font-semibold text-emerald-400">{thesisPercent}% done</span>
            </div>

            <div className="hidden lg:flex bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800/80 flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Energy Capacity</span>
              <span className="text-sm text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 inline" /> OPTIMAL
              </span>
            </div>
          </div>
        </header>

        {apiError && (
          <div className="mx-8 mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">Model Advisor Notice</p>
              <p className="opacity-80 mt-0.5">{apiError}. Simulated offline intelligence is running instead.</p>
            </div>
          </div>
        )}

        {/* Schedule Modified Alert Banner */}
        {scheduleAlertVisible && (
          <div className="mx-8 mt-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span><strong>Heimdall Success:</strong> AI updated your timeline blocks based on your feedback.</span>
            </div>
            <button
              onClick={() => setScheduleAlertVisible(false)}
              className="text-[10px] underline cursor-pointer hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUBMISSION / MOTIF BANNER BAR */}
        <div className="mx-8 mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="w-full">
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block">Active Strategy Motif</span>
              {isEditingMotif ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-1 w-full">
                  <input
                    type="text"
                    value={tempMotif}
                    onChange={(e) => setTempMotif(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                    placeholder="Enter a new Strategy Motif to direct your planning..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (tempMotif.trim()) setMotif(tempMotif.trim());
                        setIsEditingMotif(false);
                      } else if (e.key === "Escape") {
                        setIsEditingMotif(false);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (tempMotif.trim()) setMotif(tempMotif.trim());
                        setIsEditingMotif(false);
                      }}
                      className="text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingMotif(false)}
                      className="text-xs font-mono bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-200 italic">"{motif}"</span>
              )}
            </div>
          </div>
          {!isEditingMotif && (
            <button 
              id="modify-motif-btn"
              onClick={() => {
                setTempMotif(motif);
                setIsEditingMotif(true);
              }}
              className="shrink-0 text-xs font-mono text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Modify Motif
            </button>
          )}
        </div>

        {/* GMAIL MONITORING CONTROL BAR */}
        <div id="gmail-monitoring-bar" className="mx-8 mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${gmailToken ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800/85 text-slate-500"}`}>
              <Mail className={`w-4 h-4 ${isCheckingGmail ? "animate-spin text-emerald-400" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest block">Heimdall Watch (Gmail Integration)</span>
                {gmailToken ? (
                  <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10 font-mono font-bold uppercase tracking-wider">
                    ● Active background
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[8px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl font-sans">
                {gmailToken ? (
                  <>Connected as <span className="text-emerald-400 font-mono font-semibold">{gmailUser?.email || "User"}</span>. Monitoring inbox every 45s for confirmed events.</>
                ) : (
                  <>Auto-extracts confirmed bookings, registrations, and meetings from your emails. Authorize standard Gmail or paste raw text to simulate.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {gmailToken ? (
              <>
                <button
                  id="gmail-check-now-btn"
                  onClick={() => checkGmailInbox()}
                  disabled={isCheckingGmail}
                  className="text-xs font-mono text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingGmail ? "animate-spin" : ""}`} />
                  Scan Inbox
                </button>
                <button
                  id="gmail-disconnect-btn"
                  onClick={handleDisconnectGmail}
                  className="text-xs font-mono text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <button
                  id="gmail-connect-btn"
                  onClick={handleConnectGmail}
                  className="text-xs font-mono text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
                >
                  ⚡ Authorize Gmail
                </button>
              </>
            )}
            
            <button
              id="gmail-paste-sim-btn"
              onClick={() => setShowPasteEmailModal(true)}
              className="text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              Paste Email Fallback
            </button>
          </div>
        </div>

        {/* WORKSPACE MIDDLE SECTION */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6 items-start">
            
            {/* LEFT AREA: Switch views or standard timetable */}
            <div className="col-span-12 xl:col-span-8 space-y-6">
              
              {currentView === "protocol" ? (
                <>
                  {/* AGENDA SECTION */}
                  <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                          Protocol Sequence: {simulatedDay}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Showing {filteredTasks.length} sessions planned for this simulated day
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          id="add-task-btn"
                          onClick={() => setShowAddForm(!showAddForm)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Task
                        </button>
                      </div>
                    </div>

                    {/* Quick Inline New Task Form */}
                    {showAddForm && (
                      <form onSubmit={handleAddTask} className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-4">
                        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase">Specify New Session</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Task Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Thesis: Methodology & Data"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Target Day</label>
                            <select
                              value={newTaskDay}
                              onChange={(e) => setNewTaskDay(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                            >
                              {allDaysList.map((day) => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Time Range</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 07:00 - 09:30"
                              value={newTaskTime}
                              onChange={(e) => setNewTaskTime(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Duration text</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 2.5 hours"
                              value={newTaskDuration}
                              onChange={(e) => setNewTaskDuration(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Category</label>
                            <select
                              value={newTaskCategory}
                              onChange={(e) => setNewTaskCategory(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="thesis">Thesis Focus (Green)</option>
                              <option value="presentation">Presentation Prep (Blue)</option>
                              <option value="appointment">Healthcare Appointment (Amber)</option>
                              <option value="break">Recharge/Break (Purple)</option>
                              <option value="general">General Workout (Slate)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Guideline Description</label>
                            <input
                              type="text"
                              placeholder="Action instructions..."
                              value={newTaskDesc}
                              onChange={(e) => setNewTaskDesc(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer"
                          >
                            Save Session
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Timeline Sequence List */}
                    <div className="space-y-3.5">
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                          <Coffee className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-mono">No sessions scheduled on {simulatedDay}.</p>
                          <p className="text-[11px] text-slate-600 mt-1">Use the "Add Task" action to schedule something manually.</p>
                        </div>
                      ) : (
                        filteredTasks.map((t) => {
                          const catStyles = getCategoryTheme(t.category);
                          return (
                            <div
                              key={t.id}
                              className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                                t.completed
                                  ? "bg-slate-950/40 border-slate-800/50 opacity-60"
                                  : "bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-start space-x-4">
                                <button
                                  onClick={() => handleToggleTask(t.id)}
                                  className="mt-0.5 relative flex items-center justify-center rounded-full hover:scale-105 transition-all text-slate-400 cursor-pointer"
                                >
                                  {t.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-600 hover:text-emerald-400" />
                                  )}
                                </button>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-slate-400 font-bold">{t.time}</span>
                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${catStyles.bg}`}>
                                      {catStyles.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">({t.duration})</span>
                                  </div>

                                  <h4 className={`text-sm font-semibold mt-1.5 ${t.completed ? "line-through text-slate-500" : "text-white"}`}>
                                    {t.task}
                                  </h4>
                                  <p className="text-xs text-slate-400 mt-1 pl-0.5 leading-relaxed font-mono">
                                    {t.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 pl-9 md:pl-0">
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  title="Remove Task"
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* HEIMDALL PROACTIVE HABITS & SELF-CARE LOUNGE */}
                  <div id="habits-self-care-lounge" className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-sm font-bold text-slate-300 font-display uppercase tracking-wider">Self-Care &amp; Habits Lounge</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Maintain streaks, log milestones, and prevent slips during stressful draft cycles
                        </p>
                      </div>

                      <button
                        id="define-new-habit-btn"
                        onClick={() => setShowAddHabitForm(!showAddHabitForm)}
                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" /> Define Habit
                      </button>
                    </div>

                    {/* Habit Setup Form */}
                    {showAddHabitForm && (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4 animate-fadeIn">
                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">Configure Brand-New Habit Block</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Habit Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Meditate, Code Thesis, Gym"
                              value={newHabitName}
                              onChange={(e) => setNewHabitName(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Frequency</label>
                            <select
                              value={newHabitFreq}
                              onChange={(e) => setNewHabitFreq(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="daily">Daily Track (High Discipline)</option>
                              <option value="weekly">Weekly Routine</option>
                              <option value="custom">Custom Routine</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Preferred Time Block</label>
                            <input
                              type="text"
                              placeholder="e.g. 07:30, morning"
                              value={newHabitTime}
                              onChange={(e) => setNewHabitTime(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              min={5}
                              max={240}
                              value={newHabitDur}
                              onChange={(e) => setNewHabitDur(parseInt(e.target.value) || 10)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono text-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddHabitForm(false)}
                            className="text-[10px] text-slate-400 font-mono hover:text-slate-200 px-3 py-1.5 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              executeAddHabit(newHabitName, newHabitFreq, newHabitTime, newHabitDur);
                              setNewHabitName("");
                              setShowAddHabitForm(false);
                            }}
                            className="text-[10px] text-slate-950 bg-emerald-500 hover:bg-emerald-400 font-mono font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-all uppercase"
                          >
                            Register Habit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* HABITS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {habits.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 text-center py-8 border border-dashed border-slate-850 rounded-xl">
                          <TrendingUp className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-mono">No active habits defined. Define a habit above to set up automatic proactive nudges.</p>
                        </div>
                      ) : (
                        habits.map((h) => {
                          const isDoneToday = h.lastCompletedDate === getSimulatedDate(simulatedDay);
                          return (
                            <div
                              key={h.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all relative group/card ${
                                isDoneToday 
                                  ? "bg-emerald-500/5 border-emerald-500/10" 
                                  : "bg-slate-900/40 border-slate-850/80 hover:border-slate-800 hover:bg-slate-900/60"
                              }`}
                            >
                              <button
                                onClick={() => {
                                  if (safeConfirm(`Remove habit tracker for "${h.name}"?`)) {
                                    setHabits(prev => prev.filter(x => x.id !== h.id));
                                  }
                                }}
                                className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 p-1 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer"
                                title="Remove Habit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isDoneToday ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono font-bold">
                                    {h.frequency} Tracker
                                  </span>
                                </div>

                                <h4 className={`text-sm font-bold mt-2 font-display ${isDoneToday ? "text-emerald-300" : "text-slate-100"}`}>
                                  {h.name}
                                </h4>

                                <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                    {h.preferred_time} ({h.duration_minutes}m)
                                  </span>
                                  
                                  {h.lastCompletedDate && (
                                    <span className="text-[9px] text-slate-600">
                                      Last: {h.lastCompletedDate}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-850/30">
                                <div className="flex items-center gap-1">
                                  <Flame className={`w-4 h-4 ${h.streak > 0 ? "text-amber-500 fill-amber-500/10 animate-pulse" : "text-slate-600"}`} />
                                  <span className="text-xs font-mono font-bold text-slate-300">
                                    {h.streak} day streak
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  disabled={isDoneToday}
                                  onClick={() => executeLogHabit(h.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono leading-none transition-all cursor-pointer ${
                                    isDoneToday
                                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold"
                                      : "bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] text-slate-950 font-bold"
                                  }`}
                                >
                                  {isDoneToday ? "Completed! ✓" : "Check Off"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RESTREAM TIMELINE VIA GEMINI ENDPOINT CARD */}
                  <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-slate-300 font-display uppercase tracking-wider">Dynamic Schedule Generator</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 font-mono">
                      Suddenly encountered unexpected obstacles? Describe your revised context below. Heimdall's generator will optimize a brand-new daily blueprint and overwrite the current timeline blocks automatically.
                    </p>

                    <form onSubmit={handleAIGenerateSchedule} className="space-y-4">
                      <div>
                        <textarea
                          rows={3}
                          required
                          value={rawPromptInput}
                          onChange={(e) => setRawPromptInput(e.target.value)}
                          placeholder="e.g. My presentation is actually due Friday at 2pm instead of Monday, and I need 2 more hours of methodology research. Rearrange my schedule..."
                          className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 focus:border-emerald-500/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-sans leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                          <Info className="w-3 h-3" /> Uses Geminis' strategic calendar parsing.
                        </span>
                        <button
                          type="submit"
                          disabled={isLoadingRegen}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          {isLoadingRegen ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Recalculating Calendar...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Regenerate Timetable
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              ) : currentView === "chat" ? (
                /* CHAT ADVANCED ROOM */
                <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 flex flex-col h-[600px] overflow-hidden bg-slate-950/20 backdrop-blur-sm">
                  {/* Chat room header */}
                  <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/85 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white font-mono">Heimdall Executive Lounge</h3>
                        <p className="text-[10px] text-slate-500 font-mono">Ask to move tasks, postpone sessions, or seek workload counseling</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-mono">Gemini 3.5 Active</span>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {chatMessages.map((msg) => {
                      const isModel = msg.role === "model";
                      return (
                        <div key={msg.id} className={`flex ${isModel ? "justify-start" : "justify-end"} animate-fadeIn`}>
                          <div className={`max-w-[85%] rounded-2xl p-4 gap-2 border ${
                            isModel
                              ? "bg-slate-900/60 border-slate-800/80 text-slate-200"
                              : "bg-emerald-950/40 border-emerald-800/40 text-emerald-100"
                          }`}>
                            <div className="flex items-center justify-between gap-12 mb-1.5 border-b border-white/5 pb-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {isModel ? "Heimdall Advisor" : "Draft Author"}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                            </div>
                            <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}

                    {isLoadingAdvisor && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center space-x-3 text-slate-400 text-xs font-mono">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Heimdall is reviewing workload logs...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Shortcut chips */}
                  <div className="p-4 bg-slate-950/40 border-t border-slate-800/60">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2.5">Advisor Shortcuts (Auto-Response)</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickChatPrompt("I missed Wednesday's methodology section. Move it to Thursday morning.")}
                        className="text-[10px] font-mono bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-2.5 py-1.5 rounded-lg text-slate-300 transition-all cursor-pointer"
                      >
                        ⚡ "Missed methodology, push to Thurs"
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickChatPrompt("I focus best on Thursday mornings. Let's make sure the biggest section is then.")}
                        className="text-[10px] font-mono bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-2.5 py-1.5 rounded-lg text-slate-300 transition-all cursor-pointer"
                      >
                        ⚡ "Reinforce early morn Thursday"
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickChatPrompt("Write me an encouraging motivational pep-talk regarding thesis writing!")}
                        className="text-[10px] font-mono bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-2.5 py-1.5 rounded-lg text-slate-300 transition-all cursor-pointer"
                      >
                        🌱 "Need moral support / pep-talk"
                      </button>
                    </div>
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800 bg-slate-900/85 flex items-center gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a revision command, advice question, or status report..."
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/80 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingAdvisor}
                      className="bg-emerald-600 hover:bg-emerald-500 p-2 text-slate-950 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : null}

              {/* WEEKLY HOURLY OVERVIEW CARD (Always visible for strategic tracking!) */}
              <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                  Weekly Allocated Hours By Day
                </h2>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {allDaysList.map((day) => {
                    const hrs = getWeeklyHoursByDay(day);
                    const isToday = day.toLowerCase() === simulatedDay.toLowerCase();
                    const maxBaseline = 8;
                    const heightPercent = Math.min((hrs / maxBaseline) * 100, 100);
                    
                    return (
                      <div
                        key={day}
                        onClick={() => setSimulatedDay(day)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isToday
                            ? "bg-slate-900/90 border-emerald-500/40 shadow-inner"
                            : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/30 hover:border-slate-700"
                        }`}
                      >
                        <p className={`text-[10px] uppercase font-mono tracking-wider ${isToday ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                          {day.substring(0, 3)}
                        </p>
                        <p className="text-sm font-semibold font-mono text-white mt-1">
                          {hrs}h
                        </p>
                        
                        {/* Custom visualizer cylinder bar */}
                        <div className="h-12 w-full bg-slate-900 rounded-md mt-2 flex flex-col justify-end overflow-hidden pb-0.5 px-1">
                          <div
                            style={{ height: `${heightPercent || 5}%` }}
                            className={`w-full rounded-sm transition-all duration-500 ${
                              isToday ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: HIGH RELEVANCE PANELS */}
            <div className="col-span-12 xl:col-span-4 space-y-6">
              
              {/* RESOURCE ALLOCATION PANEL */}
              <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-5">
                  Resource Allocation Flow
                </h2>

                <div className="space-y-6">
                  {/* Thesis tracking meter */}
                  <div>
                    <div className="flex justify-between mb-2 text-xs font-mono">
                      <span className="text-slate-300 font-bold">THESIS WORKLOAD</span>
                      <span className="text-emerald-400 font-bold">{thesisPercent}%</span>
                    </div>
                    
                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-900 overflow-hidden">
                      <div
                        style={{ width: `${thesisPercent}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                    
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Total target: {totalThesisHours}h</span>
                      <span>Completed: {completedThesisHours}h</span>
                    </div>
                  </div>

                  {/* Presentation tracking meter */}
                  <div>
                    <div className="flex justify-between mb-2 text-xs font-mono">
                      <span className="text-slate-300 font-bold">PRESENTATION PREP</span>
                      <span className="text-blue-400 font-bold">{presPercent}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-900 overflow-hidden">
                      <div
                        style={{ width: `${presPercent}%` }}
                        className="h-full bg-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Total target: {totalPresHours}h</span>
                      <span>Completed: {completedPresHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Deadline alert flash box */}
                <div className="mt-8 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <h3 className="text-orange-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                    Deadlines Remaining Alert
                  </h3>
                  <div className="flex justify-between items-end">
                    <div className="text-3xl font-mono tracking-tighter text-white font-extrabold">
                      {getSimulatedMilestoneCountdown()}
                    </div>
                    <div className="text-[10px] text-orange-200 bg-orange-950 px-2 py-0.5 rounded-md border border-orange-850 font-mono font-bold">
                      THESIS DUE FRI
                    </div>
                  </div>
                </div>
              </div>

              {/* MINI CHAT ADVISOR WIDGET FOR PROTOCOL VIEW STATUS */}
              {currentView !== "chat" && (
                <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">
                      Heimdall Advisor Room
                    </p>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-mono font-semibold">
                      Standby
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed mb-4 italic">
                    "I am prepared to run rescheduling protocols at your request."
                  </p>

                  <button
                    onClick={() => setCurrentView("chat")}
                    className="w-full bg-slate-900 hover:bg-slate-850/80 text-slate-300 border border-slate-800 hover:border-slate-700 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer font-sans"
                  >
                    Open Executive Lounge
                  </button>
                </div>
              )}

              {/* HELPFUL QUICK STATS */}
              <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-5 space-y-3.5 backdrop-blur-sm font-mono text-xs">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Task Statistics</p>
                
                <div className="flex justify-between text-slate-400">
                  <span>Completed Sessions:</span>
                  <span className="text-white font-bold">{tasks.filter(t => t.completed).length} / {tasks.length}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Healthcare Slots:</span>
                  <span className="text-amber-400 font-bold">1 Block (Wednesday 10AM)</span>
                </div>

                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-3">
                  <span>Total Schedule Weight:</span>
                  <span className="text-emerald-400 font-bold">
                    {tasks.reduce((sum, t) => sum + parseDurationHours(t.duration), 0)} Hours Plan
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {showCalendarModal && (
        <div id="calendar-confirmation-modal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6 text-left">
            <button
              id="close-calendar-modal-btn-top"
              type="button"
              onClick={() => setShowCalendarModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-mono text-lg p-2 transition-all"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl">
                <CalendarDays className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Heimdall Protocol</h3>
                <h2 className="text-xl font-bold text-white tracking-tight">Calendar Sync Accomplished</h2>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-4 border border-slate-800/80 rounded-xl">
              {calendarSummary || "Events prepared and synchronized successfully."}
            </p>

            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Confirmed Events Structure:</p>
              {createdEvents && createdEvents.map((evt, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold text-white">{evt.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Date: {evt.day}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      <Clock className="w-3 h-3" />
                      {evt.start_time} - {evt.end_time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {downloadIcsUrl && (
                <a
                  id="download-ics-link-btn"
                  href={downloadIcsUrl}
                  download="heimdall_schedule.ics"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 flex items-center justify-center gap-2.5 font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  <Download className="w-4 h-4" />
                  Manual .ICS Fallback Download
                </a>
              )}
              
              <button
                id="close-calendar-modal-btn"
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 py-2.5 px-4 rounded-xl text-xs transition-all tracking-wide"
              >
                Done
              </button>
            </div>
            
            <p className="text-[10px] text-center text-slate-500 font-mono">
              Double-click file to integrate with Outlook, Apple Calendar, or Google Calendar.
            </p>
          </div>
        </div>
      )}

      {showPasteEmailModal && (
        <div id="paste-email-simulation-modal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative space-y-5 text-left font-sans">
            <button
              id="close-paste-modal-btn-top"
              type="button"
              onClick={() => setShowPasteEmailModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-mono text-lg p-2 transition-all"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">Heimdall Simulator</h3>
                <h2 className="text-xl font-bold text-white tracking-tight">Manual Email Simulation fallback</h2>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              If live Gmail OAuth API is offline or not configured yet, use this simulation mode! Paste any confirmed event email (receipt, booking confirmation, workshop schedule), and Heimdall will run real classification and extraction with Gemini.
            </p>

            <form onSubmit={handleAnalyzePastedEmail} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px] font-mono uppercase tracking-wider">Sender Email / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. appointments@clinic.com"
                    value={pasteSender}
                    onChange={(e) => setPasteSender(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px] font-mono uppercase tracking-wider">Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Appointment Confirmed for Junu"
                    value={pasteSubject}
                    onChange={(e) => setPasteSubject(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px] font-mono uppercase tracking-wider">Email Text (Body)</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste the full email text here..."
                  value={pasteBody}
                  onChange={(e) => setPasteBody(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-slate-100 focus:outline-none font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Seed some test data for easy user interaction!
                    setPasteSender("bookings@flightreserve.net");
                    setPasteSubject("Booking Confirmed: Flight to SF");
                    setPasteBody("Confirmation ID: UX8291\nDear Junu Muhammad,\nThis is to confirm your booking on Wednesday June 24, 2026.\nDeparting at 14:00 and arriving at 15:30.\nThank you for choosing FlightReserve!");
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer font-sans"
                >
                  Seed Demo Travel Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Seed missing info demo
                    setPasteSender("support@webinarpros.com");
                    setPasteSubject("Webinar Registration Confirmed");
                    setPasteBody("You are registered! Your webinar will take place on Wednesday at 10:00 AM.");
                  }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer font-sans"
                >
                  Seed Missing Date Demo
                </button>
                <button
                  type="submit"
                  disabled={isLoadingAdvisor}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer text-center font-sans"
                >
                  Analyze & Auto-Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STREAK MILESTONE BADGE CELEBRATION OVERLAY */}
      {streakBadgeAlert && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl shadow-emerald-500/5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-lg animate-bounce">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-widest">Streak Unlocked!</h3>
              <p className="text-xl font-bold text-slate-100 font-display">
                {streakBadgeAlert.habitName}
              </p>
            </div>

            <div className="py-2.5 px-4 bg-slate-950/80 border border-slate-800 rounded-xl max-w-[180px] mx-auto flex items-center justify-center gap-2">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500/15 animate-pulse" />
              <span className="text-2xl font-black font-mono text-slate-100">
                {streakBadgeAlert.streak} Days
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Heimdall has recorded this milestone in your productivity dossier. Consistent execution overcomes all obstacles!
            </p>

            <button
              onClick={() => setStreakBadgeAlert(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono py-2 rounded-xl text-xs uppercase cursor-pointer transition-all"
            >
              Continue Execution ⚡
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
