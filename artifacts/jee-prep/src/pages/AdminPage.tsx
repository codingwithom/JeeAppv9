import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { useStreakContext } from "@/context/StreakContext";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import JSZip from "jszip";
import { idbGetAllKeys, idbGet, idbSet } from "@/lib/idb";
import {
  CheckCircle2, ListTodo, CalendarDays, Timer, Music, FileText,
  Flame, Clock, Tag, Upload, Download, Plus, X, Pencil, Trash2,
  Trophy, BookOpen, Star, Zap, Target, LayoutDashboard,
  Shield, Database, Archive, RefreshCw, ChevronDown, ChevronRight as ChevRight,
  AlarmClock, Layers, Globe, Radio, LogOut, FileVideo, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────
interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "milestone" | "study" | "test" | "achievement" | "goal";
}

const TIMELINE_TYPES: Record<TimelineEntry["type"], { label: string; color: string; emoji: string }> = {
  milestone: { label: "Milestone", color: "#8B5CF6", emoji: "🎯" },
  study:     { label: "Study",     color: "#3B82F6", emoji: "📚" },
  test:      { label: "Test",      color: "#EF4444", emoji: "📝" },
  achievement:{ label: "Achievement",color: "#F59E0B", emoji: "🏆" },
  goal:      { label: "Goal",      color: "#10B981", emoji: "⭐" },
};

// ─── Animated counter ───────────────────────────────────────────────────────
function AnimCounter({ to, duration = 1200 }: { to: number; duration?: number }) {
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
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden group hover:border-primary/40 transition-colors"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(ellipse at top left, ${color}12, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-3 relative">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mt-1">{label}</span>
      </div>
      <p className="text-3xl font-black text-foreground relative tabular-nums">
        <AnimCounter to={value} />
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1 relative">{sub}</p>}
    </motion.div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, delay = 0 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number;
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
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
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
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: <span className="font-bold text-foreground">{p.value}</span></p>
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAppContext();
  const { streakData, todaySession } = useStreakContext();

  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("jee_admin_timeline") || "[]"); } catch { return []; }
  });

  const [showTLForm, setShowTLForm] = useState(false);
  const [editTL, setEditTL] = useState<TimelineEntry | null>(null);
  const [tlForm, setTlForm] = useState<Omit<TimelineEntry, "id">>({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    type: "milestone",
  });

  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  // Selective restore
  const [pendingRestore, setPendingRestore] = useState<Record<string, any> | null>(null);
  const [pendingZip, setPendingZip] = useState<InstanceType<typeof JSZip> | null>(null);
  const [restoreCategories, setRestoreCategories] = useState<string[]>([]);

  // Live refresh key — polls localStorage every 3s so graphs stay reactive
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshKey(k => k + 1), 3000);
    return () => clearInterval(id);
  }, []);

  // Persist timeline
  useEffect(() => {
    localStorage.setItem("jee_admin_timeline", JSON.stringify(timeline));
  }, [timeline]);

  // ── Compute all stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const parse = <T,>(key: string, fallback: T): T => {
      try { return JSON.parse(localStorage.getItem(key) || "") ?? fallback; }
      catch { return fallback; }
    };

    const tasks       = parse<any[]>("jee_tasks", []);
    const events      = parse<any[]>("jee_cal_events", []);
    const marked      = parse<any[]>("jee_today_marked", []);
    const timers      = parse<any[]>("jee_tm_timers", []);
    const alarms      = parse<any[]>("jee_tm_alarms", []);
    const playlists   = parse<any[]>("jee_playlists", []);
    const sections    = parse<any[]>("jee_pdf_sections_v3", []);
    const tags        = parse<any[]>("jee_tags", []);
    const dailyRec    = parse<Record<string, any>>("jee_daily_records", {});

    const allSongs       = playlists.flatMap((p: any) => p.songs ?? []);
    const subsections    = sections.flatMap((s: any) => s.subsections ?? []);
    const subsubsections = subsections.flatMap((s: any) => s.subsubsections ?? []);
    const pdfsUploaded   = [
      ...subsections.filter((s: any) => s.pdfKey || s.pdfUrl),
      ...subsubsections.filter((s: any) => s.pdfKey || s.pdfUrl),
    ].length;

    const vidSections    = parse<any[]>("jee_vid_sections_v1", []);
    const vidSubs        = vidSections.flatMap((s: any) => s.subsections ?? []);
    const vidSubSubs     = vidSubs.flatMap((s: any) => s.subsubsections ?? []);
    const videosLoaded   = [
      ...vidSubs.filter((s: any) => s.video),
      ...vidSubSubs.filter((s: any) => s.video),
    ].length;

    const todayHr  = Math.floor(todaySession.seconds / 3600);
    const todayMin = Math.floor((todaySession.seconds % 3600) / 60);
    const todaySec = todaySession.seconds % 60;
    const totalEarned = streakData.records.filter(r => r.type === "earned").length;
    // Estimated total time: today session + historical earned days × avg 15 min
    const estTotalSecs = todaySession.seconds + (totalEarned > 0 ? (totalEarned - 1) * 15 * 60 : 0);

    const completedTasks = tasks.filter((t: any) => t.completed).length;
    const doneMark       = marked.filter((m: any) => m.status === "done").length;
    const cancelMark     = marked.filter((m: any) => m.status === "cancel").length;

    return {
      tasks:    { total: tasks.length, completed: completedTasks, pending: tasks.length - completedTasks,
                  high: tasks.filter((t: any) => t.priority === "High").length,
                  medium: tasks.filter((t: any) => t.priority === "Medium").length,
                  low: tasks.filter((t: any) => t.priority === "Low").length },
      events:   { total: events.length, none: events.filter((e: any) => e.recurrence === "none").length,
                  daily: events.filter((e: any) => e.recurrence === "daily").length,
                  weekly: events.filter((e: any) => e.recurrence === "weekly").length,
                  done: doneMark, cancel: cancelMark },
      timers:   { total: timers.length },
      alarms:   { total: alarms.length, active: alarms.filter((a: any) => a.active).length },
      music:    { songs: allSongs.length, playlists: playlists.length,
                  local: allSongs.filter((s: any) => s.isLocal).length,
                  url: allSongs.filter((s: any) => !s.isLocal).length },
      pdf:      { sections: sections.length, subsections: subsections.length,
                  subsubsections: subsubsections.length, uploaded: pdfsUploaded },
      videos:   { sections: vidSections.length, subsections: vidSubs.length + vidSubSubs.length, loaded: videosLoaded },
      streak:   { current: streakData.currentStreak, earned: totalEarned },
      tags:     tags.length,
      time:     { todayHr, todayMin, todaySec, estTotalSecs,
                  todayStr: `${String(todayHr).padStart(2,"0")}:${String(todayMin).padStart(2,"0")}:${String(todaySec).padStart(2,"0")}` },
      dailyRec,
    };
  }, [todaySession, streakData, refreshKey]);

  // ── Chart data ───────────────────────────────────────────────────────────
  const todoChartData = [
    { name: "Completed", value: stats.tasks.completed, fill: "#22C55E" },
    { name: "Pending",   value: stats.tasks.pending,   fill: "#EF4444" },
  ].filter(d => d.value > 0);

  const priorityChartData = [
    { name: "High",   value: stats.tasks.high,   fill: "#EF4444" },
    { name: "Medium", value: stats.tasks.medium, fill: "#F59E0B" },
    { name: "Low",    value: stats.tasks.low,    fill: "#6B7280" },
  ].filter(d => d.value > 0);

  const eventChartData = [
    { name: "One-time", value: stats.events.none,   fill: "#3B82F6" },
    { name: "Daily",    value: stats.events.daily,  fill: "#8B5CF6" },
    { name: "Weekly",   value: stats.events.weekly, fill: "#EC4899" },
  ].filter(d => d.value > 0);

  const musicChartData = [
    { name: "Local",  value: stats.music.local, fill: "#10B981" },
    { name: "URL",    value: stats.music.url,   fill: "#06B6D4" },
  ].filter(d => d.value > 0);

  // Spike graph data — 30 days of todo completions + calendar events
  const spikeData = useMemo(() => {
    const parse = <T,>(key: string, fallback: T): T => {
      try { return JSON.parse(localStorage.getItem(key) || "") ?? fallback; }
      catch { return fallback; }
    };
    const dailyRec = parse<Record<string, { completed: number; total: number }>>("jee_daily_records", {});
    const events = parse<any[]>("jee_cal_events", []);
    const byDay: Record<string, number> = {};
    events.forEach((ev: any) => {
      if (ev.start) {
        const d = new Date(ev.start).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      }
    });
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed: dailyRec[key]?.completed || 0,
        total: dailyRec[key]?.total || 0,
        events: byDay[key] || 0,
      };
    });
  }, [refreshKey]);

  // Activity bar — last 14 streak record dates
  const activityData = useMemo(() => {
    const days: { date: string; earned: number; extended: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const earned   = streakData.records.filter(r => r.date === ds && r.type === "earned").length;
      const extended = streakData.records.filter(r => r.date === ds && r.type === "extended").length;
      days.push({ date: ds.slice(5), earned, extended });
    }
    return days;
  }, [streakData]);

  // ── Timeline CRUD ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTL(null);
    setTlForm({ date: new Date().toISOString().slice(0, 10), title: "", description: "", type: "milestone" });
    setShowTLForm(true);
  };

  const openEdit = (entry: TimelineEntry) => {
    setEditTL(entry);
    setTlForm({ date: entry.date, title: entry.title, description: entry.description ?? "", type: entry.type });
    setShowTLForm(true);
  };

  const saveTL = () => {
    if (!tlForm.title.trim()) return;
    if (editTL) {
      setTimeline(prev => prev.map(e => e.id === editTL.id ? { ...editTL, ...tlForm } : e));
    } else {
      setTimeline(prev => [...prev, { id: Date.now().toString(), ...tlForm }]);
    }
    setShowTLForm(false);
  };

  const deleteTL = (id: string) => setTimeline(prev => prev.filter(e => e.id !== id));

  const sortedTimeline = [...timeline].sort((a, b) => b.date.localeCompare(a.date));

  // ── IDB key → restore category mapping ───────────────────────────────────
  function idbKeyCategory(key: string): string | null {
    if (key.startsWith("pdf_leaf_") || key.startsWith("img_leaf_")) return "pdf";
    if (key.startsWith("music_")) return "music";
    // Video note images, voice recordings, screenshots, local video files
    if (
      key.startsWith("vid_img_") || key.startsWith("vid_voice_") ||
      key.startsWith("vid_ss_") || key.startsWith("vid_file_")
    ) return "videos";
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
      if (key.startsWith("jee_") || key.startsWith("pdf_anno_") || key === "theme" || key === "user") {
        try { backup[key] = JSON.parse(localStorage.getItem(key)!); }
        catch { backup[key] = localStorage.getItem(key); }
      }
    }

    // Include timeline from local state
    backup["jee_admin_timeline"] = timeline;

    // ── Export IndexedDB binary files (PDFs, local music, video notes) ──────
    try {
      const idbKeys = await idbGetAllKeys();
      const idbManifest: { key: string; file: string; mimeType?: string }[] = [];
      for (const key of idbKeys) {
        try {
          const value = await idbGet<ArrayBuffer | Blob>(key);
          let buf: ArrayBuffer | null = null;
          let mimeType: string | undefined;
          if (value instanceof Blob) {
            buf = await value.arrayBuffer();
            mimeType = value.type || undefined;
          } else if (value instanceof ArrayBuffer) {
            buf = value;
          }
          if (buf) {
            const safeName = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `idb/${safeName}.bin`;
            zip.file(filename, new Uint8Array(buf));
            idbManifest.push({ key, file: filename, ...(mimeType ? { mimeType } : {}) });
          }
        } catch { /* skip unreadable entry */ }
      }
      if (idbManifest.length > 0) backup["_idb"] = idbManifest;
    } catch { /* IDB not available, skip */ }

    backup["_meta"] = {
      version: 2,
      exportedAt: new Date().toISOString(),
      exportedBy: user ?? "unknown",
    };

    zip.file("backup.json", JSON.stringify(backup, null, 2));

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `jee_backup_${dateStr}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [timeline, user]);

  // ── Backup Import (ZIP) ──────────────────────────────────────────────────
  const RESTORE_CATEGORIES: { key: string; label: string; keys: string[] }[] = [
    { key: "tasks",    label: "Tasks & Todos",      keys: ["jee_tasks", "jee_today_marked"] },
    { key: "calendar", label: "Calendar Events",    keys: ["jee_cal_events"] },
    { key: "pdf",      label: "PDF Sections",       keys: ["jee_pdf_sections_v3"] },
    { key: "music",    label: "Music Playlists",    keys: ["jee_playlists"] },
    { key: "videos",   label: "Video Sections",     keys: ["jee_vid_sections_v1", "jee_vid_notes_v1", "jee_vid_resume"] },
    { key: "streak",   label: "Streak & Records",   keys: ["jee_streak_data", "jee_daily_records", "jee_streak_records"] },
    { key: "tags",     label: "Tags",               keys: ["jee_tags"] },
    { key: "timeline", label: "Admin Timeline",     keys: ["jee_admin_timeline"] },
    { key: "timers",   label: "Timers & Alarms",    keys: ["jee_tm_timers", "jee_tm_alarms"] },
  ];

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Keep the loaded zip so applyRestore can extract IDB binary files
      setPendingZip(loaded);
      setPendingRestore(backup);
      setRestoreCategories(RESTORE_CATEGORIES.map(c => c.key));
    } catch (err: any) {
      setImportStatus("error");
      setImportMsg(err?.message || "Failed to read backup file.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRestore = useCallback(async () => {
    if (!pendingRestore) return;
    const allowedKeys = new Set<string>(
      RESTORE_CATEGORIES
        .filter(c => restoreCategories.includes(c.key))
        .flatMap(c => c.keys)
    );
    let restored = 0;

    // ── Restore localStorage ─────────────────────────────────────────────
    for (const [key, value] of Object.entries(pendingRestore)) {
      if (key === "_meta" || key === "_idb") continue;
      const isPdfAnno = key.startsWith("pdf_anno_") && restoreCategories.includes("pdf");
      if (!allowedKeys.has(key) && !isPdfAnno) continue;
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      if (key === "jee_admin_timeline") setTimeline(value);
      restored++;
    }

    // ── Restore IndexedDB binary files ───────────────────────────────────
    if (pendingZip && pendingRestore["_idb"]) {
      const manifest = pendingRestore["_idb"] as { key: string; file: string; mimeType?: string }[];
      for (const entry of manifest) {
        const cat = idbKeyCategory(entry.key);
        if (!cat || !restoreCategories.includes(cat)) continue;
        try {
          const zipFile = pendingZip.file(entry.file);
          if (!zipFile) continue;
          const buf = await zipFile.async("arraybuffer");
          const stored = entry.mimeType
            ? new Blob([buf], { type: entry.mimeType })
            : buf;
          await idbSet(entry.key, stored);
          restored++;
        } catch { /* skip unreadable entry */ }
      }
    }

    setPendingRestore(null);
    setPendingZip(null);
    setImportStatus("success");
    setImportMsg(`Restored ${restored} items. Reloading…`);
    setTimeout(() => window.location.reload(), 2200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRestore, pendingZip, restoreCategories]);

  const CHART_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#10B981","#F59E0B","#EF4444","#06B6D4"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-full bg-background overflow-y-auto"
    >
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-background border-b border-border px-8 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.15),_transparent_60%)]" />
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-widest">Admin Panel</p>
              <h1 className="text-2xl font-black text-foreground leading-tight">
                Welcome Boss, {user} 👋
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            This is your Desk for JEE Prep with Digital Way
          </p>
          <div className="flex items-center gap-4 mt-3 ml-[52px]">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Clock className="h-3 w-3 text-primary" />Today: <span className="text-foreground font-semibold">{stats.time.todayStr}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Flame className="h-3 w-3 text-orange-400" />Streak: <span className="text-foreground font-semibold">{stats.streak.current} days</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Trophy className="h-3 w-3 text-yellow-400" />Earned: <span className="text-foreground font-semibold">{stats.streak.earned} days</span>
            </span>
          </div>
        </motion.div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">

        {/* ── Quick Stats Grid ── */}
        <Section title="Overview" icon={LayoutDashboard}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={ListTodo}    label="Todos"         value={stats.tasks.total}     sub={`${stats.tasks.completed} done`}     color="#3B82F6" delay={0.0} />
            <StatCard icon={CheckCircle2} label="Completed"   value={stats.tasks.completed} sub={`${stats.tasks.pending} pending`}    color="#22C55E" delay={0.05} />
            <StatCard icon={FileVideo}    label="Videos"      value={stats.videos.loaded}   sub={`${stats.videos.sections} sections`} color="#EF4444" delay={0.10} />
            <StatCard icon={Music}        label="Songs"       value={stats.music.songs}     sub={`${stats.music.playlists} playlists`} color="#EC4899" delay={0.15} />
            <StatCard icon={FileText}     label="PDF Sections" value={stats.pdf.sections}  sub={`${stats.pdf.uploaded} PDFs loaded`} color="#F59E0B" delay={0.20} />
            <StatCard icon={Flame}        label="Streak Days"  value={stats.streak.current} sub={`${stats.streak.earned} total`}     color="#8B5CF6" delay={0.25} />
          </div>
        </Section>

        {/* ── Detailed breakdown cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Todos */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListTodo className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">To-Do System</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Total Created",  val: stats.tasks.total,     color: "bg-blue-500" },
                { label: "Completed",      val: stats.tasks.completed, color: "bg-green-500" },
                { label: "Pending",        val: stats.tasks.pending,   color: "bg-red-500" },
                { label: "High Priority",  val: stats.tasks.high,      color: "bg-red-400" },
                { label: "Medium Priority",val: stats.tasks.medium,    color: "bg-amber-400" },
                { label: "Low Priority",   val: stats.tasks.low,       color: "bg-gray-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Calendar</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Total Events",    val: stats.events.total,   color: "bg-purple-500" },
                { label: "One-time Events", val: stats.events.none,    color: "bg-blue-400" },
                { label: "Daily Recurring", val: stats.events.daily,   color: "bg-pink-400" },
                { label: "Weekly Recurring",val: stats.events.weekly,  color: "bg-violet-400" },
                { label: "Marked Done",     val: stats.events.done,    color: "bg-green-500" },
                { label: "Cancelled",       val: stats.events.cancel,  color: "bg-red-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Time Management */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
            className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Time Tools</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Timers Created",  val: stats.timers.total,        color: "bg-cyan-500" },
                { label: "Alarms Created",  val: stats.alarms.total,        color: "bg-orange-400" },
                { label: "Active Alarms",   val: stats.alarms.active,       color: "bg-green-400" },
                { label: "Inactive Alarms", val: stats.alarms.total - stats.alarms.active, color: "bg-gray-400" },
                { label: "Today's Session", val: stats.time.todayMin,       color: "bg-blue-400" },
                { label: "Streak Days",     val: stats.streak.current,      color: "bg-red-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.label === "Today's Session" ? `${item.val}m` : item.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* PDF & Music */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">PDF & Music</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "PDF Sections",      val: stats.pdf.sections,       color: "bg-yellow-500" },
                { label: "Subsections",       val: stats.pdf.subsections,    color: "bg-amber-400" },
                { label: "Sub-subsections",   val: stats.pdf.subsubsections, color: "bg-orange-400" },
                { label: "PDFs Loaded",       val: stats.pdf.uploaded,       color: "bg-red-400" },
                { label: "Songs Added",       val: stats.music.songs,        color: "bg-pink-400" },
                { label: "Playlists",         val: stats.music.playlists,    color: "bg-purple-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Charts ── */}
        <Section title="Analytics & Infographics" icon={LayoutDashboard} delay={0.3}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {/* Todo Completion Pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Todo Status</p>
              {todoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={todoChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={4} dataKey="value" stroke="none">
                      {todoChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>}
            </div>

            {/* Priority Pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Task Priority</p>
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={priorityChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={4} dataKey="value" stroke="none">
                      {priorityChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>}
            </div>

            {/* Events pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Event Types</p>
              {eventChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={eventChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={4} dataKey="value" stroke="none">
                      {eventChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No events yet</div>}
            </div>

            {/* Music pie */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Music Sources</p>
              {musicChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={musicChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={4} dataKey="value" stroke="none">
                      {musicChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No songs yet</div>}
            </div>
          </div>

          {/* Activity bar chart */}
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">14-Day Activity (Streak Records)</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={activityData} barSize={12} barGap={2}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="earned"   name="Earned"   fill="#22C55E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="extended" name="Extended" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Todo Completions Spike — 30 days */}
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Todo Completions — 30 Days</p>
            <p className="text-[10px] text-muted-foreground/60 mb-3">Updates every 3 seconds · green = completed, blue = total</p>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={spikeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-todo-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-todo-done" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total"     name="Total Todos" stroke="#3B82F6" strokeWidth={1.5} fill="url(#grad-todo-total)" dot={false} />
                <Area type="monotone" dataKey="completed" name="Completed"   stroke="#22C55E" strokeWidth={2}   fill="url(#grad-todo-done)"  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Calendar Events Spike — 30 days */}
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Calendar Events by Scheduled Date — 30 Days</p>
            <p className="text-[10px] text-muted-foreground/60 mb-3">Shows how many events are scheduled on each day · live reactive</p>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={spikeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-cal-ev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="events" name="Events Scheduled" stroke="#8B5CF6" strokeWidth={2} fill="url(#grad-cal-ev)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* ── Timeline ── */}
        <Section title="My JEE Journey Timeline" icon={Target} delay={0.4}>
          <div className="flex justify-end mb-4">
            <Button onClick={openAdd} size="sm" className="h-8 gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" />Add Milestone
            </Button>
          </div>

          {sortedTimeline.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <Target className="h-10 w-10 mx-auto mb-3 text-primary/30" />
              <p className="text-sm font-medium text-foreground mb-1">Your JEE journey starts here</p>
              <p className="text-xs text-muted-foreground mb-3">Add milestones, test results, study goals and achievements</p>
              <Button onClick={openAdd} size="sm" variant="outline" className="text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />Add first milestone
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
                      <div className="relative z-10 shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-base"
                        style={{ backgroundColor: `${t.color}20`, borderColor: `${t.color}60` }}>
                        {t.emoji}
                      </div>
                      <div className="flex-1 bg-card border border-border rounded-xl p-3.5 group-hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{entry.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${t.color}20`, color: t.color }}>
                                {t.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{entry.date}</p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{entry.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEdit(entry)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => deleteTL(entry.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive">
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
                  <p className="text-sm font-bold text-foreground">Export Backup</p>
                  <p className="text-xs text-muted-foreground">Download all your data as a ZIP file</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <p>✓ All todos, events, timers & alarms</p>
                <p>✓ PDF sections & all annotations</p>
                <p>✓ Music playlists & settings</p>
                <p>✓ Streak history & daily records</p>
                <p>✓ Timeline & tags</p>
                <p className="text-yellow-400/80">⚠ PDF and audio binary files excluded (browser storage)</p>
              </div>
              <Button onClick={handleExport} className="w-full gap-2 text-sm" variant="outline">
                <Download className="h-4 w-4" />Export Backup ZIP
              </Button>
            </div>

            {/* Import */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Upload className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Restore Backup</p>
                  <p className="text-xs text-muted-foreground">Upload a ZIP to restore your data</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <p>• Upload a previously exported ZIP file</p>
                <p>• All existing data will be replaced</p>
                <p>• Page will reload automatically after restore</p>
                <p className="text-red-400/80">⚠ This will overwrite your current data</p>
              </div>

              {importStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-3 p-3 rounded-lg text-xs font-medium border
                    ${importStatus === "success" ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : importStatus === "error"   ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}
                >
                  {importStatus === "loading" && <RefreshCw className="h-3 w-3 inline mr-1.5 animate-spin" />}
                  {importMsg}
                </motion.div>
              )}

              <input ref={importFileRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
              <Button
                onClick={() => importFileRef.current?.click()}
                className="w-full gap-2 text-sm"
                variant="outline"
                disabled={importStatus === "loading"}
              >
                <Upload className="h-4 w-4" />Import Backup ZIP
              </Button>
            </div>
          </div>
        </Section>

        {/* ── Account & Logout ── */}
        <Section title="Account" icon={LogOut} delay={0.6}>
          <div className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-foreground">Logged in as <span className="text-primary">{user}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign out of your JEE Prep account</p>
            </div>
            <Button
              variant="destructive"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />Logout
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                  <h3 className="text-sm font-bold text-foreground">Selective Restore</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose which categories to restore</p>
                </div>
                <button onClick={() => setPendingRestore(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Categories</span>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setRestoreCategories(
                      restoreCategories.length === RESTORE_CATEGORIES.length
                        ? []
                        : RESTORE_CATEGORIES.map(c => c.key)
                    )}
                  >
                    {restoreCategories.length === RESTORE_CATEGORIES.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                {RESTORE_CATEGORIES.map(cat => (
                  <label key={cat.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0
                        ${restoreCategories.includes(cat.key) ? "bg-primary border-primary" : "border-border"}`}
                      onClick={() => setRestoreCategories(prev =>
                        prev.includes(cat.key) ? prev.filter(k => k !== cat.key) : [...prev, cat.key]
                      )}
                    >
                      {restoreCategories.includes(cat.key) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-xs font-medium text-foreground">{cat.label}</span>
                  </label>
                ))}
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400 mb-4">
                ⚠ Selected categories will overwrite your current data.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setPendingRestore(null)}>Cancel</Button>
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={applyRestore} disabled={restoreCategories.length === 0}>
                  <Archive className="h-3.5 w-3.5 mr-1.5" />Restore Selected
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <button onClick={() => setShowTLForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <input type="date" value={tlForm.date} onChange={e => setTlForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <select value={tlForm.type} onChange={e => setTlForm(p => ({ ...p, type: e.target.value as TimelineEntry["type"] }))}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none">
                      {Object.entries(TIMELINE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Title</p>
                  <input
                    autoFocus
                    value={tlForm.title}
                    onChange={e => setTlForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && saveTL()}
                    placeholder="e.g. Finished Thermodynamics chapter"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes (optional)</p>
                  <textarea
                    value={tlForm.description}
                    onChange={e => setTlForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Additional details…"
                    rows={2}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowTLForm(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={saveTL} disabled={!tlForm.title.trim()}>
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
