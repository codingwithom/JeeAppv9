import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, X, FolderPlus, FilePlus, ChevronDown, ChevronRight as ChevRight, Pencil, Trash2,
  Clock, Filter, Eye, EyeOff, Save, Image as ImageIcon, Check, Link as LinkIcon, Upload, MoreVertical,
  BookCopy, Bookmark, Bot, HelpCircle,
  ChevronLeft
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


// --- Add Question Modal ---
function AddQuestionModal({
  sourceId,
  onClose,
  onSave,
}: {
  sourceId: string;
  onClose: () => void;
  onSave: (sourceId: string, question: Omit<SavedQuestion, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [questionUrl, setQuestionUrl] = useState("");
  const [answerUrl, setAnswerUrl] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  
  const [qImageFile, setQImageFile] = useState<File | null>(null);
  const [aImageFile, setAImageFile] = useState<File | null>(null);
  const qFileRef = useRef<HTMLInputElement>(null);
  const aFileRef = useRef<HTMLInputElement>(null);
  const [qPreview, setQPreview] = useState<string | null>(null);
  const [aPreview, setAPreview] = useState<string | null>(null);

  const { writeMedia } = useWorkspaceContext();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (qImageFile) {
      const url = URL.createObjectURL(qImageFile);
      setQPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setQPreview(null);
  }, [qImageFile]);

  useEffect(() => {
    if (aImageFile) {
      const url = URL.createObjectURL(aImageFile);
      setAPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAPreview(null);
  }, [aImageFile]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    let qKey, aKey;
    if (qImageFile) {
      qKey = `q_img_${Date.now()}`;
      await writeMedia(qKey, qImageFile);
    }
    if (aImageFile) {
      aKey = `a_img_${Date.now()}`;
      await writeMedia(aKey, aImageFile);
    }

    await onSave(sourceId, {
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
            <FilePlus className="h-4 w-4 text-primary" /> New Question
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
                <img src={qPreview || questionUrl} className="w-full h-full object-contain" alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-[10px] text-muted-foreground/40">URL auto-fetch / File drop</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <p className="text-white text-[10px] font-medium">Auto-fetching from Source</p>
              </div>
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
                 <div className="h-20 rounded-lg bg-muted/50 border border-border overflow-hidden">
                    <img src={aPreview || answerUrl} className="w-full h-full object-contain" alt="" />
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
              {isSaving ? "Adding..." : "Add Question"}
            </Button>
          </div>
        </div>
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
  return <img src={finalUrl} className={className} alt="" />;
}

// --- Question Detail Modal ---
function QuestionDetailModal({ question, onClose }: { question: SavedQuestion; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">{question.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Question</p>
            <WorkspaceImage mediaKey={question.questionImageKey} fallbackUrl={question.questionUrl} className="rounded-md border border-border max-w-full" />
            {question.description && <p className="text-sm mt-2">{question.description}</p>}
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Answer</p>
            {question.answerText && <p className="text-sm whitespace-pre-wrap">{question.answerText}</p>}
            <WorkspaceImage mediaKey={question.answerImageKey} fallbackUrl={question.answerUrl} className="rounded-md border border-border max-w-full mt-2" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


// --- Main Component ---
export default function SavesPage() {
  const [subjects, setSubjects] = useLocalStorage<QuestionSubject[]>("jee_saves_subjects_v1", []);
  const [allQuestions, setAllQuestions] = useLocalStorage<Record<string, SavedQuestion[]>>("jee_saves_questions_v1", {});

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const [showSidebar, setShowSidebar] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailQuestion, setDetailQuestion] = useState<SavedQuestion | null>(null);
  const [hideAnswers, setHideAnswers] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const { writeMedia, readMediaAsArrayBuffer } = useWorkspaceContext();

  // --- Hierarchy Management ---
  const addSubject = useCallback(() => {
    const id = Date.now().toString();
    setSubjects(prev => [...prev, { id, name: "New Subject", expanded: true, chapters: [] }]);
    setRenamingId(id);
    setRenameVal("New Subject");
  }, [setSubjects]);

  const addChapter = useCallback((subjectId: string) => {
    const id = Date.now().toString();
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, expanded: true, chapters: [...s.chapters, { id, name: "New Chapter", expanded: true, sources: [] }] } : s));
    setRenamingId(id);
    setRenameVal("New Chapter");
  }, [setSubjects]);

  const addSource = useCallback((subjectId: string, chapterId: string) => {
    const id = Date.now().toString();
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, expanded: true, sources: [...c.sources, { id, name: "New Source" }] } : c) } : s));
    setRenamingId(id);
    setRenameVal("New Source");
  }, [setSubjects]);

  const commitRename = () => {
    if (!renamingId || !renameVal.trim()) {
      setRenamingId(null);
      return;
    }
    setSubjects(prev => prev.map(s => {
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
    }));
    setRenamingId(null);
  };

  const deleteSubject = useCallback((id: string) => setSubjects(prev => prev.filter(s => s.id !== id)), [setSubjects]);

  const deleteChapter = useCallback((subjectId: string, chapterId: string) => {
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.filter(c => c.id !== chapterId) } : s));
  }, [setSubjects]);

  const deleteSource = useCallback((subjectId: string, chapterId: string, sourceId: string) => {
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, sources: c.sources.filter(src => src.id !== sourceId) } : c) } : s));
    if (activeSourceId === sourceId) setActiveSourceId(null);
  }, [setSubjects, activeSourceId]);

  const toggleSubject = (id: string) => setSubjects(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  const toggleChapter = (subjectId: string, chapterId: string) => setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, chapters: s.chapters.map(c => c.id === chapterId ? { ...c, expanded: !c.expanded } : c) } : s));

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
    setRenamingId,
    setRenameVal,
  ]);

  // --- Question Management ---
  const handleSaveQuestion = async (sourceId: string, questionData: Omit<SavedQuestion, 'id' | 'createdAt'>) => {
    const newQuestion: SavedQuestion = {
      ...questionData,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setAllQuestions(prev => ({
      ...prev,
      [sourceId]: [...(prev[sourceId] || []), newQuestion]
    }));
  };

  const deleteQuestion = (sourceId: string, questionId: string) => {
    setAllQuestions(prev => ({
      ...prev,
      [sourceId]: (prev[sourceId] || []).filter(q => q.id !== questionId)
    }));
  };

  const activeQuestions = allQuestions[activeSourceId || ''] || [];

  const QuestionCard = ({ question }: { question: SavedQuestion }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-card border border-border rounded-lg p-3 flex flex-col group cursor-pointer"
      onClick={() => setDetailQuestion(question)}
    >
      <div className="flex justify-between items-start">
        <p className="font-bold text-sm mb-2 pr-2">{question.name}</p>
        <button onClick={(e) => { e.stopPropagation(); deleteQuestion(activeSourceId!, question.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
        <WorkspaceImage mediaKey={question.questionImageKey} fallbackUrl={question.questionUrl} className="w-full h-full object-contain" />
      </div>
      <AnimatePresence>
        {!hideAnswers && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs pt-2 border-t border-dashed border-border">
              <div className="flex items-center gap-1">
                {question.isCorrect === true && <Check className="h-4 w-4 text-green-500" />}
                {question.isCorrect === false && <X className="h-4 w-4 text-red-500" />}
                {question.isCorrect === undefined && <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />}
              </div>
              <span className="text-muted-foreground truncate">ans: {question.answerText || '...'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex h-full overflow-hidden bg-background"
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
          {subjects.length === 0 && (
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
          )}
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
                <div onPointerDown={e => e.stopPropagation()}>
                  <Reorder.Group as="div" axis="y" values={sub.chapters} onReorder={(newChaps) => setSubjects(p => p.map(s => s.id === sub.id ? {...s, chapters: newChaps} : s))} className="space-y-0.5 mt-0.5">
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
                          <div onPointerDown={e => e.stopPropagation()}>
                            <Reorder.Group as="div" axis="y" values={chap.sources} onReorder={(newSrcs) => setSubjects(p => p.map(s => s.id === sub.id ? {...s, chapters: s.chapters.map(c => c.id === chap.id ? {...c, sources: newSrcs} : c)} : s))} className="space-y-0.5 mt-0.5">
                              {chap.sources.map(src => (
                                <Reorder.Item as="div" key={src.id} value={src}>
                                  <div className={cn("group flex items-center gap-1 pl-9 pr-2 py-1.5 cursor-pointer rounded-lg", activeSourceId === src.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")} onClick={() => {setActiveItemId(src.id); setActiveSourceId(src.id);}}>
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
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
            <Clock className="h-3 w-3" /> Stopwatch
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
            <Filter className="h-3 w-3" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setHideAnswers(p => !p)}>
            {hideAnswers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {hideAnswers ? 'Show Answers' : 'Hide Answers'}
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => activeSourceId && setShowAddPanel(p => !p)} disabled={!activeSourceId}>
            <Plus className="h-3 w-3" /> Add New Ques
          </Button>
          <Button variant="secondary" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
            <Save className="h-3 w-3" /> Save as PDF
          </Button>
        </div>

        {/* Question Grid */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto bg-muted/30 p-4">
          {!activeSourceId ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <BookCopy className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium text-foreground">Select a source</p>
                <p className="text-xs">Choose an item from the left panel to see saved questions.</p>
              </div>
            </div>
          ) : activeQuestions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Bot className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium text-foreground">No questions saved here yet.</p>
                <Button size="sm" className="mt-2 text-xs" onClick={() => setShowAddPanel(true)}>
                  <Plus className="h-3 w-3 mr-1"/> Add First Question
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence>
                {activeQuestions.map(q => (
                  <QuestionCard key={q.id} question={q} />
                ))}
              </AnimatePresence>
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
                <AddQuestionModal 
                  sourceId={activeSourceId} 
                  onClose={() => setShowAddPanel(false)}
                  onSave={handleSaveQuestion}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddPanel && activeSourceId && (
           <div className="lg:hidden">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
                onClick={() => setShowAddPanel(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <AddQuestionModal 
                    sourceId={activeSourceId} 
                    onClose={() => setShowAddPanel(false)}
                    onSave={handleSaveQuestion}
                  />
                </motion.div>
              </motion.div>
           </div>
        )}
        {detailQuestion && (
          <QuestionDetailModal
            question={detailQuestion}
            onClose={() => setDetailQuestion(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
