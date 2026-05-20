import { Link, useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Tag,
  Music,
  FileText,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Video,
  Film,
  Bookmark,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-close sidebar on mobile when navigating between pages
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/calendar", label: "Calendar", icon: Tag },
    { href: "/music", label: "Focus Music", icon: Music },
    { href: "/pdf", label: "PDF Viewer", icon: FileText },
    { href: "/video", label: "Videos", icon: Video },
    { href: "/saves", label: "Saves", icon: Bookmark },
    { href: "/movies", label: "Movie Hub", icon: Film },
  ];

  return (
    <>
      {/* Mobile Hamburger Menu (Shows when sidebar is closed) */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-2 left-4 z-[60] p-1.5 bg-card rounded-md border border-border/60 text-foreground shadow-sm hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: isMobile ? -260 : 0 }}
        animate={{
          x: isMobile && !isOpen ? -260 : 0,
          width: collapsed && !isMobile ? 80 : 260,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "flex flex-col h-screen bg-sidebar border-r border-white/5 backdrop-blur-xl z-50",
          "flex-shrink-0 overflow-hidden",
          isMobile ? "fixed left-0 top-0" : "relative"
        )}
      >
        <div className={cn(
          "p-4 flex h-20 border-b border-white/5 flex-shrink-0",
          collapsed && !isMobile ? "flex-col items-center justify-center h-auto gap-3" : "items-center justify-between"
        )}>
          {/* Mobile Close Button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-white shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          )}

          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl text-primary flex items-center gap-2 truncate"
            >
              <button
                onClick={() => navigate("/admin")}
                className={cn(
                  "h-8 w-8 rounded bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/40 transition-colors border border-primary/30 shrink-0",
                  location === "/admin" && "bg-primary/40 border-primary/60",
                )}
                title="Open Admin Panel"
              >
                <span className="text-primary text-sm font-black">OM</span>
              </button>
              <span className="truncate">JEE '28</span>
            </motion.div>
          )}
          
          {collapsed && !isMobile && (
            <>
              <button
                onClick={() => navigate("/admin")}
                className={cn(
                  "h-8 w-8 rounded bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/40 transition-colors border border-primary/30 shrink-0 mx-auto",
                  location === "/admin" && "bg-primary/40 border-primary/60",
                )}
                title="Open Admin Panel"
              >
                <span className="text-primary text-sm font-black">OM</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="text-muted-foreground hover:text-white shrink-0 mx-auto"
              >
                <ChevronRight />
              </Button>
            </>
          )}

          {!collapsed && !isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto text-muted-foreground hover:text-white shrink-0"
            >
              <ChevronLeft />
            </Button>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {links.map((link) => {
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => isMobile && setIsOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group relative",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
                  )}
                >
                  <link.icon className="h-5 w-5 shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="font-medium whitespace-nowrap">{link.label}</span>
                  )}
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

        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "text-muted-foreground hover:text-white w-full",
              collapsed && !isMobile ? "justify-center" : "justify-start gap-3 px-3",
            )}
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            {(!collapsed || isMobile) && (
              <span className="font-medium text-sm whitespace-nowrap">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
