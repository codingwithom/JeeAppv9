import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, SkipBack, SkipForward } from "lucide-react";
import { useVideoContext } from "@/context/VideoContext";

function getYouTubeId(url: string): string | null {
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?#]+)/, /youtube\.com\/embed\/([^?#]+)/, /youtube\.com\/shorts\/([^?#]+)/];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoMiniPlayer() {
  const { miniState, deactivateMiniPlayer, updateMiniState } = useVideoContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, posX: 200, posY: 200 });
  const [localTime, setLocalTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!miniState || initialized) return;
    setInitialized(true);
    const x = Math.max(20, window.innerWidth - 360);
    const y = Math.max(20, window.innerHeight - 240);
    dragRef.current.posX = x;
    dragRef.current.posY = y;
    if (miniRef.current) miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, [miniState, initialized]);

  useEffect(() => {
    if (!miniState) { setInitialized(false); return; }
  }, [miniState]);

  useEffect(() => {
    if (!miniState || miniState.videoType !== "html5") return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => { setLocalTime(v.currentTime); updateMiniState({ currentTime: v.currentTime }); };
    const onMeta = () => setLocalDuration(v.duration || 0);
    const onPlay = () => updateMiniState({ isPlaying: true });
    const onPause = () => updateMiniState({ isPlaying: false });
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [miniState, updateMiniState]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("video") || (e.target as HTMLElement).closest("iframe")) return;
    dragRef.current.active = true;
    dragRef.current.startX = e.clientX - dragRef.current.posX;
    dragRef.current.startY = e.clientY - dragRef.current.posY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const x = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragRef.current.startX));
    const y = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragRef.current.startY));
    dragRef.current.posX = x; dragRef.current.posY = y;
    if (miniRef.current) miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current.active = false; }, []);

  const handlePlayPause = useCallback(() => {
    if (!miniState) return;
    if (miniState.videoType === "html5") {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {}); else v.pause();
    }
    updateMiniState({ isPlaying: !miniState.isPlaying });
  }, [miniState, updateMiniState]);

  const seek = useCallback((delta: number) => {
    if (!miniState) return;
    if (miniState.videoType === "html5" && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + delta);
    }
  }, [miniState]);

  if (!miniState) return null;

  const ytId = miniState.videoType === "youtube"
    ? (miniState.ytVideoId || getYouTubeId(miniState.src))
    : null;

  const progress = localDuration > 0 ? (localTime / localDuration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={miniRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-0 left-0 z-[9999] w-80 rounded-2xl overflow-hidden shadow-2xl border border-border bg-black"
        style={{ transform: `translate(${dragRef.current.posX}px, ${dragRef.current.posY}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center justify-between px-2 py-1.5 bg-card/90 backdrop-blur cursor-grab active:cursor-grabbing border-b border-border/50">
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] text-foreground font-medium truncate">{miniState.title}</p>
            <p className="text-[9px] text-muted-foreground">{miniState.sourceLabel}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => seek(-10)} className="p-1 hover:bg-accent rounded text-foreground/80"><SkipBack className="h-3 w-3" /></button>
            <button onClick={handlePlayPause} className="p-1 hover:bg-accent rounded text-foreground/80">
              {miniState.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button onClick={() => seek(10)} className="p-1 hover:bg-accent rounded text-foreground/80"><SkipForward className="h-3 w-3" /></button>
            <button onClick={deactivateMiniPlayer} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-foreground/80"><X className="h-3 w-3" /></button>
          </div>
        </div>

        <div className="relative" style={{ aspectRatio: "16/9" }}>
          {miniState.videoType === "html5" && (
            <video
              ref={videoRef}
              src={miniState.src}
              className="w-full h-full object-contain"
              playsInline
              muted={miniState.muted}
              onClick={handlePlayPause}
              onLoadedMetadata={e => {
                const v = e.currentTarget;
                v.currentTime = miniState.currentTime;
                v.playbackRate = miniState.speed;
                v.volume = miniState.volume;
                if (miniState.isPlaying) v.play().catch(() => {});
              }}
            />
          )}
          {miniState.videoType === "youtube" && ytId && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?start=${Math.floor(miniState.currentTime)}&autoplay=1&rel=0&modestbranding=1&controls=1`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}
          {miniState.videoType === "html5" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 pointer-events-none">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {miniState.videoType === "html5" && localDuration > 0 && (
          <div className="px-2 py-1 bg-black/80 flex items-center gap-2">
            <span className="text-[9px] text-white/60 tabular-nums">{fmt(localTime)}</span>
            <div
              className="flex-1 h-1 bg-white/20 rounded cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const t = ((e.clientX - rect.left) / rect.width) * localDuration;
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
            >
              <div className="h-full bg-primary rounded" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[9px] text-white/60 tabular-nums">{fmt(localDuration)}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
