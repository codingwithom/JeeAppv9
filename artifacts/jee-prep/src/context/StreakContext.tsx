import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";

export interface StreakRecord {
  date: string;       // "2026-05-03"
  type: "earned" | "extended";
}

export interface StreakData {
  currentStreak: number;
  lastEarnedDate: string | null;
  records: StreakRecord[];
  extendsUsedThisMonth: number;
  extendsResetMonth: string;  // "2026-05"
}

export interface TodaySession {
  date: string;
  seconds: number;
  streakEarned: boolean;
}

export const TARGET_SECONDS = 600; // 10 minutes

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

interface StreakContextType {
  streakData: StreakData;
  todaySession: TodaySession;
  todayProgress: number;      // 0-100
  extendStreak: () => boolean; // returns whether extension was applied
  canExtend: boolean;
  extendsLeft: number;
  resetStreak: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streakData, setStreakData] = useState<StreakData>(loadStreakData);
  const [todaySession, setTodaySession] = useState<TodaySession>(loadTodaySession);

  // Persist helpers
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

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTodaySession(prev => {
        const today = getTodayStr();

        // New day — reset
        if (prev.date !== today) {
          const fresh: TodaySession = { date: today, seconds: 0, streakEarned: false };
          localStorage.setItem("jee_streak_today", JSON.stringify(fresh));
          return fresh;
        }

        const newSeconds = prev.seconds + 1;
        const justEarned = !prev.streakEarned && newSeconds >= TARGET_SECONDS;

        const updated: TodaySession = {
          ...prev,
          seconds: newSeconds,
          streakEarned: prev.streakEarned || justEarned,
        };
        localStorage.setItem("jee_streak_today", JSON.stringify(updated));

        // If just crossed the 10-min threshold, update streak data
        if (justEarned) {
          setStreakData(currentData => {
            const today2 = getTodayStr();
            // Don't double-earn
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
    }, 1000);

    return () => clearInterval(timer);
  }, [computeNewStreak]);

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

    // Reset monthly count if new month
    if (data.extendsResetMonth !== currentMonth) {
      data = { ...data, extendsUsedThisMonth: 0, extendsResetMonth: currentMonth };
    }

    if (data.extendsUsedThisMonth >= 5) return false;
    if (data.records.some(r => r.date === today)) return false; // already has a record today

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
      value={{ streakData, todaySession, todayProgress, extendStreak, canExtend, extendsLeft, resetStreak }}
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
