import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Layers, 
  FileQuestion, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Flame, 
  Atom, 
  Check, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Bookmark, 
  FileText, 
  Video, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Play,
  Zap, 
  Award, 
  Calendar, 
  SlidersHorizontal, 
  Search, 
  RotateCcw, 
  CheckSquare, 
  Square,
  TrendingUp,
  ListTodo,
  MoreVertical,
  UserCheck,
  Users,
  BookMarked,
  ExternalLink,
  MessageSquare,
  Trophy,
  Filter,
  X,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppContext, SelectedGoal } from "@/context/AppContext";
import QuestionsPage from "@/pages/QuestionsPage";
import { idbGet, idbSet } from "@/lib/idb";

type OthersSubView = "hub" | "questions" | "pw";

interface PWLecture {
  id: string;
  title: string;
  type: "lecture" | "dpp" | "revision" | "doubt";
  duration?: string;
  date?: string;
  pdfUrl?: string;
  notesUrl?: string;
  dppPdfUrl?: string;
  videoUrl?: string;
}

interface PWChapter {
  id: string;
  title: string;
  lectures: PWLecture[];
}

interface PWSubject {
  name: string;
  faculty?: string;
  chapters: PWChapter[];
}

interface PWRemoteSubject {
  id: string;
  name: string;
  faculty?: string;
}

interface PWBatch {
  id: string;
  name: string;
  target: string;
  description: string;
  subjects: PWSubject[];
}

interface PWScheduleItem {
  id: string;
  type?: "LECTURE" | "NOTES" | string;
  subject: string;
  rawSubject?: string;
  teacher: string;
  teacherImage?: string;
  topic: string;
  chapter?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  time?: string;
  status?: string;
  tag?: string;
  isLive?: boolean;
  isUpcoming?: boolean;
  dppTitle?: string;
}

interface PWCatalogBatch {
  batch_id: string;
  name: string;
  byName?: string;
  exam?: string;
  class?: string;
  language?: string;
  start_date?: string;
  end_date?: string;
}

const PW_CATALOG_URL = "https://studystark.github.io/batches/batches.json";
const PW_DETAILS_URL = "https://vidcloud.eu.org/api/v3/batches";
const PW_TOPICS_URL = "https://vidcloud.eu.org/api/v2/batches";
const PW_TOKEN_URL = "https://vidcloud.eu.org/generate_token.php";
const EMPTY_PW_BATCH: PWBatch = {
  id: "",
  name: "Physics Wallah batches",
  target: "Select a batch",
  description: "Live batch metadata will appear here.",
  subjects: [],
};

async function fetchBatchMetadata(batchId: string): Promise<PWSubject[]> {
  try {
    const cached = await idbGet<PWSubject[]>(`pw_meta_${batchId}`);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch {}

  const response = await fetch(`/api/pw-metadata?batchId=${encodeURIComponent(batchId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`PW metadata unavailable (${response.status})`);
  const payload = await response.json() as { subjects?: PWSubject[] };
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  if (subjects.length > 0) {
    idbSet(`pw_meta_${batchId}`, subjects).catch(() => {});
  }
  return subjects;
}

// ─── PW DISCIPLINE & BADGE HELPERS ──────────────────────────────────────────
function getSubjectDiscipline(subjectName: string): string {
  const s = subjectName.toLowerCase();
  if (s.includes("physical chem") || s.includes("pc")) return "Physical Chemistry";
  if (s.includes("inorganic chem") || s.includes("ioc")) return "Inorganic Chemistry";
  if (s.includes("organic chem") || s.includes("oc")) return "Organic Chemistry";
  if (s.includes("chem")) return "Chemistry";
  if (s.includes("phys")) return "Physics";
  if (s.includes("math")) return "Mathematics";
  if (s.includes("botany")) return "Botany";
  if (s.includes("zoology")) return "Zoology";
  if (s.includes("bio")) return "Biology";
  const beforeBy = subjectName.split(/\bby\b/i)[0].trim();
  return beforeBy || "General";
}

function getSubjectBadge(subjectName: string): { label: string; bg: string; text: string; border: string } {
  const s = subjectName.toLowerCase();
  if (s.includes("physical chem") || s.includes("pc")) {
    return { label: "Ch", bg: "bg-emerald-500/15 dark:bg-emerald-500/25", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30" };
  }
  if (s.includes("inorganic chem") || s.includes("ioc")) {
    return { label: "In", bg: "bg-teal-500/15 dark:bg-teal-500/25", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/30" };
  }
  if (s.includes("organic chem") || s.includes("oc")) {
    return { label: "Or", bg: "bg-amber-500/15 dark:bg-amber-500/25", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" };
  }
  if (s.includes("chem")) {
    return { label: "Ch", bg: "bg-emerald-500/15 dark:bg-emerald-500/25", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30" };
  }
  if (s.includes("phys")) {
    return { label: "Ph", bg: "bg-blue-500/15 dark:bg-blue-500/25", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/30" };
  }
  if (s.includes("math")) {
    return { label: "Ma", bg: "bg-purple-500/15 dark:bg-purple-500/25", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/30" };
  }
  if (s.includes("bio") || s.includes("botany") || s.includes("zoology")) {
    return { label: "Bi", bg: "bg-rose-500/15 dark:bg-rose-500/25", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/30" };
  }
  return { label: subjectName.slice(0, 2).toUpperCase(), bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
}

function isStudyMaterialChapter(title: string): boolean {
  return /only\s+pdf|only\s+video|demo\s+videos?|short\s+notes|mind\s+maps?|pyq\s+practice\s+sheet|quick\s+revision|bridge\s+course|replica\s+sheet|parakram\s+solution|ncert\s+discussion|homework\s+discussion|summary\s+lecture/i.test(title);
}

interface SuggestedBatchInfo {
  id: string;
  name: string;
  badge?: string;
  target?: string;
  isPrimary?: boolean;
}

function getGoalSuggestedBatches(
  selectedGoal: SelectedGoal | null,
  _catalogBatches: PWCatalogBatch[]
): SuggestedBatchInfo[] {
  const goalStr = `${selectedGoal?.category || ""} ${selectedGoal?.displayName || ""} ${(selectedGoal?.path || []).join(" ")}`.toLowerCase();

  const isClass11 = goalStr.includes("11") || goalStr.includes("2027") || goalStr.includes("2028") || goalStr.includes("arjuna");
  const isClass12 = goalStr.includes("12") || goalStr.includes("lakshya");
  const isDropper = goalStr.includes("drop") || goalStr.includes("repeat") || goalStr.includes("prayas");
  const isNeet = goalStr.includes("neet") || goalStr.includes("medical");

  if (isNeet) {
    if (isClass11) {
      return [
        { id: "67738e4cfd376db122d5a876", name: "Arjuna NEET 2027", badge: "Class 11", isPrimary: true },
        { id: "686e179074ee3585f88d566f", name: "Arjuna Power NEET 2027", badge: "Class 11" },
        { id: "678214ed354cbd5d79c48cd8", name: "Arjuna NEET Hindi 2027", badge: "Hindi" },
        { id: "684320c01147f14a92a56c21", name: "Arjuna NEET 2.0 2027", badge: "2.0" },
      ];
    }
    if (isClass12) {
      return [
        { id: "6644485eb034030018a1bf1b", name: "Lakshya NEET 2026", badge: "Class 12", isPrimary: true },
        { id: "6613d2fbc625030018dc330d", name: "Lakshya NEET 2.0 2026", badge: "2.0" },
        { id: "67626d2969e22ef8fe2c5a29", name: "Lakshya NEET AIR Recorded", badge: "AIR" },
      ];
    }
    return [
      { id: "6614dc3ec82d6b001824a7ba", name: "Yakeen NEET 2026", badge: "Dropper", isPrimary: true },
      { id: "66275ef9505a76001844b245", name: "Yakeen NEET 2.0 2026", badge: "2.0" },
      { id: "676262745b1ff583ca25bb89", name: "Yakeen NEET 3.0 2026", badge: "3.0" },
    ];
  }

  if (isDropper) {
    return [
      { id: "65d86238fb2810001895eab8", name: "Prayas JEE 2026", badge: "Dropper", isPrimary: true },
      { id: "66275ef9505a76001844b245", name: "Prayas JEE 2.0 2026", badge: "2.0" },
      { id: "676262745b1ff583ca25bb89", name: "Prayas JEE 3.0 2026", badge: "3.0" },
      { id: "67626d2969e22ef8fe2c5a29", name: "Prayas JEE AIR Recorded", badge: "AIR" },
    ];
  }

  if (isClass12) {
    return [
      { id: "65d862392b1da90018ad8f3b", name: "Lakshya JEE 2026", badge: "Class 12", isPrimary: true },
      { id: "6613d2fbc625030018dc330d", name: "Lakshya JEE 2.0 2026", badge: "2.0" },
      { id: "673af27c87f8c1497d4fa4bf", name: "Lakshya JEE 3.0 2026", badge: "3.0" },
      { id: "67626d2969e22ef8fe2c5a29", name: "Lakshya JEE AIR Recorded", badge: "AIR" },
    ];
  }

  // Default: Class 11th JEE -> Arjuna JEE 2027!
  return [
    { id: "698ad3519549b300a5e1cc6a", name: "Arjuna JEE 2027", badge: "Class 11 (Recommended)", isPrimary: true },
    { id: "67626d2969e22ef8fe2c5a29", name: "Arjuna JEE 2.0 2027", badge: "2.0" },
    { id: "676262745b1ff583ca25bb89", name: "Arjuna JEE 3.0 2027", badge: "3.0" },
    { id: "673af27c87f8c1497d4fa4bf", name: "Arjuna JEE 4.0 2027", badge: "4.0" },
    { id: "6826b67b9354ed4bb9f31756", name: "Arjuna JEE AIR Recorded 2027", badge: "AIR" },
  ];
}

const BATCH_RESOURCES = [
  { id: "re-01", code: "RE - 01", title: "Batch Demo Videos", desc: "Watch sample lectures & teaching methodology", icon: Play, action: "demo" },
  { id: "re-02", code: "RE - 02", title: "Infinity Pro", desc: "1-on-1 mentorship, doubt solving & live practice", icon: Sparkles, action: "infinity" },
  { id: "re-03", code: "RE - 03", title: "Class Schedule", desc: "Live class timetable & weekly interactive calendar", icon: Calendar, action: "schedule" },
  { id: "re-04", code: "RE - 04", title: "Lecture Planner", desc: "Detailed syllabus roadmaps & lecture sequence", icon: FileText, action: "planner" },
  { id: "re-05", code: "RE - 05", title: "Test Planner", desc: "Schedule of minor, part & full syllabus tests", icon: Award, action: "tests" },
  { id: "re-06", code: "RE - 06", title: "Telegram Link", desc: "Join official batch announcements & doubt group", icon: MessageSquare, action: "telegram" },
  { id: "re-07", code: "RE - 07", title: "Test Syllabus", desc: "Upcoming test portion and question weightage", icon: BookOpen, action: "syllabus" },
  { id: "re-08", code: "RE - 08", title: "Test Solution", desc: "Video solutions and step-by-step PDF explanations", icon: CheckSquare, action: "solutions" },
  { id: "re-09", code: "RE - 09", title: "Test Papers", desc: "Downloadable test question papers and answer keys", icon: FileQuestion, action: "papers" },
  { id: "re-10", code: "RE - 10", title: "Admission Form Link", desc: "Batch enrolment verification & details", icon: GraduationCap, action: "admission" },
  { id: "re-11", code: "RE - 11", title: "WhatsApp Link", desc: "Receive immediate class alerts and notifications", icon: Zap, action: "whatsapp" },
  { id: "re-12", code: "RE - 12", title: "AIR Proctored Test", desc: "All-India test engine with proctored ranking", icon: Trophy, action: "air" },
  { id: "re-13", code: "RE - 13", title: "Interaction Session", desc: "Live AMA webinars & guidance with teachers", icon: Users, action: "interaction" },
  { id: "re-14", code: "RE - 14", title: "60 Minute NCERT", desc: "One-hour focused NCERT booster lectures", icon: BookMarked, action: "ncert" },
];

function getInitialFaculty(batchId: string): Record<string, string> {
  try {
    const saved = localStorage.getItem(`pw_faculty_${batchId}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  if (batchId === "698ad3519549b300a5e1cc6a") {
    return {
      "Physics": "Physics By Rajwant Singh Sir",
      "Mathematics": "Maths By Sachin Jakhar Sir",
      "Physical Chemistry": "Physical Chemistry By Rahul Dudi Sir",
      "Inorganic Chemistry": "Inorganic Chemistry By Kunwar Om Pandey Sir",
      "Organic Chemistry": "Organic Chemistry By Pankaj Sijariya Sir"
    };
  }
  return {};
}

async function fetchDateSchedule(batchId: string, date: string): Promise<PWScheduleItem[]> {
  const response = await fetch(`/api/pw-schedule?batchId=${encodeURIComponent(batchId)}&date=${encodeURIComponent(date)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`PW schedule unavailable (${response.status})`);
  const payload = await response.json() as { schedules?: PWScheduleItem[] };
  return Array.isArray(payload.schedules) ? payload.schedules : [];
}

async function fetchTodaySchedule(batchId: string): Promise<PWScheduleItem[]> {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return fetchDateSchedule(batchId, date);
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Time not listed";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /T|Z|\d{4}-\d{2}-\d{2}/.test(value)) {
    return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  }
  return value;
}

function getTeacherInitials(name?: string): string {
  if (!name) return "PW";
  const cleaned = name.replace(/\b(Sir|Ma'am|Dr|Prof|Anna|Faculty)\b/gi, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getSubjectBadgeColor(subject?: string): { bg: string; text: string; border: string; avatar: string } {
  const s = (subject || "").toLowerCase();
  if (s.includes("phy")) {
    return {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-500/25",
      avatar: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
    };
  }
  if (s.includes("chem")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/25",
      avatar: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
    };
  }
  if (s.includes("math")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-500/25",
      avatar: "bg-gradient-to-br from-purple-500 to-violet-600 text-white"
    };
  }
  return {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/25",
    avatar: "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
  };
}

function formatDateHeading(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    });
  } catch {
    return dateStr;
  }
}

function addDaysToDate(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(dt);
  } catch {
    return dateStr;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function catalogToBatch(batch: PWCatalogBatch): PWBatch {
  return {
    id: batch.batch_id,
    name: batch.name,
    target: [batch.class, batch.exam].filter(Boolean).join(" • ") || "Physics Wallah batch",
    description: batch.byName || `${batch.language || ""} batch metadata from the public catalog`.trim(),
    subjects: [],
  };
}

function extractCatalogBatches(payload: unknown): PWCatalogBatch[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.vidyapeeth_batches, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is PWCatalogBatch => {
        if (!item || typeof item !== "object") return false;
        const value = item as Record<string, unknown>;
        return typeof value.batch_id === "string" && typeof value.name === "string";
      });
    }
  }
  return [];
}

async function fetchPublicToken(): Promise<string> {
  const response = await fetch(PW_TOKEN_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Public metadata token unavailable");
  const payload = await response.json() as { access_token?: string; token?: string };
  const token = payload.access_token || payload.token;
  if (!token) throw new Error("Public metadata token missing");
  return token;
}

async function fetchBatchDetails(batchId: string): Promise<PWRemoteSubject[]> {
  const response = await fetch(`${PW_DETAILS_URL}/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`);
  if (!response.ok) throw new Error(`Batch details unavailable (${response.status})`);
  const payload = await response.json() as { data?: { subjects?: unknown } };
  if (!Array.isArray(payload.data?.subjects)) return [];

  return payload.data.subjects.flatMap((item: any): PWRemoteSubject[] => {
    if (!item || typeof item !== "object") return [];
    const subjectName = typeof item.subject === "string" ? item.subject : "Subject";
    const faculty = Array.isArray(item.teacherIds)
      ? item.teacherIds.map((teacher: any) => [teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" & ")
      : undefined;
    return typeof item._id === "string" ? [{ id: item._id, name: subjectName, faculty }] : [];
  });
}

async function fetchSubjectTopics(batchId: string, subject: PWRemoteSubject, token: string): Promise<PWSubject> {
  const topics: PWChapter[] = [];
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (topics.length < totalCount && page <= 100) {
    const response = await fetch(
      `${PW_TOPICS_URL}/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subject.id)}/topics?page=${page}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Topic metadata unavailable (${response.status})`);
    const payload = await response.json() as {
      data?: Array<{ _id?: string; name?: string }>;
      paginate?: { totalCount?: number; limit?: number };
    };
    const pageTopics = (payload.data || []).filter(topic => typeof topic.name === "string");
    pageTopics.forEach(topic => {
      const id = topic._id || `${subject.id}-${topics.length}`;
      topics.push({
        id: `${subject.id}-${id}`,
        title: topic.name as string,
        lectures: [{ id: `${subject.id}-${id}-item`, title: topic.name as string, type: "lecture" }],
      });
    });
    totalCount = payload.paginate?.totalCount || topics.length;
    if (pageTopics.length === 0) break;
    page += 1;
  }

  return { name: subject.name, faculty: subject.faculty, chapters: topics };
}

// Fallback initial dataset in case offline or CDN loading
const DEFAULT_PW_BATCHES: PWBatch[] = [
  {
    id: "698ad3519549b300a5e1cc6a",
    name: "Arjuna JEE 2027",
    target: "Class 11 (JEE Main & Advanced 2027)",
    description: "Complete foundational Class 11 curriculum with theory lectures and daily problem sheets (DPPs).",
    subjects: [
      {
        name: "Physics",
        faculty: "Rajwant Sir & Saleem Sir",
        chapters: [
          {
            id: "arj-phy-1",
            title: "Units, Dimensions & Measurements",
            lectures: [
              { id: "arj-phy-1-1", title: "Lec 01: Physical Quantities, Fundamental & Derived Units", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-1-2", title: "Lec 02: Dimensional Formulae & Principle of Homogeneity", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-1-3", title: "Lec 03: Applications of Dimensional Analysis & Limitations", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-1-4", title: "Lec 04: Errors in Measurement, Vernier Calliper & Screw Gauge", type: "lecture", duration: "2h 00m" },
              { id: "arj-phy-1-dpp1", title: "DPP 01: Units & Dimensions (20 Questions)", type: "dpp", duration: "45m" },
              { id: "arj-phy-1-dpp2", title: "DPP 02: Errors & Instruments Analysis (25 Questions)", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-2",
            title: "Mathematical Tools & Vectors",
            lectures: [
              { id: "arj-phy-2-1", title: "Lec 01: Coordinate Systems, Trigonometry & Graphs", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-2-2", title: "Lec 02: Differentiation Basics & Maxima/Minima", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-2-3", title: "Lec 03: Integration Fundamentals & Definite Integrals in Physics", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-2-4", title: "Lec 04: Vector Addition, Triangle Law & Parallelogram Law", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-2-5", title: "Lec 05: Resolution of Vectors & Unit Vectors in 2D/3D", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-2-6", title: "Lec 06: Dot Product, Cross Product & Applications", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-2-dpp1", title: "DPP 01: Basic Calculus in Physics", type: "dpp", duration: "40m" },
              { id: "arj-phy-2-dpp2", title: "DPP 02: Vector Algebra & Products", type: "dpp", duration: "45m" }
            ]
          },
          {
            id: "arj-phy-3",
            title: "Motion in a Straight Line (Kinematics 1D)",
            lectures: [
              { id: "arj-phy-3-1", title: "Lec 01: Distance, Displacement, Average Speed & Velocity", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-3-2", title: "Lec 02: Instantaneous Velocity, Acceleration & Calculus Problems", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-3-3", title: "Lec 03: Equations of Motion for Uniform Acceleration", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-3-4", title: "Lec 04: Motion Under Gravity & Stopping Distance", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-3-5", title: "Lec 05: Motion Graphs (s-t, v-t, a-t Transformation)", type: "lecture", duration: "2h 05m" },
              { id: "arj-phy-3-dpp1", title: "DPP 01: Uniform & Non-Uniform 1D Motion", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-4",
            title: "Motion in a Plane (Kinematics 2D & Projectile)",
            lectures: [
              { id: "arj-phy-4-1", title: "Lec 01: 2D Kinematics Equations & Position Vectors", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-4-2", title: "Lec 02: Ground to Ground Projectile Motion & Formulae", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-4-3", title: "Lec 03: Equation of Trajectory & Radius of Curvature", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-4-4", title: "Lec 04: Horizontal Projectile & Projection from a Tower", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-4-5", title: "Lec 05: Projectile on an Inclined Plane", type: "lecture", duration: "2h 00m" },
              { id: "arj-phy-4-6", title: "Lec 06: Relative Motion in 1D & River-Boat Problems", type: "lecture", duration: "2h 10m" },
              { id: "arj-phy-4-7", title: "Lec 07: Rain-Man Problems & Aircraft Wind Problems", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-4-dpp1", title: "DPP 01: Projectile Motion Problems", type: "dpp", duration: "45m" },
              { id: "arj-phy-4-dpp2", title: "DPP 02: Relative Motion in 2D", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-5",
            title: "Newton's Laws of Motion (NLM) & Friction",
            lectures: [
              { id: "arj-phy-5-1", title: "Lec 01: Inertia, Momentum & Newton's Second Law", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-5-2", title: "Lec 02: Free Body Diagrams (FBD) & Normal Reaction", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-5-3", title: "Lec 03: Tension in Strings & Smooth Pulley Systems", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-5-4", title: "Lec 04: Constrained Motion (String & Wedge Constraints)", type: "lecture", duration: "2h 05m" },
              { id: "arj-phy-5-5", title: "Lec 05: Pseudo Force & Non-Inertial Reference Frames", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-5-6", title: "Lec 06: Friction Fundamentals, Static vs Kinetic Friction", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-5-7", title: "Lec 07: Two-Block Problems & Critical Acceleration", type: "lecture", duration: "2h 15m" },
              { id: "arj-phy-5-dpp1", title: "DPP 01: Pulley & Constraint Problems", type: "dpp", duration: "50m" },
              { id: "arj-phy-5-dpp2", title: "DPP 02: Friction & Multi-Block Systems", type: "dpp", duration: "55m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Amit Mahajan Sir & Pankaj Sir",
        chapters: [
          {
            id: "arj-chem-1",
            title: "Some Basic Concepts of Chemistry (Mole Concept)",
            lectures: [
              { id: "arj-chem-1-1", title: "Lec 01: Introduction, Matter Classification & Laws of Chemical Combination", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-1-2", title: "Lec 02: Mole Definition, Atomic & Molecular Masses, Avogadro Number", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-1-3", title: "Lec 03: Percentage Composition, Empirical & Molecular Formula", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-1-4", title: "Lec 04: Stoichiometry & Limiting Reagent Concept", type: "lecture", duration: "2h 00m" },
              { id: "arj-chem-1-5", title: "Lec 05: Concentration Terms (Molarity, Molality, Mole Fraction, ppm)", type: "lecture", duration: "2h 10m" },
              { id: "arj-chem-1-dpp1", title: "DPP 01: Mole Concept & Limiting Reagent", type: "dpp", duration: "45m" },
              { id: "arj-chem-1-dpp2", title: "DPP 02: Concentration Terms & Mixing Problems", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-chem-2",
            title: "Structure of Atom",
            lectures: [
              { id: "arj-chem-2-1", title: "Lec 01: Subatomic Particles & Rutherford Nuclear Model", type: "lecture", duration: "1h 40m" },
              { id: "arj-chem-2-2", title: "Lec 02: Electromagnetic Radiations & Planck's Quantum Theory", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-2-3", title: "Lec 03: Photoelectric Effect & Dual Nature of Light", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-2-4", title: "Lec 04: Bohr's Model of Hydrogen Atom & Line Spectrum", type: "lecture", duration: "2h 00m" },
              { id: "arj-chem-2-5", title: "Lec 05: De Broglie Hypothesis & Heisenberg Uncertainty Principle", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-2-6", title: "Lec 06: Quantum Numbers (n, l, m, s) & Orbitals Shapes", type: "lecture", duration: "2h 05m" },
              { id: "arj-chem-2-7", title: "Lec 07: Aufbau Principle, Pauli Exclusion & Hund's Rule", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-2-dpp1", title: "DPP 01: Quantum Theory & Bohr Model", type: "dpp", duration: "45m" },
              { id: "arj-chem-2-dpp2", title: "DPP 02: Quantum Numbers & Electronic Configuration", type: "dpp", duration: "45m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir & Ashish Agarwal Sir",
        chapters: [
          {
            id: "arj-math-1",
            title: "Sets, Relations & Functions",
            lectures: [
              { id: "arj-math-1-1", title: "Lec 01: Set Representation, Subsets & Power Set", type: "lecture", duration: "1h 45m" },
              { id: "arj-math-1-2", title: "Lec 02: Set Operations, Venn Diagrams & Cardinality Problems", type: "lecture", duration: "1h 50m" },
              { id: "arj-math-1-3", title: "Lec 03: Cartesian Product & Relations (Reflexive, Symmetric, Transitive)", type: "lecture", duration: "2h 00m" },
              { id: "arj-math-1-4", title: "Lec 04: Functions Definition, Domain & Range", type: "lecture", duration: "2h 10m" },
              { id: "arj-math-1-5", title: "Lec 05: Classification of Functions (One-One, Onto, Bijective)", type: "lecture", duration: "1h 55m" },
              { id: "arj-math-1-dpp1", title: "DPP 01: Equivalence Relations & Cardinality", type: "dpp", duration: "45m" },
              { id: "arj-math-1-dpp2", title: "DPP 02: Domain & Range Calculation", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-math-2",
            title: "Trigonometric Functions & Identities",
            lectures: [
              { id: "arj-math-2-1", title: "Lec 01: Angle Measurement (Degrees & Radians), Unit Circle", type: "lecture", duration: "1h 45m" },
              { id: "arj-math-2-2", title: "Lec 02: Compound Angle Formulae (sin(A±B), cos(A±B))", type: "lecture", duration: "1h 55m" },
              { id: "arj-math-2-3", title: "Lec 03: Transformation Formulae (Product into Sum & Vice Versa)", type: "lecture", duration: "1h 50m" },
              { id: "arj-math-2-4", title: "Lec 04: Multiple & Submultiple Angles (2A, 3A, A/2)", type: "lecture", duration: "2h 00m" },
              { id: "arj-math-2-5", title: "Lec 05: Trigonometric Equations & General Solutions", type: "lecture", duration: "2h 10m" },
              { id: "arj-math-2-dpp1", title: "DPP 01: Trigonometric Identities & Simplification", type: "dpp", duration: "45m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "lakshya-jee-2026",
    name: "Lakshya JEE 2026",
    target: "Class 12 (JEE Main & Advanced 2026)",
    description: "Complete Class 12 syllabus coverage with advanced problem solving and board synchronization.",
    subjects: [
      {
        name: "Physics",
        faculty: "Saleem Sir & Rajwant Sir",
        chapters: [
          {
            id: "lak-phy-1",
            title: "Electrostatics & Electric Field",
            lectures: [
              { id: "lak-phy-1-1", title: "Lec 01: Electric Charges & Coulomb's Law in Vector Form", type: "lecture", duration: "1h 50m" },
              { id: "lak-phy-1-2", title: "Lec 02: Electric Field & Principle of Superposition", type: "lecture", duration: "1h 55m" },
              { id: "lak-phy-1-3", title: "Lec 03: Electric Dipole, Torque & Potential Energy", type: "lecture", duration: "1h 45m" },
              { id: "lak-phy-1-4", title: "Lec 04: Gauss's Law & Electric Flux Calculations", type: "lecture", duration: "2h 10m" },
              { id: "lak-phy-1-5", title: "Lec 05: Applications of Gauss's Law (Symmetric Distributions)", type: "lecture", duration: "2h 00m" },
              { id: "lak-phy-1-dpp1", title: "DPP 01: Coulomb's Law & Superposition", type: "dpp", duration: "50m" },
              { id: "lak-phy-1-dpp2", title: "DPP 02: Gauss's Law & Flux Applications", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "lak-phy-2",
            title: "Current Electricity",
            lectures: [
              { id: "lak-phy-2-1", title: "Lec 01: Drift Velocity, Mobility & Ohm's Law Derivation", type: "lecture", duration: "1h 45m" },
              { id: "lak-phy-2-2", title: "Lec 02: Resistance Combinations & Color Coding", type: "lecture", duration: "1h 40m" },
              { id: "lak-phy-2-3", title: "Lec 03: Kirchhoff's Current & Voltage Laws (KCL & KVL)", type: "lecture", duration: "2h 05m" },
              { id: "lak-phy-2-4", title: "Lec 04: Nodal Analysis & Symmetry in Resistor Circuits", type: "lecture", duration: "2h 15m" },
              { id: "lak-phy-2-5", title: "Lec 05: Potentiometer, Meter Bridge & Galvanometer Conversion", type: "lecture", duration: "2h 00m" },
              { id: "lak-phy-2-dpp1", title: "DPP 01: Kirchhoff's Laws & Complex Circuits", type: "dpp", duration: "50m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir & Faisal Sir",
        chapters: [
          {
            id: "lak-chem-1",
            title: "Solutions & Colligative Properties",
            lectures: [
              { id: "lak-chem-1-1", title: "Lec 01: Types of Solutions & Henry's Law Applications", type: "lecture", duration: "1h 45m" },
              { id: "lak-chem-1-2", title: "Lec 02: Raoult's Law for Volatile & Non-Volatile Solutes", type: "lecture", duration: "1h 55m" },
              { id: "lak-chem-1-3", title: "Lec 03: Ideal & Non-Ideal Solutions, Azeotropes", type: "lecture", duration: "1h 50m" },
              { id: "lak-chem-1-4", title: "Lec 04: Colligative Properties (RLVP, Elevation in BP, Depression in FP)", type: "lecture", duration: "2h 15m" },
              { id: "lak-chem-1-5", title: "Lec 05: Osmotic Pressure & Van't Hoff Factor (i)", type: "lecture", duration: "2h 00m" },
              { id: "lak-chem-1-dpp1", title: "DPP 01: Raoult's Law & Colligative Properties", type: "dpp", duration: "45m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir & Ashish Sir",
        chapters: [
          {
            id: "lak-math-1",
            title: "Continuity, Differentiability & Limits",
            lectures: [
              { id: "lak-math-1-1", title: "Lec 01: Limits Recap, L'Hopital's Rule & Expansions", type: "lecture", duration: "1h 50m" },
              { id: "lak-math-1-2", title: "Lec 02: Continuity at a Point & in an Interval", type: "lecture", duration: "1h 55m" },
              { id: "lak-math-1-3", title: "Lec 03: Intermediate Value Theorem & Types of Discontinuity", type: "lecture", duration: "1h 45m" },
              { id: "lak-math-1-4", title: "Lec 04: Differentiability & Geometrical Significance", type: "lecture", duration: "2h 05m" },
              { id: "lak-math-1-dpp1", title: "DPP 01: Continuity & Differentiability", type: "dpp", duration: "50m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "prayas-jee-2026",
    name: "Prayas JEE 2026 (Droppers)",
    target: "Droppers / Repeaters (JEE Main & Advanced 2026)",
    description: "Intensive 11th + 12th complete syllabus coverage with high-speed problem solving.",
    subjects: [
      {
        name: "Physics",
        faculty: "Rajwant Sir & Saleem Sir",
        chapters: [
          {
            id: "pra-phy-1",
            title: "Mechanics Comprehensive Capsule",
            lectures: [
              { id: "pra-phy-1-1", title: "Lec 01: Kinematics 1D & 2D Rapid Problem Solving", type: "lecture", duration: "2h 15m" },
              { id: "pra-phy-1-2", title: "Lec 02: Newton's Laws & Friction Multi-Block Mastery", type: "lecture", duration: "2h 20m" },
              { id: "pra-phy-1-3", title: "Lec 03: Work, Energy, Power & Vertical Circular Motion", type: "lecture", duration: "2h 10m" },
              { id: "pra-phy-1-dpp1", title: "DPP 01: Advanced Mechanics PYQ Drill", type: "dpp", duration: "1h 00m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir & Amit Mahajan Sir",
        chapters: [
          {
            id: "pra-chem-1",
            title: "Physical Chemistry Fundamentals",
            lectures: [
              { id: "pra-chem-1-1", title: "Lec 01: Mole Concept, Stoichiometry & Redox Titrations", type: "lecture", duration: "2h 10m" },
              { id: "pra-chem-1-2", title: "Lec 02: Chemical Thermodynamics & Thermochemistry", type: "lecture", duration: "2h 25m" },
              { id: "pra-chem-1-dpp1", title: "DPP 01: Physical Chemistry High-Yield Problems", type: "dpp", duration: "50m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir",
        chapters: [
          {
            id: "pra-math-1",
            title: "Algebra Rapid Revision",
            lectures: [
              { id: "pra-math-1-1", title: "Lec 01: Quadratic Equations & Location of Roots", type: "lecture", duration: "2h 15m" },
              { id: "pra-math-1-2", title: "Lec 02: Complex Numbers Geometry & De Moivre's Theorem", type: "lecture", duration: "2h 30m" },
              { id: "pra-math-1-dpp1", title: "DPP 01: Algebra Advanced Problems", type: "dpp", duration: "1h 00m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "manzil-jee-2026",
    name: "Manzil JEE (One-Shot Revision)",
    target: "All JEE Aspirants (High-Yield Marathons)",
    description: "Complete chapter one-shot marathons with theory, shortcuts, and 40+ PYQs per chapter.",
    subjects: [
      {
        name: "Physics",
        faculty: "MR Sir, Rajwant Sir, Saleem Sir",
        chapters: [
          {
            id: "man-phy-1",
            title: "Mechanics One-Shot Marathons",
            lectures: [
              { id: "man-phy-1-1", title: "Kinematics in 1 Shot (Full Theory + 40 PYQs)", type: "lecture", duration: "5h 15m" },
              { id: "man-phy-1-2", title: "Newton's Laws of Motion & Friction in 1 Shot", type: "lecture", duration: "5h 45m" },
              { id: "man-phy-1-3", title: "Rotational Dynamics in 1 Shot Complete Mastery", type: "lecture", duration: "6h 30m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir, Faisal Sir, Amit Mahajan Sir",
        chapters: [
          {
            id: "man-chem-1",
            title: "Chemistry One-Shot Marathons",
            lectures: [
              { id: "man-chem-1-1", title: "Complete Chemical Bonding in 1 Shot", type: "lecture", duration: "5h 00m" },
              { id: "man-chem-1-2", title: "Complete Organic Chemistry Reaction Mechanisms", type: "lecture", duration: "7h 20m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir, Ashish Agarwal Sir",
        chapters: [
          {
            id: "man-math-1",
            title: "Mathematics One-Shot Marathons",
            lectures: [
              { id: "man-math-1-1", title: "Complete Definite Integration & Area Under Curves in 1 Shot", type: "lecture", duration: "6h 15m" },
              { id: "man-math-1-2", title: "Vectors & 3D Geometry Full Chapter Marathon", type: "lecture", duration: "5h 40m" }
            ]
          }
        ]
      }
    ]
  }
];

export default function OthersPage() {
  const [location, navigate] = useLocation();
  const [subView, setSubView] = useState<OthersSubView>("hub");

  const { selectedGoal } = useAppContext();

  // Navigation hierarchy matching UIvid.mp4
  // Level 1: Batch View (tabs: subjects | resources)
  const [activeBatchTab, setActiveBatchTab] = useState<"subjects" | "resources">("subjects");
  // Level 2: Subject View (tabs: chapters | studyMaterial)
  const [selectedSubject, setSelectedSubject] = useState<PWSubject | null>(null);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<"chapters" | "studyMaterial">("chapters");
  // Level 3: Chapter Detail View
  const [selectedChapter, setSelectedChapter] = useState<PWChapter | null>(null);

  // Modals & User Filters
  const [facultyModalOpen, setFacultyModalOpen] = useState<boolean>(false);
  const [batchSearchModalOpen, setBatchSearchModalOpen] = useState<boolean>(false);
  const [facultyFilterMode, setFacultyFilterMode] = useState<"myFaculty" | "all">("myFaculty");
  const [resourceModal, setResourceModal] = useState<{ title: string; desc: string; link?: string } | null>(null);
  const [videoModalLec, setVideoModalLec] = useState<PWLecture | null>(null);

  // PW Batches Data & Selection State with LocalStorage Persistence
  const [batches, setBatches] = useState<PWBatch[]>(DEFAULT_PW_BATCHES);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("pw_selected_batch_id");
      if (saved) return saved;
    } catch {}
    return "698ad3519549b300a5e1cc6a";
  });

  // Faculty Selection per Batch with LocalStorage Persistence
  const [selectedFaculty, setSelectedFaculty] = useState<Record<string, string>>(() => {
    return getInitialFaculty(selectedBatchId);
  });

  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [contentFilter, setContentFilter] = useState<"all" | "lecture" | "dpp">("all");
  const [lectureSearch, setLectureSearch] = useState<string>("");
  const [batchSearch, setBatchSearch] = useState<string>("");
  const [catalogBatches, setCatalogBatches] = useState<PWCatalogBatch[]>([]);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [todaySchedule, setTodaySchedule] = useState<PWScheduleItem[]>([]);
  const [scheduleMessage, setScheduleMessage] = useState<string>("");
  const [scheduleTab, setScheduleTab] = useState<"all" | "live" | "lectures" | "notes">("all");
  const [scheduleViewMode, setScheduleViewMode] = useState<"compact" | "full">("compact");
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [scheduleForDate, setScheduleForDate] = useState<PWScheduleItem[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [scheduleSubjectFilter, setScheduleSubjectFilter] = useState<string>("All");
  const [upcomingEvents, setUpcomingEvents] = useState<PWScheduleItem[]>([]);
  const [scheduleCache, setScheduleCache] = useState<Record<string, PWScheduleItem[]>>({});
  const [chapterTab, setChapterTab] = useState<Record<string, "all" | "lecture" | "dpp">>({});
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [openLectureMenu, setOpenLectureMenu] = useState<string | null>(null);
  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);
  const loadingBatchIds = React.useRef(new Set<string>());

  // Completed Lectures Set (stored locally and synced to IndexedDB)
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("pw_completed_lectures");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // When selectedBatchId changes, persist to localStorage and reset faculty/navigation
  useEffect(() => {
    if (selectedBatchId) {
      try {
        localStorage.setItem("pw_selected_batch_id", selectedBatchId);
        const savedFaculty = localStorage.getItem(`pw_faculty_${selectedBatchId}`);
        if (savedFaculty) {
          setSelectedFaculty(JSON.parse(savedFaculty));
        } else {
          setSelectedFaculty(getInitialFaculty(selectedBatchId));
        }
      } catch {}
      setSelectedSubject(null);
      setSelectedChapter(null);
    }
  }, [selectedBatchId]);

  // Update selected faculty for a discipline and persist to localStorage
  const handleSelectFaculty = (discipline: string, subjectName: string) => {
    setSelectedFaculty(prev => {
      const next = { ...prev, [discipline]: subjectName };
      try {
        localStorage.setItem(`pw_faculty_${selectedBatchId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Load the live PW batch catalog.
  useEffect(() => {
    fetch(PW_CATALOG_URL)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const remoteBatches = extractCatalogBatches(data);
        setCatalogBatches(remoteBatches);
        setBatches(prev => {
          const catalogConverted = remoteBatches.map(catalogToBatch);
          const merged = [...prev];
          catalogConverted.forEach(cb => {
            if (!merged.some(m => m.id === cb.id)) {
              merged.push(cb);
            }
          });
          return merged;
        });
        if (remoteBatches.length > 0) {
          setSyncMessage(`Catalog synced: ${remoteBatches.length.toLocaleString()} public batches`);
        }
      })
      .catch(() => setSyncMessage("Using the local batch catalog"));

    // Also load completed items from IndexedDB
    idbGet<Record<string, boolean>>("pw_completed_lectures").then(saved => {
      if (saved) {
        setCompletedMap(prev => ({ ...prev, ...saved }));
      }
    }).catch(() => {});
  }, []);

  // Save completed map on change
  useEffect(() => {
    try {
      localStorage.setItem("pw_completed_lectures", JSON.stringify(completedMap));
      idbSet("pw_completed_lectures", completedMap).catch(() => {});
    } catch {}
  }, [completedMap]);

  // Sync subView with URL route
  useEffect(() => {
    if (location === "/others/questions" || location === "/questions") {
      setSubView("questions");
    } else if (location === "/others/pw" || location === "/pw") {
      setSubView("pw");
    } else {
      setSubView("hub");
    }
  }, [location]);

  // Active Batch Object
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || EMPTY_PW_BATCH;
  }, [batches, selectedBatchId]);

  // Compute 4-5 Goal-Suggested Batches
  const suggestedBatches = useMemo(() => {
    return getGoalSuggestedBatches(selectedGoal, catalogBatches);
  }, [selectedGoal, catalogBatches]);

  // If no saved batch, auto-select the first suggested batch matching user's goal
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pw_selected_batch_id");
      if (!saved && suggestedBatches.length > 0) {
        setSelectedBatchId(suggestedBatches[0].id);
      }
    } catch {}
  }, [suggestedBatches]);

  // Load batch metadata when batch is selected
  useEffect(() => {
    const selectedBatch = batches.find(batch => batch.id === selectedBatchId);
    if (!selectedBatchId || (selectedBatch?.subjects && selectedBatch.subjects.length > 0) || loadingBatchIds.current.has(selectedBatchId)) {
      return;
    }

    setIsLoadingBatch(true);
    loadingBatchIds.current.add(selectedBatchId);
    fetchBatchMetadata(selectedBatchId)
      .then(subjects => {
        if (subjects.length === 0) {
          setSyncMessage("This batch has no public subject metadata");
          return;
        }
        setBatches(prev => {
          const exists = prev.some(b => b.id === selectedBatchId);
          if (exists) {
            return prev.map(b => b.id === selectedBatchId ? { ...b, subjects } : b);
          }
          const cat = catalogBatches.find(b => b.batch_id === selectedBatchId);
          const newBatch = cat ? catalogToBatch(cat) : {
            id: selectedBatchId,
            name: "Physics Wallah Batch",
            target: "IIT JEE / NEET Preparation",
            description: "Live batch curriculum",
            subjects: []
          };
          return [...prev, { ...newBatch, subjects }];
        });
        setSyncMessage(`Curriculum synchronized (${subjects.length} subjects)`);
      })
      .catch((err) => {
        console.error("Failed to load batch metadata:", err);
        setSyncMessage("Metadata temporarily unavailable");
      })
      .finally(() => {
        setIsLoadingBatch(false);
        loadingBatchIds.current.delete(selectedBatchId);
      });
  }, [selectedBatchId, batches, catalogBatches]);

  // Load today's schedule
  useEffect(() => {
    if (!selectedBatchId) return;
    const todayDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    setTodaySchedule([]);
    setScheduleMessage("Loading today’s classes...");
    fetchTodaySchedule(selectedBatchId)
      .then(schedule => {
        setTodaySchedule(schedule);
        setScheduleCache(prev => ({ ...prev, [`${selectedBatchId}_${todayDate}`]: schedule }));
        setScheduleMessage(schedule.length ? "" : "No classes scheduled for today.");

        // Compute upcoming and live events
        const liveOrUpcoming = schedule.filter(s => s.isLive || s.isUpcoming || s.status === "PENDING" || s.tag?.toLowerCase() === "live");
        if (liveOrUpcoming.length >= 2) {
          setUpcomingEvents(liveOrUpcoming);
        } else {
          const tomorrowDate = addDaysToDate(todayDate, 1);
          fetchDateSchedule(selectedBatchId, tomorrowDate)
            .then(tomorrowSched => {
              setScheduleCache(prev => ({ ...prev, [`${selectedBatchId}_${tomorrowDate}`]: tomorrowSched }));
              const tomorrowUpcoming = tomorrowSched.filter(s => s.isUpcoming || s.status === "PENDING");
              setUpcomingEvents([...liveOrUpcoming, ...tomorrowUpcoming]);
            })
            .catch(() => setUpcomingEvents(liveOrUpcoming));
        }
      })
      .catch(() => {
        setTodaySchedule([]);
        setUpcomingEvents([]);
        setScheduleMessage("Today’s schedule could not be loaded.");
      });
  }, [selectedBatchId]);

  // Load schedule whenever selectedScheduleDate or selectedBatchId changes
  useEffect(() => {
    if (!selectedBatchId) return;
    const cacheKey = `${selectedBatchId}_${selectedScheduleDate}`;
    if (scheduleCache[cacheKey]) {
      setScheduleForDate(scheduleCache[cacheKey]);
      return;
    }
    setIsLoadingSchedule(true);
    fetchDateSchedule(selectedBatchId, selectedScheduleDate)
      .then(items => {
        setScheduleForDate(items);
        setScheduleCache(prev => ({ ...prev, [cacheKey]: items }));
      })
      .catch(() => {
        setScheduleForDate([]);
      })
      .finally(() => {
        setIsLoadingSchedule(false);
      });
  }, [selectedBatchId, selectedScheduleDate]);

  // Keep selectedSubject in sync with fresh batch metadata
  useEffect(() => {
    if (selectedSubject && currentBatch.subjects.length > 0) {
      const fresh = currentBatch.subjects.find(s => s.name === selectedSubject.name);
      if (fresh && fresh !== selectedSubject) {
        setSelectedSubject(fresh);
      }
    }
  }, [currentBatch.subjects, selectedSubject]);

  // Keep selectedChapter in sync with fresh subject data
  useEffect(() => {
    if (selectedChapter && selectedSubject) {
      const freshCh = selectedSubject.chapters.find(c => c.id === selectedChapter.id);
      if (freshCh && freshCh !== selectedChapter) {
        setSelectedChapter(freshCh);
      }
    }
  }, [selectedSubject, selectedChapter]);

  // Expand all chapters by default when batch changes
  useEffect(() => {
    const chapterIds = currentBatch.subjects.flatMap(subject => subject.chapters.map(chapter => chapter.id));
    setOpenChapters(previous => {
      const next = Object.fromEntries(chapterIds.map(id => [id, previous[id] ?? true]));
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (previousKeys.length === nextKeys.length && nextKeys.every(id => previous[id] === next[id])) {
        return previous;
      }
      return next;
    });
  }, [currentBatch.subjects]);

  // Toggle Lecture completion
  const toggleLectureCompletion = (lectureId: string) => {
    setCompletedMap(prev => {
      const updated = { ...prev, [lectureId]: !prev[lectureId] };
      return updated;
    });
  };

  // Toggle Chapter accordion open/close
  const toggleChapter = (chapterId: string) => {
    setOpenChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Group all batch subjects by discipline for the faculty selection menu
  const disciplinesGrouped = useMemo(() => {
    const grouped: Record<string, PWSubject[]> = {};
    currentBatch.subjects.forEach(s => {
      const disc = getSubjectDiscipline(s.name);
      if (!grouped[disc]) grouped[disc] = [];
      grouped[disc].push(s);
    });
    return grouped;
  }, [currentBatch.subjects]);

  // Active Subjects based on User's Selected Faculty (NO DOUBLE COUNTING!)
  const activeBatchSubjects = useMemo(() => {
    if (!currentBatch.subjects || currentBatch.subjects.length === 0) return [];

    const grouped: Record<string, PWSubject[]> = {};
    currentBatch.subjects.forEach(s => {
      const disc = getSubjectDiscipline(s.name);
      if (!grouped[disc]) grouped[disc] = [];
      grouped[disc].push(s);
    });

    const result: PWSubject[] = [];
    for (const [disc, subs] of Object.entries(grouped)) {
      if (subs.length === 1) {
        result.push(subs[0]);
      } else {
        const chosenName = selectedFaculty[disc];
        const match = subs.find(s => s.name === chosenName) || subs[0];
        result.push(match);
      }
    }
    return result;
  }, [currentBatch.subjects, selectedFaculty]);

  // Calculation of progress stats for the selected batch ONLY across chosen faculty (NO DOUBLE COUNTING)
  const batchStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    const subjectStats: Record<string, { total: number; completed: number; faculty?: string }> = {};

    activeBatchSubjects.forEach(sub => {
      let subTotal = 0;
      let subCompleted = 0;
      sub.chapters.forEach(ch => {
        ch.lectures.forEach(l => {
          total += 1;
          subTotal += 1;
          if (completedMap[l.id]) {
            completed += 1;
            subCompleted += 1;
          }
        });
      });
      const disc = getSubjectDiscipline(sub.name);
      subjectStats[disc] = {
        total: subTotal,
        completed: subCompleted,
        faculty: sub.faculty || sub.name.split(/\bby\b/i)[1]?.trim()
      };
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent, subjectStats };
  }, [activeBatchSubjects, completedMap]);

  const visibleCatalogBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return catalogBatches.slice(0, 15);
    return catalogBatches
      .filter(batch => [batch.name, batch.byName, batch.exam, batch.class].filter(Boolean).join(" ").toLowerCase().includes(query))
      .slice(0, 20);
  }, [batchSearch, catalogBatches]);

  const visibleBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return batches;
    return batches.filter(batch => `${batch.name} ${batch.target} ${batch.description}`.toLowerCase().includes(query));
  }, [batches, batchSearch]);

  return (
    <div className="min-h-full bg-background text-foreground transition-colors">
      {/* ── SUB-VIEW 1: QUESTIONS (Full JEE Main & Advanced Practice) ────── */}
      {subView === "questions" && (
        <div>
          {/* Top Bar with Back Button */}
          <div className="bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubView("hub");
                navigate("/others");
              }}
              className="gap-2 text-xs font-semibold rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Others Hub
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                JEE Main &amp; Advanced PYQ System
              </span>
            </div>
          </div>
          {/* Questions Full Component */}
          <QuestionsPage />
        </div>
      )}

      {/* ── SUB-VIEW 2: PHYSICS WALLAH (PW) BATCH & LECTURE TRACKER ──────── */}
      {subView === "pw" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubView("hub");
                navigate("/others");
              }}
              className="gap-2 text-xs font-semibold rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Others Hub
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={scheduleViewMode === "full" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleViewMode(prev => prev === "full" ? "compact" : "full")}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                <Calendar className="w-4 h-4" />
                {scheduleViewMode === "full" ? "Batch Overview" : "Weekly Schedule"}
              </Button>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                PW Tracker
              </span>
            </div>
          </div>

        {scheduleViewMode === "full" ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar for Weekly Schedule */}
            <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleViewMode("compact")}
                  className="gap-1.5 text-xs font-semibold rounded-xl shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Batch Overview
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl sm:text-2xl font-black text-foreground">Weekly Schedule</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">{currentBatch.name}</p>
                </div>
              </div>

              {/* Right Controls: Batch Picker & Subject Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                {batches.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-semibold">Batch:</span>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="h-9 px-2.5 rounded-xl text-xs bg-background border border-border font-medium text-foreground max-w-[180px] truncate focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject Filter Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground font-semibold">Subject:</span>
                  <select
                    value={scheduleSubjectFilter}
                    onChange={(e) => setScheduleSubjectFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl text-xs bg-background border border-border font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {["All", ...Array.from(new Set([...currentBatch.subjects.map(s => s.name), ...scheduleForDate.map(s => s.subject)].filter(Boolean)))].map(sub => (
                      <option key={sub} value={sub}>{sub === "All" ? "All Subjects" : sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Content Grid: Left Timeline + Right Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Schedule Timeline for Selected Date */}
              <div className="lg:col-span-8 space-y-4">
                {/* Date Heading & Day Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground">
                        {formatDateHeading(selectedScheduleDate)}
                      </h3>
                      {selectedScheduleDate === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()) ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-bold">
                          Today
                        </Badge>
                      ) : selectedScheduleDate === addDaysToDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()), 1) ? (
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px] font-bold">
                          Tomorrow
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isLoadingSchedule
                        ? "Fetching latest schedule..."
                        : `${scheduleForDate.filter(item => scheduleSubjectFilter === "All" || (item.subject || "").toLowerCase() === scheduleSubjectFilter.toLowerCase()).length} classes / events scheduled`}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const todayIst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
                      setSelectedScheduleDate(todayIst);
                      setCalendarMonth(new Date());
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary self-start sm:self-auto"
                  >
                    Jump to Today
                  </Button>
                </div>

                {/* Shimmer / Skeleton Loading State (Matching Video at 00:11) */}
                {isLoadingSchedule ? (
                  <div className="space-y-3.5 animate-pulse">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/60 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                            <div className="space-y-2">
                              <div className="h-3 w-36 bg-muted/80 rounded" />
                              <div className="h-4.5 w-60 sm:w-80 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="h-6 w-20 bg-muted/70 rounded-full shrink-0" />
                        </div>
                        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                          <div className="h-3.5 w-32 bg-muted/60 rounded" />
                          <div className="flex gap-2">
                            <div className="h-8 w-24 bg-muted/80 rounded-lg" />
                            <div className="h-8 w-20 bg-muted/80 rounded-lg" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : scheduleForDate.filter(item => scheduleSubjectFilter === "All" || (item.subject || "").toLowerCase() === scheduleSubjectFilter.toLowerCase()).length === 0 ? (
                  /* Empty State */
                  <Card className="p-10 rounded-2xl border border-dashed border-border/80 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/80 text-muted-foreground flex items-center justify-center mx-auto">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-base text-foreground">No classes scheduled for this date</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      There are no scheduled lectures or study materials on {formatDateHeading(selectedScheduleDate)}. Pick any other date from the interactive calendar on the right.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const todayIst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
                          setSelectedScheduleDate(todayIst);
                          setCalendarMonth(new Date());
                        }}
                        className="text-xs font-semibold rounded-xl"
                      >
                        Go to Today
                      </Button>
                    </div>
                  </Card>
                ) : (
                  /* Class Cards List */
                  <div className="space-y-3.5">
                    {scheduleForDate
                      .filter(item => scheduleSubjectFilter === "All" || (item.subject || "").toLowerCase() === scheduleSubjectFilter.toLowerCase())
                      .map(item => {
                        const isLive = Boolean(item.isLive || item.tag?.toLowerCase() === "live");
                        const isEnded = item.tag?.toLowerCase() === "ended" || item.status === "COMPLETED";
                        const isUpcoming = Boolean(item.isUpcoming || (item.status === "PENDING" && !isLive && !isEnded));
                        const colors = getSubjectBadgeColor(item.subject);
                        const teacherInitials = getTeacherInitials(item.teacher);

                        return (
                          <Card
                            key={item.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                              isLive
                                ? "border-red-500/50 bg-red-500/5 shadow-xs ring-1 ring-red-500/30"
                                : "border-border/80 bg-card hover:border-primary/40 shadow-xs"
                            }`}
                          >
                            {/* Top Row: Avatar, Subtitle, Topic & Status */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {/* Teacher Avatar */}
                                {item.teacherImage ? (
                                  <img
                                    src={item.teacherImage}
                                    alt={item.teacher}
                                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-border"
                                  />
                                ) : (
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${colors.avatar}`}>
                                    {teacherInitials}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* Subject & Teacher Line */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                      {item.type === "NOTES" ? "Notes" : "Lecture"} • <strong className="text-foreground">{item.subject}</strong> By {item.teacher || "PW Faculty"}
                                    </span>
                                  </div>

                                  {/* Topic Title */}
                                  <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                                    {item.topic}
                                  </h4>

                                  {/* Chapter Tag */}
                                  {item.chapter && item.chapter !== "Concise Summary Notes || Only PDF" && (
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                                      <BookOpen className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{item.chapter}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0">
                                {isLive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-2xs animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    LIVE NOW
                                  </span>
                                ) : isEnded ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                                    Ended
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom Action & Detail Bar */}
                            <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                              {/* Left: Timing & Duration */}
                              <div className="flex items-center gap-3 text-muted-foreground font-medium flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>
                                    {item.startTime ? formatScheduleTime(item.startTime) : "Time TBD"}
                                    {item.endTime ? ` – ${formatScheduleTime(item.endTime)}` : ""}
                                  </span>
                                </span>
                                {item.duration && (
                                  <span className="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded-md">
                                    ⏱ {item.duration}
                                  </span>
                                )}
                              </div>

                              {/* Right: DPP & Watch Action Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.dppTitle && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScheduleViewMode("compact");
                                      setContentFilter("dpp");
                                      if (item.chapter) setLectureSearch(item.chapter);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 hover:bg-purple-500/20 transition-all cursor-pointer"
                                    title={item.dppTitle}
                                  >
                                    <FileQuestion className="w-3.5 h-3.5 shrink-0" />
                                    <span>Attempt DPP</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                )}

                                {item.type === "NOTES" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setScheduleViewMode("compact");
                                      if (item.chapter) setLectureSearch(item.chapter);
                                    }}
                                    className="h-8 px-3 rounded-xl text-xs font-semibold"
                                  >
                                    <FileText className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                                    Notes &amp; more
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (isUpcoming) {
                                        alert(`This lecture is scheduled for ${formatDateHeading(item.date)} at ${formatScheduleTime(item.startTime)}. Video stream will activate when live.`);
                                        return;
                                      }
                                      setScheduleViewMode("compact");
                                      if (item.topic) {
                                        const kw = item.topic.split(":")[0].trim();
                                        setLectureSearch(kw);
                                      }
                                    }}
                                    className={`h-8 px-3 rounded-xl text-xs font-bold gap-1.5 ${
                                      isLive
                                        ? "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                                        : ""
                                    }`}
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Watch
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Sticky Calendar Widget */}
              <div className="lg:col-span-4">
                <Card className="p-5 rounded-3xl border border-border/80 bg-card shadow-xs sticky top-20 space-y-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <h4 className="font-bold text-sm sm:text-base text-foreground">
                      {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="h-7 w-7 rounded-lg"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          setCalendarMonth(today);
                          const todayIst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(today);
                          setSelectedScheduleDate(todayIst);
                        }}
                        className="h-7 px-2 text-[11px] font-bold rounded-lg"
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="h-7 w-7 rounded-lg"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Weekday Row (Monday Start) */}
                  <div className="grid grid-cols-7 text-center">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={i} className="text-[11px] font-bold text-muted-foreground py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {/* Blank cells for offset */}
                    {Array.from({ length: getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => (
                      <div key={`blank-${i}`} className="w-8 h-8 sm:w-9 sm:h-9" />
                    ))}

                    {/* Month Days */}
                    {Array.from({ length: getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const isSelected = dateStr === selectedScheduleDate;
                      const todayIst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
                      const isToday = dateStr === todayIst;

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setSelectedScheduleDate(dateStr)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex items-center justify-center text-xs font-semibold transition-all relative ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-sm ring-2 ring-primary/40 scale-105"
                              : isToday
                              ? "ring-2 ring-primary text-primary font-bold hover:bg-primary/10"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                      <span>Selected date view</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full ring-2 ring-primary inline-block" />
                      <span>Today (IST)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── BATCH SELECTOR HEADER & GOAL SUGGESTIONS ──────── */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      Physics Wallah
                    </span>
                    {selectedGoal && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        Goal: {selectedGoal.displayName}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                    {currentBatch.name}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentBatch.target} • {currentBatch.description}
                  </p>
                </div>

                {/* Right Actions: Customize Faculty & Search All Batches */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFacultyModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  >
                    <Settings2 className="w-4 h-4" />
                    Customize Faculty ✎
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200">
                      {activeBatchSubjects.length} Active
                    </Badge>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setBatchSearchModalOpen(true)}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <Search className="w-4 h-4" />
                    Search All Batches ▾
                  </Button>
                </div>
              </div>

              {/* Goal-Suggested Batches (4-5 main batches matching user's goal) */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Suggested Batches for Your Goal:
                  </span>
                  <button
                    onClick={() => setBatchSearchModalOpen(true)}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    View More / All Batches ▾
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {suggestedBatches.map(b => {
                    const isSelected = selectedBatchId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBatchId(b.id);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30 scale-102 ring-2 ring-amber-500/40"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60"
                        }`}
                      >
                        <span>{b.name}</span>
                        {b.badge && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                            isSelected ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                          }`}>
                            {b.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overall Progress Bar Card (NO DOUBLE COUNTING) */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-foreground">Selected Faculty Progress:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {batchStats.completed} / {batchStats.total} Items Completed
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-base text-foreground">
                      {batchStats.percent}%
                    </span>
                    {batchStats.completed > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm("Reset all completed checkmarks for this batch?")) {
                            setCompletedMap({});
                          }
                        }}
                        className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
                        title="Reset completed ticks"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${batchStats.percent}%` }}
                  />
                </div>

                {/* Subject-Wise Micro Badges (Active faculty only) */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  {Object.entries(batchStats.subjectStats).map(([discName, stats]) => {
                    const subPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                    const badge = getSubjectBadge(discName);
                    return (
                      <div 
                        key={discName}
                        className="px-2.5 py-1 rounded-lg bg-background border border-border/80 flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        <span className="font-medium text-foreground">{discName}:</span>
                        <span className="font-mono font-bold text-primary">{stats.completed}/{stats.total}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">({subPct}%)</span>
                        {stats.faculty && (
                          <span className="text-[10px] text-muted-foreground hidden md:inline">
                            • {stats.faculty}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Upcoming Events Card */}
            {(() => {
              const eventsToShow = upcomingEvents.length > 0 ? upcomingEvents : todaySchedule;
              const upcomingCount = eventsToShow.length;

              return (
                <Card className="border border-border/80 bg-gradient-to-br from-amber-500/5 via-card to-card p-4 sm:p-5 rounded-3xl shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-bold text-foreground">
                            Upcoming Classes ({upcomingCount})
                          </h2>
                          {eventsToShow.some(s => s.isLive || s.tag?.toLowerCase() === "live") && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Today's live sessions &amp; weekly timetable
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScheduleViewMode("full")}
                      className="text-primary hover:text-primary font-bold text-xs gap-1 self-center"
                    >
                      View Full Schedule
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {eventsToShow.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {eventsToShow.slice(0, 4).map(item => {
                        const isLive = Boolean(item.isLive || item.tag?.toLowerCase() === "live");
                        const colors = getSubjectBadgeColor(item.subject);
                        const teacherInitials = getTeacherInitials(item.teacher);
                        const itemDate = item.date ? item.date.split("T")[0] : selectedScheduleDate;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedScheduleDate(itemDate);
                              setScheduleViewMode("full");
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                              isLive
                                ? "border-red-500/50 bg-red-500/5 shadow-xs ring-1 ring-red-500/20 hover:bg-red-500/10"
                                : "border-border/80 bg-background hover:border-primary/50 hover:bg-muted/30 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {item.teacherImage ? (
                                <img
                                  src={item.teacherImage}
                                  alt={item.teacher}
                                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-border"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${colors.avatar}`}>
                                  {teacherInitials}
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                  <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-primary" />
                                    {formatScheduleTime(item.startTime)}
                                  </span>
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white animate-pulse">
                                      LIVE
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                      UPCOMING
                                    </span>
                                  )}
                                  <span className="text-muted-foreground truncate">
                                    • {item.type === "NOTES" ? "Notes" : "Lecture"} • {item.subject} by {item.teacher}
                                  </span>
                                </div>

                                <p className="text-xs sm:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{item.topic}</span>
                                </p>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {scheduleMessage || "No upcoming events scheduled right now."}
                    </p>
                  )}

                  <Button
                    onClick={() => setScheduleViewMode("full")}
                    variant="outline"
                    className="w-full h-10 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 font-bold text-xs gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Open Weekly Schedule &amp; Calendar
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Card>
              );
            })()}

            {/* ── HIERARCHICAL NAVIGATION (LEVEL 1 / 2 / 3) ──────── */}
            {/* LEVEL 3: CHAPTER OR STUDY MATERIAL DETAIL VIEW */}
            {selectedChapter !== null && selectedSubject !== null ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Back to Subject */}
                <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChapter(null)}
                      className="gap-2 text-xs font-semibold rounded-xl self-start"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to {selectedSubject.name}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs font-bold">
                        {isStudyMaterialChapter(selectedChapter.title) ? "Study Material" : "Chapter"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                      <BookOpen className="w-6 h-6 text-primary" />
                      {selectedChapter.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSubject.name} • {selectedSubject.faculty || "Faculty"} • {selectedChapter.lectures.length} Total Items
                    </p>
                  </div>

                  {/* Chapter Progress Bar */}
                  {(() => {
                    const totalLec = selectedChapter.lectures.length;
                    const compLec = selectedChapter.lectures.filter(l => completedMap[l.id]).length;
                    const pct = totalLec > 0 ? Math.round((compLec / totalLec) * 100) : 0;
                    return (
                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">
                            Completion: {compLec} / {totalLec} items completed
                          </span>
                          <span className="font-mono font-bold text-primary">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Filters within Chapter */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search inside this chapter..."
                        value={lectureSearch}
                        onChange={(e) => setLectureSearch(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs bg-background border-border"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Content Type Filter */}
                      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                        {[
                          { key: "all", label: `All (${selectedChapter.lectures.length})` },
                          { key: "lecture", label: `Lectures (${selectedChapter.lectures.filter(l => l.type !== "dpp").length})` },
                          { key: "dpp", label: `DPPs (${selectedChapter.lectures.filter(l => l.type === "dpp").length})` },
                        ].map(t => (
                          <button
                            key={t.key}
                            onClick={() => setContentFilter(t.key as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              contentFilter === t.key
                                ? "bg-background text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                        {[
                          { key: "all", label: "All" },
                          { key: "pending", label: "Pending" },
                          { key: "completed", label: "Done" },
                        ].map(s => (
                          <button
                            key={s.key}
                            onClick={() => setStatusFilter(s.key as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              statusFilter === s.key
                                ? "bg-background text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <Card className="rounded-2xl border border-border/80 overflow-hidden divide-y divide-border/60 bg-card shadow-xs">
                  {(() => {
                    const filtered = selectedChapter.lectures.filter(l => {
                      if (contentFilter !== "all" && l.type !== contentFilter) return false;
                      if (statusFilter === "completed" && !completedMap[l.id]) return false;
                      if (statusFilter === "pending" && completedMap[l.id]) return false;
                      if (lectureSearch.trim().length > 0) {
                        const q = lectureSearch.toLowerCase();
                        if (!l.title.toLowerCase().includes(q)) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No items match the current filters.
                        </div>
                      );
                    }

                    return filtered.map(lec => {
                      const isChecked = Boolean(completedMap[lec.id]);
                      const isDpp = lec.type === "dpp";
                      const pdfUrl = lec.pdfUrl || lec.notesUrl || lec.dppPdfUrl;

                      return (
                        <div
                          key={lec.id}
                          className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 transition-colors ${
                            isChecked
                              ? "bg-emerald-50/30 dark:bg-emerald-950/15 text-muted-foreground"
                              : "hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <div
                            onClick={() => toggleLectureCompletion(lec.id)}
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer select-none"
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                : isDpp
                                ? "border-purple-500/40 bg-background hover:border-purple-500"
                                : "border-border/80 bg-background hover:border-primary"
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs sm:text-sm font-medium leading-tight ${
                                isChecked ? "line-through opacity-75" : ""
                              }`}>
                                {lec.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                {lec.duration && <span>{lec.duration}</span>}
                                {lec.date && <span>• {new Date(lec.date).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isDpp
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            }`}>
                              {isDpp ? "DPP" : "Lecture"}
                            </span>

                            {pdfUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(pdfUrl, "_blank", "noopener,noreferrer");
                                }}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1"
                                title="Open PDF"
                              >
                                <FileText className="w-3 h-3 text-red-500" />
                                PDF
                              </Button>
                            ) : null}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoModalLec(lec);
                              }}
                              className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1 bg-primary/5 hover:bg-primary/15 text-primary border-primary/20"
                            >
                              <Play className="w-3 h-3 fill-primary text-primary" />
                              Watch
                            </Button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </Card>
              </div>
            ) : selectedSubject !== null ? (
              /* LEVEL 2: SUBJECT VIEW (CHAPTERS & STUDY MATERIAL TABS) */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Back to Subjects & Subject Header */}
                <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubject(null)}
                      className="gap-2 text-xs font-semibold rounded-xl self-start"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Subjects
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFacultyModalOpen(true)}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 gap-1.5 self-start sm:self-auto"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Switch Teacher
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const badge = getSubjectBadge(selectedSubject.name);
                          return (
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                        <h2 className="text-xl sm:text-2xl font-black text-foreground">
                          {selectedSubject.name}
                        </h2>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Faculty: {selectedSubject.faculty || "PW Faculty"} • {selectedSubject.chapters.length} Sections
                      </p>
                    </div>

                    {/* Overall Subject Progress */}
                    {(() => {
                      let subTot = 0;
                      let subDone = 0;
                      selectedSubject.chapters.forEach(c => c.lectures.forEach(l => {
                        subTot++;
                        if (completedMap[l.id]) subDone++;
                      }));
                      const pct = subTot > 0 ? Math.round((subDone / subTot) * 100) : 0;
                      return (
                        <div className="sm:text-right">
                          <div className="font-mono font-bold text-lg text-primary">{pct}%</div>
                          <div className="text-[11px] text-muted-foreground">{subDone}/{subTot} Completed</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Level 2 Tabs: Chapters | Study Material (NO digital books as requested) */}
                <div className="flex items-center gap-3 border-b border-border/80 pb-1">
                  {[
                    { key: "chapters", label: "Chapters", icon: BookOpen },
                    { key: "studyMaterial", label: "Study Material", icon: FileText },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = selectedSubjectTab === tab.key;
                    const count = tab.key === "chapters"
                      ? selectedSubject.chapters.filter(ch => !isStudyMaterialChapter(ch.title)).length
                      : selectedSubject.chapters.filter(ch => isStudyMaterialChapter(ch.title)).length;

                    return (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedSubjectTab(tab.key as any)}
                        className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                          isActive
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* 3-Column Grid of Chapters or Study Material */}
                {selectedSubjectTab === "chapters" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedSubject.chapters
                      .filter(ch => !isStudyMaterialChapter(ch.title))
                      .map((ch, idx) => {
                        const totalLec = ch.lectures.length;
                        const compLec = ch.lectures.filter(l => completedMap[l.id]).length;
                        const isComplete = totalLec > 0 && compLec === totalLec;
                        const lecs = ch.lectures.filter(l => l.type !== "dpp").length;
                        const dpps = ch.lectures.filter(l => l.type === "dpp").length;
                        const pct = totalLec > 0 ? Math.round((compLec / totalLec) * 100) : 0;

                        return (
                          <div
                            key={ch.id}
                            onClick={() => setSelectedChapter(ch)}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                              isComplete
                                ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15 shadow-2xs"
                                : "border-border/80 bg-card hover:border-primary/50 hover:shadow-md"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                                  CH - {String(idx + 1).padStart(2, "0")}
                                </span>
                                {isComplete && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Completed
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {ch.title}
                              </h3>

                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium flex-wrap">
                                <span>Lecture: {lecs}/{lecs}</span>
                                <span>•</span>
                                <span>DPP: {dpps}/{dpps}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-primary">{compLec}/{totalLec}</span>
                                <span className="text-muted-foreground">({pct}%)</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedSubject.chapters
                      .filter(ch => isStudyMaterialChapter(ch.title))
                      .map((ch, idx) => {
                        const totalLec = ch.lectures.length;
                        const compLec = ch.lectures.filter(l => completedMap[l.id]).length;
                        const isComplete = totalLec > 0 && compLec === totalLec;

                        return (
                          <div
                            key={ch.id}
                            onClick={() => setSelectedChapter(ch)}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                              isComplete
                                ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15 shadow-2xs"
                                : "border-border/80 bg-card hover:border-primary/50 hover:shadow-md"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                                  SM - {String(idx + 1).padStart(2, "0")}
                                </span>
                                {isComplete && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3 stroke-[3]" /> Done
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {ch.title}
                              </h3>

                              <div className="text-xs text-muted-foreground font-medium">
                                Items: {totalLec} • Completed: {compLec}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-semibold">View Materials</span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              /* LEVEL 1: BATCH VIEW (SUBJECTS & RESOURCES TABS) */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Level 1 Main Tabs: Subjects | Resources */}
                <div className="flex items-center justify-between border-b border-border/80 pb-1 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {[
                      { key: "subjects", label: "Subjects", count: facultyFilterMode === "myFaculty" ? activeBatchSubjects.length : currentBatch.subjects.length },
                      { key: "resources", label: "Resources", count: BATCH_RESOURCES.length },
                    ].map(tab => {
                      const isActive = activeBatchTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveBatchTab(tab.key as any)}
                          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                            isActive
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                            {tab.count}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  {/* Teacher Filter Toggle (My Faculty vs All Teachers) */}
                  {activeBatchTab === "subjects" && currentBatch.subjects.length > activeBatchSubjects.length && (
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs">
                      <button
                        onClick={() => setFacultyFilterMode("myFaculty")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          facultyFilterMode === "myFaculty"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        My Faculty ({activeBatchSubjects.length})
                      </button>
                      <button
                        onClick={() => setFacultyFilterMode("all")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          facultyFilterMode === "all"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All Teachers ({currentBatch.subjects.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Tab 1: Subjects Grid (3 Columns) */}
                {activeBatchTab === "subjects" && (
                  <div>
                    {isLoadingBatch ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-3 animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-muted" />
                              <div className="space-y-1.5 flex-1">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="h-3 w-20 bg-muted/70 rounded" />
                              </div>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : (facultyFilterMode === "myFaculty" ? activeBatchSubjects : currentBatch.subjects).length === 0 ? (
                      <Card className="border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center space-y-2">
                        <p className="font-bold text-foreground">No subjects found for this batch</p>
                        <p className="text-xs text-muted-foreground">Select another batch or customize faculty choices.</p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(facultyFilterMode === "myFaculty" ? activeBatchSubjects : currentBatch.subjects).map((sub) => {
                          const badge = getSubjectBadge(sub.name);
                          const disc = getSubjectDiscipline(sub.name);
                          let subTotal = 0;
                          let subCompleted = 0;
                          sub.chapters.forEach(c => c.lectures.forEach(l => {
                            subTotal++;
                            if (completedMap[l.id]) subCompleted++;
                          }));
                          const pct = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

                          return (
                            <div
                              key={sub.name}
                              onClick={() => {
                                setSelectedSubject(sub);
                                setSelectedSubjectTab("chapters");
                                setSelectedChapter(null);
                              }}
                              className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                            >
                              <div className="space-y-3">
                                {/* Top Badge & Discipline */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${badge.bg} ${badge.text} border ${badge.border}`}>
                                      {badge.label}
                                    </span>
                                    <div>
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {disc}
                                      </span>
                                      <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                        {sub.name}
                                      </h3>
                                    </div>
                                  </div>
                                </div>

                                {sub.faculty && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="font-semibold">Faculty:</span> {sub.faculty}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 pt-2 border-t border-border/40">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-semibold">
                                    Completed: {subCompleted} / {subTotal}
                                  </span>
                                  <span className="font-mono font-bold text-primary">{pct}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                  <span>{sub.chapters.length} Chapters</span>
                                  <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                    View Subject <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Resources Grid (3 Columns) Matching UIvid.mp4 */}
                {activeBatchTab === "resources" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BATCH_RESOURCES.map(res => {
                      const Icon = res.icon;
                      return (
                        <div
                          key={res.id}
                          onClick={() => {
                            if (res.action === "schedule") {
                              setScheduleViewMode("full");
                            } else {
                              setResourceModal({
                                title: `${res.code} - ${res.title}`,
                                desc: res.desc,
                                link: res.action === "telegram" ? "https://t.me/physicswallah" : undefined
                              });
                            }
                          }}
                          className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                                {res.code}
                              </span>
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Icon className="w-4 h-4" />
                              </div>
                            </div>

                            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                              {res.title}
                            </h3>

                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {res.desc}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold">
                            <span>Open Resource</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MODAL 1: FACULTY CUSTOMIZATION MODAL ──────── */}
            {facultyModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-5 sm:p-6 border-b border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Settings2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">Customize Your Faculty</h3>
                        <p className="text-xs text-muted-foreground">
                          Choose the teachers you study with. Syllabus stats will only count selected teachers.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFacultyModalOpen(false)}
                      className="rounded-xl h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="p-5 sm:p-6 overflow-y-auto space-y-5 divide-y divide-border/40">
                    {Object.entries(disciplinesGrouped).map(([disc, subs]) => {
                      const badge = getSubjectBadge(disc);
                      const currentChosen = selectedFaculty[disc] || subs[0]?.name;

                      return (
                        <div key={disc} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            <h4 className="font-bold text-sm text-foreground">{disc}</h4>
                            <span className="text-xs text-muted-foreground">({subs.length} available)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {subs.map(s => {
                              const isSelected = currentChosen === s.name;
                              const teacher = s.faculty || s.name.split(/\bby\b/i)[1]?.trim() || s.name;

                              return (
                                <button
                                  key={s.name}
                                  type="button"
                                  onClick={() => handleSelectFaculty(disc, s.name)}
                                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2.5 ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                                      : "border-border/70 hover:border-border hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-xs text-foreground truncate">{teacher}</div>
                                    <div className="text-[11px] text-muted-foreground">{s.chapters.length} Chapters</div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex items-center justify-end">
                    <Button
                      onClick={() => setFacultyModalOpen(false)}
                      className="rounded-xl font-bold text-xs px-5"
                    >
                      Save &amp; Apply Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL 2: SEARCH ALL BATCHES MODAL ──────── */}
            {batchSearchModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-5 sm:p-6 border-b border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">Search PW Batches Catalog</h3>
                        <p className="text-xs text-muted-foreground">
                          Search from 16,000+ Physics Wallah batches in the live public catalog.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBatchSearchModalOpen(false)}
                      className="rounded-xl h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="p-4 sm:p-5 border-b border-border/40">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        autoFocus
                        placeholder="Type batch name (e.g. Arjuna 2.0, Prayas JEE, Lakshya)..."
                        value={batchSearch}
                        onChange={(e) => setBatchSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl text-xs bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 overflow-y-auto space-y-2 divide-y divide-border/30">
                    {visibleCatalogBatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        No batches matching "{batchSearch}". Try another keyword.
                      </div>
                    ) : (
                      visibleCatalogBatches.map(b => (
                        <div
                          key={b.batch_id}
                          className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 hover:bg-muted/30 p-2.5 rounded-xl transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{b.name}</h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[b.class, b.exam, b.language].filter(Boolean).join(" • ") || "Physics Wallah batch"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setBatches(prev => {
                                if (prev.some(existing => existing.id === b.batch_id)) return prev;
                                return [...prev, catalogToBatch(b)];
                              });
                              setSelectedBatchId(b.batch_id);
                              setBatchSearchModalOpen(false);
                            }}
                            className="rounded-xl text-xs font-bold h-8 px-3.5"
                          >
                            Select Batch
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL 3: RESOURCE DETAILS MODAL ──────── */}
            {resourceModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-base text-foreground">{resourceModal.title}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResourceModal(null)}
                      className="rounded-xl h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {resourceModal.desc}
                  </p>
                  <div className="pt-2 flex justify-end gap-2">
                    {resourceModal.link ? (
                      <Button
                        onClick={() => {
                          window.open(resourceModal.link, "_blank", "noopener,noreferrer");
                          setResourceModal(null);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Resource
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setResourceModal(null)}
                        className="rounded-xl text-xs font-bold"
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL 4: VIDEO WATCH MODAL ──────── */}
            {videoModalLec && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {videoModalLec.type === "dpp" ? "DPP Video Solution" : "Theory Video Lecture"}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-foreground">{videoModalLec.title}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setVideoModalLec(null)}
                      className="rounded-xl h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Duration: {videoModalLec.duration || "Standard Class"}</span>
                      {videoModalLec.date && <span>Date: {new Date(videoModalLec.date).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-muted-foreground">
                      This lecture stream is linked to your batch timetable. You can view associated PDFs or search related lecture resources below.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                    {(videoModalLec.pdfUrl || videoModalLec.notesUrl || videoModalLec.dppPdfUrl) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = videoModalLec.pdfUrl || videoModalLec.notesUrl || videoModalLec.dppPdfUrl;
                          if (url) window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-500" />
                        Open Class Notes / PDF
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        const kw = encodeURIComponent(videoModalLec.title);
                        window.open(`https://www.youtube.com/results?search_query=${kw}+physics+wallah`, "_blank", "noopener,noreferrer");
                        setVideoModalLec(null);
                      }}
                      className="rounded-xl text-xs font-bold gap-1.5 ml-auto bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Watch Online
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      )}

      {/* ── SUB-VIEW 3: MAIN "OTHERS" HUB LANDING PAGE ─────────────────────── */}
      {subView === "hub" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              Learning Hub &amp; Utilities
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Others &amp; Resources
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Select a module below to practice official JEE Main &amp; Advanced previous year questions or track your daily Physics Wallah lectures and DPP syllabus progress.
            </p>
          </div>

          {/* Cards Grid: Option 1 (Questions) & Option 2 (PW Tracker) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── OPTION 1: QUESTIONS ────────────────────────────────────── */}
            <div
              onClick={() => {
                setSubView("questions");
                navigate("/others/questions");
              }}
              className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/15 transition-all" />

              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileQuestion className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    14,183+ Verified PYQs
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    1. JEE Questions
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Official JEE Main &amp; JEE Advanced practice with paper-wise shifts, chapter-wise filters, CBT numerical keypads, and step-by-step LaTeX derivations.
                  </p>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    JEE Main 2010–2026
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    JEE Advanced Papers
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    172 Chapters
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Zero Delay 0ms CDN
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap to launch Question Practice
                </span>
                <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 shadow-sm group-hover:shadow-md transition-all">
                  Open Questions <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ── OPTION 2: PHYSICS WALLAH (PW) ─────────────────────────── */}
            <div
              onClick={() => {
                setSubView("pw");
                navigate("/others/pw");
              }}
              className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-all" />

              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Flame className="w-7 h-7 fill-amber-500 text-amber-500" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Daily Lecture Tracker
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-2">
                    2. PW (Physics Wallah)
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-500" />
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select your batch (Arjuna, Lakshya, Prayas, Manzil) and tick off lectures and DPPs as you complete them to track your daily syllabus completion.
                  </p>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Arjuna &amp; Lakshya
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Prayas Dropper
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Interactive Ticks
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Auto-Sync CDN
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap to track PW Batches &amp; Lectures
                </span>
                <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm group-hover:shadow-md transition-all">
                  Open PW Tracker <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
