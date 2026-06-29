import { useState, useEffect } from "react";
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
}

export default function AgendaTab({
  tasks, simulatedDay,
  onToggleTask, onDeleteTask, onAddTask, onResetSchedule,
  habits, onAddHabit, onLogHabit, onRemoveHabit,
  onRegenerateSchedule
}: AgendaTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDay, setNewTaskDay] = useState(simulatedDay);
  const [newTaskTime, setNewTaskTime] = useState("09:00 - 10:30");
  const [newTaskDuration, setNewTaskDuration] = useState("1.5 hours");
  const [newTaskCategory, setNewTaskCategory] = useState<"thesis" | "presentation" | "appointment" | "break" | "general">("thesis");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly" | "custom">("daily");
  const [newHabitTime, setNewHabitTime] = useState("07:30");
  const [newHabitDur, setNewHabitDur] = useState(10);
  const [rawPromptInput, setRawPromptInput] = useState("");
  const [isLoadingRegen, setIsLoadingRegen] = useState(false);

  useEffect(() => {
    setNewTaskDay(simulatedDay);
  }, [simulatedDay]);

  const filteredTasks = tasks.filter(
    (t) => t && t.day === simulatedDay
  );

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "thesis": return { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <BookOpen className="w-4 h-4 text-emerald-400" />, label: "Thesis Focus" };
      case "presentation": return { bg: "bg-blue-500/10 border-blue-500/20 text-blue-400", icon: <Presentation className="w-4 h-4 text-blue-400" />, label: "Presentation" };
      case "appointment": return { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400", icon: <Stethoscope className="w-4 h-4 text-amber-400" />, label: "Healthcare" };
      case "break": return { bg: "bg-purple-500/10 border-purple-500/20 text-purple-400", icon: <Coffee className="w-4 h-4 text-purple-400" />, label: "Recharge" };
      default: return { bg: "bg-slate-800 border-slate-700 text-slate-300", icon: <Clock className="w-4 h-4 text-slate-300" />, label: "General" };
    }
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
                <div>
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
                  <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value as any)} className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface">
                    <option value="thesis">Thesis Focus</option>
                    <option value="presentation">Presentation</option>
                    <option value="appointment">Healthcare</option>
                    <option value="break">Recharge</option>
                    <option value="general">General</option>
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
          {/* Resource Allocation – header removed */}
          <div className="bg-surface-container border border-outline-variant p-6">
            <p className="text-xs text-on-surface-variant">
              Thesis: {tasks.filter(t => t.category === "thesis").filter(t => t.completed).length} / {tasks.filter(t => t.category === "thesis").length} tasks done
            </p>
            <p className="text-xs text-on-surface-variant mt-2">
              Presentation: {tasks.filter(t => t.category === "presentation").filter(t => t.completed).length} / {tasks.filter(t => t.category === "presentation").length} tasks done
            </p>
            <div className="mt-4 border-t border-outline-variant pt-4">
              <p className="text-error text-xs font-bold">DEADLINES REMAINING</p>
              <p className="text-2xl font-mono">48 hrs</p>
              <span className="bg-error/10 text-error border border-error/30 px-3 py-1 text-[9px] font-label-caps">THESIS DUE FRI</span>
            </div>
          </div>

          {/* Dynamic Schedule Generator – moved from left column */}
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
    </section>
  );
}