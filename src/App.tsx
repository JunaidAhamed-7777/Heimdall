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
  TrendingUp,
  BarChart3
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { TaskItem, ChatMessage, ScheduleBlueprint } from "./types";
import { INITIAL_TASKS, INITIAL_MOTIF } from "./utils/initialData";
import WeeklyReport from "./components/WeeklyReport";
import ProfileModal from "./components/ProfileModal";
import logo from "../logo.png";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AgendaTab from "./components/AgendaTab";
import ActionsTab from "./components/ActionsTab";
import AdvisorTab from "./components/AdvisorTab";
import MobileBottomNav from "./components/MobileBottomNav";
import ConfirmModal from "./components/ConfirmModal";
import HabitsPage from "./components/HabitsPage";
import { getDefaultSimulatedDate, getSimulatedDate, getDayLabelFromDate } from "./utils/dateUtils";
import InfoModal from "./components/InfoModal";
import SettingsModal from "./components/SettingsModal";

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

  const [showSettings, setShowSettings] = useState(false);

  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; body: React.ReactNode }>({
    isOpen: false,
    title: "",
    body: "",
  });

  const openPrivacyPolicy = () => {
    setInfoModal({
      isOpen: true,
      title: "Privacy Policy",
      body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    });
  };

  const openSupport = () => {
    setInfoModal({
      isOpen: true,
      title: "Support",
      body: (
        <div className="space-y-3">
          <p>
            <a
              href="https://github.com/JunaidAhamed-7777/Heimdall"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-fixed transition-colors"
            >
              Click Here To Access The Repository
            </a>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Want to support this? Star the repository :)</li>
            <li>Want to report any bugs or suggest features? Open a new issue and drop a pull request.</li>
          </ul>
          <p className="pt-2">Thank you for using this app and your support !</p>
        </div>
      ),
    });
  };

const [tasks, setTasks] = useState<TaskItem[]>(() => {
  return INITIAL_TASKS.map((t) => ({
    ...t,
    day: getSimulatedDate(t.day),
  }));
});

const [categories, setCategories] = useState<string[]>(["General"]);
const [deadlines, setDeadlines] = useState<any[]>([]);
const [motif, setMotif] = useState<string>(INITIAL_MOTIF);

const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
  {
    id: "msg-1",
    role: "model",
    content: "Hello! I am Heimdall, your executive productivity advisor. I keep an eye on your Gmail for any confirmations — bookings, registrations, appointments — so I can automatically add them to your calendar. You can also discuss rescheduling, request advice, or update your progress. Let's bypass stress with precise execution.",
    timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
]);

  // --- App View & Simulation States ---
  const [currentView, setCurrentView] = useState<"protocol" | "chat">("protocol");
  const [simulatedDay, setSimulatedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // --- Google OAuth & User Profile States ---
  const [user, setUser] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeStartTimer = setTimeout(() => {
      setSplashFading(true);
    }, 750);

    const removeTimer = setTimeout(() => {
      setSplashVisible(false);
    }, 1000);

    return () => {
      clearTimeout(fadeStartTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Subscribe to Firebase Auth changes and fetch user data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsDataLoading(true);
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.tasks) {
              setTasks(data.tasks.map((t: TaskItem) => ({
                ...t,
                day: (typeof t.day === "string" && !t.day.match(/^\d{4}-\d{2}-\d{2}$/))
                  ? getSimulatedDate(t.day)
                  : t.day,
              })));
            } else {
              setTasks(INITIAL_TASKS.map((t) => ({ ...t, day: getSimulatedDate(t.day) })));
            }
            if (data.categories) setCategories(data.categories);
            if (data.deadlines) setDeadlines(data.deadlines);
            if (data.motif) setMotif(data.motif);
            if (data.chatMessages) setChatMessages(data.chatMessages);
            if (data.habits) setHabits(data.habits);
            
            setUser({
              uid: firebaseUser.uid,
              displayName: data.displayName || firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
            });
          } else {
            // New user: onboarding current local/default state to their profile!
            const defaultTasks = INITIAL_TASKS.map((t) => ({ ...t, day: getSimulatedDate(t.day) }));
            const defaultChat = [
              {
                id: "msg-1",
                role: "model",
                content: "Hello! I am Heimdall, your executive productivity advisor. I keep an eye on your Gmail for any confirmations — bookings, registrations, appointments — so I can automatically add them to your calendar. You can also discuss rescheduling, request advice, or update your progress. Let's bypass stress with precise execution.",
                timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              }
            ];
            
            const initialData = {
              tasks: defaultTasks,
              categories: ["General"],
              deadlines: [],
              motif: INITIAL_MOTIF,
              chatMessages: defaultChat,
              habits: [],
              displayName: firebaseUser.displayName,
              updatedAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, initialData);
            
            setTasks(defaultTasks);
            setCategories(["General"]);
            setDeadlines([]);
            setMotif(INITIAL_MOTIF);
            setChatMessages(defaultChat);
            setHabits([]);
            
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
            });
          }
        } catch (error) {
          console.error("Error loading user data from Firestore:", error);
          // Fallback to defaults
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
        } finally {
          setIsDataLoading(false);
        }
      } else {
        // Clear state on logout and set to default guest state
        setTasks(INITIAL_TASKS.map((t) => ({ ...t, day: getSimulatedDate(t.day) })));
        setCategories(["General"]);
        setDeadlines([]);
        setMotif(INITIAL_MOTIF);
        setChatMessages([
          {
            id: "msg-1",
            role: "model",
            content: "Hello! I am Heimdall, your executive productivity advisor. I keep an eye on your Gmail for any confirmations — bookings, registrations, appointments — so I can automatically add them to your calendar. You can also discuss rescheduling, request advice, or update your progress. Let's bypass stress with precise execution.",
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setHabits([]);
        setUser(null);
        setIsDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Habits & Goals Tracking States ---
  const [habits, setHabits] = useState<any[]>([]);
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
const [showWeeklyReport, setShowWeeklyReport] = useState<boolean>(false);
const [activeTab, setActiveTab] = useState<string>("agenda");
const [weeklyReportOffered, setWeeklyReportOffered] = useState<boolean>(false);
const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; itemName: string; onConfirm: (() => void) | null }>({
  isOpen: false,
  itemName: "",
  onConfirm: null,
});

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

  // --- Google OAuth Profile Login & Logout Handlers ---
  const handleProfileLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleProfileLogout = async () => {
    await signOut(auth);
  };

  const handleUpdateUserDisplayName = (newName: string) => {
    if (user) {
      setUser((prev: any) => prev ? { ...prev, displayName: newName } : null);
    }
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
  const [newTaskCategory, setNewTaskCategory] = useState<string>("General");
  const [newTaskDesc, setNewTaskDesc] = useState<string>("");

  // Sync to Firestore in real-time when authenticated and data is loaded
  useEffect(() => {
    if (isDataLoading || !user) return;

    const userDocRef = doc(db, "users", user.uid);
    setDoc(userDocRef, {
      tasks,
      categories,
      deadlines,
      motif,
      chatMessages,
      habits,
      displayName: user.displayName,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch((err) => {
      console.error("Error saving user data to Firestore:", err);
    });
  }, [tasks, categories, deadlines, motif, chatMessages, habits, user?.displayName, user?.uid, isDataLoading]);

  // Track simulated day transitions to execute proactive audits automatically!
  const prevDayRef = useRef<string>(simulatedDay);
  useEffect(() => {
    if (prevDayRef.current !== simulatedDay) {
      prevDayRef.current = simulatedDay;
      handleProactiveDayTransition(simulatedDay);
    }
  }, [simulatedDay]);

  // --- Habits & Goals Tracking Core Engines ---
  

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
      createdAt: simulatedDay
    };

    setHabits(prev => [...prev, newHab]);

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
    const targetDate = dateStr || simulatedDay;
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
     const todayDateStr = simulatedDay;
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
      
      // Offer weekly report on Sundays if not already offered today
      const dayOfWeek = new Date(newDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
      if (dayOfWeek === "Sunday" && !weeklyReportOffered) {
        setWeeklyReportOffered(true);
        setTimeout(() => {
          setChatMessages(prev => [
            ...prev,
            {
              id: `msg-weekly-report-offer-${Date.now()}`,
              role: "model",
              content: "It's the end of the week! Would you like me to generate your weekly productivity report? You can access it by clicking the 'Weekly Report' button in the header.",
              timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }, 500);
      }
      
      // Reset the offer flag when it's not Sunday anymore
      if (newDay !== "Sunday") {
        setWeeklyReportOffered(false);
      }
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
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setConfirmModal({
      isOpen: true,
      itemName: task.task,
      onConfirm: () => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      },
    });
  };

  const handleDeleteHabit = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    setConfirmModal({
      isOpen: true,
      itemName: habit.name,
      onConfirm: () => {
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
      },
    });
  };

  const handleDeleteDeadline = (deadlineId: string) => {
    const deadline = deadlines.find((d: any) => d.id === deadlineId);
    if (!deadline) return;
    setConfirmModal({
      isOpen: true,
      itemName: deadline.name,
      onConfirm: () => {
        setDeadlines((prev: any[]) => prev.filter((d: any) => d.id !== deadlineId));
      },
    });
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

  if (splashVisible) {
    return (
      <div
        className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-300 ${
          splashFading ? "opacity-0" : "opacity-100"
        }`}
      >
        <img
          src={logo}
          alt="Heimdall Logo"
          className="max-w-[500px] max-h-[500px] w-auto h-auto object-contain"
        />
        <h1 className="text-5xl font-black text-primary mt-6 tracking-tighter font-display">
          HEIMDALL
        </h1>
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="dark runic-pattern min-h-screen bg-surface flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-primary/20"></div>
        <p className="font-mono text-xs text-primary uppercase tracking-widest animate-pulse">Contacting Bifrost...</p>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Synchronizing Your Protected Data</p>
      </div>
    );
  }

  return (
    <div className="dark runic-pattern min-h-screen flex flex-col">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onProfileClick={() => setShowProfileModal(true)} />
      <TopBar
        simulatedDay={simulatedDay}
        onDayChange={setSimulatedDay}
        onSettingsClick={() => setShowSettings(true)}
      />
      <main className="flex-1 pt-16 pb-12 px-container-padding md:ml-52 transition-all duration-300">
        {activeTab === "agenda" && (
          <AgendaTab
            tasks={tasks}
            simulatedDay={simulatedDay}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={(task) => setTasks(prev => [...prev, task])}
            onResetSchedule={handleResetSchedule}
            habits={habits}
            onAddHabit={executeAddHabit}
            onLogHabit={executeLogHabit}
            onRemoveHabit={handleDeleteHabit}
            onRegenerateSchedule={(prompt) => handleAIGenerateSchedule({ preventDefault: () => {} } as React.FormEvent)}
            categories={categories}
            onAddCategory={(cat) => setCategories(prev => [...prev, cat])}
            deadlines={deadlines}
            onAddDeadline={(name, date) => setDeadlines(prev => [...prev, { id: 'deadline-' + Date.now(), name, date }])}
            onRemoveDeadline={handleDeleteDeadline}
          />
        )}

        {activeTab === "habits" && (
          <HabitsPage
            habits={habits}
            onAddHabit={executeAddHabit}
            onLogHabit={executeLogHabit}
            onRemoveHabit={handleDeleteHabit}
          />
        )}

        {activeTab === "actions" && (
          <ActionsTab
            onDetectGaps={executeDetectGapsAndNudge}
            onCheckDocuments={executeCheckDriveDocuments}
            onWeeklyReport={() => setShowWeeklyReport(true)}
          />
        )}
        {activeTab === "advisor" && (
          <AdvisorTab
            chatMessages={chatMessages}
            isLoadingAdvisor={isLoadingAdvisor}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSendChat={handleSendChat}
            onQuickPrompt={handleQuickChatPrompt}
          />
        )}
      </main>

      {showWeeklyReport && (
        <div
          onClick={() => setShowWeeklyReport(false)}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()} className="max-w-xl w-full max-h-[80vh] overflow-y-auto">
            <WeeklyReport tasks={tasks} onClose={() => setShowWeeklyReport(false)} />
          </div>
        </div>
      )}

      {showCalendarModal && (
        /* Keep the existing calendar modal JSX unchanged */
        <div id="calendar-confirmation-modal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6 text-left">
            <button onClick={() => setShowCalendarModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-mono text-lg p-2">✕</button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl"><CalendarDays className="w-6 h-6 text-emerald-400" /></div>
              <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Heimdall Protocol</h3><h2 className="text-xl font-bold text-white">Calendar Sync Accomplished</h2></div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-4 border border-slate-800/80 rounded-xl">{calendarSummary || "Events prepared and synchronized successfully."}</p>
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Confirmed Events Structure:</p>
              {createdEvents && createdEvents.map((evt, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
                  <div className="flex flex-col gap-1"><p className="text-xs font-semibold text-white">{evt.title}</p><p className="text-[10px] text-slate-400 font-mono">Date: {evt.day}</p></div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold"><Clock className="w-3 h-3" />{evt.start_time} - {evt.end_time}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-2">
              {downloadIcsUrl && <a href={downloadIcsUrl} download="heimdall_schedule.ics" className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 flex items-center justify-center gap-2.5 font-bold py-3 px-4 rounded-xl text-xs">Download .ICS</a>}
              <button onClick={() => setShowCalendarModal(false)} className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 py-2.5 px-4 rounded-xl text-xs">Done</button>
            </div>
          </div>
        </div>
      )}

      {showPasteEmailModal && (
        /* Keep the paste email modal unchanged */
        <div id="paste-email-simulation-modal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* ... existing paste modal JSX ... */}
        </div>
      )}

      {streakBadgeAlert && (
        /* Keep streak badge modal */
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl shadow-emerald-500/5">
            <Award className="w-16 h-16 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-widest">Streak Unlocked!</h3>
            <p className="text-xl font-bold text-slate-100 font-display">{streakBadgeAlert.habitName}</p>
            <div className="py-2.5 px-4 bg-slate-950/80 border border-slate-800 rounded-xl max-w-[180px] mx-auto flex items-center justify-center gap-2">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500/15 animate-pulse" />
              <span className="text-2xl font-black font-mono text-slate-100">{streakBadgeAlert.streak} Days</span>
            </div>
            <button onClick={() => setStreakBadgeAlert(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono py-2 rounded-xl text-xs uppercase cursor-pointer transition-all">Continue Execution ⚡</button>
          </div>
        </div>
      )}

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <footer className="md:ml-52 border-t border-outline-variant bg-surface px-container-padding py-2 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant">Built By Junaid</span>
          <div className="flex gap-8">
            <button
              onClick={openPrivacyPolicy}
              className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={openSupport}
              className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>
        </div>
      </footer>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        itemName={confirmModal.itemName}
        onClose={() => setConfirmModal({ isOpen: false, itemName: "", onConfirm: null })}
        onConfirm={confirmModal.onConfirm || (() => {})}
      />
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: "", body: "" })}
        title={infoModal.title}
      >
        {infoModal.body}
      </InfoModal>
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogin={handleProfileLogin}
        onLogout={handleProfileLogout}
        onUpdateDisplayName={handleUpdateUserDisplayName}
      />


    </div>
  );
}
