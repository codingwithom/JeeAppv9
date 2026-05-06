import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStreakContext, StreakRecord, TARGET_SECONDS } from "@/context/StreakContext";
import { Flame, X, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

// ── Fire icon ─────────────────────────────────────────────────────────────────
function FireIcon({
  active,
  size = "md",
}: {
  active: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const cls: Record<string, string> = {
    xs: "h-3.5 w-3.5",
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-9 w-9",
    xl: "h-14 w-14",
  };

  if (!active) {
    return <Flame className={`${cls[size]} text-muted-foreground/35`} />;
  }

  return (
    <motion.div
      animate={{ scale: [1, 1.14, 0.96, 1.08, 1], rotate: [-4, 4, -2, 3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Flame
        className={cls[size]}
        style={{
          color: "#f97316",
          filter:
            "drop-shadow(0 0 6px rgba(249,115,22,0.8)) drop-shadow(0 0 14px rgba(234,179,8,0.45))",
        }}
      />
    </motion.div>
  );
}

// ── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid() {
  const { streakData, todaySession } = useStreakContext();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayOfWeek = today.getDay(); // 0 = Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const weekDates = labels.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="flex gap-1.5 justify-between mt-4">
      {labels.map((lbl, i) => {
        const dateStr = weekDates[i];
        const record = streakData.records.find(r => r.date === dateStr);
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        const isEarned = record?.type === "earned" || (isToday && todaySession.streakEarned);
        const isExtended = record?.type === "extended";

        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                isToday ? "text-orange-500" : "text-muted-foreground"
              }`}
            >
              {lbl}
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                ${
                  isEarned
                    ? "border-orange-400 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50 shadow-md shadow-orange-200 dark:shadow-orange-900/30"
                    : isExtended
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                    : isToday
                    ? "border-primary/60 bg-primary/10"
                    : isFuture
                    ? "border-border/25 bg-transparent"
                    : "border-border/40 bg-muted/30"
                }`}
            >
              {isEarned ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.12 }}
                >
                  <Flame
                    className="h-4 w-4"
                    style={{
                      color: "#f97316",
                      filter: "drop-shadow(0 0 4px rgba(249,115,22,0.6))",
                    }}
                  />
                </motion.div>
              ) : isExtended ? (
                <Zap className="h-3.5 w-3.5 text-blue-400" />
              ) : isToday ? (
                <motion.div
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

// ── Streak Modal ──────────────────────────────────────────────────────────────
function StreakModal({ onClose }: { onClose: () => void }) {
  const { streakData, todaySession, todayProgress, extendStreak, canExtend, extendsLeft } =
    useStreakContext();
  const [extended, setExtended] = useState(false);

  const handleExtend = () => {
    const ok = extendStreak();
    if (ok) setExtended(true);
  };

  const secsLeft = Math.max(0, TARGET_SECONDS - todaySession.seconds);
  const minsLeft = Math.ceil(secsLeft / 60);

  const sortedRecords = [...streakData.records].sort((a: StreakRecord, b: StreakRecord) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden"
      >
        {/* Header — warm gradient background */}
        <div className="relative bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/20 px-5 pt-5 pb-4 border-b border-orange-200/50 dark:border-orange-800/30">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Big number + text */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.span
                key={streakData.currentStreak}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black leading-none"
                style={{
                  color: "#f97316",
                  textShadow: "3px 3px 0px rgba(234, 88, 12, 0.25)",
                  WebkitTextStroke: "1.5px rgba(234, 88, 12, 0.35)",
                }}
              >
                {streakData.currentStreak}
              </motion.span>
              <div className="absolute -bottom-1 -right-2">
                <FireIcon active={todaySession.streakEarned} size="sm" />
              </div>
            </div>

            <div>
              <p className="text-xl font-bold text-foreground leading-tight">Days Streak!!</p>
              <p className="text-xs text-muted-foreground mt-1">Every day counts!</p>
              <p className="text-xs text-muted-foreground">Keep the momentum going!</p>
            </div>
          </div>

          {/* Week grid */}
          <WeekGrid />
        </div>

        {/* Today progress */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">Today's Progress</span>
            <span className="text-xs font-medium text-muted-foreground">
              {fmtTime(todaySession.seconds)} / 10m
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                todaySession.streakEarned
                  ? "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400"
                  : "bg-primary"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${todayProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {todaySession.streakEarned ? (
            <p className="text-[10px] text-orange-500 font-semibold mt-1">
              ✓ Today's streak earned!
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1">
              {minsLeft} min left to earn today's streak
            </p>
          )}
        </div>

        {/* Extend streak */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Extend Streak</p>
              <p className="text-[10px] text-muted-foreground">
                {extendsLeft} / 5 uses remaining this month
              </p>
              {extended && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-blue-500 font-medium mt-0.5"
                >
                  ✓ Streak extended for today!
                </motion.p>
              )}
            </div>
            <button
              onClick={handleExtend}
              disabled={!canExtend || extended}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all
                ${canExtend && !extended
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-orange-500/30 active:scale-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
            >
              <Zap className="h-3 w-3" />
              Extend
            </button>
          </div>

          {/* Extend uses pips */}
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < extendsLeft ? "bg-orange-400" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* History */}
        <div className="max-h-48 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              History
            </p>
            {sortedRecords.length === 0 ? (
              <div className="text-center py-6">
                <Flame className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No records yet — start your streak!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedRecords.map((r: StreakRecord, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2"
                  >
                    {r.type === "earned" ? (
                      <Flame
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: "#f97316" }}
                      />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-foreground flex-1 truncate">
                      {fmtDate(r.date)}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap
                        ${r.type === "earned"
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}
                    >
                      {r.type === "earned" ? "Streak Earned" : "Extended"}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main StreakCard ────────────────────────────────────────────────────────────
export function StreakCard() {
  const { streakData, todaySession, todayProgress } = useStreakContext();
  const [showModal, setShowModal] = useState(false);

  const todayDone = todaySession.streakEarned;
  const todayMins = Math.floor(todaySession.seconds / 60);
  const todaySecs = todaySession.seconds % 60;

  return (
    <>
      <Card className={`p-4 border-border relative overflow-hidden transition-all ${todayDone ? "bg-gradient-to-br from-orange-50/60 to-amber-50/40 dark:from-orange-950/20 dark:to-amber-950/10" : "bg-card"}`}>
        {/* Subtle fire glow */}
        {todayDone && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              background:
                "radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)",
            }}
          />
        )}

        <div className="flex items-center gap-3 relative">
          {/* Clickable fire icon button */}
          <button
            onClick={() => setShowModal(true)}
            className={`relative flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center border transition-all hover:scale-105 active:scale-95
              ${todayDone
                ? "bg-orange-500/15 border-orange-400/50 shadow-lg shadow-orange-500/20"
                : "bg-muted border-border hover:border-primary/40"
              }`}
            title="View streak details"
          >
            <FireIcon active={todayDone} size="md" />
            {streakData.currentStreak > 0 && (
              <div className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white px-1">
                  {streakData.currentStreak}
                </span>
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">Prep Streak</p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
              {streakData.currentStreak}{" "}
              <span className="text-base font-semibold text-muted-foreground">
                {streakData.currentStreak === 1 ? "Day" : "Days"}
              </span>
            </p>

            {/* Progress bar */}
            <div className="mt-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {todayDone
                    ? "✓ Streak earned today!"
                    : `${todayMins}m ${todaySecs.toString().padStart(2, "0")}s / 10m`}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {todayProgress}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    todayDone
                      ? "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400"
                      : "bg-primary"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${todayProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showModal && <StreakModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
