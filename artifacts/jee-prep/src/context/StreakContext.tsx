import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";

export interface StreakRecord {
  date: string;       // "2026-08-28"
  type: "earned" | "extended";
}

export interface StreakData {
  currentStreak: number;
  lastEarnedDate: string | null;
  records: StreakRecord[];
  extendsUsedThisMonth: number;
  extendsResetMonth: string;  // "2026-08"
}

export interface TodaySession {
  date: string;
  seconds: number;
  streakEarned: boolean;
}

export type SessionState = "idle" | "running" | "paused";

export interface CompletedSession {
  id: string;
  date: string;              // "2026-08-28"
  dateFormatted: string;     // "Fri, Aug 28"
  startTime: number;         // 1756400000000
  endTime: number;           // 1756403600000
  durationSeconds: number;   // 3600
  durationFormatted: string; // "1h 00m 00s" or "54m 35s"
  timeRangeFormatted: string;// "08:35 PM - 09:37 PM"
  sections: Record<string, number>;
}

export interface ActiveSessionData {
  state: SessionState;
  startTime: number | null;
  lastResumeTime: number | null;
  accumulatedSeconds: number;
  sections: Record<string, number>;
}

export const TARGET_SECONDS = 600; // 10 minutes

export function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatSessionDate(date: Date | number | string) {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatSessionTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function formatDurationDetailed(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function formatDigitalClock(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function loadStreakData(): StreakData {
  try {
    const s = localStorage.getItem("jee_streak_data");
    if (s) return JSON.parse(s) as StreakData;
  } catch {}
  return {
    currentStreak: 0,
    lastEarnedDate: null,
    records: [],
    extendsUsedThisMonth: 0,
    extendsResetMonth: getMonthStr(),
  };
}

function loadTodaySession(): TodaySession {
  const today = getTodayStr();
  try {
    const s = localStorage.getItem("jee_streak_today");
    if (s) {
      const parsed = JSON.parse(s) as TodaySession;
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return { date: today, seconds: 0, streakEarned: false };
}

function loadActiveSession(): ActiveSessionData {
  try {
    const s = localStorage.getItem("jee_active_session");
    if (s) return JSON.parse(s) as ActiveSessionData;
  } catch {}
  return {
    state: "idle",
    startTime: null,
    lastResumeTime: null,
    accumulatedSeconds: 0,
    sections: {},
  };
}

function loadCompletedSessions(): CompletedSession[] {
  try {
    const s = localStorage.getItem("jee_session_history");
    if (s) return JSON.parse(s) as CompletedSession[];
  } catch {}
  return [];
}

interface StreakContextType {
  streakData: StreakData;
  todaySession: TodaySession;
  todayProgress: number;      // 0-100
  extendStreak: () => boolean; // returns whether extension was applied
  canExtend: boolean;
  extendsLeft: number;
  resetStreak: () => void;

  // Study Session Controls & State
  sessionState: SessionState; // "idle" | "running" | "paused"
  sessionElapsedSeconds: number; // Live duration of active session
  sessionStartTime: number | null;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => CompletedSession | null;
  recordSectionTime: (sectionName: string, deltaSecs: number) => void;
  completedSessions: CompletedSession[];
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streakData, setStreakData] = useState<StreakData>(loadStreakData);
  const [todaySession, setTodaySession] = useState<TodaySession>(loadTodaySession);
  
  // Study Session state
  const [activeSession, setActiveSession] = useState<ActiveSessionData>(loadActiveSession);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(() => {
    const init = loadActiveSession();
    if (init.state === "running" && init.lastResumeTime) {
      const delta = Math.max(0, Math.floor((Date.now() - init.lastResumeTime) / 1000));
      return init.accumulatedSeconds + delta;
    }
    return init.accumulatedSeconds;
  });
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>(loadCompletedSessions);

  const activeSessionRef = useRef<ActiveSessionData>(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
    localStorage.setItem("jee_active_session", JSON.stringify(activeSession));
  }, [activeSession]);

  // Persist streak helpers
  const persistStreak = (data: StreakData) => {
    localStorage.setItem("jee_streak_data", JSON.stringify(data));
    setStreakData(data);
  };

  // Compute new streak count given current data and today's date
  const computeNewStreak = useCallback((data: StreakData): number => {
    const today = getTodayStr();
    if (!data.lastEarnedDate) return 1;

    const lastDate = new Date(data.lastEarnedDate + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return data.currentStreak; // same day
    if (diffDays === 1) return data.currentStreak + 1; // consecutive

    // Check if gap is covered by extensions
    const extensions = data.records.filter(
      r => r.type === "extended" && r.date > data.lastEarnedDate! && r.date < today
    );
    if (extensions.length >= diffDays - 1) return data.currentStreak + 1;

    return 1; // streak broken
  }, []);

  // Update streak when todaySession increments
  const addStudyTimeToToday = useCallback((addedSecs: number) => {
    if (addedSecs <= 0) return;

    setTodaySession(prev => {
      const today = getTodayStr();
      const baseSecs = prev.date === today ? prev.seconds : 0;
      const newSeconds = baseSecs + addedSecs;
      const justEarned = !prev.streakEarned && newSeconds >= TARGET_SECONDS;

      const updated: TodaySession = {
        date: today,
        seconds: newSeconds,
        streakEarned: prev.streakEarned || justEarned,
      };
      localStorage.setItem("jee_streak_today", JSON.stringify(updated));

      // Award streak if just crossed 10 minutes
      if (justEarned) {
        setStreakData(currentData => {
          const today2 = getTodayStr();
          if (currentData.records.some(r => r.date === today2 && r.type === "earned")) {
            return currentData;
          }
          const newStreak = computeNewStreak(currentData);
          const newData: StreakData = {
            ...currentData,
            currentStreak: newStreak,
            lastEarnedDate: today2,
            records: [...currentData.records, { date: today2, type: "earned" }],
          };
          localStorage.setItem("jee_streak_data", JSON.stringify(newData));
          return newData;
        });
      }

      return updated;
    });
  }, [computeNewStreak]);

  // Session clock tick - ONLY ticks when session is running!
  useEffect(() => {
    let lastSecondTimestamp = Date.now();

    const interval = setInterval(() => {
      const sess = activeSessionRef.current;
      if (sess.state !== "running" || !sess.lastResumeTime) {
        lastSecondTimestamp = Date.now();
        return;
      }

      const now = Date.now();
      const currentRunDelta = Math.max(0, Math.floor((now - sess.lastResumeTime) / 1000));
      const totalLive = sess.accumulatedSeconds + currentRunDelta;
      setSessionElapsedSeconds(totalLive);

      // Track seconds passed for today's session
      const deltaSecs = Math.max(0, Math.floor((now - lastSecondTimestamp) / 1000));
      if (deltaSecs >= 1) {
        addStudyTimeToToday(deltaSecs);
        lastSecondTimestamp = now;
      }
    }, 1000);

    const onVisibilityOrUnload = () => {
      const sess = activeSessionRef.current;
      if (sess.state === "running" && sess.lastResumeTime) {
        const now = Date.now();
        const currentRunDelta = Math.max(0, Math.floor((now - sess.lastResumeTime) / 1000));
        setSessionElapsedSeconds(sess.accumulatedSeconds + currentRunDelta);
      }
    };

    window.addEventListener("visibilitychange", onVisibilityOrUnload);
    window.addEventListener("beforeunload", onVisibilityOrUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", onVisibilityOrUnload);
      window.removeEventListener("beforeunload", onVisibilityOrUnload);
    };
  }, [addStudyTimeToToday]);

  // ── Session Controls ────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    const now = Date.now();
    const newSession: ActiveSessionData = {
      state: "running",
      startTime: now,
      lastResumeTime: now,
      accumulatedSeconds: 0,
      sections: {},
    };
    setActiveSession(newSession);
    setSessionElapsedSeconds(0);
  }, []);

  const pauseSession = useCallback(() => {
    const sess = activeSessionRef.current;
    if (sess.state !== "running" || !sess.lastResumeTime) return;

    const now = Date.now();
    const currentRunDelta = Math.max(0, Math.floor((now - sess.lastResumeTime) / 1000));
    const newAcc = sess.accumulatedSeconds + currentRunDelta;

    const updated: ActiveSessionData = {
      ...sess,
      state: "paused",
      accumulatedSeconds: newAcc,
      lastResumeTime: null,
    };
    setActiveSession(updated);
    setSessionElapsedSeconds(newAcc);
  }, []);

  const resumeSession = useCallback(() => {
    const sess = activeSessionRef.current;
    if (sess.state !== "paused") return;

    const now = Date.now();
    const updated: ActiveSessionData = {
      ...sess,
      state: "running",
      lastResumeTime: now,
    };
    setActiveSession(updated);
  }, []);

  const endSession = useCallback((): CompletedSession | null => {
    const sess = activeSessionRef.current;
    if (sess.state === "idle") return null;

    const now = Date.now();
    let totalSecs = sess.accumulatedSeconds;
    if (sess.state === "running" && sess.lastResumeTime) {
      totalSecs += Math.max(0, Math.floor((now - sess.lastResumeTime) / 1000));
    }

    const st = sess.startTime || (now - Math.max(1, totalSecs) * 1000);
    const dateStr = getTodayStr();

    const completed: CompletedSession = {
      id: "sess_" + now,
      date: dateStr,
      dateFormatted: formatSessionDate(st),
      startTime: st,
      endTime: now,
      durationSeconds: totalSecs,
      durationFormatted: formatDurationDetailed(totalSecs),
      timeRangeFormatted: `${formatSessionTime(st)} - ${formatSessionTime(now)}`,
      sections: { ...sess.sections },
    };

    // 1. Save to session history
    const updatedHistory = [completed, ...completedSessions.slice(0, 99)];
    setCompletedSessions(updatedHistory);
    localStorage.setItem("jee_session_history", JSON.stringify(updatedHistory));

    // 2. Commit to Total Time Spent (jee_time_tracking)
    try {
      const raw = localStorage.getItem("jee_time_tracking");
      const records: Record<string, any> = raw ? JSON.parse(raw) : {};

      if (!records[dateStr]) {
        records[dateStr] = {
          date: dateStr,
          startTime: st,
          endTime: now,
          totalSeconds: 0,
          sections: {},
          sessions: [],
        };
      }

      const rec = records[dateStr];
      rec.startTime = Math.min(rec.startTime || st, st);
      rec.endTime = Math.max(rec.endTime || now, now);
      rec.totalSeconds = (rec.totalSeconds || 0) + totalSecs;

      // Merge sections
      if (!rec.sections) rec.sections = {};
      Object.entries(sess.sections).forEach(([sec, secSecs]) => {
        rec.sections[sec] = (rec.sections[sec] || 0) + secSecs;
      });

      if (!rec.sessions) rec.sessions = [];
      rec.sessions.unshift(completed);

      localStorage.setItem("jee_time_tracking", JSON.stringify(records));
    } catch (e) {
      console.error("Error updating jee_time_tracking", e);
    }

    // Reset active session
    const resetSess: ActiveSessionData = {
      state: "idle",
      startTime: null,
      lastResumeTime: null,
      accumulatedSeconds: 0,
      sections: {},
    };
    setActiveSession(resetSess);
    setSessionElapsedSeconds(0);

    return completed;
  }, [completedSessions]);

  const recordSectionTime = useCallback((sectionName: string, deltaSecs: number) => {
    const sess = activeSessionRef.current;
    if (sess.state !== "running") return;

    sess.sections[sectionName] = (sess.sections[sectionName] || 0) + deltaSecs;
  }, []);

  const resetStreak = useCallback(() => {
    setStreakData(currentData => {
      const newData: StreakData = {
        ...currentData,
        currentStreak: 0,
        lastEarnedDate: null,
      };
      localStorage.setItem("jee_streak_data", JSON.stringify(newData));
      return newData;
    });
  }, []);

  const extendStreak = useCallback((): boolean => {
    const today = getTodayStr();
    const currentMonth = getMonthStr();

    let data = { ...streakData };

    if (data.extendsResetMonth !== currentMonth) {
      data = { ...data, extendsUsedThisMonth: 0, extendsResetMonth: currentMonth };
    }

    if (data.extendsUsedThisMonth >= 5) return false;
    if (data.records.some(r => r.date === today)) return false;

    const newData: StreakData = {
      ...data,
      extendsUsedThisMonth: data.extendsUsedThisMonth + 1,
      records: [...data.records, { date: today, type: "extended" }],
    };
    persistStreak(newData);
    return true;
  }, [streakData]);

  const currentMonth = getMonthStr();
  const extendsUsed =
    streakData.extendsResetMonth === currentMonth ? streakData.extendsUsedThisMonth : 0;
  const extendsLeft = 5 - extendsUsed;
  const today = getTodayStr();
  const hasRecordToday = streakData.records.some(r => r.date === today);
  const canExtend = extendsLeft > 0 && !todaySession.streakEarned && !hasRecordToday;
  const todayProgress = Math.min(100, Math.round((todaySession.seconds / TARGET_SECONDS) * 100));

  return (
    <StreakContext.Provider
      value={{
        streakData,
        todaySession,
        todayProgress,
        extendStreak,
        canExtend,
        extendsLeft,
        resetStreak,
        sessionState: activeSession.state,
        sessionElapsedSeconds,
        sessionStartTime: activeSession.startTime,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        recordSectionTime,
        completedSessions,
      }}
    >
      {children}
    </StreakContext.Provider>
  );
}

export function useStreakContext() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error("useStreakContext must be used inside StreakProvider");
  return ctx;
}
