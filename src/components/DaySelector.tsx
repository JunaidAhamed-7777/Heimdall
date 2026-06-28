import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DaySelectorProps {
  selectedDay: string;
  allDays: string[];
  onChange: (day: string) => void;
}

export default function DaySelector({ selectedDay, allDays, onChange }: DaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-36">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-label-caps bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:border-primary transition-colors"
      >
        <span>{selectedDay}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-full mt-1 w-full bg-surface-container border border-outline-variant rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar">
          {allDays.map((day) => (
            <li
              key={day}
              onClick={() => { onChange(day); setIsOpen(false); }}
              className={`px-4 py-2 text-xs font-label-caps cursor-pointer transition-colors ${
                day === selectedDay
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
            >
              {day}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}