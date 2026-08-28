import { motion } from "framer-motion";
import {
  useStreakContext,
  formatDigitalClock,
  formatSessionTime,
} from "@/context/StreakContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudySessionWidgetProps {
  className?: string;
  compact?: boolean;
}

export function StudySessionWidget({ className, compact = false }: StudySessionWidgetProps) {
  const {
    sessionState,
    sessionElapsedSeconds,
    sessionStartTime,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    completedSessions,
  } = useStreakContext();
  const { toast } = useToast();

  const handleEndSession = () => {
    const completed = endSession();
    if (completed) {
      toast({
        title: "Study Session Recorded! 🎉",
        description: `${completed.durationFormatted} saved to your Analytics (${completed.timeRangeFormatted}).`,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        "bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-primary/25 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden group transition-all",
        className
      )}
    >
      {/* Subtle Ambient Background Glow */}
      <div
        className={cn(
          "absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl transition-colors duration-700 pointer-events-none",
          sessionState === "running"
            ? "bg-emerald-500/20"
            : sessionState === "paused"
              ? "bg-amber-500/20"
              : "bg-primary/15"
        )}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        {/* Left Column: Status Badge + Live Monospace Digital Timer + Details */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {sessionState === "running" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Session Active
              </span>
            ) : sessionState === "paused" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Session Paused
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] sm:text-[11px] font-bold tracking-wide uppercase">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                Study Session Tracker
              </span>
            )}

            {sessionStartTime && (
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                Started {formatSessionTime(sessionStartTime)}
              </span>
            )}
          </div>

          {/* Monospace Digital Clock */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground select-none">
              {formatDigitalClock(sessionElapsedSeconds)}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-none">
              {sessionState === "running"
                ? "Live background counter"
                : sessionState === "paused"
                  ? "Timer paused"
                  : "Ready to start session"}
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Control Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {sessionState === "idle" && (
            <Button
              onClick={startSession}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all px-3.5 py-2 h-auto rounded-xl"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start Session</span>
            </Button>
          )}

          {sessionState === "running" && (
            <>
              <Button
                onClick={pauseSession}
                variant="outline"
                size="sm"
                className="gap-1 text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-3 py-1.5 h-auto rounded-xl"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </Button>
              <Button
                onClick={handleEndSession}
                size="sm"
                className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all px-3.5 py-1.5 h-auto rounded-xl"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>End & Save</span>
              </Button>
            </>
          )}

          {sessionState === "paused" && (
            <>
              <Button
                onClick={resumeSession}
                size="sm"
                className="gap-1 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all px-3 py-1.5 h-auto rounded-xl"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume</span>
              </Button>
              <Button
                onClick={handleEndSession}
                variant="outline"
                size="sm"
                className="gap-1 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 h-auto rounded-xl"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>End & Save</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Notice about background persistence */}
      {!compact && (
        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground flex-wrap gap-2">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
            <span>Background Safe: Runs while browsing all pages and tabs.</span>
          </span>
          {completedSessions.length > 0 && (
            <span className="font-semibold text-primary shrink-0">
              {completedSessions.length} {completedSessions.length === 1 ? "session recorded" : "sessions recorded"}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
