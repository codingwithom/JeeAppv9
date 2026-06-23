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
  Lock,
  Star,
  BookOpen,
  User,
  MoreVertical,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  Menu,
  ChevronRight,
  FileText,
  Image,
  Play,
  Newspaper,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

interface BrowserTab {
  id: string;
  title: string;
  url: string; // e.g. "https://example.com" or "Search: force laws" or "" for NTP
  browserMode: "newtab" | "browse" | "search";
  query: string;
  searchResults: any[];
  iframeUrl: string;
  history: string[];
  historyIndex: number;
  readerMode: boolean;
  scrapedData: any | null;
  loading: boolean;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "1", name: "Google", url: "https://www.google.com" },
  { id: "2", name: "Wikipedia", url: "https://en.wikipedia.org" },
  { id: "3", name: "JEE Main", url: "https://jeemain.nta.ac.in" },
  { id: "4", name: "Maths Help", url: "https://www.wolframalpha.com" },
  { id: "5", name: "Physics Classroom", url: "https://www.physicsclassroom.com" },
  { id: "6", name: "Chemistry Notes", url: "https://www.masterorganicchemistry.com" },
];

export default function AIEngin({ onBack }: { onBack?: () => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    // Initial tab setup
    return [
      {
        id: "initial-tab",
        title: "New Tab",
        url: "",
        browserMode: "newtab",
        query: "",
        searchResults: [],
        iframeUrl: "",
        history: [""],
        historyIndex: 0,
        readerMode: false,
        scrapedData: null,
        loading: false,
      }
    ];
  });
  const [activeTabId, setActiveTabId] = useState("initial-tab");
  const [showTabSwitcherMobile, setShowTabSwitcherMobile] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
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

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updates: Partial<BrowserTab>) => {
    setTabs((prevTabs) => prevTabs.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  const handleAddShortcut = () => {
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;
    let url = newShortcutUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name: newShortcutName.trim(),
      url,
    };
    setShortcuts([...shortcuts, newShortcut]);
    setNewShortcutName("");
    setNewShortcutUrl("");
    setShowAddShortcut(false);
  };

  const handleRemoveShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortcuts(shortcuts.filter((s) => s.id !== id));
  };

  // Multiple tabs controllers
  const createNewTab = (url = "") => {
    const newId = Date.now().toString();
    const newTab: BrowserTab = {
      id: newId,
      title: url ? url.replace(/^https?:\/\/(www\.)?/i, "") : "New Tab",
      url: url,
      browserMode: url ? "browse" : "newtab",
      query: "",
      searchResults: [],
      iframeUrl: url ? `/api/proxy?url=${encodeURIComponent(url)}` : "",
      history: [url],
      historyIndex: 0,
      readerMode: false,
      scrapedData: null,
      loading: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setShowTabSwitcherMobile(false);
  };

  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      // If it's the last tab, reset it instead of closing
      setTabs([
        {
          id: "initial-tab",
          title: "New Tab",
          url: "",
          browserMode: "newtab",
          query: "",
          searchResults: [],
          iframeUrl: "",
          history: [""],
          historyIndex: 0,
          readerMode: false,
          scrapedData: null,
          loading: false,
        },
      ]);
      setActiveTabId("initial-tab");
      return;
    }

    const index = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      const nextActiveIndex = Math.max(0, index - 1);
      setActiveTabId(newTabs[nextActiveIndex].id);
    }
  };

  // Browser Navigation Actions
  const navigateTo = (url: string, addToHistory = true) => {
    let target = url.trim();
    if (!target) return;

    // Detect if this is a web search or a URL
    const isUrl =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i.test(target) ||
      target.includes("localhost") ||
      target.startsWith("http://") ||
      target.startsWith("https://");

    if (!isUrl) {
      handleSearch(target);
      return;
    }

    if (!/^https?:\/\//i.test(target)) {
      target = "https://" + target;
    }

    let newHistory = activeTab.history;
    let newIndex = activeTab.historyIndex;

    if (addToHistory) {
      newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      newHistory.push(target);
      newIndex = newHistory.length - 1;
    }

    updateActiveTab({
      url: target,
      title: target.replace(/^https?:\/\/(www\.)?/i, ""),
      browserMode: "browse",
      iframeUrl: `/api/proxy?url=${encodeURIComponent(target)}`,
      history: newHistory,
      historyIndex: newIndex,
      readerMode: false, // reset reader mode on navigate
      scrapedData: null,
      loading: false,
    });
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    let newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    const searchUrlLabel = `Search: ${searchQuery}`;
    newHistory.push(searchUrlLabel);

    updateActiveTab({
      loading: true,
      query: searchQuery,
      url: searchUrlLabel,
      title: searchQuery,
      browserMode: "search",
      history: newHistory,
      historyIndex: newHistory.length - 1,
      readerMode: false,
    });

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === activeTabId
              ? { ...t, searchResults: data.results || [], loading: false }
              : t
          )
        );
      } else {
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === activeTabId ? { ...t, searchResults: [], loading: false } : t
          )
        );
      }
    } catch (e) {
      console.error("Search API call failed:", e);
      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.id === activeTabId ? { ...t, searchResults: [], loading: false } : t
        )
      );
    }
  };

  const handleGoBack = () => {
    if (activeTab.historyIndex > 0) {
      const prevIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[prevIndex];

      if (prevUrl === "") {
        updateActiveTab({
          browserMode: "newtab",
          url: "",
          title: "New Tab",
          historyIndex: prevIndex,
          readerMode: false,
          scrapedData: null,
        });
      } else if (prevUrl.startsWith("Search: ")) {
        const q = prevUrl.replace("Search: ", "");
        updateActiveTab({
          browserMode: "search",
          url: prevUrl,
          title: q,
          query: q,
          historyIndex: prevIndex,
          readerMode: false,
          scrapedData: null,
          loading: true,
        });
        // Reload search content
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((res) => (res.ok ? res.json() : { results: [] }))
          .then((data) => {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.id === activeTabId
                  ? { ...t, searchResults: data.results || [], loading: false }
                  : t
              )
            );
          });
      } else {
        updateActiveTab({
          browserMode: "browse",
          url: prevUrl,
          title: prevUrl.replace(/^https?:\/\/(www\.)?/i, ""),
          iframeUrl: `/api/proxy?url=${encodeURIComponent(prevUrl)}`,
          historyIndex: prevIndex,
          readerMode: false,
          scrapedData: null,
        });
      }
    }
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[nextIndex];

      if (nextUrl === "") {
        updateActiveTab({
          browserMode: "newtab",
          url: "",
          title: "New Tab",
          historyIndex: nextIndex,
          readerMode: false,
          scrapedData: null,
        });
      } else if (nextUrl.startsWith("Search: ")) {
        const q = nextUrl.replace("Search: ", "");
        updateActiveTab({
          browserMode: "search",
          url: nextUrl,
          title: q,
          query: q,
          historyIndex: nextIndex,
          readerMode: false,
          scrapedData: null,
          loading: true,
        });
        // Reload search content
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((res) => (res.ok ? res.json() : { results: [] }))
          .then((data) => {
            setTabs((prevTabs) =>
              prevTabs.map((t) =>
                t.id === activeTabId
                  ? { ...t, searchResults: data.results || [], loading: false }
                  : t
              )
            );
          });
      } else {
        updateActiveTab({
          browserMode: "browse",
          url: nextUrl,
          title: nextUrl.replace(/^https?:\/\/(www\.)?/i, ""),
          iframeUrl: `/api/proxy?url=${encodeURIComponent(nextUrl)}`,
          historyIndex: nextIndex,
          readerMode: false,
          scrapedData: null,
        });
      }
    }
  };

  const handleReload = () => {
    if (activeTab.readerMode) {
      toggleReaderMode(true);
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleGoHome = () => {
    const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    newHistory.push("");

    updateActiveTab({
      browserMode: "newtab",
      url: "",
      title: "New Tab",
      query: "",
      searchResults: [],
      iframeUrl: "",
      history: newHistory,
      historyIndex: newHistory.length - 1,
      readerMode: false,
      scrapedData: null,
    });
  };

  // Reader Mode scraper fetcher
  const toggleReaderMode = async (forceReload = false) => {
    const shouldActivate = !activeTab.readerMode || forceReload;

    if (shouldActivate) {
      updateActiveTab({ readerMode: true, loading: true });
      try {
        const res = await fetch(
          `/api/scrape?url=${encodeURIComponent(activeTab.url)}`
        );
        if (res.ok) {
          const data = await res.json();
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.id === activeTabId
                ? { ...t, scrapedData: data, loading: false }
                : t
            )
          );
        } else {
          setTabs((prevTabs) =>
            prevTabs.map((t) =>
              t.id === activeTabId
                ? {
                    ...t,
                    loading: false,
                    scrapedData: { error: "Failed to scrape page content." },
                  }
                : t
            )
          );
        }
      } catch (e) {
        setTabs((prevTabs) =>
          prevTabs.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  loading: false,
                  scrapedData: { error: "Could not fetch readable text format." },
                }
              : t
          )
        );
      }
    } else {
      updateActiveTab({ readerMode: false });
    }
  };

  // Render dynamic Google Search Knowledge Panel (Details Card)
  const renderKnowledgePanel = (query: string, results: any[]) => {
    const title = results[0]?.title ? results[0].title.split(" - ")[0].split(" | ")[0] : query;
    let subtitle = "Search Topic";
    
    const qLower = query.toLowerCase();
    if (qLower.includes("mrbeast") || qLower.includes("mr beast")) {
      subtitle = "American YouTuber";
    } else if (qLower.includes("wikipedia") || qLower.includes("wiki")) {
      subtitle = "Online Encyclopedia";
    } else if (qLower.includes("physics") || qLower.includes("chemistry") || qLower.includes("math")) {
      subtitle = "Academic Subject";
    } else if (results[0]?.url) {
      try {
        subtitle = new URL(results[0].url).hostname.replace("www.", "");
      } catch (e) {}
    }

    const desc = results[0]?.snippet || "Information collected from indexed resources regarding the search query.";
    const images = results.map(r => r.thumbnail).filter(t => t && t.startsWith("http"));

    return (
      <div className="border border-border bg-card p-5 rounded-2xl shadow-sm space-y-4 max-w-sm w-full sticky top-4 font-sans select-text">
        {/* Thumbnail gallery */}
        {images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-none rounded-xl h-36">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="thumbnail"
                className="h-full object-cover rounded-lg shrink-0 w-36 border border-border/30 hover:scale-[1.02] transition-transform duration-200"
              />
            ))}
          </div>
        ) : (
          <div className="h-32 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/10">
            <Sparkles className="w-8 h-8 text-indigo-500/35" />
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {results[0] && (
            <button
              onClick={() => navigateTo(results[0].url, true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
            >
              Overview
            </button>
          )}
          {results[1] && (
            <button
              onClick={() => navigateTo(results[1].url, true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer border border-border/50"
            >
              Alternative link
            </button>
          )}
        </div>

        {/* Wikipedia style summary */}
        <div className="border-t border-border/60 pt-4 space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">About</h4>
          <p className="text-xs leading-relaxed text-foreground/90 font-light line-clamp-6">
            {desc}
          </p>

          {/* Social / Info links */}
          <div className="flex items-center gap-2.5 pt-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Profiles:</span>
            {results.slice(0, 4).map((r, idx) => {
              let label = "Website";
              if (r.url.includes("youtube.com")) label = "YouTube";
              else if (r.url.includes("wikipedia.org")) label = "Wikipedia";
              else if (r.url.includes("instagram.com")) label = "Instagram";
              else if (r.url.includes("twitter.com")) label = "Twitter";
              else if (r.url.includes("github.com")) label = "GitHub";

              return (
                <button
                  key={idx}
                  onClick={() => navigateTo(r.url, true)}
                  className="px-2 py-0.5 rounded border border-border text-[9px] hover:bg-muted text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 transition-colors"
                >
                  <Globe className="w-2.5 h-2.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fact metadata list */}
        <div className="border-t border-border/60 pt-4 text-xs space-y-2.5">
          {qLower.includes("mrbeast") || qLower.includes("mr beast") ? (
            <>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Born:</span>
                <span className="font-medium text-foreground text-right">7 May 1998 (age 28 years), Wichita, KS</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Full name:</span>
                <span className="font-medium text-foreground text-right">James Stephen Donaldson</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Height:</span>
                <span className="font-medium text-foreground text-right">1.96 m</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">YouTube Channel:</span>
                <span className="font-semibold text-red-500 hover:underline cursor-pointer" onClick={() => navigateTo("https://www.youtube.com/@MrBeast")}>
                  MrBeast (50.3Cr+ followers)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Domain:</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">
                  {results[0]?.url ? new URL(results[0].url).hostname : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium text-foreground">{subtitle}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/20">
                <span className="text-muted-foreground">Search Source:</span>
                <span className="font-medium text-foreground">Strome Web indexing</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Safety status:</span>
                <span className="font-medium text-green-500 flex items-center gap-0.5">
                  <Lock className="w-3 h-3" /> Secure proxy
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Google-style People Also Ask Accordion
  const renderPeopleAlsoAsk = (query: string) => {
    const questions = [
      {
        q: `What is the primary topic of ${query}?`,
        a: `${query} refers to the popular search subject currently queried on the Strome Browser. You can load direct pages from the results to explore comprehensive textbooks, guides, and academic papers.`
      },
      {
        q: `How do I view websites directly for ${query}?`,
        a: `Simply click any of the blue page titles in the search results list. Strome will automatically route the site through a secure local proxy to bypass browser iframe blockers (X-Frame-Options/CORS) and load it natively.`
      },
      {
        q: `Is ${query} related information secure?`,
        a: `Yes! All websites loaded via the Strome Search engine run through a sandboxed local proxy node (0.0.0.0), stripping tracking cookies and frame-blocking scripts while keeping your main browsing session protected.`
      }
    ];

    return (
      <div className="border border-border/60 rounded-2xl p-4 bg-muted/10 space-y-3 font-sans w-full">
        <h4 className="text-sm font-semibold text-foreground">People also ask</h4>
        <div className="divide-y divide-border/50">
          {questions.map((item, idx) => (
            <details key={idx} className="group py-2.5 outline-none cursor-pointer">
              <summary className="flex justify-between items-center text-xs font-medium text-foreground/90 hover:text-primary transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-180 text-[9px]">▼</span>
              </summary>
              <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed pl-1 font-light cursor-text">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    );
  };

  // Render search results like Google Search page
  const renderSearchResultsView = (tab: BrowserTab) => {
    if (tab.loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
          <RotateCw className="w-8 h-8 text-primary animate-spin mb-3" />
          <span className="text-sm text-muted-foreground animate-pulse">
            Strome indexing educational resources...
          </span>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-background text-foreground select-text pb-12">
        {/* Google style category tab bar */}
        <div className="border-b border-border/60 bg-muted/15 px-4 md:px-36 py-2.5 flex items-center gap-6 text-xs text-muted-foreground overflow-x-auto shrink-0 scrollbar-none select-none">
          <span className="text-primary font-bold border-b-2 border-primary pb-2 px-1 cursor-default shrink-0 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> All
          </span>
          <span className="pb-2 hover:text-foreground cursor-pointer shrink-0 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5 text-muted-foreground/80" /> Images
          </span>
          <span className="pb-2 hover:text-foreground cursor-pointer shrink-0 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-muted-foreground/80" /> Videos
          </span>
          <span className="pb-2 hover:text-foreground cursor-pointer shrink-0 flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-muted-foreground/80" /> News
          </span>
          <span className="pb-2 hover:text-foreground cursor-pointer shrink-0 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground/80" /> Shopping
          </span>
          <span className="pb-2 hover:text-foreground cursor-pointer shrink-0 flex items-center gap-1.5">
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground/80" /> More
          </span>
        </div>

        {/* Double-column search results content layout */}
        <div className="max-w-7xl mx-auto px-4 md:px-36 py-4 flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left column: main results list */}
          <div className="flex-1 w-full space-y-6">
            {/* Summary Stats */}
            <p className="text-xs text-muted-foreground font-light">
              About {tab.searchResults.length} results (
              {((tab.searchResults.length * 28) / 1000).toFixed(2)} seconds)
            </p>

            {/* AI Answer Summary Box */}
            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                  Strome Answer
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                Here are search results for <strong className="font-semibold text-indigo-500">"{tab.query}"</strong>. 
                Clicking a title will open the website. If a site fails to render due to iframe blockades, 
                click the <strong className="font-semibold text-indigo-500">Reader Mode</strong> book icon at the top of the browser to view clean scraped text.
              </p>
            </div>

            {/* People Also Ask accordion widget */}
            {tab.searchResults.length > 0 && renderPeopleAlsoAsk(tab.query)}

            {/* Results List */}
            <div className="space-y-6 pt-2">
              {tab.searchResults.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Globe className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
                  <h3 className="font-bold text-sm">No indexed pages found</h3>
                  <p className="text-xs mt-1">
                    Try typing a direct website URL or changing your search terms.
                  </p>
                </div>
              ) : (
                tab.searchResults.map((item, idx) => (
                  <div key={idx} className="group space-y-1.5 max-w-2xl select-text">
                    {/* URL */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/80 truncate">
                      <div className="w-4.5 h-4.5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-foreground">
                        {item.url ? new URL(item.url).hostname.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span
                        className="truncate hover:underline cursor-pointer font-sans"
                        onClick={() => navigateTo(item.url, true)}
                      >
                        {item.url}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg md:text-xl font-medium text-blue-600 dark:text-[#8ab4f8] group-hover:underline cursor-pointer leading-tight">
                      <button
                        onClick={() => navigateTo(item.url, true)}
                        className="text-left font-sans font-normal"
                      >
                        {item.title}
                      </button>
                    </h3>

                    {/* Snippet */}
                    <p className="text-sm text-muted-foreground/90 leading-relaxed font-sans font-light line-clamp-3">
                      {item.snippet}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column: Sticky Knowledge Graph Panel */}
          {tab.searchResults.length > 0 && (
            <div className="w-full md:w-80 lg:w-96 shrink-0 md:sticky md:top-4">
              {renderKnowledgePanel(tab.query, tab.searchResults)}
            </div>
          )}

        </div>
      </div>
    );
  };

  // Render Reader Mode beautiful text content
  const renderReaderView = (tab: BrowserTab) => {
    if (tab.loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card">
          <RotateCw className="w-8 h-8 text-primary animate-spin mb-3" />
          <span className="text-sm text-muted-foreground animate-pulse">
            Extracting main web article text and images...
          </span>
        </div>
      );
    }

    const data = tab.scrapedData;
    if (!data || data.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card">
          <BookOpen className="w-12 h-12 text-destructive mb-3 opacity-60" />
          <h3 className="text-base font-bold mb-1">Reader Mode Unavailable</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            {data?.error || "We couldn't scrape readable content from this site. Standard Web View might work."}
          </p>
          <Button size="sm" onClick={() => updateActiveTab({ readerMode: false })}>
            Switch to Web View
          </Button>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto bg-[#fafafa] dark:bg-[#18181c] text-[#333] dark:text-[#e3e3e6] transition-colors p-6 md:p-12">
        <div className="max-w-2xl mx-auto space-y-6 select-text pb-12">
          {/* Toggle panel */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Reader Mode Active</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateActiveTab({ readerMode: false })}
              className="h-7 text-xs gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" /> Web View
            </Button>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4.5xl font-extrabold leading-tight tracking-tight font-serif text-foreground">
            {data.title || tab.title}
          </h1>

          {/* Source Link */}
          <div className="text-xs text-muted-foreground font-mono">
            Origin:{" "}
            <a
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {tab.url}
            </a>
          </div>

          {/* Text Content */}
          <div className="font-serif leading-relaxed text-base md:text-lg space-y-5 pt-5 border-t border-border/40 text-foreground/90">
            {data.text ? (
              data.text.split("\n\n").map((para: string, idx: number) => {
                const trimmed = para.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith("###")) {
                  return (
                    <h3
                      key={idx}
                      className="text-lg font-bold pt-4 text-foreground font-sans"
                    >
                      {trimmed.replace("###", "")}
                    </h3>
                  );
                } else if (trimmed.startsWith("##")) {
                  return (
                    <h2
                      key={idx}
                      className="text-xl font-bold pt-6 text-foreground font-sans"
                    >
                      {trimmed.replace("##", "")}
                    </h2>
                  );
                } else if (trimmed.startsWith("#")) {
                  return (
                    <h1
                      key={idx}
                      className="text-2xl font-bold pt-8 text-foreground font-sans"
                    >
                      {trimmed.replace("#", "")}
                    </h1>
                  );
                }

                return (
                  <p key={idx} className="indent-0 md:indent-4">
                    {trimmed}
                  </p>
                );
              })
            ) : (
              <p className="text-muted-foreground italic">No article text detected.</p>
            )}
          </div>

          {/* Extracted Links */}
          {data.links && data.links.length > 0 && (
            <div className="pt-8 mt-8 border-t border-border/80 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
                Extracted Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.links.map((link: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => navigateTo(link.url, true)}
                    className="flex items-start gap-2 p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted text-left text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">
                        {link.text || "Untitled Hyperlink"}
                      </div>
                      <div className="text-muted-foreground/60 truncate font-mono text-[9px]">
                        {link.url}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Google Chrome homepage NTP
  const renderNTP = (tab: BrowserTab) => {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-background overflow-y-auto select-none">
        {/* Google-colored "Strome" logo */}
        <div className="mb-8 flex items-center justify-center font-bold tracking-tight text-5.5xl md:text-7xl select-none font-sans drop-shadow-sm">
          <span className="text-[#4285F4]">S</span>
          <span className="text-[#EA4335]">t</span>
          <span className="text-[#FBBC05]">r</span>
          <span className="text-[#4285F4]">o</span>
          <span className="text-[#34A853]">m</span>
          <span className="text-[#EA4335]">e</span>
        </div>

        {/* Large Pill Search bar */}
        <div className="w-full max-w-xl mb-9 relative">
          <Search className="absolute left-4.5 top-3.5 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={tab.query}
            onChange={(e) => updateActiveTab({ query: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(tab.query)}
            placeholder="Search Google or enter web URL"
            className="h-12 pl-12 pr-12 rounded-full border border-border bg-card shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:ring-1 focus:ring-primary text-sm font-normal w-full transition-all text-foreground font-sans"
          />
          {tab.query.trim().length > 0 && (
            <button
              onClick={() => updateActiveTab({ query: "" })}
              className="absolute right-4.5 top-3.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Shortcuts grid */}
        <div className="w-full max-w-xl flex flex-wrap gap-5 justify-center">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              onClick={() => navigateTo(shortcut.url)}
              className="group w-20 h-20 flex flex-col items-center justify-center bg-card hover:bg-accent/40 border border-border/40 hover:border-border rounded-2xl cursor-pointer p-2 relative shadow-sm hover:shadow-md transition-all duration-150"
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleRemoveShortcut(shortcut.id, e)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-muted/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground font-semibold text-xs flex items-center justify-center mb-1.5 shadow-inner group-hover:scale-105 transition-transform duration-200">
                {shortcut.name.charAt(0).toUpperCase()}
              </div>

              <span className="text-[10px] font-medium text-center truncate w-full text-foreground/80 group-hover:text-foreground">
                {shortcut.name}
              </span>
            </div>
          ))}

          {/* Add Shortcut tile */}
          <button
            onClick={() => setShowAddShortcut(true)}
            className="w-20 h-20 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 border border-dashed border-border rounded-2xl cursor-pointer p-2 transition-all duration-150 text-muted-foreground hover:text-foreground"
          >
            <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center mb-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-center">Add shortcut</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col bg-background text-foreground select-none relative overflow-hidden w-full h-full",
        fullscreen && "fixed inset-0 z-[250]"
      )}
    >
      {/* 1. CHROME DESKTOP UI */}
      {!isMobile && (
        <>
          {/* Tab bar header */}
          <div className="h-10 bg-[#dee1e6] dark:bg-[#1e1f22] border-b border-border/80 flex items-end px-3 justify-between gap-4 flex-shrink-0 z-20">
            <div className="flex items-end gap-1 overflow-x-auto scrollbar-none flex-1 max-w-[85%]">
              {/* Back to select page */}
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 px-2 font-bold text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg mb-1 shrink-0 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}

              {tabs.map((tab) => {
                const isTabActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setShowTabSwitcherMobile(false);
                    }}
                    className={cn(
                      "relative h-[32px] px-3.5 flex items-center gap-2 text-xs font-normal cursor-pointer select-none transition-all duration-100 truncate group border-r border-[#cfd2d6] dark:border-border/30 rounded-t-lg",
                      isTabActive
                        ? "bg-background text-foreground border-t border-x border-border/60 shadow-sm z-10"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    style={{ minWidth: "120px", maxWidth: "170px" }}
                  >
                    {tab.browserMode === "newtab" ? (
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1 font-medium select-none">
                      {tab.title}
                    </span>
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}

              {/* Plus Tab Button */}
              <button
                onClick={() => createNewTab()}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted-foreground/15 mb-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Window buttons mockup */}
            <div className="flex items-center gap-1.5 mb-2 shrink-0">
              <div
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors cursor-pointer"
                onClick={onBack}
                title="Exit Browser"
              />
              <div
                className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-600 transition-colors cursor-pointer"
                onClick={() => createNewTab()}
                title="Minimize / New Tab"
              />
              <div
                className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-600 transition-colors cursor-pointer"
                onClick={() => setFullscreen(!fullscreen)}
                title="Fullscreen Toggle"
              />
            </div>
          </div>

          {/* Browser Navigation Toolbar */}
          <div className="h-11 bg-background border-b border-border/80 flex items-center px-3.5 justify-between gap-3 flex-shrink-0 z-20">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleGoBack}
                disabled={activeTab.historyIndex <= 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleGoForward}
                disabled={activeTab.historyIndex >= activeTab.history.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleReload}
                disabled={activeTab.browserMode === "newtab"}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleGoHome}
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            {/* Address Bar */}
            <div className="flex-1 max-w-3xl flex items-center relative">
              {/* Lock Button */}
              <button
                onClick={() => setShowInfoDropdown(!showInfoDropdown)}
                className="absolute left-3 p-1 rounded hover:bg-muted text-muted-foreground shrink-0 z-10"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>

              <input
                type="text"
                value={
                  activeTab.browserMode === "newtab"
                    ? activeTab.query
                    : activeTab.query || activeTab.url
                }
                onChange={(e) => {
                  updateActiveTab({ query: e.target.value });
                  if (activeTab.browserMode === "newtab") {
                    updateActiveTab({ url: e.target.value });
                  }
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  navigateTo(activeTab.query || activeTab.url)
                }
                placeholder="Search Google or enter web URL"
                className="h-8 pl-9 pr-24 bg-[#f1f3f4] dark:bg-[#202124] border border-transparent rounded-full focus-visible:ring-1 focus-visible:ring-primary w-full text-xs font-normal shadow-sm focus:outline-none focus:ring-0 text-foreground font-sans"
              />

              {/* Loader, Reader and Bookmark inside address bar */}
              <div className="absolute right-3 flex items-center gap-1.5">
                {activeTab.loading ? (
                  <RotateCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                ) : activeTab.browserMode !== "newtab" ? (
                  <button
                    onClick={() => toggleReaderMode()}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    title={
                      activeTab.readerMode
                        ? "Switch to Web View"
                        : "Switch to Reader Mode"
                    }
                  >
                    <BookOpen
                      className={cn(
                        "w-4 h-4",
                        activeTab.readerMode && "text-primary fill-primary/10"
                      )}
                    />
                  </button>
                ) : null}

                {/* Bookmark Icon */}
                <button
                  onClick={() => {
                    if (activeTab.browserMode !== "newtab") {
                      // Save shortcut to localStorage list
                      const exists = shortcuts.find(
                        (s) => s.url === activeTab.url
                      );
                      if (!exists) {
                        setShortcuts([
                          ...shortcuts,
                          {
                            id: Date.now().toString(),
                            name: activeTab.title,
                            url: activeTab.url,
                          },
                        ]);
                      }
                    }
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-yellow-500 transition-colors"
                  title="Bookmark this page"
                >
                  <Star className="w-4 h-4" />
                </button>
              </div>

              {/* Secure Info Popup */}
              {showInfoDropdown && (
                <div
                  className="absolute left-0 top-10 z-[300] bg-card border border-border rounded-xl shadow-2xl p-4 w-72 flex flex-col gap-2 font-sans"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-2.5 pb-2 border-b border-border/40">
                    <Lock className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-xs text-foreground">
                        Connection is secure
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Your information is private when loaded through the Strome Proxy.
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 flex flex-col gap-1 mt-1">
                    <span>
                      <strong>URL:</strong> {activeTab.url || "New Tab"}
                    </span>
                    <span>
                      <strong>Proxy Node:</strong> 0.0.0.0 (Local Sandbox)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] mt-1.5 rounded-lg"
                    onClick={() => setShowInfoDropdown(false)}
                  >
                    Close info
                  </Button>
                </div>
              )}
            </div>

            {/* Extension/Menu controls */}
            <div className="flex items-center gap-1.5 relative">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {/* Chrome Dropdown Menu Mockup */}
              {showMenuDropdown && (
                <div
                  className="absolute right-0 top-8 z-[300] bg-card border border-border rounded-xl shadow-2xl py-1.5 w-52 flex flex-col font-sans text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      createNewTab();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                  >
                    <span>New tab</span>
                    <span className="text-[10px] text-muted-foreground">Ctrl+T</span>
                  </button>
                  {activeTab.browserMode !== "newtab" && (
                    <button
                      onClick={() => {
                        toggleReaderMode();
                        setShowMenuDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                    >
                      <span>Toggle Reader Mode</span>
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleGoHome();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted"
                  >
                    Go to Homepage
                  </button>
                  <button
                    onClick={() => {
                      setFullscreen(!fullscreen);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                  >
                    <span>Fullscreen</span>
                    <span className="text-[10px] text-muted-foreground">F11</span>
                  </button>
                  <hr className="border-border/40 my-1" />
                  <button
                    onClick={() => {
                      setTabs(tabs.filter((t) => t.id === activeTabId));
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-destructive hover:bg-destructive/5"
                  >
                    Close other tabs
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bookmarks Bar */}
          <div className="h-8 bg-background border-b border-border/40 px-4 flex items-center gap-4 flex-shrink-0 z-10 select-none text-[11px] text-muted-foreground overflow-x-auto scrollbar-none font-sans font-medium">
            <span className="flex items-center gap-1 text-foreground border-r border-border/40 pr-3 mr-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> Bookmarks:
            </span>
            {shortcuts.slice(0, 7).map((s) => (
              <button
                key={s.id}
                onClick={() => navigateTo(s.url)}
                className="hover:text-foreground flex items-center gap-1.5 hover:underline shrink-0 max-w-[120px] truncate"
              >
                <Globe className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 2. CHROME MOBILE / PHONE UI */}
      {isMobile && (
        <div className="h-14 bg-background border-b border-border flex items-center px-3 justify-between gap-2.5 flex-shrink-0 z-20">
          {/* Home button mobile */}
          <button
            onClick={handleGoHome}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Address search box mobile */}
          <div className="flex-1 flex items-center bg-[#f1f3f4] dark:bg-[#202124] rounded-full border border-transparent px-3 py-1.5 gap-2 relative">
            <Lock className="w-3.5 h-3.5 text-muted-foreground/75 shrink-0" />
            <input
              type="text"
              value={
                activeTab.browserMode === "newtab"
                  ? activeTab.query
                  : activeTab.query || activeTab.url
              }
              onChange={(e) => {
                updateActiveTab({ query: e.target.value });
                if (activeTab.browserMode === "newtab") {
                  updateActiveTab({ url: e.target.value });
                }
              }}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                navigateTo(activeTab.query || activeTab.url)
              }
              placeholder="Search or type URL"
              className="bg-transparent border-none text-xs w-full focus:outline-none focus:ring-0 text-foreground font-normal placeholder:text-muted-foreground/60 p-0 font-sans"
            />

            {/* Address controls mobile */}
            <div className="flex items-center gap-2 shrink-0">
              {activeTab.loading ? (
                <RotateCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : activeTab.browserMode !== "newtab" ? (
                <button
                  onClick={() => toggleReaderMode()}
                  className="text-muted-foreground hover:text-primary"
                >
                  <BookOpen
                    className={cn(
                      "w-3.5 h-3.5",
                      activeTab.readerMode && "text-primary fill-primary/10"
                    )}
                  />
                </button>
              ) : null}
            </div>
          </div>

          {/* Mobile tab counter */}
          <button
            onClick={() => setShowTabSwitcherMobile(!showTabSwitcherMobile)}
            className="w-6 h-6 border-2 border-foreground/60 rounded-md flex items-center justify-center text-xs font-bold text-foreground/80 shrink-0 hover:bg-muted select-none"
          >
            {tabs.length}
          </button>

          {/* 3-dots Menu Mobile */}
          <button
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Mobile dropdown menu */}
          {showMenuDropdown && (
            <div
              className="absolute right-3 top-12 z-[300] bg-card border border-border rounded-xl shadow-2xl py-1.5 w-48 flex flex-col font-sans text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  createNewTab();
                  setShowMenuDropdown(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
              >
                <span>New tab</span>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {activeTab.browserMode !== "newtab" && (
                <button
                  onClick={() => {
                    toggleReaderMode();
                    setShowMenuDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-muted"
                >
                  Reader View
                </button>
              )}
              <button
                onClick={() => {
                  handleGoHome();
                  setShowMenuDropdown(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                Go Home
              </button>
              <button
                onClick={() => {
                  if (onBack) onBack();
                  setShowMenuDropdown(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted border-t border-border/40 text-destructive"
              >
                Exit Browser
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Tab Switcher Grid Overlay */}
      <AnimatePresence>
        {isMobile && showTabSwitcherMobile && (
          <div className="absolute inset-0 bg-[#eef1f6] dark:bg-[#111214] z-[999] flex flex-col p-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0 font-sans">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">Open Tabs ({tabs.length})</span>
              </div>
              <button
                onClick={() => setShowTabSwitcherMobile(false)}
                className="p-1 rounded-full bg-card shadow-sm text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Tabs */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-20 select-none">
              {tabs.map((tab) => {
                const isTabActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setShowTabSwitcherMobile(false);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border border-border bg-card hover:border-primary/50 cursor-pointer flex flex-col justify-between h-32 relative shadow-sm hover:shadow-md transition-all duration-200",
                      isTabActive && "border-2 border-primary ring-1 ring-primary/20"
                    )}
                  >
                    {/* Close Tab inside tab preview */}
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-muted/80 text-muted-foreground hover:text-destructive z-10 shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-1 pr-6 flex-1">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground shrink-0 shadow-inner">
                        {tab.browserMode === "newtab" ? (
                          <Home className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <h4 className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2 pt-1 font-sans">
                        {tab.title}
                      </h4>
                    </div>

                    <span className="text-[9px] text-muted-foreground truncate w-full pt-1.5 border-t border-border/30 font-sans font-light">
                      {tab.browserMode === "newtab" ? "New Tab" : tab.url}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* New Tab Panel */}
            <div className="absolute bottom-4 left-4 right-4 shrink-0 font-sans">
              <Button
                onClick={() => createNewTab()}
                className="w-full rounded-full gap-2 font-bold py-5 text-sm shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" /> New Tab
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. BROWSER VIEWPORT CONTAINER */}
      <div className="flex-1 relative w-full overflow-hidden bg-background">
        {/* Warning notification banner if user opens web pages that might block iframes */}
        {activeTab.browserMode === "browse" && !activeTab.readerMode && (
          <div className="h-6.5 bg-muted/20 border-b border-border/40 px-3 flex items-center justify-between text-[10px] text-muted-foreground flex-shrink-0 font-sans font-light">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>If this website appears blank, click the Book icon in the URL bar to launch Reader Mode.</span>
            </span>
            <button
              onClick={() => toggleReaderMode()}
              className="text-primary hover:underline font-semibold"
            >
              Enable Reader Mode
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab.browserMode === "newtab" ? (
            /* NTP Tab Homepage */
            <motion.div
              key={`${activeTabId}-newtab`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              {renderNTP(activeTab)}
            </motion.div>
          ) : activeTab.browserMode === "search" ? (
            /* Search Results Tab View */
            <motion.div
              key={`${activeTabId}-search`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              {renderSearchResultsView(activeTab)}
            </motion.div>
          ) : (
            /* Browse Iframe View or Reader View */
            <motion.div
              key={`${activeTabId}-browse`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full flex"
            >
              {activeTab.readerMode ? (
                renderReaderView(activeTab)
              ) : (
                <div className="flex-1 h-full relative bg-card flex flex-col">
                  {activeTab.loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/65 backdrop-blur-sm z-10">
                      <div className="flex flex-col items-center gap-3">
                        <RotateCw className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          Loading page through secure proxy...
                        </span>
                      </div>
                    </div>
                  )}
                  {activeTab.iframeUrl ? (
                    <iframe
                      ref={iframeRef}
                      src={activeTab.iframeUrl}
                      className="w-full flex-1 border-0 bg-white"
                      title="Browser viewport"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                      <Globe className="w-12 h-12 text-muted-foreground/35 mb-3" />
                      <h3 className="font-semibold text-sm mb-1 text-foreground/80">
                        No Page Loaded
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                        Enter a search query or URL in the bar at the top to browse.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Shortcut Dialog Modal */}
      <AnimatePresence>
        {showAddShortcut && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4 font-sans text-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-full max-w-sm flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                <h3 className="font-bold text-sm text-foreground">Add shortcut</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowAddShortcut(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Name
                  </label>
                  <Input
                    value={newShortcutName}
                    onChange={(e) => setNewShortcutName(e.target.value)}
                    placeholder="e.g. Google"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    URL
                  </label>
                  <Input
                    value={newShortcutUrl}
                    onChange={(e) => setNewShortcutUrl(e.target.value)}
                    placeholder="e.g. google.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddShortcut(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddShortcut}>
                  Add shortcut
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
