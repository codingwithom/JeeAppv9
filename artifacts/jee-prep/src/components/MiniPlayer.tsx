import { useMusicContext } from "@/context/MusicContext";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Music, X, Volume1, Volume2, VolumeX, Volume,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Windows 11-style animated volume icon
function VolumeIcon({ volume, isMuted, isDark }: { volume: number; isMuted: boolean; isDark: boolean }) {
  const iconClass = `h-4 w-4 transition-all duration-150 ${isDark ? "text-white/70" : "text-black/70"}`;

  // Pick the right icon variant
  const iconKey = isMuted ? "muted" : volume === 0 ? "zero" : volume < 0.35 ? "low" : volume < 0.7 ? "mid" : "high";

  const icon = isMuted || volume === 0
    ? <VolumeX className={iconClass} />
    : volume < 0.35
      ? <Volume1 className={iconClass} />
      : <Volume2 className={iconClass} />;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={iconKey}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.span>
    </AnimatePresence>
  );
}

export function MiniPlayer() {
  const {
    currentSong, isPlaying, togglePlay, progress, duration, seek,
    volume, isMuted, setVolume, toggleMute,
    toggleShuffle, isShuffle, toggleRepeat, repeatMode,
    nextSong, prevSong, stopMusic, getAudioElement,
  } = useMusicContext();
  const { theme } = useAppContext();

  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [isSeekable, setIsSeekable] = useState(false);
  const [volFlash, setVolFlash] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const seekCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevVolumeRef = useRef(volume);

  // Detect when audio becomes seekable (after server buffer is ready)
  useEffect(() => {
    setIsSeekable(false);
    const checkSeekable = () => {
      const audio = getAudioElement();
      if (!audio) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.seekable.length > 0) {
        setIsSeekable(true);
        if (seekCheckRef.current) clearInterval(seekCheckRef.current);
      }
    };
    seekCheckRef.current = setInterval(checkSeekable, 400);
    return () => { if (seekCheckRef.current) clearInterval(seekCheckRef.current); };
  }, [currentSong, getAudioElement]);

  // Flash animation when volume changes via keyboard
  useEffect(() => {
    if (volume === prevVolumeRef.current) return;
    prevVolumeRef.current = volume;
    setVolFlash(true);
    const t = setTimeout(() => setVolFlash(false), 300);
    return () => clearTimeout(t);
  }, [volume]);

  if (!currentSong) return null;

  const fmt = (t: number) => {
    if (!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const pct = hasDuration ? Math.min(100, (progress / duration) * 100) : 0;
  // Allow clicking seek bar as long as we have duration (even before seekable, for local files)
  const canSeek = hasDuration;
  const isSeekReady = isSeekable && hasDuration;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(fraction * duration);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSeek || !canSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(fraction * duration);
  };

  const handleVolumeInteract = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(v);
  };

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-black/90 border-white/10" : "bg-white/80 border-black/10";
  const textClass = isDark ? "text-white" : "text-black";
  const mutedTextClass = isDark ? "text-muted-foreground" : "text-gray-600";
  const barBgClass = isDark ? "bg-white/10" : "bg-black/10";
  const barFillClass = isDark ? "bg-white/60" : "bg-black/60";

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`fixed bottom-0 left-0 right-0 h-20 ${bgClass} backdrop-blur-xl border-t flex items-center px-4 md:px-6 z-50 gap-4 transition-all duration-300`}
      onMouseMove={e => {
        if (isDraggingVolume) {
          const sliders = document.querySelectorAll('[data-testid="miniplayer-volume"]');
          sliders.forEach(slider => {
            const rect = (slider as HTMLElement).getBoundingClientRect();
            if (e.clientX >= rect.left - 10 && e.clientX <= rect.right + 10) {
              const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setVolume(v);
            }
          });
        }
        if (isDraggingSeek && seekBarRef.current && canSeek) {
          const rect = seekBarRef.current.getBoundingClientRect();
          const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seek(fraction * duration);
        }
      }}
      onMouseUp={() => { setIsDraggingVolume(false); setIsDraggingSeek(false); }}
      onMouseLeave={() => { setIsDraggingVolume(false); setIsDraggingSeek(false); }}
    >
      {/* Song info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-primary to-purple-600 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {currentSong.coverUrl
            ? <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
            : <Music className={`h-5 w-5 ${isDark ? "text-white/60" : "text-black/60"}`} />
          }
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold truncate ${textClass}`}>{currentSong.title}</p>
          <p className={`text-[10px] ${mutedTextClass} truncate`}>{currentSong.artist}</p>
        </div>
      </div>

      {/* Playback controls + seek bar */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-1.5">
          <Button variant="ghost" size="icon"
            className={`h-7 w-7 ${isShuffle ? "text-primary" : mutedTextClass}`}
            onClick={toggleShuffle} data-testid="miniplayer-shuffle">
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${textClass}`}
            onClick={prevSong} data-testid="miniplayer-prev">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon"
            className={`h-9 w-9 rounded-full ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90"}`}
            onClick={togglePlay} data-testid="miniplayer-play-pause">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${textClass}`}
            onClick={nextSong} data-testid="miniplayer-next">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon"
            className={`h-7 w-7 ${repeatMode !== "none" ? "text-primary" : mutedTextClass}`}
            onClick={toggleRepeat} data-testid="miniplayer-repeat">
            {repeatMode === "one" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Seek bar */}
        <div className={`w-full flex items-center gap-2 text-[10px] ${mutedTextClass}`}>
          <span className="tabular-nums">{fmt(progress)}</span>

          <div
            ref={seekBarRef}
            className={`flex-1 h-1.5 rounded-full relative group select-none
              ${canSeek ? "cursor-pointer" : "cursor-default"} ${barBgClass}`}
            onClick={handleSeekClick}
            onMouseDown={e => { if (canSeek) { setIsDraggingSeek(true); handleSeekClick(e); } }}
            onMouseMove={handleSeekMouseMove}
            data-testid="miniplayer-seek"
            title={isSeekReady ? "Click or drag to seek" : canSeek ? "Seek will be available shortly" : ""}
          >
            {/* Shimmer while streaming audio buffers */}
            {!isSeekReady && canSeek && (
              <div className="absolute inset-0 rounded-full animate-shimmer opacity-50 pointer-events-none" />
            )}

            {/* Filled portion */}
            <div
              className={`h-full ${barFillClass} rounded-full relative transition-[width] duration-75`}
              style={{ width: `${pct}%` }}
            >
              {/* Drag handle dot */}
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3
                ${isDark ? "bg-white" : "bg-black"} rounded-full shadow
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            </div>
          </div>

          <span className="tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Volume section: mute btn + animated icon + bar */}
      <div className="hidden md:flex items-center gap-1.5 w-[160px] justify-end">
        {/* Mute toggle button */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute (M)" : "Mute (M)"}
          className={`flex-shrink-0 p-1 rounded transition-colors
            ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
        >
          <VolumeX className={`h-3.5 w-3.5 transition-opacity ${isMuted ? (isDark ? "text-white" : "text-black") : "opacity-40"} ${isDark ? "text-white/70" : "text-black/70"}`} />
        </button>

        {/* Animated volume icon (Windows 11 style) */}
        <motion.div
          animate={volFlash ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <VolumeIcon volume={volume} isMuted={isMuted} isDark={isDark} />
        </motion.div>

        {/* Volume bar */}
        <div
          className={`flex-1 h-1.5 ${barBgClass} rounded-full cursor-pointer group relative select-none`}
          onClick={handleVolumeInteract}
          onMouseDown={e => { setIsDraggingVolume(true); handleVolumeInteract(e); }}
          data-testid="miniplayer-volume"
          title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}% (↑↓ keys)`}
        >
          <div
            className={`h-full ${barFillClass} rounded-full relative transition-[width] duration-75`}
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          >
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3
              ${isDark ? "bg-white" : "bg-black"} rounded-full shadow-md cursor-grab active:cursor-grabbing
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
          </div>
        </div>
      </div>

      {/* Close button */}
      <Button variant="ghost" size="icon"
        className={`h-8 w-8 ${textClass} flex-shrink-0`}
        onClick={stopMusic} title="Close player">
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
