import React, { useState, useEffect, useRef } from "react";
import { X, Check, Edit2, LogOut, Lock, ExternalLink, User as UserIcon } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onUpdateDisplayName: (newName: string) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  onUpdateDisplayName,
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      setIsEditing(false);
      setError(null);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!isOpen) return null;

  const handleStartEdit = () => {
    setEditName(user?.displayName || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (trimmed) {
      onUpdateDisplayName(trimmed);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const triggerLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onLogin();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to log in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLogout = async () => {
    setIsLoading(true);
    try {
      await onLogout();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to log out.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          /* LOGGED IN VIEW */
          <div className="flex flex-col items-center py-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary mb-4 shrink-0 shadow-lg shadow-primary/20">
              {user.photoURL ? (
                <img
                  className="w-full h-full object-cover"
                  src={user.photoURL}
                  alt={user.displayName || "User photo"}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-surface-variant flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-on-surface-variant" />
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 mb-1 w-full max-w-xs">
                <input
                  ref={inputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveEdit}
                  className="bg-surface-container border border-primary text-white text-center font-bold text-lg px-2 py-1 rounded w-full outline-none focus:ring-1 focus:ring-primary"
                  maxLength={30}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 group">
                <h3 className="text-white font-black text-xl tracking-tight leading-none">
                  {user.displayName || "Heimdall Citizen"}
                </h3>
                <button
                  onClick={handleStartEdit}
                  className="text-on-surface-variant hover:text-primary p-1 rounded transition-colors cursor-pointer"
                  title="Edit Display Name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-xs text-on-surface-variant font-mono mb-8">{user.email}</p>

            {error && (
              <p className="text-xs text-error font-mono mb-4 text-center">{error}</p>
            )}

            <button
              onClick={triggerLogout}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg border border-error/30 bg-error/10 hover:bg-error/20 text-error font-label-caps text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        ) : (
          /* GUEST VIEW */
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-on-surface font-headline-sm font-bold text-lg leading-tight">
                Heimdall Will Gain Access To:
              </h2>
            </div>

            <div className="space-y-3 mb-6 bg-surface-container/40 p-4 border border-outline-variant/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white">Your Google Profile Name</p>
                  <p className="text-[10px] text-on-surface-variant">Used to personalize your experience.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white">Google Profile Photo</p>
                  <p className="text-[10px] text-on-surface-variant">Displayed in the Heimdall control terminal.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-60">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Gmail inbox and outbox <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1 py-0.5 rounded uppercase font-mono">Optional</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant">Only connected if you explicitly activate Gmail Extraction.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-60">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Google Drive <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1 py-0.5 rounded uppercase font-mono">Optional</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant">Used strictly if you link document sync pools.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-60">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Google Calendar <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1 py-0.5 rounded uppercase font-mono">Optional</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant">Syncing Calendar with Heimdall.</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-6 font-sans">
              All information that flows through Heimdall is private and stored protected on Google AI Studio's Database. You may look at the{" "}
              <a
                href="https://github.com/JunaidAhamed-7777/Heimdall"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary-container font-semibold inline-flex items-center gap-0.5 underline transition-colors"
              >
                source code <ExternalLink className="w-3 h-3 inline" />
              </a>
              . Please read our Privacy Policy to know how data is stored and handled.
            </p>

            {error && (
              <p className="text-xs text-error font-mono mb-4 text-center">{error}</p>
            )}

            <button
              onClick={triggerLogin}
              disabled={isLoading}
              className="w-full py-3 bg-primary text-on-primary hover:bg-primary-container font-label-caps text-xs font-black rounded-xl transition-all shadow-lg shadow-primary/15 hover:shadow-primary/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? "Authenticating..." : "Login to Heimdall"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
