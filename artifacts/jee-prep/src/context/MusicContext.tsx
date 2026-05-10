import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { idbSet, idbGet } from "@/lib/idb";
import { loadYouTubeApi } from "@/lib/youtube-api";
import { useWorkspaceContext } from "./WorkspaceContext";

export interface Song {
  id: string;
  title: string;
  artist: string;
  description?: string;
  tags?: string[];
  url: string;
  youtubeId?: string;
  coverUrl?: string;
  duration?: number;
  isLocal?: boolean;
  idbKey?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

interface MusicContextType {
  playlists: Playlist[];
  currentSong: Song | null;
  currentPlaylistId: string | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: "none" | "one" | "all";
  addPlaylist: (name: string) => void;
  addPlaylistWithSongs: (name: string, songs: Song[]) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  addLocalSongToPlaylist: (playlistId: string, song: Song, fileData: ArrayBuffer) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  updateSong: (playlistId: string, songId: string, updates: Partial<Song>) => void;
  playSong: (song: Song, playlistId?: string) => void;
  togglePlay: () => void;
  stopMusic: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  seek: (time: number) => void;
  nextSong: () => void;
  prevSong: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  getAudioElement: () => HTMLAudioElement | null;
  analyserNode: AnalyserNode | null;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

function loadPlaylistsFromStorage(): Playlist[] {
  try {
    const item = window.localStorage.getItem("jee_playlists");
    if (item) return JSON.parse(item);
  } catch {}
  return [{ id: "default", name: "Favorites", songs: [] }];
}

function resolveUrl(url: string): string {
  if (url.startsWith("yt:")) {
    const videoId = url.slice(3);
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return `/api/stream?url=${encodeURIComponent(ytUrl)}`;
  }
  return url;
}

function getYouTubeId(song: Song): string | null {
  if (song.youtubeId) return song.youtubeId;
  if (song.url?.startsWith("yt:")) return song.url.slice(3);
  if (song.url) {
    const patterns = [
      /[?&]v=([^&#]+)/,
      /youtu\.be\/([^?#]+)/,
      /youtube\.com\/embed\/([^?#]+)/,
      /youtube\.com\/shorts\/([^?#]+)/,
    ];
    for (const pattern of patterns) {
      const m = song.url.match(pattern);
      if (m) return m[1];
    }
  }
  // Backward compat: songs added before the static-hosting migration have
  // url="/api/stream?url=https://youtube.com/watch?v=XXX" — extract the ID.
  if (song.url?.includes("/api/stream?url=")) {
    try {
      const inner = decodeURIComponent(song.url.split("url=")[1] ?? "");
      const m = inner.match(/[?&]v=([^&#]+)/) ?? inner.match(/youtu\.be\/([^?#]+)/);
      if (m) return m[1];
    } catch {}
  }
  return null;
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const { writeMedia, readMediaAsArrayBuffer } = useWorkspaceContext();
  const [playlists, setPlaylists] = useState<Playlist[]>(loadPlaylistsFromStorage);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // HTML5 Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // YouTube IFrame refs
  const ytPlayerRef = useRef<any>(null);
  const ytDivRef = useRef<HTMLDivElement | null>(null);
  const ytProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isYtModeRef = useRef(false);

  // Stable value refs
  const skipSaveRef = useRef(true);
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const volumeRef = useRef(0.8);
  const isMutedRef = useRef(false);
  const repeatModeRef = useRef<"none" | "one" | "all">("none");
  const currentSongRef = useRef<Song | null>(null);
  const currentPlaylistIdRef = useRef<string | null>(null);
  const playlistsRef = useRef<Playlist[]>(playlists);

  // Keep refs in sync with state
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { currentPlaylistIdRef.current = currentPlaylistId; }, [currentPlaylistId]);
  useEffect(() => { playlistsRef.current = playlists; }, [playlists]);

  // ── Restore local song blob URLs from IndexedDB on mount ─────────────────
  useEffect(() => {
    const restore = async () => {
      const stored = loadPlaylistsFromStorage();
      const hasLocal = stored.some(p => p.songs.some(s => s.isLocal && s.idbKey));
      if (!hasLocal) { skipSaveRef.current = false; return; }
      const restored = await Promise.all(
        stored.map(async p => ({
          ...p,
          songs: await Promise.all(
            p.songs.map(async s => {
              if (s.isLocal && s.idbKey) {
                try {
                  const buf = await readMediaAsArrayBuffer(s.idbKey);
                  if (buf) {
                    const blob = new Blob([buf], { type: "audio/mpeg" });
                    return { ...s, url: URL.createObjectURL(blob) };
                  }
                } catch {}
              }
              return s;
            })
          ),
        }))
      );
      setPlaylists(restored);
      skipSaveRef.current = false;
    };
    restore();
  }, []);

  // ── Persist playlists ────────────────────────────────────────────────────
  useEffect(() => {
    if (skipSaveRef.current) return;
    const toSave = playlists.map(p => ({
      ...p,
      songs: p.songs.map(s => (s.isLocal ? { ...s, url: "" } : s)),
    }));
    window.localStorage.setItem("jee_playlists", JSON.stringify(toSave));
  }, [playlists]);

  // ── Audio element setup ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audioRef.current = audio;

    const initAudioContext = () => {
      if (audioCtxRef.current) return;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        setAnalyserNode(analyser);
      } catch {}
    };

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
      progressRef.current = audio.currentTime;
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      durationRef.current = audio.duration;
    };
    const onPlay = () => {
      initAudioContext();
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    const onEnded = () => {
      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      handleSongEndRef.current();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, []);

  // ── handleSongEnd — kept as a ref so YouTube player can call the latest version ──
  const handleSongEndRef = useRef<() => void>(() => {});
  const handleSongEnd = useCallback(() => {
    const rm = repeatModeRef.current;
    if (rm === "one") return; // handled by audio element / YT onStateChange

    const cs = currentSongRef.current;
    const cpid = currentPlaylistIdRef.current;
    const pls = playlistsRef.current;

    if (!cs || !cpid) { setIsPlaying(false); return; }
    const playlist = pls.find(p => p.id === cpid);
    if (!playlist || playlist.songs.length === 0) { setIsPlaying(false); return; }

    const idx = playlist.songs.findIndex(s => s.id === cs.id);
    let nextIdx: number;
    if (rm === "none") {
      if (idx >= playlist.songs.length - 1) { setIsPlaying(false); return; }
      nextIdx = idx + 1;
    } else {
      nextIdx = (idx + 1) % playlist.songs.length;
    }
    const next = playlist.songs[nextIdx];
    playSongRef.current(next, cpid);
  }, []);

  useEffect(() => { handleSongEndRef.current = handleSongEnd; }, [handleSongEnd]);

  // ── YouTube IFrame helpers ────────────────────────────────────────────────
  const playYouTubeSong = useCallback(async (videoId: string) => {
    try {
      await loadYouTubeApi();
      const YT = (window as any).YT;
      if (!YT?.Player) return;

      // Stop HTML5 progress
      if (ytProgressIntervalRef.current) {
        clearInterval(ytProgressIntervalRef.current);
        ytProgressIntervalRef.current = null;
      }

      const startProgress = (player: any) => {
        if (ytProgressIntervalRef.current) clearInterval(ytProgressIntervalRef.current);
        ytProgressIntervalRef.current = setInterval(() => {
          try {
            const t = player.getCurrentTime?.() ?? 0;
            const d = player.getDuration?.() ?? 0;
            setProgress(t); progressRef.current = t;
            if (d > 0) { setDuration(d); durationRef.current = d; }
          } catch {}
        }, 500);
      };

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
        ytPlayerRef.current.loadVideoById(videoId);
        ytPlayerRef.current.setVolume(Math.round(volumeRef.current * 100));
        if (isMutedRef.current) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
        return;
      }

      if (!ytDivRef.current) return;

      ytPlayerRef.current = new YT.Player(ytDivRef.current, {
        height: "1",
        width: "1",
        videoId,
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(Math.round(volumeRef.current * 100));
            if (isMutedRef.current) e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            const State = YT.PlayerState;
            if (e.data === State.PLAYING) {
              setIsPlaying(true);
              const dur = e.target.getDuration?.() ?? 0;
              if (dur > 0) { setDuration(dur); durationRef.current = dur; }
              startProgress(e.target);
            } else if (e.data === State.PAUSED) {
              setIsPlaying(false);
            } else if (e.data === State.ENDED) {
              setIsPlaying(false);
              if (ytProgressIntervalRef.current) {
                clearInterval(ytProgressIntervalRef.current);
                ytProgressIntervalRef.current = null;
              }
              if (repeatModeRef.current === "one") {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } else {
                handleSongEndRef.current();
              }
            }
          },
          onError: () => { setIsPlaying(false); },
        },
      });
    } catch (err) {
      console.error("YouTube IFrame error:", err);
    }
  }, []);

  // Keep a ref to playSong so handleSongEnd can call the latest version
  const playSongRef = useRef<(song: Song, playlistId?: string) => void>(() => {});

  const playSong = useCallback(async (song: Song, playlistId?: string) => {
    setCurrentSong(song);
    if (playlistId) setCurrentPlaylistId(playlistId);
    setProgress(0);
    setDuration(0);
    progressRef.current = 0;
    durationRef.current = 0;

    // Stop YT polling
    if (ytProgressIntervalRef.current) {
      clearInterval(ytProgressIntervalRef.current);
      ytProgressIntervalRef.current = null;
    }

    let ytId = getYouTubeId(song);

    // Just-In-Time resolution for Spotify tracks mapped via "ytsearch:"
    if (!ytId && song.url && song.url.startsWith("ytsearch:")) {
      const query = song.url.slice(9);
      console.log(`[Spotify→Audio] Resolving: "${query}"`);

      // Add "audio" to query for better search results
      const searchQuery = `${query} audio official`;

      // Strategy 1: Try Invidious API via CORS proxy with timeout
      if (!ytId) {
        const invidious_instances = [
          "https://invidious.privacydev.net",
          "https://inv.tux.pizza",
          "https://invidious.flokinet.to",
          "https://invidious.nerdvpn.de"
        ];

        for (const instance of invidious_instances) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            // Direct fetch (these instances usually support CORS)
            const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
              const data = await res.json();

              if (Array.isArray(data) && data[0]?.videoId) {
                ytId = data[0].videoId;
                console.log(`[Spotify→Audio SUCCESS] Found: ${data[0].title} (${ytId})`);
                if (playlistId) {
                  setPlaylists(prev => prev.map(p => 
                    p.id === playlistId ? { 
                      ...p, 
                      songs: p.songs.map(s => 
                        s.id === song.id ? { 
                          ...s, 
                          youtubeId: ytId ?? undefined, 
                          url: `https://www.youtube.com/watch?v=${ytId}`,
                          duration: data[0].lengthSeconds || 0
                        } : s
                      ) 
                    } : p
                  ));
                }
                break;
              }
            }
          } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
              console.warn(`[Spotify→Audio] Invidious ${invidious_instances.indexOf(invidious_instances.find(i => i) || "")} timeout`);
            }
          }
        }
      }

      // Strategy 2: Try YouTube HTML scraping as fallback (with timeout)
      if (!ytId) {
        try {
          const fetchHtml = async (targetUrl: string) => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 4000);

              const res = await fetch(
                `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
                { signal: controller.signal }
              );
              clearTimeout(timeout);

              if (res.ok) {
                const data = await res.json();
                if (data.contents) return data.contents;
              }
            } catch (e) {}

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);

            const res2 = await fetch(
              `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
              { signal: controller.signal }
            );
            clearTimeout(timeout);

            if (!res2.ok) throw new Error("Failed to fetch proxy");
            return await res2.text();
          };

          const html = await fetchHtml(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&gl=US&hl=en`
          );

          const match = html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});/s)
            || html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]+?\});/s);

          if (match) {
            try {
              const ytData = JSON.parse(match[1]);
              let firstVideoId: string | null = null;
              const findVideo = (obj: any) => {
                if (firstVideoId) return;
                if (Array.isArray(obj)) {
                  for (const item of obj) findVideo(item);
                } else if (obj !== null && typeof obj === 'object') {
                  if (obj.videoRenderer && obj.videoRenderer.videoId) {
                    firstVideoId = obj.videoRenderer.videoId;
                  } else {
                    for (const key of Object.keys(obj)) findVideo(obj[key]);
                  }
                }
              };
              findVideo(ytData);

              if (firstVideoId) {
                ytId = firstVideoId;
                console.log(`[Spotify→Audio SUCCESS] Found via YouTube: ${firstVideoId}`);
                if (playlistId) {
                  setPlaylists(prev => prev.map(p => 
                    p.id === playlistId ? { 
                      ...p, 
                      songs: p.songs.map(s => 
                        s.id === song.id ? { 
                          ...s, 
                          youtubeId: firstVideoId ?? undefined, 
                          url: `https://www.youtube.com/watch?v=${firstVideoId}` 
                        } : s
                      ) 
                    } : p
                  ));
                }
              } else {
                console.warn(`[Spotify→Audio] No results for: "${query}"`);
              }
            } catch (parseErr) {
              console.warn(`[Spotify→Audio] Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
            }
          }
        } catch (err) {
          console.warn(`[Spotify→Audio] Scrape failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!ytId) {
        console.error(`[Spotify→Audio FAILED] Could not find audio for: "${query}"`);
      }
    }

    if (ytId) {
      // YouTube IFrame mode
      isYtModeRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      setIsPlaying(false);
      playYouTubeSong(ytId);
    } else {
      // HTML5 Audio mode
      isYtModeRef.current = false;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      }
      // Only attempt to play if URL is not a ytsearch: placeholder (unresolved Spotify track)
      if (song.url && audioRef.current && !song.url.startsWith("ytsearch:")) {
        audioRef.current.src = resolveUrl(song.url);
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => {
          console.error(`[Playback Error] Failed to play audio for: ${song.title}`, err);
          setIsPlaying(false);
        });
      } else if (song.url?.startsWith("ytsearch:")) {
        // Unresolved Spotify track - show warning
        console.error(`[Spotify Playback Failed] Could not resolve to YouTube: "${song.title}" by ${song.artist}. Try adding again or use a different track.`);
        setIsPlaying(false);
      }
    }
  }, [playYouTubeSong]);

  useEffect(() => { playSongRef.current = playSong; }, [playSong]);

  const togglePlay = useCallback(() => {
    if (!currentSongRef.current) return;
    if (isYtModeRef.current && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [isPlaying]);

  const stopMusic = useCallback(() => {
    if (ytProgressIntervalRef.current) {
      clearInterval(ytProgressIntervalRef.current);
      ytProgressIntervalRef.current = null;
    }
    if (isYtModeRef.current && ytPlayerRef.current) {
      try { ytPlayerRef.current.pauseVideo(); } catch {}
      isYtModeRef.current = false;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentPlaylistId(null);
    setProgress(0);
    setDuration(0);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (isMutedRef.current && clamped > 0) {
      setIsMuted(false);
      isMutedRef.current = false;
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = false;
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(Math.round(clamped * 100));
        if (clamped > 0) ytPlayerRef.current.unMute();
      } catch {}
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nowMuted = !isMutedRef.current;
    isMutedRef.current = nowMuted;
    setIsMuted(nowMuted);
    if (audioRef.current) audioRef.current.muted = nowMuted;
    if (ytPlayerRef.current) {
      try { if (nowMuted) ytPlayerRef.current.mute(); else ytPlayerRef.current.unMute(); } catch {}
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!Number.isFinite(time) || time < 0) return;
    const clamped = durationRef.current > 0 ? Math.min(time, durationRef.current) : time;
    setProgress(clamped);
    progressRef.current = clamped;
    if (isYtModeRef.current && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(clamped, true); } catch {}
      return;
    }
    if (audioRef.current) {
      try { audioRef.current.currentTime = clamped; } catch {}
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "input" || tag === "textarea" || tag === "select" || editable) return;

      switch (e.key) {
        case "ArrowRight": {
          e.preventDefault();
          const next = progressRef.current + 5;
          const dur = durationRef.current;
          const clamped = dur > 0 && Number.isFinite(dur) ? Math.min(next, dur) : next;
          if (Number.isFinite(clamped)) {
            if (isYtModeRef.current && ytPlayerRef.current) {
              try { ytPlayerRef.current.seekTo(clamped, true); } catch {}
            } else if (audioRef.current) {
              try { audioRef.current.currentTime = clamped; } catch {}
            }
            setProgress(clamped);
            progressRef.current = clamped;
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const prev = Math.max(0, progressRef.current - 5);
          if (isYtModeRef.current && ytPlayerRef.current) {
            try { ytPlayerRef.current.seekTo(prev, true); } catch {}
          } else if (audioRef.current) {
            try { audioRef.current.currentTime = prev; } catch {}
          }
          setProgress(prev);
          progressRef.current = prev;
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const newVol = Math.min(1, volumeRef.current + 0.1);
          const rounded = Math.round(newVol * 10) / 10;
          setVolumeState(rounded);
          volumeRef.current = rounded;
          if (isMutedRef.current) { isMutedRef.current = false; setIsMuted(false); }
          if (audioRef.current) { audioRef.current.volume = rounded; audioRef.current.muted = false; }
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(Math.round(rounded * 100)); ytPlayerRef.current.unMute(); } catch {}
          }
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const newVol = Math.max(0, volumeRef.current - 0.1);
          const rounded = Math.round(newVol * 10) / 10;
          setVolumeState(rounded);
          volumeRef.current = rounded;
          if (audioRef.current) audioRef.current.volume = rounded;
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(Math.round(rounded * 100)); } catch {}
          }
          break;
        }
        case "m":
        case "M": {
          e.preventDefault();
          const nowMuted = !isMutedRef.current;
          isMutedRef.current = nowMuted;
          setIsMuted(nowMuted);
          if (audioRef.current) audioRef.current.muted = nowMuted;
          if (ytPlayerRef.current) {
            try { if (nowMuted) ytPlayerRef.current.mute(); else ytPlayerRef.current.unMute(); } catch {}
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const nextSong = useCallback(() => {
    const cs = currentSongRef.current;
    const cpid = currentPlaylistIdRef.current;
    const pls = playlistsRef.current;
    if (!cs || !cpid) return;
    const playlist = pls.find(p => p.id === cpid);
    if (!playlist || playlist.songs.length === 0) return;
    const idx = playlist.songs.findIndex(s => s.id === cs.id);
    const nextIdx = isShuffle
      ? Math.floor(Math.random() * playlist.songs.length)
      : (idx + 1) % playlist.songs.length;
    playSong(playlist.songs[nextIdx], cpid);
  }, [isShuffle, playSong]);

  const prevSong = useCallback(() => {
    const cs = currentSongRef.current;
    const cpid = currentPlaylistIdRef.current;
    const pls = playlistsRef.current;
    if (!cs || !cpid) return;
    if (!isYtModeRef.current && audioRef.current && audioRef.current.currentTime > 3) {
      try { audioRef.current.currentTime = 0; } catch {}
      return;
    }
    if (isYtModeRef.current && ytPlayerRef.current) {
      try {
        if ((ytPlayerRef.current.getCurrentTime?.() ?? 0) > 3) {
          ytPlayerRef.current.seekTo(0, true);
          return;
        }
      } catch {}
    }
    const playlist = pls.find(p => p.id === cpid);
    if (!playlist || playlist.songs.length === 0) return;
    const idx = playlist.songs.findIndex(s => s.id === cs.id);
    const prevIdx = (idx - 1 + playlist.songs.length) % playlist.songs.length;
    playSong(playlist.songs[prevIdx], cpid);
  }, [playSong]);

  const addPlaylist = (name: string) =>
    setPlaylists(prev => [...prev, { id: Date.now().toString(), name, songs: [] }]);

  const addPlaylistWithSongs = (name: string, songs: Song[]): string => {
    const newId = Date.now().toString();
    setPlaylists(prev => [...prev, { id: newId, name, songs }]);
    return newId;
  };

  const deletePlaylist = (id: string) =>
    setPlaylists(prev => prev.filter(p => p.id !== id));

  const renamePlaylist = (id: string, name: string) =>
    setPlaylists(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));

  const addSongToPlaylist = (playlistId: string, song: Song) =>
    setPlaylists(prev =>
      prev.map(p => (p.id === playlistId ? { ...p, songs: [...p.songs, song] } : p))
    );

  const addLocalSongToPlaylist = async (
    playlistId: string, song: Song, fileData: ArrayBuffer
  ): Promise<void> => {
    if (song.idbKey) await writeMedia(song.idbKey, fileData);
    addSongToPlaylist(playlistId, song);
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) =>
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId) } : p
      )
    );

  const updateSong = (playlistId: string, songId: string, updates: Partial<Song>) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, songs: p.songs.map(s => s.id === songId ? { ...s, ...updates } : s) }
          : p
      )
    );
    setCurrentSong(prev => (prev && prev.id === songId ? { ...prev, ...updates } : prev));
  };

  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const toggleRepeat = () =>
    setRepeatMode(prev => (prev === "none" ? "all" : prev === "all" ? "one" : "none"));

  const getAudioElement = () => audioRef.current;

  return (
    <MusicContext.Provider
      value={{
        playlists, currentSong, currentPlaylistId, isPlaying, volume, isMuted,
        progress, duration, isShuffle, repeatMode, analyserNode,
        addPlaylist, addPlaylistWithSongs, deletePlaylist, renamePlaylist,
        addSongToPlaylist, addLocalSongToPlaylist, removeSongFromPlaylist,
        updateSong,
        playSong, togglePlay, stopMusic, setVolume, toggleMute, seek,
        nextSong, prevSong, toggleShuffle, toggleRepeat, getAudioElement,
      }}
    >
      {children}
      {/* Hidden div for YouTube IFrame music player */}
      <div
        ref={ytDivRef}
        id="jee-yt-music-player"
        style={{
          position: "fixed",
          width: "1px",
          height: "1px",
          top: "-100px",
          left: "-100px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
    </MusicContext.Provider>
  );
}

export function useMusicContext() {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusicContext must be used within a MusicProvider");
  return context;
}
