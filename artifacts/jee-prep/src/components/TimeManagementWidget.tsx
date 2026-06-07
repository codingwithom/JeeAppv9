import { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Pause, RotateCcw, Flag, Trash2, Plus, X,
  ChevronUp, ChevronDown, AlarmClock, Timer, Watch, Clock, Sprout
} from "lucide-react";
import { playTimerDone, playAlarmRing, setBeepVolume, getBeepVolume } from "@/utils/audio";
import { Volume2 } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface TimerItem {
  id: string;
  name: string;
  totalSecs: number;
  remaining: number;
  running: boolean;
}

interface AlarmItem {
  id: string;
  label: string;
  hour: number;
  minute: number;
  isPM: boolean;
  days: boolean[];
  sound: string;
  snooze: number;
  active: boolean;
}

interface Lap {
  n: number;
  lapMs: number;
  totalMs: number;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const SOUNDS = ["Chime", "Bells", "Beep", "Alert"];
const STORAGE_TIMERS = "jee_tm_timers";
const STORAGE_ALARMS = "jee_tm_alarms";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtSecs(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function timeUntil(h12: number, m: number, isPM: boolean): string {
  const now = new Date();
  const targetHour = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
  const target = new Date(now);
  target.setHours(targetHour, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diff = target.getTime() - now.getTime();
  const totalMins = Math.floor(diff / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `in ${mins}m`;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
}

function loadTimers(): TimerItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_TIMERS);
    if (raw) return (JSON.parse(raw) as TimerItem[]).map(t => ({ ...t, running: false }));
  } catch {}
  return [];
}

function loadAlarms(): AlarmItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_ALARMS);
    if (raw) return JSON.parse(raw) as AlarmItem[];
  } catch {}
  return [];
}

// ─── SPIN INPUT ───────────────────────────────────────────────────────────────
function SpinInput({
  value, min, max, wrap = false, onChange, className,
}: {
  value: number;
  min: number;
  max: number;
  wrap?: boolean;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value).padStart(2, "0"));

  useEffect(() => {
    setRaw(String(value).padStart(2, "0"));
  }, [value]);

  const clamp = (n: number) => {
    if (wrap) {
      const range = max - min + 1;
      return ((n - min) % range + range) % range + min;
    }
    return Math.min(max, Math.max(min, n));
  };

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    onChange(isNaN(n) ? value : clamp(n));
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(clamp(value + (e.deltaY > 0 ? 1 : -1)));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => commit(raw)}
      onKeyDown={e => {
        if (e.key === "Enter") commit(raw);
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(clamp(value + 1)); }
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(value - 1)); }
      }}
      onWheel={onWheel}
      className={className}
      style={{ cursor: "ns-resize" }}
    />
  );
}

// ─── VOLUME CONTROL ───────────────────────────────────────────────────────────
function VolumeControl({ isDark }: { isDark: boolean }) {
  const [vol, setVol] = useState(() => getBeepVolume());
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const applyVol = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVol(clamped);
    setBeepVolume(clamped);
  };

  const posToVol = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return vol;
    return (clientX - rect.left) / rect.width;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    applyVol(posToVol(e.clientX));
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) applyVol(posToVol(e.clientX)); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  });

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    applyVol(vol + (e.deltaY > 0 ? -0.05 : 0.05));
  };

  const mc = isDark ? "text-gray-400" : "text-gray-500";
  const trackBg = isDark ? "bg-white/10" : "bg-gray-200";

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <Volume2 className={`h-4 w-4 shrink-0 ${mc}`} />
      <div
        ref={barRef}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        className={`relative h-2 flex-1 rounded-full ${trackBg} cursor-pointer select-none`}
        title={`Beep volume: ${Math.round(vol * 100)}%`}
      >
        <div
          className="h-full rounded-full bg-blue-500 pointer-events-none transition-none"
          style={{ width: `${vol * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow pointer-events-none"
          style={{ left: `calc(${vol * 100}% - 6px)` }}
        />
      </div>
      <span className={`text-[10px] font-medium tabular-nums w-7 text-right ${mc}`}>
        {Math.round(vol * 100)}%
      </span>
    </div>
  );
}

// ─── SVG PROGRESS RING ────────────────────────────────────────────────────────
function ProgressRing({ remaining, total, size = 120 }: { remaining: number; total: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? remaining / total : 0;
  const offset = circ * (1 - pct);
  const done = remaining === 0 && total > 0;
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} stroke="currentColor" className="text-border/40" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5}
        stroke={done ? "#22c55e" : "#3b82f6"}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
      />
    </svg>
  );
}

// ─── TIMERS SECTION ───────────────────────────────────────────────────────────
function TimersSection({ isDark }: { isDark: boolean }) {
  const [timers, setTimers] = useState<TimerItem[]>(loadTimers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimerItem | null>(null);
  const [name, setName] = useState("Timer");
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_TIMERS, JSON.stringify(timers));
  }, [timers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev =>
        prev.map(t => {
          if (!t.running) return t;
          if (t.remaining <= 1) {
            playTimerDone();
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`⏰ "${t.name}" finished!`);
            }
            
            if (t.totalSecs >= 1500) {
              const currentPlants = JSON.parse(localStorage.getItem("jee_tm_garden") || "[]");
              const types = ["🌲", "🌳", "🌵", "🪴", "🌴", "🌻", "🍁", "🍄", "🌺"];
              const plantType = types[Math.floor(Math.random() * types.length)];
              currentPlants.push({ id: Date.now(), name: t.name, date: new Date().toISOString(), type: plantType });
              localStorage.setItem("jee_tm_garden", JSON.stringify(currentPlants));
            }
            return { ...t, running: false, remaining: 0 };
          }
          return { ...t, remaining: t.remaining - 1 };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const openAdd = () => {
    setEditing(null); setName("Timer"); setH(0); setM(5); setS(0);
    setModalOpen(true);
  };

  const openEdit = (t: TimerItem) => {
    setEditing(t); setName(t.name);
    setH(Math.floor(t.totalSecs / 3600));
    setM(Math.floor((t.totalSecs % 3600) / 60));
    setS(t.totalSecs % 60);
    setModalOpen(true);
  };

  const save = () => {
    const totalSecs = h * 3600 + m * 60 + s;
    if (totalSecs <= 0) return;
    if (editing) {
      setTimers(prev => prev.map(t =>
        t.id === editing.id ? { ...t, name, totalSecs, remaining: totalSecs, running: false } : t
      ));
    } else {
      setTimers(prev => [...prev, { id: Date.now().toString(), name, totalSecs, remaining: totalSecs, running: false }]);
    }
    setModalOpen(false);
  };

  const toggle = (id: string) =>
    setTimers(prev => prev.map(t => t.id === id && t.remaining > 0 ? { ...t, running: !t.running } : t));

  const reset = (id: string) =>
    setTimers(prev => prev.map(t => t.id === id ? { ...t, remaining: t.totalSecs, running: false } : t));

  const del = (id: string) => setTimers(prev => prev.filter(t => t.id !== id));

  const tc = isDark ? "text-white" : "text-gray-900";
  const mc = isDark ? "text-gray-400" : "text-gray-500";
  const cardBg = isDark ? "bg-muted/20" : "bg-gray-50";
  const modalBg = isDark ? "bg-card border-white/10" : "bg-white border-gray-200";
  const addBg = isDark ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-gray-50 hover:bg-gray-100 border-gray-200";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-2">
        {timers.map(t => (
          <div key={t.id} className={`${cardBg} rounded-xl p-4 border border-border/30 flex flex-col items-center gap-3`}>
            <div className="flex items-center justify-between w-full">
              <span className={`text-sm font-semibold ${tc} truncate flex-1`}>{t.name}</span>
              <div className="flex gap-0.5">
                <button onClick={() => openEdit(t)} className={`${mc} hover:text-primary p-1.5 rounded`} title="Edit">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button onClick={() => del(t.id)} className={`${mc} hover:text-destructive p-1.5 rounded`} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="relative" style={{ width: 120, height: 120 }}>
              <ProgressRing remaining={t.remaining} total={t.totalSecs} size={120} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-mono font-bold ${tc} tabular-nums`}>{fmtSecs(t.remaining)}</span>
                {t.remaining === 0 && <span className="text-xs text-green-500 font-medium">Done!</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggle(t.id)}
                disabled={t.remaining === 0}
                className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 shadow-md shadow-blue-500/20 transition-all"
              >
                {t.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <button
                onClick={() => reset(t.id)}
                className={`h-9 w-9 rounded-full border border-border ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"} ${mc} flex items-center justify-center transition-all`}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={openAdd}
          className={`${addBg} border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 min-h-[11rem] transition-colors`}
        >
          <Plus className={`h-6 w-6 ${mc}`} />
          <span className={`text-sm ${mc}`}>Add Timer</span>
        </button>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`${modalBg} border rounded-2xl p-6 w-full max-w-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${tc}`}>{editing ? "Edit Timer" : "New Timer"}</h3>
                <button onClick={() => setModalOpen(false)} className={mc}><X className="h-5 w-5" /></button>
              </div>

              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Timer Name" className="mb-5" />

              <div className="flex items-center justify-center gap-4 mb-6">
                {([{ val: h, set: setH, min: 0, max: 23, label: "HH" }, { val: m, set: setM, min: 0, max: 59, label: "MM" }, { val: s, set: setS, min: 0, max: 59, label: "SS" }] as const).map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <button onClick={() => item.set((v: number) => Math.min(item.max, v + 1))} className={`${mc} hover:text-primary p-1`}><ChevronUp className="h-4 w-4" /></button>
                    <SpinInput
                      value={item.val}
                      min={item.min}
                      max={item.max}
                      onChange={v => item.set(v)}
                      className={`text-3xl font-mono font-bold bg-transparent border-none outline-none text-center tabular-nums w-12 ${tc}`}
                    />
                    <button onClick={() => item.set((v: number) => Math.max(0, v - 1))} className={`${mc} hover:text-primary p-1`}><ChevronDown className="h-4 w-4" /></button>
                    <span className={`text-[10px] ${mc} font-medium`}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={save}>Save Timer</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── STOPWATCH SECTION ────────────────────────────────────────────────────────
function StopwatchSection({ isDark }: { isDark: boolean }) {
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const displayRef = useRef<HTMLDivElement>(null);
  const currentElapsedRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (startRef.current !== null) {
      const current = baseRef.current + (Date.now() - startRef.current);
      currentElapsedRef.current = current;
      if (displayRef.current) {
        displayRef.current.textContent = fmtMs(current);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    baseRef.current = currentElapsedRef.current;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    baseRef.current = 0;
    currentElapsedRef.current = 0;
    if (displayRef.current) displayRef.current.textContent = fmtMs(0);
    setLaps([]);
    setRunning(false);
  };

  const lap = () => {
    const prevTotal = laps.length > 0 ? laps[laps.length - 1].totalMs : 0;
    setLaps(prev => [...prev, { n: prev.length + 1, lapMs: currentElapsedRef.current - prevTotal, totalMs: currentElapsedRef.current }]);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const tc = isDark ? "text-white" : "text-gray-900";
  const mc = isDark ? "text-gray-400" : "text-gray-500";
  const rowBg = isDark ? "border-white/10 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50";
  const theadBg = isDark ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500";

  return (
    <div className="flex flex-col items-center gap-8">
      <div ref={displayRef} className={`text-5xl sm:text-6xl md:text-7xl font-mono font-bold ${tc} tabular-nums tracking-tight select-none`}>
        {fmtMs(currentElapsedRef.current)}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={running ? pause : start}
          className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all"
        >
          {running ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
        </button>
        <button
          onClick={lap}
          disabled={!running}
          className={`h-14 w-14 rounded-full border-2 border-border ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"} ${mc} flex items-center justify-center disabled:opacity-40 transition-all active:scale-95`}
          title="Lap"
        >
          <Flag className="h-5 w-5" />
        </button>
        <button
          onClick={reset}
          className={`h-14 w-14 rounded-full border-2 border-border ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"} ${mc} flex items-center justify-center transition-all active:scale-95`}
          title="Reset"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {laps.length > 0 && (
        <div className="w-full max-h-56 overflow-y-auto rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className={theadBg}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Lap</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Lap Time</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...laps].reverse().map(l => (
                <tr key={l.n} className={`border-t ${rowBg} transition-colors`}>
                  <td className={`px-4 py-2.5 font-medium ${mc}`}>#{l.n}</td>
                  <td className={`px-4 py-2.5 font-mono text-sm ${tc}`}>{fmtMs(l.lapMs)}</td>
                  <td className={`px-4 py-2.5 font-mono text-sm ${mc}`}>{fmtMs(l.totalMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {laps.length === 0 && !running && currentElapsedRef.current === 0 && (
        <p className={`text-sm ${mc}`}>Press play to start timing</p>
      )}
    </div>
  );
}

// ─── ALARMS SECTION ───────────────────────────────────────────────────────────
function AlarmsSection({ isDark }: { isDark: boolean }) {
  const [alarms, setAlarms] = useState<AlarmItem[]>(loadAlarms);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlarmItem | null>(null);
  const [label, setLabel] = useState("Alarm");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [days, setDays] = useState<boolean[]>(Array(7).fill(false));
  const [sound, setSound] = useState("Chime");
  const [snooze, setSnooze] = useState(5);
  const [repeat, setRepeat] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_ALARMS, JSON.stringify(alarms));
  }, [alarms]);

  // Update "time until" every minute
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Check alarms every second for precision
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const ch = now.getHours(), cm = now.getMinutes(), cs = now.getSeconds();
      if (cs !== 0) return;
      alarms.forEach(a => {
        if (!a.active) return;
        const ah = a.isPM ? (a.hour === 12 ? 12 : a.hour + 12) : (a.hour === 12 ? 0 : a.hour);
        if (ah === ch && a.minute === cm) {
          playAlarmRing();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🔔 ${a.label || "Alarm"}!`);
          }
        }
      });
    };
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [alarms]);

  const openAdd = () => {
    setEditing(null); setLabel("Alarm"); setHour(8); setMinute(0); setIsPM(false);
    setDays(Array(7).fill(false)); setSound("Chime"); setSnooze(5); setRepeat(false);
    setModalOpen(true);
  };

  const openEdit = (a: AlarmItem) => {
    setEditing(a); setLabel(a.label); setHour(a.hour); setMinute(a.minute); setIsPM(a.isPM);
    setDays([...a.days]); setSound(a.sound); setSnooze(a.snooze); setRepeat(a.days.some(Boolean));
    setModalOpen(true);
  };

  const save = () => {
    const alarm: AlarmItem = {
      id: editing?.id || Date.now().toString(),
      label, hour, minute, isPM,
      days: repeat ? days : Array(7).fill(false),
      sound, snooze, active: editing?.active ?? true,
    };
    if (editing) setAlarms(prev => prev.map(a => a.id === editing.id ? alarm : a));
    else setAlarms(prev => [...prev, alarm]);
    setModalOpen(false);
  };

  const toggleActive = (id: string) =>
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));

  const del = (id: string) => setAlarms(prev => prev.filter(a => a.id !== id));

  const tc = isDark ? "text-white" : "text-gray-900";
  const mc = isDark ? "text-gray-400" : "text-gray-500";
  const cardBg = isDark ? "bg-muted/20" : "bg-gray-50";
  const modalBg = isDark ? "bg-card border-white/10" : "bg-white border-gray-200";
  const addBg = isDark ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-gray-50 hover:bg-gray-100 border-gray-200";
  const selBg = isDark ? "bg-white/5 text-white" : "bg-white text-gray-900";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
        {alarms.map(a => (
          <div key={a.id} className={`${cardBg} rounded-xl p-4 border border-border/30 space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-2xl font-bold tabular-nums transition-colors ${a.active ? tc : mc}`}>
                  {String(a.hour).padStart(2, "0")}:{String(a.minute).padStart(2, "0")} {a.isPM ? "PM" : "AM"}
                </p>
                <p className={`text-xs ${mc}`}>{timeUntil(a.hour, a.minute, a.isPM)} · {a.label}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(a.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${a.active ? "bg-blue-600" : isDark ? "bg-white/20" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${a.active ? "left-6" : "left-1"}`} />
                </button>
                <button onClick={() => openEdit(a)} className={`${mc} hover:text-primary p-1`}><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(a.id)} className={`${mc} hover:text-destructive p-1`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {a.days.some(Boolean) && (
              <div className="flex gap-1">
                {a.days.map((on, i) => (
                  <span key={i} className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium transition-colors
                    ${on ? "bg-blue-600 text-white" : isDark ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-400"}`}>
                    {DAY_NAMES[i]}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={openAdd}
          className={`${addBg} border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 min-h-24 transition-colors`}
        >
          <Plus className={`h-6 w-6 ${mc}`} />
          <span className={`text-sm ${mc}`}>Add Alarm</span>
        </button>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`${modalBg} border rounded-2xl p-6 w-full max-w-sm space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${tc}`}>{editing ? "Edit Alarm" : "New Alarm"}</h3>
                <button onClick={() => setModalOpen(false)} className={mc}><X className="h-5 w-5" /></button>
              </div>

              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Alarm label" />

              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setHour(h => h === 12 ? 1 : h + 1)} className={`${mc} hover:text-primary p-1`}><ChevronUp className="h-4 w-4" /></button>
                  <SpinInput
                    value={hour}
                    min={1}
                    max={12}
                    wrap
                    onChange={setHour}
                    className={`text-4xl font-mono font-bold bg-transparent border-none outline-none text-center tabular-nums w-14 ${tc}`}
                  />
                  <button onClick={() => setHour(h => h === 1 ? 12 : h - 1)} className={`${mc} hover:text-primary p-1`}><ChevronDown className="h-4 w-4" /></button>
                </div>
                <span className={`text-3xl font-bold ${tc} mb-1`}>:</span>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setMinute(m => (m + 1) % 60)} className={`${mc} hover:text-primary p-1`}><ChevronUp className="h-4 w-4" /></button>
                  <SpinInput
                    value={minute}
                    min={0}
                    max={59}
                    wrap
                    onChange={setMinute}
                    className={`text-4xl font-mono font-bold bg-transparent border-none outline-none text-center tabular-nums w-14 ${tc}`}
                  />
                  <button onClick={() => setMinute(m => (m - 1 + 60) % 60)} className={`${mc} hover:text-primary p-1`}><ChevronDown className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-col gap-1.5 ml-1">
                  <button onClick={() => setIsPM(false)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!isPM ? "bg-blue-600 text-white" : `border border-border ${mc}`}`}>AM</button>
                  <button onClick={() => setIsPM(true)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isPM ? "bg-blue-600 text-white" : `border border-border ${mc}`}`}>PM</button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} className="rounded accent-blue-600" />
                  <span className={`text-sm font-medium ${tc}`}>Repeat</span>
                </label>
                {repeat && (
                  <div className="flex gap-1.5">
                    {DAY_NAMES.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setDays(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                        className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors
                          ${days[i] ? "bg-blue-600 text-white" : `border border-border ${mc} hover:border-blue-400`}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${mc} mb-1 block`}>Sound</label>
                  <select value={sound} onChange={e => setSound(e.target.value)}
                    className={`w-full text-sm rounded-lg border border-border px-3 py-2 outline-none ${selBg}`}>
                    {SOUNDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${mc} mb-1 block`}>Snooze</label>
                  <select value={snooze} onChange={e => setSnooze(Number(e.target.value))}
                    className={`w-full text-sm rounded-lg border border-border px-3 py-2 outline-none ${selBg}`}>
                    {[5, 10, 20].map(n => <option key={n} value={n}>{n} min</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={save}>Save Alarm</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GARDEN SECTION ───────────────────────────────────────────────────────────
function GardenSection({ isDark }: { isDark: boolean }) {
  const [plants, setPlants] = useState<{id: number, name: string, date: string, type: string}[]>([]);
  
  useEffect(() => {
    const raw = localStorage.getItem("jee_tm_garden");
    if (raw) setPlants(JSON.parse(raw));
  }, []);

  const tc = isDark ? "text-white" : "text-gray-900";
  const mc = isDark ? "text-gray-400" : "text-gray-500";
  const cardBg = isDark ? "bg-muted/20" : "bg-gray-50";

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className={`text-xl font-bold ${tc} flex items-center justify-center gap-2`}>
          <Sprout className="h-5 w-5 text-green-500" /> Focus Garden
        </h3>
        <p className={`text-sm ${mc}`}>Grow a plant for every 25+ min timer completed!</p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center max-h-80 overflow-y-auto p-2">
        <AnimatePresence>
          {plants.length === 0 ? (
             <p className={`text-sm ${mc} py-8`}>No plants yet. Start a 25-minute timer to grow your first plant!</p>
          ) : (
            plants.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: Math.min(i * 0.05, 1) }}
                className={`w-24 h-24 ${cardBg} border border-border/40 rounded-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden group shadow-sm`}
              >
                <motion.div
                   whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                   className="text-4xl drop-shadow-lg"
                >
                  {p.type || ["🌲", "🌳", "🌵", "🪴", "🌴", "🌻"][p.id % 6]}
                </motion.div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] text-white font-bold truncate w-full text-center px-1">{p.name}</span>
                  <span className="text-[8px] text-white/70">{new Date(p.date).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
type Tab = "timers" | "stopwatch" | "alarms";

const TABS: { key: Tab; label: string; icon: typeof Timer }[] = [
  { key: "timers", label: "Timers", icon: Timer },
  { key: "stopwatch", label: "Stopwatch", icon: Watch },
  { key: "alarms", label: "Alarms", icon: AlarmClock },
];

export function TimeManagementWidget() {
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<Tab>("timers");

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const tc = isDark ? "text-white" : "text-gray-900";
  const mc = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`border border-border rounded-2xl p-6 bg-card`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        <h2 className={`text-lg font-bold ${tc} flex-1`}>Time Management</h2>
        <VolumeControl isDark={isDark} />
      </div>

      <div className={`flex border-b border-border mb-6 gap-1`}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
              ${tab === key
                ? "border-blue-500 text-blue-400"
                : `border-transparent ${mc} hover:text-foreground`}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "timers" && <TimersSection isDark={isDark} />}
          {tab === "stopwatch" && <StopwatchSection isDark={isDark} />}
          {tab === "alarms" && <AlarmsSection isDark={isDark} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-border/60">
        <GardenSection isDark={isDark} />
      </div>
    </div>
  );
}
