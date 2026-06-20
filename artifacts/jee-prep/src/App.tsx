import React, { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { WorkspaceProvider, useWorkspaceContext } from "@/context/WorkspaceContext";
import { MusicProvider } from "@/context/MusicContext";
import { StreakProvider } from "@/context/StreakContext";
import { TagsProvider } from "@/context/TagsContext";
import { VideoProvider } from "@/context/VideoContext";
import { LockdownProvider, useLockdown } from "@/context/LockdownContext";
import { VideoMiniPlayer } from "@/components/VideoMiniPlayer";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import { Sidebar } from "@/components/Sidebar";
import HomePage from "@/pages/HomePage";
import CalendarPage from "@/pages/CalendarPage";
import MusicPage from "@/pages/MusicPage";
import PDFPage from "@/pages/PDFPage";
import AdminPage from "@/pages/AdminPage";
import VideoPage from "@/pages/VideoPage";
import MovieHub from "@/pages/MovieHub";
import SavesPage from "@/pages/SavesPage"; // Import the new SavesPage
import QuizPage from "@/pages/QuizPage";
import { AmbientMixer } from "@/components/AmbientMixer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { AnimatePresence, motion } from "framer-motion";
import { GoalSelection } from "@/components/GoalSelection";
import { 
  Sun, 
  Moon, 
  Search, 
  LayoutDashboard, 
  CalendarDays, 
  Music, 
  FileText, 
  Video, 
  Film, 
  Shield, 
  Bookmark,
  X,
  Headphones,
  Trees,
  PenTool,
  BrainCircuit
} from "lucide-react";
import { idbGetAllKeys, idbGet, idbSet } from "@/lib/idb";

const queryClient = new QueryClient();

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/calendar": "Calendar & Tags",
  "/music": "Focus Music",
  "/pdf": "PDF Viewer",
  "/video": "Videos",
  "/movies": "Movie Hub",
  "/admin": "Admin Panel",
  "/saves": "Saves",
  "/quiz": "AI",
  "/ambient": "Zen Mixer",
};

function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { isActive } = useLockdown();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isActive) setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isActive]);

  if (!isOpen) return null;

  const items = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Calendar & Tags", path: "/calendar", icon: CalendarDays },
    { name: "Focus Music", path: "/music", icon: Music },
    { name: "PDF Viewer", path: "/pdf", icon: FileText },
    { name: "Videos", path: "/video", icon: Video },
    { name: "Movie Hub", path: "/movies", icon: Film },
    { name: "Admin Panel", path: "/admin", icon: Shield },
    { name: "Saves & Flashcards", path: "/saves", icon: Bookmark },
    { name: "AI", path: "/quiz", icon: BrainCircuit },
    { name: "Zen Mixer", path: "/ambient", icon: Headphones },
  ];

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-background/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden m-4"
      >
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Where to? (e.g., 'Music', 'PDF')" className="w-full bg-transparent border-0 h-14 px-3 text-sm focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border">ESC</span>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map((item) => (
            <button key={item.path} onClick={() => { navigate(item.path); setIsOpen(false); setSearch(""); }} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-primary/10 rounded-lg text-sm font-medium text-foreground transition-colors">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {item.name}
            </button>
          ))}
          {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No matching routes found.</p>}
        </div>
      </motion.div>
    </div>
  );
}

function TopBar() {
  const { theme, toggleTheme, selectedGoal, setGoalSelectionOpen } = useAppContext();
  const [location] = useLocation();
  const label = PAGE_LABELS[location] || "";
  const { isActive, endTime } = useLockdown();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!isActive || !endTime) return;
    const update = () => {
      const remain = Math.max(0, endTime - Date.now());
      const h = Math.floor(remain / 3600000);
      const m = Math.floor((remain % 3600000) / 60000);
      const s = Math.floor((remain % 60000) / 1000);
      if (h > 0) {
        setTimeLeft(`${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      } else {
        setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isActive, endTime]);

  return (
    <div className="h-12 flex items-center justify-between pr-5 pl-14 md:px-5 border-b border-border/60 bg-background/80 backdrop-blur-md flex-shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-muted-foreground truncate">{label}</span>
        {selectedGoal && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setGoalSelectionOpen(true)}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <span>{selectedGoal.displayName}</span>
            <span className="text-[9px] opacity-60">▼</span>
          </motion.button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isActive && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 shadow-inner">
            <Shield className="h-4 w-4 text-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-500 tabular-nums">{timeLeft}</span>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 text-yellow-400" />
            : <Moon className="h-4 w-4 text-indigo-500" />}
        </motion.button>
      </div>
    </div>
  );
}


function AutoSyncWorkspace() {
  const { writeMedia, readMediaAsArrayBuffer, isSupported } = useWorkspaceContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isSupported) return;
    const restore = async () => {
      try {
        const buf = await readMediaAsArrayBuffer("jee_workspace_metadata.json");
        if (buf) {
          const text = new TextDecoder().decode(buf);
          const data = JSON.parse(text);
          const needsRestore = !localStorage.getItem("jee_restored_metadata") && !localStorage.getItem("jee_tasks");
          if (needsRestore && data.localStorage) {
             for (const [k, v] of Object.entries(data.localStorage)) {
               localStorage.setItem(k, v as string);
             }
             if (data.idb) {
               for (const [k, v] of Object.entries(data.idb)) {
                 if (k !== "jee_workspace_handle") {
                   await idbSet(k, v);
                 }
               }
             }
             localStorage.setItem("jee_restored_metadata", "true");
             window.location.reload();
             return;
          }
        }
      } catch (e) {
      }
      initialized.current = true;
    };
    restore();
  }, [isSupported, readMediaAsArrayBuffer]);

  useEffect(() => {
    if (!isSupported) return;
    const interval = setInterval(async () => {
      if (!initialized.current) return;
      try {
        const backup: any = { localStorage: {}, idb: {} };
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("jee_") || key.startsWith("pdf_anno_") || key === "theme" || key === "user" || key.startsWith("vid_"))) {
            backup.localStorage[key] = localStorage.getItem(key);
          }
        }
        const idbKeys = await idbGetAllKeys();
        for (const key of idbKeys) {
          if (key.startsWith("jee_") && key !== "jee_workspace_handle") {
             backup.idb[key] = await idbGet(key);
          }
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        await writeMedia("jee_workspace_metadata.json", blob);
        
        try {
          const savesDbStr = backup.localStorage["jee_saves_questions_v1"];
          if (savesDbStr) {
            const savesDb = typeof savesDbStr === "string" ? JSON.parse(savesDbStr) : savesDbStr;
            const readableBlob = new Blob([JSON.stringify(savesDb, null, 2)], { type: "application/json" });
            await writeMedia("SavesData_Readable.json", readableBlob);
          }
        } catch (e) {}
      } catch (e) {
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isSupported, writeMedia]);

  return null;
}

function TimeTracker() {
  const [location] = useLocation();
  const recordsRef = useRef<any>(null);
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jee_time_tracking');
      if (raw) recordsRef.current = JSON.parse(raw);
      else recordsRef.current = {};
    } catch (e) {
      recordsRef.current = {};
    }
    
    const save = () => {
      if (recordsRef.current) {
        localStorage.setItem('jee_time_tracking', JSON.stringify(recordsRef.current));
      }
    };
    
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save();
    };
    
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', save);
    
    const saveInterval = setInterval(save, 30000);
    
    return () => {
      save();
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', save);
      clearInterval(saveInterval);
    };
  }, []);

  useEffect(() => {
    let lastTick = Date.now();
    const interval = setInterval(() => {
       const now = Date.now();
       const deltaSecs = (now - lastTick) / 1000;
       lastTick = now;

       if (!recordsRef.current) return;
       let records = recordsRef.current;

       const dateStr = new Date().toISOString().slice(0, 10);
       
       if (!records[dateStr]) {
         records[dateStr] = {
           date: dateStr,
           startTime: now,
           endTime: now,
           totalSeconds: 0,
           sections: {}
         };
       }
       
       const rec = records[dateStr];
       rec.endTime = now;
       rec.totalSeconds += deltaSecs;
       
       let sectionName = "Dashboard";
       if (location.startsWith("/pdf")) sectionName = "PDF Viewer";
       else if (location.startsWith("/music")) sectionName = "Music";
       else if (location.startsWith("/video")) sectionName = "Videos";
       else if (location.startsWith("/movies")) sectionName = "Movie Hub";
       else if (location.startsWith("/saves")) sectionName = "Saves";
       else if (location.startsWith("/calendar")) sectionName = "Calendar";
       else if (location.startsWith("/quiz")) sectionName = "AI";
       else if (location.startsWith("/admin")) sectionName = "Admin Panel";
       else if (location.startsWith("/ambient")) sectionName = "Zen Mixer";
       
       rec.sections[sectionName] = (rec.sections[sectionName] || 0) + deltaSecs;
    }, 1000);
    return () => clearInterval(interval);
  }, [location]);

  return null;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isGoalSelectionOpen, selectedGoal } = useAppContext();

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <AutoSyncWorkspace />
        <TimeTracker />
        <TopBar />
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <CommandPalette />
          <div className="flex-1 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              {children}
            </AnimatePresence>
          </div>
        </div>
        <MiniPlayer />
        <VideoMiniPlayer />
      </main>
      <AnimatePresence>
        {isGoalSelectionOpen && (
          <GoalSelection canClose={selectedGoal !== null} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Router() {
  return (
    <ProtectedLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/music" component={MusicPage} />
        <Route path="/pdf" component={PDFPage} />
        <Route path="/video" component={VideoPage} />
        <Route path="/movies" component={MovieHub} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/saves" component={SavesPage} /> {/* Add the new route for SavesPage */}
        <Route path="/quiz" component={QuizPage} />
        <Route path="/ambient" component={AmbientMixer} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedLayout>
  );
}

export default function App() {
  useEffect(() => {
    // Ping the PHP logger when the app initially loads.
    // This triggers the server to save the visitor's IP and device info.
    fetch("/logger.php").catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <AppProvider>
          <TagsProvider>
            <MusicProvider>
              <StreakProvider>
                <VideoProvider>
                  <TooltipProvider>
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      {/* LockdownProvider requires router context, so it sits inside WouterRouter */}
                      <LockdownProvider key="lockdown-provider">
                        <Router />
                      </LockdownProvider>
                    </WouterRouter>
                    <Toaster />
                  </TooltipProvider>
                </VideoProvider>
              </StreakProvider>
            </MusicProvider>
          </TagsProvider>
        </AppProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
