import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const ref = useRef<HTMLDivElement>(null);

  const getSystemToday = () => new Date().toISOString().slice(0, 10);

  // Initialize current month view based on selectedDate or today's date
  const [viewDate, setViewDate] = useState(() => {
    const initStr = selectedDate && selectedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? selectedDate : getSystemToday();
    const [y, m] = initStr.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  useEffect(() => {
    if (selectedDate && selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m] = selectedDate.split("-").map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [selectedDate]);

  // Reset viewDate and viewMode whenever the calendar opens
  useEffect(() => {
    if (isOpen) {
      const initStr = selectedDate && selectedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? selectedDate : getSystemToday();
      const [y, m] = initStr.split("-").map(Number);
      setViewDate(new Date(y, m - 1, 1));
      setViewMode("days");
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const formatDateTrigger = (dateStr: string) => {
    if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr || "Select Date";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthShort = viewDate.toLocaleDateString("en-US", { month: "short" });

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const realToday = getSystemToday();
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const allYears = Array.from({ length: 11 }, (_, i) => 2025 + i);

  let canPrev = false;
  let canNext = false;
  if (viewMode === "days") {
    canPrev = !(year <= 2025 && month === 0);
    canNext = !(year >= 2035 && month === 11);
  } else if (viewMode === "months") {
    canPrev = year > 2025;
    canNext = year < 2035;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(prev => {
        if (prev.getFullYear() <= 2025 && prev.getMonth() === 0) return prev;
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      });
    } else if (viewMode === "months") {
      setViewDate(prev => {
        if (prev.getFullYear() <= 2025) return prev;
        return new Date(prev.getFullYear() - 1, prev.getMonth(), 1);
      });
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(prev => {
        if (prev.getFullYear() >= 2035 && prev.getMonth() === 11) return prev;
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      });
    } else if (viewMode === "months") {
      setViewDate(prev => {
        if (prev.getFullYear() >= 2035) return prev;
        return new Date(prev.getFullYear() + 1, prev.getMonth(), 1);
      });
    }
  };

  return (
    <div ref={ref} className="relative inline-block w-44">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-label-caps bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:border-primary hover:text-primary transition-all shadow-sm cursor-pointer"
      >
        <div className="flex items-center gap-2 font-bold text-primary truncate">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <span>{formatDateTrigger(selectedDate)}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 md:left-0 mt-2 w-64 bg-surface-container border border-outline-variant rounded-xl shadow-2xl p-4 z-50 animate-fadeIn backdrop-blur-md">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/60">
            <button
              type="button"
              disabled={!canPrev}
              onClick={handlePrev}
              className={`p-1 rounded-md transition-colors ${canPrev ? "hover:bg-primary/20 text-on-surface-variant hover:text-primary cursor-pointer" : "opacity-30 cursor-not-allowed text-on-surface-variant"}`}
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 font-label-caps text-xs font-bold tracking-wider text-primary uppercase">
              {viewMode === "days" && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode("months")}
                    className="px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Switch to Month Selector"
                  >
                    {monthShort}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("years")}
                    className="px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Switch to Year Selector"
                  >
                    {year}
                  </button>
                </>
              )}
              {viewMode === "months" && (
                <>
                  <span className="text-on-surface-variant text-[10px] mr-0.5 font-normal">YEAR:</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("years")}
                    className="px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Switch to Year Selector"
                  >
                    {year}
                  </button>
                </>
              )}
              {viewMode === "years" && (
                <span>2025 - 2035</span>
              )}
            </div>

            <button
              type="button"
              disabled={!canNext}
              onClick={handleNext}
              className={`p-1 rounded-md transition-colors ${canNext ? "hover:bg-primary/20 text-on-surface-variant hover:text-primary cursor-pointer" : "opacity-30 cursor-not-allowed text-on-surface-variant"}`}
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View: Days */}
          {viewMode === "days" && (
            <>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {dayHeaders.map((day, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-mono font-bold ${
                      idx === 0 || idx === 6 ? "text-primary/60" : "text-on-surface-variant"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Monthly Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Blank leading days */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`blank-${idx}`} className="w-7 h-7" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isSelected = dateStr === selectedDate;
                  const isAvailable = dateStr >= "2025-01-01" && dateStr <= "2035-12-31";
                  const isToday = dateStr === realToday;
                  const dayOfWeek = new Date(year, month, dayNum).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (!isAvailable) return;
                        onDateChange(dateStr);
                        setIsOpen(false);
                      }}
                      className={`w-7 h-7 mx-auto rounded-md text-xs font-mono flex items-center justify-center transition-all select-none relative ${
                        isSelected
                          ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/30 scale-105 z-10 cursor-pointer"
                          : isAvailable
                          ? `cursor-pointer hover:bg-primary/20 hover:text-primary ${
                              isWeekend ? "text-on-surface-variant/80 bg-surface/40" : "text-on-surface bg-surface/80"
                            }`
                          : "cursor-not-allowed opacity-25 text-on-surface-variant bg-transparent"
                      }`}
                      title={isAvailable ? formatDateTrigger(dateStr) : "Outside protocol date range (2025-2035)"}
                    >
                      <span>{dayNum}</span>
                      {/* Gold indicator ring for today's system date */}
                      {isToday && !isSelected && (
                        <span className="absolute inset-0 rounded-md border border-primary/80 pointer-events-none animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* View: Months */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {allMonths.map((mName, mIdx) => {
                const isSelectedMonth = mIdx === month && year === new Date(selectedDate || realToday).getFullYear();
                const isTodayMonth = year === new Date().getFullYear() && mIdx === new Date().getMonth();

                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(year, mIdx, 1));
                      setViewMode("days");
                    }}
                    className={`py-2.5 rounded-lg text-xs font-mono flex items-center justify-center transition-all select-none relative ${
                      isSelectedMonth
                        ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/30 scale-105 z-10 cursor-pointer"
                        : "cursor-pointer hover:bg-primary/20 hover:text-primary text-on-surface bg-surface/80"
                    }`}
                  >
                    <span>{mName}</span>
                    {isTodayMonth && !isSelectedMonth && (
                      <span className="absolute inset-0 rounded-lg border border-primary/80 pointer-events-none animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* View: Years */}
          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-2 py-2 max-h-56 overflow-y-auto pr-1">
              {allYears.map((yVal) => {
                const isSelectedYear = yVal === new Date(selectedDate || realToday).getFullYear();
                const isTodayYear = yVal === new Date().getFullYear();

                return (
                  <button
                    key={yVal}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(yVal, month, 1));
                      setViewMode("days");
                    }}
                    className={`py-2 rounded-lg text-xs font-mono flex items-center justify-center transition-all select-none relative ${
                      isSelectedYear
                        ? "bg-primary text-on-primary font-bold shadow-md shadow-primary/30 scale-105 z-10 cursor-pointer"
                        : "cursor-pointer hover:bg-primary/20 hover:text-primary text-on-surface bg-surface/80"
                    }`}
                  >
                    <span>{yVal}</span>
                    {isTodayYear && !isSelectedYear && (
                      <span className="absolute inset-0 rounded-lg border border-primary/80 pointer-events-none animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend / Status Footer */}
          <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[9px] font-label-caps text-on-surface-variant tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm border border-primary/80 inline-block" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-primary inline-block" />
              <span className="text-primary">Selected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
