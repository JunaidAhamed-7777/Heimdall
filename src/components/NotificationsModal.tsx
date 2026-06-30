import React, { useEffect } from "react";
import { X, Mail, Calendar, HardDrive, Bell, AlertTriangle } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "gmail_task" | "upcoming_deadline";
  title: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: {
    gmail: boolean;
    gdrive: boolean;
    calendar: boolean;
  };
  notifications: NotificationItem[];
}

export default function NotificationsModal({
  isOpen,
  onClose,
  connections,
  notifications,
}: NotificationsModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="notifications-backdrop"
    >
      <div
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        id="notifications-container"
      >
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          aria-label="Close Notifications"
          id="close-notifications-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-white font-black text-xl tracking-tight uppercase">
            Notifications
          </h2>
        </div>

        {/* Pinned Connection Status Rows */}
        <div className="mb-4 bg-surface-container/50 border border-outline-variant/50 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-on-surface-variant font-mono">
              <Mail className="w-3.5 h-3.5 text-primary/80" /> Gmail
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                connections.gmail ? "text-emerald-400" : "text-on-surface-variant/60"
              }`}
            >
              {connections.gmail ? "Connected" : "Not Connected"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-on-surface-variant font-mono">
              <HardDrive className="w-3.5 h-3.5 text-primary/80" /> Google Drive
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                connections.gdrive ? "text-emerald-400" : "text-on-surface-variant/60"
              }`}
            >
              {connections.gdrive ? "Connected" : "Not Connected"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-on-surface-variant font-mono">
              <Calendar className="w-3.5 h-3.5 text-primary/80" /> Google Calendar
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                connections.calendar ? "text-emerald-400" : "text-on-surface-variant/60"
              }`}
            >
              {connections.calendar ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>

        {/* Notification list container */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
                notifications_off
              </span>
              <p className="text-sm text-on-surface-variant font-sans font-medium">
                No active notifications
              </p>
              <p className="text-xs text-on-surface-variant/60 font-mono mt-1">
                You are fully up to date.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  notif.type === "gmail_task"
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                    : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                }`}
                id={`notif-item-${notif.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {notif.type === "gmail_task" ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-sans text-white leading-relaxed font-medium">
                      {notif.title}
                    </p>
                    <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1 block">
                      {new Date(notif.timestamp).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
