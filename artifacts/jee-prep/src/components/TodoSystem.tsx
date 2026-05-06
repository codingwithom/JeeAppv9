import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTagsContext } from "@/context/TagsContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, CheckCircle2, Timer,
  Pencil, Check, X, ChevronLeft, ChevronRight, CalendarDays, Tag as TagIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export interface Task {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  progress: number;
  deadlineMonth?: string;
  recurring: boolean;
  scheduledDates?: string[];
  timerSeconds: number;
  timerRunning: boolean;
  createdDate: string;
  tagId?: string;
}

interface DailyRecord {
  completed: number;
  total: number;
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  High: "bg-red-500/20 text-red-400 border-red-500/30",
  Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Low: "bg-muted text-muted-foreground border-border",
};

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function isVisibleToday(task: Task): boolean {
  const today = getTodayStr();
  if (task.recurring) return true;
  if (task.scheduledDates && task.scheduledDates.length > 0) {
    return task.scheduledDates.includes(today);
  }
  return task.createdDate === today;
}

// ── Tag selector ──────────────────────────────────────────────────────────────
function TagSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const { tags } = useTagsContext();
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <TagIcon className="h-3 w-3 text-muted-foreground" />
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
          !value
            ? "border-border bg-muted text-muted-foreground"
            : "border-border/50 text-muted-foreground hover:border-border"
        }`}
      >
        None
      </button>
      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onChange(value === tag.id ? undefined : tag.id)}
          className={`px-2 py-1 text-xs rounded-md border-2 font-semibold transition-all ${
            value === tag.id ? "opacity-100 scale-105" : "opacity-60 hover:opacity-80"
          }`}
          style={
            value === tag.id
              ? {
                  borderColor: tag.color,
                  backgroundColor: tag.color + "25",
                  color: tag.color,
                }
              : {
                  borderColor: tag.color + "60",
                  backgroundColor: "transparent",
                  color: tag.color,
                }
          }
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

// ── Mini multi-select calendar ─────────────────────────────────────────────────
function MiniCalendar({
  selected,
  onChange,
  onClose,
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [local, setLocal] = useState<string[]>(selected);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const toggleDate = (d: string) =>
    setLocal(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }

  return (
    <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-2xl p-3 w-60">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dateStr, i) =>
          dateStr === null ? (
            <div key={`e${i}`} />
          ) : (
            <button
              key={dateStr}
              onClick={() => toggleDate(dateStr)}
              className={`text-[11px] rounded-md py-1 font-medium transition-colors ${
                local.includes(dateStr)
                  ? "bg-primary text-primary-foreground"
                  : dateStr === getTodayStr()
                  ? "border border-primary/50 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {parseInt(dateStr.slice(8))}
            </button>
          )
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">{local.length} selected</span>
        <div className="flex gap-1">
          <button
            onClick={onClose}
            className="text-[10px] text-muted-foreground hover:text-white px-2 py-0.5 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add task form ──────────────────────────────────────────────────────────────
function AddTaskForm({ onAdd }: { onAdd: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [deadlineMonth, setDeadlineMonth] = useState(getCurrentMonth);
  const [recurring, setRecurring] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [showCal, setShowCal] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: Date.now().toString(),
      title: title.trim(),
      priority,
      completed: false,
      progress: 0,
      deadlineMonth: deadlineMonth || undefined,
      recurring,
      scheduledDates: scheduledDates.length > 0 ? scheduledDates : undefined,
      timerSeconds: 0,
      timerRunning: false,
      createdDate: getTodayStr(),
      tagId,
    });
    setTitle("");
    setDeadlineMonth(getCurrentMonth());
    setPriority("Medium");
    setRecurring(false);
    setScheduledDates([]);
    setTagId(undefined);
    setExpanded(false);
    setShowCal(false);
  };

  return (
    <form onSubmit={submit} className="mb-4 space-y-2">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a todo..."
          className="bg-muted border-border flex-1"
          onFocus={() => setExpanded(true)}
          data-testid="input-new-task"
        />
        <Button type="submit" className="flex-shrink-0" data-testid="button-add-task">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-visible"
          >
            <div className="space-y-2 pt-1">
              {/* Row 1: Priority + Deadline month */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {(["High", "Medium", "Low"] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${priority === p ? PRIORITY_COLORS[p] : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                    onClick={() => setPriority(p)}
                    data-testid={`priority-${p}`}
                  >
                    {p}
                  </button>
                ))}
                <input
                  type="month"
                  value={deadlineMonth}
                  onChange={e => setDeadlineMonth(e.target.value)}
                  className="h-7 text-xs bg-muted border border-border rounded-md px-2 text-foreground"
                  data-testid="input-deadline"
                />
              </div>

              {/* Row 2: Tags */}
              <TagSelector value={tagId} onChange={setTagId} />

              {/* Row 3: Daily Repeat + Choose Dates + Collapse */}
              <div className="flex flex-wrap gap-1.5 items-center relative">
                <button
                  type="button"
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${recurring ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  onClick={() => { setRecurring(v => !v); if (!recurring) setScheduledDates([]); }}
                  data-testid="toggle-recurring"
                >
                  Daily Repeat
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${scheduledDates.length > 0 ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    onClick={() => { setShowCal(v => !v); setRecurring(false); }}
                    data-testid="button-choose-dates"
                  >
                    <CalendarDays className="h-3 w-3" />
                    {scheduledDates.length > 0 ? `${scheduledDates.length} date${scheduledDates.length > 1 ? "s" : ""} chosen` : "Choose Dates"}
                  </button>
                  {showCal && (
                    <MiniCalendar
                      selected={scheduledDates}
                      onChange={setScheduledDates}
                      onClose={() => setShowCal(false)}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-white ml-auto"
                  onClick={() => setExpanded(false)}
                >
                  Collapse
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

// ── Task item ──────────────────────────────────────────────────────────────────
function TaskItem({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const { getTag } = useTagsContext();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<Task["priority"]>(task.priority);
  const [editDeadline, setEditDeadline] = useState(task.deadlineMonth ?? "");
  const [editTagId, setEditTagId] = useState<string | undefined>(task.tagId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tag = task.tagId ? getTag(task.tagId) : undefined;

  useEffect(() => {
    if (task.timerRunning) {
      intervalRef.current = setInterval(() => {
        onUpdate({ ...task, timerSeconds: task.timerSeconds + 1 });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [task.timerRunning, task.timerSeconds]);

  const saveEdit = () => {
    if (editTitle.trim()) {
      onUpdate({
        ...task,
        title: editTitle.trim(),
        priority: editPriority,
        deadlineMonth: editDeadline || undefined,
        tagId: editTagId,
      });
    }
    setEditing(false);
  };

  const deadlineLabel = task.deadlineMonth
    ? new Date(task.deadlineMonth + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      className={`rounded-xl border transition-all ${task.completed ? "opacity-50 bg-muted border-transparent" : "bg-muted/50 border-border hover:border-primary/30"}`}
      style={
        !task.completed && tag
          ? { borderColor: tag.color + "50" }
          : {}
      }
      data-testid={`task-item-${task.id}`}
    >
      {/* Tag color bar */}
      {tag && !task.completed && (
        <div
          className="h-0.5 w-full rounded-t-xl"
          style={{ backgroundColor: tag.color }}
        />
      )}

      <div className="p-3 flex items-start gap-3">
        <button
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.completed ? "bg-primary border-primary" : "border-muted-foreground hover:border-primary"}`}
          onClick={() => onUpdate({ ...task, completed: !task.completed, progress: task.completed ? 0 : 100 })}
          data-testid={`button-toggle-${task.id}`}
        >
          {task.completed && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-1.5 mb-1">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none border-b border-primary pb-0.5"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
                data-testid={`input-edit-task-${task.id}`}
              />
              <div className="flex gap-1 flex-wrap items-center">
                {(["High", "Medium", "Low"] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${editPriority === p ? PRIORITY_COLORS[p] : "border-border text-muted-foreground"}`}
                    onClick={() => setEditPriority(p)}
                  >
                    {p}
                  </button>
                ))}
                <input
                  type="month"
                  value={editDeadline}
                  onChange={e => setEditDeadline(e.target.value)}
                  className="h-5 text-[10px] bg-muted border border-border rounded px-1 text-foreground"
                />
              </div>
              <TagSelector value={editTagId} onChange={setEditTagId} />
              <div className="flex gap-1">
                <button onClick={saveEdit} className="text-green-400 p-0.5">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => setEditing(false)} className="text-muted-foreground p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className={`text-sm font-medium leading-snug cursor-pointer hover:text-foreground transition-colors ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                onDoubleClick={() => setEditing(true)}
                data-testid={`task-title-${task.id}`}
              >
                {task.title}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                {tag && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: tag.color + "60",
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                )}
                {deadlineLabel && (
                  <span className="text-[10px] text-muted-foreground">Due {deadlineLabel}</span>
                )}
                {task.recurring && (
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Daily</span>
                )}
                {task.scheduledDates && task.scheduledDates.length > 0 && (
                  <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                    {task.scheduledDates.length} date{task.scheduledDates.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}

          {!editing && task.progress > 0 && (
            <div className="mt-2 space-y-0.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Progress</span><span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className={`flex items-center gap-1 text-[10px] tabular-nums px-1.5 py-1 rounded transition-colors ${task.timerRunning ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
            onClick={() => onUpdate({ ...task, timerRunning: !task.timerRunning })}
            data-testid={`button-timer-${task.id}`}
          >
            <Timer className="h-3 w-3" />
            {formatTimer(task.timerSeconds)}
          </button>
          <button
            className="p-1 text-muted-foreground hover:text-white transition-colors"
            onClick={() => setEditing(true)}
            data-testid={`button-edit-${task.id}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => onDelete(task.id)}
            data-testid={`button-delete-${task.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!task.completed && (
        <div className="px-3 pb-2">
          <input
            type="range"
            min={0}
            max={100}
            value={task.progress}
            onChange={e => onUpdate({ ...task, progress: parseInt(e.target.value) })}
            className="w-full accent-primary cursor-pointer h-1"
            data-testid={`range-progress-${task.id}`}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Exported tracker hook (used in HomePage) ───────────────────────────────────
export function useTodoStats() {
  const [tasks] = useLocalStorage<Task[]>("jee_tasks", []);
  const [dailyRecords] = useLocalStorage<Record<string, DailyRecord>>("jee_daily_records", {});

  const today = getTodayStr();
  const todayTasks = tasks.filter(isVisibleToday);
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayTotal = todayTasks.length;

  let totalCompleted = todayCompleted;
  let totalTasks = todayTotal;

  Object.entries(dailyRecords).forEach(([date, rec]) => {
    if (date !== today) {
      totalCompleted += rec.completed;
      totalTasks += rec.total;
    }
  });

  const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  return { totalCompleted, totalTasks, pct, todayCompleted, todayTotal };
}

// ── Main component ──────────────────────────────────────────────────────────────
export function TodoSystem() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("jee_tasks", []);
  const [, setDailyRecords] = useLocalStorage<Record<string, DailyRecord>>("jee_daily_records", {});
  const [sortBy, setSortBy] = useState<"default" | "deadline" | "progress">("default");

  const today = getTodayStr();
  const todayTasks = tasks.filter(isVisibleToday);

  const sorted = [...todayTasks].sort((a, b) => {
    if (sortBy === "deadline") {
      if (!a.deadlineMonth) return 1;
      if (!b.deadlineMonth) return -1;
      return a.deadlineMonth.localeCompare(b.deadlineMonth);
    }
    if (sortBy === "progress") return b.progress - a.progress;
    return 0;
  });

  const completed = todayTasks.filter(t => t.completed).length;
  const pct = todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0;

  useEffect(() => {
    if (todayTasks.length > 0) {
      const rec: DailyRecord = { completed, total: todayTasks.length };
      setDailyRecords(prev => ({ ...prev, [today]: rec }));
    }
  }, [completed, todayTasks.length]);

  const addTask = (task: Task) => setTasks(prev => [task, ...prev]);
  const updateTask = (t: Task) => setTasks(prev => prev.map(x => x.id === t.id ? t : x));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(x => x.id !== id));

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border flex flex-col" style={{ minHeight: 480 }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">ToDo List</h2>
          <p className="text-xs text-muted-foreground">{completed}/{todayTasks.length} today</p>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground"
          data-testid="select-sort"
        >
          <option value="default">Default</option>
          <option value="deadline">By Deadline</option>
          <option value="progress">By Progress</option>
        </select>
      </div>
      {todayTasks.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Today's Progress</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}
      <AddTaskForm onAdd={addTask} />
      <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 320 }}>
        <AnimatePresence>
          {sorted.map(task => (
            <TaskItem key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
          ))}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm font-medium text-foreground">No todos for today</p>
            <p className="text-xs mt-1">Add a todo above to get started</p>
          </div>
        )}
      </div>
    </Card>
  );
}
