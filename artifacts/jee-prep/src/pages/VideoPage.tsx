import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { idbSet, idbGet, idbDelete } from "@/lib/idb";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useVideoContext, VideoMiniState } from "@/context/VideoContext";
import { getInvidiousInstances, getPipedInstances } from "@/utils/youtube";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronRight as ChevRight,
  Pencil,
  FolderPlus,
  FilePlus,
  Link as LinkIcon,
  Mic,
  Image as ImageIcon,
  Clock,
  Gauge,
  Minimize2,
  Maximize2,
  Maximize,
  FileVideo,
  Youtube,
  Globe,
  Bookmark,
  Check,
  StickyNote,
  SkipBack,
  SkipForward,
  MicOff,
  Square,
  Palette,
  Camera,
  RefreshCw,
  Search,
  Loader2,
  MoreVertical,
  Settings,
  Subtitles,
  ChevronLeft,
  Music,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadYouTubeApi } from "@/lib/youtube-api";

// Prevent browser tab throttling/pausing for media players by spoofing page visibility
try {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    Object.defineProperty(document, "hidden", { get: () => false });
    Object.defineProperty(document, "visibilityState", {
      get: () => "visible",
    });
    window.addEventListener(
      "visibilitychange",
      (e) => e.stopImmediatePropagation(),
      true,
    );
  }
} catch (e) {}

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoLeafData {
  type: "local" | "youtube" | "url";
  fileKey?: string;
  fileName?: string;
  url?: string;
}

interface VideoSubSubsection {
  id: string;
  name: string;
  color?: string;
  video?: VideoLeafData;
}

interface VideoSubsection {
  id: string;
  name: string;
  color?: string;
  expanded: boolean;
  video?: VideoLeafData;
  subsubsections: VideoSubSubsection[];
}

interface VideoSection {
  id: string;
  name: string;
  expanded: boolean;
  subsections: VideoSubsection[];
}

type NoteBlockType = "text" | "timeline" | "image" | "voice";

interface NoteBlock {
  id: string;
  type: NoteBlockType;
  text?: string;
  timestamp?: number;
  imageKey?: string;
  imageName?: string;
  voiceKey?: string;
  voiceDuration?: number;
  screenshotKey?: string;
  createdAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SECTION_COLORS = [
  "#6B7280",
  "#3B82F6",
  "#22C55E",
  "#EF4444",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
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

function getSourceLabel(videoType: string | null, src: string | null): string {
  if (!videoType || !src) return "";
  if (videoType === "youtube") return "YouTube";
  if (src.startsWith("blob:")) return "Local File";
  try {
    return new URL(src).hostname || "Online";
  } catch {
    return "Online";
  }
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
        <MoreVertical className="h-3.5 w-3.5" />
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

// ─── DualRangeSlider ─────────────────────────────────────────────────────────
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
    <div ref={trackRef} className="relative h-1.5 bg-muted/60 rounded-full w-full mx-2 flex-1 touch-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
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

// ─── Screenshot Editor ────────────────────────────────────────────────────────
function ScreenshotEditor({
  videoRef,
  isYoutube,
  onSave,
  onClose,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isYoutube: boolean;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [penColor, setPenColor] = useState("#EF4444");
  const [penSize, setPenSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    if (isYoutube) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "YouTube screenshots blocked by browser",
        canvas.width / 2,
        canvas.height / 2 - 10,
      );
      ctx.fillText(
        "(Cross-origin restriction)",
        canvas.width / 2,
        canvas.height / 2 + 15,
      );
      setCaptured(true);
    } else if (videoRef.current) {
      try {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 360;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Test if canvas was tainted by the video frame (CORS)
        ctx.getImageData(0, 0, 1, 1);
        
        setCaptured(true);
      } catch (err) {
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "Screenshot blocked by browser (CORS)",
          canvas.width / 2,
          canvas.height / 2 - 10,
        );
        ctx.fillText(
          "Try downloading the video and using the local file",
          canvas.width / 2,
          canvas.height / 2 + 15,
        );
        setCaptured(false);
      }
    }
  }, [isYoutube, videoRef]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const onMouseUp = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob((blob) => {
        if (blob) onSave(blob);
      }, "image/png");
    } catch (err) {
      alert("Cannot save screenshot due to cross-origin restrictions.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl z-10 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Screenshot Editor
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[
                "#EF4444",
                "#3B82F6",
                "#22C55E",
                "#F59E0B",
                "#FFFFFF",
                "#000000",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: penColor === c ? "#8B5CF6" : "transparent",
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={penSize}
              onChange={(e) => setPenSize(+e.target.value)}
              className="w-16 accent-primary"
              title="Pen size"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 text-xs gap-1.5"
              disabled={!captured}
            >
              <Check className="h-3 w-3" />
              Save to Note
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-3">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full rounded-lg border border-border cursor-crosshair"
            style={{ touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Draw on the screenshot, then click Save
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Video Upload Modal ───────────────────────────────────────────────────────
function VideoUploadModal({
  onLocal,
  onYoutube,
  onUrl,
  onSearch,
  onClose,
  title = "Add Video",
}: {
  onLocal: (file: File) => void;
  onYoutube: (url: string) => void;
  onUrl: (url: string) => void;
  onSearch?: () => void;
  onClose: () => void;
  title?: string;
}) {
  const [tab, setTab] = useState<"local" | "youtube" | "search" | "url">(
    "local",
  );
  const [inputUrl, setInputUrl] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmitUrl = () => {
    if (!inputUrl.trim()) {
      setErr("Please enter a URL.");
      return;
    }
    if (tab === "youtube") {
      const id = getYouTubeId(inputUrl.trim());
      if (!id) {
        setErr("Could not extract YouTube video ID. Check the URL.");
        return;
      }
      onYoutube(inputUrl.trim());
    } else {
      onUrl(inputUrl.trim());
    }
  };

  const tabs = [
    { id: "local" as const, icon: FileVideo, label: "Local" },
    { id: "youtube" as const, icon: Youtube, label: "YT Link" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "url" as const, icon: Globe, label: "URL" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setErr("");
                setInputUrl("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-all font-medium",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        {tab === "local" && (
          <div>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <FileVideo className="h-8 w-8 mx-auto mb-2 text-primary/50" />
              <p className="text-sm font-medium text-foreground mb-1">
                Choose a video file
              </p>
              <p className="text-xs text-muted-foreground">
                MP4, WebM, MOV, AVI supported
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLocal(f);
              }}
            />
          </div>
        )}
        {(tab === "youtube" || tab === "url") && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {tab === "youtube"
                  ? "Paste YouTube video URL"
                  : "Paste direct video URL (MP4, WebM, etc.)"}
              </p>
              <input
                autoFocus
                type="url"
                placeholder={
                  tab === "youtube"
                    ? "https://youtube.com/watch?v=..."
                    : "https://example.com/video.mp4"
                }
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitUrl()}
                className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            </div>
            <Button
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleSubmitUrl}
              disabled={!inputUrl.trim()}
            >
              {tab === "youtube" ? (
                <>
                  <Youtube className="h-3.5 w-3.5" />
                  Add YouTube
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  Add URL
                </>
              )}
            </Button>
          </div>
        )}
        {tab === "search" && (
          <div className="space-y-4">
            <div className="text-center py-4 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-foreground font-medium">
                Search YouTube directly
              </p>
              <p className="text-xs opacity-70 mt-1">
                Find and add videos without leaving the app
              </p>
            </div>
            <Button
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => onSearch?.()}
            >
              <Search className="h-3.5 w-3.5" />
              Open YouTube Search
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Speed Control Popup ──────────────────────────────────────────────────────
function SpeedPopup({
  speed,
  onChange,
  onClose,
}: {
  speed: number;
  onChange: (s: number) => void;
  onClose: () => void;
}) {
  const [inputVal, setInputVal] = useState(String(speed));
  const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  const apply = (v: number) => {
    const c = Math.max(0.1, Math.min(8, v));
    onChange(c);
    setInputVal(String(c));
  };

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card border border-border rounded-2xl shadow-2xl p-4 w-64"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            Playback Speed
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-center mb-3">
          <span className="text-3xl font-black text-primary tabular-nums">
            {speed.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="8"
          step="0.05"
          value={speed}
          onChange={(e) => {
            onChange(parseFloat(e.target.value));
            setInputVal(e.target.value);
          }}
          className="w-full accent-primary mb-1"
        />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">0.1x</span>
          <span className="text-xs text-muted-foreground">8x</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min="0.1"
            max="8"
            step="0.05"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => {
              const v = parseFloat(inputVal);
              if (!isNaN(v)) apply(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = parseFloat(inputVal);
                if (!isNaN(v)) apply(v);
              }
            }}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-xs text-muted-foreground">Custom</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => apply(p)}
              className={cn(
                "text-[10px] py-1 rounded-lg font-medium transition-all border",
                Math.abs(speed - p) < 0.01
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground",
              )}
            >
              {p}x
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Video Settings Popup ──────────────────────────────────────────────────
function VideoSettingsPopup({
  videoType,
  videoSrc,
  ytPlayer,
  videoEl,
  onClose,
}: {
  videoType: string | null;
  videoSrc: string | null;
  ytPlayer: any;
  videoEl: HTMLVideoElement | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<"main" | "cc" | "quality" | "audio">("main");
  const [ccTracks, setCcTracks] = useState<{ id: string; label: string }[]>([]);
  const [activeCc, setActiveCc] = useState<string | null>(null);
  const [qualities, setQualities] = useState<{ id: string; label: string }[]>([]);
  const [activeQuality, setActiveQuality] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<{ id: string; label: string }[]>([]);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const QUALITY_LABELS: Record<string, string> = {
    highres: "Highest",
    hd2160: "4K (2160p)",
    hd1440: "1440p",
    hd1080: "1080p",
    hd720: "720p",
    large: "480p",
    medium: "360p",
    small: "240p",
    tiny: "144p",
    auto: "Auto"
  };

  const syncVideoSettings = useCallback(() => {
    if (videoType === "youtube" && ytPlayer) {
      if (typeof ytPlayer.loadModule === "function") {
        try { ytPlayer.loadModule("captions"); } catch {}
        try { ytPlayer.loadModule("audioTrack"); } catch {}
      }

      if (typeof ytPlayer.getAvailableQualityLevels === "function") {
        const q = ytPlayer.getAvailableQualityLevels();
        setQualities(
          q.filter((level: string) => level !== "auto").map((level: string) => ({ id: level, label: QUALITY_LABELS[level] || level }))
        );
        setActiveQuality(ytPlayer.getPlaybackQuality() || "auto");
      } else {
        setQualities([{ id: "auto", label: "Auto" }]);
        setActiveQuality("auto");
      }

      if (typeof ytPlayer.getOption === "function") {
        const tracks = ytPlayer.getOption("captions", "tracklist") || [];
        setCcTracks(
          tracks.map((t: any) => ({
            id: t.languageCode || t.id || String(t.languageName || t.displayName || ""),
            label: t.displayName || t.languageName || t.languageCode || `CC ${t.languageCode || t.id || "unknown"}`,
          }))
        );
        const active = ytPlayer.getOption("captions", "track");
        setActiveCc(active ? active.languageCode || active.id || null : null);
      } else {
        setCcTracks([]);
        setActiveCc(null);
      }

      let foundYtAudio = false;
      let aTracks: any[] = [];
      if (typeof ytPlayer.getAvailableAudioTracks === "function") {
         aTracks = ytPlayer.getAvailableAudioTracks() || [];
      }
      if ((!aTracks || aTracks.length === 0) && typeof ytPlayer.getOption === "function") {
         aTracks = ytPlayer.getOption("audioTrack", "tracklist") || ytPlayer.getOption("audio", "tracklist") || [];
      }
      if (aTracks && aTracks.length > 0) {
         setAudioTracks(aTracks.map((t: any, i: number) => ({
             id: t.id || t.languageCode || String(i),
             label: t.name || t.displayName || t.languageName || t.label || `Track ${i+1}`
         })));
         let activeId = "0";
         if (typeof ytPlayer.getAudioTrack === "function") {
             const active = ytPlayer.getAudioTrack();
             activeId = active?.id || active?.languageCode || "0";
         } else if (typeof ytPlayer.getOption === "function") {
             const active = ytPlayer.getOption("audioTrack", "track") || ytPlayer.getOption("audio", "track");
             activeId = active?.id || active?.languageCode || "0";
         }
         setActiveAudio(activeId);
         foundYtAudio = true;
      }
      if (!foundYtAudio) {
         setAudioTracks([{ id: "default", label: "Default Audio" }]);
         setActiveAudio("default");
      }
    } else if (videoType === "html5" && videoEl) {
      const v = videoEl;
      const textTracks = Array.from(v.textTracks || []).filter(
        (t: any) => t.kind === "subtitles" || t.kind === "captions"
      );
      setCcTracks(
        textTracks.map((t: any, i) => ({
          id: String(i),
          label: t.label || t.language || `Track ${i + 1}`,
        }))
      );
      const activeT = textTracks.findIndex((t: any) => t.mode === "showing");
      setActiveCc(activeT >= 0 ? String(activeT) : null);

      const aTracks = Array.from((v as any).audioTracks || []);
      if (aTracks.length > 0) {
        setAudioTracks(
          aTracks.map((t: any, i) => ({
            id: String(i),
            label: t.label || t.language || `Audio ${i + 1}`,
          }))
        );
        const activeA = aTracks.findIndex((t: any) => t.enabled);
        setActiveAudio(activeA >= 0 ? String(activeA) : null);
      } else {
        setAudioTracks([{ id: "default", label: "Default Audio" }]);
        setActiveAudio("default");
      }

      setQualities([{ id: "original", label: "Original" }]);
      setActiveQuality("original");
    }
  }, [videoType, ytPlayer, videoEl, videoSrc]);

  useEffect(() => {
    syncVideoSettings();
  }, [syncVideoSettings]);

  useEffect(() => {
    if (videoType !== "html5" || !videoEl) return;
    const refresh = () => syncVideoSettings();
    videoEl.addEventListener("loadedmetadata", refresh);
    videoEl.addEventListener("loadeddata", refresh);
    return () => {
      videoEl.removeEventListener("loadedmetadata", refresh);
      videoEl.removeEventListener("loadeddata", refresh);
    };
  }, [videoType, videoEl, syncVideoSettings]);

  const setCc = (id: string | null) => {
    if (videoType === "youtube" && ytPlayer) {
      if (id === null) {
        if (typeof ytPlayer.setOption === "function") {
          ytPlayer.setOption("captions", "track", {});
        }
      } else {
        if (typeof ytPlayer.loadModule === "function") {
          try { ytPlayer.loadModule("captions"); } catch {}
        }
        if (typeof ytPlayer.setOption === "function") {
          ytPlayer.setOption("captions", "track", { languageCode: id });
        }
      }
    } else if (videoType === "html5" && videoEl) {
      const tracks = Array.from(videoEl.textTracks || []).filter(
        (t: any) => t.kind === "subtitles" || t.kind === "captions"
      );
      tracks.forEach((t: any, i) => {
        t.mode = String(i) === id ? "showing" : "hidden";
      });
    }
    setActiveCc(id);
    setView("main");
  };

  const setQuality = (id: string) => {
    if (videoType === "youtube" && ytPlayer) {
      const target = id === "auto" ? "default" : id;
      if (typeof ytPlayer.setPlaybackQualityRange === "function") {
        if (id === "auto") {
          try { ytPlayer.setPlaybackQualityRange("default", "highres"); } catch {}
          try { ytPlayer.setPlaybackQuality("default"); } catch {}
        } else {
          try { ytPlayer.setPlaybackQualityRange(id, id); } catch {}
        }
        try { ytPlayer.setPlaybackQualityRange(id === "auto" ? "default" : id, id === "auto" ? "highres" : id); } catch {}
      }
      if (typeof ytPlayer.setPlaybackQuality === "function") {
        try { ytPlayer.setPlaybackQuality(id === "auto" ? "default" : id); } catch {}
        try { ytPlayer.setPlaybackQuality(target); } catch {}
      }
      if (typeof ytPlayer.loadVideoById === "function") {
        const videoData = typeof ytPlayer.getVideoData === "function" ? ytPlayer.getVideoData() : null;
        const vId = videoData?.video_id || (videoSrc ? getYouTubeId(videoSrc) : null);
        if (vId) {
          const currentTime = typeof ytPlayer.getCurrentTime === "function" ? ytPlayer.getCurrentTime() : 0;
          const isPlaying = typeof ytPlayer.getPlayerState === "function" ? ytPlayer.getPlayerState() === 1 : true;
          ytPlayer.loadVideoById({
            videoId: vId,
            startSeconds: currentTime,
            suggestedQuality: id === "auto" ? "default" : id
          });
          if (!isPlaying && typeof ytPlayer.pauseVideo === "function") {
             setTimeout(() => ytPlayer.pauseVideo(), 150);
          }
          
          try { ytPlayer.loadVideoById(vId, currentTime, target); } catch {}
          
          setTimeout(() => {
            if (typeof ytPlayer.setPlaybackQualityRange === "function") {
               try { ytPlayer.setPlaybackQualityRange(id === "auto" ? "default" : id, id === "auto" ? "highres" : id); } catch {}
            }
            if (typeof ytPlayer.setPlaybackQuality === "function") {
               try { ytPlayer.setPlaybackQuality(target); } catch {}
            }
            if (!isPlaying && typeof ytPlayer.pauseVideo === "function") {
               ytPlayer.pauseVideo();
            }
          }, 200);
        }
      }
    }
    setActiveQuality(id);
    setView("main");
  };

  const setAudio = (id: string) => {
        if (videoType === "youtube" && ytPlayer) {
          if (typeof ytPlayer.loadModule === "function") {
            try { ytPlayer.loadModule("audioTrack"); } catch {}
          }
          if (typeof ytPlayer.setAudioTrack === "function") {
             const trackList = ytPlayer.getAvailableAudioTracks?.() || [];
             const track = trackList.find((t: any) => t.id === id || t.languageCode === id);
             if (track) {
               try { ytPlayer.setAudioTrack(track); } catch {}
             } else {
               try { ytPlayer.setAudioTrack({ id }); } catch {}
               try { ytPlayer.setAudioTrack({ languageCode: id }); } catch {}
               try { ytPlayer.setAudioTrack(id); } catch {}
             }
          }
          if (typeof ytPlayer.setOption === "function") {
             const track = { id };
             try { ytPlayer.setOption("audioTrack", "track", track); } catch {}
             try { ytPlayer.setOption("audioTrack", "track", id); } catch {}
             try { ytPlayer.setOption("audio", "track", track); } catch {}
             try { ytPlayer.setOption("audio", "track", id); } catch {}
          }
        } else if (videoType === "html5" && videoEl) {
      const tracks = Array.from((videoEl as any).audioTracks || []);
      tracks.forEach((t: any, i) => {
        t.enabled = String(i) === id;
      });
    }
    setActiveAudio(id);
    setView("main");
  };

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute bottom-14 right-4 sm:right-1/4 bg-card border border-border rounded-2xl shadow-2xl p-2 w-64 max-h-80 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "main" && (
          <div className="flex flex-col gap-1">
            <button onClick={() => setView("cc")} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors text-sm text-foreground">
              <span className="flex items-center gap-2"><Subtitles className="w-4 h-4"/> Subtitles/CC</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {activeCc ? ccTracks.find(t => t.id === activeCc)?.label || 'On' : 'Off'} <ChevRight className="w-3 h-3"/>
              </span>
            </button>
            <button onClick={() => setView("quality")} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors text-sm text-foreground">
              <span className="flex items-center gap-2"><Settings className="w-4 h-4"/> Quality</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {activeQuality ? (QUALITY_LABELS[activeQuality] || activeQuality) : 'Auto'} <ChevRight className="w-3 h-3"/>
              </span>
            </button>
            <button onClick={() => setView("audio")} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors text-sm text-foreground">
              <span className="flex items-center gap-2"><Music className="w-4 h-4"/> Audio Track</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {audioTracks.find(t => t.id === activeAudio)?.label || 'Default'} <ChevRight className="w-3 h-3"/>
              </span>
            </button>
          </div>
        )}

        {view !== "main" && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-border mb-1">
              <button onClick={() => setView("main")} className="p-1 hover:bg-muted rounded-md transition-colors"><ChevronLeft className="w-4 h-4"/></button>
              <span className="text-sm font-semibold capitalize">{view === 'cc' ? 'Subtitles/CC' : view === 'quality' ? 'Quality' : 'Audio Track'}</span>
            </div>
            
            {view === "cc" && (
              <div className="flex flex-col gap-1">
                <button onClick={() => setCc(null)} className={cn("text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors", activeCc === null && "bg-primary/10 text-primary")}>Off</button>
                {ccTracks.map(t => (
                  <button key={t.id} onClick={() => setCc(t.id)} className={cn("text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors", activeCc === t.id && "bg-primary/10 text-primary")}>
                    {t.label}
                  </button>
                ))}
                {ccTracks.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">No tracks available</p>}
              </div>
            )}
            
            {view === "quality" && (
              <div className="flex flex-col gap-1">
                <button onClick={() => setQuality("auto")} className={cn("text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors", activeQuality === "auto" && "bg-primary/10 text-primary")}>Auto</button>
                {qualities.map(t => (
                  <button key={t.id} onClick={() => setQuality(t.id)} className={cn("text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors", activeQuality === t.id && "bg-primary/10 text-primary")}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {view === "audio" && (
              <div className="flex flex-col gap-1">
                {audioTracks.map(t => (
                  <button key={t.id} onClick={() => setAudio(t.id)} className={cn("text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors", activeAudio === t.id && "bg-primary/10 text-primary")}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── YouTube Search Modal for Videos ──────────────────────────────────────────
function BlurImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt || ""}
      className={cn(className, "transition-all duration-500", loaded ? "blur-0 scale-100" : "blur-md scale-110")}
      onLoad={() => setLoaded(true)}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "";
        setLoaded(true);
      }}
    />
  );
}

interface YouTubeVideoResult {
  videoId: string;
  title: string;
  author: string;
  length_seconds: number;
  thumbnail: string;
}

function YouTubeVideoSearchModal({
  onClose,
  onVideoSelected,
}: {
  onClose: () => void;
  onVideoSelected?: (videoId: string, title: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw) return;
    setLoading(true);
    setError("");
    setResults([]);
    setCurrentPage(1);

    const extractYouTubePlaylistId = (url: string): string | null => {
      const m = url.match(/[?&]list=([^&#]+)/);
      return m ? m[1] : null;
    };

    // Check if the query is a YouTube URL
    const isYtUrl = raw.includes("youtube.com") || raw.includes("youtu.be");
    if (isYtUrl) {
      const ytPlaylistId = extractYouTubePlaylistId(raw);
      const ytId = getYouTubeId(raw);

      if (ytPlaylistId) {
        try {
          let tracks: any[] = [];
          
          // Try local endpoint first
          try {
            const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
            const res = await fetch(`${apiBase}/api/media-info?url=${encodeURIComponent(raw)}`);
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
            // Client-side fallback Strategy 1: Piped playlist endpoint
            const piped_instances = getPipedInstances();
            for (const instance of piped_instances) {
              try {
                const res = await fetch(`${instance}/playlists/${ytPlaylistId}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.relatedStreams && Array.isArray(data.relatedStreams)) {
                    tracks = data.relatedStreams.map((v: any) => {
                      const vId = v.url ? (v.url.includes("?v=") ? v.url.split("?v=")[1].split("&")[0] : v.url.split("/").pop()) : "";
                      return {
                        videoId: vId,
                        title: v.title || "Unknown Video",
                        author: v.uploaderName || "YouTube",
                        length_seconds: v.duration || 0,
                        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
                      };
                    }).filter((v: any) => v.videoId);
                    break;
                  }
                }
              } catch (e) {}
            }
          }

          if (tracks.length === 0) {
            // Client-side fallback Strategy 2: Invidious playlist endpoint
            const invidious_instances = await getInvidiousInstances();
            for (const instance of invidious_instances) {
              try {
                const res = await fetch(`${instance}/api/v1/playlists/${ytPlaylistId}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.videos && Array.isArray(data.videos)) {
                    tracks = data.videos.map((v: any) => ({
                      videoId: v.videoId,
                      title: v.title || "Unknown Video",
                      author: v.author || "YouTube",
                      length_seconds: v.length_seconds || 0,
                      thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
                    })).filter((v: any) => v.videoId);
                    break;
                  }
                }
              } catch (e) {}
            }
          }

          if (tracks.length === 0) {
            // Client-side fallback Strategy 2.5: Fetch RSS Feed via dedicated JSON APIs and multiple XML CORS proxies (highly reliable)
            try {
              const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${ytPlaylistId}`;
              let rssParsedData: { name: string; tracks: any[] } | null = null;

              // 1. Try rss2json.com API (CORS-friendly, reliable proxying)
              try {
                const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.status === "ok" && Array.isArray(data.items)) {
                    const name = data.feed?.title || "YouTube Playlist";
                    const items = data.items.map((item: any) => {
                      let videoId = "";
                      if (item.guid && item.guid.startsWith("yt:video:")) {
                        videoId = item.guid.replace("yt:video:", "");
                      } else if (item.link) {
                        const m = item.link.match(/(?:watch\?v=|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                        if (m) videoId = m[1];
                      }
                      return {
                        videoId,
                        title: item.title || "Unknown Video",
                        author: item.author || "YouTube",
                        thumbnail: item.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "")
                      };
                    }).filter((t: any) => t.videoId);
                    if (items.length > 0) {
                      rssParsedData = { name, tracks: items };
                    }
                  }
                }
              } catch (e) {
                console.warn("rss2json RSS parser failed", e);
              }

              // 2. Try feed2json.org API if rss2json failed
              if (!rssParsedData) {
                try {
                  const res = await fetch(`https://feed2json.org/convert?url=${encodeURIComponent(rssUrl)}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.items)) {
                      const name = data.title || "YouTube Playlist";
                      const items = data.items.map((item: any) => {
                        let videoId = "";
                        if (item.guid && item.guid.startsWith("yt:video:")) {
                          videoId = item.guid.replace("yt:video:", "");
                        } else if (item.url) {
                          const m = item.url.match(/(?:watch\?v=|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                          if (m) videoId = m[1];
                        }
                        return {
                          videoId,
                          title: item.title || "Unknown Video",
                          author: item.author?.name || item.author || "YouTube",
                          thumbnail: item.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "")
                        };
                      }).filter((t: any) => t.videoId);
                      if (items.length > 0) {
                        rssParsedData = { name, tracks: items };
                      }
                    }
                  }
                } catch (e) {
                  console.warn("feed2json RSS parser failed", e);
                }
              }

              // 3. Try direct XML parser via multiple CORS proxies if both JSON APIs failed
              if (!rssParsedData) {
                const xmlProxies = [
                  `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
                  `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`,
                  `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
                  `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
                ];

                for (const proxy of xmlProxies) {
                  try {
                    const res = await fetch(proxy);
                    if (res.ok) {
                      let xmlText = await res.text();
                      if (proxy.includes("allorigins.win/get")) {
                        const json = JSON.parse(xmlText);
                        xmlText = json.contents || "";
                      }
                      if (!xmlText) continue;

                      const parser = new DOMParser();
                      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                      
                      let name = "YouTube Playlist";
                      const titleNode = xmlDoc.getElementsByTagName("title")[0];
                      if (titleNode) name = titleNode.textContent || name;

                      const entries = xmlDoc.getElementsByTagName("entry");
                      const items: any[] = [];

                      for (let i = 0; i < entries.length; i++) {
                        const entry = entries[i];
                        let videoId = "";
                        const ytVideoIdNode = entry.getElementsByTagName("yt:videoId")[0];
                        if (ytVideoIdNode) {
                          videoId = ytVideoIdNode.textContent || "";
                        }
                        if (!videoId) {
                          const videoIdNode = entry.getElementsByTagName("videoId")[0];
                          if (videoIdNode) videoId = videoIdNode.textContent || "";
                        }
                        if (!videoId) {
                          const idNode = entry.getElementsByTagName("id")[0];
                          if (idNode?.textContent && idNode.textContent.includes("yt:video:")) {
                            videoId = idNode.textContent.replace("yt:video:", "");
                          }
                        }
                        if (!videoId) {
                          const linkNode = entry.getElementsByTagName("link")[0];
                          const href = linkNode?.getAttribute("href");
                          if (href) {
                            const m = href.match(/(?:watch\?v=|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            if (m) videoId = m[1];
                          }
                        }

                        if (videoId) {
                          const tNode = entry.getElementsByTagName("title")[0];
                          const title = tNode?.textContent || "Unknown Video";
                          
                          let author = "YouTube";
                          const authorNode = entry.getElementsByTagName("author")[0];
                          if (authorNode) {
                            const nameNode = authorNode.getElementsByTagName("name")[0];
                            if (nameNode) author = nameNode.textContent || author;
                          }

                          let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          const mediaThumbnail = entry.getElementsByTagName("media:thumbnail")[0];
                          if (mediaThumbnail) {
                            thumbnail = mediaThumbnail.getAttribute("url") || thumbnail;
                          }

                          items.push({
                            videoId,
                            title,
                            author,
                            thumbnail
                          });
                        }
                      }

                      if (items.length > 0) {
                        rssParsedData = { name, tracks: items };
                        break;
                      }
                    }
                  } catch (err) {
                    console.warn(`XML proxy fetch failed for ${proxy}`, err);
                  }
                }
              }

              if (rssParsedData) {
                for (const t of rssParsedData.tracks) {
                  tracks.push({
                    videoId: t.videoId,
                    title: t.title,
                    author: t.author,
                    length_seconds: 0,
                    thumbnail: t.thumbnail
                  });
                }
              }
            } catch (rssErr) {
              console.warn("RSS feed extraction failed, trying HTML scraping:", rssErr);
            }
          }

          if (tracks.length === 0) {
            // Client-side fallback Strategy 3: Scrape HTML via CORS proxies
            try {
              const fetchHtml = async (targetUrl: string) => {
                const proxies = [
                  `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
                  `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
                  `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
                ];
                for (const proxy of proxies) {
                  try {
                    const res = await fetch(proxy);
                    if (res.ok) {
                      if (proxy.includes("allorigins")) {
                        const data = await res.json();
                        if (data.contents) return data.contents;
                      } else {
                        return await res.text();
                      }
                    }
                  } catch (e) {}
                }
                throw new Error("All proxies failed");
              };

              const html = await fetchHtml(`https://www.youtube.com/playlist?list=${ytPlaylistId}`);
              
              const decodeHTML = (str: string): string => {
                try {
                  const txt = document.createElement("textarea");
                  txt.innerHTML = str;
                  return txt.value;
                } catch (e) {
                  return str;
                }
              };

              const seenIds = new Set<string>();
              const matches = html.matchAll(/<a\s+[^>]*href="[^"]*watch\?v=([a-zA-Z0-9_-]{11})[^"]*"[^>]*>/g);
              for (const match of matches) {
                const vId = match[1];
                if (!seenIds.has(vId) && seenIds.size < 100) {
                  const tagContent = match[0];
                  let title = "";
                  const titleMatch = tagContent.match(/title="([^"]+)"/);
                  if (titleMatch) {
                    title = decodeHTML(titleMatch[1]);
                  } else {
                    const startIdx = match.index || 0;
                    const searchWindow = html.slice(startIdx, startIdx + 800);
                    const windowMatch = searchWindow.match(/title="([^"]+)"/) || searchWindow.match(/>([^<]+)<\//);
                    if (windowMatch) {
                      title = decodeHTML(windowMatch[1].trim());
                    }
                  }
                  
                  if (!title || title.includes("watch?v=") || title.length > 150) {
                    title = `YouTube Video [${vId}]`;
                  }

                  seenIds.add(vId);
                  tracks.push({
                    videoId: vId,
                    title: title,
                    author: "YouTube",
                    length_seconds: 0,
                    thumbnail: `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
                  });
                }
              }
            } catch (scrapeErr) {
              console.error("Client side HTML scrape failed", scrapeErr);
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
          let videoThumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;

          try {
            const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
            const res = await fetch(`${apiBase}/api/media-info?url=${encodeURIComponent(raw)}`);
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
        const res = await fetchWithTimeout(`${instance}/search?q=${q}&filter=all`, 4000);
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
            thumbnail: `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
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
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
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
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          };
        });
      };

      const fetchLocal = async () => {
        const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
        const res = await fetchWithTimeout(`${apiBase}/api/yt-search?q=${q}`, 5000);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!Array.isArray(data.results) || !data.results.length) throw new Error("No results");
        return data.results;
      };

      const invidious_instances = await getInvidiousInstances();
      const piped_instances = getPipedInstances();

      const tasks = [
        fetchLocal(),
        ...piped_instances.map((instance) => fetchPiped(instance)),
        ...invidious_instances.map((instance) => fetchInvidious(instance)),
        fetchProxy(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
        fetchProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`),
        fetchProxy(`https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}&gl=US&hl=en`)}`)
      ];

      const fastestResults = await Promise.any(tasks);

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

  const handleSelectVideo = (result: YouTubeVideoResult) => {
    onVideoSelected?.(result.videoId, result.title);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Youtube className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-foreground">
              Search YouTube
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 md:p-6 border-b border-border flex-shrink-0 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for videos, tutorials, lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-muted-foreground">
          Showing up to 50 results
          </p>
        </div>

        {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
          {results.length === 0 && !loading && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <FileVideo className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No results. Try searching for something else.</p>
            </div>
          )}

          {results.length === 0 && !loading && !searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Enter a search term above to find videos</p>
            </div>
          )}

        <div className="space-y-2 md:space-y-3 flex-1">
          {results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => (
              <motion.div
                key={result.videoId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleSelectVideo(result)}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 md:w-24 md:h-14 rounded flex-shrink-0 overflow-hidden bg-muted">
                  <BlurImage
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {result.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.author}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {Math.floor(result.length_seconds / 60)}:
                    {String(result.length_seconds % 60).padStart(2, "0")}
                  </p>
                </div>

                {/* Select button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectVideo(result);
                  }}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Select</span>
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-3">Searching...</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main VideoPage ───────────────────────────────────────────────────────────
export default function VideoPage() {
  const videoCtx = useVideoContext();
  const { writeMedia, readMediaAsBlob, deleteMedia } = useWorkspaceContext();

  const [sections, setSections] = useLocalStorage<VideoSection[]>(
    "vid_sections_v1",
    [],
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [allNotes, setAllNotes] = useLocalStorage<Record<string, NoteBlock[]>>(
    "vid_notes_v1",
    {},
  );
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploadTarget, setUploadTarget] = useState<{
    sectionId: string;
    subId: string;
    subSubId?: string;
  } | null>(null);
  const [replaceVideoTarget, setReplaceVideoTarget] = useState<{
    sectionId: string;
    subId: string;
    subSubId?: string;
  } | null>(null);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(
    null,
  );

  // Video player state
  const [videoType, setVideoType] = useState<"html5" | "youtube" | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // Notes
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [recordingTargetBlockId, setRecordingTargetBlockId] = useState<
    string | null
  >(null);
  const [screenshotTargetBlockId, setScreenshotTargetBlockId] = useState<
    string | null
  >(null);
  const [imageTargetBlockId, setImageTargetBlockId] = useState<string | null>(
    null,
  );
  const [newNoteText, setNewNoteText] = useState("");
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAB, setShowAB] = useState(false);
  const [loopAB, setLoopAB] = useState<[number, number] | null>(null);
  const loopABRef = useRef(loopAB);
  useEffect(() => { loopABRef.current = loopAB; }, [loopAB]);
  const forcedPlayRef = useRef(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytDivRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const miniDragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const fsContainerRef = useRef<HTMLDivElement>(null);
  const volumeObjRef = useRef(volume);
  const mutedObjRef = useRef(muted);
  const speedObjRef = useRef(speed);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef(0);
  const activeLeafIdRef = useRef(activeLeafId);

  // Keep refs in sync
  useEffect(() => {
    volumeObjRef.current = volume;
  }, [volume]);
  useEffect(() => {
    mutedObjRef.current = muted;
  }, [muted]);
  useEffect(() => {
    speedObjRef.current = speed;
  }, [speed]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    activeLeafIdRef.current = activeLeafId;
  }, [activeLeafId]);

  useEffect(() => {
    if (showAB && duration > 0 && !loopAB) {
      setLoopAB([0, duration]);
    } else if (!showAB) {
      setLoopAB(null);
    }
  }, [showAB, duration]);

  const notes: NoteBlock[] =
    (activeLeafId ? allNotes[activeLeafId] : null) ?? [];

  function setNotes(updater: (prev: NoteBlock[]) => NoteBlock[]) {
    if (!activeLeafId) return;
    setAllNotes((prev) => ({
      ...prev,
      [activeLeafId]: updater(prev[activeLeafId] ?? []),
    }));
  }

  // ── Find active leaf ──────────────────────────────────────────────────────
  const findLeaf = useCallback(
    (leafId: string) => {
      for (const sec of sections) {
        for (const sub of sec.subsections) {
          if (sub.id === leafId) return { video: sub.video, name: sub.name };
          for (const ss of sub.subsubsections) {
            if (ss.id === leafId) return { video: ss.video, name: ss.name };
          }
        }
      }
      return null;
    },
    [sections],
  );

  const findLeafTarget = useCallback(
    (leafId: string | null) => {
      if (!leafId) return null;
      for (const sec of sections) {
        for (const sub of sec.subsections) {
          if (sub.id === leafId) return { sectionId: sec.id, subId: sub.id };
          for (const ss of sub.subsubsections) {
            if (ss.id === leafId)
              return { sectionId: sec.id, subId: sub.id, subSubId: ss.id };
          }
        }
      }
      return null;
    },
    [sections],
  );

  // ── Load media URLs ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeLeafId) return;
    const loadMedia = async () => {
      const urls: Record<string, string> = {};
      for (const block of notes) {
        const keys = [
          block.imageKey,
          block.voiceKey,
          block.screenshotKey,
        ].filter(Boolean) as string[];
        for (const key of keys) {
          if (!mediaUrls[key]) {
            const blob = await readMediaAsBlob(key);
            if (blob) urls[key] = URL.createObjectURL(blob);
          }
        }
      }
      if (Object.keys(urls).length > 0)
        setMediaUrls((prev) => ({ ...prev, ...urls }));
    };
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, activeLeafId]);

  // ── Load video for active leaf ────────────────────────────────────────────
  const loadLeafVideo = useCallback(
    async (leafId: string) => {
      const leaf = sections.reduce<{
        video?: VideoLeafData;
        name: string;
      } | null>((acc, sec) => {
        if (acc) return acc;
        for (const sub of sec.subsections) {
          if (sub.id === leafId) return { video: sub.video, name: sub.name };
          for (const ss of sub.subsubsections) {
            if (ss.id === leafId) return { video: ss.video, name: ss.name };
          }
        }
        return null;
      }, null);

      if (!leaf?.video) {
        setVideoType(null);
        setVideoSrc(null);
        setVideoTitle(leaf?.name ?? "");
        return;
      }

      const { video, name } = leaf;
      setVideoTitle(name);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setLoopAB(null);
      setShowAB(false);

      if (video.type === "local" && video.fileKey) {
        const blob = await readMediaAsBlob(video.fileKey);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setVideoType("html5");
          setVideoSrc(url);
        }
      } else if (video.type === "youtube" && video.url) {
        setVideoType("youtube");
        setVideoSrc(video.url);
      } else if (video.type === "url" && video.url) {
        setVideoType("html5");
        setVideoSrc(video.url);
      }
    },
    [sections],
  );

  useEffect(() => {
    if (activeLeafId) loadLeafVideo(activeLeafId);
  }, [activeLeafId, loadLeafVideo]);

  // ── Resume position: check after video loaded ─────────────────────────────
  useEffect(() => {
    if (!activeLeafId || !videoType || !videoSrc) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem("jee_vid_resume") || "null",
      );
      if (
        saved &&
        saved.leafId === activeLeafId &&
        Date.now() - saved.savedAt < 600000 &&
        saved.time > 5
      ) {
        setTimeout(() => handleSeek(saved.time), 800);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeafId, videoSrc]);

  // ── YouTube player init ───────────────────────────────────────────────────
  useEffect(() => {
    if (videoType !== "youtube" || !videoSrc) return;
    const videoId = getYouTubeId(videoSrc);
    if (!videoId) return;

    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !ytDivRef.current) return;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new (window as any).YT.Player(ytDivRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 1,
          fs: 0,
          disablekb: 1,
          enablejsapi: 1,
            playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            setDuration(e.target.getDuration() || 0);
            e.target.setVolume(volumeObjRef.current * 100);
            if (mutedObjRef.current) e.target.mute();
            else e.target.unMute();
            e.target.setPlaybackRate(speedObjRef.current);
            try { e.target.loadModule("captions"); } catch {}
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT.PlayerState;
            if (e.data === YT.PLAYING) setIsPlaying(true);
            else if (e.data === YT.PAUSED || e.data === YT.ENDED)
              setIsPlaying(false);
            if (e.data === YT.PLAYING) setDuration(e.target.getDuration() || 0);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [videoType, videoSrc]);

  // ── Progress polling + save resume ────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      return;
    }
    progressIntervalRef.current = setInterval(() => {
      let t = 0;
      if (videoType === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        t = ytPlayerRef.current.getCurrentTime();
        setCurrentTime(t);
        setDuration(typeof ytPlayerRef.current.getDuration === "function" ? ytPlayerRef.current.getDuration() || 0 : durationRef.current);
        if (loopABRef.current) {
           if (t >= loopABRef.current[1] || t < loopABRef.current[0]) {
             ytPlayerRef.current.seekTo(loopABRef.current[0], true);
           }
        }
      } else if (videoRef.current) {
        t = videoRef.current.currentTime;
        setCurrentTime(t);
        setDuration(videoRef.current.duration || 0);
        if (loopABRef.current) {
           if (t >= loopABRef.current[1] || t < loopABRef.current[0]) {
             videoRef.current.currentTime = loopABRef.current[0];
           }
        }
      }
      // Update mini player in context
      if (isMiniPlayer && videoCtx.miniState) {
        videoCtx.updateMiniState({ currentTime: t });
      }
      // Save resume position every 5s
      if (Date.now() - lastSaveRef.current > 5000) {
        lastSaveRef.current = Date.now();
        const leafId = activeLeafIdRef.current;
        if (leafId && videoType) {
          try {
            localStorage.setItem(
              "jee_vid_resume",
              JSON.stringify({ leafId, time: t, savedAt: Date.now() }),
            );
          } catch {}
        }
      }
    }, 150);
    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, videoType, isMiniPlayer, videoCtx]);

  // ── Fullscreen tracking ───────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Controls auto-hide in fullscreen ─────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    if (!isFullscreen) return;
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isFullscreen, resetControlsTimer]);

  // ── Playback controls ─────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (videoType === "youtube" && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.getPlayerState === "function") {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1 && typeof ytPlayerRef.current.pauseVideo === "function") ytPlayerRef.current.pauseVideo();
        else if (typeof ytPlayerRef.current.playVideo === "function") ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [videoType]);

  const handleSeek = useCallback(
    (time: number) => {
      const t = Math.max(0, Math.min(durationRef.current, time));
      if (videoType === "youtube" && ytPlayerRef.current) {
        if (typeof ytPlayerRef.current.seekTo === "function") {
          ytPlayerRef.current.seekTo(t, true);
        }
      } else if (videoRef.current) {
        videoRef.current.currentTime = t;
      }
      setCurrentTime(t);
    },
    [videoType],
  );

  const handleSeekRelative = useCallback(
    (delta: number) => handleSeek(currentTimeRef.current + delta),
    [handleSeek],
  );

  const handleVolumeChange = useCallback(
    (v: number) => {
      const vol = Math.max(0, Math.min(1, v));
      setVolume(vol);
      if (videoType === "youtube" && ytPlayerRef.current) {
        if (typeof ytPlayerRef.current.setVolume === "function") {
          ytPlayerRef.current.setVolume(vol * 100);
        }
        if (vol > 0 && mutedObjRef.current) {
          if (typeof ytPlayerRef.current.unMute === "function") ytPlayerRef.current.unMute();
          setMuted(false);
        }
      } else if (videoRef.current) {
        videoRef.current.volume = vol;
      }
    },
    [videoType],
  );

  const handleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (videoType === "youtube" && ytPlayerRef.current) {
        if (next && typeof ytPlayerRef.current.mute === "function") ytPlayerRef.current.mute();
        else if (!next && typeof ytPlayerRef.current.unMute === "function") ytPlayerRef.current.unMute();
      } else if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  }, [videoType]);

  const handleSpeedChange = useCallback(
    (s: number) => {
      setSpeed(s);
      if (videoType === "youtube" && ytPlayerRef.current) {
        if (typeof ytPlayerRef.current.setPlaybackRate === "function") {
          ytPlayerRef.current.setPlaybackRate(s);
        }
      } else if (videoRef.current) {
        videoRef.current.playbackRate = s;
      }
    },
    [videoType],
  );

  const toggleFullscreen = useCallback(() => {
    if (!fsContainerRef.current) return;
    if (!document.fullscreenElement) {
      fsContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleMiniPlayer = useCallback(() => {
    if (isMiniPlayer) {
      const resumeTime =
        videoCtx.miniState?.currentTime ?? currentTimeRef.current;
      setIsMiniPlayer(false);
      videoCtx.deactivateMiniPlayer();
      setTimeout(() => handleSeek(resumeTime), 100);
    } else {
      const src = videoSrc ?? "";
      const ytId = videoType === "youtube" ? (getYouTubeId(src) ?? "") : "";
      const state: VideoMiniState = {
        leafId: activeLeafId ?? "",
        videoType: videoType!,
        src,
        ytVideoId: ytId,
        title: videoTitle,
        sourceLabel: getSourceLabel(videoType, videoSrc),
        currentTime: currentTimeRef.current,
        isPlaying,
        speed,
        volume,
        muted,
      };
      videoCtx.activateMiniPlayer(state);
      setIsMiniPlayer(true);
      const x = Math.max(20, window.innerWidth - 360);
      const y = Math.max(20, window.innerHeight - 240);
      miniDragRef.current.posX = x;
      miniDragRef.current.posY = y;
      if (miniRef.current)
        miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }, [
    isMiniPlayer,
    videoCtx,
    videoSrc,
    videoType,
    videoTitle,
    isPlaying,
    speed,
    volume,
    muted,
    activeLeafId,
    handleSeek,
  ]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!videoType) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          resetControlsTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeekRelative(-5);
          resetControlsTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeekRelative(5);
          resetControlsTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(volumeObjRef.current + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(volumeObjRef.current - 0.1);
          break;
        case "m":
        case "M":
          handleMute();
          break;
        case "i":
        case "I":
          handleMiniPlayer();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    videoType,
    handlePlayPause,
    handleSeekRelative,
    handleVolumeChange,
    handleMute,
    handleMiniPlayer,
    toggleFullscreen,
    resetControlsTimer,
  ]);

  // ── Mini player drag ──────────────────────────────────────────────────────
  const onMiniPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (
        (e.target as HTMLElement).closest("button") ||
        (e.target as HTMLElement).closest("input")
      )
        return;
      miniDragRef.current.active = true;
      miniDragRef.current.startX = e.clientX - miniDragRef.current.posX;
      miniDragRef.current.startY = e.clientY - miniDragRef.current.posY;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [],
  );

  const onMiniPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!miniDragRef.current.active) return;
      const x = Math.max(
        0,
        Math.min(
          window.innerWidth - 320,
          e.clientX - miniDragRef.current.startX,
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          window.innerHeight - 200,
          e.clientY - miniDragRef.current.startY,
        ),
      );
      miniDragRef.current.posX = x;
      miniDragRef.current.posY = y;
      if (miniRef.current)
        miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
    },
    [],
  );

  const onMiniPointerUp = useCallback(() => {
    miniDragRef.current.active = false;
  }, []);

  // ── HTML5 video events ────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoType !== "html5") return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onMeta = () => setDuration(v.duration || 0);
    const onTime = () => {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.volume = volume;
    v.muted = muted;
    v.playbackRate = speed;
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [videoSrc, videoType]);

  // ── Timeline block actions ────────────────────────────────────────────────
  const addTimelineBlock = () => {
    const ts =
      videoType === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function"
        ? (ytPlayerRef.current.getCurrentTime() ?? currentTime)
        : (videoRef.current?.currentTime ?? currentTime);
    const block: NoteBlock = {
      id: uuid(),
      type: "timeline",
      timestamp: ts,
      text: "",
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, block]);
    setEditingBlockId(block.id);
    setEditingText("");
    setAddBlockOpen(false);
  };

  const addTextBlock = () => {
    const block: NoteBlock = {
      id: uuid(),
      type: "text",
      text: "",
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, block]);
    setEditingBlockId(block.id);
    setEditingText("");
    setAddBlockOpen(false);
  };

  const addImageToBlock = (blockId: string) => {
    setImageTargetBlockId(blockId);
    blockImageInputRef.current?.click();
  };

  const handleBlockImageFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeLeafId || !imageTargetBlockId) return;
    e.target.value = "";
    const key = `vid_img_${activeLeafId}_${Date.now()}`;
    await writeMedia(key, file);
    const url = URL.createObjectURL(file);
    setMediaUrls((prev) => ({ ...prev, [key]: url }));
    setNotes((prev) =>
      prev.map((b) =>
        b.id === imageTargetBlockId
          ? { ...b, imageKey: key, imageName: file.name }
          : b,
      ),
    );
    setImageTargetBlockId(null);
  };

  const startRecordingForBlock = async (blockId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setRecordingTargetBlockId(blockId);
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (!activeLeafId || !blockId) return;
        const key = `vid_voice_${activeLeafId}_${Date.now()}`;
        const dur = recordingTime;
        await writeMedia(key, blob);
        const url = URL.createObjectURL(blob);
        setMediaUrls((prev) => ({ ...prev, [key]: url }));

        if (blockId === "NEW") {
          const ts =
            videoType === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function"
              ? (ytPlayerRef.current.getCurrentTime() ?? currentTime)
              : (videoRef.current?.currentTime ?? currentTime);
          const block: NoteBlock = {
            id: uuid(),
            type: "timeline",
            timestamp: ts,
            voiceKey: key,
            voiceDuration: dur,
            createdAt: Date.now(),
          };
          setNotes((prev) => [...prev, block]);
        } else {
          setNotes((prev) =>
            prev.map((b) =>
              b.id === blockId
                ? { ...b, voiceKey: key, voiceDuration: dur }
                : b,
            ),
          );
        }
        setRecordingTime(0);
        setRecordingTargetBlockId(null);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const handleScreenshotSave = async (blob: Blob) => {
    if (!activeLeafId || !screenshotTargetBlockId) return;
    const key = `vid_ss_${activeLeafId}_${Date.now()}`;
    await writeMedia(key, blob);
    const url = URL.createObjectURL(blob);
    setMediaUrls((prev) => ({ ...prev, [key]: url }));

    if (screenshotTargetBlockId === "NEW") {
      const ts =
        videoType === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function"
          ? (ytPlayerRef.current.getCurrentTime() ?? currentTime)
          : (videoRef.current?.currentTime ?? currentTime);
      const block: NoteBlock = {
        id: uuid(),
        type: "timeline",
        timestamp: ts,
        screenshotKey: key,
        createdAt: Date.now(),
      };
      setNotes((prev) => [...prev, block]);
    } else {
      setNotes((prev) =>
        prev.map((b) =>
          b.id === screenshotTargetBlockId ? { ...b, screenshotKey: key } : b,
        ),
      );
    }
    setScreenshotTargetBlockId(null);
  };

  const deleteBlock = async (block: NoteBlock) => {
    const keysToDelete = [
      block.imageKey,
      block.voiceKey,
      block.screenshotKey,
    ].filter(Boolean) as string[];
    for (const key of keysToDelete) {
      await deleteMedia(key);
      setMediaUrls((prev) => {
        const n = { ...prev };
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        delete n[key];
        return n;
      });
    }
    setNotes((prev) => prev.filter((b) => b.id !== block.id));
  };

  const saveTextEdit = (blockId: string) => {
    setNotes((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, text: editingText } : b)),
    );
    setEditingBlockId(null);
  };

  const addQuickNote = () => {
    if (!newNoteText.trim()) return;
    const ts =
      videoType === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function"
        ? (ytPlayerRef.current.getCurrentTime() ?? currentTime)
        : (videoRef.current?.currentTime ?? currentTime);
    const block: NoteBlock = {
      id: uuid(),
      type: "timeline",
      timestamp: ts,
      text: newNoteText,
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, block]);
    setNewNoteText("");
  };

  const jumpToTimestamp = (ts: number) => {
    handleSeek(ts);
    if (videoType === "youtube" && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.playVideo === "function") ytPlayerRef.current.playVideo();
    } else if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  // ── Section tree helpers ──────────────────────────────────────────────────
  const addSection = () => {
    const id = uuid();
    setSections((prev) => [
      ...prev,
      { id, name: "New Section", expanded: true, subsections: [] },
    ]);
    setRenamingId(id);
    setRenameVal("New Section");
  };

  const addSubsection = (secId: string) => {
    const id = uuid();
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              expanded: true,
              subsections: [
                ...s.subsections,
                {
                  id,
                  name: "New Subsection",
                  expanded: true,
                  subsubsections: [],
                },
              ],
            }
          : s,
      ),
    );
    setRenamingId(id);
    setRenameVal("New Subsection");
  };

  const addSubSubsection = (secId: string, subId: string) => {
    const id = uuid();
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      expanded: true,
                      subsubsections: [
                        ...sub.subsubsections,
                        { id, name: "New Item" },
                      ],
                    }
                  : sub,
              ),
            }
          : s,
      ),
    );
    setRenamingId(id);
    setRenameVal("New Item");
  };

  const deleteSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));
  const deleteSubsection = (secId: string, subId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.filter((sub) => sub.id !== subId),
            }
          : s,
      ),
    );
  const deleteSubSubsection = (secId: string, subId: string, ssId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      subsubsections: sub.subsubsections.filter(
                        (ss) => ss.id !== ssId,
                      ),
                    }
                  : sub,
              ),
            }
          : s,
      ),
    );
  const toggleSection = (id: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)),
    );
  const toggleSubsection = (secId: string, subId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId ? { ...sub, expanded: !sub.expanded } : sub,
              ),
            }
          : s,
      ),
    );

  const setSubColor = (secId: string, subId: string, color: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId ? { ...sub, color } : sub,
              ),
            }
          : s,
      ),
    );
  };

  const setSubSubColor = (
    secId: string,
    subId: string,
    ssId: string,
    color: string,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      subsubsections: sub.subsubsections.map((ss) =>
                        ss.id === ssId ? { ...ss, color } : ss,
                      ),
                    }
                  : sub,
              ),
            }
          : s,
      ),
    );
  };

  const commitRename = (
    type: "section" | "sub" | "subsub",
    secId: string,
    subId?: string,
    ssId?: string,
  ) => {
    const name = renameVal.trim() || "Untitled";
    if (type === "section")
      setSections((prev) =>
        prev.map((s) => (s.id === secId ? { ...s, name } : s)),
      );
    else if (type === "sub" && subId)
      setSections((prev) =>
        prev.map((s) =>
          s.id === secId
            ? {
                ...s,
                subsections: s.subsections.map((sub) =>
                  sub.id === subId ? { ...sub, name } : sub,
                ),
              }
            : s,
        ),
      );
    else if (type === "subsub" && subId && ssId)
      setSections((prev) =>
        prev.map((s) =>
          s.id === secId
            ? {
                ...s,
                subsections: s.subsections.map((sub) =>
                  sub.id === subId
                    ? {
                        ...sub,
                        subsubsections: sub.subsubsections.map((ss) =>
                          ss.id === ssId ? { ...ss, name } : ss,
                        ),
                      }
                    : sub,
                ),
              }
            : s,
        ),
      );
    setRenamingId(null);
  };

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      let activeItemInfo: any = null;
      if (activeItemId) {
        for (const sec of sections) {
          if (sec.id === activeItemId) { activeItemInfo = { type: 'section', secId: sec.id, name: sec.name }; break; }
          for (const sub of sec.subsections) {
            if (sub.id === activeItemId) { activeItemInfo = { type: 'sub', secId: sec.id, subId: sub.id, name: sub.name }; break; }
            for (const ss of sub.subsubsections) {
              if (ss.id === activeItemId) { activeItemInfo = { type: 'subsub', secId: sec.id, subId: sub.id, subSubId: ss.id, name: ss.name }; break; }
            }
          }
        }
      }

      if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (!activeItemInfo) addSection();
        else if (activeItemInfo.type === 'section') addSubsection(activeItemInfo.secId);
        else if (activeItemInfo.type === 'sub') addSubSubsection(activeItemInfo.secId, activeItemInfo.subId);
      } else if (e.key === "F2") {
        if (!activeItemInfo) return;
        e.preventDefault();
        setRenamingId(activeItemId);
        setRenameVal(activeItemInfo.name);
      } else if (e.key === "Delete") {
        if (!activeItemInfo) return;
        e.preventDefault();
        if (activeItemInfo.type === 'section') deleteSection(activeItemInfo.secId);
        else if (activeItemInfo.type === 'sub') deleteSubsection(activeItemInfo.secId, activeItemInfo.subId);
        else if (activeItemInfo.type === 'subsub') deleteSubSubsection(activeItemInfo.secId, activeItemInfo.subId, activeItemInfo.subSubId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeItemId, sections, setSections]);

  const handleVideoUpload = async (file: File, target: typeof uploadTarget) => {
    if (!target) return;
    const key = `vid_file_${target.subSubId ?? target.subId}_${Date.now()}`;
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    await writeMedia(key, blob);
    const videoData: VideoLeafData = {
      type: "local",
      fileKey: key,
      fileName: file.name,
    };
    applyVideoToLeaf(target, videoData);
    setUploadTarget(null);
    setReplaceVideoTarget(null);
    if (target.subSubId) setActiveLeafId(target.subSubId);
    else setActiveLeafId(target.subId);
  };

  const applyVideoToLeaf = (
    target: NonNullable<typeof uploadTarget>,
    videoData: VideoLeafData,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== target.sectionId
          ? s
          : {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id !== target.subId
                  ? sub
                  : target.subSubId
                    ? {
                        ...sub,
                        subsubsections: sub.subsubsections.map((ss) =>
                          ss.id === target.subSubId
                            ? { ...ss, video: videoData }
                            : ss,
                        ),
                      }
                    : { ...sub, video: videoData },
              ),
            },
      ),
    );
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── Inline Color Picker ──────────────────────────────────────────────────
  const ColorPicker = ({
    id,
    current,
    onSelect,
  }: {
    id: string;
    current?: string;
    onSelect: (c: string) => void;
  }) => (
    <AnimatePresence>
      {activeColorPicker === id && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute left-full ml-1 top-0 z-50 bg-card border border-border rounded-xl shadow-xl p-1.5 grid grid-cols-4 gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {SECTION_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onSelect(c);
                setActiveColorPicker(null);
              }}
              className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
              style={{
                backgroundColor: c,
                borderColor: current === c ? "white" : "transparent",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Shared Controls Render ───────────────────────────────────────────────
  const renderControls = (compact = false) => (
    <div className={cn("space-y-2", compact ? "p-2" : "px-4 py-3")}>
      {/* Progress bar */}
      {showAB && !compact ? (
        <div className="flex items-center gap-2 pb-1">
          <span className={cn("text-[10px] font-bold", isFullscreen ? "text-primary" : "text-primary")}>A</span>
          <DualRangeSlider 
            duration={duration} 
            currentTime={currentTime} 
            value={loopAB || [0, duration]} 
            onChange={setLoopAB} 
            onSeekPreview={(t) => {
              handleSeek(t);
              if (!isPlaying && !forcedPlayRef.current) { forcedPlayRef.current = true; handlePlayPause(); setTimeout(() => forcedPlayRef.current = false, 500); }
            }} 
          />
          <span className={cn("text-[10px] font-bold", isFullscreen ? "text-primary" : "text-primary")}>B</span>
        </div>
      ) : (
        <div
          className="relative group cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleSeek(((e.clientX - rect.left) / rect.width) * duration);
          }}
        >
          <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden group-hover:h-2.5 transition-all">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSeekRelative(-10)}
          className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
          title="Back 10s"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 bg-primary hover:bg-primary/80 rounded-xl text-primary-foreground transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => handleSeekRelative(10)}
          className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
          title="Forward 10s"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-white/70 tabular-nums ml-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleMute}
          className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : volume < 0.5 ? (
            <Volume1 className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-16 accent-primary"
        />
        <button
          onClick={() => setShowSpeedPopup((p) => !p)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-colors"
        >
          <Gauge className="h-3 w-3" />
          {speed.toFixed(2)}x
        </button>
        {!compact && (
          <>
            <button
              onClick={handleMiniPlayer}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
              title="Mini Player (I)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
              title="Fullscreen (F)"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {compact && (
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Notes panel content ──────────────────────────────────────────────────
  const renderNotesPanelContent = () => (
    <>
      <div className="p-2 md:p-3 border-b border-border flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md">
        <span className="text-[10px] md:text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <StickyNote className="h-3.5 md:h-4 w-3.5 md:w-4 text-primary" />
          <span>Video Notes</span>
        </span>
        <button
          onClick={() => setShowNotes(false)}
          className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {notes.length === 0 && (
          <div className="text-center py-10">
            <StickyNote className="h-10 w-10 mx-auto mb-3 text-primary/20" />
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Capture a screenshot, voice note, or text below.
            </p>
          </div>
        )}

        {[...notes]
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
          .map((block) => (
            <div key={block.id} className="group flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => jumpToTimestamp(block.timestamp ?? 0)}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-[10px] font-semibold transition-colors"
                >
                  <Clock className="h-3 w-3" />
                  {formatTime(block.timestamp ?? 0)}
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingBlockId(block.id);
                      setEditingText(block.text ?? "");
                    }}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteBlock(block)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-2.5 relative">
                {editingBlockId === block.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[60px]"
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px]"
                        onClick={() => setEditingBlockId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => saveTextEdit(block.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : block.text ? (
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {block.text}
                  </p>
                ) : null}

                {block.type === "image" &&
                  block.imageKey &&
                  mediaUrls[block.imageKey] && (
                    <img
                      src={mediaUrls[block.imageKey]}
                      alt="Note"
                      className="w-full rounded-md object-cover border border-border"
                    />
                  )}
                {block.type === "voice" &&
                  block.voiceKey &&
                  mediaUrls[block.voiceKey] && (
                    <audio
                      src={mediaUrls[block.voiceKey]}
                      controls
                      className="w-full h-8"
                      style={{ height: "32px" }}
                    />
                  )}

                {block.screenshotKey && mediaUrls[block.screenshotKey] && (
                  <div className="relative group/media mt-1">
                    <img
                      src={mediaUrls[block.screenshotKey]}
                      alt="Screenshot"
                      className="w-full rounded-md object-cover border border-border"
                    />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[8px] text-white/90 flex items-center gap-1">
                      <Camera className="h-2.5 w-2.5" /> Screenshot
                    </div>
                  </div>
                )}
                {block.imageKey &&
                  block.type !== "image" &&
                  mediaUrls[block.imageKey] && (
                    <img
                      src={mediaUrls[block.imageKey]}
                      alt="Attached"
                      className="w-full rounded-md object-cover border border-border mt-1"
                    />
                  )}
                {block.voiceKey &&
                  block.type !== "voice" &&
                  mediaUrls[block.voiceKey] && (
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border mt-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mic className="h-3 w-3 text-primary" />
                      </div>
                      <audio
                        src={mediaUrls[block.voiceKey]}
                        controls
                        className="w-full h-6"
                        style={{ height: "24px" }}
                      />
                    </div>
                  )}

                {!editingBlockId && (
                  <div className="pt-2 mt-2 border-t border-border/50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!block.screenshotKey && (
                      <button
                        onClick={() => setScreenshotTargetBlockId(block.id)}
                        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <Camera className="h-3 w-3" /> Add Screen
                      </button>
                    )}
                    {!block.voiceKey && (
                      <button
                        onClick={() => startRecordingForBlock(block.id)}
                        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <Mic className="h-3 w-3" /> Add Voice
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      <div className="p-3 bg-card border-t border-border shrink-0">
        {recording && recordingTargetBlockId === "NEW" ? (
          <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold">
                Recording... {formatTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-bold shadow-sm"
            >
              Stop & Save
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 relative">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addQuickNote();
                }
              }}
              placeholder="Type a note (auto-captures time)..."
              className="w-full text-xs px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[60px]"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setScreenshotTargetBlockId("NEW")}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-primary rounded-lg transition-colors text-[10px] font-medium border border-transparent hover:border-border"
                  title="Capture Screenshot"
                >
                  <Camera className="h-3.5 w-3.5" />{" "}
                  <span className="hidden xl:inline">Screenshot</span>
                </button>
                <button
                  onClick={() => startRecordingForBlock("NEW")}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-primary rounded-lg transition-colors text-[10px] font-medium border border-transparent hover:border-border"
                  title="Record Voice Note"
                >
                  <Mic className="h-3.5 w-3.5" />{" "}
                  <span className="hidden xl:inline">Voice Note</span>
                </button>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs font-semibold px-4"
                onClick={addQuickNote}
                disabled={!newNoteText.trim()}
              >
                Post Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const SidebarContent = useMemo(() => (
    <div
        className={cn(
          "w-full md:w-48 lg:w-56 xl:w-60 shrink-0 border-r border-border flex-col bg-card/95 backdrop-blur-xl overflow-hidden",
          showMobileSidebar
            ? "flex fixed inset-0 z-[200] md:relative md:z-auto md:bg-card/50"
            : "hidden md:flex md:bg-card/50",
        )}
      >
        <div className="p-2 md:p-3 border-b border-border flex items-center justify-between">
          <span className="text-[10px] md:text-xs font-bold text-foreground uppercase tracking-wide">
            Video Lib
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={addSection}
              className="h-6 w-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors flex-shrink-0"
              title="Add section"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden h-6 w-6 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Reorder.Group as="div" axis="y" values={sections} onReorder={setSections} className="flex-1 overflow-y-auto p-1.5 md:p-2 space-y-0.5">
          {sections.length === 0 && (
            <div className="text-center py-8 px-3">
              <FileVideo className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              <p className="text-xs text-muted-foreground">No sections</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Click + to add
              </p>
            </div>
          )}

          {sections.map((sec) => (
            <Reorder.Item as="div" key={sec.id} value={sec}>
              {/* Section */}
              <div 
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${activeItemId === sec.id ? "bg-accent/40" : "hover:bg-accent/30"}`}
                onClick={() => setActiveItemId(sec.id)}
              >
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="text-muted-foreground shrink-0"
                >
                  {sec.expanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevRight className="h-3.5 w-3.5" />
                  )}
                </button>
                {renamingId === sec.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => commitRename("section", sec.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename("section", sec.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-xs font-semibold text-foreground truncate">
                    {sec.name}
                  </span>
                )}
                <ThreeDotMenu>
                  <MenuItem icon={FilePlus} label="Add Subsection" shortcut="N" onClick={(e: any) => { e.stopPropagation(); addSubsection(sec.id); }} />
                  <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setRenamingId(sec.id); setRenameVal(sec.name); }} />
                  <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deleteSection(sec.id); }} />
                </ThreeDotMenu>
              </div>

              {sec.expanded && (
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <Reorder.Group as="div" axis="y" values={sec.subsections} onReorder={(newSubs) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, subsections: newSubs } : s))} className="space-y-0.5 mt-0.5">
                    {sec.subsections.map((sub) => (
                      <Reorder.Item as="div" key={sub.id} value={sub} className="ml-4">
                    <div
                      className={cn(
                        "group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer",
                        activeLeafId === sub.id &&
                          sub.subsubsections.length === 0 &&
                          "bg-primary/10 text-primary",
                        activeItemId === sub.id && "bg-accent/40"
                      )}
                      onClick={() => {
                        setActiveItemId(sub.id);
                        if (sub.subsubsections.length === 0) {
                          setActiveLeafId(sub.id);
                          setShowMobileSidebar(false);
                        } else toggleSubsection(sec.id, sub.id);
                      }}
                    >
                      {sub.subsubsections.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubsection(sec.id, sub.id);
                          }}
                          className="text-muted-foreground shrink-0"
                        >
                          {sub.expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {sub.subsubsections.length === 0 && (
                        <div className="w-3.5 shrink-0" />
                      )}
                      {renamingId === sub.id ? (
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onBlur={() => commitRename("sub", sec.id, sub.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              commitRename("sub", sec.id, sub.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-xs text-foreground truncate">
                          {sub.name}
                        </span>
                      )}
                      {/* Color swatch */}
                      <div
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setActiveColorPicker(
                              activeColorPicker === sub.id ? null : sub.id,
                            )
                          }
                          className="w-3 h-3 rounded-full border border-border hover:scale-125 transition-transform"
                          style={{
                            backgroundColor: sub.video
                              ? (sub.color ??
                                (sub.video.type === "youtube"
                                  ? "#EF4444"
                                  : sub.video.type === "local"
                                    ? "#22C55E"
                                    : "#3B82F6"))
                              : (sub.color ?? "#6B7280"),
                          }}
                          title="Change color"
                        />
                        <ColorPicker
                          id={sub.id}
                          current={sub.color}
                          onSelect={(c) => setSubColor(sec.id, sub.id, c)}
                        />
                      </div>
                      <ThreeDotMenu>
                        <MenuItem icon={Plus} label="Add/Replace Video" onClick={(e: any) => { e.stopPropagation(); setUploadTarget({ sectionId: sec.id, subId: sub.id }); }} />
                        <MenuItem icon={FilePlus} label="Add Item" shortcut="N" onClick={(e: any) => { e.stopPropagation(); addSubSubsection(sec.id, sub.id); }} />
                        <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setRenamingId(sub.id); setRenameVal(sub.name); }} />
                        <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deleteSubsection(sec.id, sub.id); }} />
                      </ThreeDotMenu>
                    </div>

                    {sub.expanded && (
                      <div onPointerDown={(e) => e.stopPropagation()}>
                        <Reorder.Group as="div" axis="y" values={sub.subsubsections} onReorder={(newSubSubs) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, subsections: s.subsections.map(su => su.id === sub.id ? { ...su, subsubsections: newSubSubs } : su) } : s))} className="space-y-0.5 mt-0.5">
                          {sub.subsubsections.map((ss) => (
                            <Reorder.Item as="div" key={ss.id} value={ss} className="ml-4">
                          <div
                            className={cn(
                              "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer",
                              activeLeafId === ss.id
                                ? "bg-primary/10 text-primary"
                                : (activeItemId === ss.id ? "bg-accent/40 text-foreground" : "hover:bg-accent/30 text-muted-foreground hover:text-foreground")
                            )}
                            onClick={() => {
                              setActiveItemId(ss.id);
                              setActiveLeafId(ss.id);
                              setShowMobileSidebar(false);
                            }}
                          >
                            <div className="w-2 h-px bg-border mr-0.5 shrink-0" />
                            {renamingId === ss.id ? (
                              <input
                                autoFocus
                                value={renameVal}
                                onChange={(e) => setRenameVal(e.target.value)}
                                onBlur={() =>
                                  commitRename("subsub", sec.id, sub.id, ss.id)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    commitRename(
                                      "subsub",
                                      sec.id,
                                      sub.id,
                                      ss.id,
                                    );
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="flex-1 text-xs truncate">
                                {ss.name}
                              </span>
                            )}
                            {/* Color swatch */}
                            <div
                              className="relative shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  setActiveColorPicker(
                                    activeColorPicker === ss.id ? null : ss.id,
                                  )
                                }
                                className="w-3 h-3 rounded-full border border-border hover:scale-125 transition-transform"
                                style={{
                                  backgroundColor: ss.video
                                    ? (ss.color ??
                                      (ss.video.type === "youtube"
                                        ? "#EF4444"
                                        : ss.video.type === "local"
                                          ? "#22C55E"
                                          : "#3B82F6"))
                                    : (ss.color ?? "#6B7280"),
                                }}
                                title="Change color"
                              />
                              <ColorPicker
                                id={ss.id}
                                current={ss.color}
                                onSelect={(c) =>
                                  setSubSubColor(sec.id, sub.id, ss.id, c)
                                }
                              />
                            </div>
                            <ThreeDotMenu>
                              <MenuItem icon={Plus} label="Add/Replace Video" onClick={(e: any) => { e.stopPropagation(); setUploadTarget({ sectionId: sec.id, subId: sub.id, subSubId: ss.id }); }} />
                              <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setRenamingId(ss.id); setRenameVal(ss.name); }} />
                              <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deleteSubSubsection(sec.id, sub.id, ss.id); }} />
                            </ThreeDotMenu>
                          </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className="p-1.5 md:p-2 border-t border-border">
          <div className="flex flex-wrap gap-1 md:gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
            <div className="flex items-center gap-0.5 md:gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="hidden sm:inline">Local</span>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="hidden sm:inline">YouTube</span>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="hidden sm:inline">URL</span>
            </div>
          </div>
        </div>
      </div>
  ), [sections, activeItemId, activeLeafId, renamingId, renameVal, activeColorPicker, showMobileSidebar]);

  const MemoizedNotesPanel = useMemo(() => renderNotesPanelContent(), [notes, editingBlockId, editingText, mediaUrls, recording, recordingTime, recordingTargetBlockId, newNoteText, screenshotTargetBlockId]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex h-full overflow-hidden bg-background flex-col md:flex-row"
    >
      {SidebarContent}

      {/* ── Main Area ── Responsive */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeLeafId && (
          <div className="flex-1 flex flex-col relative">
            <div className="md:hidden flex items-center px-3 py-2 bg-card border-b border-border shrink-0">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
              >
                <FolderPlus className="h-4 w-4 text-primary" /> Open Library
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 md:p-6">
              <div className="text-center">
                <FileVideo className="h-12 md:h-16 w-12 md:w-16 mx-auto mb-3 md:mb-4 text-primary/20" />
                <p className="text-base md:text-lg font-bold text-foreground mb-1">
                  Select a video
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  Choose a section in the left panel, then add a video
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 text-[10px] md:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 md:gap-1.5">
                    <FileVideo className="h-3 md:h-3.5 w-3 md:w-3.5" />
                    Local MP4
                  </span>
                  <span className="flex items-center gap-1 md:gap-1.5">
                    <Youtube className="h-3 md:h-3.5 w-3 md:w-3.5 text-red-400" />
                    YouTube
                  </span>
                  <span className="flex items-center gap-1 md:gap-1.5">
                    <Globe className="h-3 md:h-3.5 w-3 md:w-3.5" />
                    Video URL
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLeafId && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
              >
                <FolderPlus className="h-4 w-4 text-primary" /> Library
              </button>
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
              >
                <StickyNote className="h-4 w-4 text-primary" /> Notes
              </button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-0 lg:gap-2">
              {/* Video + Controls column */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-none lg:rounded-lg bg-black">
                {/* Video container with fullscreen support */}
                <div
                  ref={fsContainerRef}
                  className={cn(
                    "relative flex-1 min-h-0 bg-black flex flex-col",
                    isMiniPlayer && "hidden",
                  )}
                  onMouseMove={resetControlsTimer}
                >
                  {/* Inner player container */}
                  <div
                    ref={playerContainerRef}
                    className="flex-1 relative flex items-center justify-center overflow-hidden"
                  >
                    {/* Title overlay - Responsive text */}
                    {videoType && (
                      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2 px-2 sm:px-3 py-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                        <span className="text-white text-xs sm:text-sm font-semibold truncate">
                          {videoTitle}
                        </span>
                        {getSourceLabel(videoType, videoSrc) && (
                          <span className="text-white/50 text-[10px] shrink-0">
                            — {getSourceLabel(videoType, videoSrc)}
                          </span>
                        )}
                      </div>
                    )}

                    {!videoType && (
                      <div className="text-center text-white/60 p-4">
                        <FileVideo className="h-8 md:h-12 w-8 md:w-12 mx-auto mb-2 md:mb-3 opacity-30" />
                        <p className="text-xs md:text-sm font-medium">
                          No video loaded
                        </p>
                        <p className="text-[10px] md:text-xs opacity-60 mt-1">
                          Click + next to a section to add a video
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 text-xs gap-1.5 border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            for (const sec of sections) {
                              for (const sub of sec.subsections) {
                                if (sub.id === activeLeafId) {
                                  setUploadTarget({
                                    sectionId: sec.id,
                                    subId: sub.id,
                                  });
                                  return;
                                }
                                for (const ss of sub.subsubsections) {
                                  if (ss.id === activeLeafId) {
                                    setUploadTarget({
                                      sectionId: sec.id,
                                      subId: sub.id,
                                      subSubId: ss.id,
                                    });
                                    return;
                                  }
                                }
                              }
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Video
                        </Button>
                      </div>
                    )}

                    {/* HTML5 Video */}
                    {videoType === "html5" && videoSrc && (
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        className="w-full h-full object-contain"
                        playsInline
                        crossOrigin="anonymous"
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                        onClick={handlePlayPause}
                      />
                    )}

                    {/* YouTube Player with overlay */}
                    {videoType === "youtube" && (
                      <div className="relative w-full h-full">
                        <div className="w-full h-full pointer-events-none">
                          <div ref={ytDivRef} className="w-full h-full" />
                        </div>
                        {/* Transparent overlay to capture click events for custom controls */}
                        <div
                          className="absolute inset-0 z-10"
                          onClick={handlePlayPause}
                          onDoubleClick={toggleFullscreen}
                          style={{
                            cursor: "pointer",
                            background: "transparent",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Controls overlay — always visible unless fullscreen and idle */}
                  {videoType && (
                    <AnimatePresence>
                      {(showControls || !isFullscreen) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            isFullscreen
                              ? "absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
                              : "bg-card border-t border-border",
                          )}
                        >
                          {/* Title bar (non-mini) */}
                          {!isFullscreen && (
                            <div className="flex items-center justify-between px-4 pt-2">
                              <div className="flex items-center gap-1.5">
                                {videoType === "youtube" && (
                                  <Youtube className="h-3.5 w-3.5 text-red-400" />
                                )}
                                {videoType === "html5" &&
                                  videoSrc?.startsWith("blob:") && (
                                    <FileVideo className="h-3.5 w-3.5 text-green-400" />
                                  )}
                                {videoType === "html5" &&
                                  !videoSrc?.startsWith("blob:") && (
                                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                                  )}
                                <span className="text-xs font-medium text-foreground truncate max-w-48">
                                  {videoTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={handleMiniPlayer}
                                  className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                  title="Mini Player (I)"
                                >
                                  <Minimize2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setShowNotes((p) => !p)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    showNotes
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                  )}
                                  title="Toggle Notes"
                                >
                                  <StickyNote className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                          {/* Seek + controls */}
                          <div className="px-4 py-2 space-y-1.5">
                            {showAB ? (
                              <div className="flex items-center gap-2 pb-1">
                                <span className={cn("text-[10px] font-bold", isFullscreen ? "text-primary" : "text-primary")}>A</span>
                                <DualRangeSlider 
                                  duration={duration} 
                                  currentTime={currentTime} 
                                  value={loopAB || [0, duration]} 
                                  onChange={setLoopAB} 
                                  onSeekPreview={(t) => {
                                    handleSeek(t);
                                    if (!isPlaying && !forcedPlayRef.current) { forcedPlayRef.current = true; handlePlayPause(); setTimeout(() => forcedPlayRef.current = false, 500); }
                                  }} 
                                />
                                <span className={cn("text-[10px] font-bold", isFullscreen ? "text-primary" : "text-primary")}>B</span>
                              </div>
                            ) : (
                              <div
                                className="relative group cursor-pointer"
                                onClick={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  handleSeek(
                                    ((e.clientX - rect.left) / rect.width) *
                                      duration,
                                  );
                                  resetControlsTimer();
                                }}
                              >
                                <div className={cn("h-1.5 rounded-full overflow-hidden group-hover:h-2.5 transition-all", isFullscreen ? "bg-white/20" : "bg-primary/20")}>
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  handleSeekRelative(-10);
                                  resetControlsTimer();
                                }}
                                className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                              >
                                <SkipBack className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  handlePlayPause();
                                  resetControlsTimer();
                                }}
                                className="p-2 bg-primary hover:bg-primary/80 rounded-xl text-primary-foreground transition-colors"
                              >
                                {isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  handleSeekRelative(10);
                                  resetControlsTimer();
                                }}
                                className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                              >
                                <SkipForward className="h-3.5 w-3.5" />
                              </button>
                              <span className={cn("text-xs tabular-nums", isFullscreen ? "text-white/70" : "text-muted-foreground")}>
                                {formatTime(currentTime)} /{" "}
                                {formatTime(duration)}
                              </span>
                              <div className="flex-1" />
        <button
          onClick={() => setShowAB((p) => !p)}
          className={cn("p-1.5 rounded-lg transition-colors", showAB ? "text-primary bg-primary/10" : (isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground"))}
          title="A-B Loop"
        >
          <Repeat className="h-3.5 w-3.5" />
        </button>
                              <button
                                onClick={() => setShowYouTubeSearch(true)}
                                className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                                title="Search YouTube"
                              >
                                <Search className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={handleMute}
                                className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                              >
                                {muted || volume === 0 ? (
                                  <VolumeX className="h-3.5 w-3.5" />
                                ) : volume < 0.5 ? (
                                  <Volume1 className="h-3.5 w-3.5" />
                                ) : (
                                  <Volume2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.02"
                                value={muted ? 0 : volume}
                                onChange={(e) =>
                                  handleVolumeChange(parseFloat(e.target.value))
                                }
                                className="w-16 accent-primary"
                              />
                              <div className="relative">
                                <button
                                  onClick={() => setShowSpeedPopup((p) => !p)}
                                  className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border", isFullscreen ? "bg-white/10 text-white/80 hover:bg-white/20 border-white/20" : "bg-muted text-foreground hover:bg-accent border-border")}
                                >
                                  <Gauge className="h-3 w-3" />
                                  {speed.toFixed(2)}x
                                </button>
                                <AnimatePresence>
                                  {showSpeedPopup && (
                                    <SpeedPopup
                                      speed={speed}
                                      onChange={handleSpeedChange}
                                      onClose={() => setShowSpeedPopup(false)}
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => setShowSettingsMenu((p) => !p)}
                                  className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                                  title="Settings (Quality, CC, Audio)"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                </button>
                                <AnimatePresence>
                                  {showSettingsMenu && (
                                    <VideoSettingsPopup
                                      videoType={videoType}
                                      videoSrc={videoSrc}
                                      ytPlayer={ytPlayerRef.current}
                                      videoEl={videoRef.current}
                                      onClose={() => setShowSettingsMenu(false)}
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                              {!isFullscreen && (
                                <button
                                  onClick={handleMiniPlayer}
                                  className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                                >
                                  <Minimize2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={toggleFullscreen}
                                className={cn("p-1.5 rounded-lg transition-colors", isFullscreen ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                              >
                                {isFullscreen ? (
                                  <Maximize2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Maximize className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {!isFullscreen && (
                              <p className="text-[10px] text-muted-foreground text-center">
                                Space: play/pause · ← →: seek 5s · ↑ ↓: volume ·
                                M: mute · I: mini · F: fullscreen
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                {/* Mini player message bar */}
                {isMiniPlayer && videoType && (
                  <div className="flex-1 flex items-center justify-center bg-background/50">
                    <div className="text-center">
                      <Minimize2 className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                      <p className="text-sm font-medium text-foreground">
                        Playing in Mini Player
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {videoTitle}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleMiniPlayer}
                        className="mt-3 gap-1.5 text-xs"
                      >
                        <Maximize2 className="h-3 w-3" />
                        Return to Full Player
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes panel - Responsive width */}
              <AnimatePresence>
                {showNotes && !isMiniPlayer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "border-l border-border bg-card/50 flex flex-col overflow-hidden shrink-0 w-full lg:w-80 h-[40vh] lg:h-auto",
                    )}
                  >
                    {MemoizedNotesPanel}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showNotes && isFullscreen && (
                  <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-0 right-0 bottom-0 z-40 w-full max-w-[28rem] border-l border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
                  >
                    {MemoizedNotesPanel}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ── Local Mini Player (on /video page only) ───────────────────── */}
      <AnimatePresence>
        {isMiniPlayer && videoType && (
          <div
            ref={miniRef}
            className="fixed top-0 left-0 z-[9998] w-80 rounded-2xl overflow-hidden shadow-2xl border border-border bg-black"
            style={{
              transform: `translate(${miniDragRef.current.posX}px, ${miniDragRef.current.posY}px)`,
            }}
            onPointerDown={onMiniPointerDown}
            onPointerMove={onMiniPointerMove}
            onPointerUp={onMiniPointerUp}
          >
            <div className="flex items-center justify-between px-2 py-1.5 bg-card/90 backdrop-blur cursor-grab active:cursor-grabbing border-b border-border/50">
              <div className="flex-1 min-w-0 mr-1">
                <p className="text-[10px] text-foreground font-medium truncate">
                  {videoTitle}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {getSourceLabel(videoType, videoSrc)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={handlePlayPause}
                  className="p-1 hover:bg-accent rounded text-foreground/80"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={handleMiniPlayer}
                  className="p-1 hover:bg-accent rounded text-foreground/80"
                  title="Exit mini player (I)"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    setIsMiniPlayer(false);
                    videoCtx.deactivateMiniPlayer();
                    setVideoType(null);
                    setVideoSrc(null);
                  }}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-foreground/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              {videoType === "html5" && videoSrc && (
                <video
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  playsInline
                  autoPlay={isPlaying}
                  muted={muted}
                  onClick={handlePlayPause}
                  ref={(node) => {
                    if (node) {
                      node.currentTime = currentTimeRef.current;
                      node.playbackRate = speedObjRef.current;
                      node.volume = volumeObjRef.current;
                      if (isPlaying) node.play().catch(() => {});
                    }
                  }}
                />
              )}
              {videoType === "youtube" &&
                videoSrc &&
                (() => {
                  const ytId = getYouTubeId(videoSrc);
                  return ytId ? (
                    <div className="w-full h-full pointer-events-none">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytId}?start=${Math.floor(currentTimeRef.current)}&autoplay=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3&showinfo=0&disablekb=1&fs=0`}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : null;
                })()}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 pointer-events-none">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(uploadTarget || replaceVideoTarget) && (
          <VideoUploadModal
            title={replaceVideoTarget ? "Replace Video" : "Add Video"}
            onLocal={(file) =>
              handleVideoUpload(file, uploadTarget ?? replaceVideoTarget)
            }
            onYoutube={(url) => {
              const t = uploadTarget ?? replaceVideoTarget!;
              applyVideoToLeaf(t, { type: "youtube", url });
              setUploadTarget(null);
              setReplaceVideoTarget(null);
              if (t.subSubId) setActiveLeafId(t.subSubId);
              else setActiveLeafId(t.subId);
            }}
            onUrl={(url) => {
              const t = uploadTarget ?? replaceVideoTarget!;
              applyVideoToLeaf(t, { type: "url", url });
              setUploadTarget(null);
              setReplaceVideoTarget(null);
              if (t.subSubId) setActiveLeafId(t.subSubId);
              else setActiveLeafId(t.subId);
            }}
            onSearch={() => setShowYouTubeSearch(true)}
            onClose={() => {
              setUploadTarget(null);
              setReplaceVideoTarget(null);
            }}
          />
        )}
        {showYouTubeSearch && (
          <YouTubeVideoSearchModal
            onClose={() => setShowYouTubeSearch(false)}
            onVideoSelected={(videoId, title) => {
              const target =
                uploadTarget ??
                replaceVideoTarget ??
                findLeafTarget(activeLeafId);
              if (target) {
                applyVideoToLeaf(target, {
                  type: "youtube",
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  fileName: title,
                });
                if (target.subSubId) setActiveLeafId(target.subSubId);
                else setActiveLeafId(target.subId);
              }
              setUploadTarget(null);
              setReplaceVideoTarget(null);
              setShowYouTubeSearch(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {screenshotTargetBlockId && (
          <ScreenshotEditor
            videoRef={videoRef}
            isYoutube={videoType === "youtube"}
            onSave={handleScreenshotSave}
            onClose={() => setScreenshotTargetBlockId(null)}
          />
        )}
      </AnimatePresence>

      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => {}}
      />
      <input
        ref={blockImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBlockImageFile}
      />
    </motion.div>
  );
}
