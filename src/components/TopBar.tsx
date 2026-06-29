import { useState, useEffect } from "react";
import { Bell, Settings } from "lucide-react";
import DaySelector from "./DaySelector";
import DatePicker from "./DatePicker";

interface TopBarProps {
  simulatedDay: string;
  onDayChange: (day: string) => void;
  allDaysList: string[];
}

export default function TopBar({ simulatedDay, onDayChange, allDaysList }: TopBarProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Check actual connectivity by pinging a reliable endpoint
  const checkConnectivity = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      // Use Google's 204 endpoint – works even with CORS because it's a simple GET
      await fetch("https://www.google.com/generate_204", {
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000); // every 30s

    // Listen to browser online/offline events
    const handleOnline = () => { checkConnectivity(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-52 bg-surface dark:bg-surface border-b border-outline-variant z-40">
      <div className="flex justify-between items-center px-container-padding py-stack-md max-w-full mx-auto">
        {/* Left side: online status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="font-label-caps text-xs text-on-surface-variant">
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Right side: day selector, icons */}
        <div className="flex items-center gap-4">
          <DatePicker
            selectedDate={simulatedDay}
            onDateChange={onDayChange}
            availableDates={allDaysList}
          />
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