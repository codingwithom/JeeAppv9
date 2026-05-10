import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTagsContext } from "@/context/TagsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Tag,
  Repeat,
  Pencil,
  Trash2,
  Check,
  Hash,
  Palette,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  color: string;
  recurrence: "none" | "daily" | "weekly";
  tags?: string[];
}

interface EventStatus {
  eventId: string;
  status: "done" | "cancel";
  timestamp: number;
}

const EVENT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#6b7280",
];

const CELL_H = 64; // px per hour

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({
  event,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: {
  event?: CalEvent;
  defaultDate?: Date;
  onSave: (ev: CalEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const d0 = event ? new Date(event.start) : defaultDate || new Date();
  const d1 = event
    ? new Date(event.end)
    : new Date(d0.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [start, setStart] = useState(fmt(d0));
  const [end, setEnd] = useState(fmt(d1));
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0]);
  const [recurrence, setRecurrence] = useState<CalEvent["recurrence"]>(
    event?.recurrence || "none",
  );
  const [tags, setTags] = useState<string[]>(event?.tags || []);
  const { tags: systemTags } = useTagsContext();

  const addTag = (tagId: string) => {
    if (!tags.includes(tagId)) setTags((p) => [...p, tagId]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: event?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim() || undefined,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      color,
      recurrence,
      tags: tags.length ? tags : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {event ? "Edit Event" : "New Event"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="text-sm font-medium"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">End</p>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {/* Color */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Color</p>
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Tags
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tagId) => {
                const tag = systemTags.find((t) => t.id === tagId);
                return tag ? (
                  <span
                    key={tagId}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors"
                    style={{
                      backgroundColor: tag.color + "20",
                      borderColor: tag.color + "50",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() =>
                        setTags((p) => p.filter((x) => x !== tagId))
                      }
                      className="hover:opacity-60 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {systemTags
                .filter((t) => !tags.includes(t.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag.id)}
                    className="text-[10px] px-2 py-1 rounded-full border transition-all"
                    style={{
                      backgroundColor: tag.color + "15",
                      borderColor: tag.color + "40",
                      color: tag.color,
                    }}
                  >
                    + {tag.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-2">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={recurrence}
              onChange={(e) =>
                setRecurrence(e.target.value as CalEvent["recurrence"])
              }
              className="text-xs flex-1 px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none"
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div>
            {event && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  onDelete(event.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
              {event ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  currentDate,
  onDateClick,
}: {
  currentDate: Date;
  onDateClick: (d: Date) => void;
}) {
  const [miniMonth, setMiniMonth] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
  );

  const firstDay = new Date(miniMonth.getFullYear(), miniMonth.getMonth(), 1);
  const lastDay = new Date(
    miniMonth.getFullYear(),
    miniMonth.getMonth() + 1,
    0,
  );
  const startPad = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++)
    cells.push(new Date(miniMonth.getFullYear(), miniMonth.getMonth(), d));

  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSel = (d: Date) =>
    d.getDate() === currentDate.getDate() &&
    d.getMonth() === currentDate.getMonth() &&
    d.getFullYear() === currentDate.getFullYear();

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">
          {miniMonth.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() =>
              setMiniMonth(
                (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
              )
            }
            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={() =>
              setMiniMonth(
                (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
              )
            }
            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-medium text-muted-foreground py-0.5"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              onClick={() => onDateClick(d)}
              className={`text-[10px] w-6 h-6 mx-auto rounded-full flex items-center justify-center transition-all font-medium
                ${isSel(d) ? "bg-primary text-primary-foreground" : isToday(d) ? "bg-primary/20 text-primary font-bold" : "text-foreground hover:bg-muted"}`}
            >
              {d.getDate()}
            </button>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  date,
  events,
  onDayClick,
  onEventClick,
}: {
  date: Date;
  events: CalEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalEvent) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startPad = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: Date[] = [];
  for (let i = startPad - 1; i >= 0; i--) cells.push(new Date(year, month, -i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(
      new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
    );
  }

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isCurMonth = (d: Date) => d.getMonth() === month;

  const eventsForDay = (d: Date) => {
    const dS = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dE = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    return events.filter(
      (ev) => new Date(ev.start) <= dE && new Date(ev.end) >= dS,
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-background z-10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7"
        style={{ gridAutoRows: "minmax(100px, 1fr)" }}
      >
        {cells.map((day, i) => {
          const dayEvents = eventsForDay(day);
          return (
            <div
              key={i}
              className={`border-b border-r border-border p-1 cursor-pointer hover:bg-primary/5 transition-colors flex flex-col
                ${!isCurMonth(day) ? "bg-muted/30" : ""}`}
              onClick={() => onDayClick(day)}
            >
              <div
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 shrink-0
                ${isToday(day) ? "bg-primary text-primary-foreground" : isCurMonth(day) ? "text-foreground" : "text-muted-foreground"}`}
              >
                {day.getDate()}
              </div>
              <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-80 transition-opacity text-white"
                    style={{ backgroundColor: ev.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  date,
  events,
  onSlotClick,
  onEventClick,
  onEventUpdate,
  getEventStatus,
}: {
  date: Date;
  events: CalEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (ev: CalEvent) => void;
  onEventUpdate: (ev: CalEvent) => void;
  getEventStatus?: (eventId: string) => EventStatus | undefined;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [dragOffsetHour, setDragOffsetHour] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeEndY, setResizeEndY] = useState(0);

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  const nowHour = today.getHours() + today.getMinutes() / 60;
  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  // Scroll to 7am on first render
  const didScroll = useRef(false);
  if (!didScroll.current && scrollRef.current) {
    scrollRef.current.scrollTop = 7 * CELL_H;
    didScroll.current = true;
  }

  const eventsForDay = (d: Date) => {
    const dS = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dE = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    return events.filter(
      (ev) => new Date(ev.start) <= dE && new Date(ev.end) >= dS,
    );
  };

  const resizingEvent = resizingId
    ? events.find((e) => e.id === resizingId)
    : null;
  const ghostEndHour = resizingEvent
    ? Math.max(
        new Date(resizingEvent.start).getHours() +
          new Date(resizingEvent.start).getMinutes() / 60 +
          0.25,
        Math.min(24, resizeEndY / CELL_H),
      )
    : 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Day header row */}
      <div className="flex border-b border-border shrink-0 bg-background z-20">
        <div className="w-12 shrink-0" />
        {days.map((d, i) => (
          <div key={i} className="flex-1 py-2 text-center">
            <p className="text-xs text-muted-foreground">
              {d.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <div
              className={`text-lg font-bold mx-auto w-9 h-9 flex items-center justify-center rounded-full transition-colors
              ${isToday(d) ? "bg-primary text-primary-foreground" : "text-foreground"}`}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: `${24 * CELL_H}px` }}>
          {/* Time labels */}
          <div className="w-12 shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground"
                style={{ top: h * CELL_H - 7 }}
              >
                {h === 0
                  ? ""
                  : `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className="flex-1 border-l border-border relative"
            >
              {/* Hour slots (drop targets + click) */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-border/40 hover:bg-primary/5 cursor-pointer transition-colors"
                  style={{ top: h * CELL_H, height: CELL_H }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const eventId = e.dataTransfer.getData("text/plain");
                    const ev = events.find((ev) => ev.id === eventId);
                    if (!ev) return;
                    const newStart = new Date(day);
                    const targetHour = Math.max(
                      0,
                      Math.min(23, Math.floor(h - dragOffsetHour)),
                    );
                    newStart.setHours(targetHour, 0, 0, 0);
                    const duration =
                      new Date(ev.end).getTime() - new Date(ev.start).getTime();
                    const newEnd = new Date(newStart.getTime() + duration);
                    onEventUpdate({
                      ...ev,
                      start: newStart.toISOString(),
                      end: newEnd.toISOString(),
                    });
                    setDraggingId(null);
                  }}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onSlotClick(d);
                  }}
                />
              ))}

              {/* Events */}
              {eventsForDay(day).map((ev) => {
                const evStart = new Date(ev.start);
                const evEnd = new Date(ev.end);
                const startH = evStart.getHours() + evStart.getMinutes() / 60;
                const isResizingThis = resizingId === ev.id;
                const endH = isResizingThis
                  ? ghostEndHour
                  : evEnd.getHours() + evEnd.getMinutes() / 60;
                const top = startH * CELL_H;
                const height = Math.max(CELL_H * 0.4, (endH - startH) * CELL_H);
                const eventStatus = getEventStatus?.(ev.id);

                return (
                  <div
                    key={ev.id}
                    draggable={!resizingId}
                    onDragStart={(e) => {
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const offH = (e.clientY - rect.top) / CELL_H;
                      setDragOffsetHour(
                        Math.max(0, Math.min(offH, endH - startH - 0.25)),
                      );
                      setDraggingId(ev.id);
                      e.dataTransfer.setData("text/plain", ev.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden group select-none transition-opacity z-10 relative
                      ${draggingId === ev.id ? "opacity-40 cursor-grabbing" : "opacity-100 cursor-grab"}`}
                    style={{
                      top,
                      height,
                      backgroundColor: ev.color,
                      minHeight: 20,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    <div className="p-1 h-full flex flex-col overflow-hidden pointer-events-none">
                      <p className="text-[10px] font-semibold text-white leading-tight truncate">
                        {ev.title}
                      </p>
                      {height > 38 && (
                        <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                          {evStart.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {ev.tags && height > 52 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {ev.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[8px] bg-white/25 text-white px-1 rounded-full"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status overlay */}
                    {eventStatus && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg"
                      >
                        {eventStatus.status === "done" ? (
                          <CheckCircle2 className="h-8 w-8 text-green-400" />
                        ) : (
                          <XCircle className="h-8 w-8 text-red-400" />
                        )}
                      </motion.div>
                    )}

                    {/* Resize handle */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-s-resize flex items-center justify-center bg-black/20 rounded-b-lg"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setResizingId(ev.id);
                        const endHour =
                          evEnd.getHours() + evEnd.getMinutes() / 60;
                        setResizeEndY(endHour * CELL_H);
                      }}
                      onPointerMove={(e) => {
                        if (!scrollRef.current) return;
                        const containerRect =
                          scrollRef.current.getBoundingClientRect();
                        const scrollTop = scrollRef.current.scrollTop;
                        const relY = e.clientY - containerRect.top + scrollTop;
                        setResizeEndY(Math.max(0, relY));
                      }}
                      onPointerUp={(e) => {
                        const endH2 = Math.max(
                          startH + 0.25,
                          Math.min(24, resizeEndY / CELL_H),
                        );
                        const newEnd = new Date(evStart);
                        newEnd.setHours(
                          Math.floor(endH2),
                          Math.round((endH2 % 1) * 60),
                          0,
                          0,
                        );
                        onEventUpdate({ ...ev, end: newEnd.toISOString() });
                        setResizingId(null);
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }}
                    >
                      <div className="w-8 h-0.5 bg-white/50 rounded-full" />
                    </div>
                  </div>
                );
              })}

              {/* Current time indicator */}
              {isToday(day) && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: nowHour * CELL_H }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tag Editor (sidebar) ─────────────────────────────────────────────────────
function TagEditorSection() {
  const { tags, addTag, updateTag, deleteTag } = useTagsContext();
  const [expanded, setExpanded] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const startAdd = () => {
    if (!newName.trim()) return;
    addTag(newName, newColor);
    setNewName("");
    setNewColor("#3b82f6");
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const saveEdit = () => {
    if (editName.trim()) updateTag(editingId!, editName, editColor);
    setEditingId(null);
  };

  return (
    <div className="px-3 pb-3 border-b border-border/50 shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Tag className="h-3 w-3" /> Tags ({tags.length})
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Existing tags */}
            <div className="space-y-1.5 mb-2">
              {tags.map((tag) => (
                <div key={tag.id}>
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-1 text-[10px]">
                      <div
                        className="w-2 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: editColor }}
                      />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-transparent text-foreground outline-none border-b border-primary pb-0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        className="p-0.5 text-green-400 hover:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] p-1.5 rounded border border-border/40 bg-muted/30 hover:bg-muted/60 transition-colors group">
                      <div
                        className="w-2 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-foreground font-medium truncate">
                        {tag.name}
                      </span>
                      <button
                        onClick={() => startEdit(tag.id, tag.name, tag.color)}
                        className="p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new tag */}
            <div className="space-y-1">
              <div className="flex gap-1 text-[10px]">
                <div
                  className="w-2 h-7 rounded-full flex-shrink-0"
                  style={{ backgroundColor: newColor }}
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New tag…"
                  className="flex-1 bg-muted border border-border rounded px-1.5 py-0.5 text-foreground placeholder:text-muted-foreground outline-none text-[9px]"
                  onKeyDown={(e) => e.key === "Enter" && startAdd()}
                />
                <button
                  onClick={startAdd}
                  disabled={!newName.trim()}
                  className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 text-[10px]"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 px-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-all
                      ${newColor === c ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="flex items-center cursor-pointer">
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Hash className="h-1.5 w-1.5 text-muted-foreground" />
                  </div>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events, setEvents] = useLocalStorage<CalEvent[]>("jee_cal_events", []);
  const [markedEvents] = useLocalStorage<EventStatus[]>("jee_today_marked", []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("week");
  const [modal, setModal] = useState<{
    event?: CalEvent;
    defaultDate?: Date;
  } | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  const getEventStatus = (eventId: string) => {
    const today = getTodayStr();
    return markedEvents.find(
      (m) =>
        m.eventId === eventId &&
        new Date(m.timestamp).toISOString().slice(0, 10) === today,
    );
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => e.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (activeTag && !(ev.tags || []).includes(activeTag)) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        new Date(ev.start).toDateString().toLowerCase().includes(q) ||
        new Date(ev.start)
          .toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
          .toLowerCase()
          .includes(q) ||
        (ev.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [events, activeTag, searchQuery]);

  const saveEvent = (ev: CalEvent) => {
    setEvents((prev) => {
      const exists = prev.find((e) => e.id === ev.id);
      return exists
        ? prev.map((e) => (e.id === ev.id ? ev : e))
        : [...prev, ev];
    });
    setModal(null);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setModal(null);
  };

  const updateEvent = (ev: CalEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
  };

  const navigate = (dir: number) => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (view === "month") n.setMonth(d.getMonth() + dir);
      else n.setDate(d.getDate() + dir * 7);
      return n;
    });
  };

  const headerTitle =
    view === "month"
      ? currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : (() => {
          const ws = new Date(currentDate);
          ws.setDate(currentDate.getDate() - currentDate.getDay());
          const we = new Date(ws);
          we.setDate(ws.getDate() + 6);
          return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex h-full overflow-hidden bg-background"
    >
      {/* ── Left sidebar ── */}
      <div
        className={cn(
          "w-full md:w-52 shrink-0 border-r border-border flex-col bg-sidebar overflow-y-auto",
          showMobileSidebar
            ? "flex fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl md:relative md:z-auto md:bg-sidebar"
            : "hidden md:flex",
        )}
      >
        <div className="p-3 shrink-0 flex items-center justify-between md:block">
          <Button
            className="flex-1 md:w-full gap-2 text-sm mr-2 md:mr-0"
            onClick={() => setModal({ defaultDate: currentDate })}
          >
            <Plus className="h-4 w-4" /> New Event
          </Button>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="md:hidden h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center border border-border"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <MiniCalendar
          currentDate={currentDate}
          onDateClick={(d) => {
            setCurrentDate(d);
            setView("week");
            setShowMobileSidebar(false);
          }}
        />

        {/* Tag management & filters */}
        <TagEditorSection />
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden flex items-center px-3 py-2 bg-card border-b border-border shrink-0">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <Tag className="h-4 w-4 text-primary" /> Open Menu
          </button>
        </div>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 bg-background">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium px-3 shrink-0"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-sm font-semibold text-foreground flex-1 truncate">
            {headerTitle}
          </h2>

          {/* Search */}
          <div className="flex items-center gap-1 shrink-0">
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Input
                    autoFocus
                    placeholder="Search events, tags…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs w-full bg-primary/15 border-primary/30 text-foreground placeholder:text-foreground/50"
                    onKeyDown={(e) =>
                      e.key === "Escape" &&
                      (setShowSearch(false), setSearchQuery(""))
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant={showSearch || searchQuery ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setShowSearch((p) => !p);
                if (showSearch) setSearchQuery("");
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* View switcher */}
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5 shrink-0">
            {(["month", "week"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-3 text-xs capitalize transition-all ${view === v ? "" : "hover:bg-transparent text-muted-foreground"}`}
                onClick={() => setView(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>

        {/* Active filter bar */}
        {(activeTag || searchQuery) && (
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-primary/5 shrink-0">
            {activeTag && (
              <span className="flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                <Tag className="h-3 w-3" />#{activeTag}
                <button
                  onClick={() => setActiveTag(null)}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                <Search className="h-3 w-3" />"{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEvents.length} event
              {filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Calendar view */}
        {view === "month" ? (
          <MonthView
            date={currentDate}
            events={filteredEvents}
            onDayClick={(d) => setModal({ defaultDate: d })}
            onEventClick={(ev) => setModal({ event: ev })}
          />
        ) : (
          <WeekView
            date={currentDate}
            events={filteredEvents}
            onSlotClick={(d) => setModal({ defaultDate: d })}
            onEventClick={(ev) => setModal({ event: ev })}
            onEventUpdate={updateEvent}
            getEventStatus={getEventStatus}
          />
        )}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {modal && (
          <EventModal
            event={modal.event}
            defaultDate={modal.defaultDate}
            onSave={saveEvent}
            onDelete={deleteEvent}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
