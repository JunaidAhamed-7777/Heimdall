import { useState } from "react";
import { Award, Plus, Clock, Flame, Trash2 } from "lucide-react";

interface HabitsPageProps {
  habits: any[];
  onAddHabit: (name: string, freq: string, time: string, dur: number) => void;
  onLogHabit: (id: string) => void;
  onRemoveHabit: (id: string) => void;
}

export default function HabitsPage({ habits, onAddHabit, onLogHabit, onRemoveHabit }: HabitsPageProps) {
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly" | "custom">("daily");
  const [newHabitTime, setNewHabitTime] = useState("07:30");
  const [newHabitDur, setNewHabitDur] = useState(10);

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName, newHabitFreq, newHabitTime, newHabitDur);
    setNewHabitName("");
    setShowAddHabitForm(false);
  };

  return (
    <section className="space-y-stack-lg">
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-container border border-outline-variant p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h2 className="font-headline-md text-headline-md text-on-surface">Self-Care &amp; Habits Lounge</h2>
              </div>
              <p className="text-on-surface-variant font-body-md mt-1">Maintain streaks and log milestones</p>
            </div>
            <button
              onClick={() => setShowAddHabitForm(!showAddHabitForm)}
              className="bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Define Habit
            </button>
          </div>

          {showAddHabitForm && (
            <div className="p-4 rounded bg-surface border border-outline-variant space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Habit name"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface"
                />
                <select
                  value={newHabitFreq}
                  onChange={(e) => setNewHabitFreq(e.target.value as any)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  placeholder="Time (e.g., 07:30)"
                  value={newHabitTime}
                  onChange={(e) => setNewHabitTime(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface"
                />
                <input
                  type="number"
                  placeholder="Minutes"
                  value={newHabitDur}
                  onChange={(e) => setNewHabitDur(Number(e.target.value) || 10)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs text-on-surface"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddHabitForm(false)}
                  className="text-xs border border-outline-variant px-3 py-1.5 rounded text-on-surface-variant hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHabit}
                  className="bg-primary text-on-primary text-xs font-bold px-4 py-1.5 rounded"
                >
                  Register
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.length === 0 ? (
              <div className="col-span-full text-center py-8 border border-dashed border-outline-variant rounded-xl">
                <p className="text-xs text-on-surface-variant font-mono">No active habits. Define one above to get started.</p>
              </div>
            ) : (
              habits.map((h) => {
                const isDoneToday = h.lastCompletedDate === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={h.id}
                    className={`p-4 rounded border ${
                      isDoneToday ? "bg-primary/5 border-primary/20" : "bg-surface border-outline-variant"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-on-surface-variant">{h.frequency}</span>
                        <h4 className="font-semibold text-sm">{h.name}</h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                          <Clock className="w-3 h-3" /> {h.preferred_time} ({h.duration_minutes}m)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-mono">
                          <Flame className="w-4 h-4 text-amber-500" /> {h.streak}
                        </span>
                        <button
                          disabled={isDoneToday}
                          onClick={() => onLogHabit(h.id)}
                          className={`text-xs px-2 py-1 rounded ${
                            isDoneToday ? "bg-primary/20 text-primary" : "bg-primary text-on-primary"
                          }`}
                        >
                          {isDoneToday ? "Done" : "Check Off"}
                        </button>
                        <button onClick={() => onRemoveHabit(h.id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}