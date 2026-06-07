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
  Headphones,
  User,
  PenTool,
  Lock,
  Shield,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLockdown } from "@/context/LockdownContext";

function LockdownPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { startLockdown } = useLockdown();

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      startLockdown((hours * 3600000) + (minutes * 60000) + (seconds * 1000));
      onClose();
      setCountdown(null);
    }
  }, [countdown, hours, minutes, seconds, startLockdown, onClose]);

  if (!isOpen) return null;

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[15rem] font-black text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]"
        >
          {countdown}
        </motion.div>
        <p className="text-xl text-white/50 mt-8 font-medium animate-pulse">Entering Hardcore Lockdown...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-orange-500" />
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          Hardcore Lockdown
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          You will only have access to Dashboard, PDF Viewer, and Saves. Exiting fullscreen will reset your streak to zero.
        </p>

        <div className="space-y-4 mb-6">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Duration</label>
          <div className="flex items-center gap-4">
            <div className="flex flex-col flex-1">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Hours</label>
              <Input type="number" min="0" value={hours} onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))} className="bg-muted border-border" />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Mins</label>
              <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="bg-muted border-border" />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Secs</label>
              <Input type="number" min="0" max="59" value={seconds} onChange={e => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="bg-muted border-border" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold" 
            disabled={hours === 0 && minutes === 0 && seconds === 0} 
            onClick={() => setCountdown(3)}
          >
            Start
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [location, navigate] = useLocation();
  const { theme, toggleTheme, logout } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const { isActive: isLockdownActive } = useLockdown();
  const [lockdownPanelOpen, setLockdownPanelOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem("jee_profile_pic") || "");

  useEffect(() => {
    const handleStorage = () => {
      setProfilePic(localStorage.getItem("jee_profile_pic") || "");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
    { href: "/ambient", label: "Zen Mixer", icon: Headphones },
    { href: "/music", label: "Focus Music", icon: Music },
    { href: "/pdf", label: "PDF Viewer", icon: FileText },
    { href: "/video", label: "Videos", icon: Video },
    { href: "/saves", label: "Saves", icon: Bookmark },
    { href: "/movies", label: "Movie Hub", icon: Film },
  ];

  const allowedLockdownLinks = ["/", "/pdf", "/saves"];

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
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-all border-2 border-primary/30 overflow-hidden shrink-0 shadow-sm",
                  location === "/admin" && "border-primary/60 shadow-md",
                  isLockdownActive && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                )}
              </button>
              <span className="truncate text-lg sm:text-xl">JEE '28</span>
            </motion.div>
          )}
          
          {collapsed && !isMobile && (
            <>
              <button
                onClick={() => navigate("/admin")}
                className={cn(
                  "h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-all border-2 border-primary/30 overflow-hidden shrink-0 shadow-sm mx-auto",
                  location === "/admin" && "border-primary/60 shadow-md",
                  isLockdownActive && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                title="Open Admin Panel"
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
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
            const isLocked = isLockdownActive && !allowedLockdownLinks.includes(link.href);

            return (
              <div key={link.href} onClick={() => {
                if (isLocked) {
                  // Silently return to NOT break the fullscreen API which aborts on alerts
                  return;
                }
                if (isMobile) setIsOpen(false);
                navigate(link.href);
              }}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer group relative",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white",
                    isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <link.icon className="h-5 w-5 shrink-0" />
                  )}
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
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 flex-shrink-0 space-y-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLockdownPanelOpen(true)}
            disabled={isLockdownActive}
            className={cn(
              "text-muted-foreground hover:text-white w-full",
              collapsed && !isMobile ? "justify-center" : "justify-start gap-3 px-3",
              isLockdownActive && "text-red-500 opacity-50"
            )}
            title={
              isLockdownActive
                ? "Lockdown active - cannot start another"
                : "Start Hardcore Lockdown Mode"
            }
          >
            <Shield className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && (
              <span className="font-medium text-sm whitespace-nowrap">
                {isLockdownActive ? "Locked Down" : "Lockdown Mode"}
              </span>
            )}
          </Button>

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

      <LockdownPanel isOpen={lockdownPanelOpen} onClose={() => setLockdownPanelOpen(false)} />
    </>
  );
}
