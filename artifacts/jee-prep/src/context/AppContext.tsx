import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface SelectedGoal {
  category: string;
  path: string[];
  displayName: string;
}

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<string | null>("user", null);
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("theme", "dark");
  const [selectedGoal, setSelectedGoal] = useLocalStorage<SelectedGoal | null>("selected_goal", null);
  const [isGoalSelectionOpen, setGoalSelectionOpen] = useState(false);

  const login = (username: string) => setUser(username);
  const logout = () => {
    setUser(null);
    setSelectedGoal(null);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
      setGoalSelectionOpen 
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

