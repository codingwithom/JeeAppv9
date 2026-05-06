import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicContext, Song } from "@/context/MusicContext";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music, Plus, Play, Pause, Trash2, Upload, Link2, X,
  Library, ChevronRight, Pencil, Check, Clock, Youtube, Loader2, Radio,
} from "lucide-react";

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

// ── Edit Song Modal ───────────────────────────────────────────────────────────
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

  // Stream tab (YouTube / Spotify)
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

    // Fallback: YouTube oEmbed (CORS-safe, no API key required)
    // Works on static hosting where the backend is not available
    try {
      const ytId = extractYouTubeId(raw);
      if (!ytId) throw new Error("Not a recognizable YouTube URL");
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`;
      const oRes = await fetch(oembedUrl);
      if (!oRes.ok) throw new Error("YouTube oEmbed failed");
      const oData = await oRes.json();
      const result: TrackResult = {
        type: "track",
        title: oData.title ?? "Unknown Title",
        artist: oData.author_name ?? "YouTube",
        thumbnail: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
        duration: 0,
        streamUrl: `yt:${ytId}`,
        youtubeId: ytId,
      };
      setMediaResult(result);
      setFetchState("done");
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Could not fetch media info. Check the URL.");
      setFetchState("error");
    }
  };

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
    { key: "stream", label: "YouTube / Spotify", icon: <Radio className="h-3.5 w-3.5 inline mr-1.5" /> },
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

        {/* YouTube / Spotify Stream tab */}
        {tab === "stream" && (
          <div className="space-y-4">
            {/* URL input + fetch button */}
            <div className="flex gap-2">
              <input
                value={streamInput}
                onChange={e => { setStreamInput(e.target.value); setFetchState("idle"); setMediaResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleFetchStream()}
                placeholder="Paste YouTube or Spotify link…"
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
                "open.spotify.com/track/…",
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
                <p className="text-xs">Paste a YouTube or Spotify link — single track or entire playlist</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MusicPage() {
  const {
    playlists, currentSong, currentPlaylistId, isPlaying, duration, volume, progress,
    addPlaylist, deletePlaylist, renamePlaylist, removeSongFromPlaylist, playSong,
    nextSong,
  } = useMusicContext();
  const { theme } = useAppContext();

  const [selId, setSelId] = useState(playlists[0]?.id || "default");
  const [showAdd, setShowAdd] = useState(false);
  const [editSong, setEditSong] = useState<{ song: Song; playlistId: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "playlists">("all");

  void theme; // consumed via CSS vars
  const bgClass = "bg-background";
  const sidebarBg = "bg-sidebar";
  const textClass = "text-foreground";
  const mutedTextClass = "text-muted-foreground";
  const accentColor = "#1DB954";
  const accentHover = "#1ed760";

  const sel = playlists.find(p => p.id === selId) || playlists[0];
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`flex h-full ${bgClass} pb-20 overflow-hidden`}>
      <AnimatePresence>
        {showAdd && (
          <AddSongModal
            playlistId={selId}
            onClose={() => setShowAdd(false)}
            onSongAdded={(song, pid) => setEditSong({ song, playlistId: pid })}
            onPlaylistCreated={(newId) => setSelId(newId)}
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

      {/* ── Your Library sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col p-2 gap-2 overflow-hidden">
        <div className={`${sidebarBg} rounded-lg flex-1 flex flex-col overflow-hidden border border-border`}>
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button className={`flex items-center gap-2 ${mutedTextClass} hover:text-foreground transition-colors font-bold text-sm`}>
                <Library className="h-5 w-5" />Your Library
              </button>
              <div className="flex gap-0.5">
                <button
                  onClick={() => setShowNew(v => !v)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/60 ${mutedTextClass} hover:text-foreground transition-colors`}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/60 ${mutedTextClass} hover:text-foreground transition-colors`}>
                  <ChevronRight className="h-4 w-4" />
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

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {playlists.map(p => {
              const [pg0, pg1] = getGrad(p.name);
              const isActive = p.id === selId;
              const isPlayingThis = currentPlaylistId === p.id && isPlaying;
              return (
                <div
                  key={p.id}
                  className={`group flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors
                    ${isActive ? "bg-muted" : "hover:bg-muted/50"}`}
                  onClick={() => setSelId(p.id)}
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
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {p.id !== "default" && (
                      <button
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); deletePlaylist(p.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg bg-card m-2 ml-0">
        {/* Gradient header */}
        <div className={`bg-gradient-to-b ${g0} ${g1} px-6 pt-14 pb-5 flex-shrink-0`}>
          <div className="flex items-end gap-5">
            <div className={`w-44 h-44 bg-gradient-to-br ${g0} ${g1} shadow-2xl rounded-sm flex items-center justify-center flex-shrink-0`}>
              <Music className="h-20 w-20 text-white/20" />
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-[11px] font-bold text-white uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-4xl font-black text-white leading-none mb-4 truncate">{sel?.name || "Library"}</h1>
              <p className="text-sm text-white/70">
                <span className="font-bold text-white">OM</span> · {sel?.songs.length || 0} songs
              </p>
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="px-6 py-4 flex items-center gap-5 flex-shrink-0 bg-gradient-to-b from-background/20 to-transparent">
          <button
            onClick={() => { const s = sel?.songs[0]; if (s) playSong(s, selId); }}
            className="w-14 h-14 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            {isPlaying && currentPlaylistId === selId
              ? <Pause className="h-6 w-6 text-black" />
              : <Play className="h-6 w-6 text-black ml-1" />}
          </button>
          <button onClick={() => setShowAdd(true)} className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />Add songs
          </button>
        </div>

        {/* Song table */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {(!sel || sel.songs.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Music className="h-16 w-16 text-foreground/10 mb-4" />
              <p className="text-foreground font-semibold mb-1">It's quiet in here</p>
              <p className="text-muted-foreground text-sm mb-6">Add songs to get started.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-6 py-2 border border-border text-foreground rounded-full text-sm font-semibold hover:border-foreground transition-colors"
              >
                Add songs
              </button>
            </div>
          ) : (
            <>
              <div
                className="grid gap-4 px-4 py-2 border-b border-border mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider select-none"
                style={{ gridTemplateColumns: "28px 1fr 80px 64px" }}
              >
                <span className="text-center">#</span>
                <span>Title</span>
                <span className="flex items-center justify-center"><Clock className="h-3.5 w-3.5" /></span>
                <span />
              </div>

              {sel.songs.map((song, idx) => {
                const isActive = currentSong?.id === song.id;
                const isPlayingThis = isActive && isPlaying;
                const [sg0, sg1] = getGrad(song.title);
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`group grid gap-4 px-4 py-3 rounded-md cursor-pointer transition-colors
                      ${isActive ? "bg-muted" : "hover:bg-muted/40"}`}
                    style={{ gridTemplateColumns: "28px 1fr 80px 64px" }}
                    onClick={() => playSong(song, selId)}
                  >
                    {/* Index / playing */}
                    <div className="flex items-center justify-center text-sm">
                      {isPlayingThis ? (
                        <div className="flex items-end gap-0.5 h-4">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-0.5 bg-[#1DB954] rounded-full" animate={{ height: ["30%", "100%", "30%"] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} />
                          ))}
                        </div>
                      ) : isActive ? (
                        <span className="text-[#1DB954] font-semibold text-sm">{idx + 1}</span>
                      ) : (
                        <>
                          <span className="text-muted-foreground group-hover:hidden text-sm">{idx + 1}</span>
                          <Play className="h-3.5 w-3.5 text-foreground hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Title + artist */}
                    <div className="flex items-center gap-3 min-w-0">
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
                            {song.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[9px] bg-[#1DB954]/15 text-[#1DB954] px-1.5 py-0.5 rounded-full">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">{isActive ? formatTime(duration) : "—"}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1"
                        onClick={e => { e.stopPropagation(); setEditSong({ song, playlistId: selId }); }}
                        title="Edit details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                        onClick={e => { e.stopPropagation(); removeSongFromPlaylist(selId, song.id); }}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
