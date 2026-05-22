import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Trash2,
  X,
  MousePointer,
  FolderPlus,
  FilePlus,
  ChevronDown,
  ChevronRight as ChevRight,
  Pencil,
  Triangle,
  MoveRight,
  Link as LinkIcon,
  FileUp,
  Image as ImageIcon,
  MoreVertical,
  Scissors,
  Save,
  Check as CheckIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tool =
  | "select"
  | "pen"
  | "highlighter"
  | "rect"
  | "circle"
  | "triangle"
  | "arrow"
  | "text"
  | "eraser";

interface DrawPoint {
  x: number;
  y: number;
}
interface DrawItem {
  id: string;
  tool: Tool;
  points: DrawPoint[];
  color: string;
  width: number;
  text?: string;
  fontSize?: number;
}

interface CropArea {
  id: string;
  x: number; // relative to canvas width (0-1)
  y: number; // relative to canvas height (0-1)
  w: number; // relative to canvas width
  h: number; // relative to canvas height
}

// --- Saves Types for Integration ---
interface SavedQuestion {
  id: string;
  name: string;
  questionImageKey?: string;
  questionUrl?: string;
  answerText?: string;
  answerImageKey?: string;
  answerUrl?: string;
  description?: string;
  isCorrect?: boolean;
  createdAt: number;
}
interface QuestionSource { id: string; name: string; }
interface QuestionChapter { id: string; name: string; sources: QuestionSource[]; }
interface QuestionSubject { id: string; name: string; chapters: QuestionChapter[]; }

interface PDFSubSubsection {
  id: string;
  name: string;
  pdfKey?: string;
  pdfName?: string;
  pdfUrl?: string;
  imageKey?: string;
  imageName?: string;
  fileType?: "pdf" | "image";
}

interface PDFSubsection {
  id: string;
  name: string;
  expanded: boolean;
  pdfKey?: string;
  pdfName?: string;
  pdfUrl?: string;
  imageKey?: string;
  imageName?: string;
  fileType?: "pdf" | "image";
  subsubsections: PDFSubSubsection[];
}

interface PDFSection {
  id: string;
  name: string;
  expanded: boolean;
  subsections: PDFSubsection[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = [
  "#000000",
  "#374151",
  "#9CA3AF",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#7F1D1D",
  "#14532D",
  "#1E3A5F",
  "#4C1D95",
];

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  {
    id: "select",
    icon: <MousePointer className="h-3.5 w-3.5 text-foreground" />,
    label: "Select",
  },
  {
    id: "pen",
    icon: <Pen className="h-3.5 w-3.5 text-foreground" />,
    label: "Pen",
  },
  {
    id: "highlighter",
    icon: <Highlighter className="h-3.5 w-3.5 text-foreground" />,
    label: "Highlighter",
  },
  {
    id: "rect",
    icon: <Square className="h-3.5 w-3.5 text-foreground" />,
    label: "Rectangle",
  },
  {
    id: "circle",
    icon: <Circle className="h-3.5 w-3.5 text-foreground" />,
    label: "Circle",
  },
  {
    id: "triangle",
    icon: <Triangle className="h-3.5 w-3.5 text-foreground" />,
    label: "Triangle",
  },
  {
    id: "arrow",
    icon: <MoveRight className="h-3.5 w-3.5 text-foreground" />,
    label: "Arrow",
  },
  {
    id: "text",
    icon: <Type className="h-3.5 w-3.5 text-foreground" />,
    label: "Text",
  },
  {
    id: "eraser",
    icon: <Eraser className="h-3.5 w-3.5 text-foreground" />,
    label: "Eraser",
  },
];

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawItem(ctx: CanvasRenderingContext2D, item: DrawItem) {
  if (item.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const [p0, ...rest] = item.points;
  const last = rest.length > 0 ? rest[rest.length - 1] : p0;

  if (item.tool === "highlighter") {
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = item.width * 4;
  }

  switch (item.tool) {
    case "pen":
    case "highlighter":
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      rest.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      break;

    case "eraser":
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.lineWidth = item.width * 4;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      rest.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      break;

    case "rect":
      ctx.beginPath();
      ctx.strokeRect(p0.x, p0.y, last.x - p0.x, last.y - p0.y);
      break;

    case "circle": {
      const rx = Math.abs(last.x - p0.x) / 2;
      const ry = Math.abs(last.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(
        p0.x + (last.x - p0.x) / 2,
        p0.y + (last.y - p0.y) / 2,
        rx,
        ry,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }

    case "triangle":
      ctx.beginPath();
      ctx.moveTo(p0.x + (last.x - p0.x) / 2, p0.y);
      ctx.lineTo(last.x, last.y);
      ctx.lineTo(p0.x, last.y);
      ctx.closePath();
      ctx.stroke();
      break;

    case "arrow": {
      const dx = last.x - p0.x;
      const dy = last.y - p0.y;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.max(
        10,
        Math.min(25, Math.sqrt(dx * dx + dy * dy) * 0.35),
      );
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(last.x, last.y);
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(
        last.x - headLen * Math.cos(angle - Math.PI / 6),
        last.y - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(
        last.x - headLen * Math.cos(angle + Math.PI / 6),
        last.y - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
      break;
    }

    case "text":
      if (item.text) {
        ctx.globalAlpha = 1;
        ctx.font = `${item.fontSize || 16}px Inter, sans-serif`;
        ctx.fillText(item.text, p0.x, p0.y);
      }
      break;
  }
  ctx.restore();
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

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({
  onFile,
  onImage,
  onUrl,
  onClose,
}: {
  onFile: () => void;
  onImage: () => void;
  onUrl: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"file" | "image" | "url">("file");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setErr("");
    try {
      onUrl(url.trim());
    } catch {
      setErr("Could not load PDF from that URL.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Load Document or Image
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          <button
            onClick={() => setTab("file")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-all font-medium
              ${tab === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileUp className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={() => setTab("image")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-all font-medium
              ${tab === "image" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Image
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-all font-medium
              ${tab === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            URL
          </button>
        </div>

        {tab === "file" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => onFile()}
          >
            <FileUp className="h-8 w-8 mx-auto mb-2 text-primary/50" />
            <p className="text-sm font-medium text-foreground mb-1">
              Choose a PDF file
            </p>
            <p className="text-xs text-muted-foreground">
              Click to browse from your device
            </p>
          </div>
        )}

        {tab === "image" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
            onClick={() => onImage()}
          >
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-purple-400/60" />
            <p className="text-sm font-medium text-foreground mb-1">
              Choose an image file
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP, GIF — annotate on top
            </p>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Paste a direct link to a PDF file
              </p>
              <input
                autoFocus
                type="url"
                placeholder="https://example.com/document.pdf"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleUrl()}
                className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            </div>
            <Button
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleUrl}
              disabled={!url.trim() || loading}
            >
              {loading ? (
                "Loading…"
              ) : (
                <>
                  <LinkIcon className="h-3.5 w-3.5" />
                  Load PDF
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Multi-Crop Helper ──────────────────────────────────────────────────────
function CropBox({ crop, active, onUpdate, onDelete, containerRef, label, onConfirm }: { 
  crop: CropArea, 
  active: boolean, 
  onUpdate: (u: Partial<CropArea>) => void,
  onDelete: () => void,
  containerRef: React.RefObject<HTMLDivElement>,
  label?: string,
  onConfirm?: () => void
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const startRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  const onPointerDown = (e: React.PointerEvent, type: string | null) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    startRef.current = { 
      x: e.clientX, y: e.clientY, 
      cropX: crop.x, cropY: crop.y, 
      cropW: crop.w, cropH: crop.h 
    };
    if (type === 'move') setIsDragging(true);
    else setIsResizing(type);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - startRef.current.x) / rect.width;
    const dy = (e.clientY - startRef.current.y) / rect.height;

    if (isDragging) {
      onUpdate({ 
        x: Math.max(0, Math.min(1 - crop.w, startRef.current.cropX + dx)),
        y: Math.max(0, Math.min(1 - crop.h, startRef.current.cropY + dy))
      });
    } else if (isResizing) {
      let { cropX, cropY, cropW, cropH } = startRef.current;
      if (isResizing.includes('e')) cropW = Math.max(0.01, Math.min(1 - cropX, cropW + dx));
      if (isResizing.includes('s')) cropH = Math.max(0.01, Math.min(1 - cropY, cropH + dy));
      if (isResizing.includes('w')) {
        const nextW = Math.max(0.01, cropW - dx);
        if (nextW !== cropW) { cropX = cropX + (cropW - nextW); cropW = nextW; }
      }
      if (isResizing.includes('n')) {
        const nextH = Math.max(0.01, cropH - dy);
        if (nextH !== cropH) { cropY = cropY + (cropH - nextH); cropH = nextH; }
      }
      onUpdate({ x: cropX, y: cropY, w: cropW, h: cropH });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsResizing(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <div 
      className={cn(
        "absolute border-2 transition-colors group select-none",
        active ? "border-primary bg-primary/5 z-30" : "border-white/50 bg-white/5 z-20 hover:border-white"
      )}
      style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Label */}
      <div className="absolute -top-6 left-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-2 whitespace-nowrap shadow-lg">
        {label || `Q ${crop.id.slice(-2)}`}
        {onConfirm && (
          <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="hover:text-green-200"><CheckIcon className="h-3 w-3"/></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="hover:text-red-200"><X className="h-3 w-3"/></button>
      </div>

      {/* Resize Handles */}
      {handles.map(h => (
        <div 
          key={h}
          onPointerDown={(e) => onPointerDown(e, h)}
          className={cn(
            "absolute w-3 h-3 bg-white border-2 border-primary rounded-full -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
            active && "opacity-100",
            h.includes('n') && "top-0", h.includes('s') && "top-full",
            h.includes('w') && "left-0", h.includes('e') && "left-full",
            h === 'n' || h === 's' ? "left-1/2 cursor-ns-resize" : 
            h === 'e' || h === 'w' ? "top-1/2 cursor-ew-resize" : 
            (h === 'nw' || h === 'se') ? "cursor-nwse-resize" : "cursor-nesw-resize"
          )}
        />
      ))}
    </div>
  );
}

// ─── Destination Picker ──────────────────────────────────────────────────────
function SourcePicker({ onConfirm, onClose }: { onConfirm: (id: string) => void, onClose: () => void }) {
  const [subjects, setSubjects] = useState<QuestionSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sel, setSel] = useState("");

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("jee_saves_subjects_v1") || "[]");
      setSubjects(data);
    } catch {
      setSubjects([]);
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-sm font-bold mb-4">Select Destination Source</h3>
        <div className="max-h-60 overflow-y-auto space-y-1 mb-6">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading sources...</p>
          ) : subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No sources found. Create one in 'Saves' first.</p>
          ) : (
            subjects.map(sub => (
              <div key={sub.id} className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mt-2">{sub.name}</p>
                {sub.chapters.map(chap => (
                  <div key={chap.id} className="pl-2 space-y-0.5">
                     {chap.sources.map(src => (
                       <button 
                          key={src.id} 
                          onClick={() => setSel(src.id)}
                          className={cn("w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors", sel === src.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}
                       >
                         {src.name}
                       </button>
                     ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!sel} onClick={() => onConfirm(sel)}>Add</Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Multi-Crop Editor Panel ────────────────────────────────────────────────
function MultiCropEditor({ 
  crops, 
  onClose, 
  onSave,
  onUpdateCrop,
  onCaptureAnswer
}: { 
  crops: any[], 
  onClose: () => void, 
  onSave: () => void,
  onUpdateCrop: (id: string, updates: any) => void,
  onCaptureAnswer: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" /> Import Questions ({crops.length})
          </h2>
          <p className="text-xs text-muted-foreground">Review and add details for your cropped questions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>Discard All</Button>
          <Button size="sm" className="font-bold px-6" onClick={onSave}>Import All Questions</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/20">
        <div className="max-w-4xl mx-auto space-y-8">
          {crops.map((crop, idx) => (
            <motion.div 
              key={crop.id} 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row"
            >
              {/* Left: Image Preview */}
              <div className="w-full md:w-1/3 bg-muted/40 p-4 border-b md:border-b-0 md:border-r border-border flex items-center justify-center">
                <div className="relative group rounded-lg overflow-hidden border border-border bg-white shadow-inner">
                  <img src={crop.imageUrl} className="max-h-60 w-full object-contain" alt="Question Crop" />
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    Q {idx + 1}
                  </div>
                </div>
              </div>

              {/* Right: Inputs */}
              <div className="flex-1 p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Question Name/No</p>
                    <Input 
                      value={crop.name || ""} 
                      onChange={e => onUpdateCrop(crop.id, { name: e.target.value })} 
                      placeholder="e.g. Q1" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Option Status</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onUpdateCrop(crop.id, { isCorrect: crop.isCorrect === true ? undefined : true })}
                        className={cn("flex-1 h-9 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all", 
                          crop.isCorrect === true ? "bg-green-500/10 border-green-500 text-green-500" : "bg-muted text-muted-foreground border-transparent")}
                      >
                        <CheckIcon className="h-3.5 w-3.5" /> Correct
                      </button>
                      <button 
                        onClick={() => onUpdateCrop(crop.id, { isCorrect: crop.isCorrect === false ? undefined : false })}
                        className={cn("flex-1 h-9 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all", 
                          crop.isCorrect === false ? "bg-red-500/10 border-red-500 text-red-500" : "bg-muted text-muted-foreground border-transparent")}
                      >
                        <X className="h-3.5 w-3.5" /> Incorrect
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Answer Section</p>
                  <div className="space-y-2">
                    <textarea 
                      value={crop.answerText || ""} 
                      onChange={e => onUpdateCrop(crop.id, { answerText: e.target.value })}
                      placeholder="Type plain text answer..." 
                      rows={2} 
                      className="w-full text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {crop.answerImageUrl ? (
                      <div className="relative border border-border rounded-lg overflow-hidden group bg-muted/30 p-2">
                         <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase">Answer Image</p>
                         <img src={crop.answerImageUrl} className="w-full max-h-32 object-contain bg-white rounded-md border border-border" alt="Answer" />
                         <div className="absolute top-1 right-1">
                           <button onClick={() => onUpdateCrop(crop.id, { answerImageBlob: null, answerImageUrl: null })} className="p-1 bg-black/60 text-white rounded-md hover:bg-red-500/80 transition-colors">
                             <X className="h-3 w-3" />
                           </button>
                         </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 flex-1" onClick={() => onCaptureAnswer(crop.id)}>
                           <Scissors className="h-3 w-3"/> Add Answer Image
                        </Button>
                        <span className="text-[10px] text-muted-foreground font-bold">OR</span>
                        <Input 
                          value={crop.answerUrl || ""} 
                          onChange={e => onUpdateCrop(crop.id, { answerUrl: e.target.value })}
                          placeholder="Paste image URL..." 
                          className="h-8 text-[11px] flex-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</p>
                  <textarea 
                    value={crop.description || ""} 
                    onChange={e => onUpdateCrop(crop.id, { description: e.target.value })}
                    placeholder="Additional notes..." 
                    rows={2} 
                    className="w-full text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PDF Page Component ───────────────────────────────────────────────────────
export default function PDFPage() {
  const [sections, setSections] = useLocalStorage<PDFSection[]>(
    "jee_pdf_sections_v3",
    [],
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const { writeMedia, readMediaAsArrayBuffer } = useWorkspaceContext();
  const [showMobileSidebar, setShowMobileSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // Multi-Crop State
  const [isCropMode, setIsCropMode] = useState(false);
  const [crops, setCrops] = useState<CropArea[]>([]);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [pendingCrops, setPendingCrops] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isSavingCrops, setIsSavingCrops] = useState(false);
  const [capturingAnswerFor, setCapturingAnswerFor] = useState<string | null>(null);
  const [answerCrop, setAnswerCrop] = useState<CropArea | null>(null);
  const creatingAnswerRef = useRef(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  
  const creatingCropIdRef = useRef<string | null>(null);
  const creationStartPosRef = useRef({ x: 0, y: 0 });

  // Upload modal: targets the item receiving the PDF
  const [uploadTarget, setUploadTarget] = useState<{
    sectionId: string;
    subId: string;
    subSubId?: string;
  } | null>(null);

  // PDF viewer state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);

  // Image viewer state (for image-type leaves)
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  // Annotation tool state
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#3B82F6");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [undoStack, setUndoStack] = useState<DrawItem[][]>([[]]);
  const [undoIdx, setUndoIdx] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [currentItem, setCurrentItem] = useState<DrawItem | null>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRef = useRef<HTMLInputElement>(null);
  const sectionImageInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);

  const items = undoStack[undoIdx] || [];

  // ── Annotation persistence ──────────────────────────────────────────────────
  const annoKey = (leafId: string, page: number) =>
    `pdf_anno_${leafId}_p${page}`;

  const loadAnnotations = useCallback(
    (leafId: string, page: number): DrawItem[] => {
      try {
        const s = localStorage.getItem(annoKey(leafId, page));
        return s ? JSON.parse(s) : [];
      } catch {
        return [];
      }
    },
    [],
  );

  const saveAnnotations = useCallback(
    (leafId: string, page: number, anns: DrawItem[]) => {
      try {
        localStorage.setItem(annoKey(leafId, page), JSON.stringify(anns));
      } catch {}
    },
    [],
  );

  // Refs so page-change effect can always read the latest values without stale closure
  const itemsRef = useRef<DrawItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // annoPageRef tracks what page the current `items` actually belong to.
  // This is the key to preventing bleed: we save to annoPageRef.current, NOT pageNum.
  const annoPageRef = useRef(1);

  // Save whenever items change — write to the page they actually belong to
  useEffect(() => {
    if (!activeLeafId) return;
    saveAnnotations(activeLeafId, annoPageRef.current, items);
  }, [items, activeLeafId, saveAnnotations]);
  // NOTE: pageNum is intentionally NOT in the dep array above

  // When the page changes: first flush the old page's items, then load the new page
  const prevLeafRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeLeafId) return;
    if (prevLeafRef.current === activeLeafId) {
      // Same document, different page — flush old page before loading new
      saveAnnotations(activeLeafId, annoPageRef.current, itemsRef.current);
      annoPageRef.current = pageNum;
      const saved = loadAnnotations(activeLeafId, pageNum);
      setUndoStack([saved]);
      setUndoIdx(0);
    } else {
      // New document — annoPageRef was already set to 1 by loadPdfFromBuffer
      prevLeafRef.current = activeLeafId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, activeLeafId]);

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  const pushState = useCallback(
    (newItems: DrawItem[]) => {
      setUndoStack((prev) => {
        const stack = prev.slice(0, undoIdx + 1);
        stack.push(newItems);
        return stack;
      });
      setUndoIdx((p) => p + 1);
    },
    [undoIdx],
  );

  const undo = useCallback(() => {
    if (undoIdx > 0) setUndoIdx((p) => p - 1);
  }, [undoIdx]);
  const redo = useCallback(() => {
    if (undoIdx < undoStack.length - 1) setUndoIdx((p) => p + 1);
  }, [undoIdx, undoStack.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Load PDF from buffer ─────────────────────────────────────────────────────
  // restoreLeafId: if provided, annotations for page 1 are restored immediately
  // so there's no race between setUndoStack([[]] and the page-change effect.
  const loadPdfFromBuffer = useCallback(
    async (buffer: ArrayBuffer, restoreLeafId?: string) => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsRef.current = pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const doc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNum(1);
      // Reset tracking refs so page-change effect treats this as a fresh document
      annoPageRef.current = 1;
      prevLeafRef.current = restoreLeafId ?? null;
      // Restore saved annotations for page 1 immediately (no async race)
      const saved = restoreLeafId ? loadAnnotations(restoreLeafId, 1) : [];
      itemsRef.current = saved;
      setUndoStack([saved]);
      setUndoIdx(0);
    },
    [loadAnnotations],
  );

  // ── Resolve the active leaf item (subsection or sub-subsection) ──────────────
  const findLeaf = useCallback(
    (leafId: string) => {
      for (const sec of sections) {
        for (const sub of sec.subsections) {
          if (sub.id === leafId)
            return {
              type: "sub" as const,
              item: sub,
              sectionId: sec.id,
              subId: sub.id,
            };
          for (const ssub of sub.subsubsections) {
            if (ssub.id === leafId)
              return {
                type: "subsub" as const,
                item: ssub,
                sectionId: sec.id,
                subId: sub.id,
                subSubId: ssub.id,
              };
          }
        }
      }
      return null;
    },
    [sections],
  );

  // ── Load PDF for a leaf item ─────────────────────────────────────────────────
  const loadLeafPdf = useCallback(
    async (leafId: string, pdfKey?: string, pdfUrl?: string) => {
      if (!pdfKey && !pdfUrl) return;
      try {
        if (pdfKey) {
          const buf = await readMediaAsArrayBuffer(pdfKey);
          if (buf) {
            prevLeafRef.current = null; // allow annotation restore on page switch
            setActiveLeafId(leafId);
            await loadPdfFromBuffer(buf, leafId);
            return;
          }
        }
        if (pdfUrl) {
          const resp = await fetch(pdfUrl);
          if (!resp.ok) throw new Error("fetch failed");
          const buf = await resp.arrayBuffer();
          // Cache in IDB for future loads
          const key = `pdf_leaf_${leafId}`;
          await writeMedia(key, buf);
          // Patch the key into storage
          setSections((prev) =>
            prev.map((sec) => ({
              ...sec,
              subsections: sec.subsections.map((sub) => {
                if (sub.id === leafId) return { ...sub, pdfKey: key };
                return {
                  ...sub,
                  subsubsections: sub.subsubsections.map((ssub) =>
                    ssub.id === leafId ? { ...ssub, pdfKey: key } : ssub,
                  ),
                };
              }),
            })),
          );
          prevLeafRef.current = null;
          setActiveLeafId(leafId);
          await loadPdfFromBuffer(buf, leafId);
        }
      } catch (e) {
        console.error("Failed to load PDF:", e);
      }
    },
    [loadPdfFromBuffer, setSections],
  );

  // ── Handle file upload for a leaf ────────────────────────────────────────────
  const handleSectionFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const { sectionId, subId, subSubId } = uploadTarget;
    const arrayBuffer = await file.arrayBuffer();
    const leafId = subSubId || subId;
    const key = `pdf_leaf_${leafId}`;
    await writeMedia(key, arrayBuffer);

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          subsections: sec.subsections.map((sub) => {
            if (sub.id !== subId) return sub;
            if (!subSubId) {
              return { ...sub, pdfKey: key, pdfName: file.name };
            }
            return {
              ...sub,
              subsubsections: sub.subsubsections.map((ssub) =>
                ssub.id === subSubId
                  ? { ...ssub, pdfKey: key, pdfName: file.name }
                  : ssub,
              ),
            };
          }),
        };
      }),
    );

    prevLeafRef.current = null;
    setActiveLeafId(leafId);
    await loadPdfFromBuffer(arrayBuffer, leafId);
    e.target.value = "";
    setUploadTarget(null);
  };

  // ── Handle image file upload for a leaf ──────────────────────────────────────
  const handleSectionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const { sectionId, subId, subSubId } = uploadTarget;
    const arrayBuffer = await file.arrayBuffer();
    const leafId = subSubId || subId;
    const key = `img_leaf_${leafId}`;
    await writeMedia(key, arrayBuffer);

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          subsections: sec.subsections.map((sub) => {
            if (sub.id !== subId) return sub;
            if (!subSubId) {
              return {
                ...sub,
                imageKey: key,
                imageName: file.name,
                fileType: "image" as const,
              };
            }
            return {
              ...sub,
              subsubsections: sub.subsubsections.map((ssub) =>
                ssub.id === subSubId
                  ? {
                      ...ssub,
                      imageKey: key,
                      imageName: file.name,
                      fileType: "image" as const,
                    }
                  : ssub,
              ),
            };
          }),
        };
      }),
    );

    // Load image for display
    const blob = new Blob([arrayBuffer], { type: file.type });
    if (activeImageUrl) URL.revokeObjectURL(activeImageUrl);
    const imgUrl = URL.createObjectURL(blob);
    setActiveImageUrl(imgUrl);
    setPdfDoc(null);
    prevLeafRef.current = null;
    setActiveLeafId(leafId);
    e.target.value = "";
    setUploadTarget(null);
  };

  // ── Handle URL load for a leaf ────────────────────────────────────────────────
  const handleUrlLoad = async (url: string) => {
    if (!uploadTarget) return;
    const { sectionId, subId, subSubId } = uploadTarget;
    const leafId = subSubId || subId;
    setUploadTarget(null);

    // Store URL in metadata
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          subsections: sec.subsections.map((sub) => {
            if (sub.id !== subId) return sub;
            if (!subSubId) {
              return {
                ...sub,
                pdfUrl: url,
                pdfName: url.split("/").pop() || "PDF",
              };
            }
            return {
              ...sub,
              subsubsections: sub.subsubsections.map((ssub) =>
                ssub.id === subSubId
                  ? {
                      ...ssub,
                      pdfUrl: url,
                      pdfName: url.split("/").pop() || "PDF",
                    }
                  : ssub,
              ),
            };
          }),
        };
      }),
    );

    await loadLeafPdf(leafId, undefined, url);
  };

  // ── Render PDF page ──────────────────────────────────────────────────────────
  const renderPage = useCallback(async (doc: any, page: number, s: number) => {
    if (!pdfCanvasRef.current || !drawCanvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    try {
      const pdfPage = await doc.getPage(page);
      const viewport = pdfPage.getViewport({ scale: s });
      const pdfCanvas = pdfCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      drawCanvas.width = viewport.width;
      drawCanvas.height = viewport.height;
      const task = pdfPage.render({
        canvasContext: pdfCanvas.getContext("2d")!,
        viewport,
      });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pdfDoc, pageNum, scale);
  }, [pdfDoc, pageNum, scale, renderPage]);

  // ── Redraw canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    [...items, ...(currentItem ? [currentItem] : [])].forEach((item) =>
      drawItem(ctx, item),
    );
  }, [items, currentItem]);

  // ── Drawing event handlers ───────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): DrawPoint => {
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const scaleX = drawCanvasRef.current!.width / rect.width;
    const scaleY = drawCanvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "text") {
      const pos = getPos(e);
      setTextInput({ x: pos.x, y: pos.y, value: "" });
      return;
    }
    setDrawing(true);
    setCurrentItem({
      id: Date.now().toString(),
      tool,
      points: [getPos(e)],
      color,
      width: strokeWidth,
    });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentItem) return;
    const pos = getPos(e);
    const isShape = ["rect", "circle", "line", "triangle", "arrow"].includes(
      tool,
    );
    setCurrentItem((prev) =>
      prev
        ? {
            ...prev,
            points: isShape ? [prev.points[0], pos] : [...prev.points, pos],
          }
        : prev,
    );
  };

  const onMouseUp = () => {
    if (!drawing || !currentItem) return;
    setDrawing(false);
    if (currentItem.points.length > 0) pushState([...items, currentItem]);
    setCurrentItem(null);
  };

  const commitText = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    pushState([
      ...items,
      {
        id: Date.now().toString(),
        tool: "text",
        points: [{ x: textInput.x, y: textInput.y }],
        color,
        width: strokeWidth,
        text: textInput.value,
        fontSize: 14 + strokeWidth * 1.5,
      },
    ]);
    setTextInput(null);
  };

  const handleExport = () => {
    if (!pdfCanvasRef.current || !drawCanvasRef.current) return;
    const merged = document.createElement("canvas");
    merged.width = pdfCanvasRef.current.width;
    merged.height = pdfCanvasRef.current.height;
    const ctx = merged.getContext("2d")!;
    ctx.drawImage(pdfCanvasRef.current, 0, 0);
    ctx.drawImage(drawCanvasRef.current, 0, 0);
    const link = document.createElement("a");
    link.href = merged.toDataURL("image/png");
    link.download = `annotated_page_${pageNum}.png`;
    link.click();
  };

  // ── Multi-Crop Logic ───────────────────────────────────────────────────────
  const onCropPointerDown = (e: React.PointerEvent) => {
    if (!isCropMode || e.button !== 0) return;
    const rect = cropContainerRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const id = Date.now().toString();
    creatingCropIdRef.current = id;
    creationStartPosRef.current = { x, y };

    const newCrop = { id, x, y, w: 0, h: 0 };
    setCrops(p => [...p, newCrop]);
    setActiveCropId(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCropPointerMove = (e: React.PointerEvent) => {
    if (!creatingCropIdRef.current) return;
    const rect = cropContainerRef.current!.getBoundingClientRect();
    const curX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const curY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const start = creationStartPosRef.current;
    const x = Math.min(start.x, curX);
    const y = Math.min(start.y, curY);
    const w = Math.abs(curX - start.x);
    const h = Math.abs(curY - start.y);

    setCrops(prev => prev.map(c => 
      c.id === creatingCropIdRef.current ? { ...c, x, y, w, h } : c
    ));
  };

  const onCropPointerUp = (e: React.PointerEvent) => {
    if (creatingCropIdRef.current) {
      setCrops(prev => prev.filter(c => 
        c.id !== creatingCropIdRef.current || (c.w > 0.005 && c.h > 0.005)
      ));
      creatingCropIdRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };
  
  const onAnswerCropPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = cropContainerRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    creationStartPosRef.current = { x, y };
    setAnswerCrop({ id: 'ans', x, y, w: 0, h: 0 });
    creatingAnswerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onAnswerCropPointerMove = (e: React.PointerEvent) => {
    if (!creatingAnswerRef.current || !answerCrop) return;
    const rect = cropContainerRef.current!.getBoundingClientRect();
    const curX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const curY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const start = creationStartPosRef.current;
    setAnswerCrop({ 
      id: 'ans',
      x: Math.min(start.x, curX), y: Math.min(start.y, curY), 
      w: Math.abs(curX - start.x), h: Math.abs(curY - start.y) 
    });
  };

  const onAnswerCropPointerUp = async (e: React.PointerEvent) => {
    if (creatingAnswerRef.current) {
      creatingAnswerRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      if (answerCrop && (answerCrop.w < 0.01 || answerCrop.h < 0.01)) {
        setAnswerCrop(null);
      }
    }
  };

  const confirmAnswerCrop = async () => {
    if (!answerCrop || answerCrop.w < 0.01 || answerCrop.h < 0.01) {
      setAnswerCrop(null);
      setCapturingAnswerFor(null);
      return;
    }
    if (!pdfCanvasRef.current || !capturingAnswerFor) return;
    const srcCanvas = pdfCanvasRef.current;
    const temp = document.createElement('canvas');
    const cw = answerCrop.w * srcCanvas.width, ch = answerCrop.h * srcCanvas.height;
    temp.width = cw; temp.height = ch;
    temp.getContext('2d')!.drawImage(srcCanvas, answerCrop.x * srcCanvas.width, answerCrop.y * srcCanvas.height, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise<Blob>((res) => temp.toBlob(b => res(b!), 'image/jpeg', 0.7));
    const imageUrl = URL.createObjectURL(blob);
    setPendingCrops(prev => prev.map(c => c.id === capturingAnswerFor ? { ...c, answerImageBlob: blob, answerImageUrl: imageUrl } : c));
    setCapturingAnswerFor(null);
    setAnswerCrop(null);
  };

  const prepareCropsForEditing = async (targetSourceId: string) => {
    if (!pdfCanvasRef.current || crops.length === 0) return;
    setIsSavingCrops(true);
    const sourceCanvas = pdfCanvasRef.current;
    const prepared: any[] = [];

    for (const crop of crops) {
      const temp = document.createElement('canvas');
      const cw = crop.w * sourceCanvas.width;
      const ch = crop.h * sourceCanvas.height;
      temp.width = cw;
      temp.height = ch;
      const ctx = temp.getContext('2d')!;
      ctx.drawImage(sourceCanvas, crop.x * sourceCanvas.width, crop.y * sourceCanvas.height, cw, ch, 0, 0, cw, ch);
      
      const blob = await new Promise<Blob>((res) => temp.toBlob(b => res(b!), 'image/jpeg', 0.7));
      prepared.push({
        id: crop.id,
        imageBlob: blob,
        imageUrl: URL.createObjectURL(blob),
        name: `Crop ${crop.id.slice(-2)}`,
        answerText: "",
        answerUrl: "",
        description: "",
        isCorrect: undefined
      });
    }

    setPendingCrops(prepared);
    setSelectedSourceId(targetSourceId);
    setShowSourcePicker(false);
    setIsSavingCrops(false);
  };

  const handleImportAll = async (finalData: any[]) => {
    if (!selectedSourceId) return;
    setIsSavingCrops(true);
    
    const newQuestions: SavedQuestion[] = [];
    for (const item of finalData) {
      const mediaKey = `q_crop_${Date.now()}_${item.id}`;
      await writeMedia(mediaKey, item.imageBlob);
      
      let ansMediaKey = undefined;
      if (item.answerImageBlob) {
        ansMediaKey = `a_crop_${Date.now()}_${item.id}`;
        await writeMedia(ansMediaKey, item.answerImageBlob);
      }

      newQuestions.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: item.name,
        questionImageKey: mediaKey,
        answerText: item.answerText || undefined,
        answerImageKey: ansMediaKey || undefined,
        answerUrl: item.answerUrl || undefined,
        description: item.description || undefined,
        isCorrect: item.isCorrect,
        createdAt: Date.now()
      });
    }

    let prevQuestions: Record<string, SavedQuestion[]> = {};
    try {
      const str = localStorage.getItem("jee_saves_questions_v1");
      if (str) prevQuestions = JSON.parse(str);
    } catch (e) {}

    const updated = {
      ...prevQuestions,
      [selectedSourceId]: [...(prevQuestions[selectedSourceId] || []), ...newQuestions]
    };
    localStorage.setItem("jee_saves_questions_v1", JSON.stringify(updated));

    setIsSavingCrops(false);
    setPendingCrops([]);
    setSelectedSourceId(null);
    setIsCropMode(false);
    setCrops([]);
  };

  // Handle escape to exit crop mode
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCropMode(false);
        setCrops([]);
        setCapturingAnswerFor(null);
        setAnswerCrop(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  // ── Sections management ──────────────────────────────────────────────────────
  const addSection = () => {
    const id = Date.now().toString();
    setSections((prev) => [
      ...prev,
      { id, name: "New Section", expanded: true, subsections: [] },
    ]);
    setRenamingId(id);
    setRenameVal("New Section");
  };

  const addSubsection = (sectionId: string) => {
    const id = Date.now().toString();
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
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

  const addSubSubsection = (sectionId: string, subId: string) => {
    const id = Date.now().toString();
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      subsubsections: [
                        ...sub.subsubsections,
                        { id, name: "New Sub-subsection" },
                      ],
                    }
                  : sub,
              ),
            }
          : s,
      ),
    );
    setRenamingId(id);
    setRenameVal("New Sub-subsection");
  };

  const deleteSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));

  const deleteSubsection = (sectionId: string, subId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subsections: s.subsections.filter((sub) => sub.id !== subId),
            }
          : s,
      ),
    );
    if (activeLeafId === subId) {
      setPdfDoc(null);
      setActiveLeafId(null);
    }
  };

  const deleteSubSubsection = (
    sectionId: string,
    subId: string,
    subSubId: string,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      subsubsections: sub.subsubsections.filter(
                        (ss) => ss.id !== subSubId,
                      ),
                    }
                  : sub,
              ),
            }
          : s,
      ),
    );
    if (activeLeafId === subSubId) {
      setPdfDoc(null);
      setActiveLeafId(null);
    }
  };

  const toggleSection = (id: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)),
    );

  const toggleSubsection = (sectionId: string, subId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subId ? { ...sub, expanded: !sub.expanded } : sub,
              ),
            }
          : s,
      ),
    );

  const commitRename = () => {
    if (!renamingId || !renameVal.trim()) {
      setRenamingId(null);
      return;
    }
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === renamingId) return { ...s, name: renameVal.trim() };
        return {
          ...s,
          subsections: s.subsections.map((sub) => {
            if (sub.id === renamingId)
              return { ...sub, name: renameVal.trim() };
            return {
              ...sub,
              subsubsections: sub.subsubsections.map((ss) =>
                ss.id === renamingId ? { ...ss, name: renameVal.trim() } : ss,
              ),
            };
          }),
        };
      }),
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

  const cursorStyle =
    tool === "eraser"
      ? "cell"
      : tool === "text"
        ? "text"
        : tool === "select"
          ? "default"
          : "crosshair";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full overflow-hidden bg-background"
    >
      {/* ── Sections sidebar ── */}
      <div
        className={cn(
          "w-full md:w-56 shrink-0 border-r border-border flex-col bg-sidebar overflow-hidden",
          showMobileSidebar
            ? "flex fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl md:relative md:z-auto md:bg-sidebar"
            : "hidden md:flex",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Sections
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={addSection}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="New section"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Reorder.Group as="div" axis="y" values={sections} onReorder={setSections} className="flex-1 overflow-y-auto py-1 space-y-0.5">
          {sections.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                No sections yet
              </p>
              <button
                onClick={addSection}
                className="text-xs text-primary hover:underline"
              >
                + Create section
              </button>
            </div>
          )}

          {sections.map((sec) => (
            <Reorder.Item as="div" key={sec.id} value={sec}>
              {/* ── Section row (level 1) ── */}
              <div 
                className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors ${activeItemId === sec.id ? "bg-muted" : "hover:bg-muted/50"}`}
                onClick={() => setActiveItemId(sec.id)}
              >
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {sec.expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevRight className="h-3 w-3" />
                  )}
                </button>
                {renamingId === sec.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => e.key === "Enter" && commitRename()}
                    className="flex-1 text-xs bg-background border border-primary/50 rounded px-1 py-0.5 text-foreground outline-none min-w-0"
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

              {/* ── Subsections (level 2) ── */}
              {sec.expanded && (
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <Reorder.Group as="div" axis="y" values={sec.subsections} onReorder={(newSubs) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, subsections: newSubs } : s))} className="space-y-0.5 mt-0.5">
                    {sec.subsections.map((sub) => (
                      <Reorder.Item as="div" key={sub.id} value={sub}>
                    <div
                      className={`group flex items-center gap-1 pl-5 pr-2 py-1.5 cursor-pointer transition-colors
                      ${activeLeafId === sub.id && !sub.subsubsections.length ? "bg-primary/15 border-l-2 border-primary" : (activeItemId === sub.id ? "bg-muted/70" : "hover:bg-muted/50")}`}
                      onClick={async () => {
                        setActiveItemId(sub.id);
                        if (sub.fileType === "image" && sub.imageKey) {
                          const buf = await readMediaAsArrayBuffer(sub.imageKey);
                          if (buf) {
                            const blob = new Blob([buf]);
                            if (activeImageUrl)
                              URL.revokeObjectURL(activeImageUrl);
                            setActiveImageUrl(URL.createObjectURL(blob));
                            setPdfDoc(null);
                            setActiveLeafId(sub.id);
                          }
                        } else if (sub.pdfKey || sub.pdfUrl) {
                          setActiveImageUrl(null);
                          loadLeafPdf(sub.id, sub.pdfKey, sub.pdfUrl);
                        } else {
                          setActiveLeafId(sub.id);
                        }
                        setShowMobileSidebar(false);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubsection(sec.id, sub.id);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {sub.subsubsections.length > 0 ? (
                          sub.expanded ? (
                            <ChevronDown className="h-2.5 w-2.5" />
                          ) : (
                            <ChevRight className="h-2.5 w-2.5" />
                          )
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </button>

                      {renamingId === sub.id ? (
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-xs bg-background border border-primary/50 rounded px-1 py-0.5 text-foreground outline-none min-w-0"
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs truncate font-medium ${activeLeafId === sub.id ? "text-primary" : "text-foreground"}`}
                          >
                            {sub.name}
                          </p>
                          {(sub.pdfName || sub.imageName) && (
                            <p className="text-[9px] text-muted-foreground truncate">
                              {sub.fileType === "image" ? "🖼 " : ""}
                              {sub.imageName || sub.pdfName}
                            </p>
                          )}
                        </div>
                      )}

                      <ThreeDotMenu>
                        <MenuItem icon={Upload} label="Upload / Add" onClick={(e: any) => { e.stopPropagation(); setUploadTarget({ sectionId: sec.id, subId: sub.id }); }} />
                        <MenuItem icon={FilePlus} label="Add Sub-subsection" shortcut="N" onClick={(e: any) => { e.stopPropagation(); addSubSubsection(sec.id, sub.id); }} />
                        <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setRenamingId(sub.id); setRenameVal(sub.name); }} />
                        <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deleteSubsection(sec.id, sub.id); }} />
                      </ThreeDotMenu>
                    </div>

                    {/* ── Sub-subsections (level 3) ── */}
                    {sub.expanded && (
                      <div onPointerDown={(e) => e.stopPropagation()}>
                        <Reorder.Group as="div" axis="y" values={sub.subsubsections} onReorder={(newSubSubs) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, subsections: s.subsections.map(su => su.id === sub.id ? { ...su, subsubsections: newSubSubs } : su) } : s))} className="space-y-0.5 mt-0.5">
                          {sub.subsubsections.map((ssub) => (
                            <Reorder.Item as="div" key={ssub.id} value={ssub}>
                              <div
                          key={ssub.id}
                          className={`group flex items-center gap-1 pl-9 pr-2 py-1.5 cursor-pointer transition-colors
                        ${activeLeafId === ssub.id ? "bg-primary/15 border-l-2 border-primary" : (activeItemId === ssub.id ? "bg-muted/70" : "hover:bg-muted/50")}`}
                          onClick={async () => {
                            setActiveItemId(ssub.id);
                            if (ssub.fileType === "image" && ssub.imageKey) {
                              const buf = await readMediaAsArrayBuffer(ssub.imageKey);
                              if (buf) {
                                const blob = new Blob([buf]);
                                if (activeImageUrl)
                                  URL.revokeObjectURL(activeImageUrl);
                                setActiveImageUrl(URL.createObjectURL(blob));
                                setPdfDoc(null);
                                setActiveLeafId(ssub.id);
                              }
                            } else {
                              setActiveImageUrl(null);
                              loadLeafPdf(ssub.id, ssub.pdfKey, ssub.pdfUrl);
                            }
                            setShowMobileSidebar(false);
                          }}
                        >
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />

                          {renamingId === ssub.id ? (
                            <input
                              autoFocus
                              value={renameVal}
                              onChange={(e) => setRenameVal(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) =>
                                e.key === "Enter" && commitRename()
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-xs bg-background border border-primary/50 rounded px-1 py-0.5 text-foreground outline-none min-w-0"
                            />
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[11px] truncate ${activeLeafId === ssub.id ? "text-primary font-medium" : "text-muted-foreground"}`}
                              >
                                {ssub.name}
                              </p>
                              {(ssub.pdfName || ssub.imageName) && (
                                <p className="text-[9px] text-muted-foreground/70 truncate">
                                  {ssub.fileType === "image" ? "🖼 " : ""}
                                  {ssub.imageName || ssub.pdfName}
                                </p>
                              )}
                            </div>
                          )}

                          <ThreeDotMenu>
                            <MenuItem icon={Upload} label="Upload / Add" onClick={(e: any) => { e.stopPropagation(); setUploadTarget({ sectionId: sec.id, subId: sub.id, subSubId: ssub.id }); }} />
                            <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={(e: any) => { e.stopPropagation(); setRenamingId(ssub.id); setRenameVal(ssub.name); }} />
                            <MenuItem icon={Trash2} label="Delete" shortcut="Del" destructive onClick={(e: any) => { e.stopPropagation(); deleteSubSubsection(sec.id, sub.id, ssub.id); }} />
                          </ThreeDotMenu>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    )}

                    {/* Add sub-subsection shortcut */}
                    {sub.expanded && (
                      <button
                        onClick={() => addSubSubsection(sec.id, sub.id)}
                        className="flex items-center gap-1 pl-9 pr-2 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
                      >
                        <FilePlus className="h-2.5 w-2.5" />+ Add sub-subsection
                      </button>
                    )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}

              {/* Add subsection shortcut */}
              {sec.expanded && (
                <button
                  onClick={() => addSubsection(sec.id)}
                  className="flex items-center gap-1 pl-5 pr-2 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
                >
                  <FilePlus className="h-2.5 w-2.5" />+ Add subsection
                </button>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* ── PDF viewer area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden flex items-center px-3 py-2 bg-card border-b border-border shrink-0">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <FolderPlus className="h-4 w-4 text-primary" /> Open Library
          </button>
        </div>
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const buf = await file.arrayBuffer();
            await loadPdfFromBuffer(buf);
            e.target.value = "";
          }}
        />
        <input
          ref={sectionFileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleSectionFileUpload}
        />
        <input
          ref={sectionImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSectionImageUpload}
        />

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 gap-1.5 text-xs shrink-0 transition-all", isCropMode ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary/10")}
            onClick={() => { setIsCropMode(!isCropMode); setCrops([]); }}
            disabled={!pdfDoc}
          >
            <Scissors className="h-3 w-3" />
            {isCropMode ? "Exit Crop" : "Add Ques to Saves"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            {activeLeafId ? "Preview" : "Open PDF"}
          </Button>

          {pdfDoc && (
            <>
              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  disabled={pageNum <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-1 min-w-[48px] text-center">
                  {pageNum}/{numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
                  disabled={pageNum >= numPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.max(0.3, s - 0.2))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.min(4, s + 0.2))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-0.5 flex-wrap shrink-0">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    title={t.label}
                    onClick={() => setTool(t.id)}
                    className={`h-7 w-7 flex items-center justify-center rounded transition-all
                      ${tool === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-border shrink-0" />
              <div
                className="flex items-center gap-0.5 flex-wrap"
                style={{ maxWidth: 160 }}
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-4 h-4 rounded-full transition-all flex-shrink-0 ${color === c ? "ring-2 ring-primary ring-offset-1 scale-125" : "hover:scale-110"}`}
                    style={{
                      backgroundColor: c,
                      border:
                        c === "#FFFFFF"
                          ? "1px solid hsl(var(--border))"
                          : "none",
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">Size</span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-20 accent-primary h-1.5"
                />
                <span className="text-[10px] text-muted-foreground w-5 tabular-nums">
                  {strokeWidth}
                </span>
              </div>

              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={undo}
                  disabled={undoIdx === 0}
                  title="Undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={redo}
                  disabled={undoIdx >= undoStack.length - 1}
                  title="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => pushState([])}
                  title="Clear"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleExport}
                  title="Export"
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>

              {isCropMode && crops.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                   <span className="text-[10px] font-bold text-primary animate-pulse">{crops.length} Selected</span>
                   <Button size="sm" className="h-7 px-3 text-[10px] font-bold gap-1.5" onClick={() => setShowSourcePicker(true)}>
                      <Save className="h-3 w-3" /> Save to Library
                   </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Canvas area ── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6">
          {activeImageUrl ? (
            /* ── Image viewer with annotation canvas overlay ── */
            <div
              className="relative shadow-2xl"
              style={{ cursor: cursorStyle }}
            >
              <img
                src={activeImageUrl}
                alt="Uploaded"
                className="block max-w-full"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (drawCanvasRef.current) {
                    drawCanvasRef.current.width = img.naturalWidth;
                    drawCanvasRef.current.height = img.naturalHeight;
                    drawCanvasRef.current.style.width = `${img.offsetWidth}px`;
                    drawCanvasRef.current.style.height = `${img.offsetHeight}px`;
                  }
                }}
                style={{ display: "block" }}
              />
              <canvas
                ref={drawCanvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              />
            </div>
          ) : !pdfDoc ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] w-full max-w-md mt-10 text-center">
              {activeLeafId ? (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-14 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all w-full"
                  onClick={() => {
                    const leaf = findLeaf(activeLeafId);
                    if (leaf) {
                      if (leaf.type === "sub") {
                        setUploadTarget({
                          sectionId: leaf.sectionId,
                          subId: leaf.subId,
                        });
                      } else {
                        setUploadTarget({
                          sectionId: leaf.sectionId,
                          subId: leaf.subId,
                          subSubId: leaf.subSubId,
                        });
                      }
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Load PDF or Image for this item
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to upload a file or enter a URL
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-2xl p-14 w-full">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Select an item to view its PDF or image
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create sections → subsections → sub-subsections in the left
                    panel, then load PDFs or images.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Or use{" "}
                    <span className="text-primary font-medium">"Open PDF"</span>{" "}
                    in the toolbar to preview any PDF directly.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="relative shadow-2xl"
              style={{ cursor: cursorStyle }}
              ref={cropContainerRef}
            >
              <canvas ref={pdfCanvasRef} className="block" />
              <canvas
                ref={drawCanvasRef}
                className="absolute inset-0"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              />
              
              {/* Multi-Crop Interface Layer */}
              {isCropMode && (
                <div 
                  className="absolute inset-0 z-40 bg-black/20 cursor-crosshair touch-none"
                  onPointerDown={onCropPointerDown}
                  onPointerMove={onCropPointerMove}
                  onPointerUp={onCropPointerUp}
                >
                  {crops.map(c => (
                    <CropBox key={c.id} crop={c} active={activeCropId === c.id} containerRef={cropContainerRef} onUpdate={(u) => setCrops(prev => prev.map(item => item.id === c.id ? {...item, ...u} : item))} onDelete={() => setCrops(p => p.filter(x => x.id !== c.id))} />
                  ))}
                </div>
              )}
              
              {/* Answer Capture Interface Layer */}
              {capturingAnswerFor && (
                <div 
                  className="absolute inset-0 z-40 bg-black/20 cursor-crosshair touch-none"
                  onPointerDown={onAnswerCropPointerDown}
                  onPointerMove={onAnswerCropPointerMove}
                  onPointerUp={onAnswerCropPointerUp}
                >
                  {answerCrop && (
                    <CropBox 
                      crop={answerCrop} 
                      active={true} 
                      containerRef={cropContainerRef} 
                      label="Answer Crop"
                      onUpdate={(u) => setAnswerCrop(prev => prev ? { ...prev, ...u } : prev)} 
                      onDelete={() => setAnswerCrop(null)} 
                      onConfirm={confirmAnswerCrop}
                    />
                  )}
                </div>
              )}

              {textInput && (
                <div
                  className="absolute"
                  style={{
                    left: `${(textInput.x / (drawCanvasRef.current?.width || 1)) * 100}%`,
                    top: `${(textInput.y / (drawCanvasRef.current?.height || 1)) * 100}%`,
                  }}
                >
                  <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-lg">
                    <input
                      autoFocus
                      value={textInput.value}
                      onChange={(e) =>
                        setTextInput((prev) =>
                          prev ? { ...prev, value: e.target.value } : prev,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitText();
                        if (e.key === "Escape") setTextInput(null);
                      }}
                      className="bg-transparent text-foreground outline-none text-sm px-1 min-w-[100px]"
                      placeholder="Type here…"
                      style={{ color, fontSize: 13 + strokeWidth * 1.2 }}
                    />
                    <button
                      onClick={commitText}
                      className="p-1 hover:text-green-500 text-muted-foreground transition-colors"
                    >
                      <span className="text-xs">✓</span>
                    </button>
                    <button
                      onClick={() => setTextInput(null)}
                      className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload / URL modal ── */}
      <AnimatePresence>
        {uploadTarget && (
          <UploadModal
            onFile={() => sectionFileInputRef.current?.click()}
            onImage={() => sectionImageInputRef.current?.click()}
            onUrl={handleUrlLoad}
            onClose={() => setUploadTarget(null)}
          />
        )}
      </AnimatePresence>
      
      {capturingAnswerFor && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-3">
           <span>Draw and adjust the answer crop, then click ✓</span>
           <button onClick={() => { setCapturingAnswerFor(null); setAnswerCrop(null); }} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="h-4 w-4"/></button>
        </div>
      )}

      <AnimatePresence>
        {showSourcePicker && (
          <SourcePicker onConfirm={prepareCropsForEditing} onClose={() => setShowSourcePicker(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingCrops.length > 0 && !capturingAnswerFor && (
          <MultiCropEditor 
            crops={pendingCrops} 
            onSave={() => handleImportAll(pendingCrops)} 
            onClose={() => setPendingCrops([])} 
            onUpdateCrop={(id, up) => setPendingCrops(p => p.map(c => c.id === id ? { ...c, ...up } : c))}
            onCaptureAnswer={(id) => setCapturingAnswerFor(id)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}
