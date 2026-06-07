import { useState, useRef, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloudRain, Coffee, Flame, Wind, Maximize, Minimize, Volume2, Droplets, Waves, Trees, Moon, CloudLightning, Train, Radio, Library, Search, X, Upload, Music, Trash2, Globe, Loader2, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Track {
  id: string;
  name: string;
  icon?: any;
  src: string;
  color: string;
  isCustom?: boolean;
}

const DEFAULT_TRACKS: Track[] = [
  { id: "rain", name: "Rain", icon: CloudRain, src: "https://assets.mixkit.co/active_storage/sfx/2391/2391-preview.mp3", color: "text-blue-400" },
  { id: "thunder", name: "Thunder", icon: CloudLightning, src: "https://assets.mixkit.co/active_storage/sfx/2399/2399-preview.mp3", color: "text-indigo-400" },
  { id: "cafe", name: "Cafe", icon: Coffee, src: "https://assets.mixkit.co/active_storage/sfx/444/444-preview.mp3", color: "text-amber-600" },
  { id: "fire", name: "Fire", icon: Flame, src: "https://assets.mixkit.co/active_storage/sfx/2394/2394-preview.mp3", color: "text-orange-500" },
  { id: "wind", name: "Wind", icon: Wind, src: "https://assets.mixkit.co/active_storage/sfx/2400/2400-preview.mp3", color: "text-slate-400" },
  { id: "river", name: "River", icon: Droplets, src: "https://assets.mixkit.co/active_storage/sfx/2500/2500-preview.mp3", color: "text-cyan-400" },
  { id: "ocean", name: "Ocean", icon: Waves, src: "https://assets.mixkit.co/active_storage/sfx/118/118-preview.mp3", color: "text-blue-500" },
  { id: "forest", name: "Forest", icon: Trees, src: "https://assets.mixkit.co/active_storage/sfx/2502/2502-preview.mp3", color: "text-green-500" },
  { id: "night", name: "Night", icon: Moon, src: "https://assets.mixkit.co/active_storage/sfx/2506/2506-preview.mp3", color: "text-indigo-300" },
  { id: "train", name: "Train", icon: Train, src: "https://assets.mixkit.co/active_storage/sfx/2996/2996-preview.mp3", color: "text-stone-500" },
  { id: "whitenoise", name: "White Noise", icon: Radio, src: "https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3", color: "text-gray-300" },
];

export function AmbientMixer() {
  const { theme } = useAppContext();
  const { writeMedia, readMediaAsBlob, deleteMedia } = useWorkspaceContext();
  
  const [customTracks, setCustomTracks] = useLocalStorage<Track[]>("jee_ambient_custom_tracks", []);
  const [activeTrackIds, setActiveTrackIds] = useLocalStorage<string[]>("jee_ambient_active", DEFAULT_TRACKS.map(t => t.id));
  
  const allTracks = useMemo(() => [...DEFAULT_TRACKS, ...customTracks], [customTracks]);
  const activeTracks = useMemo(() => allTracks.filter(t => activeTrackIds.includes(t.id)), [allTracks, activeTrackIds]);

  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [libraryTab, setLibraryTab] = useState<"local" | "online">("local");
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [onlineSource, setOnlineSource] = useState<"mixkit" | "archive">("mixkit");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allTracks.filter(t => t.name.toLowerCase().includes(q));
  }, [allTracks, searchQuery]);

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          (audio as any).shouldBePlaying = false;
          audio.pause();
          audio.src = "";
        }
      });
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!showLibrary && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewUrl(null);
    }
  }, [showLibrary]);

  const togglePreview = (url: string) => {
    if (previewUrl === url) {
        previewAudioRef.current?.pause();
        setPreviewUrl(null);
    } else {
        if (previewAudioRef.current) previewAudioRef.current.pause();
        const audio = new Audio(url);
        audio.play().catch(() => setOnlineError("Failed to play preview."));
        audio.onended = () => setPreviewUrl(null);
        previewAudioRef.current = audio;
        setPreviewUrl(url);
    }
  };

  const loadAudio = async (track: Track) => {
    if (audioRefs.current[track.id]) return audioRefs.current[track.id];
    
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volumes[track.id] !== undefined ? volumes[track.id] / 100 : 0.5;
    audioRefs.current[track.id] = audio;

    if (track.isCustom && track.src.startsWith("http")) {
       audio.src = track.src;
    } else if (track.isCustom) {
       const blob = await readMediaAsBlob(track.src);
       if (blob) audio.src = URL.createObjectURL(blob);
    } else {
       audio.src = track.src;
    }
    
    return audio;
  };

  const togglePlay = async (id: string) => {
    const isPlaying = playing[id];
    let audio = audioRefs.current[id];
    
    if (!audio) {
       const track = allTracks.find(t => t.id === id);
       if (track) audio = await loadAudio(track);
    }

    if (audio) {
      if (isPlaying) {
        (audio as any).shouldBePlaying = false;
        audio.pause();
      } else {
        (audio as any).shouldBePlaying = true;
        audio.play().catch(() => {
          const playOnLoad = () => {
             if ((audio as any).shouldBePlaying) audio?.play().catch(console.error);
             audio?.removeEventListener('canplay', playOnLoad);
          };
          audio?.addEventListener('canplay', playOnLoad);
        });
      }
      setPlaying(prev => ({ ...prev, [id]: !isPlaying }));
    }
  };

  const handleVolume = async (id: string, val: number) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    let audio = audioRefs.current[id];
    if (!audio) {
      const track = allTracks.find(t => t.id === id);
      if (track) audio = await loadAudio(track);
    }
    if (audio) {
      audio.volume = val / 100;
      if (val > 0 && !playing[id]) {
        (audio as any).shouldBePlaying = true;
        audio.play().catch(() => {
          const playOnLoad = () => {
             if ((audio as any).shouldBePlaying) audio?.play().catch(console.error);
             audio?.removeEventListener('canplay', playOnLoad);
          };
          audio?.addEventListener('canplay', playOnLoad);
        });
        setPlaying(prev => ({ ...prev, [id]: true }));
      } else if (val === 0 && playing[id]) {
        (audio as any).shouldBePlaying = false;
        audio.pause();
        setPlaying(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const toggleMix = (id: string) => {
    setActiveTrackIds(prev => {
      if (prev.includes(id)) {
        if (playing[id]) {
          const audio = audioRefs.current[id];
          if (audio) {
            (audio as any).shouldBePlaying = false;
            audio.pause();
          }
          setPlaying(p => ({ ...p, [id]: false }));
        }
        return prev.filter(x => x !== id);
      }
      return [id, ...prev];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const id = `ambient_${Date.now()}`;
    const name = file.name.replace(/\.[^/.]+$/, "");
    await writeMedia(id, file);
    const newTrack: Track = { id, name, src: id, color: "text-primary", isCustom: true, icon: undefined };
    setCustomTracks(prev => [newTrack, ...prev]);
    setActiveTrackIds(prev => [id, ...prev]); 
  };

  const handleDeleteCustom = async (id: string, src: string) => {
    if (playing[id]) { 
      const audio = audioRefs.current[id]; 
      if (audio) {
        (audio as any).shouldBePlaying = false;
        audio.pause(); 
      }
      setPlaying(p => ({ ...p, [id]: false })); 
    }
    setActiveTrackIds(prev => prev.filter(x => x !== id));
    setCustomTracks(prev => prev.filter(x => x.id !== id));
    if (audioRefs.current[id]) { audioRefs.current[id]!.src = ""; delete audioRefs.current[id]; }
    if (!src.startsWith("http")) {
      await deleteMedia(src);
    }
  };

  const handleOnlineSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingOnline(true);
    setOnlineError("");
    setOnlineResults([]);

    try {
      if (onlineSource === "archive") {
        const q = encodeURIComponent(searchQuery);
        const res = await fetch(`https://archive.org/advancedsearch.php?q=mediatype:audio+AND+title:(${q})&fl[]=identifier,title,creator&sort[]=downloads+desc&rows=50&output=json`);
        if (!res.ok) throw new Error("Failed to fetch from Internet Archive");
        const data = await res.json();
        const docs = data.response?.docs || [];
        
        if (docs.length === 0) {
          setOnlineError("No results found. Try a different search term.");
        } else {
          setOnlineResults(docs.map((doc: any) => ({
            id: `ia_${doc.identifier}`,
            originalId: doc.identifier,
            title: doc.title || "Unknown Audio",
            author: doc.creator || "Unknown Author",
            thumbnail: `https://archive.org/services/img/${doc.identifier}`,
            source: "archive"
          })));
        }
      } else {
        const q = encodeURIComponent(searchQuery.replace(/\s+/g, '-'));
        const fetchMixkit = async (type: string) => {
           let html = "";
           const targetUrl = `https://mixkit.co/free-${type}/${q}/`;
           try {
             const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
             const data = await res.json();
             if (data.contents) html = data.contents;
           } catch(e) {}
           
           if (!html) {
             const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
             html = await res.text();
           }
           
           const doc = new DOMParser().parseFromString(html, "text/html");
           const playerEls = doc.querySelectorAll("[data-audio-player-preview-url-value]");
           
           return Array.from(playerEls).map(el => {
              const url = el.getAttribute("data-audio-player-preview-url-value");
              if (!url) return null;
              
              const card = el.closest(".item-grid-item, .item-grid-card, .music-track-row") || el.parentElement?.parentElement;
              const titleEl = card?.querySelector(".item-grid-card__title, .item-grid-music-preview__title, .music-track-row__title, h2");
              const authorEl = card?.querySelector(".item-grid-card__author, .item-grid-music-preview__author, .music-track-row__author");
              
              let title = titleEl?.textContent?.trim();
              if (!title) {
                 const match = url.match(/\/([^/]+)-preview\.mp3/);
                 title = match ? match[1].replace(/-/g, ' ') : "Mixkit Sound";
              }
              
              const idMatches = url.match(/\/(\d+)\//);
              const id = idMatches ? `mixkit_${idMatches[1]}` : `mixkit_${Math.random().toString(36).slice(2)}`;
              
              return {
                  id,
                  title,
                  author: authorEl?.textContent?.trim().replace(/^By\s+/i, '') || "Mixkit",
                  url,
                  source: "mixkit"
              };
           }).filter(Boolean);
        };

        const [sfx, music] = await Promise.all([
           fetchMixkit("sound-effects"),
           fetchMixkit("stock-music")
        ]);

        const combined = [...sfx, ...music].filter((v, i, a) => a.findIndex(t => t?.url === v?.url) === i);

        if (combined.length === 0) {
          setOnlineError("No results found on Mixkit. Try a different term.");
        } else {
          setOnlineResults(combined);
        }
      }
    } catch (err: any) { setOnlineError("Search failed. Please try again."); console.error(err); } finally { setIsSearchingOnline(false); }
  };

  const handleAddOnlineTrack = async (result: any) => {
    if (result.source === "archive") {
      const id = `ambient_ia_${result.originalId}`;
      if (customTracks.some(t => t.id === id)) { if (!activeTrackIds.includes(id)) setActiveTrackIds(prev => [id, ...prev]); return; }
      
      setResolvingId(result.originalId);
      try {
        const res = await fetch(`https://archive.org/metadata/${result.originalId}`);
        const data = await res.json();
        const audioFile = data.files?.find((f: any) => f.format?.includes("MP3") || f.format?.includes("Ogg") || f.format?.includes("Flac"));
        if (!audioFile) {
           setOnlineError(`No playable audio format found for "${result.title}".`);
           return;
        }
        const streamUrl = `https://archive.org/download/${result.originalId}/${audioFile.name}`;
        const newTrack: Track = { id, name: result.title, src: streamUrl, color: "text-blue-500", isCustom: true, icon: undefined };
        setCustomTracks(prev => [newTrack, ...prev]);
        setActiveTrackIds(prev => [id, ...prev]);
      } catch (e) {
        setOnlineError(`Failed to resolve audio for "${result.title}".`);
      } finally {
        setResolvingId(null);
      }
    } else {
      const id = result.id;
      if (customTracks.some(t => t.id === id)) { if (!activeTrackIds.includes(id)) setActiveTrackIds(prev => [id, ...prev]); return; }
      
      const newTrack: Track = { id, name: result.title, src: result.url, color: "text-blue-500", isCustom: true, icon: undefined };
      setCustomTracks(prev => [newTrack, ...prev]);
      setActiveTrackIds(prev => [id, ...prev]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Card className={`p-6 border-border backdrop-blur-xl transition-all duration-500 flex flex-col ${isFullscreen ? "fixed inset-0 z-[100] bg-black/95 rounded-none" : "bg-card/50 h-full border-0 rounded-none"}`}>
      <div className="flex items-center justify-between mb-6 w-full max-w-4xl mx-auto shrink-0">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Volume2 className="h-5 w-5 text-primary" /> Ambient Mixer
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Zen mode for deep focus</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)} className="gap-1.5 h-9 text-xs">
            <Library className="h-4 w-4" /> Library
          </Button>
          
        </div>
      </div>

      <div className={`grid gap-4 w-full max-w-4xl mx-auto overflow-y-auto pb-4 pr-1 ${isFullscreen ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {activeTracks.map(track => {
          const isTrackPlaying = playing[track.id];
          const volume = volumes[track.id] ?? 50;
          const Icon = track.icon || (track.src.startsWith("http") ? Globe : Music);
          
          return (
            <motion.div 
              key={track.id}
              layout
              className={`p-4 rounded-2xl border transition-all ${isTrackPlaying ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border/50"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isTrackPlaying ? "bg-primary/20" : "bg-muted"}`}>
                    <Icon className={`h-6 w-6 transition-colors ${isTrackPlaying ? track.color : "text-muted-foreground"}`} />
                  </div>
                  <span className="font-semibold text-sm text-foreground truncate">{track.name}</span>
                </div>
                <button 
                  onClick={() => togglePlay(track.id)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${isTrackPlaying ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  <div className={`w-3 h-3 rounded-full transition-all ${isTrackPlaying ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
                </button>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume} 
                onChange={(e) => handleVolume(track.id, parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-muted outline-none accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${volume}%, hsl(var(--muted)) ${volume}%)`
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showLibrary && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLibrary(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" /> Audio Library
                  </h2>
                  <div className="flex bg-muted rounded-lg p-0.5">
                    <button onClick={() => setLibraryTab("local")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${libraryTab === "local" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Local</button>
                    <button onClick={() => setLibraryTab("online")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${libraryTab === "online" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Online Search</button>
                  </div>
                </div>
                <button onClick={() => setShowLibrary(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {libraryTab === "local" ? (
                <div className="p-4 border-b border-border flex gap-2 shrink-0">
                   <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tracks..." className="pl-9 h-9 text-xs bg-muted/50 border-border" />
                   </div>
                   <Button size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={() => fileInputRef.current?.click()}>
                     <Upload className="h-4 w-4" /> Add Track
                   </Button>
                   <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </div>
              ) : (
                <div className="p-4 border-b border-border flex gap-2 shrink-0 flex-col">
                   <div className="flex gap-2">
                     <select 
                       value={onlineSource}
                       onChange={e => setOnlineSource(e.target.value as "mixkit" | "archive")}
                       className="h-9 text-xs bg-muted border border-border rounded-md px-2 outline-none focus:ring-1 focus:ring-primary/50"
                     >
                       <option value="mixkit">Mixkit</option>
                       <option value="archive">Archive</option>
                     </select>
                     <div className="relative flex-1">
                       <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                       <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleOnlineSearch()} placeholder={onlineSource === "mixkit" ? "Search Mixkit for ambient audio..." : "Search Internet Archive..."} className="pl-9 h-9 text-xs bg-muted/50 border-border" />
                     </div>
                     <Button size="sm" className="h-9 gap-1.5 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleOnlineSearch} disabled={isSearchingOnline}>
                       {isSearchingOnline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
                     </Button>
                   </div>
                   {onlineError && <p className="text-xs text-red-400">{onlineError}</p>}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                 {libraryTab === "local" ? (
                   <>
                     {filteredTracks.map(track => {
                        const inMix = activeTrackIds.includes(track.id);
                        const Icon = track.icon || (track.src.startsWith("http") ? Globe : Music);
                        return (
                          <div key={track.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg bg-primary/10 ${track.color || "text-primary"}`}>
                                 <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-semibold truncate">{track.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {track.isCustom && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCustom(track.id, track.src)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant={inMix ? "secondary" : "outline"} size="sm" className="h-7 text-[10px] px-3 shrink-0" onClick={() => toggleMix(track.id)}>
                                {inMix ? "Remove" : "Add to Mix"}
                              </Button>
                            </div>
                          </div>
                        )
                     })}
                     {filteredTracks.length === 0 && (
                       <div className="col-span-full py-10 text-center text-muted-foreground"><Music className="h-10 w-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No tracks found.</p></div>
                     )}
                   </>
                 ) : (
                   <>
                     {isSearchingOnline && onlineResults.length === 0 && (
                       <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground">
                         <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                         <p className="text-sm">Searching the web...</p>
                       </div>
                     )}
                     {!isSearchingOnline && onlineResults.length === 0 && (
                       <div className="col-span-full py-10 text-center text-muted-foreground">
                         <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" />
                         <p className="text-sm">Search to find ambient tracks online.</p>
                       </div>
                     )}
                     {onlineResults.map(result => {
                        const trackId = result.source === 'archive' ? `ambient_ia_${result.originalId}` : result.id;
                        const inMix = activeTrackIds.includes(trackId);
                        const isPreviewing = previewUrl === result.url;
                        const isResolving = resolvingId === result.originalId;
                        return (
                          <div key={result.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                             {result.source === 'archive' ? (
                                <img src={result.thumbnail} className="w-10 h-10 rounded object-cover shrink-0 bg-muted" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                             ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                   <Music className="h-5 w-5 text-primary" />
                                </div>
                             )}
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                               <p className="text-xs text-muted-foreground truncate">{result.author}</p>
                             </div>
                             <div className="flex flex-col gap-1.5 shrink-0">
                               {result.source === 'mixkit' && (
                                 <Button variant={isPreviewing ? "default" : "secondary"} size="sm" className="h-6 text-[10px] px-2" onClick={() => togglePreview(result.url)}>
                                   {isPreviewing ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                                   {isPreviewing ? "Stop" : "Preview"}
                                 </Button>
                               )}
                               <Button variant={inMix ? "secondary" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => handleAddOnlineTrack(result)} disabled={isResolving}>
                                 {isResolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : inMix ? "Added" : "Import"}
                               </Button>
                             </div>
                          </div>
                        )
                     })}
                   </>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}