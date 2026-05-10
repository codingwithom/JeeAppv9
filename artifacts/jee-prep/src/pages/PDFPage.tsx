import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { idbSet, idbGet } from "@/lib/idb";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
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
    </motion.div>
  );
}
