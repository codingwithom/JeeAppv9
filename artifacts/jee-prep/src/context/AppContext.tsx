import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AppContextType {
  user: string | null;
  login: (username: string) => void;
  logout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<string | null>("user", null);
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("theme", "dark");

  const login = (username: string) => setUser(username);
  const logout = () => setUser(null);
  
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, theme, toggleTheme }}>
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
