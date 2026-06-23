import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "1", name: "Google", url: "https://www.google.com" },
  { id: "2", name: "Wikipedia", url: "https://en.wikipedia.org" },
  { id: "3", name: "JEE Main", url: "https://jeemain.nta.ac.in" },
  { id: "4", name: "Maths", url: "https://www.wolframalpha.com" },
  { id: "5", name: "Physics", url: "https://www.physicsclassroom.com" },
  { id: "6", name: "Chemistry", url: "https://www.masterorganicchemistry.com" },
];

export default function AIEngin({ onBack }: { onBack?: () => void }) {
  const [query, setQuery] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [browserMode, setBrowserMode] = useState<"newtab" | "browse">("newtab");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [iframeUrl, setIframeUrl] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Shortcut management
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const saved = localStorage.getItem("jee_browser_shortcuts");
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  });
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState("");
  const [newShortcutUrl, setNewShortcutUrl] = useState("");

  useEffect(() => {
    localStorage.setItem("jee_browser_shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  const handleAddShortcut = () => {
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;
    let url = newShortcutUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name: newShortcutName.trim(),
      url
    };
    setShortcuts([...shortcuts, newShortcut]);
    setNewShortcutName("");
    setNewShortcutUrl("");
    setShowAddShortcut(false);
  };

  const handleRemoveShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortcuts(shortcuts.filter(s => s.id !== id));
  };

  // Browser Navigation Actions
  const navigateTo = (url: string, addToHistory = true) => {
    let target = url.trim();
    if (!target) return;

    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i.test(target) || target.includes("localhost");
    if (!isUrl) {
      handleSearch(target);
      return;
    }

    if (!/^https?:\/\//i.test(target)) {
      target = "https://" + target;
    }

    setCurrentUrl(target);
    setIframeUrl(`/api/proxy?url=${encodeURIComponent(target)}`);
    setBrowserMode("browse");

    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(target);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setBrowserMode("browse");
    setQuery(searchQuery);
    setCurrentUrl(`Search: ${searchQuery}`);
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        if (data.results && data.results.length > 0) {
          navigateTo(data.results[0].url, true);
        } else {
          setIframeUrl("");
        }
      }
    } catch (e) {
      console.error("Search API call failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevUrl = history[prevIndex];
      setCurrentUrl(prevUrl);
      setIframeUrl(`/api/proxy?url=${encodeURIComponent(prevUrl)}`);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextUrl = history[nextIndex];
      setCurrentUrl(nextUrl);
      setIframeUrl(`/api/proxy?url=${encodeURIComponent(nextUrl)}`);
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleGoHome = () => {
    setBrowserMode("newtab");
    setCurrentUrl("");
    setIframeUrl("");
    setQuery("");
    setSearchResults([]);
  };

  return (
    <div className={className("w-full h-full flex flex-col bg-background text-foreground select-none relative overflow-hidden", fullscreen && "fixed inset-0 z-50")}>
      
      {/* Chrome Desktop-like Frame Header */}
      <div className="h-11 bg-muted/65 border-b border-border/60 flex items-center px-4 justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Windows-like Control Dots */}
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors cursor-pointer" onClick={handleGoHome} />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-600 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-600 transition-colors cursor-pointer" onClick={() => setFullscreen(!fullscreen)} />
          </div>

          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 font-bold text-xs gap-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground mr-1.5 transition-all">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}

          {/* Tab Element */}
          <div className={className(
            "h-8 px-4 rounded-t-lg bg-background border-t border-x border-border/85 flex items-center gap-2 text-[10px] font-medium w-40 shadow-sm relative top-[5px] truncate cursor-default border-b-transparent",
            browserMode === "newtab" && "opacity-90"
          )}>
            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-1">
              {browserMode === "newtab" ? "New Tab" : currentUrl.replace(/^https?:\/\/(www\.)?/i, "")}
            </span>
            {browserMode !== "newtab" && (
              <X className="w-3 h-3 text-muted-foreground hover:bg-accent rounded-sm cursor-pointer flex-shrink-0" onClick={handleGoHome} />
            )}
          </div>
        </div>

        {/* Address Bar Row */}
        <div className="flex-1 max-w-3xl flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack} disabled={historyIndex <= 0}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoForward} disabled={historyIndex >= history.length - 1}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReload} disabled={browserMode === "newtab"}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoHome}>
            <Home className="h-4 w-4" />
          </Button>

          {/* Unified Search / URL input bar */}
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query || currentUrl}
              onChange={(e) => {
                setQuery(e.target.value);
                if (browserMode === "newtab") setCurrentUrl(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && navigateTo(query || currentUrl)}
              placeholder="Search Google or enter URL"
              className="h-8 pl-8 pr-8 bg-background border border-border/80 rounded-full focus-visible:ring-1 focus-visible:ring-primary w-full text-xs font-normal shadow-sm focus:outline-none focus:ring-0"
            />
            {browserMode === "browse" && (
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute right-2.5 p-1 rounded hover:bg-accent text-muted-foreground"
                title="Toggle Search Sidebar"
              >
                {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {browserMode === "newtab" ? (
            /* Chrome Desktop Homepage */
            <motion.div
              key="newtab-homepage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background via-background to-accent/10 overflow-y-auto"
            >
              {/* Google-like Premium Logo */}
              <div className="mb-8 select-none flex items-center justify-center font-bold tracking-tight text-5xl md:text-6xl font-sans">
                <span className="text-blue-500">A</span>
                <span className="text-red-500">I</span>
                <span className="text-yellow-500 mx-2">─</span>
                <span className="text-blue-500">E</span>
                <span className="text-green-500">n</span>
                <span className="text-red-500">g</span>
                <span className="text-blue-500">i</span>
                <span className="text-yellow-500">n</span>
              </div>

              {/* Large Chrome Search Bar */}
              <div className="w-full max-w-xl mb-10 relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                  placeholder="Search using AI-optimized crawler or enter website URL..."
                  className="h-12 pl-12 pr-12 rounded-full border border-border bg-card shadow-lg hover:shadow-xl focus:shadow-xl transition-all focus-visible:ring-1 focus-visible:ring-primary text-sm font-normal focus:outline-none focus:ring-0"
                />
                {query.trim().length > 0 && (
                  <X className="absolute right-4 top-3.5 h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setQuery("")} />
                )}
              </div>

              {/* Custom Desktop Shortcuts Grid */}
              <div className="w-full max-w-2xl flex flex-wrap gap-6 justify-center">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    onClick={() => navigateTo(shortcut.url)}
                    className="group w-24 h-24 flex flex-col items-center justify-center bg-card/45 hover:bg-card border border-border/40 hover:border-border rounded-xl cursor-pointer p-2 relative shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <button
                      onClick={(e) => handleRemoveShortcut(shortcut.id, e)}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-muted/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm mb-2 shadow-inner group-hover:scale-105 transition-transform duration-200">
                      {shortcut.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <span className="text-[11px] font-medium text-center truncate w-full text-foreground/80 group-hover:text-foreground">
                      {shortcut.name}
                    </span>
                  </div>
                ))}

                {/* Add Shortcut circular button */}
                <button
                  onClick={() => setShowAddShortcut(true)}
                  className="w-24 h-24 flex flex-col items-center justify-center bg-muted/40 hover:bg-muted border border-dashed border-border/80 rounded-xl cursor-pointer p-2 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-2 shadow-sm">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground text-center">Add shortcut</span>
                </button>
              </div>

              {/* Add Shortcut Dialog Modal */}
              <AnimatePresence>
                {showAddShortcut && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h3 className="font-semibold text-sm">Add shortcut</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddShortcut(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">Name</label>
                          <Input value={newShortcutName} onChange={e => setNewShortcutName(e.target.value)} placeholder="e.g. Google" className="h-9 text-xs" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">URL</label>
                          <Input value={newShortcutUrl} onChange={e => setNewShortcutUrl(e.target.value)} placeholder="e.g. google.com" className="h-9 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAddShortcut(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleAddShortcut}>Add</Button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Arc-like browser layout split view */
            <motion.div
              key="browse-viewport"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex w-full h-full bg-background"
            >
              {/* Collapsible Search Results Drawer / Sidebar */}
              <AnimatePresence>
                {sidebarOpen && searchResults.length > 0 && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-full border-r border-border bg-card/65 flex flex-col flex-shrink-0"
                  >
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Search Results</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSidebarOpen(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                      {searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          onClick={() => navigateTo(result.url, true)}
                          className={className(
                            "p-2.5 rounded-lg border border-border/40 hover:border-primary/40 bg-background/50 hover:bg-primary/5 cursor-pointer transition-all duration-200",
                            currentUrl === result.url && "border-primary bg-primary/5"
                          )}
                        >
                          <h4 className="text-xs font-semibold text-primary truncate hover:underline mb-1">
                            {result.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {result.snippet}
                          </p>
                          <span className="text-[8px] text-muted-foreground/60 truncate block mt-1">
                            {result.url}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Web Page View Iframe */}
              <div className="flex-1 h-full relative bg-card shadow-inner flex flex-col">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-3">
                      <RotateCw className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Loading secure page preview...</span>
                    </div>
                  </div>
                ) : null}
                {iframeUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={iframeUrl}
                    className="w-full flex-1 border-0 bg-white"
                    title="Browser viewport"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <Globe className="w-12 h-12 text-muted-foreground/45 mb-3" />
                    <h3 className="font-semibold text-sm mb-1 text-foreground/80">No active page</h3>
                    <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                      Enter a URL or search query in the address bar at the top to load a site securely through the AI Engine proxy.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Utility className helper inline
function className(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
