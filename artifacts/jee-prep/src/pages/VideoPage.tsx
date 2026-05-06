import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { idbSet, idbGet, idbDelete } from "@/lib/idb";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useVideoContext, VideoMiniState } from "@/context/VideoContext";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Plus, X, Trash2, ChevronDown, ChevronRight as ChevRight,
  Pencil, FolderPlus, FilePlus, Link as LinkIcon,
  Mic, Image as ImageIcon, Clock,
  Gauge, Minimize2, Maximize2, Maximize,
  FileVideo, Youtube, Globe, Bookmark,
  Check, StickyNote, SkipBack, SkipForward,
  MicOff, Square, Palette, Camera, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadYouTubeApi } from "@/lib/youtube-api";

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
  "#6B7280", "#3B82F6", "#22C55E", "#EF4444",
  "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/embed\/([^?#]+)/,
    /youtube\.com\/shorts\/([^?#]+)/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function getSourceLabel(videoType: string | null, src: string | null): string {
  if (!videoType || !src) return "";
  if (videoType === "youtube") return "YouTube";
  if (src.startsWith("blob:")) return "Local File";
  try { return new URL(src).hostname || "Online"; } catch { return "Online"; }
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
      ctx.fillText("YouTube screenshots blocked by browser", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText("(Cross-origin restriction)", canvas.width / 2, canvas.height / 2 + 15);
      setCaptured(true);
    } else if (videoRef.current) {
      try {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 360;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCaptured(true);
      } catch {
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Could not capture frame", canvas.width / 2, canvas.height / 2);
        setCaptured(true);
      }
    }
  }, [isYoutube, videoRef]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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

  const onMouseUp = () => { setDrawing(false); lastPos.current = null; };

  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(blob => { if (blob) onSave(blob); }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl z-10 w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />Screenshot Editor
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#FFFFFF", "#000000"].map(c => (
                <button key={c} onClick={() => setPenColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: penColor === c ? "#8B5CF6" : "transparent" }}
                />
              ))}
            </div>
            <input type="range" min="1" max="10" value={penSize} onChange={e => setPenSize(+e.target.value)} className="w-16 accent-primary" title="Pen size" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs gap-1.5" disabled={!captured}>
              <Check className="h-3 w-3" />Save to Note
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
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
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Draw on the screenshot, then click Save</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Video Upload Modal ───────────────────────────────────────────────────────
function VideoUploadModal({
  onLocal, onYoutube, onUrl, onClose, title = "Add Video",
}: {
  onLocal: (file: File) => void;
  onYoutube: (url: string) => void;
  onUrl: (url: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const [tab, setTab] = useState<"local" | "youtube" | "url">("local");
  const [inputUrl, setInputUrl] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmitUrl = () => {
    if (!inputUrl.trim()) { setErr("Please enter a URL."); return; }
    if (tab === "youtube") {
      const id = getYouTubeId(inputUrl.trim());
      if (!id) { setErr("Could not extract YouTube video ID. Check the URL."); return; }
      onYoutube(inputUrl.trim());
    } else {
      onUrl(inputUrl.trim());
    }
  };

  const tabs = [
    { id: "local" as const, icon: FileVideo, label: "Local File" },
    { id: "youtube" as const, icon: Youtube, label: "YouTube" },
    { id: "url" as const, icon: Globe, label: "Video URL" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setErr(""); setInputUrl(""); }}
              className={cn("flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-all font-medium",
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
        {tab === "local" && (
          <div>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}>
              <FileVideo className="h-8 w-8 mx-auto mb-2 text-primary/50" />
              <p className="text-sm font-medium text-foreground mb-1">Choose a video file</p>
              <p className="text-xs text-muted-foreground">MP4, WebM, MOV, AVI supported</p>
            </div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onLocal(f); }} />
          </div>
        )}
        {(tab === "youtube" || tab === "url") && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {tab === "youtube" ? "Paste YouTube video URL" : "Paste direct video URL (MP4, WebM, etc.)"}
              </p>
              <input autoFocus type="url"
                placeholder={tab === "youtube" ? "https://youtube.com/watch?v=..." : "https://example.com/video.mp4"}
                value={inputUrl}
                onChange={e => { setInputUrl(e.target.value); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmitUrl()}
                className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            </div>
            <Button className="w-full h-8 text-xs gap-1.5" onClick={handleSubmitUrl} disabled={!inputUrl.trim()}>
              {tab === "youtube" ? <><Youtube className="h-3.5 w-3.5" />Add YouTube</> : <><Globe className="h-3.5 w-3.5" />Add URL</>}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Speed Control Popup ──────────────────────────────────────────────────────
function SpeedPopup({ speed, onChange, onClose }: { speed: number; onChange: (s: number) => void; onClose: () => void }) {
  const [inputVal, setInputVal] = useState(String(speed));
  const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];
  const apply = (v: number) => { const c = Math.max(0.1, Math.min(8, v)); onChange(c); setInputVal(String(c)); };

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card border border-border rounded-2xl shadow-2xl p-4 w-64"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Playback Speed</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="text-center mb-3">
          <span className="text-3xl font-black text-primary tabular-nums">{speed.toFixed(2)}x</span>
        </div>
        <input type="range" min="0.1" max="8" step="0.05" value={speed}
          onChange={e => { onChange(parseFloat(e.target.value)); setInputVal(e.target.value); }}
          className="w-full accent-primary mb-1" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">0.1x</span>
          <span className="text-xs text-muted-foreground">8x</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="number" min="0.1" max="8" step="0.05" value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => { const v = parseFloat(inputVal); if (!isNaN(v)) apply(v); }}
            onKeyDown={e => { if (e.key === "Enter") { const v = parseFloat(inputVal); if (!isNaN(v)) apply(v); } }}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <span className="text-xs text-muted-foreground">Custom</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map(p => (
            <button key={p} onClick={() => apply(p)}
              className={cn("text-[10px] py-1 rounded-lg font-medium transition-all border",
                Math.abs(speed - p) < 0.01
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground")}>
              {p}x
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main VideoPage ───────────────────────────────────────────────────────────
export default function VideoPage() {
  const videoCtx = useVideoContext();

  const [sections, setSections] = useLocalStorage<VideoSection[]>("vid_sections_v1", []);
  const [allNotes, setAllNotes] = useLocalStorage<Record<string, NoteBlock[]>>("vid_notes_v1", {});
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploadTarget, setUploadTarget] = useState<{ sectionId: string; subId: string; subSubId?: string } | null>(null);
  const [replaceVideoTarget, setReplaceVideoTarget] = useState<{ sectionId: string; subId: string; subSubId?: string } | null>(null);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

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

  // Notes
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [recordingTargetBlockId, setRecordingTargetBlockId] = useState<string | null>(null);
  const [screenshotTargetBlockId, setScreenshotTargetBlockId] = useState<string | null>(null);
  const [imageTargetBlockId, setImageTargetBlockId] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytDivRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const miniDragRef = useRef({ active: false, startX: 0, startY: 0, posX: 0, posY: 0 });
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
  useEffect(() => { volumeObjRef.current = volume; }, [volume]);
  useEffect(() => { mutedObjRef.current = muted; }, [muted]);
  useEffect(() => { speedObjRef.current = speed; }, [speed]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { activeLeafIdRef.current = activeLeafId; }, [activeLeafId]);

  const notes: NoteBlock[] = (activeLeafId ? allNotes[activeLeafId] : null) ?? [];

  function setNotes(updater: (prev: NoteBlock[]) => NoteBlock[]) {
    if (!activeLeafId) return;
    setAllNotes(prev => ({ ...prev, [activeLeafId]: updater(prev[activeLeafId] ?? []) }));
  }

  // ── Find active leaf ──────────────────────────────────────────────────────
  const findLeaf = useCallback((leafId: string) => {
    for (const sec of sections) {
      for (const sub of sec.subsections) {
        if (sub.id === leafId) return { video: sub.video, name: sub.name };
        for (const ss of sub.subsubsections) {
          if (ss.id === leafId) return { video: ss.video, name: ss.name };
        }
      }
    }
    return null;
  }, [sections]);

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
            const blob = await idbGet<Blob>(key);
            if (blob) urls[key] = URL.createObjectURL(blob);
          }
        }
      }
      if (Object.keys(urls).length > 0) setMediaUrls(prev => ({ ...prev, ...urls }));
    };
    loadMedia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, activeLeafId]);

  // ── Load video for active leaf ────────────────────────────────────────────
  const loadLeafVideo = useCallback(async (leafId: string) => {
    const leaf = sections.reduce<{ video?: VideoLeafData; name: string } | null>((acc, sec) => {
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
      setVideoType(null); setVideoSrc(null); setVideoTitle(leaf?.name ?? "");
      return;
    }

    const { video, name } = leaf;
    setVideoTitle(name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (video.type === "local" && video.fileKey) {
      const blob = await idbGet<Blob>(video.fileKey);
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
  }, [sections]);

  useEffect(() => {
    if (activeLeafId) loadLeafVideo(activeLeafId);
  }, [activeLeafId, loadLeafVideo]);

  // ── Resume position: check after video loaded ─────────────────────────────
  useEffect(() => {
    if (!activeLeafId || !videoType || !videoSrc) return;
    try {
      const saved = JSON.parse(localStorage.getItem("jee_vid_resume") || "null");
      if (saved && saved.leafId === activeLeafId && Date.now() - saved.savedAt < 600000 && saved.time > 5) {
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
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} ytPlayerRef.current = null; }

      ytPlayerRef.current = new (window as any).YT.Player(ytDivRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            setDuration(e.target.getDuration() || 0);
            e.target.setVolume(volumeObjRef.current * 100);
            if (mutedObjRef.current) e.target.mute(); else e.target.unMute();
            e.target.setPlaybackRate(speedObjRef.current);
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT.PlayerState;
            if (e.data === YT.PLAYING) setIsPlaying(true);
            else if (e.data === YT.PAUSED || e.data === YT.ENDED) setIsPlaying(false);
            if (e.data === YT.PLAYING) setDuration(e.target.getDuration() || 0);
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [videoType, videoSrc]);

  // ── Progress polling + save resume ────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); return; }
    progressIntervalRef.current = setInterval(() => {
      let t = 0;
      if (videoType === "youtube" && ytPlayerRef.current?.getCurrentTime) {
        t = ytPlayerRef.current.getCurrentTime();
        setCurrentTime(t);
        setDuration(ytPlayerRef.current.getDuration() || 0);
      } else if (videoRef.current) {
        t = videoRef.current.currentTime;
        setCurrentTime(t);
        setDuration(videoRef.current.duration || 0);
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
            localStorage.setItem("jee_vid_resume", JSON.stringify({ leafId, time: t, savedAt: Date.now() }));
          } catch {}
        }
      }
    }, 250);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
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
    if (!isFullscreen) { setShowControls(true); return; }
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [isFullscreen, resetControlsTimer]);

  // ── Playback controls ─────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (videoType === "youtube" && ytPlayerRef.current) {
      const state = ytPlayerRef.current.getPlayerState?.();
      if (state === 1) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [videoType]);

  const handleSeek = useCallback((time: number) => {
    const t = Math.max(0, Math.min(durationRef.current, time));
    if (videoType === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(t, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
    setCurrentTime(t);
  }, [videoType]);

  const handleSeekRelative = useCallback((delta: number) => handleSeek(currentTimeRef.current + delta), [handleSeek]);

  const handleVolumeChange = useCallback((v: number) => {
    const vol = Math.max(0, Math.min(1, v));
    setVolume(vol);
    if (videoType === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(vol * 100);
      if (vol > 0 && mutedObjRef.current) { ytPlayerRef.current.unMute(); setMuted(false); }
    } else if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  }, [videoType]);

  const handleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (videoType === "youtube" && ytPlayerRef.current) {
        if (next) ytPlayerRef.current.mute(); else ytPlayerRef.current.unMute();
      } else if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  }, [videoType]);

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    if (videoType === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate(s);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = s;
    }
  }, [videoType]);

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
      const resumeTime = videoCtx.miniState?.currentTime ?? currentTimeRef.current;
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
      if (miniRef.current) miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }, [isMiniPlayer, videoCtx, videoSrc, videoType, videoTitle, isPlaying, speed, volume, muted, activeLeafId, handleSeek]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!videoType) return;
      switch (e.key) {
        case " ": e.preventDefault(); handlePlayPause(); resetControlsTimer(); break;
        case "ArrowLeft": e.preventDefault(); handleSeekRelative(-5); resetControlsTimer(); break;
        case "ArrowRight": e.preventDefault(); handleSeekRelative(5); resetControlsTimer(); break;
        case "ArrowUp": e.preventDefault(); handleVolumeChange(volumeObjRef.current + 0.1); break;
        case "ArrowDown": e.preventDefault(); handleVolumeChange(volumeObjRef.current - 0.1); break;
        case "m": case "M": handleMute(); break;
        case "i": case "I": handleMiniPlayer(); break;
        case "f": case "F": toggleFullscreen(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [videoType, handlePlayPause, handleSeekRelative, handleVolumeChange, handleMute, handleMiniPlayer, toggleFullscreen, resetControlsTimer]);

  // ── Mini player drag ──────────────────────────────────────────────────────
  const onMiniPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    miniDragRef.current.active = true;
    miniDragRef.current.startX = e.clientX - miniDragRef.current.posX;
    miniDragRef.current.startY = e.clientY - miniDragRef.current.posY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onMiniPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!miniDragRef.current.active) return;
    const x = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - miniDragRef.current.startX));
    const y = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - miniDragRef.current.startY));
    miniDragRef.current.posX = x; miniDragRef.current.posY = y;
    if (miniRef.current) miniRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const onMiniPointerUp = useCallback(() => { miniDragRef.current.active = false; }, []);

  // ── HTML5 video events ────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoType !== "html5") return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onMeta = () => setDuration(v.duration || 0);
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.volume = volume; v.muted = muted; v.playbackRate = speed;
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [videoSrc, videoType]);

  // ── Timeline block actions ────────────────────────────────────────────────
  const addTimelineBlock = () => {
    const ts = videoType === "youtube" && ytPlayerRef.current
      ? ytPlayerRef.current.getCurrentTime?.() ?? currentTime
      : videoRef.current?.currentTime ?? currentTime;
    const block: NoteBlock = { id: uuid(), type: "timeline", timestamp: ts, text: "", createdAt: Date.now() };
    setNotes(prev => [...prev, block]);
    setEditingBlockId(block.id);
    setEditingText("");
    setAddBlockOpen(false);
  };

  const addTextBlock = () => {
    const block: NoteBlock = { id: uuid(), type: "text", text: "", createdAt: Date.now() };
    setNotes(prev => [...prev, block]);
    setEditingBlockId(block.id);
    setEditingText("");
    setAddBlockOpen(false);
  };

  const addImageToBlock = (blockId: string) => {
    setImageTargetBlockId(blockId);
    blockImageInputRef.current?.click();
  };

  const handleBlockImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLeafId || !imageTargetBlockId) return;
    e.target.value = "";
    const key = `vid_img_${activeLeafId}_${Date.now()}`;
    await idbSet(key, file);
    const url = URL.createObjectURL(file);
    setMediaUrls(prev => ({ ...prev, [key]: url }));
    setNotes(prev => prev.map(b => b.id === imageTargetBlockId ? { ...b, imageKey: key, imageName: file.name } : b));
    setImageTargetBlockId(null);
  };

  const startRecordingForBlock = async (blockId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setRecordingTargetBlockId(blockId);
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (!activeLeafId || !blockId) return;
        const key = `vid_voice_${activeLeafId}_${Date.now()}`;
        const dur = recordingTime;
        await idbSet(key, blob);
        const url = URL.createObjectURL(blob);
        setMediaUrls(prev => ({ ...prev, [key]: url }));
        setNotes(prev => prev.map(b => b.id === blockId ? { ...b, voiceKey: key, voiceDuration: dur } : b));
        setRecordingTime(0);
        setRecordingTargetBlockId(null);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
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
    await idbSet(key, blob);
    const url = URL.createObjectURL(blob);
    setMediaUrls(prev => ({ ...prev, [key]: url }));
    setNotes(prev => prev.map(b => b.id === screenshotTargetBlockId ? { ...b, screenshotKey: key } : b));
    setScreenshotTargetBlockId(null);
  };

  const deleteBlock = async (block: NoteBlock) => {
    const keysToDelete = [block.imageKey, block.voiceKey, block.screenshotKey].filter(Boolean) as string[];
    for (const key of keysToDelete) {
      await idbDelete(key);
      setMediaUrls(prev => { const n = { ...prev }; if (prev[key]) URL.revokeObjectURL(prev[key]); delete n[key]; return n; });
    }
    setNotes(prev => prev.filter(b => b.id !== block.id));
  };

  const saveTextEdit = (blockId: string) => {
    setNotes(prev => prev.map(b => b.id === blockId ? { ...b, text: editingText } : b));
    setEditingBlockId(null);
  };

  const jumpToTimestamp = (ts: number) => {
    handleSeek(ts);
    if (videoType === "youtube" && ytPlayerRef.current) ytPlayerRef.current.playVideo();
    else if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  // ── Section tree helpers ──────────────────────────────────────────────────
  const addSection = () => {
    const id = uuid();
    setSections(prev => [...prev, { id, name: "New Section", expanded: true, subsections: [] }]);
    setRenamingId(id); setRenameVal("New Section");
  };

  const addSubsection = (secId: string) => {
    const id = uuid();
    setSections(prev => prev.map(s => s.id === secId ? {
      ...s, expanded: true,
      subsections: [...s.subsections, { id, name: "New Subsection", expanded: true, subsubsections: [] }]
    } : s));
    setRenamingId(id); setRenameVal("New Subsection");
  };

  const addSubSubsection = (secId: string, subId: string) => {
    const id = uuid();
    setSections(prev => prev.map(s => s.id === secId ? {
      ...s, subsections: s.subsections.map(sub => sub.id === subId ? {
        ...sub, expanded: true,
        subsubsections: [...sub.subsubsections, { id, name: "New Item" }]
      } : sub)
    } : s));
    setRenamingId(id); setRenameVal("New Item");
  };

  const deleteSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));
  const deleteSubsection = (secId: string, subId: string) => setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.filter(sub => sub.id !== subId) } : s));
  const deleteSubSubsection = (secId: string, subId: string, ssId: string) => setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, subsubsections: sub.subsubsections.filter(ss => ss.id !== ssId) } : sub) } : s));
  const toggleSection = (id: string) => setSections(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  const toggleSubsection = (secId: string, subId: string) => setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, expanded: !sub.expanded } : sub) } : s));

  const setSubColor = (secId: string, subId: string, color: string) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, color } : sub) } : s));
  };

  const setSubSubColor = (secId: string, subId: string, ssId: string, color: string) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, subsubsections: sub.subsubsections.map(ss => ss.id === ssId ? { ...ss, color } : ss) } : sub) } : s));
  };

  const commitRename = (type: "section" | "sub" | "subsub", secId: string, subId?: string, ssId?: string) => {
    const name = renameVal.trim() || "Untitled";
    if (type === "section") setSections(prev => prev.map(s => s.id === secId ? { ...s, name } : s));
    else if (type === "sub" && subId) setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, name } : sub) } : s));
    else if (type === "subsub" && subId && ssId) setSections(prev => prev.map(s => s.id === secId ? { ...s, subsections: s.subsections.map(sub => sub.id === subId ? { ...sub, subsubsections: sub.subsubsections.map(ss => ss.id === ssId ? { ...ss, name } : ss) } : sub) } : s));
    setRenamingId(null);
  };

  const handleVideoUpload = async (file: File, target: typeof uploadTarget) => {
    if (!target) return;
    const key = `vid_file_${target.subSubId ?? target.subId}_${Date.now()}`;
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    await idbSet(key, blob);
    const videoData: VideoLeafData = { type: "local", fileKey: key, fileName: file.name };
    applyVideoToLeaf(target, videoData);
    setUploadTarget(null); setReplaceVideoTarget(null);
    if (target.subSubId) setActiveLeafId(target.subSubId);
    else setActiveLeafId(target.subId);
  };

  const applyVideoToLeaf = (target: NonNullable<typeof uploadTarget>, videoData: VideoLeafData) => {
    setSections(prev => prev.map(s => s.id !== target.sectionId ? s : {
      ...s, subsections: s.subsections.map(sub => sub.id !== target.subId ? sub : target.subSubId
        ? { ...sub, subsubsections: sub.subsubsections.map(ss => ss.id === target.subSubId ? { ...ss, video: videoData } : ss) }
        : { ...sub, video: videoData }
      )
    }));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─── Inline Color Picker ──────────────────────────────────────────────────
  const ColorPicker = ({ id, current, onSelect }: { id: string; current?: string; onSelect: (c: string) => void }) => (
    <AnimatePresence>
      {activeColorPicker === id && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute left-full ml-1 top-0 z-50 bg-card border border-border rounded-xl shadow-xl p-1.5 grid grid-cols-4 gap-0.5"
          onClick={e => e.stopPropagation()}
        >
          {SECTION_COLORS.map(c => (
            <button key={c} onClick={() => { onSelect(c); setActiveColorPicker(null); }}
              className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
              style={{ backgroundColor: c, borderColor: current === c ? "white" : "transparent" }} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Shared Controls Render ───────────────────────────────────────────────
  const renderControls = (compact = false) => (
    <div className={cn("space-y-2", compact ? "p-2" : "px-4 py-3")}>
      {/* Progress bar */}
      <div className="relative group cursor-pointer" onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        handleSeek(((e.clientX - rect.left) / rect.width) * duration);
      }}>
        <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden group-hover:h-2.5 transition-all">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button onClick={() => handleSeekRelative(-10)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors" title="Back 10s">
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button onClick={handlePlayPause} className="p-2 bg-primary hover:bg-primary/80 rounded-xl text-primary-foreground transition-colors">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={() => handleSeekRelative(10)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors" title="Forward 10s">
          <SkipForward className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-white/70 tabular-nums ml-1">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <div className="flex-1" />
        <button onClick={handleMute} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors">
          {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : volume < 0.5 ? <Volume1 className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume}
          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
          className="w-16 accent-primary" />
        <button
          onClick={() => setShowSpeedPopup(p => !p)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-colors">
          <Gauge className="h-3 w-3" />{speed.toFixed(2)}x
        </button>
        {!compact && (
          <>
            <button onClick={handleMiniPlayer} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors" title="Mini Player (I)">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors" title="Fullscreen (F)">
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {compact && (
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex h-full overflow-hidden bg-background"
    >
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-card/50 overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Video Library</span>
          <button onClick={addSection}
            className="h-6 w-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
            title="Add section">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sections.length === 0 && (
            <div className="text-center py-8 px-3">
              <FileVideo className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              <p className="text-xs text-muted-foreground">No sections yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Click + to add a section</p>
            </div>
          )}

          {sections.map(sec => (
            <div key={sec.id}>
              {/* Section */}
              <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors">
                <button onClick={() => toggleSection(sec.id)} className="text-muted-foreground shrink-0">
                  {sec.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevRight className="h-3.5 w-3.5" />}
                </button>
                {renamingId === sec.id ? (
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onBlur={() => commitRename("section", sec.id)}
                    onKeyDown={e => { if (e.key === "Enter") commitRename("section", sec.id); if (e.key === "Escape") setRenamingId(null); }}
                    className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none" />
                ) : (
                  <span className="flex-1 text-xs font-semibold text-foreground truncate">{sec.name}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                  <button onClick={() => addSubsection(sec.id)} className="p-0.5 hover:text-primary text-muted-foreground" title="Add subsection"><FilePlus className="h-3 w-3" /></button>
                  <button onClick={() => { setRenamingId(sec.id); setRenameVal(sec.name); }} className="p-0.5 hover:text-primary text-muted-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => deleteSection(sec.id)} className="p-0.5 hover:text-destructive text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>

              {sec.expanded && sec.subsections.map(sub => (
                <div key={sub.id} className="ml-4">
                  <div className={cn("group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer",
                    activeLeafId === sub.id && sub.subsubsections.length === 0 && "bg-primary/10 text-primary")}
                    onClick={() => { if (sub.subsubsections.length === 0) setActiveLeafId(sub.id); else toggleSubsection(sec.id, sub.id); }}>
                    {sub.subsubsections.length > 0 && (
                      <button onClick={e => { e.stopPropagation(); toggleSubsection(sec.id, sub.id); }} className="text-muted-foreground shrink-0">
                        {sub.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {sub.subsubsections.length === 0 && <div className="w-3.5 shrink-0" />}
                    {renamingId === sub.id ? (
                      <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => commitRename("sub", sec.id, sub.id)}
                        onKeyDown={e => { if (e.key === "Enter") commitRename("sub", sec.id, sub.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                        onClick={e => e.stopPropagation()} />
                    ) : (
                      <span className="flex-1 text-xs text-foreground truncate">{sub.name}</span>
                    )}
                    {/* Color swatch */}
                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveColorPicker(activeColorPicker === sub.id ? null : sub.id)}
                        className="w-3 h-3 rounded-full border border-border hover:scale-125 transition-transform"
                        style={{ backgroundColor: sub.video ? (sub.color ?? (sub.video.type === "youtube" ? "#EF4444" : sub.video.type === "local" ? "#22C55E" : "#3B82F6")) : (sub.color ?? "#6B7280") }}
                        title="Change color" />
                      <ColorPicker id={sub.id} current={sub.color} onSelect={c => setSubColor(sec.id, sub.id, c)} />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setUploadTarget({ sectionId: sec.id, subId: sub.id })} className="p-0.5 hover:text-primary text-muted-foreground" title="Add/replace video"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => addSubSubsection(sec.id, sub.id)} className="p-0.5 hover:text-primary text-muted-foreground" title="Add item"><FilePlus className="h-3 w-3" /></button>
                      <button onClick={() => { setRenamingId(sub.id); setRenameVal(sub.name); }} className="p-0.5 hover:text-primary text-muted-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => deleteSubsection(sec.id, sub.id)} className="p-0.5 hover:text-destructive text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>

                  {sub.expanded && sub.subsubsections.map(ss => (
                    <div key={ss.id} className="ml-4">
                      <div className={cn("group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer",
                        activeLeafId === ss.id ? "bg-primary/10 text-primary" : "hover:bg-accent/30 text-muted-foreground hover:text-foreground")}
                        onClick={() => setActiveLeafId(ss.id)}>
                        <div className="w-2 h-px bg-border mr-0.5 shrink-0" />
                        {renamingId === ss.id ? (
                          <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                            onBlur={() => commitRename("subsub", sec.id, sub.id, ss.id)}
                            onKeyDown={e => { if (e.key === "Enter") commitRename("subsub", sec.id, sub.id, ss.id); if (e.key === "Escape") setRenamingId(null); }}
                            className="flex-1 text-xs bg-muted border border-primary/40 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                            onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="flex-1 text-xs truncate">{ss.name}</span>
                        )}
                        {/* Color swatch */}
                        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveColorPicker(activeColorPicker === ss.id ? null : ss.id)}
                            className="w-3 h-3 rounded-full border border-border hover:scale-125 transition-transform"
                            style={{ backgroundColor: ss.video ? (ss.color ?? (ss.video.type === "youtube" ? "#EF4444" : ss.video.type === "local" ? "#22C55E" : "#3B82F6")) : (ss.color ?? "#6B7280") }}
                            title="Change color" />
                          <ColorPicker id={ss.id} current={ss.color} onSelect={c => setSubSubColor(sec.id, sub.id, ss.id, c)} />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setUploadTarget({ sectionId: sec.id, subId: sub.id, subSubId: ss.id })} className="p-0.5 hover:text-primary text-muted-foreground" title="Add/replace video"><Plus className="h-3 w-3" /></button>
                          <button onClick={() => { setRenamingId(ss.id); setRenameVal(ss.name); }} className="p-0.5 hover:text-primary text-muted-foreground"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => deleteSubSubsection(sec.id, sub.id, ss.id)} className="p-0.5 hover:text-destructive text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-border">
          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />Local</div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400" />YouTube</div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" />URL</div>
          </div>
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeLeafId && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileVideo className="h-16 w-16 mx-auto mb-4 text-primary/20" />
              <p className="text-lg font-bold text-foreground mb-1">Select a video to watch</p>
              <p className="text-sm text-muted-foreground">Choose a section in the left panel, then add a video to it</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><FileVideo className="h-3.5 w-3.5" />Local MP4</span>
                <span className="flex items-center gap-1.5"><Youtube className="h-3.5 w-3.5 text-red-400" />YouTube</span>
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Video URL</span>
              </div>
            </div>
          </div>
        )}

        {activeLeafId && (
          <div className="flex-1 flex overflow-hidden">
            {/* Video + Controls column */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Video container with fullscreen support */}
              <div
                ref={fsContainerRef}
                className={cn("relative flex-1 min-h-0 bg-black flex flex-col",
                  isMiniPlayer && "hidden")}
                onMouseMove={resetControlsTimer}
              >
                {/* Inner player container */}
                <div ref={playerContainerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
                  {/* Title overlay */}
                  {videoType && (
                    <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                      <span className="text-white text-xs font-semibold truncate">{videoTitle}</span>
                      {getSourceLabel(videoType, videoSrc) && (
                        <span className="text-white/50 text-[10px] shrink-0">— {getSourceLabel(videoType, videoSrc)}</span>
                      )}
                    </div>
                  )}

                  {!videoType && (
                    <div className="text-center text-white/60">
                      <FileVideo className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No video loaded</p>
                      <p className="text-xs opacity-60 mt-1">Click + next to a section to add a video</p>
                      <Button variant="outline" size="sm"
                        className="mt-4 text-xs gap-1.5 border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          for (const sec of sections) {
                            for (const sub of sec.subsections) {
                              if (sub.id === activeLeafId) { setUploadTarget({ sectionId: sec.id, subId: sub.id }); return; }
                              for (const ss of sub.subsubsections) {
                                if (ss.id === activeLeafId) { setUploadTarget({ sectionId: sec.id, subId: sub.id, subSubId: ss.id }); return; }
                              }
                            }
                          }
                        }}>
                        <Plus className="h-3.5 w-3.5" />Add Video
                      </Button>
                    </div>
                  )}

                  {/* HTML5 Video */}
                  {videoType === "html5" && videoSrc && (
                    <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain" playsInline onClick={handlePlayPause} />
                  )}

                  {/* YouTube Player with overlay */}
                  {videoType === "youtube" && (
                    <div className="relative w-full h-full">
                      <div ref={ytDivRef} className="w-full h-full" />
                      {/* Transparent overlay to capture click events for custom controls */}
                      <div
                        className="absolute inset-0 z-10"
                        onClick={handlePlayPause}
                        onDoubleClick={toggleFullscreen}
                        style={{ cursor: "pointer", background: "transparent" }}
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
                          "bg-gradient-to-t from-black/80 via-black/30 to-transparent",
                          isFullscreen ? "absolute bottom-0 left-0 right-0 z-30" : "bg-card border-t border-border"
                        )}
                      >
                        {/* Title bar (non-mini) */}
                        {!isFullscreen && (
                          <div className="flex items-center justify-between px-4 pt-2">
                            <div className="flex items-center gap-1.5">
                              {videoType === "youtube" && <Youtube className="h-3.5 w-3.5 text-red-400" />}
                              {videoType === "html5" && videoSrc?.startsWith("blob:") && <FileVideo className="h-3.5 w-3.5 text-green-400" />}
                              {videoType === "html5" && !videoSrc?.startsWith("blob:") && <Globe className="h-3.5 w-3.5 text-blue-400" />}
                              <span className="text-xs font-medium text-foreground truncate max-w-48">{videoTitle}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={handleMiniPlayer} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Mini Player (I)">
                                <Minimize2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setShowNotes(p => !p)}
                                className={cn("p-1.5 rounded-lg transition-colors", showNotes ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                                title="Toggle Notes">
                                <StickyNote className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Seek + controls */}
                        <div className="px-4 py-2 space-y-1.5">
                          <div className="relative group cursor-pointer" onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            handleSeek(((e.clientX - rect.left) / rect.width) * duration);
                            resetControlsTimer();
                          }}>
                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden group-hover:h-2.5 transition-all">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { handleSeekRelative(-10); resetControlsTimer(); }} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors">
                              <SkipBack className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { handlePlayPause(); resetControlsTimer(); }} className="p-2 bg-primary hover:bg-primary/80 rounded-xl text-primary-foreground transition-colors">
                              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button onClick={() => { handleSeekRelative(10); resetControlsTimer(); }} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors">
                              <SkipForward className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs text-white/70 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
                            <div className="flex-1" />
                            <button onClick={handleMute} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 transition-colors">
                              {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : volume < 0.5 ? <Volume1 className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                            <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume}
                              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                              className="w-16 accent-primary" />
                            <div className="relative">
                              <button onClick={() => setShowSpeedPopup(p => !p)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20">
                                <Gauge className="h-3 w-3" />{speed.toFixed(2)}x
                              </button>
                              <AnimatePresence>
                                {showSpeedPopup && <SpeedPopup speed={speed} onChange={handleSpeedChange} onClose={() => setShowSpeedPopup(false)} />}
                              </AnimatePresence>
                            </div>
                            {!isFullscreen && (
                              <button onClick={handleMiniPlayer} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80">
                                <Minimize2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80">
                              {isFullscreen ? <Maximize2 className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {!isFullscreen && (
                            <p className="text-[10px] text-white/30 text-center">
                              Space: play/pause · ← →: seek 5s · ↑ ↓: volume · M: mute · I: mini · F: fullscreen
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
                    <p className="text-sm font-medium text-foreground">Playing in Mini Player</p>
                    <p className="text-xs text-muted-foreground mt-1">{videoTitle}</p>
                    <Button size="sm" variant="outline" onClick={handleMiniPlayer} className="mt-3 gap-1.5 text-xs">
                      <Maximize2 className="h-3 w-3" />Return to Full Player
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes panel */}
            <AnimatePresence>
              {showNotes && !isMiniPlayer && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-l border-border bg-card/50 flex flex-col overflow-hidden shrink-0"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5 text-primary" />Notes
                    </span>
                    <div className="flex items-center gap-1">
                      {recording && (
                        <button onClick={stopRecording}
                          className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium animate-pulse">
                          <Square className="h-3 w-3" />Stop ({formatTime(recordingTime)})
                        </button>
                      )}
                      <div className="relative">
                        <button onClick={() => setAddBlockOpen(p => !p)}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors">
                          <Plus className="h-3 w-3" />Add
                        </button>
                        <AnimatePresence>
                          {addBlockOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-xl z-50 p-1.5 min-w-[180px]"
                            >
                              <button onClick={addTimelineBlock}
                                className="flex items-center gap-2 w-full px-2.5 py-2 hover:bg-accent rounded-lg text-xs text-foreground transition-colors text-left">
                                <Clock className="h-3.5 w-3.5 text-amber-400" />
                                <div>
                                  <p className="font-medium">Timeline Marker</p>
                                  <p className="text-[10px] text-muted-foreground">Timestamp + image, voice, screenshot</p>
                                </div>
                              </button>
                              <button onClick={addTextBlock}
                                className="flex items-center gap-2 w-full px-2.5 py-2 hover:bg-accent rounded-lg text-xs text-foreground transition-colors text-left">
                                <StickyNote className="h-3.5 w-3.5 text-blue-400" />
                                <div>
                                  <p className="font-medium">Plain Text</p>
                                  <p className="text-[10px] text-muted-foreground">Write a free-form note</p>
                                </div>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notes.length === 0 && (
                      <div className="text-center py-8">
                        <StickyNote className="h-8 w-8 mx-auto mb-2 text-primary/20" />
                        <p className="text-xs text-muted-foreground">No notes yet</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Add timeline markers or plain text</p>
                      </div>
                    )}

                    {notes.map(block => (
                      <div key={block.id} className="group bg-background border border-border rounded-xl p-2.5 relative">
                        <button onClick={() => deleteBlock(block)}
                          className="absolute top-2 right-2 p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 className="h-3 w-3" />
                        </button>

                        {/* Text block */}
                        {block.type === "text" && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <StickyNote className="h-3 w-3 text-blue-400" />
                              <span className="text-[10px] text-muted-foreground">Text Note</span>
                            </div>
                            {editingBlockId === block.id ? (
                              <div>
                                <textarea autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[80px]"
                                  placeholder="Write your note..." />
                                <button onClick={() => saveTextEdit(block.id)}
                                  className="mt-1 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                                  <Check className="h-3 w-3" />Save
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors min-h-[24px]"
                                onClick={() => { setEditingBlockId(block.id); setEditingText(block.text ?? ""); }}>
                                {block.text || <span className="text-muted-foreground italic">Click to edit...</span>}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Timeline block */}
                        {block.type === "timeline" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-amber-400" />
                              <span className="text-[10px] text-muted-foreground">Timeline Marker</span>
                            </div>
                            {/* Timestamp jump */}
                            <button onClick={() => jumpToTimestamp(block.timestamp ?? 0)}
                              className="flex items-center gap-2 w-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg px-2.5 py-2 transition-colors">
                              <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                              <span className="text-sm font-bold text-amber-400 tabular-nums">{formatTime(block.timestamp ?? 0)}</span>
                              <span className="text-xs text-muted-foreground ml-auto">Jump →</span>
                            </button>
                            {/* Label */}
                            {editingBlockId === block.id ? (
                              <input autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                                placeholder="Label this timestamp..."
                                className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                                onBlur={() => saveTextEdit(block.id)}
                                onKeyDown={e => { if (e.key === "Enter") saveTextEdit(block.id); }} />
                            ) : (
                              <p className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                                onClick={() => { setEditingBlockId(block.id); setEditingText(block.text ?? ""); }}>
                                {block.text || <span className="italic">Add label (click)</span>}
                              </p>
                            )}
                            {/* Attachments */}
                            {block.imageKey && mediaUrls[block.imageKey] && (
                              <img src={mediaUrls[block.imageKey]} alt="Attached" className="w-full rounded-lg object-cover max-h-32" />
                            )}
                            {block.screenshotKey && mediaUrls[block.screenshotKey] && (
                              <div>
                                <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Camera className="h-2.5 w-2.5" />Screenshot</p>
                                <img src={mediaUrls[block.screenshotKey]} alt="Screenshot" className="w-full rounded-lg object-cover max-h-32 border border-border" />
                              </div>
                            )}
                            {block.voiceKey && mediaUrls[block.voiceKey] && (
                              <div>
                                <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Mic className="h-2.5 w-2.5" />Voice · {formatTime(block.voiceDuration ?? 0)}</p>
                                <audio src={mediaUrls[block.voiceKey]} controls className="w-full h-8" style={{ height: "32px" }} />
                              </div>
                            )}
                            {/* Sub-actions */}
                            <div className="flex gap-1 pt-1 border-t border-border/50">
                              <button onClick={() => addImageToBlock(block.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <ImageIcon className="h-3 w-3" />Image
                              </button>
                              {recording && recordingTargetBlockId === block.id ? (
                                <button onClick={stopRecording}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] bg-red-500/10 text-red-400 rounded-lg animate-pulse">
                                  <Square className="h-3 w-3" />Stop
                                </button>
                              ) : (
                                <button onClick={() => startRecordingForBlock(block.id)}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                  disabled={recording}>
                                  <Mic className="h-3 w-3" />Voice
                                </button>
                              )}
                              <button onClick={() => setScreenshotTargetBlockId(block.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                <Camera className="h-3 w-3" />Screenshot
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Legacy image block (backward compat) */}
                        {block.type === "image" && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <ImageIcon className="h-3 w-3 text-blue-400" />
                              <span className="text-[10px] text-muted-foreground">{block.imageName ?? "Image"}</span>
                            </div>
                            {block.imageKey && mediaUrls[block.imageKey] && (
                              <img src={mediaUrls[block.imageKey]} alt="Note" className="w-full rounded-lg object-cover max-h-40" />
                            )}
                          </div>
                        )}

                        {/* Legacy voice block (backward compat) */}
                        {block.type === "voice" && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Mic className="h-3 w-3 text-green-400" />
                              <span className="text-[10px] text-muted-foreground">Voice · {formatTime(block.voiceDuration ?? 0)}</span>
                            </div>
                            {block.voiceKey && mediaUrls[block.voiceKey] && (
                              <audio src={mediaUrls[block.voiceKey]} controls className="w-full h-8" style={{ height: "32px" }} />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Local Mini Player (on /video page only) ───────────────────── */}
      <AnimatePresence>
        {isMiniPlayer && videoType && (
          <div
            ref={miniRef}
            className="fixed top-0 left-0 z-[9998] w-80 rounded-2xl overflow-hidden shadow-2xl border border-border bg-black"
            style={{ transform: `translate(${miniDragRef.current.posX}px, ${miniDragRef.current.posY}px)` }}
            onPointerDown={onMiniPointerDown}
            onPointerMove={onMiniPointerMove}
            onPointerUp={onMiniPointerUp}
          >
            <div className="flex items-center justify-between px-2 py-1.5 bg-card/90 backdrop-blur cursor-grab active:cursor-grabbing border-b border-border/50">
              <div className="flex-1 min-w-0 mr-1">
                <p className="text-[10px] text-foreground font-medium truncate">{videoTitle}</p>
                <p className="text-[9px] text-muted-foreground">{getSourceLabel(videoType, videoSrc)}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={handlePlayPause} className="p-1 hover:bg-accent rounded text-foreground/80">
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
                <button onClick={handleMiniPlayer} className="p-1 hover:bg-accent rounded text-foreground/80" title="Exit mini player (I)">
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button onClick={() => { setIsMiniPlayer(false); videoCtx.deactivateMiniPlayer(); setVideoType(null); setVideoSrc(null); }}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-foreground/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              {videoType === "html5" && videoSrc && (
                <video src={videoSrc} className="w-full h-full object-contain" playsInline autoPlay={isPlaying} muted={muted}
                  onClick={handlePlayPause}
                  ref={node => {
                    if (node) {
                      node.currentTime = currentTimeRef.current;
                      node.playbackRate = speedObjRef.current;
                      node.volume = volumeObjRef.current;
                      if (isPlaying) node.play().catch(() => {});
                    }
                  }} />
              )}
              {videoType === "youtube" && videoSrc && (() => {
                const ytId = getYouTubeId(videoSrc);
                return ytId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?start=${Math.floor(currentTimeRef.current)}&autoplay=1&rel=0&modestbranding=1&controls=1`}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : null;
              })()}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 pointer-events-none">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
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
            onLocal={file => handleVideoUpload(file, uploadTarget ?? replaceVideoTarget)}
            onYoutube={url => {
              const t = uploadTarget ?? replaceVideoTarget!;
              applyVideoToLeaf(t, { type: "youtube", url });
              setUploadTarget(null); setReplaceVideoTarget(null);
              if (t.subSubId) setActiveLeafId(t.subSubId); else setActiveLeafId(t.subId);
            }}
            onUrl={url => {
              const t = uploadTarget ?? replaceVideoTarget!;
              applyVideoToLeaf(t, { type: "url", url });
              setUploadTarget(null); setReplaceVideoTarget(null);
              if (t.subSubId) setActiveLeafId(t.subSubId); else setActiveLeafId(t.subId);
            }}
            onClose={() => { setUploadTarget(null); setReplaceVideoTarget(null); }}
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
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
      <input ref={blockImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBlockImageFile} />
    </motion.div>
  );
}
