import { useEffect, useState } from "react";
import { X, Mail, Cloud, Calendar, Pencil, Trash2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import privacyPolicyText from "../../privacy_policy.txt?raw";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  categories: string[];
  connections?: { gmail: boolean; gdrive: boolean; calendar: boolean };
  connectionErrors?: { gmail: boolean; gdrive: boolean; calendar: boolean };
  onConnectIntegration?: (type: 'gmail' | 'gdrive' | 'calendar') => Promise<void>;
  onDisconnectIntegration?: (type: 'gmail' | 'gdrive' | 'calendar') => Promise<void>;
  onProfileClick: () => void;
  onDeleteAccount: () => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
}

type Section = "account" | "apps" | "privacy";

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  categories,
  connections = { gmail: false, gdrive: false, calendar: false },
  connectionErrors = { gmail: false, gdrive: false, calendar: false },
  onConnectIntegration,
  onDisconnectIntegration,
  onProfileClick,
  onDeleteAccount,
  onEditCategory,
  onDeleteCategory,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>("account");

  // Nested popup states
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState<string | null>(null);
  const [editCategoryInput, setEditCategoryInput] = useState("");
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setActiveSection("account");
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editCategoryOpen) setEditCategoryOpen(null);
        else if (deleteCategoryOpen) setDeleteCategoryOpen(null);
        else if (deleteAccountOpen) setDeleteAccountOpen(false);
        else onClose();
      }
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, editCategoryOpen, deleteCategoryOpen, deleteAccountOpen, onClose]);

  if (!isOpen) return null;

  const sections: { id: Section; label: string }[] = [
    { id: "account", label: "Account Options" },
    { id: "apps", label: "Connected Apps" },
    { id: "privacy", label: "Privacy Policy" },
  ];

  const isAnyNestedOpen = deleteAccountOpen || editCategoryOpen || deleteCategoryOpen;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-4xl h-[34rem] mx-4 shadow-2xl flex overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left panel (20%) */}
        <div className="w-1/5 border-r border-outline-variant bg-surface-container p-4 space-y-1">
          <h3 className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-3">
            Settings
          </h3>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                activeSection === section.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Right panel (80%) */}
        <div className={`w-4/5 p-6 flex flex-col relative transition-all duration-200 ${isAnyNestedOpen ? "blur-sm pointer-events-none" : ""}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-headline-sm text-on-surface mb-4">
            {activeSection === "account" && "Account Options"}
            {activeSection === "apps" && "Connected Apps"}
            {activeSection === "privacy" && "Privacy Policy"}
          </h2>

          <div className="text-on-surface-variant font-body-md text-sm leading-relaxed flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {activeSection === "account" && (
              <div className="space-y-4">
                <button
                  onClick={onProfileClick}
                  className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-left text-xs hover:border-primary transition-colors"
                >
                  {user ? "Edit Account" : "Login"}
                </button>

                {user && (
                  <button
                    onClick={() => setDeleteAccountOpen(true)}
                    className="w-full px-4 py-2 bg-error/10 border border-error/30 rounded-lg text-left text-xs text-error hover:bg-error/20 transition-colors"
                  >
                    Delete Account (IRREVERSIBLE)
                  </button>
                )}

                <h4 className="font-label-caps text-on-surface text-[11px] uppercase mt-6 border-t border-outline-variant pt-4">
                  Your Work Categories
                </h4>
                <div className="space-y-2 mt-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2">
                      <span className="text-xs text-on-surface">{cat}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditCategoryInput(cat);
                            setEditCategoryOpen(cat);
                          }}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryOpen(cat)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "apps" && (
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant mb-2 font-mono">
                  Synchronize your workflows with Google Workspace. Integrate Gmail for automated message audits, Google Drive for project logs, and Google Calendar for precise time alignment.
                </p>
                {([
                  { id: 'gmail', name: 'Gmail Integration', desc: 'Monitors incoming confirmation emails to auto-generate events.', icon: Mail },
                  { id: 'gdrive', name: 'Google Drive Integration', desc: 'Syncs project logs and exported task lists to Drive storage.', icon: Cloud },
                  { id: 'calendar', name: 'Google Calendar Integration', desc: 'Harmonizes your Heimdall agenda directly with your calendar.', icon: Calendar }
                ] as const).map((app) => {
                  const isConnected = !!connections?.[app.id];
                  const hasError = !!connectionErrors?.[app.id];
                  const IconComp = app.icon;

                  return (
                    <div key={app.id} className="flex flex-col gap-2 p-4 bg-surface-container-low border border-outline-variant rounded-xl hover:border-outline transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isConnected ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-medium text-on-surface">{app.name}</h4>
                            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{app.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isConnected && !hasError && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-success font-mono font-medium px-2 py-0.5 bg-success/10 rounded-full border border-success/20">
                              <CheckCircle2 className="w-3 h-3" /> Connected
                            </span>
                          )}
                          {!isConnected && !hasError && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant font-mono font-medium px-2 py-0.5 bg-surface-variant rounded-full border border-outline-variant">
                              Disconnected
                            </span>
                          )}
                          {hasError && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-error font-mono font-medium px-2 py-0.5 bg-error/10 rounded-full border border-error/20">
                              <AlertTriangle className="w-3 h-3 animate-pulse" /> Out of sync
                            </span>
                          )}

                          <button
                            onClick={async () => {
                              try {
                                if (isConnected) {
                                  await onDisconnectIntegration?.(app.id);
                                } else {
                                  await onConnectIntegration?.(app.id);
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                              isConnected 
                                ? 'bg-surface hover:bg-error/10 hover:text-error border-outline-variant hover:border-error/30' 
                                : 'bg-primary text-on-primary hover:bg-primary/95 border-transparent'
                            }`}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>

                      {hasError && (
                        <div className="mt-2 p-3 bg-error/5 border border-error/10 rounded-lg flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[11px] text-error leading-relaxed">
                              Connection failed or expired. Please re-authorize to restore automated background updates.
                            </p>
                            <button
                              onClick={() => onConnectIntegration?.(app.id)}
                              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-error hover:underline"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Re-authorize Now
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeSection === "privacy" && (
              <pre className="text-xs font-mono whitespace-pre-wrap text-left">
                {privacyPolicyText}
              </pre>
            )}
          </div>
        </div>

        {/* Nested popups */}
        {deleteAccountOpen && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
            onClick={() => setDeleteAccountOpen(false)}
          >
            <div
              className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-headline-sm text-on-surface mb-4">Delete Account</h3>
              <p className="text-xs text-on-surface-variant mb-6">
                Are you sure you want to delete your account? All your information will be deleted from our database. This is IRREVERSIBLE.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteAccountOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-xs hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteAccount();
                    setDeleteAccountOpen(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-error text-on-error font-label-caps text-xs font-bold hover:bg-error-container transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {editCategoryOpen && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
            onClick={() => setEditCategoryOpen(null)}
          >
            <div
              className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-headline-sm text-on-surface mb-4">Edit Category</h3>
              <input
                type="text"
                value={editCategoryInput}
                onChange={(e) => setEditCategoryInput(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary mb-6 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editCategoryInput.trim()) {
                    onEditCategory(editCategoryOpen, editCategoryInput.trim());
                    setEditCategoryOpen(null);
                  } else if (e.key === "Escape") {
                    setEditCategoryOpen(null);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditCategoryOpen(null)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-xs hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editCategoryInput.trim()) {
                      onEditCategory(editCategoryOpen, editCategoryInput.trim());
                      setEditCategoryOpen(null);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteCategoryOpen && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
            onClick={() => setDeleteCategoryOpen(null)}
          >
            <div
              className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-headline-sm text-on-surface mb-4">Delete Category</h3>
              <p className="text-xs text-on-surface-variant mb-6">
                Are you sure you want to delete "{deleteCategoryOpen}"?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteCategoryOpen(null)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-xs hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteCategory(deleteCategoryOpen);
                    setDeleteCategoryOpen(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-error text-on-error font-label-caps text-xs font-bold hover:bg-error-container transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}