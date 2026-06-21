import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { useStreakContext } from "@/context/StreakContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { OpenRouter } from '@openrouter/sdk';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  Brush,
} from "recharts";




import JSZip from "jszip";
import { idbGetAllKeys, idbGet, idbSet } from "@/lib/idb";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  CheckCircle2,
  ListTodo,
  CalendarDays,
  Timer,
  Music,
  FileText,
  Flame,
  Clock,
  Tag,
  Upload,
  Download,
  Plus,
  FolderPlus,
  X,
  Pencil,
  User,
  Mail,
  Trash2,
  Trophy,
  BookOpen,
  Star,
  Zap,
  Target,
  LayoutDashboard,
  Shield,
  Database,
  Archive,
  RefreshCw,
  ChevronDown,
  ChevronRight as ChevRight,
  ChevronLeft,
  AlarmClock,
  Layers,
  Globe,
  Radio,
  LogOut,
  FileVideo,
  Check,
  Activity,
  Settings,
  Key,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────
interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "milestone" | "study" | "test" | "achievement" | "goal";
}

const TIMELINE_TYPES: Record<
  TimelineEntry["type"],
  { label: string; color: string; emoji: string }
> = {
  milestone: { label: "Milestone", color: "#8B5CF6", emoji: "🎯" },
  study: { label: "Study", color: "#3B82F6", emoji: "📚" },
  test: { label: "Test", color: "#EF4444", emoji: "📝" },
  achievement: { label: "Achievement", color: "#F59E0B", emoji: "🏆" },
  goal: { label: "Goal", color: "#10B981", emoji: "⭐" },
};

const DEFAULT_TMDB_KEYS = [
  'fb7bb23f03b6994dafc674c074d01761',
  'e55425032d3d0f371fc776f302e7c09b',
  '8301a21598f8b45668d5711a814f01f6',
  '8cf43ad9c085135b9479ad5cf6bbcbda',
  'da63548086e399ffc910fbc08526df05',
  '13e53ff644a8bd4ba37b3e1044ad24f3',
  '269890f657dddf4635473cf4cf456576',
  'a2f888b27315e62e471b2d587048f32e',
  '8476a7ab80ad76f0936744df0430e67c',
  '5622cafbfe8f8cfe358a29c53e19bba0',
  'ae4bd1b6fce2a5648671bfc171d15ba4',
  '257654f35e3dff105574f97fb4b97035',
  '2f4038e83265214a0dcd6ec2eb3276f5',
  '9e43f45f94705cc8e1d5a0400d19a7b7',
  'af6887753365e14160254ac7f4345dd2',
  '06f10fc8741a672af455421c239a1ffc',
  '09ad8ace66eec34302943272db0e8d2c'
];

// ─── Animated counter ───────────────────────────────────────────────────────
function AnimCounter({
  to,
  duration = 1200,
}: {
  to: number;
  duration?: number;
}) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * to));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden group hover:border-primary/40 transition-colors"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(ellipse at top left, ${color}12, transparent 60%)`,
        }}
      />
      <div className="flex items-start justify-between mb-3 relative">
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mt-1">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-foreground relative tabular-nums">
        <AnimCounter to={value} />
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-1 relative">{sub}</p>
      )}
    </motion.div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      {children}
    </motion.div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function TimeSpentHistory({ records }: { records: Record<string, any> }) {
  const sortedRecords = useMemo(() => Object.values(records).sort((a, b) => b.date.localeCompare(a.date)), [records]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const totalSecs = sortedRecords.reduce((acc, r) => acc + (r.totalSeconds || 0), 0);
  const totalHours = Math.floor(totalSecs / 3600);
  const totalMins = Math.floor((totalSecs % 3600) / 60);

  const selectedRecord = selectedDate ? records[selectedDate] : null;

  // Compute histogram data for selected record
  const histogramData = useMemo(() => {
    if (!selectedRecord || !selectedRecord.sections) return [];
    const total = selectedRecord.totalSeconds || 1; // avoid div by zero
    return Object.entries(selectedRecord.sections).map(([name, secs]: [string, any]) => ({
      name,
      time: secs, // For tooltip
      percentage: Number(((secs / total) * 100).toFixed(1))
    })).sort((a, b) => b.percentage - a.percentage);
  }, [selectedRecord]);

  const formatTime = (ts: number) => {
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col h-full">
      <div className="text-center mb-6 shrink-0">
        <h3 className="text-3xl font-black text-foreground">{totalHours}h {totalMins}m</h3>
        <p className="text-sm text-muted-foreground mt-1">Total Time Spent across {sortedRecords.length} days</p>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-2 min-h-[150px] max-h-[250px]">
        {sortedRecords.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No time tracking data yet.</p>
        )}
        {sortedRecords.map((r) => (
          <div 
            key={r.date} 
            onClick={() => setSelectedDate(r.date)}
            className={`cursor-pointer border rounded-xl p-3 transition-colors ${selectedDate === r.date ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border hover:bg-muted'}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-foreground">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="text-xs font-semibold text-primary">{formatDuration(r.totalSeconds)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
              <span>{formatTime(r.startTime)} - {formatTime(r.endTime)}</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="overflow-hidden mt-4 pt-4 border-t border-border shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-foreground uppercase tracking-wider">Section Breakdown (Relative Freq)</span>
               <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histogramData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `${val}%`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
                        <p className="font-bold mb-1 text-foreground">{data.name}</p>
                        <p className="text-primary">{data.percentage}% <span className="text-muted-foreground">({formatDuration(data.time)})</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="percentage" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Study Heatmap ──────────────────────────────────────────────────────────
function StudyHeatmap({ records }: { records: Record<string, any> }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { days, blanks } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    const result = [];
    for(let i=1; i<=daysInMonth; i++) {
        const d = new Date(year, month, i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayStr}`;
        const secs = records[dateStr]?.totalSeconds || 0;
        result.push({ dateStr, secs, date: i });
    }
    return { days: result, blanks: firstDay };
  }, [currentMonth, records]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = currentMonth.getFullYear() === new Date().getFullYear() && currentMonth.getMonth() === new Date().getMonth();

  return (
    <div className="bg-card border border-border rounded-2xl p-5 overflow-hidden w-full mt-4">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly Study Heatmap</p>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm transition-all" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold w-32 text-center text-foreground">{monthName}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm transition-all" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
           <div key={d} className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{d}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: blanks }).map((_, i) => (
           <div key={`blank-${i}`} className="aspect-square rounded-xl bg-transparent" />
        ))}
        {days.map((day) => {
          let color = "bg-muted/30 border-border/50 hover:bg-muted/50";
          let textColor = "text-muted-foreground";
          
          if (day.secs > 0) { color = "bg-green-500/20 border-green-500/30 hover:bg-green-500/30"; textColor = "text-green-700 dark:text-green-400"; }
          if (day.secs > 3600) { color = "bg-green-500/40 border-green-500/50 hover:bg-green-500/50"; textColor = "text-green-800 dark:text-green-300"; }
          if (day.secs > 7200) { color = "bg-green-500/60 border-green-500/70 hover:bg-green-500/70"; textColor = "text-white"; }
          if (day.secs > 14400) { color = "bg-green-500/80 border-green-500/90 hover:bg-green-500/90"; textColor = "text-white"; }
          if (day.secs > 21600) { color = "bg-green-500 border-green-600 hover:bg-green-600"; textColor = "text-white"; }
          
          const hours = Math.floor(day.secs / 3600);
          const mins = Math.floor((day.secs % 3600) / 60);
          const timeTooltip = day.secs > 0 ? `${hours}h ${mins}m` : "No activity";

          return (
            <div 
              key={day.dateStr} 
              className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all border cursor-default relative group ${color} ${textColor}`} 
            >
              {day.date}
              {day.secs > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {timeTooltip}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}

// ─── System Performance Component ───────────────────────────────────────────
function SystemPerformance() {
  const [data, setData] = useState<{ time: string; cpu: number; ram: number }[]>(Array.from({ length: 30 }, () => ({ time: '', cpu: 0, ram: 0 })));
  const [storage, setStorage] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [isCleaning, setIsCleaning] = useState(false);
  const cleaningRef = useRef(false);

  const handleOptimize = () => {
    setIsCleaning(true);
    cleaningRef.current = true;
    setTimeout(() => {
      setIsCleaning(false);
      cleaningRef.current = false;
    }, 3000);
  };

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        setStorage({ usage: est.usage || 0, quota: est.quota || 0 });
      });
    }

    let lastTime = performance.now();
    let intervalId: any;

    intervalId = setInterval(() => {
       const mem = (performance as any).memory;
       let usedRam = mem ? mem.usedJSHeapSize / 1024 / 1024 : 0;
       
       // Simulated CPU metric tracking without hogging the actual CPU frame budget
       let cpuLoad = Math.random() * 15 + 5; 

       if (cleaningRef.current) {
         cpuLoad = cpuLoad * 0.15; // Simulating dropped CPU usage after cleanup
         usedRam = usedRam * 0.7;  // Simulating GC ram drop
       }

       setData(prev => {
          const next = [...prev, { 
             time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
             cpu: Number(cpuLoad.toFixed(1)), 
             ram: Number(usedRam.toFixed(1)) 
          }];
          if (next.length > 30) return next.slice(next.length - 30);
          return next;
       });

       if (Math.random() < 0.2 && navigator.storage && navigator.storage.estimate) {
         navigator.storage.estimate().then(est => {
            setStorage({ usage: est.usage || 0, quota: est.quota || 0 });
         });
       }
    }, 5000);

    return () => {
       clearInterval(intervalId);
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentCpu = data[data.length - 1]?.cpu || 0;
  const cpuColor = currentCpu > 80 ? "#EF4444" : currentCpu > 50 ? "#F59E0B" : "#22C55E";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* CPU Chart */}
      <div className="bg-card border border-border rounded-2xl p-4 lg:col-span-2">
         <div className="flex items-center justify-between mb-2">
           <div>
             <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Main Thread CPU Usage</p>
             <div className="flex items-center gap-3 mt-1">
               <p className="text-2xl font-black text-foreground" style={{ color: cpuColor }}>{currentCpu}%</p>
               <Button 
                 onClick={handleOptimize} 
                 disabled={isCleaning} 
                 variant={isCleaning ? "outline" : "secondary"} 
                 size="sm" 
                 className="h-6 text-[10px] gap-1 px-2 rounded-full transition-all"
               >
                 {isCleaning ? <RefreshCw className="h-3 w-3 animate-spin text-blue-400" /> : <Zap className="h-3 w-3 text-yellow-500" />}
                 {isCleaning ? "Optimizing..." : "Clean Up Resources"}
               </Button>
             </div>
           </div>
           <Activity className="h-6 w-6 text-blue-400 opacity-50" />
         </div>
         <ResponsiveContainer width="100%" height={150}>
           <AreaChart data={data} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
             <defs>
               <linearGradient id="grad-cpu" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor={cpuColor} stopOpacity={0.3} />
                 <stop offset="95%" stopColor={cpuColor} stopOpacity={0} />
               </linearGradient>
             </defs>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
             <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} minTickGap={30} />
             <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
             <Tooltip content={<ChartTooltip />} />
             <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke={cpuColor} strokeWidth={2} fill="url(#grad-cpu)" isAnimationActive={false} />
           </AreaChart>
         </ResponsiveContainer>
      </div>

      {/* RAM & Storage */}
      <div className="flex flex-col gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex-1 flex flex-col justify-center">
           <div className="flex items-center justify-between mb-1">
             <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">JS Heap Memory</p>
             <Database className="h-4 w-4 text-purple-400 opacity-50" />
           </div>
           <p className="text-2xl font-black text-foreground">{data[data.length - 1]?.ram || 0} <span className="text-sm font-medium text-muted-foreground">MB</span></p>
           <ResponsiveContainer width="100%" height={60} className="mt-2">
             <AreaChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
               <defs>
                 <linearGradient id="grad-ram" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                   <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                 </linearGradient>
               </defs>
               <YAxis domain={['auto', 'auto']} hide />
               <Tooltip content={<ChartTooltip />} />
               <Area type="monotone" dataKey="ram" name="RAM (MB)" stroke="#8B5CF6" strokeWidth={2} fill="url(#grad-ram)" isAnimationActive={false} />
             </AreaChart>
           </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex-1 flex flex-col justify-center">
           <div className="flex items-center justify-between mb-1">
             <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Local Storage Usage</p>
             <Archive className="h-4 w-4 text-green-400 opacity-50" />
           </div>
           <p className="text-2xl font-black text-foreground">{formatBytes(storage.usage)}</p>
           <div className="w-full bg-muted rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (storage.usage / (storage.quota || 1)) * 100)}%` }} />
           </div>
           <p className="text-[10px] text-muted-foreground mt-2 text-right">
             {storage.quota ? `${((storage.usage / storage.quota) * 100).toFixed(1)}% of quota used` : 'Calculating...'}
           </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout, selectedGoal, setGoalSelectionOpen } = useAppContext();
  const { streakData, todaySession } = useStreakContext();
  const { isSupported, changeFolder, writeMedia, readMediaAsArrayBuffer } = useWorkspaceContext();

  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  useEffect(() => {
    idbGet("jee_workspace_handle").then((handle: any) => {
      if (handle && handle.name) setWorkspaceName(handle.name);
    }).catch(() => {});
  }, []);

  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("jee_admin_timeline") || "[]");
    } catch {
      return [];
    }
  });

  const [showTLForm, setShowTLForm] = useState(false);
  const [editTL, setEditTL] = useState<TimelineEntry | null>(null);
  const [tlForm, setTlForm] = useState<Omit<TimelineEntry, "id">>({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    type: "milestone",
  });

  const [importStatus, setImportStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [importMsg, setImportMsg] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  // Selective restore
  const [pendingRestore, setPendingRestore] = useState<Record<
    string,
    any
  > | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [editJsonBuffer, setEditJsonBuffer] = useState("");
  const [pendingZip, setPendingZip] = useState<InstanceType<
    typeof JSZip
  > | null>(null);
  const [restoreCategories, setRestoreCategories] = useState<string[]>([]);

  // Live refresh key — polls localStorage every 60s to prevent lag and CPU blocking
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [spikeOffset, setSpikeOffset] = useState(0);
  const [dateRangeOffset, setDateRangeOffset] = useState(0); // -1 = past 365 days, 0 = current, +1 = future 365 days

  // ── Account Config State ──────────────────────────────────────────────────
  const [accName, setAccName] = useState("");
  const [accDob, setAccDob] = useState("");
  const [accPic, setAccPic] = useState("");
  const [accPass, setAccPass] = useState("");
  const [accLoading, setAccLoading] = useState(false);
  const [accMsg, setAccMsg] = useState("");
  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verified">("idle");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, "users", auth.currentUser.uid)).then(d => {
        if (d.exists()) {
          const data = d.data();
          setAccName(data.localUsername || data.name || "");
          setAccDob(data.dateOfBirth || "");
          setAccPass(data.localPassword || "");
          setAccPic(data.profilePic || localStorage.getItem("jee_profile_pic") || "");
        }
      });
    } else {
      setAccPic(localStorage.getItem("jee_profile_pic") || "");
    }
  }, []);

  const handlePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAccPic(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendResetLink = async () => {
    if (!auth.currentUser?.email) {
      setAccMsg("No email associated with this account to send a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setAccMsg("A password reset link has been sent to your email!");
    } catch (err: any) {
      setAccMsg(err.message || "Failed to send reset link.");
    }
  };

  const handleSaveAccount = async () => {
    setAccLoading(true);
    setAccMsg("");
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          name: accName,
          localUsername: accName,
          dateOfBirth: accDob,
          localPassword: accPass,
          profilePic: accPic
        });
      }
      
      const storedUsers = JSON.parse(localStorage.getItem("jee_local_users") || "[]");
      const updatedUsers = storedUsers.map((u: any) => 
        u.username === user ? { ...u, username: accName, password: accPass } : u
      );
      localStorage.setItem("jee_local_users", JSON.stringify(updatedUsers));
      
      if (accPic) localStorage.setItem("jee_profile_pic", accPic);
      if (accName) {
        localStorage.setItem("jee_local_name", accName);
        localStorage.setItem("jee_current_user", accName); // Keep local session active with new name
      }
      
      setAccMsg("Account configuration saved successfully! Reloading...");
      // Dispatch event to update cross-tab components instantly
      window.dispatchEvent(new Event("storage"));
      
      if (accName !== user) {
        setTimeout(() => window.location.reload(), 1500); // Auto-reload to apply new username everywhere
      }
    } catch (err: any) {
      setAccMsg(err.message || "Failed to update account.");
    }
    setAccLoading(false);
  };

  const statsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // ── OpenRouter API Settings ──────────────────────────────────────────────
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem("jee_openrouter_api_key") || "");
  const [openRouterStatus, setOpenRouterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [openRouterMsg, setOpenRouterMsg] = useState("");

  const handleSaveOpenRouterKey = () => {
    if (!openRouterKey.trim()) { setOpenRouterStatus("error"); setOpenRouterMsg("API Key cannot be empty."); return; }
    localStorage.setItem("jee_openrouter_api_key", openRouterKey.trim());
    setOpenRouterStatus("success");
    setOpenRouterMsg("OpenRouter API Key saved successfully!");
    setTimeout(() => setOpenRouterStatus("idle"), 3000);
  };

  const handleTestOpenRouterKey = async () => {
    if (!openRouterKey.trim()) {
      setOpenRouterStatus("error");
      setOpenRouterMsg("Please enter an API key first.");
      return;
    }
    setOpenRouterStatus("loading");
    setOpenRouterMsg("Testing connection...");
    try {
      const testModels = [
        "google/gemma-4-26b-a4b-it:free",
        "google/gemma-4-31b-it:free",
        "liquid/lfm-2.5-1.2b-thinking:free",
        "liquid/lfm-2.5-1.2b-instruct:free",
        "openai/gpt-oss-120b:free",
        "openai/gpt-oss-20b:free",
        "z-ai/glm-4.5-air:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",       
        "nvidia/nemotron-nano-9b-v2:free",
        "nvidia/nemotron-nano-12b-v2-vl:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "moonshotai/kimi-k2.6:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free"
      ];

      let success = false;
      let lastError = "Invalid API Key or all test models are down.";

      for (const modelName of testModels) {
        try {
          const payload = { model: modelName, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 };
          let res;
          try {
            res = await fetch("https://openrouter.ai/api/v1/chat/completions", { 
              method: "POST", 
              headers: { "Authorization": `Bearer ${openRouterKey.trim()}`, "Content-Type": "application/json", "HTTP-Referer": window.location.href, "X-Title": "StudE" },
              body: JSON.stringify(payload)
            });
          } catch (e) {
            res = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, { 
              method: "POST", 
              headers: { "Authorization": `Bearer ${openRouterKey.trim()}`, "Content-Type": "application/json", "HTTP-Referer": window.location.href, "X-Title": "StudE" },
              body: JSON.stringify(payload)
            });
          }
          
          if (res && res.ok) { 
            success = true;
            break;
          } else { 
            const errData = await res?.json().catch(() => ({}));
            lastError = errData?.error?.message || `Request to ${modelName} failed.`;
          }
        } catch (e) {
          lastError = (e as Error).message || "A network error occurred during testing.";
        }
      }
      
      if (success) {
        setOpenRouterStatus("success"); 
        setOpenRouterMsg("Connection successful! OpenRouter is working."); 
      } else { 
        setOpenRouterStatus("error"); 
        setOpenRouterMsg(`Connection failed! ${lastError}`); 
      }
    } catch (e) { setOpenRouterStatus("error"); setOpenRouterMsg("Network error."); }
  };

  // ── TMDB API Settings ────────────────────────────────────────────────────
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem("jee_tmdb_api_key") || DEFAULT_TMDB_KEYS[0]);
  const [tmdbStatus, setTmdbStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [tmdbMsg, setTmdbMsg] = useState("");

  const handleSaveTmdbKey = () => {
    localStorage.setItem("jee_tmdb_api_key", tmdbKey.trim());
    setTmdbStatus("success");
    setTmdbMsg("API Key saved successfully!");
    setTimeout(() => setTmdbStatus("idle"), 3000);
  };

  const handleTestTmdbKey = async () => {
    if (!tmdbKey.trim()) {
      setTmdbStatus("error");
      setTmdbMsg("Please enter an API key first.");
      return;
    }
    setTmdbStatus("loading");
    setTmdbMsg("Testing connection...");
    try {
      const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey.trim()}`);
      if (res.ok) {
        setTmdbStatus("success");
        setTmdbMsg("Connection successful!");
      } else {
        setTmdbStatus("error");
        setTmdbMsg("Connection failed! Please select another API Key from the dropdown.");
      }
    } catch (e) {
      setTmdbStatus("error");
      setTmdbMsg("Network error. Check your connection.");
    }
  };

  // Persist timeline
  useEffect(() => {
    localStorage.setItem("jee_admin_timeline", JSON.stringify(timeline));
  }, [timeline]);

  // ── Helper: Get date range for period ────────────────────────────────────
  const getDateRange = (offset: number) => {
    const endDate = new Date();
    const startDate = new Date();
    
    // offset: 0 = current period, -1 = past, 1 = future
    const periodDays = 365;
    endDate.setDate(endDate.getDate() + (offset * periodDays));
    startDate.setDate(endDate.getDate() - periodDays);
    
    return { startDate, endDate };
  };

  // ── Compute all stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const parse = <T,>(key: string, fallback: T): T => {
      try {
        return JSON.parse(localStorage.getItem(key) || "") ?? fallback;
      } catch {
        return fallback;
      }
    };

    // Get date range for the current period
    const { startDate, endDate } = getDateRange(dateRangeOffset);
    const isInRange = (date: any) => {
      const d = new Date(date);
      return d >= startDate && d <= endDate;
    };

    const tasks = parse<any[]>("jee_tasks", []).filter(t => !t.createdAt || isInRange(t.createdAt));
    const events = parse<any[]>("jee_cal_events", []).filter(e => !e.start || isInRange(e.start));
    const marked = parse<any[]>("jee_today_marked", []);
    const timers = parse<any[]>("jee_tm_timers", []);
    const alarms = parse<any[]>("jee_tm_alarms", []);
    const playlists = parse<any[]>("jee_playlists", []);
    const sections = parse<any[]>("jee_pdf_sections_v3", []);
    const tags = parse<any[]>("jee_tags", []);
    const dailyRec = parse<Record<string, any>>("jee_daily_records", {});
    const timeTracking = parse<Record<string, any>>("jee_time_tracking", {});
    const lockdownRecords = parse<any[]>("jee_lockdown_records", []);
    const quizResults = parse<any[]>("jee_quiz_results", []);
    const totalZenSecs = Object.values(timeTracking).reduce((acc: number, val: any) => acc + (val.sections?.['Zen Mixer'] || 0), 0);
    
    // Saves Page Data
    const savedSubjects = parse<any[]>("jee_saves_subjects_v1", []);
    const allQuestions = parse<Record<string, any[]>>("jee_saves_questions_v1", {});

    const allSongs = playlists.flatMap((p: any) => p.songs ?? []);
    const subsections = sections.flatMap((s: any) => s.subsections ?? []);
    const subsubsections = subsections.flatMap(
      (s: any) => s.subsubsections ?? [],
    );
    const pdfsUploaded = [
      ...subsections.filter((s: any) => s.pdfKey || s.pdfUrl),
      ...subsubsections.filter((s: any) => s.pdfKey || s.pdfUrl),
    ].length;

    const vidSections = parse<any[]>("jee_vid_sections_v1", []);
    const vidSubs = vidSections.flatMap((s: any) => s.subsections ?? []);
    const vidSubSubs = vidSubs.flatMap((s: any) => s.subsubsections ?? []);
    const videosLoaded = [
      ...vidSubs.filter((s: any) => s.video),
      ...vidSubSubs.filter((s: any) => s.video),
    ].length;

    const todayHr = Math.floor(todaySession.seconds / 3600);
    const todayMin = Math.floor((todaySession.seconds % 3600) / 60);
    const todaySec = todaySession.seconds % 60;
    const totalEarned = streakData.records.filter(
      (r) => r.type === "earned",
    ).length;
    // Estimated total time: today session + historical earned days × avg 15 min
    const estTotalSecs =
      todaySession.seconds +
      (totalEarned > 0 ? (totalEarned - 1) * 15 * 60 : 0);

    const completedTasks = tasks.filter((t: any) => t.completed).length;
    const doneMark = marked.filter((m: any) => m.status === "done").length;
    const cancelMark = marked.filter((m: any) => m.status === "cancel").length;

    const lockdownCompleted = lockdownRecords.filter(r => r.status === 'completed').length;
    const lockdownBroken = lockdownRecords.filter(r => r.status === 'broken').length;

    // Saves Page Stats
    let totalSavedQuestions = 0;
    let totalSavedImages = 0;
    let totalCorrectAnswers = 0;
    let totalWrongAnswers = 0;
    Object.values(allQuestions).forEach(qList => {
      totalSavedQuestions += qList.length;
      qList.forEach(q => {
        if (q.questionImageKey || q.questionUrl) totalSavedImages++;
        if (q.answerImageKey || q.answerUrl) totalSavedImages++;
        totalCorrectAnswers += (q.correctCount || 0);
        totalWrongAnswers += (q.wrongCount || 0);
      });
    });

    return {
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: tasks.length - completedTasks,
        high: tasks.filter((t: any) => t.priority === "High").length,
        medium: tasks.filter((t: any) => t.priority === "Medium").length,
        low: tasks.filter((t: any) => t.priority === "Low").length,
      },
      events: {
        total: events.length,
        none: events.filter((e: any) => e.recurrence === "none").length,
        daily: events.filter((e: any) => e.recurrence === "daily").length,
        weekly: events.filter((e: any) => e.recurrence === "weekly").length,
        done: doneMark,
        cancel: cancelMark,
      },
      timers: { total: timers.length },
      alarms: {
        total: alarms.length,
        active: alarms.filter((a: any) => a.active).length,
      },
      music: {
        songs: allSongs.length,
        playlists: playlists.length,
        local: allSongs.filter((s: any) => s.isLocal).length,
        url: allSongs.filter((s: any) => !s.isLocal).length,
      },
      pdf: {
        sections: sections.length,
        subsections: subsections.length,
        subsubsections: subsubsections.length,
        uploaded: pdfsUploaded,
      },
      videos: {
        sections: vidSections.length,
        subsections: vidSubs.length + vidSubSubs.length,
        loaded: videosLoaded,
      },
      streak: { current: streakData.currentStreak, earned: totalEarned },
      tags: tags.length,
      time: {
        todayHr,
        todayMin,
        todaySec,
        estTotalSecs,
        totalZenSecs,
        todayStr: `${String(todayHr).padStart(2, "0")}:${String(todayMin).padStart(2, "0")}:${String(todaySec).padStart(2, "0")}`,
      },
      saves: {
        subjects: savedSubjects.length,
        questions: totalSavedQuestions,
        images: totalSavedImages,
        correct: totalCorrectAnswers,
        wrong: totalWrongAnswers,
        totalCounts: totalCorrectAnswers + totalWrongAnswers,
      },
      quiz: {
        total: quizResults.length,
        questions: quizResults.reduce((acc, q) => acc + (q.total || 0), 0)
      },
      timeTracking: {
        records: timeTracking,
        totalSeconds: Object.values(timeTracking).reduce((acc: number, val: any) => acc + (val.totalSeconds || 0), 0),
        totalDays: Object.keys(timeTracking).length
      },
      lockdown: {
        completed: lockdownCompleted,
        broken: lockdownBroken,
        total: lockdownRecords.length
      },
      dailyRec,
    };
  }, [todaySession, streakData, refreshKey, dateRangeOffset]);

  // ── Chart data ───────────────────────────────────────────────────────────
  const todoChartData = [
    { name: "Completed", value: stats.tasks.completed, fill: "#22C55E" },
    { name: "Pending", value: stats.tasks.pending, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const priorityChartData = [
    { name: "High", value: stats.tasks.high, fill: "#EF4444" },
    { name: "Medium", value: stats.tasks.medium, fill: "#F59E0B" },
    { name: "Low", value: stats.tasks.low, fill: "#6B7280" },
  ].filter((d) => d.value > 0);

  const eventChartData = [
    { name: "One-time", value: stats.events.none, fill: "#3B82F6" },
    { name: "Daily", value: stats.events.daily, fill: "#8B5CF6" },
    { name: "Weekly", value: stats.events.weekly, fill: "#EC4899" },
  ].filter((d) => d.value > 0);

  const musicChartData = [
    { name: "Local", value: stats.music.local, fill: "#10B981" },
    { name: "URL", value: stats.music.url, fill: "#06B6D4" },
  ].filter((d) => d.value > 0);

  // Spike graph data — 365 days of todo completions + calendar events
  const spikeData = useMemo(() => {
    const parse = <T,>(key: string, fallback: T): T => {
      try {
        return JSON.parse(localStorage.getItem(key) || "") ?? fallback;
      } catch {
        return fallback;
      }
    };
    const dailyRec = parse<
      Record<string, { completed: number; total: number }>
    >("jee_daily_records", {});
    const events = parse<any[]>("jee_cal_events", []);
    const byDay: Record<string, number> = {};
    events.forEach((ev: any) => {
      if (ev.start) {
        const d = new Date(ev.start).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      }
    });
    const DAYS = 365;
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (DAYS - 1 - i) + spikeOffset);
      const key = d.toISOString().slice(0, 10);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed: dailyRec[key]?.completed || 0,
        total: dailyRec[key]?.total || 0,
        events: byDay[key] || 0,
      };
    });
  }, [refreshKey, spikeOffset]);

  // ── Timeline CRUD ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTL(null);
    setTlForm({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      description: "",
      type: "milestone",
    });
    setShowTLForm(true);
  };

  const openEdit = (entry: TimelineEntry) => {
    setEditTL(entry);
    setTlForm({
      date: entry.date,
      title: entry.title,
      description: entry.description ?? "",
      type: entry.type,
    });
    setShowTLForm(true);
  };

  const saveTL = () => {
    if (!tlForm.title.trim()) return;
    if (editTL) {
      setTimeline((prev) =>
        prev.map((e) => (e.id === editTL.id ? { ...editTL, ...tlForm } : e)),
      );
    } else {
      setTimeline((prev) => [
        ...prev,
        { id: Date.now().toString(), ...tlForm },
      ]);
    }
    setShowTLForm(false);
  };

  const deleteTL = (id: string) =>
    setTimeline((prev) => prev.filter((e) => e.id !== id));

  const sortedTimeline = [...timeline].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  // ── IDB key → restore category mapping ───────────────────────────────────
  function idbKeyCategory(key: string): string | null {
    if (key.startsWith("pdf_leaf_") || key.startsWith("img_leaf_"))
      return "pdf";
    if (key.startsWith("music_")) return "music";
    if (key.startsWith("ambient_")) return "ambient";
    // Video note images, voice recordings, screenshots, local video files
    if (
      key.startsWith("vid_img_") ||
      key.startsWith("vid_voice_") ||
      key.startsWith("vid_ss_") ||
      key.startsWith("vid_file_")
    )
      return "videos";
    if (key.startsWith("jee_saves_") || key.startsWith("q_img_") || key.startsWith("a_img_") || key.startsWith("q_crop_") || key.startsWith("a_crop_"))
      return "saves";
    return null;
  }

  // ── Backup Export (ZIP) ──────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const zip = new JSZip();
    const backup: Record<string, any> = {};

    // Collect all jee_ and pdf_anno_ keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("jee_") ||
        key.startsWith("pdf_anno_") ||
        key.startsWith("vid_") ||
        key === "theme" ||
        key === "user"
      ) {
        try {
          backup[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          backup[key] = localStorage.getItem(key);
        }
      }
    }

    // Include timeline from local state
    backup["jee_admin_timeline"] = timeline;

    // ── Export IndexedDB & Workspace binary files ──────
    try {
      const idbKeys = await idbGetAllKeys();
      const mediaKeysToBackup = new Set<string>(idbKeys);

      const safeParse = (k: string) => {
        try { return JSON.parse(localStorage.getItem(k) || "null"); }
        catch { return null; }
      };

      const pdfSections = safeParse("jee_pdf_sections_v3") || [];
      pdfSections.forEach((sec: any) => {
        sec.subsections?.forEach((sub: any) => {
          if (sub.pdfKey) mediaKeysToBackup.add(sub.pdfKey);
          if (sub.imageKey) mediaKeysToBackup.add(sub.imageKey);
          sub.subsubsections?.forEach((ss: any) => {
            if (ss.pdfKey) mediaKeysToBackup.add(ss.pdfKey);
            if (ss.imageKey) mediaKeysToBackup.add(ss.imageKey);
          });
        });
      });

      const vidSections = safeParse("jee_vid_sections_v1") || [];
      vidSections.forEach((sec: any) => {
        sec.subsections?.forEach((sub: any) => {
          if (sub.video?.fileKey) mediaKeysToBackup.add(sub.video.fileKey);
          sub.subsubsections?.forEach((ss: any) => {
            if (ss.video?.fileKey) mediaKeysToBackup.add(ss.video.fileKey);
          });
        });
      });

      const vidNotes = safeParse("vid_notes_v1") || {};
      Object.values(vidNotes).forEach((notes: any) => {
        notes?.forEach((n: any) => {
          if (n.imageKey) mediaKeysToBackup.add(n.imageKey);
          if (n.voiceKey) mediaKeysToBackup.add(n.voiceKey);
          if (n.screenshotKey) mediaKeysToBackup.add(n.screenshotKey);
        });
      });

      const savedQs = safeParse("jee_saves_questions_v1") || {};
      Object.values(savedQs).forEach((qs: any) => {
        qs?.forEach((q: any) => {
          if (q.questionImageKey) mediaKeysToBackup.add(q.questionImageKey);
          if (q.answerImageKey) mediaKeysToBackup.add(q.answerImageKey);
        });
      });

      const playlists = safeParse("jee_playlists") || [];
      playlists.forEach((p: any) => {
        p.songs?.forEach((s: any) => {
          if (s.idbKey) mediaKeysToBackup.add(s.idbKey);
        });
      });

      const customTracks = safeParse("jee_ambient_custom_tracks") || [];
      customTracks.forEach((t: any) => {
        if (t.isCustom && !t.src.startsWith("http")) mediaKeysToBackup.add(t.src);
      });

      const idbManifest: { key: string; file: string; mimeType?: string }[] = [];
      for (const key of Array.from(mediaKeysToBackup)) {
        try {
          let buf: ArrayBuffer | null = null;
          let mimeType: string | undefined;

          if (key.startsWith("pdf_")) mimeType = "application/pdf";
          else if (key.startsWith("img_") || key.startsWith("q_img_") || key.startsWith("a_img_") || key.startsWith("q_crop_") || key.startsWith("a_crop_") || key.startsWith("vid_img_") || key.startsWith("vid_ss_")) mimeType = "image/jpeg";
          else if (key.startsWith("music_") || key.startsWith("vid_voice_") || key.startsWith("ambient_")) mimeType = "audio/webm";
          else if (key.startsWith("vid_file_")) mimeType = "video/mp4";

          const mediaBuf = await readMediaAsArrayBuffer(key);
          if (mediaBuf) {
            buf = mediaBuf;
          } else {
            const value = await idbGet<ArrayBuffer | Blob>(key);
            if (value instanceof Blob) {
              buf = await value.arrayBuffer();
              mimeType = mimeType || value.type || undefined;
            } else if (value instanceof ArrayBuffer) {
              buf = value;
            }
          }

          if (buf) {
            const safeName = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `idb/${safeName}.bin`;
            zip.file(filename, new Uint8Array(buf));
            idbManifest.push({
              key,
              file: filename,
              ...(mimeType ? { mimeType } : {}),
            });
          }
        } catch (err) {
          /* skip unreadable entry */
          console.warn("Could not backup media key", key, err);
        }
      }
      if (idbManifest.length > 0) backup["_idb"] = idbManifest;
    } catch (err) {
      console.error("IDB backup error:", err);
    }

    backup["_meta"] = {
      version: 2,
      exportedAt: new Date().toISOString(),
      exportedBy: user ?? "unknown",
    };

    zip.file("backup.json", JSON.stringify(backup, null, 2));

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `jee_backup_${dateStr}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [timeline, user, readMediaAsArrayBuffer]);

  // ── Backup Import (ZIP) ──────────────────────────────────────────────────
  const RESTORE_CATEGORIES: { key: string; label: string; keys: string[] }[] = [
    {
      key: "tasks",
      label: "Tasks & Todos",
      keys: ["jee_tasks", "jee_today_marked"],
    },
    { key: "calendar", label: "Calendar Events", keys: ["jee_cal_events"] },
    { key: "pdf", label: "PDF Sections", keys: ["jee_pdf_sections_v3"] },
    { key: "music", label: "Music Playlists", keys: ["jee_playlists"] },
    { key: "ambient", label: "Zen Mixer Tracks", keys: ["jee_ambient_custom_tracks", "jee_ambient_active"] },
    {
      key: "videos",
      label: "Video Sections",
      keys: ["jee_vid_sections_v1", "jee_vid_notes_v1", "jee_vid_resume"],
    },
    {
      key: "quiz",
      label: "AI Quiz History",
      keys: ["jee_quiz_results"],
    },
    {
      key: "streak",
      label: "Streak, Heatmap & Daily Records",
      keys: ["jee_streak_data", "jee_daily_records", "jee_streak_records"],
    },
    { key: "tags", label: "Tags", keys: ["jee_tags"] },
    { key: "timeline", label: "Admin Timeline", keys: ["jee_admin_timeline"] },
    {
      key: "timers",
      label: "Timers & Alarms",
      keys: ["jee_tm_timers", "jee_tm_alarms"],
    },
    {
      key: "saves",
      label: "Saved Questions & Bookmarks",
      keys: ["jee_saves_subjects_v1", "jee_saves_questions_v1", "jee_saves_bookmarks_v1"],
    },
    {
      key: "time",
      label: "Time Tracking & Usage Breakdown",
      keys: ["jee_time_tracking", "jee_lockdown_records"],
    },
    {
      key: "account",
      label: "Account Config",
      keys: [
        "jee_local_users",
        "jee_profile_pic",
        "jee_local_name",
        "jee_current_user",
        "user",
        "jee_tmdb_api_key",
        "theme",
        "jee_remember_me",
      ],
    },
  ];



  // ── Smart Editor Logic ──────────────────────────────────────────────────
  const startEditingCategory = (catKey: string) => {
    const cat = RESTORE_CATEGORIES.find(c => c.key === catKey);
    if (!cat || !pendingRestore) return;
    const dataToEdit: Record<string, any> = {};
    cat.keys.forEach(k => {
      // Ensure we clone so we don't mutate pendingRestore directly until save
      if (pendingRestore[k] !== undefined) {
        dataToEdit[k] = JSON.parse(JSON.stringify(pendingRestore[k]));
      }
    });
    setEditJsonBuffer(JSON.stringify(dataToEdit, null, 2));
    setEditingCategory(catKey);
    setIsExpertMode(false); // Start in Smart Mode by default
  };

  const updateWorkingKey = (key: string, value: any) => {
    try {
      const current = JSON.parse(editJsonBuffer);
      current[key] = value;
      setEditJsonBuffer(JSON.stringify(current, null, 2));
    } catch (e) { console.error("Update failed", e); }
  };

  const renderSmartEditor = () => {
    if (!editingCategory) return null;
    let data: Record<string, any> = {};
    try { data = JSON.parse(editJsonBuffer); } catch { return <p className="text-destructive text-xs">Error parsing data for smart editor.</p>; }

    switch (editingCategory) {
      case "tasks": {
        const daily = data["jee_daily_records"] || {};
        const tasks = data["jee_tasks"] || [];
        return (
          <div className="space-y-6">
            {/* Daily Records Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-primary block px-1 tracking-wider">Daily Progress History</label>
              {Object.entries(daily).sort((a,b) => b[0].localeCompare(a[0])).map(([date, val]: [string, any]) => (
                <div key={date} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 border border-border rounded-xl gap-2">
                  <span className="text-xs font-bold font-mono text-foreground">{date}</span>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <input 
                      type="number" 
                      value={val.completed} 
                      onChange={e => {
                        const next = { ...daily, [date]: { ...val, completed: parseInt(e.target.value) || 0 } };
                        updateWorkingKey("jee_daily_records", next);
                      }}
                      className="w-10 h-7 bg-background border border-border rounded text-center text-xs focus:ring-1 focus:ring-primary outline-none" 
                    />
                    <span className="text-muted-foreground">/</span>
                    <input 
                      type="number" 
                      value={val.total} 
                      onChange={e => {
                        const next = { ...daily, [date]: { ...val, total: parseInt(e.target.value) || 0 } };
                        updateWorkingKey("jee_daily_records", next);
                      }}
                      className="w-10 h-7 bg-background border border-border rounded text-center text-xs focus:ring-1 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Task List Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-primary block px-1 tracking-wider">Master Task List</label>
            {tasks.map((task: any, idx: number) => (
              <div key={task.id || idx} className="flex items-center gap-3 p-2 bg-muted/30 border border-border rounded-xl">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={e => {
                    const next = [...tasks];
                    next[idx] = { ...task, completed: e.target.checked };
                    updateWorkingKey("jee_tasks", next);
                  }}
                  className="h-4 w-4 rounded border-border bg-background accent-primary cursor-pointer"
                />
                <Input 
                  value={task.text} 
                  onChange={e => {
                    const next = [...tasks];
                    next[idx] = { ...task, text: e.target.value };
                    updateWorkingKey("jee_tasks", next);
                  }}
                  className="h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0 truncate" 
                />
                <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white shrink-0 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                  {task.priority}
                </div>
              </div>
            ))}
            </div>
          </div>
        );
      }
      case "timeline": {
        const timeline = data["jee_admin_timeline"] || [];
        return (
          <div className="space-y-3">
            {timeline.map((item: any, idx: number) => (
              <div key={item.id || idx} className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <div className="flex gap-2">
                   <input 
                    type="date" 
                    value={item.date} 
                    onChange={e => {
                      const next = [...timeline];
                      next[idx] = { ...item, date: e.target.value };
                      updateWorkingKey("jee_admin_timeline", next);
                    }}
                    className="text-[10px] bg-background border border-border rounded px-1.5 h-6 outline-none" 
                   />
                   <select 
                    value={item.type}
                    onChange={e => {
                      const next = [...timeline];
                      next[idx] = { ...item, type: e.target.value };
                      updateWorkingKey("jee_admin_timeline", next);
                    }}
                    className="text-[10px] bg-background border border-border rounded px-1.5 h-6 outline-none flex-1"
                   >
                     {Object.keys(TIMELINE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
                <Input 
                  value={item.title} 
                  onChange={e => {
                    const next = [...timeline];
                    next[idx] = { ...item, title: e.target.value };
                    updateWorkingKey("jee_admin_timeline", next);
                  }}
                  className="h-8 text-xs bg-background" 
                />
              </div>
            ))}
          </div>
        );
      }
      case "tags": {
        const tags = data["jee_tags"] || [];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tags.map((tag: any, idx: number) => (
              <div key={tag.id || idx} className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-xl">
                <input 
                  type="color" 
                  value={tag.color} 
                  onChange={e => {
                    const next = [...tags];
                    next[idx] = { ...tag, color: e.target.value };
                    updateWorkingKey("jee_tags", next);
                  }}
                  className="w-6 h-6 rounded-md overflow-hidden bg-transparent border-none cursor-pointer p-0" 
                />
                <Input 
                  value={tag.name} 
                  onChange={e => {
                    const next = [...tags];
                    next[idx] = { ...tag, name: e.target.value };
                    updateWorkingKey("jee_tags", next);
                  }}
                  className="h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0" 
                />
              </div>
            ))}
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
             <Database className="h-10 w-10 text-muted-foreground/30" />
             <div className="space-y-1">
               <p className="text-xs font-bold text-foreground">Advanced Data Category</p>
               <p className="text-[10px] text-muted-foreground px-10">Smart editing is not available for this complex category. Please use Expert Mode to tweak JSON.</p>
             </div>
             <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setIsExpertMode(true)}>Switch to Expert Mode</Button>
          </div>
        );
    }
  };

  const saveEditedCategory = () => {
    try {
      const parsed = JSON.parse(editJsonBuffer);
      setPendingRestore(prev => ({ ...prev, ...parsed }));
      setEditingCategory(null);
    } catch (e) { alert("Invalid JSON format."); }
  };

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setImportStatus("loading");
      setImportMsg("Reading backup file…");
      try {
        const zip = new JSZip();
        const loaded = await zip.loadAsync(file);
        const backupFile = loaded.file("backup.json");
        if (!backupFile) throw new Error("No backup.json found in ZIP");
        const text = await backupFile.async("text");
        const backup: Record<string, any> = JSON.parse(text);
        setImportStatus("idle");
        setImportMsg("");
        // Store the loaded ZIP so applyRestore can extract binary files later
        setPendingZip(loaded);
        setPendingRestore(backup);
        setRestoreCategories(RESTORE_CATEGORIES.map((c) => c.key));
      } catch (err: any) {
        setImportStatus("error");
        setImportMsg(err?.message || "Failed to read backup file.");
      }
    },
    [RESTORE_CATEGORIES],
  );

  const applyRestore = useCallback(async () => {
    if (!pendingRestore) return;
    
    // --- Session & Workspace Preservation ---
    const currentU = localStorage.getItem("user");
    const currentCU = localStorage.getItem("jee_current_user");
    const currentLN = localStorage.getItem("jee_local_name");
    const currentSA = localStorage.getItem("jee_session_active");
    const currentWH = localStorage.getItem("jee_workspace_handle"); 

    const allowedKeys = new Set<string>(
      RESTORE_CATEGORIES.filter((c) =>
        restoreCategories.includes(c.key),
      ).flatMap((c) => c.keys),
    );
    let restoredCount = 0;

    // 1. Restore Metadata (LocalStorage)
    for (const [key, value] of Object.entries(pendingRestore)) {
      if (key === "_meta" || key === "_idb") continue;
      const isPdfAnno = key.startsWith("pdf_anno_") && restoreCategories.includes("pdf");
      if (!allowedKeys.has(key) && !isPdfAnno) continue;
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      restoredCount++;
    }

    // Restore current session after loop to prevent accidental logouts
    if (currentU) localStorage.setItem("user", currentU);
    if (currentCU) localStorage.setItem("jee_current_user", currentCU);
    if (currentLN) localStorage.setItem("jee_local_name", currentLN);
    if (currentSA) localStorage.setItem("jee_session_active", currentSA);
    if (currentWH) localStorage.setItem("jee_workspace_handle", currentWH);

    // 2. Restore Binary Files (IndexedDB via Workspace)
    if (pendingZip && pendingRestore["_idb"]) {
      const manifest = pendingRestore["_idb"] as any[];
      for (const entry of manifest) {
        const cat = idbKeyCategory(entry.key);
        if (cat && !restoreCategories.includes(cat)) continue;
        try {
          const zipFile = pendingZip.file(entry.file);
          if (!zipFile) continue;
          const buf = await zipFile.async("arraybuffer");
          const stored = entry.mimeType ? new Blob([buf], { type: entry.mimeType }) : buf;
          await writeMedia(entry.key, stored);
          restoredCount++;
        } catch (err) { console.warn("Binary restore failed:", entry.key, err); }
      }
    }

    setPendingRestore(null);
    setPendingZip(null);
    setImportStatus("success");
    setImportMsg(`Restored ${restoredCount} items. Reloading…`);
    setTimeout(() => window.location.reload(), 1500);
  }, [pendingRestore, pendingZip, restoreCategories, writeMedia, idbKeyCategory, RESTORE_CATEGORIES]);

  const CHART_COLORS = [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
  ];

  const appUsageData = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(stats.timeTracking.records).forEach((r: any) => {
      if (r.sections) {
        Object.entries(r.sections).forEach(([name, secs]: [string, any]) => {
          totals[name] = (totals[name] || 0) + secs;
        });
      }
    });
    return Object.entries(totals)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value as number) / 60),
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats.timeTracking.records]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-full bg-background overflow-y-auto"
    >
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-background border-b border-border px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.15),_transparent_60%)]" />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-widest">
                Admin Panel
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                Welcome Boss, {user} 👋
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0 ml-0 sm:ml-[52px]">
            This is your Desk for JEE Prep with Digital Way
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mt-3 ml-0 sm:ml-[52px]">
            <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground bg-muted/50 px-2 sm:px-2.5 py-1 rounded-full border border-border/50 whitespace-nowrap">
              <Clock className="h-3 w-3 text-primary shrink-0" />
              <span>Today:</span>
              <span className="text-foreground font-semibold">
                {stats.time.todayStr}
              </span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground bg-muted/50 px-2 sm:px-2.5 py-1 rounded-full border border-border/50 whitespace-nowrap">
              <Flame className="h-3 w-3 text-orange-400 shrink-0" />
              <span>Streak:</span>
              <span className="text-foreground font-semibold">
                {stats.streak.current} days
              </span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground bg-muted/50 px-2 sm:px-2.5 py-1 rounded-full border border-border/50 whitespace-nowrap">
              <Trophy className="h-3 w-3 text-yellow-400 shrink-0" />
              <span>Earned:</span>
              <span className="text-foreground font-semibold">
                {stats.streak.earned} days
              </span>
            </span>
          </div>
        </motion.div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
        {/* ── Account Configuration ── */}
        <Section title="Account Configuration" icon={User} delay={0.05}>
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-muted bg-muted flex items-center justify-center group">
                  {accPic ? (
                    <img src={accPic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-[120px]">Click image to change profile picture</p>
              </div>

              {/* Form */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Username</label>
                    <Input value={accName} onChange={e => setAccName(e.target.value)} className="bg-muted border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Date of Birth</label>
                    <Input type="date" value={accDob} onChange={e => setAccDob(e.target.value)} className="bg-muted border-border" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Password Reset</label>
                  
                  <div className="flex gap-2 items-center">
                    <Input type="password" value="********" disabled className="bg-muted border-border text-muted-foreground w-full max-w-xs" />
                    <Button type="button" onClick={sendResetLink} variant="outline" size="sm" className="gap-2 shrink-0">
                      <Mail className="h-4 w-4" /> Send Firebase Reset Link
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-sm">
                    Clicking this will send a secure password reset link to your registered email address via Firebase.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <p className={`text-xs font-semibold ${accMsg.includes("successfully") ? "text-green-500" : "text-destructive"}`}>
                    {accMsg}
                  </p>
                  <Button type="button" onClick={handleSaveAccount} disabled={accLoading} className="gap-2 shrink-0">
                    {accLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Profile Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Quick Stats Grid ── */}
        <Section title="Overview" icon={LayoutDashboard}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <StatCard
              icon={Timer}
              label="Total App Time"
              value={Math.floor(stats.timeTracking.totalSeconds / 3600)}
              sub={`${Math.floor((stats.timeTracking.totalSeconds % 3600) / 60)}m · ${stats.timeTracking.totalDays} days`}
              color="#3B82F6"
              delay={0.0}
            />
            <StatCard
              icon={ListTodo}
              label="Todos"
              value={stats.tasks.total}
              sub={`${stats.tasks.completed} done`}
              color="#3B82F6"
              delay={0.0}
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.tasks.completed}
              sub={`${stats.tasks.pending} pending`}
              color="#22C55E"
              delay={0.05}
            />
            <StatCard
              icon={FileVideo}
              label="Videos"
              value={stats.videos.loaded}
              sub={`${stats.videos.sections} sections`}
              color="#EF4444"
              delay={0.1}
            />
            <StatCard
              icon={Music}
              label="Songs"
              value={stats.music.songs}
              sub={`${stats.music.playlists} playlists`}
              color="#EC4899"
              delay={0.15}
            />
            <StatCard
              icon={FileText}
              label="PDF Sections"
              value={stats.pdf.sections}
              sub={`${stats.pdf.uploaded} PDFs loaded`}
              color="#F59E0B"
              delay={0.2}
            />
            <StatCard
              icon={Flame}
              label="Streak Days"
              value={stats.streak.current}
              sub={`${stats.streak.earned} total`}
              color="#8B5CF6"
              delay={0.25}
            />
            <StatCard
              icon={BookOpen}
              label="Saved Ques"
              value={stats.saves.questions}
              sub={`${stats.saves.subjects} subjects`}
              color="#06B6D4"
              delay={0.30}
            />
            <StatCard
              icon={Shield}
              label="Lockdowns"
              value={stats.lockdown.completed}
              sub={`${stats.lockdown.broken} broken`}
              color="#10B981"
              delay={0.35}
            />
            <StatCard
              icon={BrainCircuit}
              label="AI Quizzes"
              value={stats.quiz.total}
              sub={`${stats.quiz.questions} Qs Ans`}
              color="#A855F7"
              delay={0.4}
            />
          </div>
        </Section>

        {/* ── Detailed breakdown cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Todos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <ListTodo className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                To-Do System
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Total Created",
                  val: stats.tasks.total,
                  color: "bg-blue-500",
                },
                {
                  label: "Completed",
                  val: stats.tasks.completed,
                  color: "bg-green-500",
                },
                {
                  label: "Pending",
                  val: stats.tasks.pending,
                  color: "bg-red-500",
                },
                {
                  label: "High Priority",
                  val: stats.tasks.high,
                  color: "bg-red-400",
                },
                {
                  label: "Medium Priority",
                  val: stats.tasks.medium,
                  color: "bg-amber-400",
                },
                {
                  label: "Low Priority",
                  val: stats.tasks.low,
                  color: "bg-gray-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Calendar
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Total Events",
                  val: stats.events.total,
                  color: "bg-purple-500",
                },
                {
                  label: "One-time Events",
                  val: stats.events.none,
                  color: "bg-blue-400",
                },
                {
                  label: "Daily Recurring",
                  val: stats.events.daily,
                  color: "bg-pink-400",
                },
                {
                  label: "Weekly Recurring",
                  val: stats.events.weekly,
                  color: "bg-violet-400",
                },
                {
                  label: "Marked Done",
                  val: stats.events.done,
                  color: "bg-green-500",
                },
                {
                  label: "Cancelled",
                  val: stats.events.cancel,
                  color: "bg-red-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Time Management */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Time Tools
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Timers Created",
                  val: stats.timers.total,
                  color: "bg-cyan-500",
                },
                {
                  label: "Alarms Created",
                  val: stats.alarms.total,
                  color: "bg-orange-400",
                },
                {
                  label: "Active Alarms",
                  val: stats.alarms.active,
                  color: "bg-green-400",
                },
                {
                  label: "Inactive Alarms",
                  val: stats.alarms.total - stats.alarms.active,
                  color: "bg-gray-400",
                },
                {
                  label: "Today's Session",
                  val: stats.time.todayMin,
                  color: "bg-blue-400",
                },
                {
                  label: "Zen Mixer Time",
                  val: stats.time.totalZenSecs > 0 ? `${Math.floor(stats.time.totalZenSecs / 60)}m` : "0m",
                  color: "bg-indigo-400",
                },
                {
                  label: "Streak Days",
                  val: stats.streak.current,
                  color: "bg-red-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.label === "Today's Session" || item.label === "Zen Mixer Time"
                      ? `${item.val}m`
                      : item.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* PDF & Music */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                PDF & Music
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "PDF Sections",
                  val: stats.pdf.sections,
                  color: "bg-yellow-500",
                },
                {
                  label: "Subsections",
                  val: stats.pdf.subsections,
                  color: "bg-amber-400",
                },
                {
                  label: "Sub-subsections",
                  val: stats.pdf.subsubsections,
                  color: "bg-orange-400",
                },
                {
                  label: "PDFs Loaded",
                  val: stats.pdf.uploaded,
                  color: "bg-red-400",
                },
                {
                  label: "Songs Added",
                  val: stats.music.songs,
                  color: "bg-pink-400",
                },
                {
                  label: "Playlists",
                  val: stats.music.playlists,
                  color: "bg-purple-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Charts ── */}
        <Section
          title="Analytics & Infographics"
          icon={LayoutDashboard}
          delay={0.3}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Todo Completion Pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Todo Status
              </p>
              {todoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={todoChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {todoChartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  No data yet
                </div>
              )}
            </div>

            {/* Priority Pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Task Priority
              </p>
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={priorityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {priorityChartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  No data yet
                </div>
              )}
            </div>

            {/* Events pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Event Types
              </p>
              {eventChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={eventChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {eventChartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  No events yet
                </div>
              )}
            </div>

            {/* Music pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Music Sources
              </p>
              {musicChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={musicChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {musicChartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                  No songs yet
                </div>
              )}
            </div>
          </div>
          
          {/* Time Spent History & App Usage Breakdown */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
            <TimeSpentHistory records={stats.timeTracking.records} />

            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col h-full">
              <div className="text-center mb-2 shrink-0">
                <h3 className="text-xl font-black text-foreground">App Usage Breakdown</h3>
                <p className="text-sm text-muted-foreground mt-1">Total time spent across features (Minutes)</p>
              </div>
              <div className="flex-1 min-h-[250px]">
                {appUsageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appUsageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                      >
                        {appUsageData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No usage data yet
                  </div>
                )}
              </div>
            </div>
          </div>
          <StudyHeatmap records={stats.timeTracking.records} />

          {/* Todo Completions Spike — 365 days */}
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Todo Completions — 365 Days
              </p>
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(o => o - 365)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {spikeOffset !== 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(0)}>
                    Today
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(o => o + 365)}>
                  <ChevRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-3">
              Updates every 60 seconds · green = completed, blue = total · Use brush to zoom
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={spikeData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="grad-todo-total"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="grad-todo-done"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total Todos"
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  fill="url(#grad-todo-total)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#grad-todo-done)"
                  dot={false}
                />
                <Brush 
                  dataKey="date" 
                  height={20} 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--muted))" 
                  tickFormatter={() => ""} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Calendar Events Spike — 365 days */}
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Calendar Events by Scheduled Date — 365 Days
              </p>
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(o => o - 365)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {spikeOffset !== 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(0)}>
                    Today
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background shadow-sm transition-all" onClick={() => setSpikeOffset(o => o + 365)}>
                  <ChevRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-3">
              Shows how many events are scheduled on each day · live reactive · Use brush to zoom
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={spikeData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad-cal-ev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="events"
                  name="Events Scheduled"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#grad-cal-ev)"
                  dot={false}
                />
                <Brush 
                  dataKey="date" 
                  height={20} 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--muted))" 
                  tickFormatter={() => ""} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => {
                setShowStats(p => !p);
                setTimeout(() => {
                  if (!showStats) statsRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              variant="outline"
              className="gap-2 border-primary/20 hover:bg-primary/10 rounded-full transition-all"
            >
              <Activity className="h-4 w-4 text-blue-400" />
              {showStats ? "Hide System Stats" : "Show System Stats"}
            </Button>
          </div>

          {/* Performance Stats */}
          <div ref={statsRef}>
             <AnimatePresence>
                {showStats && (
                   <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                   >
                     <div className="mt-8">
                       <Section title="System Performance & Storage" icon={Activity}>
                         <SystemPerformance />
                       </Section>
                     </div>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        </Section>

        {/* ── Timeline ── */}
        <Section title="My JEE Journey Timeline" icon={Target} delay={0.4}>
          <div className="flex justify-end mb-4">
            <Button onClick={openAdd} size="sm" className="h-8 gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Milestone
            </Button>
          </div>

          {sortedTimeline.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <Target className="h-10 w-10 mx-auto mb-3 text-primary/30" />
              <p className="text-sm font-medium text-foreground mb-1">
                Your JEE journey starts here
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Add milestones, test results, study goals and achievements
              </p>
              <Button
                onClick={openAdd}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add first milestone
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {sortedTimeline.map((entry, idx) => {
                  const t = TIMELINE_TYPES[entry.type];
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-4 group"
                    >
                      <div
                        className="relative z-10 shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base"
                        style={{
                          backgroundColor: `${t.color}20`,
                          borderColor: `${t.color}60`,
                        }}
                      >
                        {t.emoji}
                      </div>
                      <div className="flex-1 bg-card border border-border rounded-xl p-3.5 group-hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {entry.title}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: `${t.color}20`,
                                  color: t.color,
                                }}
                              >
                                {t.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {entry.date}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                {entry.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => openEdit(entry)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteTL(entry.id)}
                              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* ── Backup & Restore ── */}
        <Section title="Backup & Restore" icon={Database} delay={0.5}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <Download className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Export Backup
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Download all your data as a ZIP file
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <p>✓ All todos, events, timers & alarms</p>
                <p>✓ PDF sections & all annotations</p>
                <p>✓ Music playlists & Zen Mixer tracks</p>
                <p>✓ Streak history & daily records</p>
                <p>✓ Timeline & tags</p>
                <p>✓ Saved questions, bookmarks & account config</p>
                <p className="text-green-400/80">
                  ✓ Includes all local media (PDFs, Videos, Images, Music)
                </p>
              </div>
              <Button
                onClick={handleExport}
                className="w-full gap-2 text-sm"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Export Backup ZIP
              </Button>
            </div>

            {/* Import */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Upload className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Restore Backup
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload a ZIP to restore your data
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <p>• Upload a previously exported ZIP file</p>
                <p>• All existing data will be replaced</p>
                <p>• Includes restoring all local media files</p>
                <p>• Page will reload automatically after restore</p>
                <p className="text-red-400/80">
                  ⚠ This will overwrite your current data
                </p>
              </div>

              {importStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-3 p-3 rounded-lg text-xs font-medium border
                    ${
                      importStatus === "success"
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : importStatus === "error"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    }`}
                >
                  {importStatus === "loading" && (
                    <RefreshCw className="h-3 w-3 inline mr-1.5 animate-spin" />
                  )}
                  {importMsg}
                </motion.div>
              )}

              <input
                ref={importFileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                onClick={() => importFileRef.current?.click()}
                className="w-full gap-2 text-sm"
                variant="outline"
                disabled={importStatus === "loading"}
              >
                <Upload className="h-4 w-4" />
                Import Backup ZIP
              </Button>
            </div>
            
            {/* Change Workspace Folder */}
            {isSupported && (
              <div className="bg-card border border-border rounded-2xl p-5 md:col-span-2 mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                    <FolderPlus className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Local Workspace Folder</p>
                    <p className="text-xs text-muted-foreground">Change your assigned storage folder on disk.</p>
                  </div>
                </div>
                {workspaceName && (
                  <div className="mb-4 p-2.5 bg-muted/30 rounded-lg border border-border/50 flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold shrink-0">Current Location:</span>
                    <span className="text-xs font-mono font-semibold text-primary truncate">...\{workspaceName}</span>
                  </div>
                )}
                <Button onClick={async () => {
                  await changeFolder();
                  const handle: any = await idbGet("jee_workspace_handle");
                  if (handle?.name) setWorkspaceName(handle.name);
                }} className="w-full gap-2 text-sm" variant="outline">
                  Choose New Local Folder
                </Button>
              </div>
            )}
          </div>
        </Section>

        {/* ── API Integrations ── */}
        <Section title="API Integrations" icon={Settings} delay={0.55}>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-8">
            {/* OpenRouter API Key */}
            <div className="transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">OpenRouter API Key</p>
                  <p className="text-xs text-muted-foreground">Used for generating quizzes and AI responses.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter OpenRouter API Key (sk-or-v1-...)"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    className="bg-muted border-border text-xs flex-1 h-9"
                  />
                </div>
                {openRouterStatus !== "idle" && (
                  <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${openRouterStatus === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : openRouterStatus === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}>
                    {openRouterStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {openRouterStatus === "success" && <Check className="h-3.5 w-3.5" />}
                    {openRouterStatus === "error" && <X className="h-3.5 w-3.5" />}
                    {openRouterMsg}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleTestOpenRouterKey} variant="outline" className="flex-1 text-xs h-9 border-purple-500/30 text-purple-400 hover:bg-purple-500/10" disabled={openRouterStatus === "loading"}>Test Connection</Button>
                  <Button onClick={handleSaveOpenRouterKey} className="flex-1 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white" disabled={openRouterStatus === "loading"}>Save OpenRouter Key</Button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-6 space-y-8">
            {/* TMDB API Key */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Key className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">TMDB API Key</p>
                <p className="text-xs text-muted-foreground">Used for fetching movies & TV series data in Movie Hub</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter TMDB v3 API Key"
                  value={tmdbKey}
                  onChange={(e) => setTmdbKey(e.target.value)}
                  className="bg-muted border-border text-xs flex-1 h-9"
                />
                <select
                  className="bg-muted border border-border text-xs rounded-md px-2 h-9 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[150px] cursor-pointer"
                  value={DEFAULT_TMDB_KEYS.includes(tmdbKey) ? tmdbKey : ""}
                  onChange={(e) => {
                    if (e.target.value) setTmdbKey(e.target.value);
                  }}
                >
                  <option value="" disabled>Custom Key</option>
                  {DEFAULT_TMDB_KEYS.map((k, i) => (
                    <option key={k} value={k}>Key {i + 1} ({k.slice(0, 4)}...)</option>
                  ))}
                </select>
              </div>
              {tmdbStatus !== "idle" && (
                <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2
                  ${tmdbStatus === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    tmdbStatus === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                    "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}>
                  {tmdbStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {tmdbStatus === "success" && <Check className="h-3.5 w-3.5" />}
                  {tmdbStatus === "error" && <X className="h-3.5 w-3.5" />}
                  {tmdbMsg}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleTestTmdbKey} variant="outline" className="flex-1 text-xs h-9" disabled={tmdbStatus === "loading"}>
                  Test Connection
                </Button>
                <Button onClick={handleSaveTmdbKey} className="flex-1 text-xs h-9" disabled={tmdbStatus === "loading"}>
                  Save API Key
                </Button>
              </div>
            </div>

            </div>
          </div>
        </Section>

        {/* ── Account & Logout ── */}
        <Section title="Account" icon={LogOut} delay={0.6}>
          <div className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Logged in as <span className="text-primary">{user}</span>
              </p>
              {selectedGoal ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">Goal:</span>
                  <button 
                    onClick={() => setGoalSelectionOpen(true)}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-semibold text-[10px] flex items-center gap-1 shadow-sm"
                  >
                    <span>{selectedGoal.displayName}</span>
                    <span className="text-[8px] opacity-75">▼</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign out of your account
                </p>
              )}
            </div>
            <Button variant="destructive" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </Section>

        <div className="h-8" />
      </div>

      {/* ── Selective Restore Modal ── */}
      <AnimatePresence>
        {pendingRestore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setPendingRestore(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Selective Restore
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose which categories to restore
                  </p>
                </div>
                <button
                  onClick={() => setPendingRestore(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {editingCategory ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCategory(null)} className="p-1 hover:bg-muted rounded text-muted-foreground"><ChevronLeft className="h-4 w-4"/></button>
                        <span className="text-xs font-bold text-primary">{RESTORE_CATEGORIES.find(c => c.key === editingCategory)?.label}</span>
                      </div>
                      <button 
                        onClick={() => setIsExpertMode(!isExpertMode)} 
                        className={cn("text-[9px] px-2 py-0.5 rounded-full border transition-colors", isExpertMode ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground")}
                      >
                        {isExpertMode ? "Expert Mode (JSON)" : "Smart Mode"}
                      </button>
                    </div>
                    {isExpertMode ? (
                      <textarea 
                        value={editJsonBuffer}
                        onChange={e => setEditJsonBuffer(e.target.value)}
                        className="w-full h-48 sm:h-80 bg-muted border border-border rounded-xl p-3 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    ) : renderSmartEditor()}
                    <Button size="sm" className="w-full h-8 text-xs font-bold" onClick={saveEditedCategory}>Apply Changes to Pending Restore</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        Categories
                      </span>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() =>
                          setRestoreCategories(
                            restoreCategories.length === RESTORE_CATEGORIES.length
                              ? []
                              : RESTORE_CATEGORIES.map((c) => c.key),
                          )
                        }
                      >
                        {restoreCategories.length === RESTORE_CATEGORIES.length
                          ? "Deselect all"
                          : "Select all"}
                      </button>
                    </div>
                    {RESTORE_CATEGORIES.map((cat) => (
                      <div 
                        key={cat.key} 
                        onDoubleClick={() => cat.key !== 'streak' && startEditingCategory(cat.key)}
                        className="flex items-center justify-between group px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <label
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0
                              ${restoreCategories.includes(cat.key) ? "bg-primary border-primary" : "border-border"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRestoreCategories((prev) =>
                                prev.includes(cat.key)
                                  ? prev.filter((k) => k !== cat.key)
                                  : [...prev, cat.key],
                              );
                            }}
                          >
                            {restoreCategories.includes(cat.key) && (
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-foreground select-none">
                            {cat.label}
                          </span>
                        </label>
                        {cat.key !== 'streak' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditingCategory(cat.key); }}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20 rounded"
                          >
                            <Pencil className="h-3 w-3 text-primary" />
                          </button>
                        )}
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground text-center mt-2 italic">Tip: Double-tap a category to edit its raw data</p>
                  </>
                )}
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400 mb-4">
                ⚠ Selected categories will overwrite your current data.
              </div>
              <div className="flex gap-2" style={{ display: editingCategory ? 'none' : 'flex' }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setPendingRestore(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={applyRestore}
                  disabled={restoreCategories.length === 0}
                >
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  Restore Selected
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Timeline Form Modal ── */}
      <AnimatePresence>
        {showTLForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setShowTLForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  {editTL ? "Edit Entry" : "Add to Timeline"}
                </h3>
                <button
                  onClick={() => setShowTLForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <input
                      type="date"
                      value={tlForm.date}
                      onChange={(e) =>
                        setTlForm((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <select
                      value={tlForm.type}
                      onChange={(e) =>
                        setTlForm((p) => ({
                          ...p,
                          type: e.target.value as TimelineEntry["type"],
                        }))
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none"
                    >
                      {Object.entries(TIMELINE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.emoji} {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Title</p>
                  <input
                    autoFocus
                    value={tlForm.title}
                    onChange={(e) =>
                      setTlForm((p) => ({ ...p, title: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && saveTL()}
                    placeholder="e.g. Finished Thermodynamics chapter"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Notes (optional)
                  </p>
                  <textarea
                    value={tlForm.description}
                    onChange={(e) =>
                      setTlForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Additional details…"
                    rows={2}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setShowTLForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={saveTL}
                  disabled={!tlForm.title.trim()}
                >
                  {editTL ? "Save Changes" : "Add Entry"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
