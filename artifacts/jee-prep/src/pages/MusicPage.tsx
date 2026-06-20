import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { useMusicContext, Song } from "@/context/MusicContext";
import { useAppContext } from "@/context/AppContext";
import { getInvidiousInstances, getPipedInstances } from "@/utils/youtube";
import { fetchPlaylistClientSide } from "@/utils/search";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music, Plus, Play, Pause, Trash2, Upload, Link2, X,
  Library, ChevronRight, Pencil, Check, Clock, Youtube, Loader2, Radio, Search, MoreVertical,
} from "lucide-react";

// Prevent browser tab throttling/pausing for media players by spoofing page visibility
try {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    window.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);
  }
} catch (e) {}

const GRADIENTS = [
  ["from-purple-800","to-indigo-900"],
  ["from-blue-800","to-cyan-900"],
  ["from-green-800","to-emerald-900"],
  ["from-rose-800","to-pink-900"],
  ["from-orange-800","to-amber-900"],
  ["from-teal-800","to-cyan-900"],
];
function getGrad(name: string) { return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length]; }

function formatTime(s: number) {
  if (!isFinite(s) || s <= 0) return "—";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/embed\/([^?#]+)/,
    /youtube\.com\/shorts\/([^?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractYouTubePlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([^&#]+)/);
  return m ? m[1] : null;
}


// ─── Dropdown Components ──────────────────────────────────────────────────────
function ThreeDotMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative flex items-center shrink-0" ref={ref} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} className="p-1 text-muted-foreground hover:text-foreground outline-none transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-1 w-44 bg-card border border-border rounded-md shadow-xl z-[300] py-1 flex flex-col">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, shortcut, destructive }: any) {
  return (
    <button onClick={(e) => { onClick(e); }} className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-muted ${destructive ? 'text-destructive hover:text-destructive' : 'text-foreground'}`}>
      <div className="flex items-center gap-2">{Icon && <Icon className="h-3.5 w-3.5" />}<span>{label}</span></div>
      {shortcut && <span className="text-[10px] text-muted-foreground tracking-widest">{shortcut}</span>}
    </button>
  );
}

function EditSongModal({
  playlistId, song, onClose,
}: { playlistId: string; song: Song; onClose: () => void }) {
  const { updateSong } = useMusicContext();
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [description, setDescription] = useState(song.description || "");
  const [tags, setTags] = useState<string[]>(song.tags || []);
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/,/g, "");
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput("");
  };

  const handleSave = () => {
    updateSong(playlistId, song.id, {
      title: title.trim() || song.title,
      artist: artist.trim() || song.artist,
      description: description.trim() || undefined,
      tags: tags.length ? tags : undefined,
    });
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Edit Song Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1DB954]/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Artist</label>
            <input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1DB954]/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Add a description…"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-[#1DB954]/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#1DB954]/20 text-[#1DB954] text-xs rounded-full">
                  #{t}
                  <button onClick={() => setTags(p => p.filter(x => x !== t))} className="hover:text-red-400 transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTag())}
                placeholder="Add tag — press Enter"
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-muted hover:bg-accent border border-border rounded-lg text-xs text-foreground transition-colors"
              >Add</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-border text-muted-foreground hover:text-foreground rounded-full text-sm transition-colors"
          >Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#1DB954] text-black font-bold rounded-full text-sm hover:bg-[#1ed760] transition-colors"
          >Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── YouTube Search Modal ──────────────────────────────────────────────────────
function BlurImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt || ""}
      className={`${className || ""} transition-all duration-500 ${loaded ? "blur-0 scale-100" : "blur-md scale-110"}`}
      onLoad={() => setLoaded(true)}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "";
        setLoaded(true);
      }}
    />
  );
}

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  length_seconds: number;
  thumbnail: string;
}

function YouTubeSearchModal({
  playlistId, onClose, onSongAdded,
}: { playlistId: string; onClose: () => void; onSongAdded?: (song: Song) => void }) {
  const { addSongToPlaylist, playlists, playSong } = useMusicContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const currentPlaylist = playlists.find(p => p.id === playlistId);

  const localResults = useMemo(() => {
    if (!searchQuery.trim() || !currentPlaylist) return [];
    const q = searchQuery.toLowerCase();
    return currentPlaylist.songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [searchQuery, currentPlaylist]);

  const handleSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw) return;
    setLoading(true);
    setError("");
    setResults([]);
    setCurrentPage(1);

    // Check if the query is a YouTube URL
    const isYtUrl = raw.includes("youtube.com") || raw.includes("youtu.be");
    if (isYtUrl) {
      const ytPlaylistId = extractYouTubePlaylistId(raw);
      const ytId = extractYouTubeId(raw);

      if (ytPlaylistId) {
        try {
          let tracks: any[] = [];
          
          // Try local endpoint first
          try {
            const res = await fetch(`/api/media-info?url=${encodeURIComponent(raw)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.type === "playlist" && Array.isArray(data.tracks)) {
                tracks = data.tracks.map((t: any) => ({
                  videoId: t.youtubeId || t.videoId,
                  title: t.title,
                  author: t.artist || t.author || "YouTube",
                  length_seconds: t.duration || t.length_seconds || 0,
                  thumbnail: t.thumbnail || `https://img.youtube.com/vi/${t.youtubeId || t.videoId}/mqdefault.jpg`
                }));
              }
            }
          } catch (e) {
            console.warn("Local API failed, falling back to client-side extraction", e);
          }

          if (tracks.length === 0) {
            try {
              const clientResult = await fetchPlaylistClientSide(ytPlaylistId);
              tracks = clientResult.tracks.map((t) => ({
                videoId: t.youtubeId,
                title: t.title,
                author: t.artist,
                length_seconds: t.duration,
                thumbnail: t.thumbnail
              }));
            } catch (clientErr) {
              console.error("Client-side fallback extraction failed", clientErr);
            }
          }

          if (tracks.length === 0) {
            throw new Error("No tracks found in playlist or playlist is private.");
          }

          setResults(tracks);
        } catch (err: any) {
          setError(err.message || "Failed to load playlist.");
        } finally {
          setLoading(false);
        }
        return;
      } else if (ytId) {
        // Fetch single video metadata
        try {
          let videoTitle = "YouTube Video";
          let videoAuthor = "YouTube";
          let videoLength = 0;
          let videoThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

          try {
            const res = await fetch(`/api/media-info?url=${encodeURIComponent(raw)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.type === "track") {
                videoTitle = data.title;
                videoAuthor = data.artist;
                videoLength = data.duration;
                videoThumb = data.thumbnail || videoThumb;
              }
            }
          } catch (e) {}

          setResults([{
            videoId: ytId,
            title: videoTitle,
            author: videoAuthor,
            length_seconds: videoLength,
            thumbnail: videoThumb
          }]);
        } catch (err: any) {
          setError("Failed to load video info.");
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    try {
      const q = encodeURIComponent(raw);

      const fetchWithTimeout = async (url: string, timeoutMs: number) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error("HTTP error");
        return response;
      };

      const fetchPiped = async (instance: string) => {
        const res = await fetchWithTimeout(`${instance}/search?q=${q}&filter=all`, 5000);
        const data = await res.json();
        if (!data?.items?.length) throw new Error("No data");
        const videos = data.items.filter((item: any) => item.type === "stream");
        if (!videos.length) throw new Error("No videos");
        return videos.slice(0, 50).map((v: any) => {
          const vId = v.url.includes("?v=") ? v.url.split("?v=")[1].split("&")[0] : v.url.split("/").pop();
          return {
            videoId: vId,
            title: v.title || "Unknown",
            author: v.uploaderName || "Unknown",
            length_seconds: v.duration || 0,
            thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
          };
        });
      };

      const fetchInvidious = async (instance: string) => {
        const res = await fetchWithTimeout(`${instance}/api/v1/search?q=${q}&type=video`, 4000);
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) throw new Error("No data");
        return data.slice(0, 50).map((v: any) => ({
          videoId: v.videoId,
          title: v.title || "Unknown",
          author: v.author || "Unknown",
          length_seconds: v.lengthSeconds || v.length_seconds || 0,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        }));
      };

      const fetchProxy = async (proxyUrl: string) => {
        const res = await fetchWithTimeout(proxyUrl, 5000);
        const contentType = res.headers.get("content-type") || "";
        let html = "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          html = data.contents || "";
        } else {
          html = await res.text();
        }

        const match =
          html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});/s) ||
          html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});/s) ||
          html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]+?\});/s);
        if (!match) throw new Error("No ytInitialData");
        const ytData = JSON.parse(match[1]);
        const videos: any[] = [];
        const findVideos = (obj: any) => {
          if (videos.length >= 50) return;
          if (Array.isArray(obj)) {
            for (const item of obj) findVideos(item);
          } else if (obj !== null && typeof obj === "object") {
            if (obj.videoRenderer && obj.videoRenderer.videoId) {
              videos.push(obj.videoRenderer);
            } else {
              for (const key of Object.keys(obj)) findVideos(obj[key]);
            }
          }
        };
        findVideos(ytData);

        if (videos.length === 0) throw new Error("No videos found in proxy");

        return videos.map((v) => {
          const timeStr = v.lengthText?.simpleText || "0:00";
          const parts = timeStr.split(":").map(Number);
          const length_seconds =
            parts.length === 3
              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
              : parts.length === 2
                ? parts[0] * 60 + parts[1]
                : parts[0] || 0;

          return {
            videoId: v.videoId,
            title: v.title?.runs?.[0]?.text || "Unknown",
            author: v.ownerText?.runs?.[0]?.text || "Unknown",
            length_seconds,
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          };
        });
      };

      const fetchLocal = async () => {
        const res = await fetchWithTimeout(`/api/yt-search?q=${q}`, 5000);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!Array.isArray(data.results) || !data.results.length) throw new Error("No results");
        return data.results;
      };

      const invidious_instances = await getInvidiousInstances();
      const piped_instances = getPipedInstances();

      const allTasks = [
        fetchLocal(),
        ...piped_instances.map((instance) => fetchPiped(instance)),
        ...invidious_instances.map((instance) => fetchInvidious(instance)),
        fetchProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
        fetchProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
        fetchProxy(`https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`)
      ];

      const fastestResults = await Promise.any(allTasks);

      if (fastestResults && fastestResults.length > 0) {
        setResults(fastestResults.slice(0, 50));
      } else {
        setError("No results found. Try a different search term.");
      }
    } catch (err: any) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = (result: YouTubeSearchResult) => {
    const song: Song = {
      id: Date.now().toString(),
      title: result.title,
      artist: result.author,
      youtubeId: result.videoId,
      url: `https://www.youtube.com/watch?v=${result.videoId}`,
      coverUrl: result.thumbnail,
      duration: result.length_seconds,
    };
    addSongToPlaylist(playlistId, song);
    onSongAdded?.(song);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Youtube className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-foreground">Search YouTube</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 md:p-6 border-b border-border flex-shrink-0 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for songs, albums, artists..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              autoFocus
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1DB954]/50"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2 bg-[#1DB954] text-black font-semibold rounded-lg hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-muted-foreground">Showing up to 50 results</p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
          {results.length === 0 && localResults.length === 0 && !loading && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No results. Try searching for something else.</p>
            </div>
          )}

          {results.length === 0 && localResults.length === 0 && !loading && !searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Enter a search term above to find songs</p>
            </div>
          )}

          {localResults.length > 0 && !loading && (
            <div className="mb-6 flex-shrink-0">
              <h3 className="text-xs font-bold text-[#1DB954] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Library className="h-4 w-4" /> In "{currentPlaylist?.name}"
              </h3>
              <div className="space-y-2">
                {localResults.map((song) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-[#1DB954]/20 bg-[#1DB954]/5 hover:bg-[#1DB954]/10 transition-colors cursor-pointer"
                    onClick={() => { playSong(song, playlistId); onClose(); }}
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded flex-shrink-0 overflow-hidden bg-black/20">
                      {song.coverUrl ? <img src={song.coverUrl} className="w-full h-full object-cover" /> : <Music className="w-full h-full p-3 text-[#1DB954]/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-[#1DB954] transition-colors">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <button className="p-2 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full transition-colors flex-shrink-0">
                      <Play className="h-4 w-4 ml-0.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {localResults.length > 0 && results.length > 0 && !loading && (
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2 pt-4 border-t border-border">
              <Youtube className="h-4 w-4" /> YouTube Results
            </h3>
          )}

          <div className="space-y-2 md:space-y-3 flex-1">
            {results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => (
              <motion.div
                key={result.videoId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleAddSong(result)}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded flex-shrink-0 overflow-hidden bg-muted">
                  <BlurImage
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-[#1DB954] transition-colors">
                    {result.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{result.author}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {Math.floor(result.length_seconds / 60)}:{String(result.length_seconds % 60).padStart(2, "0")}
                  </p>
                </div>

                {/* Add button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSong(result);
                  }}
                  className="px-3 py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] rounded-lg text-xs font-semibold transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </motion.div>
            ))}
          </div>

          {Math.ceil(results.length / itemsPerPage) > 1 && !loading && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-border shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Page {currentPage} of {Math.ceil(results.length / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(results.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(results.length / itemsPerPage)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
              <p className="text-sm text-muted-foreground mt-3">Searching...</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Add Song Modal ────────────────────────────────────────────────────────────
interface TrackResult {
  type: "track";
  title: string;
  artist: string;
  thumbnail?: string;
  duration: number;
  streamUrl: string;
  youtubeId?: string | null;
}
interface PlaylistResult {
  type: "playlist";
  name: string;
  thumbnail?: string;
  trackCount: number;
  tracks: TrackResult[];
}
type MediaResult = TrackResult | PlaylistResult;

function AddSongModal({
  playlistId, onClose, onSongAdded, onPlaylistCreated,
}: {
  playlistId: string;
  onClose: () => void;
  onSongAdded?: (song: Song, playlistId: string) => void;
  onPlaylistCreated?: (newPlaylistId: string) => void;
}) {
  const { addSongToPlaylist, addLocalSongToPlaylist, addPlaylistWithSongs, playlists } = useMusicContext();
  const [tab, setTab] = useState<"file" | "url" | "stream">("file");

  // File tab
  const fileRef = useRef<HTMLInputElement>(null);

  // Direct URL tab
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  // Stream tab (YouTube)
  const [streamInput, setStreamInput] = useState("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fetchError, setFetchError] = useState("");
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [importing, setImporting] = useState(false);

  const currentPlaylistName = playlists.find(p => p.id === playlistId)?.name ?? "playlist";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let firstSong: Song | null = null;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      const parts = file.name.replace(/\.[^/.]+$/, "").split(" - ");
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const song: Song = {
        id,
        title: parts[1]?.trim() || parts[0]?.trim() || file.name,
        artist: parts[0]?.trim() || "Unknown Artist",
        url: blobUrl,
        isLocal: true,
        idbKey: `music_${id}`,
      };
      await addLocalSongToPlaylist(playlistId, song, await file.arrayBuffer());
      if (i === 0) firstSong = song;
    }
    onClose();
    if (firstSong) onSongAdded?.(firstSong, playlistId);
  };

  const handleUrl = () => {
    if (!url.trim()) return;
    const song: Song = {
      id: Date.now().toString(),
      title: title || url.split("/").pop() || "Unknown",
      artist: artist || "Unknown Artist",
      url: url.trim(),
    };
    addSongToPlaylist(playlistId, song);
    onClose();
    onSongAdded?.(song, playlistId);
  };

  const handleFetchStream = async () => {
    const raw = streamInput.trim();
    if (!raw) return;
    setFetchState("loading");
    setFetchError("");
    setMediaResult(null);
    try {
      const res = await fetch(`/api/media-info?url=${encodeURIComponent(raw)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch media info");
      setMediaResult(json as MediaResult);
      setFetchState("done");
      return;
    } catch { /* backend unavailable or error — try client-side fallback */ }

    try {
        const fetchHtml = async (targetUrl: string) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json();
              if (data.contents) return data.contents;
            }
          } catch (e) {}
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) return await res.text();
          } catch (e) {}
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res2 = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res2.ok) throw new Error("Failed to fetch proxy");
          return await res2.text();
        };

        const ytId = extractYouTubeId(raw);
        const ytPlaylistId = extractYouTubePlaylistId(raw);
        const spotifyInfo = (() => {
          const m = raw.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
          return m ? { type: m[1], id: m[2] } : null;
        })();

        if (ytPlaylistId) {
          try {
            const clientResult = await fetchPlaylistClientSide(ytPlaylistId);
            const formattedTracks = clientResult.tracks.map((t) => ({
              type: "track" as const,
              title: t.title,
              artist: t.artist,
              thumbnail: t.thumbnail,
              duration: t.duration,
              streamUrl: t.streamUrl,
              youtubeId: t.youtubeId
            }));

            setMediaResult({
              type: "playlist",
              name: clientResult.name,
              thumbnail: formattedTracks[0]?.thumbnail || "",
              trackCount: formattedTracks.length,
              tracks: formattedTracks
            });
            setFetchState("done");
          } catch (err: any) {
            throw new Error(`YouTube Playlist Error: ${err.message}`);
          }

        } else if (ytId) {
          try {
            let oData: any = null;
            try {
              const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
              if (noembedRes.ok) {
                const parsed = await noembedRes.json();
                if (!parsed.error) oData = parsed;
              }
            } catch (e) {}
            if (!oData) {
              const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`;
              const proxyData = await fetchHtml(oembedUrl);
              oData = JSON.parse(proxyData);
            }
            setMediaResult({
              type: "track",
              title: oData?.title ?? "Unknown Title",
              artist: oData?.author_name ?? "YouTube",
              thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
              duration: 0,
              streamUrl: `https://www.youtube.com/watch?v=${ytId}`,
              youtubeId: ytId,
            });
            setFetchState("done");
          } catch (e) {
            throw new Error("Could not fetch YouTube video info.");
          }

        } else if (spotifyInfo) {
          let isPlaylist = spotifyInfo.type === "playlist" || spotifyInfo.type === "album";
          let token = "";
          let playlistName = `Spotify ${spotifyInfo.type}`;

          // Try multiple strategies to fetch Spotify access token
          const tokenStrategies = [
            () => fetchHtml("https://open.spotify.com/get_access_token?reason=transport&productType=embed"),
            () => fetch("https://open.spotify.com/get_access_token?reason=transport&productType=embed").then(r => r.text()),
            () => fetchHtml("https://open.spotify.com").then(html => {
              const tokenMatch = html.match(/"accessToken":"([^"]+)"/) || html.match(/"accessToken": "([^"]+)"/);
              if (tokenMatch?.[1]) return JSON.stringify({ accessToken: tokenMatch[1] });
              throw new Error("Token not found");
            })
          ];

          try {
            const tokenHtml = await Promise.any(tokenStrategies.map(s => s()));
            const tokenData = JSON.parse(tokenHtml);
            token = tokenData.accessToken;
          } catch (e) {}

          // If playlist/album, try to fetch with token or graceful fallback
          if (isPlaylist) {
            let data: any = null;
            if (token) {
              try {
                const apiUrl = spotifyInfo.type === "playlist"
                  ? `https://api.spotify.com/v1/playlists/${spotifyInfo.id}`
                  : `https://api.spotify.com/v1/albums/${spotifyInfo.id}`;
                const plRes = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${token}` } });
                if (plRes.ok) data = await plRes.json();
              } catch (e) {
                console.error("Failed to fetch Spotify API:", e);
              }
            }

            const tracks: TrackResult[] = [];
            if (data) {
              // Full metadata available
              const items = spotifyInfo.type === "playlist" ? data.tracks.items : data.tracks.items;
              for (const item of items) {
                const track = spotifyInfo.type === "playlist" ? item.track : item;
                if (!track) continue;
                tracks.push({
                  type: "track",
                  title: track.name,
                  artist: track.artists.map((a: any) => a.name).join(", "),
                  thumbnail: track.album?.images?.[0]?.url || data.images?.[0]?.url,
                  duration: Math.floor(track.duration_ms / 1000),
                  streamUrl: `ytsearch:${track.name} ${track.artists[0]?.name} audio`,
                });
              }
            } else {
              // Fallback: extract basic info from Spotify page and create minimal playlist
              throw new Error(`Could not fetch Spotify ${spotifyInfo.type}. Please try again or add tracks individually.`);
            }

            if (tracks.length === 0) throw new Error(`Spotify ${spotifyInfo.type} is empty or unavailable.`);

            setMediaResult({
              type: "playlist",
              name: data?.name || playlistName,
              thumbnail: data?.images?.[0]?.url || tracks.find(t => t.thumbnail)?.thumbnail,
              trackCount: tracks.length,
              tracks
            });
            setFetchState("done");
            return;
          }

          let oData: any = null;
          try {
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`;
            const proxyData = await fetchHtml(oembedUrl);
            oData = JSON.parse(proxyData);
          } catch (e) {
            throw new Error("Could not fetch Spotify track info. Please check the URL.");
          }

          if (!oData) throw new Error("Spotify track not found.");

          const trackTitle = oData.title || "Spotify Track";
          const trackArtist = oData.provider_name || oData.author_name || "Spotify";

          // For single Spotify tracks, create a searchable track with better metadata
          setMediaResult({
            type: "track",
            title: trackTitle,
            artist: trackArtist,
            thumbnail: oData.thumbnail_url,
            duration: 0,
            streamUrl: `ytsearch:${trackTitle} ${trackArtist} audio`,
          });
          setFetchState("done");
        } else {
        throw new Error("Not a recognizable YouTube or Spotify URL");
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Could not fetch media info. Check the URL.");
      setFetchState("error");
    }
  };



  const handleAddTrack = () => {
    if (!mediaResult || mediaResult.type !== "track") return;
    const mr = mediaResult as TrackResult;
    const song: Song = {
      id: Date.now().toString(),
      title: mr.title,
      artist: mr.artist,
      url: mr.streamUrl,
      youtubeId: mr.youtubeId ?? undefined,
      coverUrl: mr.thumbnail,
      duration: mr.duration,
    };
    addSongToPlaylist(playlistId, song);
    onClose();
    onSongAdded?.(song, playlistId);
  };

  const buildSongs = (tracks: TrackResult[]): Song[] =>
    tracks.map((t, i) => ({
      id: `${Date.now()}_${i}`,
      title: t.title,
      artist: t.artist,
      url: t.streamUrl,
      youtubeId: t.youtubeId ?? undefined,
      coverUrl: t.thumbnail,
      duration: t.duration,
    }));

  const handleAddAllToCurrent = () => {
    if (!mediaResult || mediaResult.type !== "playlist") return;
    setImporting(true);
    const songs = buildSongs(mediaResult.tracks);
    songs.forEach(s => addSongToPlaylist(playlistId, s));
    setTimeout(() => { setImporting(false); onClose(); }, 400);
  };

  const handleCreateNewPlaylist = () => {
    if (!mediaResult || mediaResult.type !== "playlist") return;
    setImporting(true);
    const songs = buildSongs(mediaResult.tracks);
    const newId = addPlaylistWithSongs(mediaResult.name, songs);
    setTimeout(() => { setImporting(false); onPlaylistCreated?.(newId); onClose(); }, 400);
  };

  const TABS = [
    { key: "file",   label: "Upload",  icon: <Upload className="h-3.5 w-3.5 inline mr-1.5" /> },
    { key: "url",    label: "URL",     icon: <Link2 className="h-3.5 w-3.5 inline mr-1.5" /> },
    { key: "stream", label: "YouTube", icon: <Radio className="h-3.5 w-3.5 inline mr-1.5" /> },
  ] as const;

  const isPlaylist = mediaResult?.type === "playlist";

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`bg-card border border-border rounded-xl p-6 shadow-2xl w-full ${isPlaylist ? "max-w-lg" : "max-w-md"}`}
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Add to playlist</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tab row */}
        <div className="flex gap-0 mb-5 border-b border-border">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? "text-foreground border-b-2 border-[#1DB954] -mb-px" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* File tab */}
        {tab === "file" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-[#1DB954]/60 hover:bg-[#1DB954]/5 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-foreground font-medium mb-1">Choose files</p>
            <p className="text-xs text-muted-foreground">MP3, WAV, OGG, M4A</p>
            <p className="text-xs text-[#1DB954]/60 mt-2">Edit details will open after upload</p>
            <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Direct URL tab */}
        {tab === "url" && (
          <div className="space-y-3">
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/song.mp3" className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#1DB954]" />
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
            <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
            <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full mt-2" onClick={handleUrl}>
              <Plus className="h-4 w-4 mr-2" />Add Song
            </Button>
          </div>
        )}

        {/* YouTube Stream tab */}
        {tab === "stream" && (
          <div className="space-y-4">
            {/* URL input + fetch button */}
            <div className="flex gap-2">
              <input
                value={streamInput}
                onChange={e => { setStreamInput(e.target.value); setFetchState("idle"); setMediaResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleFetchStream()}
                placeholder="Paste YouTube link…"
                className="flex-1 px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1DB954]/50"
              />
              <button
                onClick={handleFetchStream}
                disabled={fetchState === "loading" || !streamInput.trim()}
                className="px-4 py-2.5 bg-[#1DB954] disabled:opacity-40 hover:bg-[#1ed760] text-black font-bold rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                {fetchState === "loading"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Radio className="h-4 w-4" />}
                {fetchState === "loading" ? "Detecting…" : "Fetch"}
              </button>
            </div>

            {/* Supported link hints */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                "youtube.com/watch?v=…",
                "youtube.com/playlist?list=…",
              ].map(hint => (
                <span key={hint} className="text-[10px] text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full font-mono">{hint}</span>
              ))}
            </div>

            {/* Error */}
            {fetchState === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-xs text-red-400">
                {fetchError}
              </div>
            )}

            {/* ── Single track result ── */}
            {fetchState === "done" && mediaResult?.type === "track" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-muted/60 rounded-xl overflow-hidden border border-border"
              >
                <div className="flex gap-3 p-3 items-center">
                  {mediaResult.thumbnail ? (
                    <img src={mediaResult.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Music className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{mediaResult.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{mediaResult.artist}</p>
                    {mediaResult.duration > 0 && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{formatTime(mediaResult.duration)}</p>
                    )}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse shrink-0" title="Ready to stream" />
                </div>
                <div className="px-3 pb-3">
                  <Button
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full text-sm"
                    onClick={handleAddTrack}
                  >
                    <Plus className="h-4 w-4 mr-2" />Add to playlist
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Playlist result ── */}
            {fetchState === "done" && mediaResult?.type === "playlist" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-muted/60 rounded-xl border border-border overflow-hidden"
              >
                {/* Playlist header */}
                <div className="flex gap-3 p-4 items-center border-b border-border">
                  {mediaResult.thumbnail ? (
                    <img src={mediaResult.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center shrink-0">
                      <Library className="h-6 w-6 text-white/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-[#1DB954] font-bold mb-0.5">Playlist detected</p>
                    <p className="text-sm font-bold text-foreground truncate">{mediaResult.name}</p>
                    <p className="text-xs text-muted-foreground">{mediaResult.tracks.length} songs
                      {mediaResult.trackCount > mediaResult.tracks.length && ` (showing ${mediaResult.tracks.length} of ${mediaResult.trackCount})`}
                    </p>
                  </div>
                </div>

                {/* Track list preview */}
                <div className="max-h-48 overflow-y-auto">
                  {mediaResult.tracks.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/30 transition-colors">
                      <span className="text-[10px] text-muted-foreground/50 w-4 text-right shrink-0">{i + 1}</span>
                      {t.thumbnail ? (
                        <img src={t.thumbnail} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
                      </div>
                      {t.duration > 0 && (
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{formatTime(t.duration)}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Import buttons */}
                <div className="p-3 flex flex-col gap-2 border-t border-border">
                  <Button
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full text-sm"
                    onClick={handleCreateNewPlaylist}
                    disabled={importing}
                  >
                    {importing
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Plus className="h-4 w-4 mr-2" />}
                    Create new playlist "{mediaResult.name}"
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-foreground hover:bg-muted/60 rounded-full text-sm"
                    onClick={handleAddAllToCurrent}
                    disabled={importing}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add all {mediaResult.tracks.length} songs to "{currentPlaylistName}"
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Idle placeholder */}
            {fetchState === "idle" && !mediaResult && (
              <div className="text-center py-6 text-muted-foreground/40">
                <Youtube className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Paste a YouTube link — single track or entire playlist</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SongListItem({
  song,
  idx,
  selId,
  isActive,
  activeItemId,
  isPlayingThis,
  duration,
  playSong,
  removeSongFromPlaylist,
  setEditSong,
  setActiveItemId
}: any) {
  const controls = useDragControls();
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [sg0, sg1] = getGrad(song.title);

  return (
    <Reorder.Item as="div" value={song} dragListener={!isMobile} dragControls={controls}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: idx * 0.02 }}
        className={`md:hidden grid gap-2 px-2 py-2 rounded-md transition-colors border border-border/30 ${isActive ? "bg-muted border-[#1DB954]/30" : (activeItemId === song.id ? "bg-muted/70" : "hover:bg-muted/40")}`}
        style={{ gridTemplateColumns: "auto 1fr auto" }}
        onClick={() => { setActiveItemId(song.id); playSong(song, selId); }}
      >
        {/* Mobile Handle */}
        <div 
          className="flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing px-2 py-1"
          onPointerDown={(e) => { 
            if (isMobile) { 
              e.preventDefault(); 
              controls.start(e); 
            } 
          }}
          style={{ touchAction: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {isPlayingThis ? (
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-0.5 bg-[#1DB954] rounded-full" animate={{ height: ["30%", "100%", "30%"] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} />
              ))}
            </div>
          ) : isActive ? (
            <span className="text-[#1DB954] font-semibold text-xs">| {idx + 1}</span>
          ) : (
            <span className="text-muted-foreground text-xs">| {idx + 1}</span>
          )}
        </div>

        {/* Details */}
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${sg0} ${sg1}`}>
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <Music className="h-3 w-3 text-white/50" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium truncate ${isActive ? "text-[#1DB954]" : "text-foreground"}`}>{song.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0">
          <ThreeDotMenu>
            <MenuItem icon={Pencil} label="Edit" onClick={(e: any) => { e.stopPropagation(); setEditSong({ song, playlistId: selId }); }} />
            <MenuItem icon={Trash2} label="Delete" destructive onClick={(e: any) => { e.stopPropagation(); removeSongFromPlaylist(selId, song.id); }} />
          </ThreeDotMenu>
        </div>
      </motion.div>
        
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: idx * 0.02 }}
        className={`hidden md:grid group gap-4 px-4 py-3 rounded-md cursor-pointer transition-colors ${isActive ? "bg-muted" : (activeItemId === song.id ? "bg-muted/70" : "hover:bg-muted/40")}`}
        style={{ gridTemplateColumns: "28px 1fr 80px 64px" }}
        onClick={() => { setActiveItemId(song.id); playSong(song, selId); }}
      >
        {/* Desktop Index */}
        <div className="flex items-center justify-center text-sm font-semibold pointer-events-none">
          {isPlayingThis ? (
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-0.5 bg-[#1DB954] rounded-full" animate={{ height: ["30%", "100%", "30%"] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} />
              ))}
            </div>
          ) : isActive ? (
            <span className="text-[#1DB954] text-sm">| {idx + 1}</span>
          ) : (
            <>
              <span className="text-muted-foreground group-hover:hidden text-sm">| {idx + 1}</span>
              <Play className="h-3.5 w-3.5 text-foreground hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Title + artist */}
        <div className="flex items-center gap-3 min-w-0 pointer-events-none">
          <div className={`w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${sg0} ${sg1}`}>
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <Music className="h-4 w-4 text-white/50" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isActive ? "text-[#1DB954]" : "text-foreground"}`}>{song.title}</p>
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
            {song.description && (
              <p className="text-[10px] text-muted-foreground/60 truncate">{song.description}</p>
            )}
            {song.tags && song.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {song.tags.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[9px] bg-[#1DB954]/15 text-[#1DB954] px-1.5 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center pointer-events-none">
          <span className="text-sm text-muted-foreground">{isActive ? formatTime(duration) : "—"}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center">
          <ThreeDotMenu>
            <MenuItem icon={Pencil} label="Rename / Edit" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setEditSong({ song, playlistId: selId }); }} />
            <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); removeSongFromPlaylist(selId, song.id); }} />
          </ThreeDotMenu>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MusicPage() {
  const musicCtx = useMusicContext() as any;
  const {
    playlists, currentSong, currentPlaylistId, isPlaying, duration, volume, progress,
    addPlaylist, deletePlaylist, renamePlaylist, removeSongFromPlaylist, playSong,
    nextSong,
  } = musicCtx;
  const { theme } = useAppContext();

  const [selId, setSelId] = useState(playlists[0]?.id || "default");
  const [showAdd, setShowAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editSong, setEditSong] = useState<{ song: Song; playlistId: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "playlists">("all");
  const [showMobileSidebar, setShowMobileSidebar] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Setup local playlists to handle UI dragging properly
  const [localPlaylists, setLocalPlaylists] = useState(playlists);
  useEffect(() => setLocalPlaylists(playlists), [playlists]);

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      let itemType: 'playlist' | 'song' | null = null;
      let targetPlaylist: any = null;
      let targetSong: any = null;

      if (activeItemId) {
        targetPlaylist = playlists.find((p: any) => p.id === activeItemId);
        if (targetPlaylist) {
          itemType = 'playlist';
        } else {
          for (const p of playlists) {
            targetSong = p.songs.find((s: any) => s.id === activeItemId);
            if (targetSong) { itemType = 'song'; targetPlaylist = p; break; }
          }
        }
      }

      if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (itemType === 'song') setShowAdd(true);
        else setShowNew(true);
      } else if (e.key === "F2") {
        if (!itemType) return;
        e.preventDefault();
        if (itemType === 'playlist') { setEditId(targetPlaylist.id); setEditName(targetPlaylist.name); }
        else if (itemType === 'song') setEditSong({ song: targetSong, playlistId: targetPlaylist.id });
      } else if (e.key === "Delete") {
        if (!itemType) return;
        e.preventDefault();
        if (itemType === 'playlist' && targetPlaylist.id !== 'default') deletePlaylist(targetPlaylist.id);
        else if (itemType === 'song') removeSongFromPlaylist(targetPlaylist.id, targetSong.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeItemId, playlists, deletePlaylist, removeSongFromPlaylist]);

  void theme; // consumed via CSS vars
  const bgClass = "bg-background";
  const sidebarBg = "bg-sidebar";
  const textClass = "text-foreground";
  const mutedTextClass = "text-muted-foreground";
  const accentColor = "#1DB954";
  const accentHover = "#1ed760";

  const sel = localPlaylists.find((p: any) => p.id === selId) || localPlaylists[0];
  const [g0, g1] = sel ? getGrad(sel.name) : getGrad("default");

  const createPlaylist = () => {
    if (!newName.trim()) return;
    addPlaylist(newName.trim());
    setNewName("");
    setShowNew(false);
  };
  const saveRename = () => {
    if (editId && editName.trim()) renamePlaylist(editId, editName.trim());
    setEditId(null);
  };

  // nextSong is wired to the ended event inside MusicContext; keep a ref here
  // for the "ended" callback on the inline audio element if needed
  void nextSong;

  const SidebarContent = useMemo(() => (
    <div className={`w-full md:w-48 lg:w-56 xl:w-72 flex-shrink-0 flex flex-col p-1 md:p-2 gap-2 overflow-hidden ${
        showMobileSidebar ? "flex fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl md:relative md:z-auto md:bg-transparent" : "hidden md:flex"
      }`}>
        <div className={`${sidebarBg} rounded-lg flex-1 flex flex-col overflow-hidden border border-border`}>
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button className={`flex items-center gap-2 ${mutedTextClass} hover:text-foreground transition-colors font-bold text-sm`}>
                <Library className="h-5 w-5" />Your Library
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setShowNew(v => !v)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/60 ${mutedTextClass} hover:text-foreground transition-colors`}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button className={`hidden md:flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/60 ${mutedTextClass} hover:text-foreground transition-colors`}>
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setShowMobileSidebar(false)} className={`md:hidden h-8 w-8 flex items-center justify-center rounded-full bg-muted/30 hover:bg-muted/60 ${mutedTextClass} hover:text-foreground transition-colors ml-1`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {(["all", "playlists"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterTab(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                    ${filterTab === f
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/70"}`}
                >
                  {f === "all" ? "All" : "Playlists"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {showNew && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-4 overflow-hidden flex-shrink-0">
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Playlist name"
                    className="bg-muted text-foreground placeholder:text-muted-foreground/50 border-0 h-8 text-sm focus-visible:ring-[#1DB954]"
                    onKeyDown={e => e.key === "Enter" && createPlaylist()}
                    autoFocus
                  />
                  <Button size="icon" className={`h-8 w-8 text-black flex-shrink-0`} style={{ backgroundColor: accentColor }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = accentHover)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accentColor)} onClick={createPlaylist}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Reorder.Group as="div" axis="y" values={localPlaylists} onReorder={(newPlaylists) => {
            setLocalPlaylists(newPlaylists);
            musicCtx.reorderPlaylists?.(newPlaylists);
          }} className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {localPlaylists.map((p: any) => {
              const [pg0, pg1] = getGrad(p.name);
              const isActive = p.id === selId;
              const isPlayingThis = currentPlaylistId === p.id && isPlaying;
              return (
                <Reorder.Item as="div" key={p.id} value={p}>
                <div
                  key={p.id}
                  className={`group flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors
                    ${isActive ? "bg-muted" : (activeItemId === p.id ? "bg-muted/70" : "hover:bg-muted/50")}`}
                  onClick={() => { setSelId(p.id); setActiveItemId(p.id); setShowMobileSidebar(false); }}
                >
                  <div className={`w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${pg0} ${pg1}`}>
                    <Music className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editId === p.id ? (
                      <input
                        className={`bg-transparent text-sm ${textClass} outline-none border-b border-[#1DB954] w-full`}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={e => e.key === "Enter" && saveRename()}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <p className={`text-sm font-medium truncate ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{p.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60">Playlist · {p.songs.length} songs</p>
                  </div>
                  {isPlayingThis && (
                    <div className="flex items-end gap-0.5 h-4 flex-shrink-0">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-0.5 bg-[#1DB954] rounded-full" animate={{ height: ["30%", "100%", "30%"] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} />
                      ))}
                    </div>
                  )}
                  <ThreeDotMenu>
                    <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); }} />
                    {p.id !== "default" && (
                      <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deletePlaylist(p.id); }} />
                    )}
                  </ThreeDotMenu>
                </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>
  ), [localPlaylists, selId, currentPlaylistId, isPlaying, showNew, newName, editId, editName, filterTab, showMobileSidebar, activeItemId]);

  const SongTableContent = useMemo(() => (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 pb-4">
          {(!sel || sel.songs.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <Music className="h-12 sm:h-16 w-12 sm:w-16 text-foreground/10 mb-3 sm:mb-4" />
              <p className="text-foreground font-semibold mb-1 text-sm sm:text-base">It's quiet in here</p>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">Add songs to get started.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 sm:px-6 py-1.5 sm:py-2 border border-border text-foreground rounded-full text-xs sm:text-sm font-semibold hover:border-foreground transition-colors"
              >
                Add songs
              </button>
            </div>
          ) : (
            <>
              {/* Header - Show/hide columns based on screen size */}
              <div
                className="hidden md:grid gap-4 px-2 sm:px-4 py-2 border-b border-border mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider select-none"
                style={{ gridTemplateColumns: "28px 1fr 80px 64px" }}
              >
                <span className="text-center">#</span>
                <span>Title</span>
                <span className="flex items-center justify-center"><Clock className="h-3.5 w-3.5" /></span>
                <span />
              </div>

              <Reorder.Group as="div" axis="y" values={sel.songs} onReorder={(newSongs) => {
                setLocalPlaylists((prev: any[]) => prev.map(p => p.id === selId ? { ...p, songs: newSongs } : p));
                musicCtx.reorderSongs?.(selId, newSongs);
              }} className="space-y-1">
              {sel.songs.map((song: any, idx: number) => {
                const isActive = currentSong?.id === song.id;
                const isPlayingThis = isActive && isPlaying;
                return (
                  <SongListItem
                    key={song.id}
                    song={song}
                    idx={idx}
                    selId={selId}
                    isActive={isActive}
                    activeItemId={activeItemId}
                    isPlayingThis={isPlayingThis}
                    duration={duration}
                    playSong={playSong}
                    removeSongFromPlaylist={removeSongFromPlaylist}
                    setEditSong={setEditSong}
                    setActiveItemId={setActiveItemId}
                  />
                );
              })}
              </Reorder.Group>
            </>
          )}
        </div>
  ), [sel, selId, currentSong, isPlaying, activeItemId, duration]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`flex h-full ${bgClass} pb-20 overflow-hidden flex-col md:flex-row`}>
      <AnimatePresence>
        {showAdd && (
          <AddSongModal
            playlistId={selId}
            onClose={() => setShowAdd(false)}
            onSongAdded={(song, pid) => setEditSong({ song, playlistId: pid })}
            onPlaylistCreated={(newId) => setSelId(newId)}
          />
        )}
        {showSearch && (
          <YouTubeSearchModal
            playlistId={selId}
            onClose={() => setShowSearch(false)}
            onSongAdded={(song) => setEditSong({ song, playlistId: selId })}
          />
        )}
        {editSong && (
          <EditSongModal
            song={editSong.song}
            playlistId={editSong.playlistId}
            onClose={() => setEditSong(null)}
          />
        )}
      </AnimatePresence>
      {SidebarContent}
      <div className="flex-1 flex flex-col overflow-hidden rounded-none sm:rounded-lg bg-card m-0 sm:m-2 sm:ml-0">
        <div className={`bg-gradient-to-b ${g0} ${g1} px-3 sm:px-4 md:px-6 pt-14 sm:pt-8 md:pt-14 pb-2 sm:pb-3 md:pb-5 flex-shrink-0 relative`}>
          <button onClick={() => setShowMobileSidebar(true)} className="md:hidden absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/20 rounded-full text-white/90 hover:text-white hover:bg-black/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-medium transition-colors">
            <Library className="h-3.5 w-3.5" /> Library
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
            <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 bg-gradient-to-br ${g0} ${g1} shadow-2xl rounded-sm flex items-center justify-center flex-shrink-0`}>
              <Music className="h-12 sm:h-16 md:h-20 w-12 sm:w-16 md:w-20 text-white/20" />
            </div>
            <div className="min-w-0 pb-0 sm:pb-1">
              <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white uppercase tracking-widest mb-1 sm:mb-2">Playlist</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-none mb-2 sm:mb-4 truncate">{sel?.name || "Library"}</h1>
              <p className="text-xs sm:text-sm text-white/70">
                <span className="font-bold text-white">OM</span> · {sel?.songs.length || 0} songs
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex items-center gap-2 sm:gap-3 md:gap-5 flex-shrink-0 bg-gradient-to-b from-background/20 to-transparent flex-wrap">
          <button
            onClick={() => { const s = sel?.songs[0]; if (s) playSong(s, selId); }}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 rounded-full flex items-center justify-center transition-all shadow-lg flex-shrink-0"
          >
            {isPlaying && currentPlaylistId === selId
              ? <Pause className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-black" />
              : <Play className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-black ml-1" />}
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground text-xs sm:text-sm font-medium transition-colors flex-shrink-0">
            <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button onClick={() => setShowSearch(true)} className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground text-xs sm:text-sm font-medium transition-colors flex-shrink-0">
            <Search className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
        {SongTableContent}
      </div>
    </motion.div>
  );
}
