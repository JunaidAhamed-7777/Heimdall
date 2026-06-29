import React, { useState, useEffect } from "react";
import { TaskItem } from "../types";
import {
  Plus, Calendar, Clock, BookOpen, Presentation, Stethoscope, Coffee, Check,
  CheckCircle2, Circle, Trash2, Sparkles, RefreshCw, Award, Flame, TrendingUp,
  Info
} from "lucide-react";
import { INITIAL_TASKS, INITIAL_MOTIF } from "../utils/initialData";
import DatePicker from "./DatePicker";

interface AgendaTabProps {
  tasks: TaskItem[];
  simulatedDay: string;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: TaskItem) => void;
  onResetSchedule: () => void;
  // Habit related props
  habits: any[];
  onAddHabit: (name: string, freq: string, time: string, dur: number) => void;
  onLogHabit: (id: string) => void;
  onRemoveHabit: (id: string) => void;
  onRegenerateSchedule: (prompt: string) => void;
  categories: string[];
  onAddCategory: (categoryName: string) => void;
  deadlines: any[];
  onAddDeadline: (name: string, date: string) => void;
  onRemoveDeadline: (id: string) => void;
}

export default function AgendaTab({
  tasks, simulatedDay,
  onToggleTask, onDeleteTask, onAddTask, onResetSchedule,
  habits, onAddHabit, onLogHabit, onRemoveHabit,
  onRegenerateSchedule,
  categories = ["General"], onAddCategory,
  deadlines = [], onAddDeadline, onRemoveDeadline
}: AgendaTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDay, setNewTaskDay] = useState(simulatedDay);
  const [newTaskTime, setNewTaskTime] = useState("09:00 - 10:30");
  const [newTaskDuration, setNewTaskDuration] = useState("1.5 hours");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("General");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly" | "custom">("daily");
  const [newHabitTime, setNewHabitTime] = useState("07:30");
  const [newHabitDur, setNewHabitDur] = useState(10);
  const [rawPromptInput, setRawPromptInput] = useState("");
  const [isLoadingRegen, setIsLoadingRegen] = useState(false);

  // Dynamic Categories & Deadlines Modal states
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [previousCategory, setPreviousCategory] = useState("General");

  const [showAddDeadlineModal, setShowAddDeadlineModal] = useState(false);
  const [newDeadlineName, setNewDeadlineName] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState(simulatedDay);

  useEffect(() => {
    setNewTaskDay(simulatedDay);
  }, [simulatedDay]);

  const filteredTasks = tasks.filter(
    (t) => t && t.day === simulatedDay
  );

  const getCategoryTheme = (cat: string) => {
    const name = cat || "General";
    if (name.toLowerCase() === "general") {
      return { bg: "bg-slate-800 border-slate-700 text-slate-300", icon: <Clock className="w-4 h-4 text-slate-300" />, label: "General" };
    }
    // Hash category name to cycle standard theme colors beautifully
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
      { bg: "bg-blue-500/10 border-blue-500/20 text-blue-400", icon: <Presentation className="w-4 h-4 text-blue-400" /> },
      { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400", icon: <Stethoscope className="w-4 h-4 text-amber-400" /> },
      { bg: "bg-purple-500/10 border-purple-500/20 text-purple-400", icon: <Coffee className="w-4 h-4 text-purple-400" /> },
      { bg: "bg-rose-500/10 border-rose-500/20 text-rose-400", icon: <Sparkles className="w-4 h-4 text-rose-400" /> },
      { bg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", icon: <Calendar className="w-4 h-4 text-cyan-400" /> },
    ];
    const index = Math.abs(hash) % colors.length;
    return {
      bg: colors[index].bg,
      icon: colors[index].icon,
      label: name
    };
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      day: newTaskDay,
      time: newTaskTime,
      task: newTaskName,
      duration: newTaskDuration,
      category: newTaskCategory,
      completed: false,
      description: newTaskDesc || "Custom session added by user."
    };
    onAddTask(newTask);
    setNewTaskName("");
    setNewTaskDesc("");
    setShowAddForm(false);
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName, newHabitFreq, newHabitTime, newHabitDur);
    setNewHabitName("");
    setShowAddHabitForm(false);
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawPromptInput.trim()) return;
    setIsLoadingRegen(true);
    try {
      await onRegenerateSchedule(rawPromptInput);
      setRawPromptInput("");
    } finally {
      setIsLoadingRegen(false);
    }
  };

    return (
    <section className="space-y-stack-lg">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left column: tasks */}
        <div className="lg:col-span-8 space-y-stack-md">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Sequence: {simulatedDay}</h2>
              <p className="text-on-surface-variant font-body-md">{filteredTasks.length} sessions scheduled</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary text-on-primary px-6 py-2 font-label-caps hover:bg-primary-container transition-colors"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Task
              </button>
            </div>
          </div>

          {/* Add Task Form */}
          {showAddForm && (
            <form onSubmit={handleAddTask} className="bg-surface-container border border-outline-variant p-6 space-y-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-on-surface-variant">Task Name</label>
                  <input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:border-primary" />
                </div>
                <div className="ml-3 mt-5">
                  <label className="text-xs font-mono text-on-surface-variant"></label>
                  <DatePicker
                    selectedDate={newTaskDay}
                    onDateChange={setNewTaskDay}
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-on-surface-variant">Time Range</label>
                  <input value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface font-mono" />
                </div>
                <div>
                  <label className="text-xs font-mono text-on-surface-variant">Duration</label>
                  <input value={newTaskDuration} onChange={(e) => setNewTaskDuration(e.target.value)} className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface" />
                </div>
                <div>
                  <label className="text-xs font-mono text-on-surface-variant">Category</label>
                  <select 
                    value={newTaskCategory} 
                    onChange={(e) => {
                      if (e.target.value === "__create_new__") {
                        setPreviousCategory(newTaskCategory);
                        setShowCreateCategoryModal(true);
                      } else {
                        setNewTaskCategory(e.target.value);
                      }
                    }} 
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__create_new__" className="text-primary font-bold">
                      + Create New Category
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-on-surface-variant">Description</label>
                  <input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="text-xs font-mono border border-outline-variant px-3 py-1.5 rounded text-on-surface-variant hover:bg-surface-variant">Cancel</button>
                <button type="submit" className="bg-primary text-on-primary font-bold px-4 py-1.5 rounded text-xs">Save</button>
              </div>
            </form>
          )}

          {/* Task Cards */}
          <div className="space-y-4">
            {filteredTasks.map((t) => {
              const catStyles = getCategoryTheme(t.category);
              return (
                <div key={t.id} className={`bg-surface-container border border-outline-variant p-6 hover:border-primary/50 transition-colors group relative ${t.completed ? "opacity-60" : ""}`}>
                  <div className={`absolute top-0 left-0 w-1 h-full ${t.completed ? "bg-primary/20" : "bg-primary/20"}`} />
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => onToggleTask(t.id)}
                        className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          t.completed
                            ? "bg-primary text-on-primary"
                            : "border border-primary/60 hover:border-primary"
                        }`}
                      >
                        {t.completed && <Check className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-label-caps text-primary text-[11px]">{t.time}</span>
                          <span className={`text-[10px] font-label-caps px-2 py-0.5 rounded border uppercase ${catStyles.bg}`}>{catStyles.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({t.duration})</span>
                        </div>
                        <h3 className={`font-headline-sm text-headline-sm text-on-surface mb-2 ${t.completed ? "line-through text-slate-500" : ""}`}>{t.task}</h3>
                        <p className="text-on-surface-variant text-sm font-body-md max-w-2xl leading-relaxed">{t.description}</p>
                      </div>
                    </div>
                    <button onClick={() => onDeleteTask(t.id)} className="text-on-surface-variant/40 hover:text-error transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 border border-dashed border-outline-variant rounded-xl">
                <Coffee className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-on-surface-variant font-mono">No sessions on {simulatedDay}.</p>
              </div>
            )}
          </div>

          
        </div>{/* End left column */}

        {/* Right column: stats + Dynamic Scheduler */}
        <div className="lg:col-span-4 space-y-stack-md">
          {/* Resource Allocation & Deadlines */}
          <div className="bg-surface-container border border-outline-variant p-6 rounded-xl space-y-4">
            <h4 className="font-mono text-[10px] text-primary tracking-wider uppercase">Category Progress</h4>
            <div className="space-y-2">
              {categories.map((catName) => {
                const catTasks = tasks.filter(t => t && t.category === catName);
                const total = catTasks.length;
                const completed = catTasks.filter(t => t.completed).length;
                return (
                  <div key={catName} className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium">{catName}</span>
                    <span className="font-mono text-primary/80">{completed} / {total} done</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-outline-variant pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-error text-xs font-bold tracking-wider font-mono">DEADLINES REMAINING</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewDeadlineDate(simulatedDay);
                    setNewDeadlineName("");
                    setShowAddDeadlineModal(true);
                  }}
                  className="text-primary hover:text-primary-container text-[11px] font-mono font-bold flex items-center gap-1 uppercase transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Deadline
                </button>
              </div>

              {deadlines.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic font-mono">None</p>
              ) : (
                <div className="space-y-4">
                  {deadlines.map((deadline) => {
                    const timeRemaining = (() => {
                      const simDate = new Date(simulatedDay + "T00:00:00");
                      const deadDate = new Date(deadline.date + "T00:00:00");
                      const diffMs = deadDate.getTime() - simDate.getTime();
                      if (diffMs <= 0) {
                        return "Due today or past due";
                      }
                      const diffHrs = diffMs / (1000 * 60 * 60);
                      if (diffHrs > 24) {
                        const days = Math.floor(diffHrs / 24);
                        return `${days} days`;
                      } else if (diffHrs >= 1) {
                        const hrs = Math.floor(diffHrs);
                        return `${hrs} hours`;
                      } else {
                        return "Less than an hour";
                      }
                    })();

                    const formattedDate = new Date(deadline.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });

                    return (
                      <div key={deadline.id} className="bg-surface/50 border border-outline-variant/50 p-3 rounded group relative flex justify-between items-start">
                        <div>
                          <h4 className="font-headline-sm text-on-surface font-bold text-sm tracking-tight">{deadline.name}</h4>
                          <p className="text-lg font-mono text-error font-medium mt-0.5">{timeRemaining}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">Due on {formattedDate}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveDeadline(deadline.id)}
                          className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all duration-200 p-1"
                          title="Remove Deadline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Schedule Generator */}
          <div className="bg-surface-container border border-outline-variant p-6">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Dynamic Schedule Generator
            </h3>
            <p className="text-xs text-on-surface-variant mt-2 mb-4">
              Describe revised context to regenerate the daily blueprint.
            </p>
            <form onSubmit={handleRegenerate} className="space-y-4">
              <textarea
                rows={3}
                value={rawPromptInput}
                onChange={(e) => setRawPromptInput(e.target.value)}
                placeholder="e.g., Move methodology to Thursday..."
                className="w-full bg-surface border border-outline-variant rounded p-3 text-xs text-on-surface focus:border-primary"
              />
              <button type="submit" disabled={isLoadingRegen} className="bg-primary text-on-primary px-4 py-2 rounded text-xs font-bold">
                {isLoadingRegen ? <RefreshCw className="animate-spin inline w-3 h-3" /> : "Regenerate Timetable"}
              </button>
            </form>
          </div>
        </div>{/* End right column */}
      </div>

      {/* Escape key close hook */}
      <EscapeKeyHandler 
        showCreateCategoryModal={showCreateCategoryModal} 
        setShowCreateCategoryModal={setShowCreateCategoryModal}
        showAddDeadlineModal={showAddDeadlineModal}
        setShowAddDeadlineModal={setShowAddDeadlineModal}
        newTaskCategory={newTaskCategory}
        setNewTaskCategory={setNewTaskCategory}
        previousCategory={previousCategory}
      />

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            setShowCreateCategoryModal(false);
            setNewTaskCategory(previousCategory);
          }}
        >
          <div 
            className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-on-surface font-headline-sm font-bold text-lg mb-4">
              Enter Name of Category (e.g., Thesis)
            </h3>
            <input 
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Type Here"
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary mb-6 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (newCategoryName.trim()) {
                    onAddCategory(newCategoryName.trim());
                    setNewTaskCategory(newCategoryName.trim());
                    setNewCategoryName("");
                    setShowCreateCategoryModal(false);
                  }
                } else if (e.key === "Escape") {
                  setShowCreateCategoryModal(false);
                  setNewTaskCategory(previousCategory);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateCategoryModal(false);
                  setNewTaskCategory(previousCategory);
                }}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-xs hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    onAddCategory(newCategoryName.trim());
                    setNewTaskCategory(newCategoryName.trim());
                    setNewCategoryName("");
                    setShowCreateCategoryModal(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deadline Modal */}
      {showAddDeadlineModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowAddDeadlineModal(false)}
        >
          <div 
            className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-on-surface font-headline-sm font-bold text-lg mb-4">
              Add New Deadline
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-mono text-on-surface-variant block mb-1">Name</label>
                <input 
                  type="text"
                  value={newDeadlineName}
                  onChange={(e) => setNewDeadlineName(e.target.value)}
                  placeholder="Enter deadline name"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowAddDeadlineModal(false);
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-mono text-on-surface-variant block mb-1">Deadline</label>
                <DatePicker
                  selectedDate={newDeadlineDate}
                  onDateChange={setNewDeadlineDate}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddDeadlineModal(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-caps text-xs hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newDeadlineName.trim()) {
                    onAddDeadline(newDeadlineName.trim(), newDeadlineDate);
                    setShowAddDeadlineModal(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-caps text-xs font-bold hover:bg-primary-container transition-colors"
                disabled={!newDeadlineName.trim()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Inline helper component for Escape key handling to bypass hook rules
function EscapeKeyHandler({
  showCreateCategoryModal,
  setShowCreateCategoryModal,
  showAddDeadlineModal,
  setShowAddDeadlineModal,
  newTaskCategory,
  setNewTaskCategory,
  previousCategory,
}: {
  showCreateCategoryModal: boolean;
  setShowCreateCategoryModal: (v: boolean) => void;
  showAddDeadlineModal: boolean;
  setShowAddDeadlineModal: (v: boolean) => void;
  newTaskCategory: string;
  setNewTaskCategory: (v: string) => void;
  previousCategory: string;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateCategoryModal) {
          setShowCreateCategoryModal(false);
          setNewTaskCategory(previousCategory);
        }
        if (showAddDeadlineModal) {
          setShowAddDeadlineModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showCreateCategoryModal, showAddDeadlineModal, previousCategory, newTaskCategory, setShowCreateCategoryModal, setShowAddDeadlineModal, setNewTaskCategory]);

  return null;
}