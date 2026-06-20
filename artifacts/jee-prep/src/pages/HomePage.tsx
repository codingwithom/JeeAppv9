import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAppContext } from "@/context/AppContext";
import { TodoSystem, useTodoStats } from "@/components/TodoSystem";
import { CalendarWidget } from "@/components/CalendarWidget";
import { ClockWidget } from "@/components/ClockWidget";
import { StreakCard } from "@/components/StreakCard";
import { TimeManagementWidget } from "@/components/TimeManagementWidget";
import { ResizableSection } from "@/components/ResizableSection";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, Lock, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLockdown } from "@/context/LockdownContext";

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

function LockdownOverlay({ children }: { children: React.ReactNode }) {
  const { isActive } = useLockdown();
  if (!isActive) return <>{children}</>;
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden">
      <div className="blur-md opacity-30 pointer-events-none h-full select-none transition-all">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="bg-background/90 px-4 py-2 rounded-xl border border-red-500/50 flex items-center gap-2 text-red-500 font-bold shadow-xl">
          <Lock className="h-5 w-5" /> Locked
        </div>
      </div>
    </div>
  );
}

const FlipUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center mx-2">
    <div
      className="relative w-16 h-20 bg-muted rounded-lg flex items-center justify-center text-3xl font-bold text-foreground shadow-sm overflow-hidden border border-border"
      style={{ perspective: "400px" }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: "60%", opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: "-60%", opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="absolute select-none"
          style={{ transformOrigin: "center" }}
        >
          {value.toString().padStart(2, "0")}
        </motion.div>
      </AnimatePresence>
    </div>
    <span className="text-xs text-muted-foreground mt-2 font-medium tracking-wider uppercase">
      {label}
    </span>
  </div>
);

function CountdownTimer() {
  const { selectedGoal } = useAppContext();
  
  const getDefaultTargetDate = () => {
    const nextYear = new Date().getFullYear() + 1;
    const currentYear = new Date().getFullYear();
    if (!selectedGoal) return "2028-04-06T00:00:00";
    
    switch (selectedGoal.category) {
      case "NEET":
        return `${nextYear}-05-02T00:00:00`;
      case "UPSC":
        return `${nextYear}-06-05T00:00:00`;
      case "Boards":
      case "School":
        return `${nextYear}-03-01T00:00:00`;
      case "Olympiads":
        return `${nextYear}-11-15T00:00:00`;
      case "Skills":
        return `${currentYear}-12-31T23:59:59`;
      case "JEE":
      default:
        return "2028-04-06T00:00:00";
    }
  };

  const defaultDate = getDefaultTargetDate();
  const [targetDate, setTargetDate] = useLocalStorage("target_date", defaultDate);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(targetDate);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Update countdown target date when goal changes
  useEffect(() => {
    setTargetDate(defaultDate);
    setEditValue(defaultDate);
  }, [selectedGoal]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleSave = () => {
    setTargetDate(editValue);
    setIsEditing(false);
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border relative overflow-hidden group w-full h-full flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
          {selectedGoal ? `${selectedGoal.displayName} Countdown` : "JEE 2028 Countdown"}
        </h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 text-xs bg-muted border-border"
              data-testid="input-target-date"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleSave}
              data-testid="button-save-date"
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-50 hover:opacity-100"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-date"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex justify-center relative z-10">
        <FlipUnit value={timeLeft.days} label="Days" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.hours} label="Hours" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.minutes} label="Minutes" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.seconds} label="Seconds" />
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
      <ResizableSection storageKey="countdown" minHeight={180} noOverflow>
        <LockdownOverlay>
          <CountdownTimer />
        </LockdownOverlay>
      </ResizableSection>

      {/* ── Streak + ToDo Tracker ── always 2 equal columns ── */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        <ResizableSection storageKey="streak" minHeight={90}>
          <LockdownOverlay>
            <StreakCard />
          </LockdownOverlay>
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
          <LockdownOverlay>
            <CalendarWidget />
          </LockdownOverlay>
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
