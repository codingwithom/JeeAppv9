import { createPortal } from "react-dom";
import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, X, FolderPlus, FilePlus, ChevronDown, ChevronRight as ChevRight, Pencil, Trash2,
  Clock, Filter, Eye, EyeOff, Save, Image as ImageIcon, Check, Link as LinkIcon, Upload, MoreVertical, Loader2,
  BookCopy, Bookmark, Bot, HelpCircle,
  ChevronLeft, Minus, ZoomIn, ZoomOut, CheckCircle, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
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
  correctCount?: number;
  wrongCount?: number;
  interval?: number;     // Spaced Repetition (Days)
  easeFactor?: number;   // SM-2 Ease Factor
  nextReview?: number;   // Timestamp for next review
  createdAt: number;
}

interface QuestionSource {
  id: string;
  name: string;
}

interface QuestionChapter {
  id: string;
  name: string;
  expanded: boolean;
  sources: QuestionSource[];
}

interface QuestionSubject {
  id:string;
  name: string;
  expanded: boolean;
  chapters: QuestionChapter[];
}

interface BookmarkFolder {
  id: string;
  name: string;
  bookmarks: { sourceId: string; questionId: string }[];
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
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ duration: 0.1 }} className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-md shadow-xl z-[300] py-1 flex flex-col">
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


// --- Question Editor Modal ---
function QuestionEditorModal({
  sourceId,
  initialData,
  onClose,
  onSave,
}: {
  sourceId: string;
  initialData?: SavedQuestion;
  onClose: () => void;
  onSave: (sourceId: string, question: Partial<SavedQuestion>) => Promise<void>;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [answerText, setAnswerText] = useState(initialData?.answerText || "");
  const [questionUrl, setQuestionUrl] = useState(initialData?.questionUrl || "");
  const [answerUrl, setAnswerUrl] = useState(initialData?.answerUrl || "");
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(initialData?.isCorrect);
  
  const [qImageFile, setQImageFile] = useState<File | null>(null);
  const [aImageFile, setAImageFile] = useState<File | null>(null);
  const qFileRef = useRef<HTMLInputElement>(null);
  const aFileRef = useRef<HTMLInputElement>(null);
  const [qPreview, setQPreview] = useState<string | null>(null);
  const [aPreview, setAPreview] = useState<string | null>(null);

  const { writeMedia, readMediaAsBlob } = useWorkspaceContext();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (qImageFile) {
      const url = URL.createObjectURL(qImageFile);
      setQPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    else if (initialData?.questionImageKey) {
      let active = true;
      readMediaAsBlob(initialData.questionImageKey).then(blob => {
        if (blob && active) setQPreview(URL.createObjectURL(blob));
      });
      return () => { active = false; };
    } else {
      setQPreview(null);
      return () => {};
    }
  }, [qImageFile, initialData?.questionImageKey, readMediaAsBlob]);

  useEffect(() => {
    if (aImageFile) {
      const url = URL.createObjectURL(aImageFile);
      setAPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    else if (initialData?.answerImageKey) {
      let active = true;
      readMediaAsBlob(initialData.answerImageKey).then(blob => {
        if (blob && active) setAPreview(URL.createObjectURL(blob));
      });
      return () => { active = false; };
    } else {
      setAPreview(null);
      return () => {};
    }
  }, [aImageFile, initialData?.answerImageKey, readMediaAsBlob]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    let qKey = initialData?.questionImageKey;
    let aKey = initialData?.answerImageKey;
    
    if (qImageFile) {
      qKey = `q_img_${Date.now()}`;
      await writeMedia(qKey, qImageFile);
    } else if (qPreview === null) {
      qKey = undefined;
    }
    
    if (aImageFile) {
      aKey = `a_img_${Date.now()}`;
      await writeMedia(aKey, aImageFile);
    } else if (aPreview === null) {
      aKey = undefined;
    }

    await onSave(sourceId, {
      ...(initialData ? { id: initialData.id } : {}),
      name: name.trim(),
      description: description.trim() || undefined,
      answerText: answerText.trim() || undefined,
      questionUrl: questionUrl.trim() || undefined,
      answerUrl: answerUrl.trim() || undefined,
      questionImageKey: qKey,
      answerImageKey: aKey,
      isCorrect,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FilePlus className="h-4 w-4 text-primary" /> {initialData ? "Edit Question" : "New Question"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Question Name/Number</p>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q12 or JEE Main 2024" className="h-9 text-xs" />
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Question Image / URL</p>
            
            {/* Image Preview / Fetch Area */}
            <div className="relative group aspect-video rounded-xl bg-muted/30 border-2 border-dashed border-border flex items-center justify-center overflow-hidden mb-2">
              {(qPreview || questionUrl) ? (
                <>
                  <img src={qPreview || questionUrl} className="w-full h-full object-contain" alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <button onClick={() => { setQPreview(null); setQuestionUrl(""); setQImageFile(null); }} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4"/></button>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-[10px] text-muted-foreground/40">URL auto-fetch / File drop</p>
                </div>
              )}
              {!(qPreview || questionUrl) && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <p className="text-white text-[10px] font-medium">Auto-fetching from Source</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input value={questionUrl} onChange={e => { setQuestionUrl(e.target.value); if (qImageFile) setQImageFile(null); }} placeholder="Enter question URL" className="flex-1 h-8 text-xs" />
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => qFileRef.current?.click()}>
                <Upload className="h-4 w-4" />
              </Button>
              <input ref={qFileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setQImageFile(e.target.files[0]); setQuestionUrl(""); } }} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Answer Details</p>
            <textarea value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="Plain text answer / steps..." rows={3} className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

            <div className="space-y-2">
               <div className="flex gap-2">
                  <Input value={answerUrl} onChange={e => { setAnswerUrl(e.target.value); if (aImageFile) setAImageFile(null); }} placeholder="Answer image URL" className="flex-1 h-8 text-xs" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => aFileRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <input ref={aFileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setAImageFile(e.target.files[0]); setAnswerUrl(""); } }} />
               </div>
               {(aPreview || answerUrl) && (
                 <div className="h-20 rounded-lg bg-muted/50 border border-border overflow-hidden relative group">
                    <img src={aPreview || answerUrl} className="w-full h-full object-contain" alt="" />
                    <button onClick={() => { setAPreview(null); setAnswerUrl(""); setAImageFile(null); }} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></button>
                 </div>
               )}
            </div>
          </div>

          <div className="pt-2 space-y-4">
             <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Option Status</p>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setIsCorrect(true)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all",
                      isCorrect === true ? "bg-green-500/10 border-green-500 text-green-500" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                   >
                     <Check className="h-3.5 w-3.5" /> Correct
                   </button>
                   <button 
                    onClick={() => setIsCorrect(false)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all",
                      isCorrect === false ? "bg-red-500/10 border-red-500 text-red-500" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                   >
                     <X className="h-3.5 w-3.5" /> Incorrect
                   </button>
                </div>
             </div>

             <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</p>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add description..." rows={2} className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/20 shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="flex-1 text-xs font-bold" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : (initialData ? "Save Changes" : "Add Question")}
            </Button>
          </div>
        </div>
    </div>
  );
}

// --- Bookmark Select Modal ---
function BookmarkSelectModal({
  sourceId,
  questionId,
  bookmarkFolders,
  setBookmarkFolders,
  onClose
}: {
  sourceId: string;
  questionId: string;
  bookmarkFolders: BookmarkFolder[];
  setBookmarkFolders: (val: BookmarkFolder[]) => void;
  onClose: () => void;
}) {
  const [newFolderName, setNewFolderName] = useState("");

  const toggleBookmark = (folderId: string) => {
    setBookmarkFolders(bookmarkFolders.map(f => {
      if (f.id === folderId) {
        const exists = f.bookmarks.some(b => b.sourceId === sourceId && b.questionId === questionId);
        if (exists) {
          return { ...f, bookmarks: f.bookmarks.filter(b => !(b.sourceId === sourceId && b.questionId === questionId)) };
        } else {
          return { ...f, bookmarks: [...f.bookmarks, { sourceId, questionId }] };
        }
      }
      return f;
    }));
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: BookmarkFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      bookmarks: [{ sourceId, questionId }]
    };
    setBookmarkFolders([...bookmarkFolders, newFolder]);
    setNewFolderName("");
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-4 flex flex-col max-h-[80vh]"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm">Save to Bookmark Folder</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 mb-4 min-h-[100px]">
          {bookmarkFolders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No folders yet.</p>
          ) : (
            bookmarkFolders.map(f => {
              const isSaved = f.bookmarks.some(b => b.sourceId === sourceId && b.questionId === questionId);
              return (
                <div key={f.id} onClick={() => toggleBookmark(f.id)} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors">
                  <span className="text-sm font-medium">{f.name}</span>
                  {isSaved && <Check className="h-4 w-4 text-yellow-500" />}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <Input placeholder="New folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} className="h-8 text-xs" />
          <Button size="sm" className="h-8 shrink-0" onClick={createFolder} disabled={!newFolderName.trim()}>Create & Save</Button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Image Helper ---
function WorkspaceImage({ mediaKey, fallbackUrl, className }: { mediaKey?: string, fallbackUrl?: string, className?: string }) {
  const { readMediaAsBlob } = useWorkspaceContext();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mediaKey) {
      readMediaAsBlob(mediaKey).then(blob => {
        if (blob) setUrl(URL.createObjectURL(blob));
      });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [mediaKey, readMediaAsBlob]);

  const finalUrl = url || fallbackUrl;
  if (!finalUrl) return null;
  return <img src={finalUrl} className={className} alt="" loading="lazy" />;
}

let tesseractPromise: Promise<any> | null = null;
const loadTesseract = (): Promise<any> => {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    if ((window as any).Tesseract) {
      resolve((window as any).Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve((window as any).Tesseract);
    script.onerror = () => {
      tesseractPromise = null;
      reject(new Error('Failed to load Tesseract.js'));
    };
    document.body.appendChild(script);
  });
  return tesseractPromise;
};

function ZoomableImage({ src }: { src: string }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 2 && e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    setStartPos({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPos({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    const delta = e.deltaY * -0.005;
    const newScale = Math.min(Math.max(0.5, scale + delta), 5);
    
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;

    const newX = cursorX + (pos.x - cursorX) * (newScale / scale);
    const newY = cursorY + (pos.y - cursorY) * (newScale / scale);

    setScale(newScale);
    setPos({ x: newX, y: newY });
  };

  const handleExtractText = async () => {
    if (!imgRef.current) return;
    setIsExtracting(true);
    setExtracted(false);
    try {
      const Tesseract = await loadTesseract();
      
      // Passing the src directly avoids Canvas Taint / CORS errors
      const result = await Tesseract.recognize(src, 'eng');
      const text = result.data.text.trim();
      
      if (text) {
        // Fallback for HTTP environments where navigator.clipboard is disabled
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          try { document.execCommand("copy"); } catch (e) {}
          textArea.remove();
        }
        setExtracted(true);
        setTimeout(() => setExtracted(false), 2000);
      } else {
        alert("No text found in this image.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Failed to extract text from image. If it's from an external URL, CORS restrictions might block it.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden bg-muted/30 border border-border rounded-lg touch-none flex-1 min-h-0" onWheel={onWheel} onContextMenu={e => e.preventDefault()}>
       <div className="absolute right-2 top-2 z-10 flex flex-col gap-2 bg-black/50 p-1 rounded-md">
         <button onClick={handleExtractText} title="Extract & Copy Text (OCR)" className="p-1 text-white hover:bg-white/20 rounded transition-colors flex items-center justify-center">
           {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : extracted ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
         </button>
         <button onClick={() => setScale(s => Math.min(s + 0.2, 5))} className="p-1 text-white hover:bg-white/20 rounded transition-colors"><ZoomIn className="h-4 w-4"/></button>
         <button onClick={() => { setScale(1); setPos({x:0, y:0}); }} className="p-1 text-white hover:bg-white/20 rounded text-[10px] font-bold font-mono text-center transition-colors">1x</button>
         <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-1 text-white hover:bg-white/20 rounded transition-colors"><ZoomOut className="h-4 w-4"/></button>
       </div>
       <div className="w-full h-full flex items-center justify-center overflow-hidden">
         <img 
            ref={imgRef}
            src={src} 
            alt="Viewer" 
            className="max-w-full max-h-full object-contain transition-transform select-none" 
            crossOrigin="anonymous"
            style={{ 
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, 
              cursor: dragging ? 'grabbing' : 'grab'
            }} 
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            draggable={false}
         />
       </div>
    </div>
  );
}

function ZoomableWorkspaceImage({ mediaKey, fallbackUrl }: { mediaKey?: string, fallbackUrl?: string }) {
  const { readMediaAsBlob } = useWorkspaceContext();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mediaKey) {
      readMediaAsBlob(mediaKey).then(blob => {
        if (blob) setUrl(URL.createObjectURL(blob));
      });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [mediaKey, readMediaAsBlob]);

  const finalUrl = url || fallbackUrl;
  if (!finalUrl) return null;
  return <ZoomableImage src={finalUrl} />;
}

// --- Question Detail Modal ---
function QuestionDetailModal({ 
  question, 
  sourceId,
  type,
  onClose,
  isBookmarked,
  onBookmark
}: { 
  question: SavedQuestion;
  sourceId: string;
  type: 'question' | 'answer';
  onClose: () => void;
  isBookmarked: boolean;
  onBookmark: () => void;
}) {

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl flex flex-col w-full max-w-4xl shadow-2xl h-[95vh] md:h-[85vh] overflow-hidden"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {question.name} {type === 'answer' ? "- Answer" : ""}
              <button onClick={(e) => { e.stopPropagation(); onBookmark(); }} className="p-1 rounded-md transition-colors hover:bg-muted">
                <Bookmark className={cn("h-5 w-5", isBookmarked ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
              </button>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-muted hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {type === 'question' ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col space-y-2">
                <p className="text-xs text-muted-foreground shrink-0">Scroll to zoom, drag to pan (Right-click or Left-click)</p>
                <ZoomableWorkspaceImage mediaKey={question.questionImageKey} fallbackUrl={question.questionUrl} />
              </div>

              {question.description && (
                 <div className="shrink-0 space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><BookCopy className="h-4 w-4 text-primary" /> Description</h3>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                       {question.description}
                    </div>
                 </div>
              )}
            </>
          ) : (
            <>
              {question.answerText && (
                <div className="bg-muted/30 p-4 rounded-lg border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed shrink-0 max-h-40 overflow-y-auto">
                   {question.answerText}
                </div>
              )}
              {(question.answerImageKey || question.answerUrl) && (
                <div className="flex-1 min-h-0 flex flex-col space-y-2 pt-2">
                   <p className="text-xs text-muted-foreground shrink-0">Scroll to zoom, drag to pan</p>
                   <ZoomableWorkspaceImage mediaKey={question.answerImageKey} fallbackUrl={question.answerUrl} />
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Stopwatch Widget ---
function StopwatchWidget({ onClose }: { onClose: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [savedTimes, setSavedTimes] = useState<number[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const displayRef = useRef<HTMLSpanElement>(null);
  const currentElapsedRef = useRef<number>(0);

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const update = useCallback(() => {
    const now = performance.now();
    currentElapsedRef.current += (now - lastUpdateRef.current);
    if (displayRef.current) {
      displayRef.current.textContent = formatTime(currentElapsedRef.current);
    }
    lastUpdateRef.current = now;
    rafRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    if (isRunning) {
      lastUpdateRef.current = performance.now();
      rafRef.current = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, update]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 w-72 flex flex-col"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Stopwatch</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="text-center py-4">
        <span ref={displayRef} className="text-4xl font-black tabular-nums text-foreground">{formatTime(currentElapsedRef.current)}</span>
      </div>

      <div className="flex gap-2 mb-2">
        <Button size="sm" variant={isRunning ? "destructive" : "default"} className="flex-1 font-bold h-8 text-xs" onClick={() => { setIsRunning(!isRunning); }}>
          {isRunning ? "Stop" : (currentElapsedRef.current > 0 ? "Resume" : "Start")}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 font-bold h-8 text-xs" onClick={() => { if (currentElapsedRef.current > 0) setSavedTimes(prev => [currentElapsedRef.current, ...prev]); setIsRunning(false); }}>
          Save
        </Button>
        <Button size="sm" variant="outline" className="flex-1 font-bold h-8 text-xs" onClick={() => { setIsRunning(false); currentElapsedRef.current = 0; if (displayRef.current) displayRef.current.textContent = formatTime(0); setSavedTimes([]); }}>
          Reset
        </Button>
      </div>

      {savedTimes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border max-h-32 overflow-y-auto space-y-1 pr-1">
           {savedTimes.map((t, i) => (
             <div key={i} className="flex justify-between items-center text-xs px-2 py-1.5 bg-muted/50 rounded-md">
               <span className="text-muted-foreground font-semibold">Lap {savedTimes.length - i}</span>
               <span className="font-mono font-bold text-foreground">{formatTime(t)}</span>
             </div>
           ))}
        </div>
      )}
    </motion.div>
  );
}

// --- Main Component ---
export default function SavesPage() {
  const [subjects, setSubjects] = useLocalStorage<QuestionSubject[]>("jee_saves_subjects_v1", []);
  const [allQuestions, setAllQuestions] = useLocalStorage<Record<string, SavedQuestion[]>>("jee_saves_questions_v1", {});
  const [bookmarkFolders, setBookmarkFolders] = useLocalStorage<BookmarkFolder[]>("jee_saves_bookmarks_v1", []);
  const [isLoading, setIsLoading] = useState(false);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeBookmarkFolderId, setActiveBookmarkFolderId] = useState<string | null>(null);
  
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const [showSidebar, setShowSidebar] = useState(true);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{ sourceId: string; question: SavedQuestion } | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<{ type: 'question' | 'answer', question: SavedQuestion, sourceId: string } | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [bookmarkingQuestion, setBookmarkingQuestion] = useState<{ sourceId: string; questionId: string } | null>(null);
  const [newBookmarkFolderName, setNewBookmarkFolderName] = useState("");

  const [filterBy, setFilterBy] = useState<"date" | "name" | "number" | "solved" | "unsolved" | "review">("date");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { writeMedia, readMediaAsArrayBuffer } = useWorkspaceContext();

  useEffect(() => {
    if (isPrinting) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [isPrinting]);

  const getSourceName = (id: string) => {
    for (const sub of subjects) {
      for (const chap of sub.chapters) {
        const src = chap.sources.find(s => s.id === id);
        if (src) return `${sub.name} > ${chap.name} > ${src.name}`;
      }
    }
    return 'Export';
  };

  // --- Hierarchy Management ---
  const addSubject = useCallback(() => {
    const id = Date.now().toString();
    const newSubjects = [...subjects, { id, name: "New Subject", expanded: true, chapters: [] }];
    setSubjects(newSubjects);
    setRenamingId(id);
    setRenameVal("New Subject");
  }, [subjects]);

  const addChapter = useCallback((subjectId: string) => {
    const id = Date.now().toString();
    const newSubjects = subjects.map(s => s.id === subjectId ? { ...s, expanded: true, chapters: [...s.chapters, { id, name: "New Chapter", expanded: true, sources: [] }] } : s);
    setSubjects(newSubjects);
    setRenamingId(id);
    setRenameVal("New Chapter");
  }, [subjects]);

  const addSource = useCallback((subjectId: string, chapterId: string) => {
    const id = Date.now().toString();
    const newSubjects = subjects.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, expanded: true, sources: [...c.sources, { id, name: "New Source" }] } : c) } : s);
    setSubjects(newSubjects);
    setRenamingId(id);
    setRenameVal("New Source");
  }, [subjects]);

  const commitRename = () => {
    if (!renamingId || !renameVal.trim()) {
      setRenamingId(null);
      return;
    }
    const newSubjects = subjects.map(s => {
      if (s.id === renamingId) return { ...s, name: renameVal.trim() };
      return {
        ...s,
        chapters: s.chapters.map(c => {
          if (c.id === renamingId) return { ...c, name: renameVal.trim() };
          return {
            ...c,
            sources: c.sources.map(src => src.id === renamingId ? { ...src, name: renameVal.trim() } : src)
          };
        })
      };
    });
    setSubjects(newSubjects);
    setRenamingId(null);
  };

  const deleteSubject = useCallback((id: string) => {
    const newSubjects = subjects.filter(s => s.id !== id);
    setSubjects(newSubjects);
  }, [subjects]);

  const deleteChapter = useCallback((subjectId: string, chapterId: string) => {
    const newSubjects = subjects.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.filter(c => c.id !== chapterId) } : s);
    setSubjects(newSubjects);
  }, [subjects]);

  const deleteSource = useCallback((subjectId: string, chapterId: string, sourceId: string) => {
    const newSubjects = subjects.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, sources: c.sources.filter(src => src.id !== sourceId) } : c) } : s);
    setSubjects(newSubjects);
    if (activeSourceId === sourceId) setActiveSourceId(null);
  }, [subjects, activeSourceId]);

  const toggleSubject = (id: string) => {
    const newSubjects = subjects.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s);
    setSubjects(newSubjects);
  };
  const toggleChapter = (subjectId: string, chapterId: string) => {
    const newSubjects = subjects.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, expanded: !c.expanded } : c) } : s);
    setSubjects(newSubjects);
  };

  const isBookmarked = useCallback((sourceId: string, questionId: string) => {
    return bookmarkFolders.some(f => f.bookmarks.some(b => b.sourceId === sourceId && b.questionId === questionId));
  }, [bookmarkFolders]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      let activeItemInfo: any = null;
      if (activeItemId) {
        for (const sub of subjects) {
          if (sub.id === activeItemId) { activeItemInfo = { type: 'subject', subjectId: sub.id, name: sub.name }; break; }
          for (const chap of sub.chapters) {
            if (chap.id === activeItemId) { activeItemInfo = { type: 'chapter', subjectId: sub.id, chapterId: chap.id, name: chap.name }; break; }
            for (const src of chap.sources) {
              if (src.id === activeItemId) { activeItemInfo = { type: 'source', subjectId: sub.id, chapterId: chap.id, sourceId: src.id, name: src.name }; break; }
            }
          }
        }
      }

      if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (!activeItemInfo) addSubject();
        else if (activeItemInfo.type === 'subject') addChapter(activeItemInfo.subjectId);
        else if (activeItemInfo.type === 'chapter') addSource(activeItemInfo.subjectId, activeItemInfo.chapterId);
      } else if (e.key === "F2") {
        if (!activeItemInfo) return;
        e.preventDefault();
        setRenamingId(activeItemId);
        setRenameVal(activeItemInfo.name);
      } else if (e.key === "Delete") {
        if (!activeItemInfo) return;
        e.preventDefault();
        if (activeItemInfo.type === 'subject') deleteSubject(activeItemInfo.subjectId);
        else if (activeItemInfo.type === 'chapter') deleteChapter(activeItemInfo.subjectId, activeItemInfo.chapterId);
        else if (activeItemInfo.type === 'source') deleteSource(activeItemInfo.subjectId, activeItemInfo.chapterId, activeItemInfo.sourceId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeItemId,
    subjects,
    addSubject,
    addChapter,
    addSource,
    deleteSubject,
    deleteChapter,
    deleteSource,
    setRenamingId, // These are fine as they only affect local UI state
    setRenameVal,  //
  ]);

  // --- Question Management ---
  const handleSaveQuestion = async (sourceId: string, questionData: Partial<SavedQuestion>) => {
    if (questionData.id) {
       setAllQuestions(prev => ({
          ...prev,
          [sourceId]: (prev[sourceId] || []).map(q => q.id === questionData.id ? { ...q, ...questionData } : q)
       }));
    } else {
       const newQuestion: SavedQuestion = {
         ...questionData,
         id: Date.now().toString(),
         createdAt: Date.now(),
       } as SavedQuestion;
       setAllQuestions(prev => ({ ...prev, [sourceId]: [...(prev[sourceId] || []), newQuestion] }));
    }
  };

  const deleteQuestion = (sourceId: string, questionId: string) => {
    setAllQuestions(prev => ({
      ...prev,
      [sourceId]: (prev[sourceId] || []).filter(q => q.id !== questionId),
    }));
  };

  const activeQuestionsWithSource = useMemo(() => {
    if (activeBookmarkFolderId) {
      const folder = bookmarkFolders.find(f => f.id === activeBookmarkFolderId);
      if (!folder) return [];
      const qs: { question: SavedQuestion, sourceId: string }[] = [];
      folder.bookmarks.forEach(b => {
        const srcQs = allQuestions[b.sourceId] || [];
        const q = srcQs.find(q => q.id === b.questionId);
        if (q) qs.push({ question: q, sourceId: b.sourceId });
      });
      return qs;
    }
    if (activeSourceId) {
      return (allQuestions[activeSourceId] || []).map(q => ({ question: q, sourceId: activeSourceId }));
    }
    return [];
  }, [activeSourceId, activeBookmarkFolderId, bookmarkFolders, allQuestions]);

  const sortedQuestions = useMemo(() => {
    let qs = [...activeQuestionsWithSource];
    switch (filterBy) {
      case "date": qs.sort((a, b) => b.question.createdAt - a.question.createdAt); break;
      case "name": qs.sort((a, b) => a.question.name.localeCompare(b.question.name)); break;
      case "number":
        qs.sort((a, b) => {
          const numA = parseInt(a.question.name.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.question.name.match(/\d+/)?.[0] || "0");
          if (numA !== numB) return numA - numB;
          return a.question.name.localeCompare(b.question.name);
        });
        break;
      case "solved": qs.sort((a, b) => (b.question.correctCount || 0) - (a.question.correctCount || 0)); break;
      case "unsolved": qs.sort((a, b) => (b.question.wrongCount || 0) - (a.question.wrongCount || 0)); break;
      case "review": 
        qs = qs.filter(a => !a.question.nextReview || a.question.nextReview <= Date.now());
        qs.sort((a, b) => (a.question.nextReview || 0) - (b.question.nextReview || 0)); 
        break;
    }
    return qs;
  }, [activeQuestionsWithSource, filterBy]);

  const QuestionCard = ({ question, sourceId }: { question: SavedQuestion, sourceId: string }) => {
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const hasAnswer = !!(question.answerText || question.answerImageKey || question.answerUrl);
    const bookmarked = isBookmarked(sourceId, question.id);

    if (isCompactMode) {
      return (
        <div 
          className="bg-card border border-border rounded-xl flex flex-col group overflow-hidden shadow-sm hover:shadow-md transition-shadow relative p-2"
          onClick={() => setDetailQuestion({ type: 'question', question, sourceId })}
        >
           <div className="flex justify-between items-center pb-1.5">
             <p className="font-bold text-xs truncate cursor-pointer">{question.name}</p>
             <div className="flex items-center gap-1">
               <button 
                 onClick={(e) => { e.stopPropagation(); setBookmarkingQuestion({ sourceId, questionId: question.id }); }} 
                 className={cn("p-1 transition-opacity", bookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
               >
                 <Bookmark className={cn("h-3.5 w-3.5 transition-colors", bookmarked ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-foreground")} />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
                 className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
               >
                 {isMinimized ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
               </button>
             </div>
           </div>
           {!isMinimized && (
             <div className="bg-white dark:bg-zinc-900/50 w-full flex items-center justify-center cursor-pointer rounded-md overflow-hidden">
               <WorkspaceImage mediaKey={question.questionImageKey} fallbackUrl={question.questionUrl} className="w-full h-auto object-contain" />
             </div>
           )}
        </div>
      );
    }

    return (
      <div 
        className="bg-card border border-border rounded-xl flex flex-col group overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
      >
        <div className="flex justify-between items-center px-3 py-2 bg-muted/30 border-b border-border cursor-pointer" onClick={() => setDetailQuestion({ type: 'question', question, sourceId })}>
          <p className="font-bold text-sm truncate">{question.name}</p>
          
          <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
               onClick={(e) => { e.stopPropagation(); setBookmarkingQuestion({ sourceId, questionId: question.id }); }} 
               className={cn("p-1 transition-opacity", bookmarked ? "opacity-100 md:opacity-100" : "opacity-100 md:opacity-0 group-hover:opacity-100")}
             >
               <Bookmark className={cn("h-4 w-4 transition-colors", bookmarked ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-foreground")} />
             </button>

            <button 
               onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
               className="p-1 transition-colors text-muted-foreground hover:text-foreground"
             >
               {isMinimized ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
             </button>

            {question.isCorrect === true && <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center border border-green-500/20"><Check className="h-3.5 w-3.5 text-green-500" /></div>}
            {question.isCorrect === false && <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center border border-red-500/20"><X className="h-3.5 w-3.5 text-red-500" /></div>}
            {question.isCorrect === undefined && <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center border border-border"><Minus className="h-3.5 w-3.5 text-muted-foreground" /></div>}

            <ThreeDotMenu>
              <MenuItem icon={Pencil} label="Edit Question" onClick={(e: any) => { e.stopPropagation(); setEditingQuestion({ sourceId, question }); }} />
              <MenuItem icon={Trash2} label="Delete Question" destructive onClick={(e: any) => { e.stopPropagation(); deleteQuestion(sourceId, question.id); }} />
            </ThreeDotMenu>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            <div className="bg-white dark:bg-zinc-900/50 w-full flex items-center justify-center p-2 cursor-pointer" onClick={() => setDetailQuestion({ type: 'question', question, sourceId })}>
              <WorkspaceImage mediaKey={question.questionImageKey} fallbackUrl={question.questionUrl} className="w-full h-auto object-contain rounded-md" />
            </div>

            {hasAnswer && (
              <div 
                className="p-3 text-xs bg-muted/20 border-t border-border border-dashed cursor-pointer relative group overflow-hidden"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!isAnswerRevealed) {
                    setIsAnswerRevealed(true); 
                  } else {
                    setDetailQuestion({ type: 'answer', question, sourceId });
                  }
                }}
              >
                 <div className={cn("transition-all duration-300", !isAnswerRevealed && "blur-[6px] select-none opacity-50")}>
                   {question.answerText && <p className="mb-2 whitespace-pre-wrap font-medium text-blue-500">{question.answerText}</p>}
                   {(question.answerImageKey || question.answerUrl) && (
                     <WorkspaceImage mediaKey={question.answerImageKey} fallbackUrl={question.answerUrl} className="w-full max-h-40 object-contain rounded-md border border-border" />
                   )}
                 </div>
                 {!isAnswerRevealed && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <span className="bg-background/90 text-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5">
                       <Eye className="h-3.5 w-3.5" /> Click to Reveal Answer
                     </span>
                   </div>
                 )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {isPrinting && createPortal(
        <div id="print-root" className="fixed inset-0 z-[9999] bg-white text-black overflow-y-auto p-8 print:p-0 print:static print:inset-auto print:overflow-visible">
          <div className="w-full max-w-none mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-4 text-center border-b border-gray-200 pb-4 print:mb-6">
              {activeBookmarkFolderId ? bookmarkFolders.find(f => f.id === activeBookmarkFolderId)?.name : (activeSourceId ? getSourceName(activeSourceId) : 'Export')}
            </h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 gap-6 print:gap-4">
              {sortedQuestions.map((item, i) => {
                const q = item.question;
                return (
                <div key={`${item.sourceId}-${q.id}`} className="break-inside-avoid border border-gray-200 rounded-lg p-3 bg-white shadow-sm flex flex-col mb-4 print:mb-0 print:border-gray-300" style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="font-bold text-sm mb-2 text-gray-800 border-b border-gray-100 pb-1">{q.name || `Q${i + 1}`}</h2>
                  
                  <div className="flex-1 flex flex-col justify-start">
                    <div className="mb-2">
                      {q.questionImageKey || q.questionUrl ? (
                        <WorkspaceImage mediaKey={q.questionImageKey} fallbackUrl={q.questionUrl} className="w-full h-auto object-contain rounded-sm" />
                      ) : null}
                    </div>

                    {(q.answerText || q.answerImageKey || q.answerUrl) && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                        {q.answerText && <p className="whitespace-pre-wrap text-xs text-gray-700 mb-1.5">{q.answerText}</p>}
                        {(q.answerImageKey || q.answerUrl) && (
                          <WorkspaceImage mediaKey={q.answerImageKey} fallbackUrl={q.answerUrl} className="w-full h-auto object-contain rounded-sm" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { margin: 10mm; size: auto; }
              html, body {
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
              }
              #root {
                display: none !important;
              }
              #print-root {
                display: block !important;
                position: static !important;
                width: 100%;
                height: auto !important;
                overflow: visible !important;
              }
            }
          `}} />
        </div>
      , document.body)}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn("flex h-full overflow-hidden bg-background", isPrinting && "hidden")}
      >
      {/* Sidebar */}
      <div className={cn("w-full md:w-64 shrink-0 border-r border-border flex flex-col bg-sidebar", showSidebar ? "flex fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl md:relative md:z-auto md:bg-sidebar" : "hidden")}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Close sidebar">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2"><Bookmark className="h-4 w-4"/>Saves</span>
          </div>
           <div className="flex items-center gap-1.5">
            <button onClick={addSubject} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="New Subject">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        <Reorder.Group as="div" axis="y" values={subjects} onReorder={setSubjects} className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )
          : subjects.length === 0 ? (
            <div className="text-center py-8 px-3">
              <Bookmark className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              <p className="text-xs text-muted-foreground">No subjects yet</p>
              <button
                onClick={addSubject}
                className="text-[10px] text-primary hover:underline mt-1"
              >
                + Create subject
              </button>
            </div>
          ) : null}
          {subjects.map(sub => (
            <Reorder.Item as="div" key={sub.id} value={sub}>
              {/* Subject (L1) */}
              <div className={cn("group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-lg", activeItemId === sub.id ? "bg-accent/40" : "hover:bg-muted/50")} onClick={() => setActiveItemId(sub.id)}>
                <button onClick={(e) => {e.stopPropagation(); toggleSubject(sub.id)}} className="text-muted-foreground hover:text-foreground"><ChevronDown className={cn("h-3 w-3 transition-transform", !sub.expanded && "-rotate-90")} /></button>
                {renamingId === sub.id ? (
                  <Input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} onBlur={commitRename} onKeyDown={e => e.key === 'Enter' && commitRename()} className="h-6 text-xs" />
                ) : (
                  <span className="flex-1 text-xs font-semibold text-foreground truncate">{sub.name}</span>
                )}
                <ThreeDotMenu>
                  <MenuItem icon={FilePlus} label="Add Chapter" onClick={() => addChapter(sub.id)} />
                  <MenuItem icon={Pencil} label="Rename" onClick={() => {setRenamingId(sub.id); setRenameVal(sub.name);}} />
                  <MenuItem icon={Trash2} label="Delete" destructive onClick={() => deleteSubject(sub.id)} />
                </ThreeDotMenu>
              </div>

              {/* Chapters (L2) */}
              {sub.expanded && (
                <div onPointerDown={e => e.stopPropagation()} className="pl-4">
                  <Reorder.Group as="div" axis="y" values={sub.chapters} onReorder={(newChaps) => {
                    const newSubjects = subjects.map(s => s.id === sub.id ? {...s, chapters: newChaps} : s);
                    setSubjects(newSubjects);
                  }} className="space-y-0.5 mt-0.5">
                    {sub.chapters.map(chap => (
                      <Reorder.Item as="div" key={chap.id} value={chap}>
                        <div className={cn("group flex items-center gap-1 pl-5 pr-2 py-1.5 cursor-pointer rounded-lg", activeItemId === chap.id ? "bg-accent/40" : "hover:bg-muted/50")} onClick={() => setActiveItemId(chap.id)}>
                          <button onClick={(e) => {e.stopPropagation(); toggleChapter(sub.id, chap.id)}} className="text-muted-foreground hover:text-foreground"><ChevronDown className={cn("h-3 w-3 transition-transform", !chap.expanded && "-rotate-90")} /></button>
                          {renamingId === chap.id ? (
                            <Input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} onBlur={commitRename} onKeyDown={e => e.key === 'Enter' && commitRename()} className="h-6 text-xs" />
                          ) : (
                            <span className="flex-1 text-xs text-foreground truncate">{chap.name}</span>
                          )}
                          <ThreeDotMenu>
                            <MenuItem icon={FilePlus} label="Add Source" onClick={() => addSource(sub.id, chap.id)} />
                            <MenuItem icon={Pencil} label="Rename" onClick={() => {setRenamingId(chap.id); setRenameVal(chap.name);}} />
                            <MenuItem icon={Trash2} label="Delete" destructive onClick={() => deleteChapter(sub.id, chap.id)} />
                          </ThreeDotMenu>
                        </div>

                        {/* Sources (L3) */}
                        {chap.expanded && (
                          <div onPointerDown={e => e.stopPropagation()} className="pl-4">
                            <Reorder.Group as="div" axis="y" values={chap.sources} onReorder={(newSrcs) => {
                              const newSubjects = subjects.map(s => s.id === sub.id ? {...s, chapters: s.chapters.map(c => c.id === chap.id ? {...c, sources: newSrcs} : c)} : s);
                              setSubjects(newSubjects);
                            }} className="space-y-0.5 mt-0.5">
                              {chap.sources.map(src => (
                                <Reorder.Item as="div" key={src.id} value={src}>
                                  <div className={cn("group flex items-center gap-1 pl-9 pr-2 py-1.5 cursor-pointer rounded-lg", activeSourceId === src.id && !activeBookmarkFolderId ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")} onClick={() => {setActiveItemId(src.id); setActiveSourceId(src.id); setActiveBookmarkFolderId(null); setShowSidebar(false);}}>
                                    <div className="w-3 h-3 flex items-center justify-center"><div className="w-1 h-1 bg-muted-foreground rounded-full"/></div>
                                    {renamingId === src.id ? (
                                      <Input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} onBlur={commitRename} onKeyDown={e => e.key === 'Enter' && commitRename()} className="h-5 text-xs" />
                                    ) : (
                                      <span className="flex-1 text-xs truncate">{src.name}</span>
                                    )}
                                    <ThreeDotMenu>
                                      <MenuItem icon={Pencil} label="Rename" onClick={() => {setRenamingId(src.id); setRenameVal(src.name);}} />
                                      <MenuItem icon={Trash2} label="Delete" destructive onClick={() => deleteSource(sub.id, chap.id, src.id)} />
                                    </ThreeDotMenu>
                                  </div>
                                </Reorder.Item>
                              ))}
                              {/* Add source shortcut */}
                              <button
                                onClick={() => addSource(sub.id, chap.id)}
                                className="flex items-center gap-1 pl-9 pr-2 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
                              >
                                <FilePlus className="h-2.5 w-2.5" />
                                + Add source
                              </button>
                            </Reorder.Group>
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}
              {/* Add chapter shortcut */}
              {sub.expanded && (
                <button
                  onClick={() => addChapter(sub.id)}
                  className="flex items-center gap-1 pl-5 pr-2 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
                >
                  <FilePlus className="h-2.5 w-2.5" />+ Add chapter
                </button>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className={cn("flex items-center px-3 py-2 bg-card border-b border-border shrink-0", showSidebar && "hidden")}>
          <button onClick={() => setShowSidebar(true)} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FolderPlus className="h-4 w-4 text-primary" /> Open Bank
          </button>
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0 flex-wrap">
          <Button size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => activeSourceId && setShowAddPanel(p => !p)} disabled={!activeSourceId}>
            <Plus className="h-3 w-3" /> Add New Ques
          </Button>
          <Button variant={showStopwatch ? "secondary" : "outline"} size="sm" className={cn("h-7 gap-1.5 text-xs shrink-0", showStopwatch && "bg-primary/10 text-primary border-primary/20")} onClick={() => setShowStopwatch(!showStopwatch)}>
            <Clock className="h-3 w-3" /> Stopwatch
          </Button>
          
          <Button variant="outline" size="sm" className={cn("h-7 gap-1.5 text-xs shrink-0", showBookmarksPanel && "bg-primary/10 text-primary border-primary/20")} onClick={() => setShowBookmarksPanel(true)}>
            <Bookmark className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Bookmarks
          </Button>
          
          <Button variant={filterOpen ? "secondary" : "outline"} size="sm" className={cn("h-7 gap-1.5 text-xs shrink-0", filterOpen && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20")} onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="h-3 w-3" /> Filter
          </Button>

          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setIsCompactMode(p => !p)}>
            {isCompactMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {isCompactMode ? 'Show Full' : 'Hide/Show'}
          </Button>

          <div className="flex-1" />

          <Button variant="secondary" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setIsPrinting(true)} disabled={(!activeSourceId && !activeBookmarkFolderId) || activeQuestionsWithSource.length === 0}>
            <Save className="h-3 w-3" /> Save as PDF
          </Button>
        </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="bg-muted/30 border-b border-border overflow-hidden shrink-0"
          >
            <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-semibold mr-1">Sort & Filter by:</span>
              {[
                { id: "number", label: "Question Number" },
                { id: "name", label: "Question Name" },
                { id: "date", label: "Date Added" },
                { id: "solved", label: "Solved Count" },
                { id: "unsolved", label: "Unsolved Count" },
                { id: "review", label: "Due for Review" },
              ].map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => setFilterBy(opt.id as any)} 
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs transition-colors border", 
                    filterBy === opt.id ? "border-primary text-primary font-bold bg-primary/10" : "border-border/60 text-foreground hover:bg-muted bg-background"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Question Grid */}
        <div className="flex-1 flex overflow-hidden relative">
          <AnimatePresence>
            {showStopwatch && <StopwatchWidget onClose={() => setShowStopwatch(false)} />}
          </AnimatePresence>
          <div className="flex-1 overflow-auto bg-muted/30 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )
          : (!activeSourceId && !activeBookmarkFolderId) ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <BookCopy className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium text-foreground">Select a source or bookmark folder</p>
                <p className="text-xs">Choose an item from the left panel or bookmarks menu to see saved questions.</p>
              </div>
            </div>
          ) : activeQuestionsWithSource.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Bot className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium text-foreground">No questions found here.</p>
                {activeSourceId && (
                  <Button size="sm" className="mt-2 text-xs" onClick={() => setShowAddPanel(true)}>
                    <Plus className="h-3 w-3 mr-1"/> Add First Question
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className={cn("columns-1 sm:columns-2 gap-4 space-y-4", isCompactMode ? "md:columns-4 lg:columns-5 xl:columns-6 gap-2 space-y-2" : "md:columns-3 lg:columns-4 xl:columns-5")}>
                {sortedQuestions.map(item => (
                  <div key={`${item.sourceId}-${item.question.id}`} className="break-inside-avoid">
                    <QuestionCard question={item.question} sourceId={item.sourceId} />
                  </div>
                ))}
            </div>
          )}
        </div>
        
          <AnimatePresence>
            {showAddPanel && activeSourceId && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-border bg-card overflow-hidden shrink-0 hidden lg:flex flex-col"
              >
                <QuestionEditorModal 
                  sourceId={activeSourceId} 
                  onClose={() => setShowAddPanel(false)}
                  onSave={handleSaveQuestion}
                />
              </motion.div>
            )}
            {editingQuestion && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-border bg-card overflow-hidden shrink-0 hidden lg:flex flex-col"
              >
                <QuestionEditorModal 
                  sourceId={editingQuestion.sourceId}
                  initialData={editingQuestion.question}
                  onClose={() => setEditingQuestion(null)}
                  onSave={handleSaveQuestion}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showAddPanel || editingQuestion) && activeSourceId && (
           <div className="lg:hidden">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
                onClick={() => { setShowAddPanel(false); setEditingQuestion(null); }}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <QuestionEditorModal 
                    sourceId={editingQuestion ? editingQuestion.sourceId : activeSourceId} 
                    initialData={editingQuestion?.question}
                    onClose={() => { setShowAddPanel(false); setEditingQuestion(null); }}
                    onSave={handleSaveQuestion}
                  />
                </motion.div>
              </motion.div>
           </div>
        )}
        {detailQuestion && (
          <QuestionDetailModal
            question={detailQuestion.question}
            type={detailQuestion.type}
            sourceId={detailQuestion.sourceId}
            onClose={() => setDetailQuestion(null)}
            isBookmarked={isBookmarked(detailQuestion.sourceId, detailQuestion.question.id)}
            onBookmark={() => setBookmarkingQuestion({ sourceId: detailQuestion.sourceId, questionId: detailQuestion.question.id })}
          />
        )}
        {bookmarkingQuestion && (
           <BookmarkSelectModal 
             sourceId={bookmarkingQuestion.sourceId}
             questionId={bookmarkingQuestion.questionId}
             bookmarkFolders={bookmarkFolders}
             setBookmarkFolders={setBookmarkFolders}
             onClose={() => setBookmarkingQuestion(null)}
           />
        )}
        {showBookmarksPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowBookmarksPanel(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-card border-l border-border shadow-2xl z-[300] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <h2 className="font-bold flex items-center gap-2"><Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500"/> Bookmark Folders</h2>
                <button onClick={() => setShowBookmarksPanel(false)} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><X className="h-5 w-5"/></button>
              </div>
              <div className="p-4 border-b border-border shrink-0 bg-muted/20">
                <div className="flex gap-2">
                  <Input 
                    value={newBookmarkFolderName} 
                    onChange={e => setNewBookmarkFolderName(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newBookmarkFolderName.trim()) {
                        setBookmarkFolders([...bookmarkFolders, { id: Date.now().toString(), name: newBookmarkFolderName.trim(), bookmarks: [] }]);
                        setNewBookmarkFolderName("");
                      }
                    }}
                    placeholder="New Folder Name" 
                    className="h-8 text-xs" 
                  />
                  <Button 
                    size="sm" 
                    className="h-8 shrink-0 px-2"
                    disabled={!newBookmarkFolderName.trim()}
                    onClick={() => {
                      setBookmarkFolders([...bookmarkFolders, { id: Date.now().toString(), name: newBookmarkFolderName.trim(), bookmarks: [] }]);
                      setNewBookmarkFolderName("");
                    }}
                  >
                    <Plus className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {bookmarkFolders.length === 0 ? (
                   <div className="text-center py-8 text-muted-foreground">
                     <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-20" />
                     <p className="text-xs">No bookmark folders yet.</p>
                   </div>
                 ) : (
                   bookmarkFolders.map(folder => (
                      <div 
                        key={folder.id} 
                        onClick={() => { setActiveBookmarkFolderId(folder.id); setActiveSourceId(null); setShowBookmarksPanel(false); }} 
                        className={cn("p-3 hover:bg-muted cursor-pointer rounded-lg flex items-center justify-between group transition-colors", activeBookmarkFolderId === folder.id ? "bg-primary/10 text-primary" : "")}
                      >
                         <div className="flex items-center gap-3 overflow-hidden">
                           <FolderPlus className="h-4 w-4 shrink-0" />
                           <span className="font-semibold text-sm truncate">{folder.name}</span>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs font-bold bg-muted-foreground/10 px-2 py-0.5 rounded-full">{folder.bookmarks.length}</span>
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               setBookmarkFolders(bookmarkFolders.filter(f => f.id !== folder.id));
                               if (activeBookmarkFolderId === folder.id) setActiveBookmarkFolderId(null);
                             }} 
                             className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/20 p-1 rounded transition-all"
                           >
                             <Trash2 className="h-3.5 w-3.5"/>
                           </button>
                         </div>
                      </div>
                   ))
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  );
}
