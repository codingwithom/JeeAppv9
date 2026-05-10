import { useAppContext } from "@/context/AppContext";
import { CountdownTimer } from "@/components/CountdownTimer";
import { TodoSystem, useTodoStats } from "@/components/TodoSystem";
import { CalendarWidget } from "@/components/CalendarWidget";
import { ClockWidget } from "@/components/ClockWidget";
import { StreakCard } from "@/components/StreakCard";
import { TimeManagementWidget } from "@/components/TimeManagementWidget";
import { ResizableSection } from "@/components/ResizableSection";
import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";

function TodoTrackerCard() {
  const { totalCompleted, totalTasks, pct } = useTodoStats();
  return (
    <Card className="p-4 bg-card border-border flex items-center gap-4 h-full">
      <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/25 flex-shrink-0">
        <ListChecks className="h-6 w-6 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">ToDo Tracker</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {totalCompleted}
            <span className="text-sm text-muted-foreground font-normal">
              /{totalTasks}
            </span>
          </p>
          {totalTasks > 0 && (
            <span
              className={`text-sm font-semibold tabular-nums ${pct >= 80 ? "text-green-500" : pct >= 50 ? "text-amber-500" : "text-muted-foreground"}`}
            >
              {pct}%
            </span>
          )}
        </div>
        {totalTasks === 0 && (
          <p className="text-xs text-muted-foreground">No todos yet</p>
        )}
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { user } = useAppContext();

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 space-y-4 sm:space-y-5"
    >
      {/* ── Header ── */}
      <header className="pt-2">
        <p className="text-primary font-medium mb-1 text-sm">{dateStr}</p>
        <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-foreground tracking-tight leading-tight">
          Welcome back, {user}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Stay focused. Every minute counts.
        </p>
      </header>

      {/* ── Countdown ── full width ── */}
      <ResizableSection storageKey="countdown" minHeight={100} noOverflow>
        <CountdownTimer />
      </ResizableSection>

      {/* ── Streak + ToDo Tracker ── always 2 equal columns ── */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        <ResizableSection storageKey="streak" minHeight={90}>
          <StreakCard />
        </ResizableSection>
        <ResizableSection storageKey="todo-tracker" minHeight={90}>
          <TodoTrackerCard />
        </ResizableSection>
      </div>

      {/*
        ── Main panel grid ──

        Mobile  (< sm  / < 640px) : 1 col  → stack everything
        Tablet  (sm–xl / 640–1279): 2 cols → auto-flow:
                                    row 1: Todo | Schedule
                                    row 2: Clock | TimeManagement
        Desktop (≥ xl  / 1280px+) : 3 cols → auto-flow:
                                    row 1: Todo | Schedule | Clock
                                    row 2: TimeManagement (xl:col-span-3)

        NO explicit row/col placement — pure auto-flow avoids overlap.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-start">
        {/* 1 – Todo List */}
        <ResizableSection storageKey="todo-system" minHeight={200}>
          <TodoSystem />
        </ResizableSection>

        {/* 2 – Today's Schedule */}
        <ResizableSection storageKey="calendar" minHeight={200}>
          <CalendarWidget />
        </ResizableSection>

        {/* 3 – Clock
            • Mobile : row 3 col 1
            • Tablet : row 2 col 1   (auto-flows after #1 and #2 fill row 1)
            • Desktop: row 1 col 3   (auto-flows into the 3rd col of row 1)  */}
        <ResizableSection storageKey="clock" minHeight={180}>
          <ClockWidget />
        </ResizableSection>

        {/* 4 – Time Management
            • Mobile : row 4 col 1
            • Tablet : row 2 col 2   (auto-flows after Clock fills row 2 col 1)
            • Desktop: row 2 col 1–3 (xl:col-span-3 stretches full width)      */}
        <div className="xl:col-span-3">
          <ResizableSection storageKey="time-mgmt" minHeight={200}>
            <TimeManagementWidget />
          </ResizableSection>
        </div>
      </div>
    </motion.div>
  );
}
