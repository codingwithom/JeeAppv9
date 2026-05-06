import { Link, useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import { Home, Tag, Music, FileText, Moon, Sun, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/calendar", label: "Calendar", icon: Tag },
    { href: "/music", label: "Focus Music", icon: Music },
    { href: "/pdf", label: "PDF Viewer", icon: FileText },
    { href: "/video", label: "Videos", icon: Video },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="hidden md:flex flex-col h-screen bg-sidebar border-r border-white/5 backdrop-blur-xl relative z-40 transition-all duration-300"
    >
      <div className="p-4 flex items-center justify-between h-20 border-b border-white/5">
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-xl text-primary flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className={cn(
                "h-8 w-8 rounded bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/40 transition-colors border border-primary/30",
                location === "/admin" && "bg-primary/40 border-primary/60"
              )}
              title="Open Admin Panel"
            >
              <span className="text-primary text-sm font-black">OM</span>
            </button>
            JEE '28
          </motion.div>
        )}
        {collapsed && (
          <button
            onClick={() => navigate("/admin")}
            className={cn(
              "h-8 w-8 rounded bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/40 transition-colors border border-primary/30 mx-auto",
              location === "/admin" && "bg-primary/40 border-primary/60"
            )}
            title="Open Admin Panel"
          >
            <span className="text-primary text-sm font-black">OM</span>
          </button>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="ml-auto text-muted-foreground hover:text-white">
            <ChevronLeft />
          </Button>
        )}
        {collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-white">
            <ChevronRight />
          </Button>
        )}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {links.map((link) => {
          const active = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group relative",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}>
                <link.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="font-medium">{link.label}</span>}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={cn("text-muted-foreground hover:text-white", collapsed ? "mx-auto" : "w-full justify-start gap-3 px-3")}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!collapsed && <span className="font-medium text-sm">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
