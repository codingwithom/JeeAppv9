import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface SelectedGoal {
  category: string;
  path: string[];
  displayName: string;
}

export type ContentViewMode = "folder" | "section";

interface AppContextType {
  user: string | null;
  login: (username: string) => void;
  logout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  selectedGoal: SelectedGoal | null;
  selectGoal: (goal: SelectedGoal | null) => void;
  isGoalSelectionOpen: boolean;
  setGoalSelectionOpen: (isOpen: boolean) => void;
  viewMode: ContentViewMode;
  setViewMode: (mode: ContentViewMode) => void;
  pdfViewMode: ContentViewMode;
  setPdfViewMode: (mode: ContentViewMode) => void;
  videoViewMode: ContentViewMode;
  setVideoViewMode: (mode: ContentViewMode) => void;
  savesViewMode: ContentViewMode;
  setSavesViewMode: (mode: ContentViewMode) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getInitialTheme(): "dark" | "light" {
  try {
    const saved = localStorage.getItem("jee_theme") || localStorage.getItem("theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed === "dark" || parsed === "light") return parsed;
      } catch {
        if (saved === "dark" || saved === "light") return saved as "dark" | "light";
      }
    }
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }
  return "dark";
}

function getInitialUser(): string | null {
  try {
    const remember = localStorage.getItem("jee_remember_me");
    if (remember === "false") {
      const sessionActive = sessionStorage.getItem("jee_session_active");
      if (!sessionActive) return null;
    }
    const saved = localStorage.getItem("jee_user") || localStorage.getItem("user") || localStorage.getItem("jee_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "string" && parsed !== "null" && parsed !== "undefined" && parsed.trim() !== "") {
          return parsed;
        }
      } catch {
        if (typeof saved === "string" && saved !== "null" && saved !== "undefined" && saved.trim() !== "") {
          return saved;
        }
      }
    }
  } catch {}
  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<string | null>(getInitialUser);
  const [theme, setThemeState] = useState<"dark" | "light">(getInitialTheme);
  const [selectedGoal, setSelectedGoal] = useLocalStorage<SelectedGoal | null>("selected_goal", null);
  const [isGoalSelectionOpen, setGoalSelectionOpen] = useState(false);

  // Global & Per-page View Mode (Folder view by default)
  const [viewMode, setGlobalViewMode] = useLocalStorage<ContentViewMode>("view_mode", "folder");
  const [pdfViewMode, setPdfViewMode] = useLocalStorage<ContentViewMode>("pdf_view_mode", "folder");
  const [videoViewMode, setVideoViewMode] = useLocalStorage<ContentViewMode>("video_view_mode", "folder");
  const [savesViewMode, setSavesViewMode] = useLocalStorage<ContentViewMode>("saves_view_mode", "folder");

  const setViewMode = (mode: ContentViewMode) => {
    setGlobalViewMode(mode);
    setPdfViewMode(mode);
    setVideoViewMode(mode);
    setSavesViewMode(mode);
  };

  // Synchronize <html> root class with active theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  // If user has not explicitly chosen a theme, listen to system OS/device theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const explicit = localStorage.getItem("jee_theme_explicit");
      if (explicit !== "true") {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState(newTheme);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const login = (username: string) => {
    setUserState(username);
    try {
      localStorage.setItem("jee_user", JSON.stringify(username));
      localStorage.setItem("user", username);
      localStorage.setItem("jee_current_user", username);
      sessionStorage.setItem("jee_session_active", "true");
      localStorage.setItem("jee_last_active", Date.now().toString());
    } catch {}
  };

  const logout = () => {
    setUserState(null);
    setSelectedGoal(null);
    try {
      localStorage.removeItem("jee_user");
      localStorage.removeItem("user");
      localStorage.removeItem("jee_current_user");
      sessionStorage.removeItem("jee_session_active");
    } catch {}
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("jee_theme_explicit", "true");
      localStorage.setItem("jee_theme", JSON.stringify(nextTheme));
      localStorage.setItem("theme", JSON.stringify(nextTheme));
    } catch {}
    setThemeState(nextTheme);
  };

  const selectGoal = (goal: SelectedGoal | null) => {
    setSelectedGoal(goal);
  };

  // Auto-open goal selection for logged-in users without a goal
  useEffect(() => {
    if (user && !selectedGoal) {
      setGoalSelectionOpen(true);
    }
  }, [user, selectedGoal]);

  return (
    <AppContext.Provider value={{ 
      user, 
      login, 
      logout, 
      theme, 
      toggleTheme, 
      selectedGoal, 
      selectGoal, 
      isGoalSelectionOpen, 
      setGoalSelectionOpen,
      viewMode,
      setViewMode,
      pdfViewMode,
      setPdfViewMode,
      videoViewMode,
      setVideoViewMode,
      savesViewMode,
      setSavesViewMode
    }}>
      <div className={theme}>{children}</div>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

