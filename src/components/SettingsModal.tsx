import { useEffect, useState } from "react";
import { X, Mail, Cloud, Pencil, Trash2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  categories: string[];
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
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl h-[28rem] mx-4 shadow-2xl flex overflow-hidden relative"
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
        <div className={`w-4/5 p-6 overflow-y-auto custom-scrollbar relative transition-all duration-200 ${isAnyNestedOpen ? "blur-sm pointer-events-none" : ""}`}>
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

          <div className="text-on-surface-variant font-body-md text-sm leading-relaxed">
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
                <div className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="text-xs">Gmail Integration</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                  <Cloud className="w-5 h-5 text-primary" />
                  <span className="text-xs">Google Drive Integration</span>
                </div>
              </div>
            )}

            {activeSection === "privacy" && (
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
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