import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

interface LockdownContextType {
  isActive: boolean;
  endTime: number | null;
  startLockdown: (durationMs: number) => void;
  endLockdown: () => void;
  breakLockdown: () => void;
}

export const LockdownContext = createContext<LockdownContextType | null>(null);

export function LockdownProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [location, navigate] = useLocation();

  const updateRecord = (id: string, status: 'completed' | 'broken') => {
    try {
      const records = JSON.parse(localStorage.getItem("jee_lockdown_records") || "[]");
      const updated = records.map((r: any) => r.id === id ? { ...r, status } : r);
      localStorage.setItem("jee_lockdown_records", JSON.stringify(updated));
    } catch(e) {}
  };

  useEffect(() => {
    const raw = localStorage.getItem("jee_lockdown");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.isActive && parsed.endTime && parsed.endTime > Date.now()) {
        setIsActive(true);
        setEndTime(parsed.endTime);
      } else {
        // If the end time passed while the app was closed
        if (parsed.isActive && parsed.endTime && parsed.endTime <= Date.now()) {
          if (parsed.recordId) updateRecord(parsed.recordId, 'completed');
        }
        localStorage.removeItem("jee_lockdown");
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive && endTime) {
      interval = setInterval(() => {
        if (Date.now() >= endTime) {
          endLockdown();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  const startLockdown = (durationMs: number) => {
    const end = Date.now() + durationMs;
    const recordId = Date.now().toString();
    setIsActive(true);
    setEndTime(end);
    localStorage.setItem("jee_lockdown", JSON.stringify({ isActive: true, endTime: end, recordId }));
    
    try {
      const records = JSON.parse(localStorage.getItem("jee_lockdown_records") || "[]");
      records.push({ id: recordId, startTime: Date.now(), plannedDuration: durationMs, status: 'active' });
      localStorage.setItem("jee_lockdown_records", JSON.stringify(records));
    } catch(e) {}
    
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    
    if (!["/", "/pdf", "/saves"].includes(location)) {
      navigate("/");
    }
  };

  const endLockdown = () => {
    setIsActive(false);
    setEndTime(null);
    const raw = localStorage.getItem("jee_lockdown");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.recordId) updateRecord(parsed.recordId, 'completed');
    }
    localStorage.removeItem("jee_lockdown");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const breakLockdown = () => {
    setIsActive(false);
    setEndTime(null);
    const raw = localStorage.getItem("jee_lockdown");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.recordId) updateRecord(parsed.recordId, 'broken');
    }
    localStorage.removeItem("jee_lockdown");
    
    try {
      const streakRaw = localStorage.getItem("jee_streak_data");
      if (streakRaw) {
         const streakData = JSON.parse(streakRaw);
         streakData.currentStreak = 0;
         localStorage.setItem("jee_streak_data", JSON.stringify(streakData));
         window.dispatchEvent(new Event("storage"));
      }
    } catch(e) {}
    
    alert("Lockdown broken! You exited fullscreen. Your streak has been reset to 0.");
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isActive && !document.fullscreenElement) {
        breakLockdown();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!["/", "/pdf", "/saves"].includes(location)) {
      navigate("/");
    }
  }, [isActive, location, navigate]);

  useEffect(() => {
    if (!isActive) return;
    const preventInspect = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) || (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) || (e.ctrlKey && (e.key === "U" || e.key === "u"))) {
        e.preventDefault();
      }
    };
    const preventContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("keydown", preventInspect);
    document.addEventListener("contextmenu", preventContext);
    return () => {
      document.removeEventListener("keydown", preventInspect);
      document.removeEventListener("contextmenu", preventContext);
    };
  }, [isActive]);

  return (
    <LockdownContext.Provider value={{ isActive, endTime, startLockdown, endLockdown, breakLockdown }}>
      {children}
    </LockdownContext.Provider>
  );
}

export const useLockdown = () => {
  const ctx = useContext(LockdownContext);
  if (!ctx) throw new Error("useLockdown must be used within LockdownProvider");
  return ctx;
};