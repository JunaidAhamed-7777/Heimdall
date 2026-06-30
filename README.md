# Heimdall Productivity Companion

https://heimdall-productivity-companion-1091650404271.asia-southeast1.run.app

## Overview
Heimdall is an executive productivity companion that integrates real-time Gmail monitoring, Google Workspace connectivity, and AI-driven task management to streamline personal and professional workflows. The app solves the problem of fragmented task tracking and missed deadlines by unifying notifications, calendar synchronization, and intelligent scheduling.

## Table of Contents
- [Overview](#overview)
- [Real-time Notifications System](#real-time-notifications-system)
- [Google OAuth & User Data Isolation](#google-oauth--user-data-isolation)
- [Database Security & Encryption](#database-security--encryption)
- [Google Drive, Gmail, and Calendar Integration](#google-drive-gmail-and-calendar-integration)
- [Settings Tab](#settings-tab)
- [Export Tasks as Excel & AI-powered Import](#export-tasks-as-excel--ai-powered-import)
- [AI-driven Intelligent Task Prioritization](#ai-driven-intelligent-task-prioritization)
- [Weekly Report Generation](#weekly-report-generation)
- [Personalized Productivity Recommendations](#personalized-productivity-recommendations)
- [Context-aware Reminders](#context-aware-reminders)
- [Goal and Habit Tracking](#goal-and-habit-tracking)
- [Voice-enabled Assistance](#voice-enabled-assistance)
- [Autonomous Task Planning and Execution](#autonomous-task-planning-and-execution)
- [Additional Functionality](#additional-functionality)

## Overview
Heimdall provides a unified dashboard where users can view upcoming tasks, manage deadlines, receive proactive alerts, and collaborate with AI to optimize daily routines. The platform leverages Firebase for secure user data storage and Google APIs for seamless integration with Gmail, Drive, and Calendar.

## Real-time Notifications System
Heimdall implements a real-time notifications engine that monitors Gmail for confirmations and extracts actionable tasks. Users receive bell icon alerts for upcoming deadlines, habit slip nudges, and gap detection prompts. The system pushes notifications through the UI and via the notifications modal, ensuring timely awareness of critical updates.

## Google OAuth & User Data Isolation
Users authenticate via Google OAuth, which isolates each user's data in dedicated Firestore documents. The backend enforces security rules that restrict access to a user's documents only, and encryption in transit is enforced through HTTPS. Account deletion is irreversible and removes all associated data from the database.

## Database Security & Encryption
Firestore security rules enforce per-user document isolation, requiring authentication and user-level path matching. Data is encrypted in transit using TLS, and while at-rest encryption is handled by the underlying cloud provider, the app does not store sensitive keys. The architecture supports automatic backup and recovery.

## Google Drive, Gmail, and Calendar Integration
Heimdall integrates with Google Drive, Gmail, and Calendar through OAuth scopes. It auto-extracts events and tasks from email, syncs appointments bidirectionally with the calendar, and enables export and import of tasks as Excel spreadsheets. Drive file monitoring allows the app to track document activity and provide relevant nudges.

## Settings Tab
The settings tab lets users edit their display name, manage task categories, and connect or disconnect Google Workspace integrations. Changes are persisted in Firestore and reflected instantly across the UI.

## Export Tasks as Excel & AI-powered Import
Users can export their task list as an Excel file using the export function, which generates a structured .xlsx document. The AI-powered import feature parses Excel files, auto-generates tasks, and suggests initial categorization based on content analysis.

## AI-driven Intelligent Task Prioritization
The Actions → Detect Gaps feature analyzes schedule inefficiencies, identifies conflicts, and recommends optimizations. It suggests rescheduling high-priority tasks, inserting breaks, and aligning work with peak productivity times based on historical patterns.

## Weekly Report Generation
The app generates weekly reports that include bar charts comparing planned versus completed tasks and pie charts showing productivity by time of day. Gemini-powered insights provide actionable recommendations derived from the user's schedule and performance data.

## Personalized Productivity Recommendations
Through Detect Gaps analysis, the app offers personalized schedule adjustments, suggesting habit formation, time blocking, and resource allocation to improve efficiency and reduce burnout.

## Context-aware Reminders
Reminders are triggered based on upcoming deadlines, habit streaks, and detected schedule gaps. Users receive proactive nudges via the notification system, prompting immediate action on critical tasks or missed habits.

## Goal and Habit Tracking
Users can set goals and habits, earn streak badges, and access a habit lounge for community interaction. The app monitors habit compliance and issues nudges when streaks are at risk, encouraging consistent behavior.

## Voice-enabled Assistance
Using the Web Speech API, users can input tasks via voice, with real-time transcription displayed in comic-style speech bubbles. The voice interface supports natural language commands for scheduling, task creation, and query resolution.

## Autonomous Task Planning and Execution
Heimdall parses confirmed events from Gmail, automatically creates calendar events, and adjusts schedules based on AI recommendations. It can generate daily timetables, fill gaps with micro-tasks, and adapt plans dynamically.

## Additional Functionality
- Dynamic categories allow flexible task grouping.
- Deadline management includes creation, editing, and deletion of time-bound objectives.
- Dark Asgardian theme provides a visually distinct interface with custom color palette.
- Date picker supports month and year selection for flexible scheduling.
- Splash screen offers a branded loading experience.
- Privacy policy and support modals deliver transparent information and assistance.
- Responsive sidebar and mobile navigation ensure seamless access across devices.
