import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { MusicProvider } from "@/context/MusicContext";
import { StreakProvider } from "@/context/StreakContext";
import { TagsProvider } from "@/context/TagsContext";
import { VideoProvider } from "@/context/VideoContext";
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
import { MiniPlayer } from "@/components/MiniPlayer";
import { AnimatePresence, motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

const queryClient = new QueryClient();

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/calendar": "Calendar & Tags",
  "/music": "Focus Music",
  "/pdf": "PDF Viewer",
  "/video": "Videos",
  "/admin": "Admin Panel",
};

function TopBar() {
  const { theme, toggleTheme } = useAppContext();
  const [location] = useLocation();
  const label = PAGE_LABELS[location] || "";

  return (
    <div className="h-12 flex items-center justify-between px-5 border-b border-border/60 bg-background/80 backdrop-blur-md flex-shrink-0 z-20">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleTheme}
        className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark"
          ? <Sun className="h-4 w-4 text-yellow-400" />
          : <Moon className="h-4 w-4 text-indigo-500" />}
      </motion.button>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAppContext();

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <div className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </div>
        <MiniPlayer />
        <VideoMiniPlayer />
      </main>
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
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TagsProvider>
          <MusicProvider>
            <StreakProvider>
              <VideoProvider>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                  <Toaster />
                </TooltipProvider>
              </VideoProvider>
            </StreakProvider>
          </MusicProvider>
        </TagsProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
