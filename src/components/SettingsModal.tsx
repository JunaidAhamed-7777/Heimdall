import { useEffect, useState } from "react";
import { X, Mail, Cloud } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section = "account" | "apps" | "privacy";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>("account");

  // Reset to first section each time modal opens
  useEffect(() => {
    if (isOpen) setActiveSection("account");
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections: { id: Section; label: string }[] = [
    { id: "account", label: "Account Options" },
    { id: "apps", label: "Connected Apps" },
    { id: "privacy", label: "Privacy Policy" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl h-[28rem] mx-4 shadow-2xl flex overflow-hidden"
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
        <div className="w-4/5 p-6 overflow-y-auto custom-scrollbar relative">
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
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
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
      </div>
    </div>
  );
}