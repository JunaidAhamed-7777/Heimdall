HEIMDALL PRIVACY POLICY
Effective Date: June 30, 2026
Last Updated: June 30, 2026

══════════════════════════════════════════════════════════════════════════════

Thank you for trusting Heimdall with your productivity journey. We built this policy to be transparent, readable, and honest — because trust is earned through clarity, not legalese.

══════════════════════════════════════════════════════════════════════════════
1. WHO WE ARE
══════════════════════════════════════════════════════════════════════════════

Heimdall ("we," "our," "us") is an executive productivity companion developed by Junaid Ahamed. Our mission is to help you bypass stress with precise execution — turning overwhelm into structured, actionable plans.

Contact: https://github.com/JunaidAhamed-7777/Heimdall
Repository: https://github.com/JunaidAhamed-7777/Heimdall

══════════════════════════════════════════════════════════════════════════════
2. DATA WE COLLECT (AND WHY WE COLLECT IT
══════════════════════════════════════════════════════════════════════════════

We collect only what's necessary to deliver the productivity experience you expect. Every data point serves a specific purpose.

┌─────────────────────────────────────────────────────────────────────────────┐
│ A. ACCOUNT & AUTHENTICATION DATA                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Firebase UID (unique, anonymous identifier)                               │
│ • Google display name, email, profile photo (via Google OAuth)              │
│ • Authentication timestamps                                                │
│ PURPOSE: Identify you securely, sync your data across devices, enable      │
│          personalized experience. We never see your password.              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ B. PRODUCTIVITY DATA (stored in your private Firestore document)           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Tasks & Schedule: titles, times, durations, categories, completion       │
│   status, descriptions, optional Google Drive file links, optional         │
│   Google Calendar event IDs                                                │
│ • Chat History: your conversations with the AI advisor (Heimdall)          │
│ • Habits: names, frequencies, preferred times, streaks, completion history │
│ • Categories: your custom task category tags                                │
│ • Deadlines: names and dates you create                                     │
│ • Motif: your personal focus strategy statement                             │
│ • Connection Status: which Google services you've linked (boolean flags)   │
│ PURPOSE: Core app functionality — scheduling, AI coaching, habit tracking, │
│          progress insights, weekly reports.                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ C. GOOGLE INTEGRATION DATA (only with your explicit OAuth consent)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Gmail: OAuth access token (read-only scope), your Gmail address,         │
│   processed email message IDs (to avoid re-processing), last check time    │
│ • Google Drive: OAuth access token (read-only scope), registered file IDs  │
│   for documents you choose to monitor                                       │
│ • Google Calendar: OAuth access token (calendar scope) for event creation  │
│ PURPOSE: Gmail monitoring for auto-extracting appointments, Drive document │
│          inactivity nudges, Calendar ICS export and event creation.        │
│          Tokens are stored encrypted in Firestore and locally in           │
│          browser localStorage. You can revoke anytime in Settings.         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ D. AI PROCESSING DATA (sent to Google Gemini API)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Schedule generation prompts: your raw stress/workload input              │
│ • Chat messages: your questions + your current schedule/habits context     │
│ • Email content: when you paste emails or connect Gmail for analysis       │
│ • Gap analysis: your tasks, deadlines, habits for schedule optimization    │
│ • Drive document metadata: file modification times (not content)           │
│ PURPOSE: Intelligent scheduling, conversational coaching, email extraction,│
│          proactive nudges, timeline intelligence.                          │
│ NOTE: Google's Gemini API processes this data per their privacy policy.    │
│       We do not train models on your data.                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ E. TECHNICAL & USAGE DATA                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Browser localStorage: OAuth tokens, processed Gmail IDs, user preferences│
│ • Server logs: API request/response metadata (no payload content)          │
│ • Error reports: stack traces for debugging (no personal data)             │
│ PURPOSE: Session persistence, debugging, reliability monitoring.           │
└─────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
3. HOW WE STORE & PROTECT YOUR DATA
══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ FIRESTORE (Primary Database)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Each user's data lives in a dedicated document: /users/{your_UID}        │
│ • Firestore Security Rules enforce: you can ONLY read/write YOUR document  │
│   (see firestore.rules in our public repo)                                 │
│ • Data encrypted at rest (Google Cloud default) and in transit (TLS 1.2+)  │
│ • Located in Google Cloud region configured for the Firebase project       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LOCAL STORAGE (Browser)                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • OAuth access tokens for Google integrations                              │
│ • Gmail processed message ID cache (prevents duplicate processing)         │
│ • Cleared automatically when you disconnect an integration                 │
│ • Never synced to cloud — stays on your device                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVER-SIDE (Express API)                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • In-memory cache for Drive document monitoring (file ID → last modified)  │
│ • No persistent database on server — all user data in Firestore            │
│ • API keys (Gemini) stored in environment variables, never in code         │
└─────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
4. DATA SHARING & THIRD PARTIES
══════════════════════════════════════════════════════════════════════════════

We do NOT sell your data. We do NOT share your data with advertisers. Period.

┌─────────────────────────────────────────────────────────────────────────────┐
│ GOOGLE SERVICES (with your explicit consent)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Firebase Auth: Handles your Google sign-in (Google sees auth events)     │
│ • Firestore: Stores your productivity data (Google Cloud infrastructure)   │
│ • Gmail API: Read-only access to scan for confirmations (you authorize)    │
│ • Google Drive API: Read-only metadata for registered files (you authorize)│
│ • Google Calendar API: Create events via ICS (you authorize)               │
│ • Gemini API: AI processing (schedule, chat, analysis) — see below         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GOOGLE GEMINI AI (Critical Transparency)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Your prompts + context (schedule, habits, emails) sent to Gemini API     │
│ • Google's privacy policy applies: https://policies.google.com/privacy     │
│ • Google states they do NOT use API data to train models (as of 2026)      │
│ • We send only what's needed for each request — no bulk uploads            │
│ • You can use the app WITHOUT AI features (manual scheduling works)        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LEGAL & SAFETY                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ We may disclose data only if:                                              │
│ • Required by law, court order, or government request                      │
│ • To protect rights, property, or safety of users or public                │
│ • To enforce our Terms of Service                                          │
└─────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
5. YOUR RIGHTS & CONTROL
══════════════════════════════════════════════════════════════════════════════

You are in control. Always.

┌─────────────────────────────────────────────────────────────────────────────┐
│ ACCESS & PORTABILITY                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Export all your data: Settings → Import/Export → "Export Data" (JSON)    │
│ • Includes: tasks, habits, chat history, categories, deadlines, motif      │
│ • OAuth tokens NOT exported (security) — re-authenticate on import         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DELETION & RETENTION                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Delete account: Settings → Profile → "Delete Account"                    │
│   → Permanently removes your Firestore document + Firebase Auth account    │
│ • Disconnect integrations: Settings → Connections → "Disconnect"           │
│   → Revokes OAuth tokens, clears localStorage, stops background sync       │
│ • Local data: Clear browser data anytime (localStorage, cache)             │
│ • Server logs: Rotated automatically, retained ≤ 30 days                   │
│ • Gemini API: Google retains per their policy (typically 18-30 days)       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CORRECTION & OBJECTION                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Edit any task, habit, deadline, category, motif directly in the app      │
│ • Disable AI features: Use manual scheduling, skip chat advisor            │
│ • Opt out of background Gmail polling: Disconnect Gmail integration        │
│ • Disable nudge notifications: Toggle in Settings (planned)                │
└─────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
6. CHILDREN'S PRIVACY
══════════════════════════════════════════════════════════════════════════════

Heimdall is not directed to children under 13 (or 16 in EU/UK). We do not knowingly collect data from children. If you believe a child has provided data, contact us immediately for deletion.

══════════════════════════════════════════════════════════════════════════════
7. INTERNATIONAL DATA TRANSFERS
══════════════════════════════════════════════════════════════════════════════

Our infrastructure (Firebase, Google Cloud, Gemini API) operates globally. Data may be processed in the United States or other countries where Google operates. By using Heimdall, you consent to this transfer. Google Cloud provides Standard Contractual Clauses and other GDPR transfer mechanisms.

══════════════════════════════════════════════════════════════════════════════
8. SECURITY MEASURES
══════════════════════════════════════════════════════════════════════════════

• Firebase Authentication: Industry-standard OAuth 2.0 + OpenID Connect
• Firestore Rules: User-scoped access — mathematically enforced at database layer
• TLS 1.2+ encryption for all network traffic
• OAuth tokens: Scoped to minimum required permissions (read-only where possible)
• No passwords stored — we delegate auth entirely to Google
• Regular dependency updates, security scanning via GitHub Dependabot
• Open source — code auditable at https://github.com/JunaidAhamed-7777/Heimdall

══════════════════════════════════════════════════════════════════════════════
9. CHANGES TO THIS POLICY
══════════════════════════════════════════════════════════════════════════════

We may update this policy as features evolve. Material changes will be:
• Notified in-app via the Info Modal
• Reflected in the "Last Updated" date above
• Committed to the public repository with full diff history

Continued use after changes constitutes acceptance. We encourage periodic review.

══════════════════════════════════════════════════════════════════════════════
10. CONTACT US
══════════════════════════════════════════════════════════════════════════════

Questions, concerns, or requests regarding your data?

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📧 GitHub Issues: https://github.com/JunaidAhamed-7777/Heimdall/issues     │
│ 📖 Repository:    https://github.com/JunaidAhamed-7777/Heimdall            │
│ 🐛 Bug Reports:   Use GitHub Issues template                               │
│ 💡 Feature Ideas: Open a Discussion or Issue                               │
└─────────────────────────────────────────────────────────────────────────────┘

We respond to all legitimate privacy inquiries within 30 days.

══════════════════════════════════════════════════════════════════════════════
11. SUMMARY: YOUR DATA, YOUR RULES
══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅  You own your productivity data                                         │
│ ✅  Export anytime (JSON)                                                  │
│ ✅  Delete anytime (one click)                                             │
│ ✅  Granular control over each Google integration                          │
│ ✅  No tracking, no ads, no data brokers                                   │
│ ✅  Open source — verify everything yourself                               │
│ ✅  AI processing transparent — you see every prompt sent                  │
│ ✅  Firestore rules enforce your data isolation at database level          │
└─────────────────────────────────────────────────────────────────────────────┘

Heimdall exists to serve YOU — not advertisers, not data markets, not anyone
else. Your trust is our only metric that matters.

──────────────────────────────────────────────────────────────────────────────
"Life happens, let's get back on track together." — Heimdall
──────────────────────────────────────────────────────────────────────────────