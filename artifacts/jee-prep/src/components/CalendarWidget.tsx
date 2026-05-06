import { Card } from "@/components/ui/card";
import { Clock, MapPin, Tag as TagIcon, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTagsContext } from "@/context/TagsContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

interface EventStatus {
  eventId: string;
  status: "done" | "cancel";
  timestamp: number;
}

export function CalendarWidget() {
  const [events] = useLocalStorage<CalEvent[]>("jee_cal_events", []);
  const [markedEvents, setMarkedEvents] = useLocalStorage<EventStatus[]>("jee_today_marked", []);
  const { tags: systemTags, getTag } = useTagsContext();
  const today = getTodayStr();

  // Filter events for today (excluding marked ones)
  const todayEvents = events.filter(ev => {
    const evDate = new Date(ev.start).toISOString().slice(0, 10);
    const isMarked = markedEvents.some(m => m.eventId === ev.id && 
      new Date(m.timestamp).toISOString().slice(0, 10) === today);
    return evDate === today && !isMarked;
  }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const handleMark = (eventId: string, status: "done" | "cancel") => {
    setMarkedEvents(prev => [...prev, { eventId, status, timestamp: Date.now() }]);
  };

  return (
    <Card className="p-5 bg-card/50 backdrop-blur-sm border-border flex flex-col" style={{ minHeight: 240 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Today's Schedule
        </h2>
        <Link href="/calendar">
          <div className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 cursor-pointer group transition-colors">
            View Calendar
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {todayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground h-full">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs text-center">No events scheduled for today.</p>
            <Link href="/calendar">
              <span className="text-[11px] text-primary hover:underline cursor-pointer mt-2">
                Add Event →
              </span>
            </Link>
          </div>
        ) : (
          todayEvents.map((ev, idx) => {
            const startTime = formatTime(ev.start);
            const endTime = formatTime(ev.end);
            // Check if PW tag is present
            const hasPWTag = ev.tags?.includes("tag_pw");
            const barColor = hasPWTag ? "#ef4444" : ev.color;

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg border p-3 transition-all hover:border-primary/40 hover:bg-background/50 relative group"
                style={{
                  borderColor: ev.color + "50",
                  backgroundColor: ev.color + "0a",
                }}
              >
                {/* Color bar + title */}
                <div className="flex items-start gap-2.5 mb-1.5">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: barColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                    {/* Time */}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{startTime} – {endTime}</span>
                    </div>
                  </div>

                  {/* Action icons */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMark(ev.id, "done")}
                      className="p-1.5 rounded-full hover:bg-green-500/20 transition-colors"
                      title="Mark as done"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMark(ev.id, "cancel")}
                      className="p-1.5 rounded-full hover:bg-red-500/20 transition-colors"
                      title="Mark as cancelled"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </motion.button>
                  </div>
                </div>

                {/* Description */}
                {ev.description && (
                  <p className="text-[10px] text-muted-foreground mb-1.5 line-clamp-2 ml-3.5">
                    {ev.description}
                  </p>
                )}

                {/* Tags */}
                {ev.tags && ev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-3.5">
                    {ev.tags.map(tagId => {
                      const tag = getTag(tagId);
                      return tag ? (
                        <span
                          key={tagId}
                          className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium"
                          style={{
                            backgroundColor: tag.color + "20",
                            borderColor: tag.color + "50",
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
}
