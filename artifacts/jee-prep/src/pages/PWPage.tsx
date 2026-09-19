import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Search,
  Users,
  Clock,
  ArrowLeft,
  ExternalLink,
  X,
  RefreshCw,
  FolderOpen,
  Download,
  Eye,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
  CalendarDays,
  FileDown,
  ChevronDown,
  ChevronLeft,
  Info,
  Play,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { idbGet, idbSet } from "@/lib/idb";

// ─── TYPES ──────────────────────────────────────────────────────────────────
export interface PWLecture {
  id: string;
  rawContentId?: string;
  title: string;
  type: "lecture" | "dpp" | "revision" | "doubt";
  duration?: string;
  date?: string;
  faculty?: string;
  attachmentName?: string;
  pdfUrl?: string;
  notesUrl?: string;
  dppPdfUrl?: string;
  allNotes?: Array<{ topic: string; note?: string; pdf?: string }>;
  allDpps?: Array<{ topic: string; note?: string; pdf?: string }>;
}

export interface PWChapter {
  id: string;
  rawId?: string;
  title: string;
  videoCount?: number;
  notesCount?: number;
  dppCount?: number;
  isStarted?: boolean;
  lectures: PWLecture[];
}

export interface PWTeacher {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  qualification?: string;
  experience?: string;
  featuredLine?: string;
  imageUrl?: string;
  introVideoThumbnail?: string;
  subject?: string;
}

export interface PWSubject {
  id: string;
  subjectId?: string;
  name: string;
  faculty?: string;
  teachers?: PWTeacher[];
  chapters: PWChapter[];
  lectureCount?: number;
  tagCount?: number;
  syllabusPdf?: string;
  schedules?: any[];
}

export interface PWBatch {
  id: string;
  name: string;
  target: string;
  description: string;
  batchPdf?: string;
  previewImage?: string;
  subjects: PWSubject[];
}

export interface PWScheduleItem {
  id: string;
  type: "LECTURE" | "NOTES" | "DPP" | "QUIZ";
  subject: string;
  rawSubject?: string;
  teacher: string;
  topic: string;
  chapter?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  duration?: string;
  tag?: string;
  status?: string;
  isLive?: boolean;
  isUpcoming?: boolean;
  isEnded?: boolean;
  hasNotes?: boolean;
  hasDpp?: boolean;
  notesUrl?: string;
  dppPdfUrl?: string;
  notes?: Array<{ topic: string; attachmentName?: string; url?: string }>;
  dpps?: Array<{ topic: string; attachmentName?: string; url?: string }>;
}

export interface PWCatalogBatch {
  batch_id: string;
  name: string;
  byName?: string;
  exam?: string;
  class?: string;
  language?: string;
  start_date?: string;
  end_date?: string;
  photo?: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
const EMPTY_PW_BATCH: PWBatch = {
  id: "698ad3519549b300a5e1cc6a",
  name: "Arjuna JEE 2027",
  target: "IIT-JEE • Class 11",
  description: "Official Physics Wallah Live Batch Curriculum",
  subjects: [],
};

export function getChapterCounts(ch: PWChapter) {
  const hasLoaded = Array.isArray(ch.lectures) && ch.lectures.length > 0;
  const lectureCount = hasLoaded
    ? ch.lectures.filter(l => l.type !== "dpp").length
    : (ch.videoCount ?? 0);
  const dppCount = hasLoaded
    ? ch.lectures.filter(l => l.type === "dpp").length
    : (ch.dppCount ?? 0);
  const notesCount = ch.notesCount ?? 0;
  const total = lectureCount + dppCount;
  const isStarted = ch.isStarted ?? (total > 0 || notesCount > 0);
  return { lectureCount, dppCount, notesCount, total, isStarted };
}

function extractCatalogBatches(payload: unknown): PWCatalogBatch[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as any;
  const list = Array.isArray(p.data) ? p.data : (Array.isArray(p) ? p : []);
  return list.filter((b: any) => b && (b.batch_id || b.id) && b.name).map((b: any) => ({
    batch_id: String(b.batch_id || b.id || b._id),
    name: String(b.name || b.batchName || "PW Batch"),
    byName: b.byName,
    exam: b.exam,
    class: b.class,
    language: b.language,
    start_date: b.start_date,
    end_date: b.end_date,
    photo: b.photo || (b.imageId?.key ? `https://static.pw.live/${b.imageId.key}` : undefined)
  }));
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Scheduled";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /T|Z|\d{4}-\d{2}-\d{2}/.test(value)) {
    return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  }
  return value;
}

export function cleanChapterTitle(title: string): string {
  return title
    .replace(/^ch(apter)?\s*[-–:]*\s*\d+\s*[-–:]*\s*/i, "")
    .replace(/^\d+[\.\s\-–:]+\s*/, "")
    .replace(/^ch\s*\d+\s*:\s*/i, "")
    .trim() || title;
}

export function getSubjectBadge(name: string): { abbr: string; style: string } {
  const lower = name.toLowerCase();
  if (lower.includes("inorganic")) {
    return {
      abbr: "In",
      style: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
    };
  }
  if (lower.includes("organic")) {
    return {
      abbr: "Or",
      style: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
    };
  }
  if (lower.includes("physical")) {
    return {
      abbr: "Ph",
      style: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
    };
  }
  if (lower.includes("physic")) {
    return {
      abbr: "Ph",
      style: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
    };
  }
  if (lower.includes("math")) {
    return {
      abbr: "Ma",
      style: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800"
    };
  }
  if (lower.includes("biolog") || lower.includes("botany") || lower.includes("zoology")) {
    return {
      abbr: "Bi",
      style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
    };
  }
  return {
    abbr: name.slice(0, 2).toUpperCase(),
    style: "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
  };
}

export function formatSubjectTitle(sub: PWSubject): string {
  const teacher = sub.teachers?.[0]?.name || sub.faculty;
  if (!teacher) return sub.name;
  const lower = sub.name.toLowerCase();
  if (lower.includes("by") || lower.includes("sir")) {
    return sub.name;
  }
  const primaryTeacher = teacher.split("&")[0].trim();
  return `${sub.name} By ${primaryTeacher}`;
}

export function getSubjectProgress(sub: PWSubject, completedMap: Record<string, boolean>): number {
  let total = 0;
  let completed = 0;
  sub.chapters.forEach(ch => {
    if (Array.isArray(ch.lectures) && ch.lectures.length > 0) {
      ch.lectures.forEach(l => {
        total++;
        if (completedMap[l.id]) completed++;
      });
    } else {
      const counts = getChapterCounts(ch);
      total += counts.total;
    }
  });
  if (total === 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function categorizeSubjectContent(allChapters: PWChapter[]) {
  const syllabusChapters: PWChapter[] = [];
  const studyMaterials: PWChapter[] = [];
  const digitalBooks: PWChapter[] = [];

  const studyMaterialRegex = /(pyq|practice|short notes|mind map|summary|revision|discussion|homework|blueprint|bridge|comeback|extra books|ncert|replica|formula|solution|test solution|interaction session|important talk|advanced level|advance session)/i;
  const digitalBooksRegex = /(digital book|ebook|textbook|handbook|module)/i;

  allChapters.forEach(ch => {
    const title = ch.title.trim();
    if (digitalBooksRegex.test(title)) {
      digitalBooks.push(ch);
    } else if (studyMaterialRegex.test(title)) {
      studyMaterials.push(ch);
    } else {
      syllabusChapters.push(ch);
    }
  });

  if (syllabusChapters.length === 0 && studyMaterials.length === 0) {
    return {
      syllabusChapters: allChapters,
      studyMaterials: [],
      digitalBooks: []
    };
  }

  return { syllabusChapters, studyMaterials, digitalBooks };
}

export interface BatchResourceItem {
  id: string;
  tag: string;
  title: string;
  countText: string;
  pdfUrl?: string;
  chapter?: PWChapter;
  type: "pdf" | "chapter" | "schedule";
}

export function extractBatchResources(batch: PWBatch): BatchResourceItem[] {
  const items: BatchResourceItem[] = [];
  let counter = 1;

  if (batch.batchPdf) {
    items.push({
      id: "res-syllabus",
      tag: `RE - ${String(counter++).padStart(2, "0")}`,
      title: `${batch.name} • Official Syllabus Planner`,
      countText: "Only PDF",
      pdfUrl: batch.batchPdf,
      type: "pdf"
    });
  }

  const resourceRegex = /(demo|schedule|planner|telegram|whatsapp|admission|proctored|syllabus|infinity|orientation|guideline|solution)/i;

  batch.subjects.forEach(sub => {
    sub.chapters.forEach(ch => {
      if (resourceRegex.test(ch.title)) {
        const counts = getChapterCounts(ch);
        let countText = "Resource";
        if (counts.lectureCount > 0 && counts.notesCount > 0) {
          countText = `${counts.lectureCount} Lectures • ${counts.notesCount} Notes`;
        } else if (counts.lectureCount > 0) {
          countText = `${counts.lectureCount} Lectures`;
        } else if (counts.notesCount > 0) {
          countText = `${counts.notesCount} Notes • Only PDF`;
        } else {
          countText = "Only PDF";
        }

        items.push({
          id: `res-${ch.id}`,
          tag: `RE - ${String(counter++).padStart(2, "0")}`,
          title: ch.title,
          countText,
          chapter: ch,
          type: "chapter"
        });
      }
    });
  });

  if (items.length < 2) {
    items.push({
      id: "res-schedule-live",
      tag: `RE - ${String(counter++).padStart(2, "0")}`,
      title: "Class Schedule & Daily Live Timetable",
      countText: "Live Tracker",
      type: "schedule"
    });
  }

  return items;
}

export interface SegregatedChapterContent {
  lectures: PWLecture[];
  notes: Array<{
    id: string;
    title: string;
    url: string;
    lectureTitle?: string;
  }>;
  dpps: Array<{
    id: string;
    title: string;
    url: string;
    lectureTitle?: string;
    rawId?: string;
  }>;
}

export function segregateChapterContent(ch: PWChapter): SegregatedChapterContent {
  const lectures: PWLecture[] = [];
  const notes: SegregatedChapterContent["notes"] = [];
  const dpps: SegregatedChapterContent["dpps"] = [];

  const seenNotes = new Set<string>();
  const seenDpps = new Set<string>();

  (ch.lectures || []).forEach((item, idx) => {
    if (item.type !== "dpp") {
      lectures.push(item);
    }

    if (item.allNotes && item.allNotes.length > 0) {
      item.allNotes.forEach((nt, nIdx) => {
        if (nt?.pdf && !seenNotes.has(nt.pdf)) {
          seenNotes.add(nt.pdf);
          notes.push({
            id: `${item.id}-note-${nIdx}`,
            title: nt.note || nt.topic || `${item.title} • Class Notes`,
            url: nt.pdf,
            lectureTitle: item.title,
          });
        }
      });
    } else if (item.pdfUrl || item.notesUrl) {
      const pdf = item.pdfUrl || item.notesUrl;
      if (pdf && !seenNotes.has(pdf) && item.type !== "dpp") {
        seenNotes.add(pdf);
        notes.push({
          id: `${item.id}-note-direct`,
          title: item.attachmentName || `${item.title} • Class Notes`,
          url: pdf,
          lectureTitle: item.title,
        });
      }
    }

    if (item.allDpps && item.allDpps.length > 0) {
      item.allDpps.forEach((dp, dIdx) => {
        if (dp?.pdf && !seenDpps.has(dp.pdf)) {
          seenDpps.add(dp.pdf);
          dpps.push({
            id: `${item.id}-dpp-${dIdx}`,
            title: dp.note || dp.topic || `${item.title} • DPP Sheet`,
            url: dp.pdf,
            lectureTitle: item.title,
            rawId: item.id
          });
        }
      });
    } else if (item.dppPdfUrl || (item.type === "dpp" && (item.pdfUrl || item.notesUrl))) {
      const pdf = item.dppPdfUrl || item.pdfUrl || item.notesUrl;
      if (pdf && !seenDpps.has(pdf)) {
        seenDpps.add(pdf);
        dpps.push({
          id: `${item.id}-dpp-direct`,
          title: item.attachmentName || item.title || `DPP Sheet ${idx + 1}`,
          url: pdf,
          lectureTitle: item.title,
          rawId: item.id
        });
      }
    }
  });

  return { lectures, notes, dpps };
}


// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function PWPage() {
  const { theme } = useAppContext();

  // Navigation & Active View
  const [activeTab, setActiveTab] = useState<"curriculum" | "schedule" | "faculty">("curriculum");
  const [selectedSubject, setSelectedSubject] = useState<PWSubject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<PWChapter | null>(null);

  // Batches
  const [batches, setBatches] = useState<PWBatch[]>([]);
  const [catalogBatches, setCatalogBatches] = useState<PWCatalogBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("pw_selected_batch_id");
      if (saved) return saved;
    } catch {}
    return "698ad3519549b300a5e1cc6a"; // Default: Arjuna JEE 2027
  });

  // Schedule
  const todayIstDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  }, []);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(todayIstDate);
  const [todaySchedule, setTodaySchedule] = useState<PWScheduleItem[]>([]);
  const [dateSchedule, setDateSchedule] = useState<PWScheduleItem[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);

  // Loaders
  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
  const loadingBatchIds = useRef(new Set<string>());

  // Filters & Search
  const [batchModalOpen, setBatchModalOpen] = useState<boolean>(false);
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>("");
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>("");
  const [chapterContentFilter, setChapterContentFilter] = useState<"all" | "lectures" | "dpps" | "notes">("all");
  const [chapterItemSearch, setChapterItemSearch] = useState<string>("");

  // Sub-navigation Tabs matching UIvid.mp4 design
  const [batchSubTab, setBatchSubTab] = useState<"subjects" | "resources">("subjects");
  const [subjectSubTab, setSubjectSubTab] = useState<"chapters" | "materials" | "books">("chapters");
  const [chapterSegregatedTab, setChapterSegregatedTab] = useState<"lectures" | "notes" | "dpps">("lectures");

  // In-App PDF Preview Modal
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string } | null>(null);

  // Completed items map
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("pw_completed_lectures");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    idbGet<Record<string, boolean>>("pw_completed_lectures").then(saved => {
      if (saved) setCompletedMap(prev => ({ ...prev, ...saved }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pw_completed_lectures", JSON.stringify(completedMap));
      idbSet("pw_completed_lectures", completedMap).catch(() => {});
    } catch {}
  }, [completedMap]);

  const toggleCompletion = (itemId: string) => {
    setCompletedMap(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Fetch Public Batch Catalog
  useEffect(() => {
    fetch("/api/pw-catalog", { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setCatalogBatches(extractCatalogBatches(data));
      })
      .catch(() => {});
  }, []);

  // Sync batch change
  useEffect(() => {
    if (selectedBatchId) {
      try {
        localStorage.setItem("pw_selected_batch_id", selectedBatchId);
      } catch {}
      setSelectedSubject(null);
      setSelectedChapter(null);
    }
  }, [selectedBatchId]);

  // Current batch object
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || EMPTY_PW_BATCH;
  }, [batches, selectedBatchId]);

  // Fetch batch metadata live from PW API
  const refreshBatchMetadata = (batchIdToFetch: string = selectedBatchId) => {
    if (!batchIdToFetch || loadingBatchIds.current.has(batchIdToFetch)) return;

    setIsLoadingBatch(true);
    loadingBatchIds.current.add(batchIdToFetch);

    fetch(`/api/pw-metadata?batchId=${encodeURIComponent(batchIdToFetch)}`, { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error(`PW API returned ${res.status}`);
        return res.json();
      })
      .then(payload => {
        const subjects: PWSubject[] = Array.isArray(payload.subjects) ? payload.subjects : [];
        const fetchedBatch: PWBatch = {
          id: payload.batchId || batchIdToFetch,
          name: payload.name || "Physics Wallah Batch",
          target: payload.exam ? `${payload.exam}${payload.class ? ` • Class ${payload.class}` : ""}` : (payload.byName || "PW Preparation"),
          description: (payload.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "Official PW Curriculum",
          batchPdf: payload.batchPdf,
          previewImage: payload.previewImage,
          subjects
        };

        setBatches(prev => {
          const exists = prev.some(b => b.id === batchIdToFetch);
          if (exists) {
            return prev.map(b => b.id === batchIdToFetch ? fetchedBatch : b);
          }
          return [...prev, fetchedBatch];
        });
      })
      .catch(err => {
        console.warn("PW metadata fetch failed:", err);
      })
      .finally(() => {
        setIsLoadingBatch(false);
        loadingBatchIds.current.delete(batchIdToFetch);
      });
  };

  useEffect(() => {
    const existing = batches.find(b => b.id === selectedBatchId);
    if (!existing?.subjects || existing.subjects.length === 0) {
      refreshBatchMetadata(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Fetch today's schedule
  useEffect(() => {
    if (!selectedBatchId) return;
    fetch(`/api/pw-schedule?batchId=${encodeURIComponent(selectedBatchId)}&date=${encodeURIComponent(todayIstDate)}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (payload && Array.isArray(payload.schedules)) {
          setTodaySchedule(payload.schedules);
        }
      })
      .catch(() => {});
  }, [selectedBatchId, todayIstDate]);

  // Fetch schedule for active date
  useEffect(() => {
    if (!selectedBatchId || !selectedScheduleDate) return;
    setIsLoadingSchedule(true);
    fetch(`/api/pw-schedule?batchId=${encodeURIComponent(selectedBatchId)}&date=${encodeURIComponent(selectedScheduleDate)}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (payload && Array.isArray(payload.schedules)) {
          setDateSchedule(payload.schedules);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSchedule(false));
  }, [selectedBatchId, selectedScheduleDate]);

  // Keep selected subject in sync when batch updates
  useEffect(() => {
    if (selectedSubject) {
      const fresh = currentBatch.subjects.find(s => s.id === selectedSubject.id || s.name === selectedSubject.name);
      if (fresh && fresh !== selectedSubject) setSelectedSubject(fresh);
    }
  }, [currentBatch.subjects, selectedSubject]);

  // Keep selected chapter in sync
  useEffect(() => {
    if (selectedChapter && selectedSubject) {
      const freshCh = selectedSubject.chapters.find(c => c.id === selectedChapter.id);
      if (freshCh && freshCh !== selectedChapter) setSelectedChapter(freshCh);
    }
  }, [selectedSubject, selectedChapter]);

  // Open chapter & live fetch detailed lectures/DPPs with real PDFs
  const handleOpenChapter = async (ch: PWChapter) => {
    setChapterItemSearch("");
    setChapterContentFilter("all");
    setChapterSegregatedTab("lectures");
    setSelectedChapter(ch);

    if ((!ch.lectures || ch.lectures.length === 0) && selectedSubject) {
      setLoadingChapterId(ch.id);
      try {
        const rawId = ch.rawId || ch.id;
        const res = await fetch(
          `/api/pw-chapter-contents?batchId=${encodeURIComponent(selectedBatchId)}&subjectId=${encodeURIComponent(selectedSubject.id)}&chapterId=${encodeURIComponent(rawId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.lectures)) {
            const updatedCh: PWChapter = {
              ...ch,
              lectures: data.lectures,
              videoCount: data.totalLectures ?? ch.videoCount,
              dppCount: data.totalDpps ?? ch.dppCount,
              notesCount: data.totalNotes ?? ch.notesCount,
              isStarted: (data.totalLectures > 0 || data.totalDpps > 0)
            };
            setSelectedChapter(updatedCh);
            setBatches(prev => prev.map(b => {
              if (b.id !== selectedBatchId) return b;
              return {
                ...b,
                subjects: b.subjects.map(s => {
                  if (s.id !== selectedSubject.id) return s;
                  return {
                    ...s,
                    chapters: s.chapters.map(c => c.id === ch.id ? updatedCh : c)
                  };
                })
              };
            }));
          }
        }
      } catch (err) {
        console.warn("Failed loading chapter contents:", err);
      } finally {
        setLoadingChapterId(null);
      }
    }
  };

  // Overall batch statistics
  const overallStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    currentBatch.subjects.forEach(sub => {
      sub.chapters.forEach(ch => {
        const counts = getChapterCounts(ch);
        totalItems += counts.total;
        if (Array.isArray(ch.lectures)) {
          ch.lectures.forEach(l => {
            if (completedMap[l.id]) completedItems++;
          });
        }
      });
    });
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, percentage };
  }, [currentBatch.subjects, completedMap]);

  // Today Schedule status
  const todayStatus = useMemo(() => {
    if (todaySchedule.length === 0) {
      return { type: "NO_CLASSES", title: "No Classes Scheduled Today", desc: "Today is a dedicated self-study day for this batch. Complete pending DPPs or review chapter notes." };
    }
    const hasLive = todaySchedule.some(s => s.isLive || s.tag?.toLowerCase() === "live");
    if (hasLive) {
      return { type: "LIVE", title: "Live Classes Streaming Now", desc: "Live lectures are currently underway on Physics Wallah." };
    }
    const allEnded = todaySchedule.every(s => s.isEnded || s.tag?.toLowerCase() === "ended");
    if (allEnded) {
      return { type: "ENDED", title: "Today's Classes Ended", desc: `All ${todaySchedule.length} sessions for today have concluded. All lecture notes and DPP sheet PDFs are available below.` };
    }
    const endedCount = todaySchedule.filter(s => s.isEnded || s.tag?.toLowerCase() === "ended").length;
    return { type: "IN_PROGRESS", title: "Today's Schedule Active", desc: `${endedCount} of ${todaySchedule.length} classes completed. Completed notes and DPPs are available below.` };
  }, [todaySchedule]);

  // Screen 1: Batch Resources
  const batchResources = useMemo(() => {
    return extractBatchResources(currentBatch);
  }, [currentBatch]);

  // Screen 2: Categorized Subject Content (Chapters, Study Materials, Digital Books)
  const activeSubjectCategorized = useMemo(() => {
    if (!selectedSubject) return { syllabusChapters: [], studyMaterials: [], digitalBooks: [] };
    return categorizeSubjectContent(selectedSubject.chapters || []);
  }, [selectedSubject]);

  const filteredSyllabusChapters = useMemo(() => {
    const list = activeSubjectCategorized.syllabusChapters;
    if (!chapterSearchQuery.trim()) return list;
    const q = chapterSearchQuery.toLowerCase();
    return list.filter(c => c.title.toLowerCase().includes(q));
  }, [activeSubjectCategorized.syllabusChapters, chapterSearchQuery]);

  const filteredStudyMaterials = useMemo(() => {
    const list = activeSubjectCategorized.studyMaterials;
    if (!chapterSearchQuery.trim()) return list;
    const q = chapterSearchQuery.toLowerCase();
    return list.filter(c => c.title.toLowerCase().includes(q));
  }, [activeSubjectCategorized.studyMaterials, chapterSearchQuery]);

  const filteredDigitalBooks = useMemo(() => {
    const list = activeSubjectCategorized.digitalBooks;
    if (!chapterSearchQuery.trim()) return list;
    const q = chapterSearchQuery.toLowerCase();
    return list.filter(c => c.title.toLowerCase().includes(q));
  }, [activeSubjectCategorized.digitalBooks, chapterSearchQuery]);

  // Screen 3: Segregated Chapter Content (Lectures, Notes, DPPs)
  const segregatedContent = useMemo(() => {
    if (!selectedChapter) return { lectures: [], notes: [], dpps: [] };
    return segregateChapterContent(selectedChapter);
  }, [selectedChapter]);

  // Filtered batch catalog
  const filteredCatalog = useMemo(() => {
    if (!batchSearchQuery.trim()) return catalogBatches.slice(0, 36);
    const q = batchSearchQuery.toLowerCase();
    return catalogBatches.filter(b => {
      return (
        b.name.toLowerCase().includes(q) ||
        (b.exam && b.exam.toLowerCase().includes(q)) ||
        (b.class && b.class.toLowerCase().includes(q))
      );
    }).slice(0, 48);
  }, [catalogBatches, batchSearchQuery]);

  // Helper to open PDF either in in-app modal or direct tab
  const openPdf = (url?: string, title: string = "Physics Wallah Document") => {
    if (!url) return;
    setActivePdfModal({ url, title });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors pb-24">
      {/* ── TOP HEADER / BATCH BAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Brand Identity & Active Batch Info */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Authentic PW squircle badge */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0 tracking-tighter">
                PW
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {currentBatch.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Official PW
                  </span>
                  {currentBatch.target && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {currentBatch.target}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                  {currentBatch.description || "Live curriculum from Physics Wallah"}
                </p>
              </div>
            </div>

            {/* Right: Actions (Switch Batch, Refresh, Syllabus PDF, Progress) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {/* Batch Syllabus PDF */}
              {currentBatch.batchPdf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPdf(currentBatch.batchPdf, `${currentBatch.name} • Official Syllabus`)}
                  className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Batch</span> Syllabus
                </Button>
              )}

              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                disabled={isLoadingBatch}
                onClick={() => refreshBatchMetadata(selectedBatchId)}
                className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                title="Refresh batch live contents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBatch ? "animate-spin text-amber-500" : ""}`} />
              </Button>

              {/* Switch Batch Dialog Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(true)}
                className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400"
              >
                <Layers className="w-3.5 h-3.5" />
                Switch Batch
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>

              {/* Overall Progress pill */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-medium">
                <span className="text-slate-500 dark:text-zinc-400">Progress:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {overallStats.percentage}%
                </span>
                <span className="text-slate-400 dark:text-zinc-500 text-[11px]">
                  ({overallStats.completedItems}/{overallStats.totalItems})
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-900 overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setActiveTab("curriculum"); setSelectedChapter(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "curriculum"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Chapters & Lectures
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 relative ${
                activeTab === "schedule"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Live Timetable & Today
              {todayStatus.type === "LIVE" && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
              {todayStatus.type === "ENDED" && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                  Ended
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("faculty")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "faculty"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Faculty Members ({currentBatch.subjects.reduce((acc, s) => acc + (s.teachers?.length || 0), 0)})
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-16">
        {/* ================================================================= */}
        {/* TAB 1: CURRICULUM & CHAPTERS                                      */}
        {/* ================================================================= */}
        {activeTab === "curriculum" && (
          <div className="space-y-5">
            {/* SCREEN 1: BATCH LEVEL (Subjects & Resources) */}
            {!selectedSubject ? (
              <div className="space-y-5">
                {/* Screen 1 Sub-Tab Switcher: [Subjects] [Resources] */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800/80 w-fit">
                    <button
                      onClick={() => setBatchSubTab("subjects")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        batchSubTab === "subjects"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      Subjects ({currentBatch.subjects.length})
                    </button>
                    <button
                      onClick={() => setBatchSubTab("resources")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        batchSubTab === "resources"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                      Resources ({batchResources.length})
                    </button>
                  </div>

                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    Click any subject to view segregated chapters, notes & DPPs
                  </span>
                </div>

                {/* SubTab 1: SUBJECTS GRID */}
                {batchSubTab === "subjects" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentBatch.subjects.map(sub => {
                      const badge = getSubjectBadge(sub.name);
                      const title = formatSubjectTitle(sub);
                      const progress = getSubjectProgress(sub, completedMap);
                      const teacherName = sub.teachers?.[0]?.name || sub.faculty || "PW Faculty";

                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubject(sub);
                            setSelectedChapter(null);
                            setSubjectSubTab("chapters");
                            setChapterSearchQuery("");
                          }}
                          className="group p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              {/* 2-Letter Colored Badge (Ph, Ma, In, Or, etc.) */}
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 tracking-tight shadow-2xs ${badge.style}`}>
                                {badge.abbr}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                                  {title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                                  {sub.chapters.length} Chapters • {teacherName}
                                </p>
                              </div>
                            </div>

                            {/* Chevron Right */}
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 flex items-center justify-center shrink-0 transition-colors">
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>

                          {/* Mini Progress Bar & Percentage */}
                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1.5">
                              <span>Syllabus Progress</span>
                              <span className="font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SubTab 2: RESOURCES GRID */}
                {batchSubTab === "resources" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batchResources.map(res => (
                      <div
                        key={res.id}
                        onClick={() => {
                          if (res.type === "pdf" && res.pdfUrl) {
                            openPdf(res.pdfUrl, res.title);
                          } else if (res.type === "schedule") {
                            setActiveTab("schedule");
                          } else if (res.type === "chapter" && res.chapter) {
                            const foundSub = currentBatch.subjects.find(s => s.chapters.some(c => c.id === res.chapter!.id));
                            if (foundSub) setSelectedSubject(foundSub);
                            handleOpenChapter(res.chapter);
                          }
                        }}
                        className="group p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <span className="px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            {res.tag}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                              {res.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                              {res.countText}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : !selectedChapter ? (
              /* SCREEN 2: SUBJECT LEVEL (Chapters, Study Material, Digital Books) */
              <div className="space-y-5">
                {/* Back to Subjects & Subject Title Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedSubject(null); setChapterSearchQuery(""); }}
                      className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Subjects
                    </Button>

                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {formatSubjectTitle(selectedSubject)}
                      </h2>
                    </div>
                  </div>

                  {selectedSubject.syllabusPdf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPdf(selectedSubject.syllabusPdf, `${selectedSubject.name} • Syllabus Roadmap`)}
                      className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      Syllabus Planner PDF
                    </Button>
                  )}
                </div>

                {/* Sub-Tab Bar matching UIvid.mp4: [Chapters] [Study Material] [Digital Books] + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800/80 w-fit">
                    <button
                      onClick={() => setSubjectSubTab("chapters")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        subjectSubTab === "chapters"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Chapters ({activeSubjectCategorized.syllabusChapters.length})
                    </button>
                    <button
                      onClick={() => setSubjectSubTab("materials")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        subjectSubTab === "materials"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Study Material ({activeSubjectCategorized.studyMaterials.length})
                    </button>
                    <button
                      onClick={() => setSubjectSubTab("books")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        subjectSubTab === "books"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Digital Books ({activeSubjectCategorized.digitalBooks.length})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={chapterSearchQuery}
                      onChange={(e) => setChapterSearchQuery(e.target.value)}
                      placeholder="Search in this subject..."
                      className="h-8 pl-8 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* SubTab 1 Content: Chapters Grid */}
                {subjectSubTab === "chapters" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredSyllabusChapters.length === 0 ? (
                      <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                        No chapters found matching "{chapterSearchQuery}".
                      </div>
                    ) : (
                      filteredSyllabusChapters.map((ch, idx) => {
                        const counts = getChapterCounts(ch);
                        const cleanTitle = cleanChapterTitle(ch.title);
                        const hasLecs = Array.isArray(ch.lectures) && ch.lectures.length > 0;
                        const completedCount = hasLecs
                          ? ch.lectures.filter(l => completedMap[l.id]).length
                          : 0;

                        return (
                          <div
                            key={ch.id}
                            onClick={() => handleOpenChapter(ch)}
                            className="group p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Tag: CH - 01 */}
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-mono font-bold shrink-0 mt-0.5">
                                CH - {String(idx + 1).padStart(2, "0")}
                              </span>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                                  {cleanTitle}
                                </h3>

                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                                  {counts.isStarted ? (
                                    <>
                                      <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                        Lecture: {completedCount}/{counts.lectureCount}
                                      </span>
                                      <span>•</span>
                                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                                        DPP: 0/{counts.dppCount}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                      Upcoming Chapter
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* SubTab 2 Content: Study Material Grid */}
                {subjectSubTab === "materials" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredStudyMaterials.length === 0 ? (
                      <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                        {activeSubjectCategorized.studyMaterials.length === 0
                          ? "No separate study materials identified for this subject. All materials are organized inside chapter tabs."
                          : `No materials found matching "${chapterSearchQuery}".`}
                      </div>
                    ) : (
                      filteredStudyMaterials.map((ch, idx) => {
                        const counts = getChapterCounts(ch);
                        const cleanTitle = cleanChapterTitle(ch.title);

                        return (
                          <div
                            key={ch.id}
                            onClick={() => handleOpenChapter(ch)}
                            className="group p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold shrink-0 mt-0.5">
                                SM - {String(idx + 1).padStart(2, "0")}
                              </span>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                                  {cleanTitle}
                                </h3>

                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                                  {counts.notesCount > 0 && <span>{counts.notesCount} Notes</span>}
                                  {counts.dppCount > 0 && <span>• {counts.dppCount} DPPs</span>}
                                  {counts.lectureCount > 0 && <span>• {counts.lectureCount} Lectures</span>}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* SubTab 3 Content: Digital Books Grid */}
                {subjectSubTab === "books" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredDigitalBooks.length === 0 ? (
                      <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                        {activeSubjectCategorized.digitalBooks.length === 0
                          ? "Digital books and modules for this subject are available in the batch resources tab."
                          : `No digital books found matching "${chapterSearchQuery}".`}
                      </div>
                    ) : (
                      filteredDigitalBooks.map((ch, idx) => {
                        const cleanTitle = cleanChapterTitle(ch.title);

                        return (
                          <div
                            key={ch.id}
                            onClick={() => handleOpenChapter(ch)}
                            className="group p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-mono font-bold shrink-0 mt-0.5">
                                DB - {String(idx + 1).padStart(2, "0")}
                              </span>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug line-clamp-2">
                                  {cleanTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                                  Digital Module & E-Book
                                </p>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* SCREEN 3: CHAPTER CONTENT SEGREGATED LEVEL (Lectures, Notes, DPPs) */
              <div className="space-y-4">
                {/* Back to Chapters button bar */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedChapter(null); setChapterItemSearch(""); }}
                    className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Chapters
                  </Button>

                  <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate">
                    {selectedSubject.name} • <span className="text-slate-900 dark:text-white font-semibold">{cleanChapterTitle(selectedChapter.title)}</span>
                  </div>
                </div>

                {/* Chapter Banner Card */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Active Chapter
                        </span>
                        <span className="text-xs text-slate-400 dark:text-zinc-500">
                          {selectedSubject.teachers?.[0]?.name || selectedSubject.faculty || "PW Faculty"}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {cleanChapterTitle(selectedChapter.title)}
                      </h2>
                    </div>

                    {/* Counts Summary */}
                    <div className="flex items-center gap-2.5 text-xs flex-wrap">
                      <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                        <span>Lectures: </span>
                        <span className="font-bold font-mono">
                          {segregatedContent.lectures.length || getChapterCounts(selectedChapter).lectureCount}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                        <span>Class Notes: </span>
                        <span className="font-bold font-mono">
                          {segregatedContent.notes.length || getChapterCounts(selectedChapter).notesCount}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
                        <span>DPP Sheets: </span>
                        <span className="font-bold font-mono">
                          {segregatedContent.dpps.length || getChapterCounts(selectedChapter).dppCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Segregated Content Tabs matching UIvid.mp4 + Item Filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 w-fit">
                      <button
                        onClick={() => setChapterSegregatedTab("lectures")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          chapterSegregatedTab === "lectures"
                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
                        Lectures ({segregatedContent.lectures.length})
                      </button>

                      <button
                        onClick={() => setChapterSegregatedTab("notes")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          chapterSegregatedTab === "notes"
                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <FileText className="w-3 h-3 text-amber-500" />
                        Class Notes ({segregatedContent.notes.length})
                      </button>

                      <button
                        onClick={() => setChapterSegregatedTab("dpps")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          chapterSegregatedTab === "dpps"
                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <FileDown className="w-3 h-3 text-purple-500" />
                        DPP Sheets & Solutions ({segregatedContent.dpps.length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={chapterItemSearch}
                        onChange={(e) => setChapterItemSearch(e.target.value)}
                        placeholder="Search items..."
                        className="h-8 pl-8 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Chapter Segregated Content Body */}
                <div className="space-y-2.5">
                  {loadingChapterId === selectedChapter.id ? (
                    <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        Extracting verified lectures, notes & DPP PDFs...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        Connecting directly to Physics Wallah live attachment engine
                      </p>
                    </div>
                  ) : chapterSegregatedTab === "lectures" ? (
                    (() => {
                      let items = segregatedContent.lectures;
                      if (chapterItemSearch.trim()) {
                        const q = chapterItemSearch.toLowerCase();
                        items = items.filter(i => i.title.toLowerCase().includes(q));
                      }

                      if (items.length === 0) {
                        return (
                          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                            No lectures found matching your search.
                          </div>
                        );
                      }

                      return items.map((item, iIdx) => {
                        const isChecked = Boolean(completedMap[item.id]);
                        const notesPdf = item.pdfUrl || item.notesUrl;
                        const dppPdf = item.dppPdfUrl;

                        return (
                          <div
                            key={item.id || iIdx}
                            className={`p-3.5 sm:px-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isChecked
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-slate-500 dark:text-zinc-400"
                                : "bg-white dark:bg-zinc-900/70 hover:bg-slate-50 dark:hover:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 text-slate-900 dark:text-white shadow-xs"
                            }`}
                          >
                            {/* Checkbox & Title */}
                            <div
                              onClick={() => toggleCompletion(item.id)}
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? "bg-emerald-500 border-emerald-500 text-white font-bold"
                                  : "border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 hover:border-slate-400"
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className={`text-xs sm:text-sm font-semibold leading-tight ${
                                  isChecked ? "line-through text-slate-400 dark:text-zinc-500" : "text-slate-900 dark:text-zinc-100"
                                }`}>
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                                  {item.duration && (
                                    <span className="inline-flex items-center gap-1 font-mono">
                                      ⏱ {item.duration}
                                    </span>
                                  )}
                                  {item.date && (
                                    <span>• 📅 {item.date.split("T")[0]}</span>
                                  )}
                                  {item.faculty && (
                                    <span>• 👨‍🏫 {item.faculty}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Notes PDF & DPP PDF */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                              {notesPdf && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPdf(notesPdf, `${item.title} • Class Notes PDF`);
                                  }}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  title="Open verified PW Class Notes PDF"
                                >
                                  <FileText className="w-3 h-3 text-amber-500" />
                                  Notes PDF
                                </Button>
                              )}

                              {dppPdf && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPdf(dppPdf, `${item.title} • DPP Sheet PDF`);
                                  }}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 hover:bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                  title="Open verified PW DPP Sheet PDF"
                                >
                                  <FileDown className="w-3 h-3 text-purple-500" />
                                  DPP PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : chapterSegregatedTab === "notes" ? (
                    (() => {
                      let items = segregatedContent.notes;
                      if (chapterItemSearch.trim()) {
                        const q = chapterItemSearch.toLowerCase();
                        items = items.filter(n => n.title.toLowerCase().includes(q) || (n.lectureTitle && n.lectureTitle.toLowerCase().includes(q)));
                      }

                      if (items.length === 0) {
                        return (
                          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                            {segregatedContent.notes.length === 0
                              ? "No class notes have been uploaded for this chapter yet. They will appear here immediately once live class concludes."
                              : "No class notes found matching your search."}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {items.map((note) => (
                            <div
                              key={note.id}
                              onClick={() => openPdf(note.url, note.title)}
                              className="group p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                                    {note.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                    {note.lectureTitle ? `Attached to: ${note.lectureTitle}` : "Verified Class Notes PDF"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPdf(note.url, note.title);
                                  }}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
                                >
                                  <Eye className="w-3 h-3 mr-1 text-slate-500" />
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      let items = segregatedContent.dpps;
                      if (chapterItemSearch.trim()) {
                        const q = chapterItemSearch.toLowerCase();
                        items = items.filter(d => d.title.toLowerCase().includes(q) || (d.lectureTitle && d.lectureTitle.toLowerCase().includes(q)));
                      }

                      if (items.length === 0) {
                        return (
                          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                            {segregatedContent.dpps.length === 0
                              ? "No DPP sheets have been attached to this chapter yet. Daily practice problem sheets are updated alongside live lectures."
                              : "No DPP sheets found matching your search."}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {items.map((dpp) => {
                            const isDppSolved = Boolean(completedMap[dpp.id] || (dpp.rawId && completedMap[dpp.rawId]));

                            return (
                              <div
                                key={dpp.id}
                                className="group p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* DPP solved toggle */}
                                  <div
                                    onClick={() => toggleCompletion(dpp.id)}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                      isDppSolved
                                        ? "bg-purple-600 border-purple-600 text-white font-bold"
                                        : "border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-zinc-900 hover:border-purple-500"
                                    }`}
                                    title="Mark DPP as Solved"
                                  >
                                    {isDppSolved && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>

                                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <FileDown className="w-5 h-5" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h4 className={`font-bold text-xs sm:text-sm leading-tight line-clamp-1 ${
                                      isDppSolved ? "line-through text-slate-400 dark:text-zinc-500" : "text-slate-900 dark:text-zinc-100"
                                    }`}>
                                      {dpp.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                                      {dpp.lectureTitle ? `Attached to: ${dpp.lectureTitle}` : "Daily Practice Problem Sheet & Solution"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPdf(dpp.url, dpp.title)}
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-semibold border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                                  >
                                    <Eye className="w-3 h-3 mr-1 text-purple-500" />
                                    View DPP
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: LIVE SCHEDULE & TODAY'S FEED                               */}
        {/* ================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-5">
            {/* Status Alert Banner */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
              todayStatus.type === "LIVE"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
                : todayStatus.type === "ENDED"
                ? "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
                : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs">
                  {todayStatus.type === "LIVE" ? (
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  ) : todayStatus.type === "ENDED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Calendar className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {todayStatus.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {todayStatus.type === "ENDED" ? "Completed" : (todayStatus.type === "LIVE" ? "Live" : "Schedule")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                    {todayStatus.desc}
                  </p>
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScheduleDate(todayIstDate)}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    selectedScheduleDate === todayIstDate
                      ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 border-slate-900 dark:border-white"
                      : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200"
                  }`}
                >
                  Today (IST)
                </Button>
                <Input
                  type="date"
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg w-36 font-mono"
                />
              </div>
            </div>

            {/* Schedule List */}
            <div className="space-y-3">
              {isLoadingSchedule ? (
                <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                    Loading timetable for {selectedScheduleDate}...
                  </p>
                </div>
              ) : dateSchedule.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/30">
                  No classes scheduled for {selectedScheduleDate}.
                </div>
              ) : (
                dateSchedule.map((item, idx) => {
                  const isEnded = item.isEnded || item.tag?.toLowerCase() === "ended";
                  const isLive = item.isLive || item.tag?.toLowerCase() === "live";

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Time Box */}
                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex flex-col items-center justify-center shrink-0">
                          <span className="font-bold text-xs font-mono text-slate-800 dark:text-zinc-200">
                            {formatScheduleTime(item.startTime)}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                            {item.duration || "1h 45m"}
                          </span>
                        </div>

                        {/* Class Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              {item.subject}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                              👨‍🏫 {item.teacher}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100 mt-1 leading-snug">
                            {item.topic}
                          </h4>

                          {item.chapter && (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                              Chapter: {item.chapter}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Pill & PDFs */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                        {isEnded ? (
                          <Badge variant="outline" className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700">
                            Class Ended
                          </Badge>
                        ) : isLive ? (
                          <Badge className="text-[11px] font-bold bg-emerald-500 text-white gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            Live Now
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                            Upcoming
                          </Badge>
                        )}

                        {/* Verified Notes PDF Button */}
                        {item.notesUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPdf(item.notesUrl, `${item.topic} • Class Notes`)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 border-red-500/30 bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/15 text-red-700 dark:text-red-300"
                          >
                            <FileText className="w-3 h-3 text-red-500" />
                            Notes PDF
                          </Button>
                        )}

                        {/* Verified DPP PDF Button */}
                        {item.dppPdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPdf(item.dppPdfUrl, `${item.topic} • DPP PDF`)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 hover:bg-purple-500/15 text-purple-700 dark:text-purple-300"
                          >
                            <FileDown className="w-3 h-3 text-purple-500" />
                            DPP PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: FACULTY & TEACHERS                                         */}
        {/* ================================================================= */}
        {activeTab === "faculty" && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Official Faculty for {currentBatch.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Every teacher provides verified video lectures, handwritten class notes, and daily practice problem (DPP) sheets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentBatch.subjects.flatMap(s => (s.teachers || []).map(t => ({ ...t, subjectName: s.name, syllabusPdf: s.syllabusPdf }))).map((teacher, tIdx) => (
                <div
                  key={teacher._id || tIdx}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {teacher.imageUrl ? (
                      <img
                        src={teacher.imageUrl}
                        alt={teacher.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-lg flex items-center justify-center shrink-0">
                        {teacher.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                        {teacher.subjectName}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1 leading-snug">
                        {teacher.name}
                      </h4>
                      {teacher.featuredLine && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                          {teacher.featuredLine}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                    <span>{teacher.experience || "Expert Faculty"}</span>
                    {teacher.syllabusPdf && (
                      <button
                        onClick={() => openPdf(teacher.syllabusPdf, `${teacher.name} • Syllabus Roadmap`)}
                        className="font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Syllabus PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── BATCH SWITCHER MODAL ───────────────────────────────────────────── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Switch Physics Wallah Batch
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Select any live batch to fetch all faculties, chapters, and verified PDFs
                </p>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  placeholder="Search batches (e.g. Arjuna JEE 2027, Lakshya, Prayas)..."
                  className="pl-9 h-10 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            {/* Batch List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCatalog.map(b => {
                const isCurrent = b.batch_id === selectedBatchId;

                return (
                  <div
                    key={b.batch_id}
                    onClick={() => {
                      setSelectedBatchId(b.batch_id);
                      setBatchModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                        : "bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm leading-tight truncate">
                        {b.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        {b.exam && <span>🎯 {b.exam}</span>}
                        {b.class && <span>• Class {b.class}</span>}
                        {b.language && <span>• {b.language}</span>}
                      </div>
                    </div>

                    {isCurrent ? (
                      <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                        Active
                      </Badge>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── IN-APP PDF VIEWER MODAL ────────────────────────────────────────── */}
      {activePdfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-t-2xl p-3 sm:px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {activePdfModal.title}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(activePdfModal.url, "_blank", "noopener,noreferrer")}
                className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Fullscreen
              </Button>

              <a
                href={activePdfModal.url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>

              <button
                onClick={() => setActivePdfModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe View */}
          <div className="flex-1 bg-slate-100 dark:bg-zinc-950 rounded-b-2xl overflow-hidden border-x border-b border-slate-200 dark:border-zinc-800 relative">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(activePdfModal.url)}&embedded=true`}
              title={activePdfModal.title}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
