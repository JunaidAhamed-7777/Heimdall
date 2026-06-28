import { Zap, Bell, Settings } from "lucide-react";
import logo from "../../logo.png";

interface TopBarProps {
  simulatedDay: string;
  onDayChange: (day: string) => void;
  allDaysList: string[];
}

export default function TopBar({ simulatedDay, onDayChange, allDaysList }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-52 bg-surface dark:bg-surface border-b border-outline-variant z-40">
      <div className="flex justify-between items-center px-container-padding py-stack-md max-w-full mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="font-headline-sm text-headline-sm text-primary">Protocol Active</h1>
          <div className="hidden lg:flex gap-6 items-center ml-8">
            <span className="text-on-surface-variant font-label-caps text-[10px] tracking-widest border-r border-outline-variant pr-6">
              SYSTEM STATUS: OPTIMAL
            </span>
            <span className="text-on-surface-variant font-label-caps text-[10px] tracking-widest">
              ENERGY CAPACITY: 94%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 px-3 py-1 border border-primary/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-caps text-[11px] text-primary">VIGILANCE ACTIVE</span>
          </div>
          <select
            value={simulatedDay}
            onChange={(e) => onDayChange(e.target.value)}
            className="bg-surface-container border border-outline-variant text-on-surface font-label-caps px-3 py-1.5 focus:border-primary outline-none cursor-pointer text-xs"
          >
            {allDaysList.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">
            notifications
          </button>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">
            settings
          </button>
        </div>
      </div>
    </header>
  );
}