import { useMusicContext } from "@/context/MusicContext";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Music, X, Volume1, Volume2, VolumeX, Volume, ChevronDown,
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

function DualRangeSlider({ duration, currentTime, value, onChange, onSeekPreview }: { duration: number; currentTime: number; value: [number, number]; onChange: (val: [number, number]) => void; onSeekPreview?: (val: number) => void; }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'a'|'b'|null>(null);

  const handlePointerDown = (e: React.PointerEvent, thumb: 'a'|'b') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(thumb);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * duration;
    if (dragging === 'a') {
      const newA = Math.min(t, value[1] - 0.5);
      onChange([newA, value[1]]);
      onSeekPreview?.(newA);
    } else {
      const newB = Math.max(t, value[0] + 0.5);
      onChange([value[0], newB]);
      onSeekPreview?.(Math.max(value[0], newB - 1));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  };

  const pctA = duration > 0 ? (value[0] / duration) * 100 : 0;
  const pctB = duration > 0 ? (value[1] / duration) * 100 : 100;
  const pctC = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={trackRef} className="relative h-1.5 bg-black/10 dark:bg-white/10 rounded-full w-full mx-2 flex-1 touch-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      <div className="absolute top-0 bottom-0 bg-primary/20 rounded-full pointer-events-none" style={{ left: 0, width: `${pctC}%` }} />
      <div className="absolute top-0 bottom-0 bg-primary/40 rounded-full pointer-events-none" style={{ left: `${pctA}%`, width: `${pctB - pctA}%` }} />
      {pctC > pctA && (
        <div className="absolute top-0 bottom-0 bg-primary rounded-full pointer-events-none" style={{ left: `${pctA}%`, width: `${Math.min(pctB - pctA, pctC - pctA)}%` }} />
      )}
      <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow cursor-ew-resize hover:scale-125 transition-transform z-10" style={{ left: `calc(${pctA}% - 7px)` }} onPointerDown={(e) => handlePointerDown(e, 'a')} />
      <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow cursor-ew-resize hover:scale-125 transition-transform z-10" style={{ left: `calc(${pctB}% - 7px)` }} onPointerDown={(e) => handlePointerDown(e, 'b')} />
    </div>
  );
}

export function MiniPlayer() {
  const {
    currentSong, isPlaying, togglePlay, progress, duration, seek,
    volume, isMuted, setVolume, toggleMute,
    toggleShuffle, isShuffle, toggleRepeat, repeatMode,
    loopAB, setLoopAB,
    nextSong, prevSong, stopMusic, getAudioElement,
  } = useMusicContext();
  const { theme } = useAppContext();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [isSeekable, setIsSeekable] = useState(false);
  const [volFlash, setVolFlash] = useState(false);
  const [showAB, setShowAB] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const forcedPlayRef = useRef(false);
  const seekCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevVolumeRef = useRef(volume);

  // Maximize player automatically when a new song starts playing
  useEffect(() => {
    if (currentSong) {
      setIsMinimized(false);
    }
  }, [currentSong]);

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

  useEffect(() => {
    if (showAB && duration > 0 && !loopAB) {
      setLoopAB([0, duration]);
    } else if (!showAB) {
      setLoopAB(null);
    }
  }, [showAB, duration, setLoopAB]);

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
  const bgClass = isDark ? "bg-black/95 border-white/10" : "bg-white/90 border-black/10";
  const textClass = isDark ? "text-white" : "text-black";
  const mutedTextClass = isDark ? "text-muted-foreground" : "text-gray-600";
  const barBgClass = isDark ? "bg-white/10" : "bg-black/10";
  const barFillClass = isDark ? "bg-primary" : "bg-primary";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: 0,
        opacity: 1,
        height: isMinimized ? 12 : 80,
        width: isMinimized ? 240 : "100%",
        borderRadius: isMinimized ? 9999 : 0,
        bottom: isMinimized ? 16 : 0,
        x: isMinimized ? "-50%" : "0%",
        left: isMinimized ? "50%" : "0%",
        right: isMinimized ? "auto" : "0%",
        paddingLeft: isMinimized ? 12 : 24,
        paddingRight: isMinimized ? 12 : 24,
        boxShadow: isMinimized ? "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)" : "none",
        borderWidth: isMinimized ? 1 : 0,
      }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className={`fixed ${bgClass} backdrop-blur-xl ${isMinimized ? "border-border" : "border-t"} flex items-center z-50 transition-colors duration-300`}
      onMouseMove={e => {
        if (isMinimized) return;
        if (isDraggingVolume && volumeBarRef.current) {
          const rect = volumeBarRef.current.getBoundingClientRect();
          if (e.clientX >= rect.left - 10 && e.clientX <= rect.right + 10) {
            const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setVolume(v);
          }
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
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.div
            key="minimized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full flex items-center justify-center cursor-pointer group relative"
            onClick={() => setIsMinimized(false)}
            title="Expand audio player"
          >
            {/* Progress bar track */}
            <div className={`w-full h-1.5 rounded-full relative overflow-hidden ${barBgClass}`}>
              <div className={`h-full ${barFillClass} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            
            {/* Hover Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-black/85 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md border border-white/10">
              Expand audio player
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="maximized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-between gap-4"
          >
            {/* Song info */}
            <div className="flex items-center gap-3 w-1/4 min-w-0">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-primary to-purple-600 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-md">
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
                  className={`h-9 w-9 rounded-full ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90"} shadow-md`}
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
                <Button variant="ghost" size="icon"
                  className={`h-7 w-7 ${showAB ? "text-primary bg-primary/10" : mutedTextClass}`}
                  onClick={() => setShowAB(p => !p)} title="A-B Loop">
                  <span className="font-bold text-[10px] uppercase">AB</span>
                </Button>
              </div>

              {/* Seek bar */}
              <div className={`w-full flex items-center gap-2 text-[10px] ${mutedTextClass}`}>
                <span className="tabular-nums">{fmt(progress)}</span>

                {showAB ? (
                  <DualRangeSlider 
                    duration={duration} 
                    currentTime={progress} 
                    value={loopAB || [0, duration]} 
                    onChange={setLoopAB} 
                    onSeekPreview={(t) => {
                      seek(t);
                      if (!isPlaying && !forcedPlayRef.current) { forcedPlayRef.current = true; togglePlay(); setTimeout(() => forcedPlayRef.current = false, 500); }
                    }} 
                  />
                ) : (
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
                )}

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
                <VolumeIcon volume={volume} isMuted={isMuted} isDark={isDark} />
              </button>

              {/* Volume bar */}
              <div
                ref={volumeBarRef}
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

            {/* Action buttons (Minimize & Close) */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon"
                className={`h-8 w-8 ${textClass}`}
                onClick={() => setIsMinimized(true)} title="Hide player">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon"
                className={`h-8 w-8 ${textClass}`}
                onClick={stopMusic} title="Close player">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
