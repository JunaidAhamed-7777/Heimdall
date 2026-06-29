import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  availableDates: string[];
}

export default function DatePicker({ selectedDate, onDateChange, availableDates }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div ref={ref} className="relative w-44">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-label-caps bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:border-primary transition-colors"
      >
        <span>{formatDate(selectedDate)}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <ul className="absolute top-full mt-1 w-full bg-surface-container border border-outline-variant rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar">
          {availableDates.map((date) => (
            <li
              key={date}
              onClick={() => { onDateChange(date); setIsOpen(false); }}
              className={`px-4 py-2 text-xs font-label-caps cursor-pointer transition-colors ${
                date === selectedDate
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
            >
              {formatDate(date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}