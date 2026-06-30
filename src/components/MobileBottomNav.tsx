import { Calendar, Zap, MessageSquare } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant flex justify-around py-3 px-4 z-50">
      <button
        onClick={() => setActiveTab("agenda")}
        className={`flex flex-col items-center gap-1 ${activeTab === "agenda" ? "text-primary" : "text-on-surface-variant"}`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[9px] font-label-caps">AGENDA</span>
      </button>
      <button
        onClick={() => setActiveTab("actions")}
        className={`flex flex-col items-center gap-1 ${activeTab === "actions" ? "text-primary" : "text-on-surface-variant"}`}
      >
        <Zap className="w-5 h-5" />
        <span className="text-[9px] font-label-caps">ACTIONS</span>
      </button>
      <button
        onClick={() => setActiveTab("advisor")}
        className={`flex flex-col items-center gap-1 ${activeTab === "advisor" ? "text-primary" : "text-on-surface-variant"}`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[9px] font-label-caps">CHAT</span>
      </button>
    </nav>
  );
}