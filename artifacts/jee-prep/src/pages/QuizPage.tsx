import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Settings,
  BookOpen,
  FileText,
  FileVideo,
  Globe,
  Save,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Trophy,
  Target,
  ArrowRight,
  Plus,
  Minus,
  Zap,
  Search,
  Trash2,
  Pencil,
  User,
  Info,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Square,
  Eye,
  Key,
  ShieldCheck,
  Timer,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FolderPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import AIChatInterface from "./AI";
import { fixLatexFormatting, extractInlineOptions, ensureMathWrapped } from "@/lib/latex-formatter";
import JSZip from "jszip";

// ─── Document Parser Helpers ────────────────────────────────────────────────
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file("word/document.xml")?.async("text");
    if (!docXml) return "";
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, "application/xml");
    const textNodes = xmlDoc.getElementsByTagName("w:t");
    let text = "";
    for (let i = 0; i < textNodes.length; i++) {
      text += (textNodes[i].textContent || "") + " ";
    }
    return text.trim();
  } catch (err) {
    console.error("docx parsing failed:", err);
    return "";
  }
}

async function extractTextFromPptx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = "";
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"));
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace("ppt/slides/slide", "").replace(".xml", ""), 10);
      const numB = parseInt(b.replace("ppt/slides/slide", "").replace(".xml", ""), 10);
      return numA - numB;
    });
    for (const file of slideFiles) {
      const slideXml = await zip.file(file)?.async("text");
      if (slideXml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXml, "application/xml");
        const textNodes = xmlDoc.getElementsByTagName("a:t");
        for (let i = 0; i < textNodes.length; i++) {
          text += (textNodes[i].textContent || "") + " ";
        }
        text += "\n";
      }
    }
    return text.trim();
  } catch (err) {
    console.error("pptx parsing failed:", err);
    return "";
  }
}

function extractStringsFromBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = "";
  let currentString = "";
  for (let i = 0; i < bytes.length; i++) {
    const char = bytes[i];
    if (char >= 32 && char <= 126) {
      currentString += String.fromCharCode(char);
    } else if (char === 10 || char === 13) {
      if (currentString.trim().length > 4) {
        result += currentString.trim() + "\n";
      }
      currentString = "";
    } else {
      if (currentString.trim().length > 4) {
        result += currentString.trim() + " ";
      }
      currentString = "";
    }
  }
  if (currentString.trim().length > 4) {
    result += currentString.trim();
  }
  return result
    .split("\n")
    .map(line => line.replace(/[^a-zA-Z0-9\s\.,!\?\-]/g, "").trim())
    .filter(line => line.split(/\s+/).length > 2)
    .join("\n");
}

// ─── Types ─────────────────────────────────────────────────────────────────
type QuizPhase = "setup" | "analyzing" | "active" | "results";
type Difficulty = "Easy" | "Medium" | "Hard" | "Mixed";

interface SelectedSources {
  pdfs: string[];
  saves: string[];
  videos: string[];
  urls: string[];
  internetSearch: {
    enabled: boolean;
    query: string;
  };
  uploads: {
    id: string;
    name: string;
    text?: string;
    dataUrl?: string;
    fileType: "pdf" | "image" | "text" | "docx" | "pptx";
  }[];
}

interface SelectableItem {
  id: string;
  name: string;
  path: string;
  mediaKey?: string;
  url?: string;
  fileType?: "pdf" | "image";
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: string;
  subject: string;
  confidence?: number;
  consensusAnalysis?: string;
  sourceQuestionId?: string;
  imageKey?: string;
  imageUrl?: string;
  questionType?: "STANDARD_MCQ" | "STATEMENT_BASED" | "MATCH_THE_FOLLOWING";
  questionImageUrl?: string;
  questionCropUrl?: string;
  hasEmbeddedOptions?: boolean;
  embeddedOptionsCropUrl?: string | null;
  hasIsolatedDiagram?: boolean;
  diagramImageUrl?: string;
  diagramCropUrl?: string | null;
  sourceInfo?: {
    sourceType: "pdf" | "video" | "saves" | "url" | "internet";
    sourceName: string;
    page?: number | string;
    timestamp?: string;
    questionNum?: string | number;
    detail?: string;
  };
}

interface SavedQuiz {
  id: string;
  name: string;
  createdAt: number;
  questions: Question[];
  difficulty: string;
}

interface SubjectPlan {
  count: number;
  difficulty: string;
}

const MODELS = [
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nemotron 3 Nano Omni 30B Reasoning (Free)", desc: "Deep reasoning and high precision for academic quizzes." },
  { id: "nvidia/llama-nemotron-rerank-vl-1b-v2:free", name: "Llama Nemotron Rerank VL 1B v2 (Free)", desc: "Multimodal and text reranking model." },
  { id: "nex-agi/nex-n2-pro:free", name: "Nex N2 Pro (Free)", desc: "Advanced chat and reasoning model." },
  { id: "nvidia/nemotron-3.5-content-safety:free", name: "Nemotron 3.5 Content Safety (Free)", desc: "Nvidia content safety model." },
  { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B (JSON Precision)", desc: "Best for structured JSON output and strict format adherence." },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct (Balanced)", desc: "Excellent, highly optimized model that balances reasoning depth with efficiency." }
];

// ─── Custom Shapes for JEE Question Palette ──────────────────────────────
const AnsweredShape = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 bg-[#22c55e] text-white flex items-center justify-center font-bold text-sm shadow-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
    {children}
  </div>
);

const NotAnsweredShape = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 bg-[#ef4444] text-white flex items-center justify-center font-bold text-sm shadow-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
    {children}
  </div>
);

const NotVisitedShape = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 bg-[#f3f4f6] border border-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm rounded shadow-sm">
    {children}
  </div>
);

const MarkedShape = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 bg-[#6b21a8] text-white flex items-center justify-center font-bold text-sm rounded-full shadow-sm">
    {children}
  </div>
);

const AnsweredMarkedShape = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 bg-[#6b21a8] text-white flex items-center justify-center font-bold text-sm rounded-full relative shadow-sm">
    {children}
    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] rounded-full border border-white"></div>
  </div>
);

// Review shape that shows green for correct, red for incorrect, and gray for skipped
const ReviewShape = ({ index, children, answers, questions }: { index: number; children: React.ReactNode; answers: Record<number, number>; questions: Question[] }) => {
  const ans = answers[index];
  const q = questions[index];
  if (ans === undefined) {
    return <NotVisitedShape>{children}</NotVisitedShape>;
  }
  if (ans === q.correctOptionIndex) {
    return <AnsweredShape>{children}</AnsweredShape>;
  }
  return <NotAnsweredShape>{children}</NotAnsweredShape>;
};

const quizOptionComponents = { p: ({node, ...props}: any) => <span {...props} /> };

// ─── Subject Planning & Exclusions Parsing ─────────────────────────────────
function planSubjects(
  brief: string,
  defaultDifficulty: string,
  totalCount: number,
  activeSources: SelectedSources,
  availablePdfs: SelectableItem[],
  availableSaves: SelectableItem[]
): Record<string, SubjectPlan> {
  const text = brief.trim().toLowerCase();
  
  // Initialize plan
  const plan: Record<string, SubjectPlan> = {
    Physics: { count: 0, difficulty: defaultDifficulty as any },
    Chemistry: { count: 0, difficulty: defaultDifficulty as any },
    Maths: { count: 0, difficulty: defaultDifficulty as any }
  };

  if (text.length > 0) {
    const subjects = ["physics", "chemistry", "maths"];
    let totalAllocated = 0;
    
    subjects.forEach(subj => {
      const displaySubj = subj === "physics" ? "Physics" : (subj === "chemistry" ? "Chemistry" : "Maths");
      
      // Matches count and custom difficulty expression (e.g. "5(Hard)" or "7(Hard+Meduim)" or "8 (Easy+Hard)")
      const regex = new RegExp(`(\\d+)\\s*(?:\\(?([a-z\\+\\s\\/\\\\\\(\\)-]+)\\)?)?\\s*(?:question|q)?s?\\s*(?:of|for)?\\s*${subj.replace("maths", "math")}`, "i");
      const match = text.match(regex);
      
      if (match) {
        const count = parseInt(match[1]);
        let diffStr = (match[2] || "").trim().toLowerCase();
        
        // Clean up diffStr (remove words like questions, etc. if matched by accident)
        diffStr = diffStr.replace(/(?:question|q)s?/g, "").trim();
        
        let diff = defaultDifficulty;
        if (diffStr.includes("easy") && diffStr.includes("hard")) {
          diff = "Easy+Hard";
        } else if (diffStr.includes("hard") && (diffStr.includes("medium") || diffStr.includes("meduim") || diffStr.includes("md"))) {
          diff = "Hard+Medium";
        } else if (diffStr.includes("easy") && (diffStr.includes("medium") || diffStr.includes("meduim"))) {
          diff = "Easy+Medium";
        } else if (diffStr.includes("easy")) {
          diff = "Easy";
        } else if (diffStr.includes("medium") || diffStr.includes("meduim")) {
          diff = "Medium";
        } else if (diffStr.includes("hard") || diffStr.includes("tough")) {
          diff = "Hard";
        } else if (diffStr.includes("mixed")) {
          diff = "Mixed";
        } else if (diffStr.length > 0) {
          diff = diffStr.split("+").map(s => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)).join("+");
          diff = diff.replace("Meduim", "Medium");
        }
        
        plan[displaySubj].count = count;
        plan[displaySubj].difficulty = diff;
        totalAllocated += count;
      }
    });
    
    // If no counts were found but some subjects were mentioned, or if some subjects are explicitly excluded
    if (totalAllocated === 0) {
      const mentionsPhysics = text.includes("physic") || text.includes("phy");
      const mentionsChemistry = text.includes("chemist") || text.includes("chem");
      const mentionsMaths = text.includes("math");
      
      const mentionedSubjects: string[] = [];
      if (mentionsPhysics) mentionedSubjects.push("Physics");
      if (mentionsChemistry) mentionedSubjects.push("Chemistry");
      if (mentionsMaths) mentionedSubjects.push("Maths");
      
      if (mentionedSubjects.length > 0) {
        // Distribute totalCount evenly among mentioned subjects
        const baseCount = Math.floor(totalCount / mentionedSubjects.length);
        const remainder = totalCount % mentionedSubjects.length;
        
        mentionedSubjects.forEach((subj, index) => {
          plan[subj].count = baseCount + (index < remainder ? 1 : 0);
          plan[subj].difficulty = defaultDifficulty as any;
        });
        return plan;
      }
    } else {
      // If we found some counts, check if they sum up to our total requested count
      if (totalAllocated === totalCount) {
        return plan;
      }
      
      const unallocated = totalCount - totalAllocated;
      if (unallocated > 0) {
        // Distribute remainder among subjects that currently have 0 count but are NOT excluded
        const mentionedInBrief = text.includes("phys") || text.includes("chem") || text.includes("math");
        const zeroSubjs = Object.keys(plan).filter(k => {
          if (plan[k].count > 0) return false;
          if (!mentionedInBrief) return true;
          const lowKey = k.toLowerCase();
          return text.includes(lowKey.replace("maths", "math"));
        });
        
        const activeZeroSubjs = zeroSubjs.length > 0 ? zeroSubjs : Object.keys(plan).filter(k => plan[k].count > 0);
        
        const baseCount = Math.floor(unallocated / activeZeroSubjs.length);
        const remainder = unallocated % activeZeroSubjs.length;
        activeZeroSubjs.forEach((subj, index) => {
          plan[subj].count += baseCount + (index < remainder ? 1 : 0);
        });
      }
      return plan;
    }
  }

  // Fallback: If brief is empty, distribute questions among subjects found in sources
  const activeSubjects = new Set<string>();
  
  // Check PDF names
  activeSources.pdfs.forEach(pdfId => {
    const item = availablePdfs.find(p => p.id === pdfId);
    if (item) {
      const pathLower = item.path.toLowerCase();
      if (pathLower.includes("phys")) activeSubjects.add("Physics");
      if (pathLower.includes("chem")) activeSubjects.add("Chemistry");
      if (pathLower.includes("math")) activeSubjects.add("Maths");
    }
  });
  
  // Check Saves names
  activeSources.saves.forEach(saveId => {
    const item = availableSaves.find(p => p.id === saveId);
    if (item) {
      const pathLower = item.path.toLowerCase();
      if (pathLower.includes("phys")) activeSubjects.add("Physics");
      if (pathLower.includes("chem")) activeSubjects.add("Chemistry");
      if (pathLower.includes("math")) activeSubjects.add("Maths");
    }
  });

  const finalActive = activeSubjects.size > 0 ? Array.from(activeSubjects) : ["Physics", "Chemistry", "Maths"];
  
  const baseCount = Math.floor(totalCount / finalActive.length);
  const remainder = totalCount % finalActive.length;
  
  finalActive.forEach((subj, index) => {
    plan[subj].count = baseCount + (index < remainder ? 1 : 0);
    plan[subj].difficulty = defaultDifficulty as any;
  });

  return plan;
}

function buildSubjectPrompt(params: {
  subject: string;
  count: number;
  difficulty: string;
  brief: string;
  contextText: string;
  sources: SelectedSources;
}) {
  const { subject, count, difficulty, brief, contextText, sources } = params;
  const internetSearch = sources.internetSearch;

  const selectedTypes: string[] = [];
  if (sources.pdfs.length > 0) selectedTypes.push("PDF");
  if (sources.videos.length > 0) selectedTypes.push("Video");
  if (sources.saves.length > 0) selectedTypes.push("Saves");
  if (sources.urls.length > 0) selectedTypes.push("URL");
  if (sources.internetSearch.enabled) selectedTypes.push("Internet Fetching");

  let sourceConstraintInstruction = "";
  if (selectedTypes.length === 1) {
    const type = selectedTypes[0];
    if (type === "PDF") {
      sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (STRICT ONLY-PDF MODE):
- The user has selected ONLY PDF documents as the source.
- You MUST construct these questions ONLY from the text provided in the "CONTEXT MATERIALS" section under the "[PDF Source File: ...]" headers.
- Do NOT use internet search, do NOT fetch external data, and do NOT use general knowledge to construct questions outside the context materials. Every question MUST correspond directly to a concept, formula, or problem described in the PDF context.
- Your "sourceInfo" for every question MUST have: sourceType "pdf", sourceName (the exact PDF file name), page (page number from context), and questionNum (the specific question number or equation on that page).`;
    } else if (type === "Video") {
      sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (STRICT ONLY-VIDEO MODE):
- The user has selected ONLY video timelines/notes as the source.
- You MUST construct these questions ONLY from the text provided in the "CONTEXT MATERIALS" section under the "[Video Source: ...]" headers.
- Do NOT use internet search and do NOT invent questions unrelated to the video notes.
- Your "sourceInfo" for every question MUST have: sourceType "video", sourceName (video title), timestamp (time string e.g. "12:35"), and questionNum (topic/index number).`;
    } else if (type === "URL") {
      sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (STRICT ONLY-URL MODE):
- The user has selected ONLY reference URLs as the source.
- You MUST construct these questions ONLY from the context provided in the "CONTEXT MATERIALS" section under "[URL Source: ...]" or "[PDF Source File Reference: ...]" headers.
- Do NOT use internet search or training data to generate unrelated questions.
- Your "sourceInfo" for every question MUST have: sourceType "url", sourceName (the exact URL), page (section/page name), and questionNum (question number if applicable).`;
    } else if (type === "Saves") {
      sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (STRICT ONLY-SAVES MODE):
- The user has selected ONLY saved questions as the source.
- You MUST construct these questions ONLY from the saved questions provided in the "CONTEXT MATERIALS" section under "[Saves Source Collection: ...]".
- Your "sourceInfo" for every question MUST have: sourceType "saves", sourceName (collection name), and detail (exact saved question identifier).`;
    } else if (type === "Internet Fetching") {
      sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (STRICT ONLY-INTERNET MODE):
- The user has selected ONLY internet fetching/search.
- You MUST construct these questions from current, high-quality JEE exam sources on the internet matching the query: "${sources.internetSearch.query}".
- Your "sourceInfo" for every question MUST have: sourceType "internet", sourceName: "${sources.internetSearch.query || 'Internet Fetching'}", and detail (search query/concept used).`;
    }
  } else if (selectedTypes.length > 1) {
    sourceConstraintInstruction = `
CRITICAL SOURCE SELECTION CONSTRAINT (MIXED MODE):
- The user has selected multiple sources: ${selectedTypes.join(", ")}.
- You MUST distribute the generated questions across these selected sources. Specifically, generate a balanced combination of questions directly from the CONTEXT MATERIALS (PDFs/Videos/Saves/URLs) and the INTERNET SEARCH query (if enabled). Do NOT use any sources outside these selected types.
- Ensure that the questions are tagged with the correct sourceType in "sourceInfo" matching the exact source from which it was taken.
- For PDF sources, identify page and question number. For URLs, identify page/section and question number. For videos, identify name and timestamp.`;
  }
  
  return `You are an expert JEE Advanced examiner. Your task is to generate high-quality, exam-style questions for the subject: "${subject}".

CRITICAL SPECIFICATIONS:
1. Target Subject: "${subject}". Every question generated MUST belong strictly to the subject "${subject}" (e.g. Physics concepts only for Physics). Do NOT mix mathematics concepts in chemistry or physics unless it is a standard interdisciplinary concept, and keep it firmly in "${subject}".
2. Number of questions to generate: EXACTLY ${count}.
3. Target Difficulty: ${difficulty} (Note: Hard questions must involve multi-step calculations, deep conceptual understanding, or advanced application of formulas typical of JEE Advanced. Easy/Medium questions should match standard JEE Main levels).

${sourceConstraintInstruction}

INSTRUCTIONS REGARDING USER GUIDELINES:
${brief ? `The user has specified the following custom guidelines: "${brief}". Adhere to this as closely as possible when choosing topics, difficulty ratios, or specific sub-topics for this batch.` : "Adhere to the provided source context for topic selection."}

CRITICAL FORMATTING INSTRUCTIONS FOR MATH/PHYSICS/CHEMISTRY AND TABLES:
- You MUST use LaTeX formatting for all math, physics, and chemistry equations, formulas, symbols, coordinates, vectors, and matrices.
- MUST wrap ALL inline equations, numbers, and vectors in single dollar signs: e.g., $x^2 + y^2 = r^2$ or $[2, -1, -2]$
- MUST wrap standalone block equations in double dollar signs: e.g., $$\\frac{A x^2}{B t}$$
- NEVER leave math, vectors (like [1, 2, -2]), or formulas as plain text. Always wrap them in $...$
- NEVER use [ ... ] or \\[ ... \\] or \\( ... \\) for math. ALWAYS use $$ ... $$ for block math and $ ... $ for inline math.
- For chemical equations, use LaTeX notation (e.g. $\\text{H}_2\\text{SO}_4$).
- If the question contains multiple statements, items, or internal options (e.g., (1) ..., (2) ..., (3) ... or Statement I, Statement II), YOU MUST format them vertically by adding newlines (\\n) before each item in the "text" field so they appear on separate lines.
- NEVER embed the main four multiple-choice options (e.g., (A), (B), (C), (D) or (1), (2), (3), (4)) inside the "text" field. You MUST place the full text of each option exclusively inside the "options" array. The "text" field must only contain the question description and statement.
- DO NOT output literal "/n" or "\\n" as text; format equations and lists with correct LaTeX or real newlines.
Do not use Unicode approximations. Output strict LaTeX.

CRITICAL JSON ESCAPING REQUIREMENT:
Because your response must be valid JSON, you MUST double-escape ALL backslashes used in your LaTeX.
For example:
- WRONG: "\\alpha + \\beta"
- CORRECT: "\\\\alpha + \\\\beta"
- WRONG: "\\text{(i)}"
- CORRECT: "\\\\text{(i)}"
If you do not double-escape backslashes, the JSON parser will fail.

CRITICAL SOURCES LINKING & ATTRIBUTION RULE:
- If a question from the "SAVED QUESTIONS" in the context has a diagram or image ("Has Diagram/Image: YES"), and you adapt, rewrite, or use this question in the generated quiz, you MUST output its exact "Saved Question ID" (e.g., "src_id::q_id") in the "sourceQuestionId" field of the JSON object.
- You MUST also refer to the diagram/image in your question text (e.g., "as shown in the figure" or "as shown in the diagram below") and keep it exactly linked so that the UI can render it.
- For EACH question, you MUST determine and state the exact source used in the "sourceInfo" JSON object:
  a. For PDF documents: sourceType "pdf", sourceName: name of the file, page: page number (integer) from the source context, and questionNum: the specific question number or section label on that page from the PDF text.
  b. For videos: sourceType "video", sourceName: name of the video, timestamp: time string (e.g. "12:35") from the note, and questionNum: the note index or sequence number.
  c. For saved questions: sourceType "saves", sourceName: collection/saves name, detail: original question identifier.
  d. For reference URL: sourceType "url", sourceName: exact URL, page: page/section index, and questionNum: question number on that website.
  e. For general internet search/fetching: sourceType "internet", sourceName: "${internetSearch.query || 'Internet Fetching'}", detail: search query/concept used.

CRITICAL JSON FORMATTING RULES:
1. Output EXACTLY ONE valid JSON array. No extra text before or after.
2. Do NOT use literal newlines in strings. Use \\n instead.
3. Ensure no trailing commas before closing brackets.
4. Provide exactly ${count} questions.

IMPORTANT: Respond ONLY with a valid JSON array of objects. Do not wrap it in markdown. Ensure the JSON array is properly closed at the end.
Format for each object:
[
  {
    "id": "q_${subject.toLowerCase()}_${Date.now()}_[index]",
    "text": "The actual question text here with $math$...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "explanation": "Detailed step-by-step explanation including calculations with $math$.",
    "difficulty": "${difficulty}",
    "subject": "${subject}",
    "sourceQuestionId": "",
    "sourceInfo": {
      "sourceType": "pdf",
      "sourceName": "document_name.pdf",
      "page": 4,
      "questionNum": "Question 10",
      "timestamp": "00:00",
      "detail": "..."
    }
  }
]

--- CONTEXT MATERIALS START ---
${contextText}
--- CONTEXT MATERIALS END ---

${internetSearch.enabled && internetSearch.query ? `Additionally, include up-to-date, rigorous questions on this topic from the internet search query: ${internetSearch.query}` : ""}
`;
}

function extractJson(raw: string): any {
  let cleanedText = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const firstBracket = cleanedText.indexOf('[');
  const firstBrace = cleanedText.indexOf('{');
  
  if (firstBracket === -1 && firstBrace === -1) {
      throw new Error("No JSON structure found");
  }
  
  let isArray = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace));
  let startIndex = isArray ? firstBracket : firstBrace;
  cleanedText = cleanedText.substring(startIndex);
  
  let lastBracket = cleanedText.lastIndexOf(']');
  let lastBrace = cleanedText.lastIndexOf('}');
  let endIndex = isArray ? lastBracket : lastBrace;
  
  if (endIndex !== -1) {
      cleanedText = cleanedText.substring(0, endIndex + 1);
  } else {
      cleanedText += isArray ? ']' : '}';
  }
  
  let parsed;
  try {
      parsed = JSON.parse(cleanedText);
  } catch (e) {
      let repaired = cleanedText.replace(/\\(.)/g, (match, char, offset) => {
        if (char === '"' || char === '\\') return match;
        if (char === 'n' || char === 'r' || char === 't') {
          const nextChar = cleanedText[offset + 2];
          if (nextChar && /[a-zA-Z]/.test(nextChar)) {
            return '\\\\' + char;
          }
          return match;
        }
        return '\\\\' + char;
      });

      repaired = repaired
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/,\s*]/g, "]")
          .replace(/,\s*}/g, "}");
      
      try {
          parsed = JSON.parse(repaired);
      } catch(e2) {
          let lastValidEnd = repaired.lastIndexOf('},');
          if (lastValidEnd !== -1) {
              repaired = repaired.substring(0, lastValidEnd + 1) + (isArray ? ']' : '}');
              try {
                  parsed = JSON.parse(repaired);
              } catch(e3) {
                  return isArray ? [] : {};
              }
          } else {
              return isArray ? [] : {};
          }
      }
  }
  
  if (isArray && Array.isArray(parsed) && parsed.length === 1 && parsed[0] && !parsed[0].text) {
      for (let key in parsed[0]) {
          if (Array.isArray(parsed[0][key])) {
              return parsed[0][key];
          }
      }
  } else if (!isArray && typeof parsed === 'object') {
      for (let key in parsed) {
          if (Array.isArray(parsed[key])) {
              return parsed[key];
          }
      }
      return [parsed];
  }
  return parsed;
}

async function fetchWebSearchResults(query: string, timeFilter?: string): Promise<string> {
  try {
    let url = `/api/search?q=${encodeURIComponent(query)}`;
    if (timeFilter) {
      url += `&df=${timeFilter}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Search request failed");
    
    const data = await res.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      return "No search results found.";
    }
    
    let searchSummaries = "";
    results.slice(0, 5).forEach((item: any, idx: number) => {
      searchSummaries += `[Source ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}\nThumbnail: ${item.thumbnail || ""}\n\n`;
    });
    
    return searchSummaries;
  } catch (error) {
    console.warn("Local search API failed or backend server is not running. Falling back to direct client-side search via CORS proxy:", error);
    try {
      const encoded = encodeURIComponent(query);
      let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
      if (timeFilter) {
        searchUrl += `&df=${timeFilter}`;
      }
      
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("CORS proxy search request failed");
      
      const html = await res.text();
      if (!html.includes("result results_links")) {
        return "No search results found.";
      }
      
      const decodeHTMLEntities = (str: string): string => {
        return str
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, "/")
          .replace(/&ndash;/g, "–")
          .replace(/&mdash;/g, "—")
          .replace(/&nbsp;/g, " ");
      };

      const parts = html.split('class="result results_links');
      const results = parts.slice(1, 6).map((part) => {
        const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
        const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        
        let url = hrefMatch ? hrefMatch[1] : "";
        if (url.startsWith("//")) {
          url = "https:" + url;
        }
        if (url.startsWith("/l/") || url.includes("uddg=")) {
          const match = url.match(/[?&]uddg=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }
        
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        
        title = decodeHTMLEntities(title);
        snippet = decodeHTMLEntities(snippet);
        
        return { url, title, snippet };
      });

      if (results.length === 0) {
        return "No search results found.";
      }

      let searchSummaries = "";
      results.forEach((item, idx) => {
        searchSummaries += `[Source ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}\nThumbnail: \n\n`;
      });
      
      return searchSummaries;
    } catch (fallbackError) {
      console.error("Fallback direct web search failed:", fallbackError);
      return "Failed to retrieve search results.";
    }
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.statusText}`);
    const text = await res.text();
    
    try {
      const parsed = JSON.parse(text);
      return `[JSON Content from URL ${url}]:\n` + JSON.stringify(parsed, null, 2);
    } catch {
      const cleanText = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return `[Text Content from URL ${url}]:\n` + cleanText;
    }
  } catch (err: any) {
    console.error(`Error fetching URL content for ${url}:`, err);
    return `[URL Source: "${url}" (Error fetching content: ${err.message})]`;
  }
}

async function renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };
  await page.render(renderContext).promise;
  return canvas;
}

function cropDiagramFromCanvas(
  originalCanvas: HTMLCanvasElement,
  boundingBox: any
): string {
  if (!Array.isArray(boundingBox) || boundingBox.length !== 4) return "";
  let [ymin, xmin, ymax, xmax] = boundingBox.map(Number);
  
  if (isNaN(ymin) || isNaN(xmin) || isNaN(ymax) || isNaN(xmax)) return "";
  
  ymin = Math.max(0, Math.min(1000, ymin));
  xmin = Math.max(0, Math.min(1000, xmin));
  ymax = Math.max(0, Math.min(1000, ymax));
  xmax = Math.max(0, Math.min(1000, xmax));
  
  if (ymax <= ymin || xmax <= xmin) return "";
  
  const width = originalCanvas.width;
  const height = originalCanvas.height;
  
  const x = (xmin / 1000) * width;
  const y = (ymin / 1000) * height;
  const w = ((xmax - xmin) / 1000) * width;
  const h = ((ymax - ymin) / 1000) * height;
  
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const ctx = cropCanvas.getContext("2d");
  
  if (ctx) {
    ctx.drawImage(originalCanvas, x, y, w, h, 0, 0, w, h);
    return cropCanvas.toDataURL("image/png");
  }
  return "";
}

function cropFromCanvas(
  canvas: HTMLCanvasElement,
  bounds: { top: number; left: number; width: number; height: number } | null
): string {
  if (!bounds) return "";
  const { top, left, width, height } = bounds;
  
  const x = (left / 100) * canvas.width;
  const y = (top / 100) * canvas.height;
  const w = (width / 100) * canvas.width;
  const h = (height / 100) * canvas.height;
  
  if (w <= 0 || h <= 0) return "";
  
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const ctx = cropCanvas.getContext("2d");
  
  if (ctx) {
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return cropCanvas.toDataURL("image/png");
  }
  return "";
}

async function extractQuestionsFromPageImage(
  imageDataUrl: string,
  apiKey: string,
  modelName: string,
  questionNumbers?: string,
  signal?: AbortSignal
): Promise<any[]> {
  try {
    const response = await fetch("/api/quiz/extract-page", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageDataUrl,
        model: modelName,
        questionNumbers
      }),
      signal
    });
    if (!response.ok) {
      throw new Error(`Backend extraction error: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data.questions) ? data.questions : [];
  } catch (err: any) {
    console.error("extractQuestionsFromPageImage error:", err);
    throw err;
  }
}

async function extractQuestionsFromContext(
  contextText: string,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal
): Promise<any[]> {
  const promptText = `You are a highly precise scientific text parser.
Your task is to scan the provided CONTEXT MATERIALS (which contain text from student materials, PDFs, and websites) and extract JEE exam questions.

CRITICAL DIRECTIVES:
1. Every extracted question's text MUST be a direct, literal copy-paste of the question text found in the CONTEXT MATERIALS. Do NOT paraphrase, summarize, correct, or change even a single character, word, equation, or line. If the question in the source text is "asdfghjkl", then your extracted question text MUST be "asdfghjkl" exactly.
2. If a question has options listed inline in the source text (e.g. "(1) R = ... \\n(2) R = ..."), extract them exactly as they are. If there are no options, leave the options array empty.
3. For each question, extract/identify:
   - "text": The literal question text word-for-word from the context.
   - "options": An array of the options exactly as written in the context (if available).
   - "subject": Categorize the question as strictly "Physics", "Chemistry", or "Maths".
   - "difficulty": Assess its difficulty level as "Easy", "Medium", or "Hard".
   - "sourceInfo": An object containing:
     * "sourceType": "pdf" or "url" (or "saves" or "video" depending on headers)
     * "sourceName": The exact file name or URL of the source
     * "page": The page number if from PDF (e.g., 5)
     * "questionNum": The question number or label in the source text (e.g., "Question 12")

Respond with ONLY a valid JSON array of objects. Do not wrap it in markdown code blocks or write any introductory or concluding text.

JSON format:
[
  {
    "text": "Literal question text here...",
    "options": ["Option 1 text...", "Option 2 text...", "Option 3 text...", "Option 4 text..."],
    "subject": "Physics",
    "difficulty": "Hard",
    "sourceInfo": {
      "sourceType": "pdf",
      "sourceName": "chapter1.pdf",
      "page": 3,
      "questionNum": "12"
    }
  }
]

CONTEXT MATERIALS:
${contextText}
`;

  const payload = {
    model: modelName,
    messages: [{ role: "user", content: promptText }]
  };

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Extractor", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch {
    response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Extractor", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  }

  if (!response.ok) {
    throw new Error(`OpenRouter Extraction Error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "[]";
  const parsed = extractJson(rawText);
  return Array.isArray(parsed) ? parsed : [];
}

async function extractOrGenerateQuestionsForSource(
  sourceText: string,
  sourceInfo: { sourceType: "pdf" | "video" | "url" | "saves" | "internet"; sourceName: string; detail?: string },
  apiKey: string,
  modelName: string,
  signal?: AbortSignal
): Promise<any[]> {
  const promptText = `You are an expert IIT-JEE exam question writer and compiler.
We are analyzing a specific study resource:
- Source Type: ${sourceInfo.sourceType}
- Source Name: ${sourceInfo.sourceName}
${sourceInfo.detail ? `- Detail: ${sourceInfo.detail}` : ""}

Content from this source:
=== SOURCE CONTENT START ===
${sourceText}
=== SOURCE CONTENT END ===

Your tasks:
1. Scan the SOURCE CONTENT. If it contains explicit multiple-choice questions (e.g. text of a question with option choices), extract them.
2. If it does NOT contain explicit multiple-choice questions, but discusses academic/scientific concepts, equations, derivations, or problems (which is common for video notes, transcripts, or reference articles), you MUST generate/derive new, high-quality, mathematically rigorous JEE Advanced level multiple-choice questions based on these concepts.
3. Generate up to 5 questions for this source. Each question MUST be a complete, self-contained question. Do NOT truncate, summarize, or leave descriptions half-finished (no "half-text" questions).
4. Every question must have:
   - "text": The complete question text. Ensure it is fully written out, self-contained, and contains all necessary details.
   - "options": An array of exactly 4 options.
   - "correctOptionIndex": The 0-based index (0, 1, 2, or 3) of the correct option.
   - "explanation": A detailed, step-by-step mathematically correct explanation of how to solve the question.
   - "subject": "Physics", "Chemistry", or "Maths" based on the content.
   - "difficulty": "Easy", "Medium", or "Hard".
5. LaTeX Formatting Guidelines:
   - Wrap all inline equations, variables, and math expressions in single dollar signs ($...$).
   - Wrap block/standalone equations in double dollar signs ($$...$$).
   - Double-escape backslashes in your JSON strings (e.g., use "\\\\alpha" instead of "\\alpha").
   - Remove any invalid/corrupted box characters (like ▢) and replace them with correct math symbols.

Respond with ONLY a valid JSON array of objects. No markdown code blocks, no other text.

JSON format:
[
  {
    "text": "Question text with $math$...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "explanation": "Explanation with $math$...",
    "subject": "Physics",
    "difficulty": "Hard"
  }
]`;

  const payload = {
    model: modelName,
    messages: [{ role: "user", content: promptText }]
  };

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Extractor", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch {
    response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Extractor", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  }

  if (!response.ok) {
    throw new Error(`OpenRouter Extraction Error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "[]";
  const parsed = extractJson(rawText);
  return Array.isArray(parsed) ? parsed : [];
}


async function generateFallbackQuestionsFromContext(
  subject: string,
  count: number,
  difficulty: string,
  contextText: string,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal
): Promise<any[]> {
  const promptText = `You are an expert JEE Advanced examiner.
Your task is to generate high-quality JEE exam-style questions for the subject "${subject}" based on the concepts described in the CONTEXT MATERIALS.
Number of questions: ${count}.
Difficulty: ${difficulty}.

Ensure questions are rigorous and use LaTeX formatting. Respond with ONLY a valid JSON array of objects.

JSON format:
[
  {
    "text": "Question text...",
    "options": ["A", "B", "C", "D"],
    "subject": "${subject}",
    "difficulty": "${difficulty}",
    "sourceInfo": {
      "sourceType": "pdf",
      "sourceName": "Generated from context concepts",
      "page": 1,
      "questionNum": "1"
    }
  }
]

CONTEXT MATERIALS:
${contextText}
`;

  const payload = {
    model: modelName,
    messages: [{ role: "user", content: promptText }]
  };

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch {
    response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  }

  if (!response.ok) return [];
  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "[]";
  const parsed = extractJson(rawText);
  return Array.isArray(parsed) ? parsed : [];
}

async function verifyQuestionBackend(
  questionText: string,
  options: string[],
  apiKey: string,
  subject?: string,
  rawSearchTextSnippet?: string,
  signal?: AbortSignal
): Promise<{
  questionText: string;
  correctOptionIndex: number;
  explanation: string;
  options: string[];
  confidence: number;
  consensusAnalysis: string;
} | null> {
  try {
    const response = await fetch("/api/quiz/verify-question", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ questionText, options, subject, rawSearchTextSnippet }),
      signal
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error("verifyQuestionBackend error:", err);
  }
  return null;
}

async function verifyAnswerWithSearch(
  questionText: string,
  options: string[],
  apiKey: string,
  modelName: string,
  signal?: AbortSignal
): Promise<{ correctOptionIndex: number; explanation: string; options: string[]; questionText?: string } | null> {
  let cleanedText = questionText;
  
  // Remove math dollar signs but keep math variables and content
  cleanedText = cleanedText.replace(/\$/g, "");
  
  // Replace fractions syntax with slash notation
  cleanedText = cleanedText.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2");
  
  // Replace LaTeX commands with space
  cleanedText = cleanedText.replace(/\\[a-zA-Z]+/g, " ");

  const cleanQuery = cleanedText
     .replace(/[^a-zA-Z0-9\s]/g, " ")
     .replace(/\s+/g, " ")
     .trim()
     .substring(0, 180);

  let searchResults = "";
  try {
     searchResults = await fetchWebSearchResults(cleanQuery);
  } catch (err) {
     console.error("Web search failed during verification:", err);
     searchResults = "No web search results available.";
  }

  const promptText = `You are an expert IIT-JEE exam validator and answer verifier.
We have a JEE question and options extracted from a PDF/URL source.
We need to verify the absolute correct option and answer using web search results containing online keys, forum answers (Toppr, Doubtnut, etc.), or textbook keys.

Question:
${questionText}

Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n")}

Web Search results for this question:
${searchResults}

Your tasks:
1. Review the web search results. Check how this question is solved online and which option (A, B, C, or D) is correct.
2. Determine the exact 0-based index of the correct option (0 for A, 1 for B, 2 for C, 3 for D).
3. If the options array has dummy/generic values like "Option (1)" but the correct mathematical choices are listed inside the question body (e.g. (1) R = ... \n(2) R = ...), extract those actual mathematical choice strings and return them in the "options" array. Otherwise, keep the options exactly as they are.
4. Clean and reconstruct the question text: remove any corrupted/unrecognized character glyphs like "▢" or empty boxes, spelling errors, or OCR noise. Rewrite the question text to be fully correct, complete, and properly formatted using LaTeX. Every formula, equation, mathematical variable (e.g., $v_2$, $a_1$, $m$, $n$, $L_2$, $T_1$, etc.) MUST be wrapped in inline math delimiters ($...$) or block math delimiters ($$...$$). Ensure chemical formulas are formatted as LaTeX (e.g., $\text{H}_2\text{SO}_4$).
5. Write a comprehensive, step-by-step mathematically correct explanation in LaTeX.

Respond with ONLY a valid JSON object matching the format below. Do not wrap in markdown code blocks.

JSON format:
{
  "questionText": "Fully cleaned, corrected, and LaTeX-formatted question text. Replace all ▢ boxes and OCR errors with correct variables and expressions (like v_2 = v_1 m^2 n or similar as found in search results). Wrap all variables, formulas, and math symbols in $...$.",
  "correctOptionIndex": 1,
  "explanation": "Verified explanation text with LaTeX...",
  "options": ["Option A...", "Option B...", "Option C...", "Option D..."]
}
`;

  const payload = {
    model: modelName,
    messages: [{ role: "user", content: promptText }]
  };

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Verifier", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch {
    response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href, 
        "X-Title": "JEE Prep App Verifier", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  }

  if (!response.ok) {
     return null;
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "{}";
  const result = extractJson(rawText);
  if (result && typeof result === 'object' && !Array.isArray(result)) {
     return {
       correctOptionIndex: typeof result.correctOptionIndex === 'number' ? result.correctOptionIndex : 0,
       explanation: result.explanation || "",
       options: Array.isArray(result.options) && result.options.length === 4 ? result.options : options,
       questionText: result.questionText || questionText
     };
  }
  return null;
}

/**
 * Uses AI to select the best candidates from the extracted pool
 * that align with the user's custom instructions/guidelines splits (e.g. specific source allocations).
 */
async function selectCandidatesWithAI(
  candidates: any[],
  brief: string,
  subject: string,
  count: number,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal
): Promise<any[]> {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length <= count) return candidates;

  const promptText = `You are an expert IIT-JEE exam compiler.
We have extracted a candidate pool of JEE questions from different student source materials (PDFs, videos, saves, URLs, internet).
We need to select EXACTLY ${count} questions for the subject "${subject}" to include in the final quiz.

User Custom Guidelines / Distribution Requests:
"${brief || "Select a balanced combination of questions from the available sources."}"

Here is the candidate pool:
${JSON.stringify(candidates.map((c, idx) => ({
  index: idx,
  subject: c.subject,
  difficulty: c.difficulty,
  sourceType: c.sourceInfo?.sourceType || "unknown",
  sourceName: c.sourceInfo?.sourceName || "unknown",
  textSnippet: c.text.substring(0, 150)
})), null, 2)}

Your tasks:
1. Select exactly ${count} candidate indices from the pool that best satisfy the user's request.
2. If the user specified taking questions from specific sources (e.g. "from pdf", "from video", "from url"), prioritize selecting questions from those sourceTypes.
3. If the user specified difficulty splits for specific sources (e.g. "2 hard questions from pdf, 5 from video"), match those options as closely as possible.
4. If the user did not specify source splits, select a balanced mix of questions distributed evenly across the different source types present in the pool.
5. Return a JSON array of the selected candidate indices.

Respond with ONLY the JSON array of selected indices. No code block markers, no other text. Example: [0, 4, 12, 19]`;

  try {
    const payload = {
      model: modelName,
      messages: [{ role: "user", content: promptText }]
    };

    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "JEE Prep App Candidate Selector",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "JEE Prep App Candidate Selector",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal
      });
    }

    if (response.ok) {
      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "[]";
      const parsed = extractJson(rawText);
      if (Array.isArray(parsed)) {
        const selected: any[] = [];
        const seenIndices = new Set<number>();
        parsed.forEach(idx => {
          const numIdx = Number(idx);
          if (!isNaN(numIdx) && candidates[numIdx] && !seenIndices.has(numIdx)) {
            seenIndices.add(numIdx);
            selected.push(candidates[numIdx]);
          }
        });
        if (selected.length > 0) {
          return selected.slice(0, count);
        }
      }
    }
  } catch (err) {
    console.warn("AI candidate selection failed, falling back to heuristic:", err);
  }

  // Fallback heuristic: select balanced questions across different source types
  const sourceGroups: Record<string, any[]> = {};
  candidates.forEach(c => {
    const type = c.sourceInfo?.sourceType || "unknown";
    if (!sourceGroups[type]) sourceGroups[type] = [];
    sourceGroups[type].push(c);
  });

  const selected: any[] = [];
  const types = Object.keys(sourceGroups);
  let typeIdx = 0;
  while (selected.length < count && types.length > 0) {
    const currentType = types[typeIdx % types.length];
    const group = sourceGroups[currentType];
    if (group && group.length > 0) {
      selected.push(group.shift());
    } else {
      types.splice(typeIdx % types.length, 1);
      continue;
    }
    typeIdx++;
  }
  return selected.slice(0, count);
}

/**
 * Secondary validation and self-correction pass.
 * Verifies that the correctOptionIndex matches the correct option described in the explanation,
 * and fixes the correctOptionIndex and explanation if there are contradictions or math mistakes.
 */
async function verifyAndCorrectQuestions(
  parsedQs: any[], 
  apiKey: string, 
  signal?: AbortSignal
): Promise<any[]> {
  const modelsToTry = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nex-agi/nex-n2-pro:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "nvidia/nemotron-3.5-content-safety:free",
    "google/gemma-2-9b-it:free"
  ];

  const promptText = `You are an expert IIT-JEE exam validator and answer-key proofreader.
We have generated JEE questions, options, and explanations. However, there might be formatting issues (like missing LaTeX math $...$ delimiters), unexplanation placeholders, or corrupt symbols like "▢" representing undefined characters/variables (e.g. from PDF OCR extraction errors).

Your task:
1. For each question below, solve it mathematically/scientifically.
2. Clean and correct the question text: remove any corrupted/unrecognized character glyphs like "▢" or empty boxes, spelling errors, or OCR noise. Rewrite the question text to be fully correct, complete, and properly formatted using LaTeX. Every formula, equation, mathematical variable (e.g., $v_2$, $a_1$, $m$, $n$, $L_2$, $T_1$, etc.) MUST be wrapped in inline math delimiters ($...$) or block math delimiters ($$...$$). Ensure chemical formulas are formatted as LaTeX (e.g., $\\text{H}_2\\text{SO}_4$).
3. Clean and verify the four options: make sure they are properly LaTeX-formatted.
4. Verify the exact 0-based index of the correct option in the options array.
5. Check the explanation. If the explanation has mathematical errors, or is a placeholder like "No explanation provided.", rewrite/correct the explanation to be a comprehensive, step-by-step mathematically/scientifically rigorous derivation in LaTeX.

Questions to verify:
${JSON.stringify(parsedQs.map((q, idx) => ({
  id: q.id || `q_${idx}`,
  text: q.text,
  options: q.options,
  explanation: q.explanation,
  currentCorrectIndex: q.correctOptionIndex
})), null, 2)}

Output format:
You MUST respond with EXACTLY a JSON array of objects, containing the fields: "id", the verified/cleaned "text" (properly formatted with LaTeX), the verified/cleaned "options" (array of 4 strings, properly formatted with LaTeX), the verified "correctOptionIndex" (integer 0, 1, 2, or 3), and the verified "explanation" string.
Example:
[
  {
    "id": "q_physics_1",
    "text": "Corrected question text with $v_2 = v_1 m^2 n$...",
    "options": ["$n^3 m^3 L_1 = L_2$", "$L_1 = n^4 m^2 L_2$", "$L_1 = n^2 m L_2$", "$n^2 m L_1 = L_2$"],
    "correctOptionIndex": 2,
    "explanation": "Verified detailed derivation text with LaTeX..."
  }
]
Do not wrap in markdown or write any code block markers. Just return raw JSON array.`;

  for (const modelName of modelsToTry) {
    try {
      const payload = {
        model: modelName,
        messages: [{ role: "user", content: promptText }]
      };

      let response;
      try {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.href, 
            "X-Title": "JEE Prep App Validator", 
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal
        });
      } catch {
        response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.href, 
            "X-Title": "JEE Prep App Validator", 
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal
        });
      }

      if (!response.ok) {
        console.warn(`Model ${modelName} returned status ${response.status}. Trying next fallback.`);
        continue;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "[]";
      
      // Clean JSON
      let cleanedText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const firstBracket = cleanedText.indexOf('[');
      if (firstBracket !== -1) {
        cleanedText = cleanedText.substring(firstBracket);
        const lastBracket = cleanedText.lastIndexOf(']');
        if (lastBracket !== -1) {
          cleanedText = cleanedText.substring(0, lastBracket + 1);
        }
      }

      const verifiedList = JSON.parse(cleanedText);
      if (Array.isArray(verifiedList)) {
        const verifiedMap = new Map(verifiedList.map(item => [item.id, item]));
        return parsedQs.map(q => {
          const verified = verifiedMap.get(q.id);
          if (verified) {
            return {
              ...q,
              text: verified.text || q.text,
              options: Array.isArray(verified.options) && verified.options.length === 4 ? verified.options : q.options,
              correctOptionIndex: typeof verified.correctOptionIndex === 'number' ? verified.correctOptionIndex : q.correctOptionIndex,
              explanation: verified.explanation || q.explanation
            };
          }
          return q;
        });
      }
    } catch (err) {
      console.warn(`Verification step failed with model ${modelName}:`, err);
    }
  }

  console.warn("All correction pass models failed, keeping original questions");
  return parsedQs;
}

// ─── Quiz Generator Manager ───────────────────────────────────────────────
class QuizGeneratorManager {
  activeJobs: Map<string, { id: string; status: string; name: string; abortController?: AbortController }> = new Map();
  listeners: Set<() => void> = new Set();

  constructor() {
    window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
      if (this.isGenerating) {
        e.preventDefault();
        e.returnValue = "Quiz generation is in progress. Closing the app will stop it. Are you sure?";
      }
    });
  }

  get isGenerating() { return this.activeJobs.size > 0; }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify() {
    this.listeners.forEach(cb => cb());
  }

  stopJob(jobId: string) {
    const job = this.activeJobs.get(jobId);
    if (job && job.abortController) {
      job.abortController.abort();
    }
  }

  async generate(params: {
    sources: SelectedSources;
    difficulty: string;
    finalQuestionCount: number;
    readMediaAsArrayBuffer: (key: string) => Promise<ArrayBuffer | null>;
    availablePdfs: SelectableItem[];
    availableVideos: SelectableItem[];
    model: string;
    useFree: boolean;
    brief: string;
    questionNumbers?: string;
  }) {
    const { sources, difficulty, finalQuestionCount, readMediaAsArrayBuffer, availablePdfs, availableVideos, model, useFree, brief } = params;

    const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
    
    if (!apiKey) {
      alert("Please set your OpenRouter API Key first in the Engine Settings or Admin Panel!");
      return;
    }

    const jobId = Date.now().toString() + Math.random().toString(36).slice(2);
    const setStatus = (msg: string) => {
      const job = this.activeJobs.get(jobId);
      if (job) { job.status = msg; this.notify(); }
    };

    const abortController = new AbortController();
    const signal = abortController.signal;

    this.activeJobs.set(jobId, { id: jobId, status: "Planning quiz layout...", name: `Quiz (${finalQuestionCount} Qs - ${difficulty})`, abortController });
    this.notify();

    try {
      let contextText = "";

      if (sources.videos.length > 0) {
         setStatus("Gathering video context...");
         contextText += "--- VIDEO SOURCES ---\n";
         const allNotes = JSON.parse(localStorage.getItem("vid_notes_v1") || "{}");
         sources.videos.forEach(vidId => {
            const item = availableVideos.find(p => p.id === vidId);
            if (item) {
               contextText += `[Video Source: "${item.name || item.path}", ID: ${vidId}]\n`;
               const notes = allNotes[vidId] || [];
               if (notes.length > 0) {
                  notes.forEach((note: any) => {
                     const timeStr = note.timestamp ? `${Math.floor(note.timestamp / 60)}:${String(Math.floor(note.timestamp % 60)).padStart(2, '0')}` : "00:00";
                     contextText += `At timestamp ${timeStr}: ${note.text || ""}\n`;
                  });
               } else {
                  contextText += `Topic: ${item.name || item.path}\n`;
               }
            }
         });
         contextText += "\n";
      }

      if (sources.urls.length > 0) {
         setStatus("Fetching content from URLs...");
         contextText += "--- REFERENCE URLS ---\n";
         for (const url of sources.urls) {
            const urlText = await fetchUrlContent(url);
            contextText += `${urlText}\n\n`;
         }
         contextText += "\n";
      }

      if (sources.saves.length > 0) {
         setStatus("Extracting saved questions...");
         contextText += "--- SAVED QUESTIONS ---\n";
         const allSaves = JSON.parse(localStorage.getItem("jee_saves_questions_v1") || "{}");
         sources.saves.forEach(srcId => {
            const qs = allSaves[srcId] || [];
            qs.forEach((q: any) => {
               const hasImage = !!(q.questionImageKey || q.questionUrl);
               contextText += `[Saves Source Collection: "${srcId}", Question ID: ${q.id}]\nQuestion Name: ${q.name || ''}\nDetails: ${q.description || ''}\nConcept Answer: ${q.answerText || ''}\nHas Diagram/Image: ${hasImage ? "YES" : "NO"}\n\n`;
            });
         });
      }

      if (sources.uploads && sources.uploads.length > 0) {
         setStatus("Gathering document uploads...");
         contextText += "--- DIRECT UPLOADED DOCUMENTS ---\n";
         for (const upload of sources.uploads) {
            if (upload.text) {
               contextText += `[Document Upload: "${upload.name}", Type: ${upload.fileType}]\n${upload.text}\n\n`;
            }
         }
      }

      // ─── Plan the subject distribution ───
      const allSavesData = JSON.parse(localStorage.getItem("jee_saves_questions_v1") || "[]");
      const savedList: SelectableItem[] = [];
      Object.entries(allSavesData).forEach(([srcId, questionsList]: [string, any]) => {
         if (Array.isArray(questionsList)) {
            questionsList.forEach((q: any) => {
               savedList.push({ id: q.id, name: q.name || "", path: srcId });
            });
         }
      });

      const subjectPlans = planSubjects(
         brief,
         difficulty,
         finalQuestionCount,
         sources,
         availablePdfs,
         savedList
      );

      // Determine total number of batches to slice the context
      let totalBatches = 0;
      for (const [subj, plan] of Object.entries(subjectPlans)) {
         if (plan.count <= 0) continue;
         totalBatches += Math.ceil(plan.count / 5);
      }
      if (totalBatches === 0) totalBatches = 1;

      // Context slicing helper to avoid OpenRouter rate limits (TPM) and context limits on 40 Qs
      const getContextSlice = (batchIdx: number, totalBCount: number) => {
         if (!contextText || contextText.length <= 15000 || totalBCount <= 1) {
            return contextText.length > 120000 
              ? contextText.slice(0, 120000) + "\n\n...[Context truncated to fit AI limits]..." 
              : contextText;
         }
         
         const totalLen = contextText.length;
         const sliceSize = Math.ceil(totalLen / totalBCount);
         const overlap = Math.ceil(sliceSize * 0.15); // 15% overlap
         
         const start = Math.max(0, batchIdx * sliceSize - overlap);
         const end = Math.min(totalLen, (batchIdx + 1) * sliceSize + overlap);
         
         let slice = contextText.substring(start, end);
         if (start > 0) slice = "... [Truncated preceding text context] ...\n" + slice;
         if (end < totalLen) slice = slice + "\n... [Truncated succeeding text context] ...";
         
         return slice;
      };

      // ─── Execute Subject-Specific Batched Calls ───
      let allParsedQuestions: Question[] = [];
      let primaryApiError = "";

      // Prioritize the requested models first, with standard fallbacks
      const modelsToTry = [
         "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
         "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
         "nex-agi/nex-n2-pro:free",
         "nvidia/nemotron-3.5-content-safety:free",
         "meta-llama/llama-3.3-70b-instruct:free",
         "qwen/qwen-2.5-coder-32b-instruct:free",
         "openai/gpt-oss-120b:free",
         "openai/gpt-oss-20b:free",
         "z-ai/glm-4.5-air:free",
         "nousresearch/hermes-3-llama-3.1-405b:free",
         "google/gemma-2-9b-it:free"
      ];
      
      const uniqueModels = Array.from(new Set(modelsToTry));

      // Extract candidates
      const candidatePool: any[] = [];
      const prioritizedVisionModels = [
         ...(model ? [model] : []),
         "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", 
         "meta-llama/llama-3.2-11b-vision-instruct:free",
         "meta-llama/llama-3.2-90b-vision-instruct:free",
         "nvidia/llama-nemotron-rerank-vl-1b-v2:free"
      ];

      // 1. PDF visual scanning and diagram cropping
      if (sources.pdfs.length > 0) {
         setStatus("Initializing PDF visual scanning engine...");
         const pdfjsLib = await import("pdfjs-dist");
         pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

         for (const pdfId of sources.pdfs) {
            const item = availablePdfs.find(p => p.id === pdfId);
            let pdfDoc = null;
            
            if (item?.mediaKey) {
               const buf = await readMediaAsArrayBuffer(item.mediaKey);
               if (buf) {
                  pdfDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
               }
            } else if (item?.url) {
               try {
                  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(item.url)}`;
                  const res = await fetch(proxyUrl);
                  if (res.ok) {
                     const buf = await res.arrayBuffer();
                     pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
                  }
               } catch (e: any) {
                  console.error(`Failed to load PDF from URL: ${item.url}`, e);
               }
            }

            if (pdfDoc) {
               const maxPages = Math.min(pdfDoc.numPages, 15);
               for (let i = 1; i <= maxPages; i++) {
                  setStatus(`Rendering page ${i}/${maxPages} of PDF "${item?.name || item?.path}"...`);
                  const page = await pdfDoc.getPage(i);
                  const canvas = await renderPageToCanvas(page);
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                  
                  setStatus(`Scanning page ${i}/${maxPages} with AI Vision OCR...`);
                  let pageQuestions: any[] = [];
                  
                  for (const modelName of prioritizedVisionModels) {
                     try {
                        pageQuestions = await extractQuestionsFromPageImage(dataUrl, apiKey, modelName, params.questionNumbers, signal);
                        if (Array.isArray(pageQuestions) && pageQuestions.length > 0) {
                           for (let qIdx = 0; qIdx < pageQuestions.length; qIdx++) {
                              const qObj = pageQuestions[qIdx];
                              let questionImageUrl = qObj.questionCropUrl || qObj.questionImageUrl || "";
                              let diagramImageUrl = qObj.diagramImageUrl || "";
                              
                              if (!questionImageUrl && qObj.questionImageBounds) {
                                 try {
                                    questionImageUrl = cropFromCanvas(canvas, qObj.questionImageBounds);
                                 } catch (cropErr) {
                                    console.warn("Failed to crop question layout:", cropErr);
                                 }
                              }
                              if (!diagramImageUrl && qObj.hasIsolatedDiagram && qObj.diagramImageBounds) {
                                 try {
                                    diagramImageUrl = cropFromCanvas(canvas, qObj.diagramImageBounds);
                                 } catch (cropErr) {
                                    console.warn("Failed to crop diagram:", cropErr);
                                 }
                              }
                              
                              candidatePool.push({
                                 text: qObj.text || qObj.rawSearchTextSnippet || "",
                                 options: qObj.options || [],
                                 difficulty: qObj.difficulty || "Medium",
                                 subject: qObj.subject || "Physics",
                                 correctOptionIndex: qObj.correctOptionIndex,
                                 explanation: qObj.explanation,
                                 questionType: qObj.questionType || "STANDARD_MCQ",
                                 questionImageUrl: questionImageUrl,
                                 questionCropUrl: questionImageUrl,
                                 hasIsolatedDiagram: qObj.hasIsolatedDiagram || false,
                                 diagramImageUrl: diagramImageUrl,
                                 sourceInfo: {
                                    sourceType: "pdf",
                                    sourceName: item?.name || item?.path || "PDF Document",
                                    page: i,
                                    questionNum: qObj.questionNum || `Q${qIdx + 1}`
                                 }
                              });
                           }
                           break;
                        }
                     } catch (err) {
                        console.warn(`Vision OCR failed with model ${modelName} on page ${i}:`, err);
                     }
                  }

                  if (pageQuestions.length === 0) {
                     // Fallback: Extract plain text of the PDF page and parse questions using text-only extraction
                     try {
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items
                           .map((x: any) => x.str)
                           .join(" ");
                           
                        if (pageText.trim().length > 0) {
                           setStatus(`Scanning page ${i}/${maxPages} using Text Extraction Fallback...`);
                           for (const modelName of uniqueModels) {
                              try {
                                 const parsedTextQuestions = await extractQuestionsFromContext(pageText, apiKey, modelName, signal);
                                 if (Array.isArray(parsedTextQuestions) && parsedTextQuestions.length > 0) {
                                    pageQuestions = parsedTextQuestions; // set to prevent entering other fallbacks
                                    for (let qIdx = 0; qIdx < parsedTextQuestions.length; qIdx++) {
                                       const qObj = parsedTextQuestions[qIdx];
                                       candidatePool.push({
                                          text: qObj.text || "",
                                          options: qObj.options || [],
                                          difficulty: qObj.difficulty || "Medium",
                                          subject: qObj.subject || "Physics",
                                          correctOptionIndex: qObj.correctOptionIndex,
                                          explanation: qObj.explanation,
                                          questionType: qObj.questionType || "STANDARD_MCQ",
                                          questionImageUrl: "",
                                          questionCropUrl: "",
                                          hasIsolatedDiagram: false,
                                          diagramImageUrl: "",
                                          sourceInfo: {
                                             sourceType: "pdf",
                                             sourceName: item?.name || item?.path || "PDF Document",
                                             page: i,
                                             questionNum: qObj.questionNum || `Q${qIdx + 1}`
                                          }
                                       });
                                    }
                                    break;
                                 }
                              } catch (textErr) {
                                 console.warn(`Text extraction fallback failed with model ${modelName}:`, textErr);
                              }
                           }
                        }
                     } catch (textExtractErr) {
                        console.error("Text extraction failed for page:", textExtractErr);
                     }
                  }
               }
            }
         }
      }

      // 1.5. Direct Uploads Visual scanning (PDF or Image)
      if (sources.uploads && sources.uploads.length > 0) {
         setStatus("Scanning direct uploads visually...");
         const pdfjsLib = await import("pdfjs-dist");
         pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

         for (const upload of sources.uploads) {
            if (upload.fileType === "pdf") {
               const buf = await readMediaAsArrayBuffer(upload.id);
               if (buf) {
                  try {
                     const pdfDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
                     const maxPages = Math.min(pdfDoc.numPages, 15);
                     for (let i = 1; i <= maxPages; i++) {
                        setStatus(`Rendering page ${i}/${maxPages} of PDF upload "${upload.name}"...`);
                        const page = await pdfDoc.getPage(i);
                        const canvas = await renderPageToCanvas(page);
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                        
                        setStatus(`Scanning page ${i}/${maxPages} of PDF upload with AI Vision OCR...`);
                        let pageQuestions: any[] = [];
                        for (const modelName of prioritizedVisionModels) {
                           try {
                              pageQuestions = await extractQuestionsFromPageImage(dataUrl, apiKey, modelName, params.questionNumbers, signal);
                              if (Array.isArray(pageQuestions) && pageQuestions.length > 0) {
                                 for (let qIdx = 0; qIdx < pageQuestions.length; qIdx++) {
                                    const qObj = pageQuestions[qIdx];
                                    let questionImageUrl = qObj.questionCropUrl || qObj.questionImageUrl || "";
                                    let diagramImageUrl = qObj.diagramImageUrl || "";
                                    
                                    if (!questionImageUrl && qObj.questionImageBounds) {
                                       try {
                                          questionImageUrl = cropFromCanvas(canvas, qObj.questionImageBounds);
                                       } catch (cropErr) {
                                          console.warn("Failed to crop question layout:", cropErr);
                                       }
                                    }
                                    if (!diagramImageUrl && qObj.hasIsolatedDiagram && qObj.diagramImageBounds) {
                                       try {
                                          diagramImageUrl = cropFromCanvas(canvas, qObj.diagramImageBounds);
                                       } catch (cropErr) {
                                          console.warn("Failed to crop diagram:", cropErr);
                                       }
                                    }
                                    
                                    candidatePool.push({
                                       text: qObj.text || qObj.rawSearchTextSnippet || "",
                                       options: qObj.options || [],
                                       difficulty: qObj.difficulty || "Medium",
                                       subject: qObj.subject || "Physics",
                                       correctOptionIndex: qObj.correctOptionIndex,
                                       explanation: qObj.explanation,
                                       questionType: qObj.questionType || "STANDARD_MCQ",
                                       questionImageUrl: questionImageUrl,
                                       questionCropUrl: questionImageUrl,
                                       hasIsolatedDiagram: qObj.hasIsolatedDiagram || false,
                                       diagramImageUrl: diagramImageUrl,
                                       sourceInfo: {
                                          sourceType: "pdf",
                                          sourceName: upload.name,
                                          page: i,
                                          questionNum: qObj.questionNum || `Q${qIdx + 1}`
                                       }
                                    });
                                 }
                                 break;
                              }
                           } catch (err) {
                              console.warn(`Vision OCR failed on page ${i} of PDF upload:`, err);
                           }
                        }
                     }
                  } catch (pdfErr) {
                     console.error(`Failed to parse PDF upload "${upload.name}":`, pdfErr);
                  }
               }
            } else if (upload.fileType === "image" && upload.dataUrl) {
               setStatus(`Scanning image upload "${upload.name}" with AI Vision OCR...`);
               let imageQuestions: any[] = [];
               for (const modelName of prioritizedVisionModels) {
                  try {
                     imageQuestions = await extractQuestionsFromPageImage(upload.dataUrl, apiKey, modelName, params.questionNumbers, signal);
                     if (Array.isArray(imageQuestions) && imageQuestions.length > 0) {
                        for (let qIdx = 0; qIdx < imageQuestions.length; qIdx++) {
                           const qObj = imageQuestions[qIdx];
                           candidatePool.push({
                              text: qObj.text || qObj.rawSearchTextSnippet || "",
                              options: qObj.options || [],
                              difficulty: qObj.difficulty || "Medium",
                              subject: qObj.subject || "Physics",
                              correctOptionIndex: qObj.correctOptionIndex,
                              explanation: qObj.explanation,
                              questionType: qObj.questionType || "STANDARD_MCQ",
                              questionImageUrl: qObj.questionCropUrl || qObj.questionImageUrl || "",
                              questionCropUrl: qObj.questionCropUrl || "",
                              hasIsolatedDiagram: qObj.hasIsolatedDiagram || false,
                              diagramImageUrl: qObj.diagramCropUrl || qObj.diagramImageUrl || "",
                              diagramCropUrl: qObj.diagramCropUrl || null,
                              sourceInfo: {
                                 sourceType: "pdf",
                                 sourceName: upload.name,
                                 page: 1,
                                 questionNum: qObj.questionNum || `Q${qIdx + 1}`
                              }
                           });
                        }
                        break;
                     }
                  } catch (err) {
                     console.warn(`Vision OCR failed on image upload:`, err);
                  }
               }
            }
         }
      }

      // 2. Saves direct load
      if (sources.saves.length > 0) {
         setStatus("Extracting saved questions...");
         const allSaves = JSON.parse(localStorage.getItem("jee_saves_questions_v1") || "{}");
         sources.saves.forEach(srcId => {
            const qs = allSaves[srcId] || [];
            qs.forEach((q: any) => {
               candidatePool.push({
                  text: q.description || q.name || "",
                  options: Array.isArray(q.options) ? q.options : [],
                  difficulty: q.difficulty || "Medium",
                  subject: q.subject || "Physics",
                  imageUrl: q.questionUrl || "",
                  imageKey: q.questionImageKey || "",
                  sourceQuestionId: `${srcId}::${q.id}`,
                  correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
                  explanation: q.explanation || "",
                  sourceInfo: {
                     sourceType: "saves",
                     sourceName: srcId,
                     detail: q.id
                  }
               });
            });
         });
      }

      // 3. Video note generation/extraction
      if (sources.videos.length > 0) {
         const allNotes = JSON.parse(localStorage.getItem("vid_notes_v1") || "{}");
         for (const vidId of sources.videos) {
            const item = availableVideos.find(p => p.id === vidId);
            if (item) {
               setStatus(`Analyzing video notes for "${item.name || item.path}"...`);
               let videoText = `Video Name: ${item.name || item.path}\n`;
               const notes = allNotes[vidId] || [];
               if (notes.length > 0) {
                  notes.forEach((note: any) => {
                     const timeStr = note.timestamp ? `${Math.floor(note.timestamp / 60)}:${String(Math.floor(note.timestamp % 60)).padStart(2, '0')}` : "00:00";
                     videoText += `At timestamp ${timeStr}: ${note.text || ""}\n`;
                  });
               } else {
                  videoText += `Topic: ${item.name || item.path}\n`;
               }

               let videoQs: any[] = [];
               for (const modelName of uniqueModels) {
                  try {
                     videoQs = await extractOrGenerateQuestionsForSource(
                        videoText,
                        { sourceType: "video", sourceName: item.name || item.path || "Video Note" },
                        apiKey,
                        modelName,
                        signal
                     );
                     if (videoQs.length > 0) break;
                  } catch (err) {
                     console.warn(`Extraction/generation failed for video notes of ${item.name} with model ${modelName}:`, err);
                  }
               }
               videoQs.forEach(q => {
                  candidatePool.push({
                     ...q,
                     sourceInfo: {
                        sourceType: "video",
                        sourceName: item.name || item.path || "Video Note",
                        timestamp: q.timestamp || "00:00"
                     }
                  });
               });
            }
         }
      }

      // 4. URL extraction/generation
      if (sources.urls.length > 0) {
         for (const url of sources.urls) {
            setStatus(`Fetching content from URL "${url}"...`);
            try {
               const urlText = await fetchUrlContent(url);
               if (urlText && urlText.trim().length > 0) {
                  setStatus(`Analyzing page content for URL "${url}"...`);
                  let urlQs: any[] = [];
                  for (const modelName of uniqueModels) {
                     try {
                        urlQs = await extractOrGenerateQuestionsForSource(
                           urlText,
                           { sourceType: "url", sourceName: url },
                           apiKey,
                           modelName,
                           signal
                        );
                        if (urlQs.length > 0) break;
                     } catch (err) {
                        console.warn(`Extraction/generation failed for URL ${url} with model ${modelName}:`, err);
                     }
                  }
                  urlQs.forEach(q => {
                     candidatePool.push({
                        ...q,
                        sourceInfo: {
                           sourceType: "url",
                           sourceName: url,
                           page: q.page || 1,
                           questionNum: q.questionNum || "Q"
                        }
                     });
                  });
               }
            } catch (urlErr) {
               console.error(`Failed to fetch and analyze URL ${url}:`, urlErr);
            }
         }
      }

      // 5. Internet search extraction/generation
      if (sources.internetSearch.enabled && sources.internetSearch.query) {
         setStatus(`Searching the web for "${sources.internetSearch.query}"...`);
         try {
            const searchResults = await fetchWebSearchResults(sources.internetSearch.query);
            if (searchResults && searchResults.trim().length > 0) {
               setStatus(`Generating candidate questions from web search results...`);
               let searchQs: any[] = [];
               for (const modelName of uniqueModels) {
                  try {
                     searchQs = await extractOrGenerateQuestionsForSource(
                        searchResults,
                        { sourceType: "internet", sourceName: sources.internetSearch.query },
                        apiKey,
                        modelName,
                        signal
                     );
                     if (searchQs.length > 0) break;
                  } catch (err) {
                     console.warn(`Extraction/generation failed for web search results with model ${modelName}:`, err);
                  }
               }
               searchQs.forEach(q => {
                  candidatePool.push({
                     ...q,
                     sourceInfo: {
                        sourceType: "internet",
                        sourceName: sources.internetSearch.query,
                        detail: "Web Search Result"
                     }
                  });
               });
            }
         } catch (searchErr) {
            console.error(`Failed to perform web search:`, searchErr);
         }
      }

      // De-duplicate candidates
      const seenTexts = new Set<string>();
      const uniqueCandidates: any[] = [];
      for (const cand of candidatePool) {
         if (!cand || !cand.text) continue;
         const normalized = cand.text.toLowerCase().replace(/\s+/g, "");
         if (!seenTexts.has(normalized)) {
            seenTexts.add(normalized);
            uniqueCandidates.push(cand);
         }
      }

      const matchDifficulty = (candDiff: string, targetDiff: string): boolean => {
         const cD = (candDiff || "").toLowerCase();
         const tD = (targetDiff || "").toLowerCase();
         if (tD === "mixed") return true;
         if (tD.includes("+")) {
            const parts = tD.split("+").map(p => p.trim());
            return parts.some(p => cD.includes(p));
         }
         return cD.includes(tD);
      };

      const hasAnySource = sources.pdfs.length > 0 || sources.saves.length > 0 || sources.videos.length > 0 || sources.urls.length > 0 || sources.internetSearch.enabled;

      for (const [subj, plan] of Object.entries(subjectPlans)) {
         if (plan.count <= 0) continue;
         
         let candidates = uniqueCandidates.filter(c => 
            c.subject && c.subject.toLowerCase() === subj.toLowerCase() && 
            matchDifficulty(c.difficulty, plan.difficulty)
         );

         if (candidates.length < plan.count) {
            const rest = uniqueCandidates.filter(c => 
               c.subject && c.subject.toLowerCase() === subj.toLowerCase() && 
               !candidates.includes(c)
            );
            candidates = [...candidates, ...rest];
         }

         if (candidates.length < plan.count && !hasAnySource) {
            setStatus(`Generating fallback questions for ${subj}...`);
            const needed = plan.count - candidates.length;
            const slice = getContextSlice(0, 1);
            let fallbackQs: any[] = [];
            
            for (const modelName of uniqueModels) {
               try {
                  fallbackQs = await generateFallbackQuestionsFromContext(subj, needed, plan.difficulty, slice, apiKey, modelName, signal);
                  if (fallbackQs.length > 0) break;
               } catch (err) {
                  console.warn(`Fallback generation failed with ${modelName}:`, err);
               }
            }
            candidates = [...candidates, ...fallbackQs];
         }

          setStatus(`Selecting best ${subj} questions matching your guidelines...`);
          let selectedQuestions = [];
          try {
             const selectionModel = uniqueModels[0] || "meta-llama/llama-3.3-70b-instruct:free";
             selectedQuestions = await selectCandidatesWithAI(
                candidates,
                brief,
                subj,
                plan.count,
                apiKey,
                selectionModel,
                signal
             );
          } catch (selErr) {
             console.warn("AI candidate selection failed, falling back to heuristic slice:", selErr);
             selectedQuestions = candidates.slice(0, plan.count);
          }
         
         setStatus(`Verifying ${subj} questions in parallel with Google search backend...`);
         const verificationPromises = selectedQuestions.map(async (q, qIdx) => {
            let verificationResult: any = null;
            const isSaved = q.sourceInfo?.sourceType === "saves" || q.sourceQuestionId;
            
            if (!isSaved) {
               try {
                  const verified = await verifyQuestionBackend(q.text, q.options || [], apiKey, subj, q.text.substring(0, 120), signal);
                  if (verified) {
                     verificationResult = verified;
                  }
               } catch (backendVerifyErr) {
                  console.warn("Backend validation failed, falling back to frontend verifier:", backendVerifyErr);
               }

               if (!verificationResult) {
                  for (const modelName of uniqueModels) {
                     try {
                        verificationResult = await verifyAnswerWithSearch(q.text, q.options || [], apiKey, modelName, signal);
                        if (verificationResult) break;
                     } catch (err) {
                        console.warn(`Verification failed with model ${modelName} on Q${qIdx + 1}:`, err);
                     }
                  }
               }
            }

            let cleanedText = (verificationResult && verificationResult.questionText) ? verificationResult.questionText : q.text;
            let finalOptions = q.options || [];
            
            if (!q.questionImageUrl) {
              const inlineResult = extractInlineOptions(cleanedText);
              if (inlineResult) {
                 cleanedText = inlineResult.questionText;
              }

              finalOptions = (verificationResult && verificationResult.options) ? verificationResult.options : q.options;
              if (inlineResult && (!finalOptions || finalOptions.length < 4 || finalOptions.every((opt: string) => /option/i.test(opt)))) {
                 finalOptions = inlineResult.options;
              }
            }
            
            while (!finalOptions || finalOptions.length < 4) {
               if (!finalOptions) finalOptions = [];
               finalOptions.push(`Option ${finalOptions.length + 1}`);
            }

            const finalCorrectOptionIndex = (verificationResult && typeof verificationResult.correctOptionIndex === 'number') 
               ? verificationResult.correctOptionIndex 
               : (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0);
               
            const finalExplanation = (verificationResult && verificationResult.explanation) 
               ? verificationResult.explanation 
               : (q.explanation || "No explanation provided.");

            const finalConfidence = (verificationResult && typeof verificationResult.confidence === 'number')
               ? verificationResult.confidence
               : undefined;

            const finalConsensus = (verificationResult && verificationResult.consensusAnalysis)
               ? verificationResult.consensusAnalysis
               : undefined;

            return {
               id: q.id || `q_${subj.toLowerCase()}_${Date.now()}_${qIdx}`,
               text: fixLatexFormatting(cleanedText),
               options: finalOptions.map((opt: string) => ensureMathWrapped(fixLatexFormatting(opt))),
               correctOptionIndex: finalCorrectOptionIndex,
               explanation: fixLatexFormatting(finalExplanation),
               confidence: finalConfidence,
               consensusAnalysis: finalConsensus,
               difficulty: q.difficulty || plan.difficulty,
               subject: subj,
               sourceQuestionId: q.sourceQuestionId || "",
               imageKey: q.imageKey,
               imageUrl: q.imageUrl,
               questionType: q.questionType || "STANDARD_MCQ",
               questionImageUrl: q.questionImageUrl,
               questionCropUrl: q.questionCropUrl || q.questionImageUrl,
               hasIsolatedDiagram: q.hasIsolatedDiagram || false,
               diagramImageUrl: q.diagramImageUrl,
               sourceInfo: q.sourceInfo || {
                  sourceType: "pdf",
                  sourceName: "Source Document",
                  page: 1,
                  questionNum: `Q${qIdx + 1}`
               }
            };
         });

         const verifiedSubjectQuestions = await Promise.all(verificationPromises);
         allParsedQuestions = [...allParsedQuestions, ...verifiedSubjectQuestions];
      }
      
      if (allParsedQuestions.length === 0) {
          if (hasAnySource) {
             throw new Error("No questions could be extracted from your selected sources. Please ensure that the PDF pages or files contain clear question texts and option grids, check your API key, or choose a different vision model.");
          }
          throw new Error(`AI returned no valid questions.\nAPI Error: ${primaryApiError || "Format issue suspected."}`);
      }

      // ─── Image Mapping Logic ───
      try {
        const allSaves = JSON.parse(localStorage.getItem("jee_saves_questions_v1") || "{}");
        const savedQuestionsMap: Record<string, { imageKey?: string; imageUrl?: string }> = {};
        
        Object.entries(allSaves).forEach(([srcId, questionsList]: [string, any]) => {
          if (Array.isArray(questionsList)) {
            questionsList.forEach((q: any) => {
              // Map by exact source question ID
              savedQuestionsMap[`${srcId}::${q.id}`] = {
                imageKey: q.questionImageKey,
                imageUrl: q.questionUrl
              };
              
              // Map by name (fuzzy backup lookup)
              const cleanName = (q.name || "").toLowerCase().replace(/\s+/g, "");
              if (cleanName) {
                savedQuestionsMap[cleanName] = {
                  imageKey: q.questionImageKey,
                  imageUrl: q.questionUrl
                };
              }
            });
          }
        });
        
        // Connect generated questions back to their images/urls
        allParsedQuestions = allParsedQuestions.map(q => {
          let imageKey = q.imageKey;
          let imageUrl = q.imageUrl;
          
          if (q.sourceQuestionId && savedQuestionsMap[q.sourceQuestionId]) {
            imageKey = savedQuestionsMap[q.sourceQuestionId].imageKey;
            imageUrl = savedQuestionsMap[q.sourceQuestionId].imageUrl;
          } else if (!imageKey && !imageUrl) {
            const cleanText = (q.text || "").toLowerCase().replace(/\s+/g, "");
            for (const [key, value] of Object.entries(savedQuestionsMap)) {
              if (key.includes("::")) continue; 
              if (cleanText.includes(key) || key.includes(cleanText)) {
                imageKey = value.imageKey;
                imageUrl = value.imageUrl;
                break;
              }
            }
          }
          
          return {
            ...q,
            imageKey,
            imageUrl
          };
        });
      } catch (imgErr) {
        console.warn("Diagram image mapping failed:", imgErr);
      }

      // Sort questions: Physics first, Chemistry second, Maths third
      allParsedQuestions.sort((a, b) => {
          const order: Record<string, number> = { "Physics": 1, "Chemistry": 2, "Maths": 3 };
          return (order[a.subject] || 4) - (order[b.subject] || 4);
      });

      // ─── Final Self-Correction Pass ───
      setStatus("Running final correction and alignment pass...");
      try {
         allParsedQuestions = await verifyAndCorrectQuestions(allParsedQuestions, apiKey, signal);
      } catch (err) {
         console.warn("Final correction pass failed, using verified questions", err);
      }

      const newQuiz: SavedQuiz = {
         id: Date.now().toString(),
         name: `Quiz - ${new Date().toLocaleString()}`,
         createdAt: Date.now(),
         questions: allParsedQuestions,
         difficulty
      };
      
      const pastQuizzes = JSON.parse(localStorage.getItem("jee_saved_quizzes_v1") || "[]");
      const newQuizzes = [newQuiz, ...pastQuizzes];
      localStorage.setItem("jee_saved_quizzes_v1", JSON.stringify(newQuizzes));
      
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
         new Notification("Quiz Generated!", { body: `Your test with ${allParsedQuestions.length} questions is ready.` });
      } else {
         alert("Your Quiz is generated!");
      }

    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log(`Job ${jobId} stopped by user.`);
        return;
      }
      console.error("Quiz Generation Failed:", e);
      alert("Failed to generate quiz with AI: \n" + e.message);
    } finally {
      this.activeJobs.delete(jobId);
      this.notify();
    }
  }
}

export const quizGeneratorManager = new QuizGeneratorManager();

// ─── Diagram Image Renderer Component ─────────────────────────────────────
function QuestionImage({ imageKey, imageUrl }: { imageKey?: string, imageUrl?: string }) {
  const { readMediaAsBlob } = useWorkspaceContext();
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      setSrc(imageUrl);
      return;
    }

    if (imageKey) {
      setLoading(true);
      readMediaAsBlob(imageKey)
        .then(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setSrc(url);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setSrc(null);
    }
  }, [imageKey, imageUrl, readMediaAsBlob]);

  if (loading) {
    return (
      <div className="my-4 p-4 border border-border rounded-xl flex items-center justify-center bg-muted/20">
        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
        <span className="text-xs text-muted-foreground ml-2 font-medium">Loading diagram...</span>
      </div>
    );
  }

  if (!src) return null;

  return (
    <div className="my-4 p-2 border border-border rounded-xl bg-white dark:bg-zinc-900 inline-block max-w-full shadow-sm hover:shadow-md transition-shadow">
      <img src={src} alt="Question Diagram" className="max-h-[250px] object-contain rounded-lg" />
    </div>
  );
}

// ─── Job Progress Bar Component ──────────────────────────────────────────
function JobProgressBar({ status }: { status: string }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    // 15-second baseline countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(prev - 1, 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Dynamic progress parser
    let targetPct = 0;
    if (status.includes("Planning")) {
      targetPct = 15;
    } else if (status.includes("Rendering page") || status.includes("Scanning page")) {
      const match = status.match(/page\s+(\d+)\/(\d+)/i);
      if (match) {
        const pageNum = parseInt(match[1], 10);
        const maxPages = parseInt(match[2], 10);
        targetPct = 15 + Math.round((pageNum / maxPages) * 35); 
      } else {
        targetPct = 30;
      }
    } else if (status.includes("Verifying")) {
      const match = status.match(/Q(\d+)\/(\d+)/i);
      if (match) {
        const qNum = parseInt(match[1], 10);
        const totalQ = parseInt(match[2], 10);
        targetPct = 50 + Math.round((qNum / totalQ) * 45);
      } else {
        targetPct = 75;
      }
    } else if (status.includes("Extracting")) {
      targetPct = 40;
    } else {
      targetPct = 5;
    }

    // Smooth progress animation towards targetPct
    const duration = 1000;
    const stepTime = 50;
    const steps = duration / stepTime;
    let currentStep = 0;
    const startPct = progress;
    const diff = targetPct - startPct;

    if (diff <= 0) {
      if (targetPct > progress) {
        setProgress(targetPct);
      }
      return;
    }

    const anim = setInterval(() => {
      currentStep++;
      const currentVal = Math.round(startPct + (currentStep / steps) * diff);
      setProgress(Math.min(currentVal, 99));
      if (currentStep >= steps) {
        clearInterval(anim);
      }
    }, stepTime);

    return () => clearInterval(anim);
  }, [status]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 w-full max-w-sm sm:max-w-md">
      <div className="flex-1 bg-zinc-200 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden relative w-full border border-border/20">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out shadow-sm" 
          style={{ width: `${progress}%` }} 
        />
      </div>
      <span className="text-xs font-extrabold text-muted-foreground whitespace-nowrap min-w-[145px] text-left sm:text-right bg-muted/40 px-2 py-1 rounded border border-border/10">
        {timeLeft > 1 ? `Est. time: ${timeLeft}s remaining` : "Almost done..."} ({progress}%)
      </span>
    </div>
  );
}

// ─── Main Interface ────────────────────────────────────────────────────────
function AIQuizInterface() {
  const { user } = useAppContext();
  const { readMediaAsArrayBuffer, writeMedia } = useWorkspaceContext();
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Setup State
  const [numQuestions, setNumQuestions] = useState<number | "custom">(10);
  const [customNum, setCustomNum] = useState<number>(25);
  const [difficulty, setDifficulty] = useState<Difficulty>("Mixed");
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showQuestionSourceDialog, setShowQuestionSourceDialog] = useState(false);
  const [selectedQuestionForSource, setSelectedQuestionForSource] = useState<Question | null>(null);
  
  // Custom Guidelines & AI Settings State
  const [briefInstructions, setBriefInstructions] = useState("");
  const [pdfQuestionFilter, setPdfQuestionFilter] = useState("");

  // Premium AI Explanations State
  const [aiExplanations, setAiExplanations] = useState<Record<number, { text: string; model?: string; loading: boolean; error?: string }>>({});

  const [sources, setSources] = useState<SelectedSources>({
    pdfs: [],
    saves: [],
    videos: [],
    urls: [],
    uploads: [],
    internetSearch: { enabled: false, query: "" }
  });

  const [availablePdfs, setAvailablePdfs] = useState<SelectableItem[]>([]);
  const [availableVideos, setAvailableVideos] = useState<SelectableItem[]>([]);
  const [availableSaves, setAvailableSaves] = useState<SelectableItem[]>([]);
  const [sourceTab, setSourceTab] = useState<"pdfs" | "videos" | "saves" | "urls" | "internet" | "uploads">("pdfs");
  const [urlInput, setUrlInput] = useState("");

  // Quiz Attempt State
  type QuestionStatus = "not_visited" | "not_answered" | "answered" | "marked_for_review" | "answered_marked_for_review";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, QuestionStatus>>({});
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(10800);
  const [activeSubject, setActiveSubject] = useState<string>("Physics");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [quizName, setQuizName] = useState("");
  
  // Time tracking per question
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  const [reviewMode, setReviewMode] = useState(false);

  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean))) as string[];
    const standardOrder = ["Physics", "Chemistry", "Maths"];
    return uniqueSubjects.sort((a, b) => standardOrder.indexOf(a) - standardOrder.indexOf(b));
  }, [questions]);

  // Saved Tests State
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("jee_saved_quizzes_v1") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("jee_saved_quizzes_v1", JSON.stringify(savedQuizzes));
  }, [savedQuizzes]);

  const [isGenerating, setIsGenerating] = useState(quizGeneratorManager.isGenerating);
  const [activeJobs, setActiveJobs] = useState(Array.from(quizGeneratorManager.activeJobs.values()));

  useEffect(() => {
    let prevJobCount = quizGeneratorManager.activeJobs.size;
    const unsubscribe = quizGeneratorManager.subscribe(() => {
      setIsGenerating(quizGeneratorManager.isGenerating);
      setActiveJobs(Array.from(quizGeneratorManager.activeJobs.values()));
      const currentJobCount = quizGeneratorManager.activeJobs.size;
      if (currentJobCount < prevJobCount) {
         try { setSavedQuizzes(JSON.parse(localStorage.getItem("jee_saved_quizzes_v1") || "[]")); } catch {}
      }
      prevJobCount = currentJobCount;
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const [renamingQuizId, setRenamingQuizId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploading, setUploading] = useState(false);

  const totalSources = sources.pdfs.length + sources.saves.length + sources.videos.length + sources.urls.length + (sources.uploads ? sources.uploads.length : 0) + (sources.internetSearch.enabled ? 1 : 0);
  const finalQuestionCount = numQuestions === "custom" ? customNum : numQuestions;

  // Live Auto-parsed preview allocation based on prompt
  const detectedBriefPlan = useMemo(() => {
    return planSubjects(briefInstructions, difficulty, finalQuestionCount, sources, availablePdfs, availableSaves);
  }, [briefInstructions, difficulty, finalQuestionCount, sources, availablePdfs, availableSaves]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const [hasRestorableTest, setHasRestorableTest] = useState<boolean>(false);
  const [restoredTestState, setRestoredTestState] = useState<any>(null);

  // Check for auto-saved test state on mount
  useEffect(() => {
    try {
      const savedAttempt = localStorage.getItem("jee_active_quiz_attempt_v1");
      if (savedAttempt) {
        const parsed = JSON.parse(savedAttempt);
        if (parsed && parsed.questions && parsed.questions.length > 0) {
          setHasRestorableTest(true);
          setRestoredTestState(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load saved quiz attempt", e);
    }
  }, []);

  // Auto Save active quiz state
  useEffect(() => {
    if (phase === "active" && questions.length > 0 && !reviewMode) {
      localStorage.setItem("jee_active_quiz_attempt_v1", JSON.stringify({
        quizName,
        questions,
        currentIndex,
        questionStatuses,
        answers,
        timeLeft,
        activeSubject,
        timeSpent
      }));
    }
  }, [phase, quizName, questions, currentIndex, questionStatuses, answers, timeLeft, activeSubject, timeSpent, reviewMode]);

  // Load available sources on mount
  useEffect(() => {
    try {
      const pdfs = JSON.parse(localStorage.getItem("jee_pdf_sections_v3") || "[]");
      const vids = JSON.parse(localStorage.getItem("jee_vid_sections_v1") || "[]");
      const saves = JSON.parse(localStorage.getItem("jee_saves_subjects_v1") || "[]");
      
      const pItems: SelectableItem[] = [];
      pdfs.forEach((sec: any) => {
        sec.subsections?.forEach((sub: any) => {
          if (sub.pdfKey || sub.pdfUrl || sub.imageKey) {
            pItems.push({
              id: sub.id,
              name: sub.name,
              path: `${sec.name} > ${sub.name}`,
              mediaKey: sub.pdfKey || sub.imageKey,
              url: sub.pdfUrl,
              fileType: sub.fileType || (sub.imageKey ? "image" : "pdf")
            });
          }
          sub.subsubsections?.forEach((ss: any) => {
             if (ss.pdfKey || ss.pdfUrl || ss.imageKey) {
               pItems.push({
                 id: ss.id,
                 name: ss.name,
                 path: `${sec.name} > ${sub.name} > ${ss.name}`,
                 mediaKey: ss.pdfKey || ss.imageKey,
                 url: ss.pdfUrl,
                 fileType: ss.fileType || (ss.imageKey ? "image" : "pdf")
               });
             }
          });
        });
      });
      setAvailablePdfs(pItems);

      const vItems: SelectableItem[] = [];
      vids.forEach((sec: any) => {
        sec.subsections?.forEach((sub: any) => {
          if (sub.video) vItems.push({ id: sub.id, name: sub.name, path: `${sec.name} > ${sub.name}` });
          sub.subsubsections?.forEach((ss: any) => {
             if (ss.video) vItems.push({ id: ss.id, name: ss.name, path: `${sec.name} > ${sub.name} > ${ss.name}` });
          });
        });
      });
      setAvailableVideos(vItems);

      const sItems: SelectableItem[] = [];
      saves.forEach((sub: any) => {
         sub.chapters?.forEach((chap: any) => {
            chap.sources?.forEach((src: any) => {
               sItems.push({ id: src.id, name: src.name, path: `${sub.name} > ${chap.name}` });
            });
         });
      });
      setAvailableSaves(sItems);
    } catch (e) {}
  }, []);

  const handleStartAnalysis = () => {
    quizGeneratorManager.generate({
      sources,
      difficulty,
      finalQuestionCount,
      readMediaAsArrayBuffer,
      availablePdfs,
      availableVideos,
      model: "",
      useFree: true,
      brief: briefInstructions,
      questionNumbers: pdfQuestionFilter
    });
  };

  const handleGenerateExplanation = async (idx: number) => {
    const q = questions[idx];
    if (!q) return;

    setAiExplanations(prev => ({
      ...prev,
      [idx]: { text: "", loading: true }
    }));

    const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
    if (!apiKey) {
      setAiExplanations(prev => ({
        ...prev,
        [idx]: { text: "", loading: false, error: "OpenRouter API Key is missing. Please configure it in the Admin Panel." }
      }));
      return;
    }

    const explanationModels = [
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
      "nex-agi/nex-n2-pro:free",
      "nvidia/nemotron-3.5-content-safety:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "google/gemma-4-31b-it:free",
      "meta-llama/llama-3.3-70b-instruct:free"
    ];

    const promptText = `You are a world-class IIT JEE teacher and expert evaluator. 
Provide a comprehensive, mathematically rigorous, and step-by-step explanation for the following JEE question.

Question:
${q.text}

Options:
${q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n")}

Correct Option: Option ${String.fromCharCode(65 + q.correctOptionIndex)}

Please write a detailed derivation, detailing all equations, steps, values, and laws/theorems used. Use LaTeX notation for all formulas, equations, symbols, and chemical formulas. Wrap block equations in $$ and inline equations in $. 

Respond with ONLY the markdown explanation. Do not wrap it in JSON or HTML. Start directly with the steps.`;

    let success = false;
    let lastError = "";

    const fixExplanationMath = (str: string) => {
      if (!str) return str;
      return fixLatexFormatting(str);
    };

    for (const modelName of explanationModels) {
      try {
        const payload = {
          model: modelName,
          messages: [{ role: "user", content: promptText }]
        };

        let response;
        try {
          response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey.trim()}`,
              "HTTP-Referer": window.location.href, 
              "X-Title": "JEE Prep App", 
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
        } catch (e: any) {
          response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey.trim()}`,
              "HTTP-Referer": window.location.href, 
              "X-Title": "JEE Prep App", 
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
        }

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          setAiExplanations(prev => ({
            ...prev,
            [idx]: { text: fixExplanationMath(text), model: modelName, loading: false }
          }));
          success = true;
          break;
        } else {
          throw new Error("No response text");
        }
      } catch (err: any) {
        console.warn(`Explanation model ${modelName} failed:`, err);
        lastError = err.message || "Unknown error";
      }
    }

    if (!success) {
      setAiExplanations(prev => ({
        ...prev,
        [idx]: { text: "", loading: false, error: `Could not generate explanation. Fallbacks exhausted. Last error: ${lastError}` }
      }));
    }
  };

  useEffect(() => {
    if (reviewMode && questions[currentIndex]) {
      if (!aiExplanations[currentIndex]) {
        handleGenerateExplanation(currentIndex);
      }
    }
  }, [currentIndex, reviewMode, questions]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeSpent = (seconds: number) => {
     if (seconds < 60) return `${seconds}s`;
     const m = Math.floor(seconds / 60);
     const s = seconds % 60;
     return `${m}m ${s}s`;
  };

  // Timer loop for tracking overall time and per-question active time
  useEffect(() => {
    if (phase === "active" && timeLeft > 0 && !showSummary && !showInstructions && !reviewMode) {
        const timer = setInterval(() => {
          setTimeLeft(t => t - 1);
          setTimeSpent(prev => ({
             ...prev,
             [currentIndex]: (prev[currentIndex] || 0) + 1
          }));
        }, 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && phase === "active" && !reviewMode) {
        finalSubmit();
    }
    return;
  }, [phase, timeLeft, showSummary, showInstructions, currentIndex, reviewMode]);

  const questionsBySubject = subjects.reduce((acc, subj) => {
    acc[subj] = questions.filter(q => q.subject === subj);
    return acc;
  }, {} as Record<string, Question[]>);

  const handleTabClick = (subj: string) => {
    setActiveSubject(subj);
    const firstQIndex = questions.findIndex(q => q.subject === subj);
    if (firstQIndex !== -1) {
        setCurrentIndex(firstQIndex);
        updateStatus(firstQIndex);
    }
  };

  const updateStatus = (index: number) => {
    setQuestionStatuses(prev => {
        if (prev[index] === "not_visited") return { ...prev, [index]: "not_answered" };
        return prev;
    });
  };

  const goToNext = () => {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
        if (reviewMode) {
          setPhase("results");
        } else {
          setShowSummary(true);
        }
    } else {
       const nextSubj = questions[nextIndex].subject;
       if (nextSubj && nextSubj !== activeSubject) setActiveSubject(nextSubj);
       setCurrentIndex(nextIndex);
       updateStatus(nextIndex);
    }
  };

  const handleSaveAndNext = () => {
    const hasAnswer = answers[currentIndex] !== undefined;
    setQuestionStatuses(prev => ({
        ...prev,
        [currentIndex]: hasAnswer ? "answered" : "not_answered"
    }));
    goToNext();
  };

  const handleClear = () => {
    setAnswers(prev => {
        const newAns = { ...prev };
        delete newAns[currentIndex];
        return newAns;
    });
  };

  const handleSaveAndMark = () => {
    const hasAnswer = answers[currentIndex] !== undefined;
    if (hasAnswer) {
        setQuestionStatuses(prev => ({ ...prev, [currentIndex]: "answered_marked_for_review" }));
    } else {
        setQuestionStatuses(prev => ({ ...prev, [currentIndex]: "marked_for_review" }));
    }
    goToNext();
  };

  const handleMarkAndNext = () => {
    setQuestionStatuses(prev => ({ ...prev, [currentIndex]: "marked_for_review" }));
    goToNext();
  };

  const handleBack = () => {
    if (currentIndex > 0) {
       const nextIndex = currentIndex - 1;
       const nextSubj = questions[nextIndex].subject;
       if (nextSubj && nextSubj !== activeSubject) setActiveSubject(nextSubj);
       setCurrentIndex(nextIndex);
       updateStatus(nextIndex);
    }
  };

  const handleResumeTest = () => {
    if (restoredTestState) {
      setQuizName(restoredTestState.quizName);
      setQuestions(restoredTestState.questions);
      setCurrentIndex(restoredTestState.currentIndex);
      setQuestionStatuses(restoredTestState.questionStatuses);
      setAnswers(restoredTestState.answers);
      setTimeLeft(restoredTestState.timeLeft);
      setActiveSubject(restoredTestState.activeSubject);
      setTimeSpent(restoredTestState.timeSpent || {});
      setReviewMode(false);
      setPhase("active");
      setHasRestorableTest(false);
    }
  };

  const handleDiscardTest = () => {
    if (confirm("Are you sure you want to discard your ongoing test? All progress will be lost.")) {
      localStorage.removeItem("jee_active_quiz_attempt_v1");
      setHasRestorableTest(false);
      setRestoredTestState(null);
    }
  };

  const startQuiz = (quiz: SavedQuiz) => {
    setQuizName(quiz.name);
    setQuestions(quiz.questions);
    setCurrentIndex(0);
    setScore(0);
    setAnswers({});
    setTimeSpent({});
    setReviewMode(false);
    const initialStatuses: Record<number, QuestionStatus> = {};
    quiz.questions.forEach((_, i) => initialStatuses[i] = i === 0 ? "not_answered" : "not_visited");
    setQuestionStatuses(initialStatuses);
    setTimeLeft(quiz.questions.length * 120); 
    setActiveSubject(quiz.questions[0]?.subject || "Physics");
    setShowSummary(false);
    setShowInstructions(false);
    setPhase("active");
  };

  const commitRename = (id: string) => {
    if (renameVal.trim()) {
      setSavedQuizzes(prev => prev.map(q => q.id === id ? { ...q, name: renameVal.trim() } : q));
    }
    setRenamingQuizId(null);
  };

  const deleteQuiz = (id: string) => {
    if (confirm("Are you sure you want to delete this test?")) {
      setSavedQuizzes(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleSubmit = () => {
    setShowSummary(true);
  };

  const finalSubmit = () => {
    let calculatedScore = 0;
    questions.forEach((q, i) => {
        const ans = answers[i];
        if (ans !== undefined && ans === q.correctOptionIndex) {
            calculatedScore += 4; 
        } else if (ans !== undefined && ans !== q.correctOptionIndex) {
            calculatedScore -= 1; 
        }
    });
    setScore(calculatedScore);
    setShowSummary(false);

    // Clear auto-saved test state upon submission
    localStorage.removeItem("jee_active_quiz_attempt_v1");
    setHasRestorableTest(false);
    setRestoredTestState(null);
    
    const past = JSON.parse(localStorage.getItem("jee_quiz_results") || "[]");
    localStorage.setItem("jee_quiz_results", JSON.stringify([...past, {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        score: calculatedScore,
        total: questions.length,
        difficulty
    }]));
    setPhase("results");
  };

  // Subject Stats Calculator for Advanced Dashboard
  const getSubjectStats = (subj: string) => {
    const subjQs = questions.filter(q => q.subject === subj);
    const subjIndices = questions.map((q, idx) => q.subject === subj ? idx : -1).filter(idx => idx !== -1);
    
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let time = 0;
    
    subjIndices.forEach(idx => {
      const ans = answers[idx];
      const q = questions[idx];
      time += timeSpent[idx] || 0;
      if (ans === undefined) skipped++;
      else if (ans === q.correctOptionIndex) correct++;
      else incorrect++;
    });
    
    const sScore = correct * 4 - incorrect * 1;
    const totalSubjQs = subjQs.length;
    
    return {
      correct,
      incorrect,
      skipped,
      time,
      score: sScore,
      total: totalSubjQs
    };
  };

  const addUrl = () => {
    if (urlInput.trim()) {
      setSources(s => ({ ...s, urls: [...s.urls, urlInput.trim()] }));
      setUrlInput("");
    }
  };

  const renderCheckboxList = (items: SelectableItem[], selectedIds: string[], type: "pdfs" | "videos" | "saves") => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed border-border rounded-xl">No sources found in your workspace yet.</p>;
    
    return (
      <div className="space-y-1">
        {items.map(item => {
          const isChecked = selectedIds.includes(item.id);
          return (
            <label key={item.id} className="flex items-start gap-3 p-3 bg-muted/40 hover:bg-muted border border-transparent hover:border-border rounded-xl cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={isChecked} 
                onChange={e => setSources(s => ({ ...s, [type]: e.target.checked ? [...s[type], item.id] : s[type].filter((id: string) => id !== item.id) }))}
                className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-wider">{item.path}</p>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const totalPossibleScore = questions.length * 4;
  const answeredQuestionsCount = Object.keys(answers).length;
  const correctAnswersCount = questions.reduce((acc, q, idx) => {
    return acc + (answers[idx] !== undefined && answers[idx] === q.correctOptionIndex ? 1 : 0);
  }, 0);
  const incorrectAnswersCount = questions.reduce((acc, q, idx) => {
    return acc + (answers[idx] !== undefined && answers[idx] !== q.correctOptionIndex ? 1 : 0);
  }, 0);
  const skippedAnswersCount = questions.length - answeredQuestionsCount;
  const accuracy = answeredQuestionsCount > 0 ? Math.round((correctAnswersCount / answeredQuestionsCount) * 100) : 0;
  const totalSecondsSpent = Object.values(timeSpent).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full w-full bg-background overflow-y-auto flex flex-col items-center relative text-foreground">
      {/* Header */}
      <div className="w-full relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-background border-b border-border px-6 py-8 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.1),_transparent_50%)]" />
        <div className="max-w-4xl mx-auto flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0 shadow-lg shadow-primary/20">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">AI Quiz Generator</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Test your knowledge with an advanced custom exam builder.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl px-6 py-8 relative">
        <AnimatePresence mode="wait">
          {/* ── PHASE 1: SETUP ── */}
          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Warnings */}
              {hasRestorableTest && restoredTestState && (
                <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                   <div className="flex items-start gap-3">
                      <Timer className="h-6 w-6 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                         <p className="font-bold text-sm">Unfinished Test Session Detected</p>
                         <p className="text-xs opacity-90 mt-0.5">You have an ongoing attempt for <strong>{restoredTestState.quizName || "Practice Quiz"}</strong> with {Math.floor(restoredTestState.timeLeft / 3600)}h {Math.floor((restoredTestState.timeLeft % 3600) / 60)}m {restoredTestState.timeLeft % 60}s remaining.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="border-amber-500/30 hover:bg-amber-500/20 font-bold" onClick={handleDiscardTest}>
                         Discard
                      </Button>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={handleResumeTest}>
                         Resume Test
                      </Button>
                   </div>
                </div>
              )}
              {!localStorage.getItem("jee_openrouter_api_key") && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm font-semibold">
                   <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                   <div>
                     <p className="font-bold">No OpenRouter API Key configured</p>
                     <p className="text-xs font-normal opacity-90">Please enter your API Key in the Admin Panel to enable quiz generation.</p>
                   </div>
                </div>
              )}

              {/* Number of Questions */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-blue-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Number of Questions</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumQuestions(num)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2",
                        numQuestions === num
                          ? "bg-blue-500/10 border-blue-500 text-blue-500 dark:text-blue-400"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => setNumQuestions("custom")}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2",
                        numQuestions === "custom"
                          ? "bg-blue-500/10 border-blue-500 text-blue-500 dark:text-blue-400"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      Custom
                    </button>
                    <AnimatePresence>
                      {numQuestions === "custom" && (
                        <motion.div
                          initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                          animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
                          exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                          className="overflow-hidden"
                        >
                          <Input
                            type="number"
                            value={customNum}
                            onChange={(e) => setCustomNum(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 text-center font-bold bg-background border-2 border-blue-500/30 focus-visible:ring-blue-500"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Difficulty Level</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["Easy", "Medium", "Hard", "Mixed"] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={cn(
                        "p-4 rounded-xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-2",
                        difficulty === diff
                          ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {diff}
                      {diff === "Mixed" && (
                        <span className="text-[10px] font-medium opacity-70">Ratio 2:1:3</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Data Sources</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSourceModal(true)}
                    className="gap-2 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Sources
                  </Button>
                </div>
                
                {totalSources === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No sources selected</p>
                    <p className="text-xs text-muted-foreground mt-1">Select PDFs, Saves, Videos, URLs or Internet to ground the AI.</p>
                    <Button onClick={() => setShowSourceModal(true)} variant="secondary" size="sm" className="mt-4 font-bold">
                      Add Sources
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {sources.pdfs.length > 0 && (
                      <div className="flex items-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 text-sm font-semibold">
                        <FileText className="h-4 w-4" /> {sources.pdfs.length} PDF Sections
                      </div>
                    )}
                    {sources.saves.length > 0 && (
                      <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 text-sm font-semibold">
                        <Save className="h-4 w-4" /> {sources.saves.length} Saved Sources
                      </div>
                    )}
                    {sources.videos.length > 0 && (
                      <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-sm font-semibold">
                        <FileVideo className="h-4 w-4" /> {sources.videos.length} Video Sections
                      </div>
                    )}
                    {sources.urls.length > 0 && (
                      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-sm font-semibold">
                        <Globe className="h-4 w-4" /> {sources.urls.length} URLs
                      </div>
                    )}
                    {sources.internetSearch.enabled && (
                      <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 text-sm font-semibold">
                        <Search className="h-4 w-4" /> Web Search Active
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PDF Specific Options */}
              {sources.pdfs.length > 0 && (
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-red-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Specific Question Numbers (PDF only)</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Specify which exact question numbers to extract from the selected PDF files (e.g. <code>1, 2, 6</code>). Leaving this empty will extract all questions.
                  </p>
                  <Input
                    value={pdfQuestionFilter}
                    onChange={(e) => setPdfQuestionFilter(e.target.value)}
                    placeholder="e.g. 1, 2, 6"
                    className="h-12 bg-muted/30 rounded-2xl"
                  />
                </div>
              )}

              {/* Explain Briefly (Custom distribution box) */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Pencil className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Explain Briefly / Custom Guidelines</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Describe exact ratios, target sub-topics, or subject splits (e.g. "in 30 questions put 10 tough questions of Maths, 16 medium questions of Physics and 4 hard questions of Chemistry").
                </p>
                <textarea
                  value={briefInstructions}
                  onChange={(e) => setBriefInstructions(e.target.value)}
                  placeholder="e.g. put 10 tough question of Maths, 16 medium question of Physics and 4 hard question for Chemistry. Exclude chemistry completely if needed."
                  className="w-full min-h-[100px] rounded-2xl bg-muted/30 border border-border p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all font-medium"
                />

                {briefInstructions.trim() && (
                  <div className="mt-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs flex flex-wrap gap-4 items-center font-semibold text-foreground">
                    <span className="text-muted-foreground flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Detected Plan:</span>
                    {detectedBriefPlan.Maths.count > 0 && <span className="text-blue-600 dark:text-blue-400 font-bold">Maths: {detectedBriefPlan.Maths.count} Qs ({detectedBriefPlan.Maths.difficulty})</span>}
                    {detectedBriefPlan.Physics.count > 0 && <span className="text-indigo-600 dark:text-indigo-400 font-bold">Physics: {detectedBriefPlan.Physics.count} Qs ({detectedBriefPlan.Physics.difficulty})</span>}
                    {detectedBriefPlan.Chemistry.count > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold">Chemistry: {detectedBriefPlan.Chemistry.count} Qs ({detectedBriefPlan.Chemistry.difficulty})</span>}
                    <span className="text-foreground font-black ml-auto border-l pl-3 border-border">Total: {detectedBriefPlan.Physics.count + detectedBriefPlan.Chemistry.count + detectedBriefPlan.Maths.count} Qs</span>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleStartAnalysis}
                  disabled={totalSources === 0 || !localStorage.getItem("jee_openrouter_api_key")}
                  size="lg"
                  className="gap-2 h-14 px-8 rounded-2xl text-base font-bold shadow-xl shadow-primary/25"
                >
                  {isGenerating ? "Generate Another Quiz" : "Synthesize & Generate Quiz"} <Zap className="h-5 w-5" />
                </Button>
              </div>

              {/* Saved Quizzes / Tests */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-green-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Your Generated Tests</h2>
                </div>
                
                <div className="space-y-3">
                  {activeJobs.map(job => (
                    <div key={job.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-[200px] flex-1">
                        <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
                        <div className="min-w-0">
                           <p className="text-sm font-bold text-foreground truncate">Generating {job.name}...</p>
                           <p className="text-xs text-muted-foreground font-semibold truncate">{job.status}</p>
                        </div>
                      </div>
                      
                      {/* Smooth progress bar tracking completion */}
                      <JobProgressBar status={job.status} />
                      
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 shrink-0" onClick={() => quizGeneratorManager.stopJob(job.id)}>
                        <Square className="h-3.5 w-3.5 fill-current" />
                      </Button>
                    </div>
                  ))}

                  {savedQuizzes.length === 0 && !isGenerating && (
                     <div className="text-center py-6 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                       <p className="text-sm font-medium text-foreground">No tests generated yet</p>
                       <p className="text-xs text-muted-foreground mt-1">Configure options above and generate your first quiz.</p>
                     </div>
                  )}

                  {savedQuizzes.map(quiz => (
                     <div key={quiz.id} className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                        <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                           {renamingQuizId === quiz.id ? (
                              <Input 
                                 autoFocus
                                 value={renameVal} 
                                 onChange={e => setRenameVal(e.target.value)} 
                                 onBlur={() => commitRename(quiz.id)}
                                 onKeyDown={e => e.key === 'Enter' && commitRename(quiz.id)}
                                 className="h-7 text-sm font-bold bg-background mb-1" 
                              />
                           ) : (
                              <p className="text-sm font-bold text-foreground truncate">{quiz.name}</p>
                           )}
                           <p className="text-xs text-muted-foreground font-semibold">{quiz.questions.length} Questions • {quiz.difficulty} • {new Date(quiz.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <Button variant="outline" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => { setRenamingQuizId(quiz.id); setRenameVal(quiz.name); }}>
                              <Pencil className="h-4 w-4" />
                           </Button>
                           <Button variant="outline" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-500/10 border-transparent hover:border-red-500/20" onClick={() => deleteQuiz(quiz.id)}>
                              <Trash2 className="h-4 w-4" />
                           </Button>
                           <Button size="sm" className="h-8 px-4 font-bold" onClick={() => startQuiz(quiz)}>
                              Start Test
                           </Button>
                        </div>
                     </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PHASE 3: ACTIVE QUIZ (JEE INTERFACE & REVIEW MODE) ── */}
          {phase === "active" && questions.length > 0 && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background flex flex-col font-sans text-foreground"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-muted border border-border rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                     <User className="h-10 w-10 text-muted-foreground fill-current" />
                  </div>
                  <table className="text-sm font-semibold text-foreground">
                    <tbody>
                      <tr>
                        <td className="pr-2 pb-0.5 text-muted-foreground font-bold">Candidate Name</td>
                        <td className="pb-0.5">: <span className="font-extrabold text-foreground">{user || "Student"}</span></td>
                      </tr>
                      <tr>
                        <td className="pr-2 pb-0.5 text-muted-foreground font-bold">Test Name</td>
                        <td className="pb-0.5 flex items-center gap-1">: <span className="font-extrabold text-foreground">{quizName}</span> <Info className="w-3.5 h-3.5 text-muted-foreground" /></td>
                      </tr>
                      <tr>
                        <td className="pr-2 text-muted-foreground font-bold text-sm">{reviewMode ? "Mode" : "Remaining Time"}</td>
                        <td className="py-1">: {reviewMode ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-xs shadow-sm text-white bg-emerald-500">REVIEW SOLUTIONS</span>
                        ) : (
                          <span className={cn(
                            "font-mono font-black tracking-wider shadow-sm border px-3 py-1 text-xs rounded-md inline-block",
                            timeLeft < 300 
                              ? "animate-pulse bg-red-600 text-white border-red-500" 
                              : "bg-[#3b82f6] text-white border-[#2563eb]"
                          )}>
                            {formatTime(timeLeft)}
                          </span>
                        )}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!reviewMode && (
                  <Button variant="outline" onClick={() => setShowInstructions(true)} className="border-border text-foreground hover:bg-muted font-bold text-sm">View Instructions</Button>
                )}
              </div>
              
              {/* Tabs */}
              <div className="flex items-center bg-card border-b border-border shrink-0 px-1 relative">
                 <button className="px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground shrink-0"><ChevronLeft className="w-4 h-4" /></button>
                 <div className="flex bg-card flex-1 overflow-x-auto scrollbar-hide">
                 {subjects.map(subj => {
                   if (!questionsBySubject[subj] || questionsBySubject[subj].length === 0) return null;
                    return (
                    <button 
                      key={subj}
                      onClick={() => handleTabClick(subj)}
                      className={cn("px-5 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap", activeSubject === subj ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30")}
                    >
                      {subj}
                    </button>
                    );
                 })}
                 </div>
                 <button className="px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground shrink-0"><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* Main content */}
              <div className="flex flex-1 overflow-hidden bg-background text-foreground">
                 {/* Left Area - Question */}
                 <div className="flex-1 flex flex-col border-r border-border relative">
                    <div className="flex justify-between items-center px-6 py-3 shrink-0 border-b border-border bg-card/50">
                       <div className="flex items-center gap-4">
                         <span className="font-bold text-lg text-foreground">Question {questions.filter(q => q.subject === activeSubject).findIndex(q => q === questions[currentIndex]) + 1}:</span>
                         <span className="text-muted-foreground border border-border bg-muted/30 px-2.5 py-0.5 rounded-full text-xs font-bold">Marks: <span className="text-emerald-500 font-extrabold">+4</span> <span className="text-red-500 font-extrabold">-1</span></span>
                         <span className="text-muted-foreground border border-border bg-muted/30 px-2.5 py-0.5 rounded-full text-xs font-bold">Type: Single Option Correct</span>
                       </div>
                        {reviewMode ? (
                          <button 
                            onClick={() => {
                              setSelectedQuestionForSource(questions[currentIndex]);
                              setShowQuestionSourceDialog(true);
                            }}
                            className="text-primary hover:text-primary/80 hover:bg-primary/10 p-2 rounded-full transition-all relative group"
                            title="Question Source Origin"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setShowExitConfirm(true)}
                              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-2 rounded-full transition-all"
                              title="Quit Test"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button className="text-muted-foreground hover:text-foreground p-2 rounded-full transition-all">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                       {/* BLOCK 1: Core Text Statement (Image crop, or LaTeX text fallback) */}
                       {questions[currentIndex].questionCropUrl ? (
                          <div className="p-3 border border-border rounded-2xl bg-white dark:bg-zinc-900 inline-block max-w-full shadow-sm select-none">
                             <img src={questions[currentIndex].questionCropUrl} className="w-full h-auto object-contain select-none" alt="Question statement text" />
                          </div>
                       ) : (
                          <div className="prose dark:prose-invert max-w-none text-base md:text-lg text-foreground leading-relaxed font-serif">
                             <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{questions[currentIndex].text}</ReactMarkdown>
                          </div>
                       )}

                       {/* BLOCK 2: Conditional Embedded Options / Matrices */}
                       {questions[currentIndex].hasEmbeddedOptions && questions[currentIndex].embeddedOptionsCropUrl && (
                          <div className="my-4 p-2 bg-white rounded-xl border border-zinc-800 overflow-x-auto">
                             <img src={questions[currentIndex].embeddedOptionsCropUrl} className="max-w-full h-auto" alt="Matrix Table Context" />
                          </div>
                       )}

                       {/* BLOCK 3: Conditional Diagrams */}
                       {questions[currentIndex].hasIsolatedDiagram && questions[currentIndex].diagramCropUrl && (
                          <div className="my-4 p-4 bg-white border border-zinc-200 rounded-xl max-w-sm mx-auto shadow-md">
                             <img src={questions[currentIndex].diagramCropUrl} className="w-full h-auto object-contain" alt="Problem Geometry Diagram" />
                          </div>
                       )}

                       {/* BLOCK 4: Final Interactive Choice Grid */}
                       <div className="mt-8 space-y-3">
                         {questions[currentIndex].options.map((opt, i) => {
                            const isSelected = answers[currentIndex] === i;
                            const isCorrect = i === questions[currentIndex].correctOptionIndex;
                            
                            return (
                              <label 
                                key={i} 
                                className={cn(
                                  "flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none",
                                  reviewMode
                                    ? isCorrect
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-300"
                                      : isSelected
                                        ? "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-300"
                                        : "border-border bg-card/30 hover:bg-card"
                                    : isSelected
                                      ? "bg-primary/5 border-primary text-primary"
                                      : "border-border bg-card/30 hover:bg-card hover:border-border/80"
                                )}
                              >
                                <input 
                                  type="radio" 
                                  name={`question-${currentIndex}`} 
                                  checked={isSelected} 
                                  disabled={reviewMode}
                                  onChange={() => setAnswers(prev => ({...prev, [currentIndex]: i}))} 
                                  className="mt-1 w-4 h-4 accent-primary cursor-pointer border-border" 
                                />
                                <div className="font-semibold prose dark:prose-invert max-w-none text-sm md:text-base text-foreground flex-1">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={quizOptionComponents}>{`(${String.fromCharCode(65 + i)}) ${opt}`}</ReactMarkdown>
                                </div>
                                {reviewMode && isCorrect && <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
                                {reviewMode && isSelected && !isCorrect && <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                              </label>
                            );
                         })}
                       </div>

                       {/* Explanation Box (Review Mode Only) */}
                       {reviewMode && (
                          <div className="space-y-6 mt-8">
                            {/* Standard Explanation */}
                            <div className="p-6 bg-primary/5 border border-primary/15 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                  <BrainCircuit className="h-4 w-4" /> Comprehensive Scientific Derivation
                                </div>
                                {questions[currentIndex].confidence !== undefined && (
                                  <div className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm",
                                    questions[currentIndex].confidence! >= 85
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                      : questions[currentIndex].confidence! >= 60
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                        : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                  )}>
                                    <span>Verification Confidence:</span>
                                    <span className="font-extrabold">{questions[currentIndex].confidence}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="prose dark:prose-invert max-w-none text-sm md:text-base text-foreground leading-relaxed font-sans">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                  {questions[currentIndex].explanation}
                                </ReactMarkdown>
                              </div>
                              {questions[currentIndex].consensusAnalysis && (
                                <div className="mt-4 p-4 bg-muted/40 border border-border/85 rounded-xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    <Search className="h-3.5 w-3.5" /> Web Verification Trail (Consensus Analysis)
                                  </div>
                                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed font-medium">
                                    {questions[currentIndex].consensusAnalysis}
                                  </p>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground pt-3 border-t border-border flex flex-wrap gap-4 justify-between font-semibold">
                                <span>Time spent: <span className="text-foreground">{formatTimeSpent(timeSpent[currentIndex] || 0)}</span></span>
                                {questions[currentIndex].sourceInfo && (
                                  <span>Source: <span className="text-foreground capitalize">{questions[currentIndex].sourceInfo.sourceType}</span> - <span className="text-foreground">{questions[currentIndex].sourceInfo.sourceName} {questions[currentIndex].sourceInfo.page ? `(Page ${questions[currentIndex].sourceInfo.page})` : ""} {questions[currentIndex].sourceInfo.questionNum ? `(Q${questions[currentIndex].sourceInfo.questionNum})` : ""}</span></span>
                                )}
                                <span>Difficulty: <span className="text-foreground">{questions[currentIndex].difficulty}</span></span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                    
                    {/* Action Bar */}
                    <div className="p-3 border-t border-border flex flex-wrap gap-3 justify-between items-center bg-card shrink-0">
                       <div className="flex gap-2">
                         {!reviewMode && (
                           <>
                             <Button onClick={handleSaveAndNext} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded px-5 h-9 text-sm">SAVE & NEXT</Button>
                             <Button variant="outline" onClick={handleClear} className="font-bold border-border text-foreground hover:bg-muted rounded h-9 text-sm">CLEAR</Button>
                           </>
                         )}
                       </div>
                       <div className="flex gap-2">
                         {!reviewMode && (
                           <>
                             <Button onClick={handleSaveAndMark} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded px-5 h-9 text-sm">SAVE & MARK FOR REVIEW</Button>
                             <Button onClick={handleMarkAndNext} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded px-5 h-9 text-sm">MARK FOR REVIEW & NEXT</Button>
                           </>
                         )}
                       </div>
                    </div>
                 </div>

                 {/* Right Area - Palette */}
                 <div className="w-[340px] flex flex-col bg-card shrink-0 select-none">
                    {/* Palette Stats */}
                    <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 border-b border-border text-[11px] text-muted-foreground font-bold">
                      <div className="flex items-center gap-2"><AnsweredShape>{Object.values(questionStatuses).filter(s => s === "answered").length}</AnsweredShape> <span>Answered</span></div>
                      <div className="flex items-center gap-2"><NotAnsweredShape>{Object.values(questionStatuses).filter(s => s === "not_answered").length}</NotAnsweredShape> <span>Not Answered</span></div>
                      <div className="flex items-center gap-2"><NotVisitedShape>{Object.values(questionStatuses).filter(s => s === "not_visited").length}</NotVisitedShape> <span>Not Visited</span></div>
                      <div className="flex items-center gap-2"><MarkedShape>{Object.values(questionStatuses).filter(s => s === "marked_for_review").length}</MarkedShape> <span>Mark for review</span></div>
                      <div className="col-span-2 flex items-center gap-2 mt-1">
                         <AnsweredMarkedShape>{Object.values(questionStatuses).filter(s => s === "answered_marked_for_review").length}</AnsweredMarkedShape> 
                         <span className="leading-tight">Answered & Marked (evaluated)</span>
                      </div>
                    </div>

                    {/* Number Grid */}
                    <div className="flex-1 overflow-y-auto bg-muted/20">
                       <div className="bg-muted text-foreground font-bold text-sm px-4 py-2 border-b border-border">
                          {activeSubject}
                       </div>
                       <div className="p-4 grid grid-cols-5 gap-3">
                             {questionsBySubject[activeSubject]?.map((q, localIndex) => {
                               const globalIndex = questions.findIndex(x => x === q);
                               
                               return (
                                 <button 
                                   key={globalIndex} 
                                   onClick={() => {
                                     setCurrentIndex(globalIndex);
                                     updateStatus(globalIndex);
                                   }} 
                                   className="focus:outline-none flex justify-center hover:opacity-80 transition-opacity"
                                 >
                                   {reviewMode ? (
                                      <ReviewShape index={globalIndex} answers={answers} questions={questions}>
                                        {localIndex + 1}
                                      </ReviewShape>
                                   ) : (
                                      (() => {
                                         const status = questionStatuses[globalIndex];
                                         let ShapeComponent = NotVisitedShape;
                                         if (status === "not_answered") ShapeComponent = NotAnsweredShape;
                                         else if (status === "answered") ShapeComponent = AnsweredShape;
                                         else if (status === "marked_for_review") ShapeComponent = MarkedShape;
                                         else if (status === "answered_marked_for_review") ShapeComponent = AnsweredMarkedShape;

                                         return <ShapeComponent>{localIndex + 1}</ShapeComponent>;
                                      })()
                                   )}
                                 </button>
                               );
                             })}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Global Bottom Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border shrink-0 shadow-md z-10">
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={handleBack} className="font-bold border-border text-foreground hover:bg-muted rounded h-10 px-4 text-sm" disabled={currentIndex === 0}>&lt; BACK</Button>
                   <Button variant="outline" onClick={goToNext} className="font-bold border-border text-foreground hover:bg-muted rounded h-10 px-4 text-sm" disabled={currentIndex === questions.length - 1}>NEXT &gt;</Button>
                 </div>
                 {reviewMode ? (
                   <Button onClick={() => setPhase("results")} className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded px-8 h-10 text-sm">EXIT REVIEW</Button>
                 ) : (
                   <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded px-8 h-10 text-sm">SUBMIT</Button>
                 )}
              </div>

              {/* Modals */}
              {showSummary && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-foreground">
                   <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 w-full max-w-3xl">
                      <h2 className="text-2xl font-black mb-6 text-center bg-muted py-3 rounded-lg">Test Submission Summary</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
                         <div className="text-center p-4 bg-muted/40 border border-border rounded-xl shadow-sm">
                           <div className="text-3xl font-black text-foreground mb-1">{questions.length}</div>
                           <div className="text-xs font-bold text-muted-foreground uppercase">Total</div>
                         </div>
                         <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl shadow-sm">
                           <div className="text-3xl font-black text-emerald-500 mb-1">{Object.values(questionStatuses).filter(s => s === "answered" || s === "answered_marked_for_review").length}</div>
                           <div className="text-xs font-bold text-emerald-600 uppercase">Answered</div>
                         </div>
                         <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl shadow-sm">
                           <div className="text-3xl font-black text-red-500 mb-1">{Object.values(questionStatuses).filter(s => s === "not_answered").length}</div>
                           <div className="text-xs font-bold text-red-600 uppercase">Not Answered</div>
                         </div>
                         <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl shadow-sm">
                           <div className="text-3xl font-black text-purple-500 mb-1">{Object.values(questionStatuses).filter(s => s === "marked_for_review").length}</div>
                           <div className="text-xs font-bold text-purple-600 uppercase">Marked</div>
                         </div>
                         <div className="text-center p-4 bg-muted/60 border border-border rounded-xl shadow-sm">
                           <div className="text-3xl font-black text-muted-foreground mb-1">{Object.values(questionStatuses).filter(s => s === "not_visited").length}</div>
                           <div className="text-xs font-bold text-muted-foreground uppercase">Not Visited</div>
                         </div>
                      </div>
                      <p className="text-center mb-8 font-bold text-lg text-foreground">Are you sure you want to submit the test for final marking?<br/><span className="text-sm font-medium text-muted-foreground">No changes will be allowed after submission.</span></p>
                      <div className="flex justify-center gap-6">
                         <Button variant="outline" size="lg" onClick={() => setShowSummary(false)} className="font-bold px-8 h-12 rounded-xl border-border text-foreground hover:bg-muted">Return</Button>
                         <Button size="lg" onClick={finalSubmit} className="font-bold px-10 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30">Submit</Button>
                      </div>
                   </div>
                </div>
              )}

              {showInstructions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-foreground">
                   <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                      <div className="px-6 py-4 border-b border-border bg-muted/40 rounded-t-xl shrink-0">
                         <h2 className="text-lg font-black text-center text-foreground uppercase tracking-widest">General Instructions</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 text-sm text-muted-foreground leading-relaxed">
                          <p className="font-bold text-foreground mb-4 text-center">Please read the instructions carefully</p>
                          <ol className="list-decimal pl-5 mb-6 space-y-2 font-medium">
                            <li>Total duration of examination is 180 minutes.</li>
                            <li>The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end automatically.</li>
                            <li>The Question Palette displayed on the right side of screen will show the status of each question.</li>
                          </ol>
                      </div>
                      <div className="px-6 py-4 border-t border-border bg-muted/40 rounded-b-xl flex justify-end shrink-0">
                         <Button onClick={() => setShowInstructions(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-10 rounded">Close</Button>
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PHASE 4: ADVANCED RESULTS & DASHBOARD ── */}
          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 max-w-4xl mx-auto pb-12 text-foreground"
            >
              {/* Header & Trophy Card */}
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-lg shadow-yellow-500/5 shrink-0 animate-bounce">
                    <Trophy className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">Test Analysis Report</h2>
                    <p className="text-sm text-muted-foreground mt-1">Detailed subject breakdown and time analysis.</p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <Button onClick={() => { setReviewMode(true); setPhase("active"); setCurrentIndex(0); }} className="flex-1 md:flex-initial h-12 px-6 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/95 transition-all gap-2">
                    <Eye className="w-5 h-5" /> View Solutions
                  </Button>
                  <Button variant="outline" onClick={() => setPhase("setup")} className="flex-1 md:flex-initial h-12 px-6 rounded-xl font-bold border-border hover:bg-muted">
                    Dashboard
                  </Button>
                </div>
              </div>

              {/* Metric Overview grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Score Obtained</span>
                  <div className="text-3xl font-black text-primary mt-2">
                    {score} <span className="text-sm font-normal text-muted-foreground">/ {totalPossibleScore}</span>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Accuracy Rating</span>
                  <div className="text-3xl font-black text-emerald-500 mt-2">{accuracy}%</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Time Spent</span>
                  <div className="text-3xl font-black text-amber-500 mt-2">{formatTimeSpent(totalSecondsSpent)}</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Questions Breakdown</span>
                  <div className="text-xl font-black text-foreground mt-2.5 flex items-center justify-center gap-1.5 font-sans">
                    <span className="text-emerald-500">{correctAnswersCount}</span>
                    <span className="text-muted-foreground text-xs font-medium">C</span>
                    <span className="text-muted-foreground text-xs font-medium">•</span>
                    <span className="text-red-500">{incorrectAnswersCount}</span>
                    <span className="text-muted-foreground text-xs font-medium">W</span>
                    <span className="text-muted-foreground text-xs font-medium">•</span>
                    <span className="text-muted-foreground">{skippedAnswersCount}</span>
                    <span className="text-muted-foreground text-xs font-medium">S</span>
                  </div>
                </div>
              </div>

              {/* Subject-wise breakdowns */}
              <div className="space-y-4">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary animate-pulse" /> Subject Analysis
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subjects.map(subj => {
                    const stats = getSubjectStats(subj);
                    if (stats.total === 0) return null;
                    
                    return (
                      <div key={subj} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
                        <div>
                          <h4 className="text-base font-extrabold text-foreground border-b border-border pb-2 mb-4 flex items-center justify-between">
                            <span>{subj}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{stats.total} Qs</span>
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-muted-foreground">Subject Score</span>
                              <span className="text-foreground">{stats.score} / {stats.total * 4}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-muted-foreground">Accuracy</span>
                              <span className="text-emerald-500">
                                {stats.correct + stats.incorrect > 0 
                                  ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100) 
                                  : 0}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-muted-foreground">Time Spent</span>
                              <span className="text-amber-500">{formatTimeSpent(stats.time)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-muted-foreground">Correct / Wrong</span>
                              <span className="text-foreground">
                                <span className="text-emerald-500">{stats.correct}</span> / <span className="text-red-500">{stats.incorrect}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question Palette overview */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="text-lg font-black tracking-tight">Question Grid & Performance</h3>
                <div className="space-y-6">
                  {subjects.map(subj => {
                    const stats = getSubjectStats(subj);
                    if (stats.total === 0) return null;
                    
                    return (
                      <div key={subj} className="space-y-3">
                        <div className="flex justify-between items-center bg-muted/40 px-4 py-2.5 rounded-xl border border-border/50">
                          <span className="text-sm font-bold text-foreground">{subj}</span>
                          <span className="text-xs text-muted-foreground font-semibold">{stats.correct} Correct • {stats.incorrect} Wrong • {stats.skipped} Skipped</span>
                        </div>
                        
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                          {questions.map((q, idx) => {
                            if (q.subject !== subj) return null;
                            
                            const subjQs = questions.filter(x => x.subject === subj);
                            const localIndex = subjQs.findIndex(x => x === q) + 1;
                            
                            const ans = answers[idx];
                            const isCorrect = ans !== undefined && ans === q.correctOptionIndex;
                            const isWrong = ans !== undefined && ans !== q.correctOptionIndex;
                            
                            let bgClass = "bg-muted/40 text-muted-foreground border-border";
                            if (isCorrect) bgClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
                            if (isWrong) bgClass = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setReviewMode(true);
                                  setPhase("active");
                                  setCurrentIndex(idx);
                                }}
                                className={cn(
                                  "py-1.5 min-h-[56px] h-auto border rounded-xl flex flex-col items-center justify-center font-bold text-xs hover:opacity-80 transition-all select-none relative overflow-hidden",
                                  bgClass
                                )}
                              >
                                <span>{localIndex}</span>
                                <span className="text-[8px] font-semibold opacity-70">{formatTimeSpent(timeSpent[idx] || 0)}</span>
                                {q.confidence !== undefined && (
                                  <span className={cn(
                                    "text-[7.5px] font-extrabold mt-0.5 px-1 rounded-sm",
                                    q.confidence >= 85
                                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                      : q.confidence >= 60
                                        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                        : "text-red-600 dark:text-red-400 bg-red-500/10"
                                  )}>
                                    {q.confidence}%
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Exit Confirmation Dialog ── */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowExitConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 flex flex-col z-50"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2 text-red-500 font-extrabold">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-lg">Quit Active Test?</span>
                </div>
                <button onClick={() => setShowExitConfirm(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm font-medium text-muted-foreground mb-6">
                Are you sure you want to terminate this test session? Your current progress and answers for this session will not be saved.
              </p>

              <div className="flex items-center gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowExitConfirm(false)} 
                  className="font-bold border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowExitConfirm(false);
                    localStorage.removeItem("jee_active_quiz_attempt_v1");
                    setHasRestorableTest(false);
                    setRestoredTestState(null);
                    setPhase("setup");
                  }} 
                  className="font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  Quit Test
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Source Selection Modal ── */}
      <AnimatePresence>
        {showSourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowSourceModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-lg font-black text-foreground">Manage Data Sources</h2>
                <button onClick={() => setShowSourceModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-border pb-2 mb-4 shrink-0 overflow-x-auto scrollbar-hide">
                 {["pdfs", "videos", "saves", "urls", "internet", "uploads"].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setSourceTab(tab as any)}
                      className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap", sourceTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      {tab === "pdfs" ? "PDFs" : tab === "uploads" ? "Files / Notes" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                 ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto min-h-[250px] pr-2">
                 {sourceTab === "pdfs" && renderCheckboxList(availablePdfs, sources.pdfs, "pdfs")}
                 {sourceTab === "videos" && renderCheckboxList(availableVideos, sources.videos, "videos")}
                 {sourceTab === "saves" && renderCheckboxList(availableSaves, sources.saves, "saves")}
                 
                 {sourceTab === "urls" && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addUrl()} placeholder="https://youtube.com/... or any document url" className="flex-1 text-sm bg-muted/50" />
                        <Button onClick={addUrl} size="sm" className="px-6 font-bold">Add URL</Button>
                      </div>
                      <div className="space-y-2">
                        {sources.urls.length === 0 && <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-border rounded-xl">No URLs added.</p>}
                        {sources.urls.map((url, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-muted/40 border border-border rounded-xl text-sm">
                            <span className="truncate flex-1 mr-2 text-sm font-medium">{url}</span>
                            <button onClick={() => setSources(s => ({...s, urls: s.urls.filter((_, idx) => idx !== i)}))} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                 )}

                 {sourceTab === "internet" && (
                    <div className="space-y-6">
                      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 transition-colors hover:bg-amber-500/10">
                        <label className="flex items-center gap-4 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={sources.internetSearch.enabled} 
                            onChange={e => setSources(s => ({...s, internetSearch: {...s.internetSearch, enabled: e.target.checked}}))} 
                            className="w-5 h-5 accent-amber-500 rounded cursor-pointer" 
                          />
                          <div>
                            <span className="text-base font-bold text-foreground block mb-0.5">Fetch questions from the Internet</span>
                            <span className="text-xs text-muted-foreground block">Allow AI to crawl the web for up-to-date or broader questions.</span>
                          </div>
                        </label>
                      </div>
                      
                      <AnimatePresence>
                        {sources.internetSearch.enabled && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Search term or Topic</p>
                            <Input 
                              value={sources.internetSearch.query} 
                              onChange={e => setSources(s => ({...s, internetSearch: {...s.internetSearch, query: e.target.value}}))} 
                              placeholder="e.g. Thermodynamics JEE Advanced Previous Year Questions" 
                              className="h-12 bg-muted/50"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1 ml-1">Specify exactly what kind of questions the AI should look for online.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                 )}

                 {sourceTab === "uploads" && (
                    <div className="space-y-4">
                      <div className="flex gap-2 items-center">
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors relative">
                          <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                          <span className="text-sm font-semibold text-foreground">Click to upload document or image</span>
                          <span className="text-xs text-muted-foreground mt-1">Supports PDF, Image, Word, PPT, Notes</span>
                          {uploading && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-2xl z-10 gap-2">
                              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                              <span className="text-sm font-bold text-foreground">Parsing document...</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept=".pdf,.png,.jpg,.jpeg,.docx,.doc,.pptx,.ppt,.txt,.md" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploading(true);
                              try {
                                const buf = await file.arrayBuffer();
                                let text = "";
                                let dataUrl = "";
                                const fileExt = file.name.split('.').pop()?.toLowerCase();

                                if (fileExt === "pdf") {
                                  const key = `upload_pdf_${Date.now()}_${file.name}`;
                                  if (writeMedia) {
                                    await writeMedia(key, buf);
                                  }
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: key, name: file.name, fileType: "pdf" }]
                                  }));
                                } else if (["png", "jpg", "jpeg"].includes(fileExt || "")) {
                                  const key = `upload_img_${Date.now()}_${file.name}`;
                                  if (writeMedia) {
                                    await writeMedia(key, buf);
                                  }
                                  const blob = new Blob([buf], { type: file.type });
                                  dataUrl = await new Promise<string>((resolve) => {
                                    const r = new FileReader();
                                    r.onloadend = () => resolve(r.result as string);
                                    r.readAsDataURL(blob);
                                  });
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: key, name: file.name, fileType: "image", dataUrl }]
                                  }));
                                } else if (fileExt === "docx") {
                                  text = await extractTextFromDocx(buf);
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: `upload_${Date.now()}`, name: file.name, text, fileType: "docx" }]
                                  }));
                                } else if (fileExt === "pptx") {
                                  text = await extractTextFromPptx(buf);
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: `upload_${Date.now()}`, name: file.name, text, fileType: "pptx" }]
                                  }));
                                } else if (["txt", "md"].includes(fileExt || "")) {
                                  text = new TextDecoder().decode(buf);
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: `upload_${Date.now()}`, name: file.name, text, fileType: "text" }]
                                  }));
                                } else if (["doc", "ppt"].includes(fileExt || "")) {
                                  text = extractStringsFromBinary(buf);
                                  setSources(s => ({
                                    ...s,
                                    uploads: [...(s.uploads || []), { id: `upload_${Date.now()}`, name: file.name, text, fileType: "text" }]
                                  }));
                                }
                              } catch (uploadErr) {
                                console.error("Error loading direct upload file:", uploadErr);
                              } finally {
                                setUploading(false);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      
                      <div className="space-y-2">
                        {(!sources.uploads || sources.uploads.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-border rounded-xl">No files uploaded.</p>
                        )}
                        {sources.uploads?.map((upload) => (
                          <div key={upload.id} className="flex justify-between items-center p-3 bg-muted/40 border border-border rounded-xl text-sm">
                            <div className="flex flex-col min-w-0 flex-1 mr-2">
                              <span className="truncate text-sm font-bold text-foreground">{upload.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{upload.fileType} Upload</span>
                            </div>
                            <button 
                              onClick={() => setSources(s => ({ ...s, uploads: s.uploads.filter(u => u.id !== upload.id) }))} 
                              className="p-1.5 hover:bg-red-500/20 rounded-md text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                 )}
              </div>

              <div className="mt-6 shrink-0 pt-4 border-t border-border">
                <Button onClick={() => setShowSourceModal(false)} className="w-full rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20">
                  Confirm Sources
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Question Source Attribution Modal ── */}
      <AnimatePresence>
        {showQuestionSourceDialog && selectedQuestionForSource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowQuestionSourceDialog(false);
                setSelectedQuestionForSource(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden text-foreground"
            >
              <div className="flex justify-between items-center pb-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-black tracking-tight">Question Source & Origin</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowQuestionSourceDialog(false);
                    setSelectedQuestionForSource(null);
                  }} 
                  className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-4">
                <div className="bg-primary/5 p-4 border border-primary/10 rounded-2xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Question</p>
                  <div className="text-sm font-bold text-foreground mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={quizOptionComponents}>
                      {selectedQuestionForSource.text}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">Source Type:</span>
                    <div className="mt-1">
                      <span className="px-3 py-1.5 rounded-full text-xs font-black bg-primary/10 text-primary capitalize tracking-wide">
                        {selectedQuestionForSource.sourceInfo?.sourceType || "internet"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-muted-foreground">Source Name:</span>
                    <p className="text-sm font-bold text-foreground mt-1.5 bg-muted/40 p-3.5 border border-border/50 rounded-2xl">
                      {selectedQuestionForSource.sourceInfo?.sourceName || "Internet Search (AI Fetching)"}
                    </p>
                  </div>

                  {selectedQuestionForSource.sourceInfo?.sourceType === "pdf" && selectedQuestionForSource.sourceInfo.page && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground">Page Number:</span>
                      <p className="text-sm font-bold text-foreground mt-1.5 bg-muted/40 px-3.5 py-2.5 border border-border/50 rounded-2xl">
                        Page {selectedQuestionForSource.sourceInfo.page}
                      </p>
                    </div>
                  )}

                  {selectedQuestionForSource.sourceInfo?.sourceType === "url" && selectedQuestionForSource.sourceInfo.page && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground">Section / Page:</span>
                      <p className="text-sm font-bold text-foreground mt-1.5 bg-muted/40 px-3.5 py-2.5 border border-border/50 rounded-2xl">
                        {selectedQuestionForSource.sourceInfo.page}
                      </p>
                    </div>
                  )}

                  {(selectedQuestionForSource.sourceInfo?.sourceType === "pdf" || selectedQuestionForSource.sourceInfo?.sourceType === "url") && selectedQuestionForSource.sourceInfo.questionNum && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground">Question Number / Label:</span>
                      <p className="text-sm font-bold text-foreground mt-1.5 bg-muted/40 px-3.5 py-2.5 border border-border/50 rounded-2xl">
                        {selectedQuestionForSource.sourceInfo.questionNum}
                      </p>
                    </div>
                  )}

                  {selectedQuestionForSource.sourceInfo?.sourceType === "video" && selectedQuestionForSource.sourceInfo.timestamp && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground">Video Timestamp:</span>
                      <p className="text-sm font-bold text-foreground mt-1.5 bg-muted/40 px-3.5 py-2.5 border border-border/50 rounded-2xl">
                        Timestamp: {selectedQuestionForSource.sourceInfo.timestamp}
                      </p>
                    </div>
                  )}

                  {selectedQuestionForSource.sourceInfo?.detail && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground">Sourced Context / Query:</span>
                      <p className="text-xs text-muted-foreground mt-1.5 bg-muted/40 p-3.5 border border-border/50 rounded-2xl leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedQuestionForSource.sourceInfo.detail}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border shrink-0">
                <Button 
                  onClick={() => {
                    setShowQuestionSourceDialog(false);
                    setSelectedQuestionForSource(null);
                  }} 
                  className="w-full rounded-xl h-12 text-sm font-bold shadow-md"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuizPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "quiz">("chat");

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative w-full text-foreground">
       <div className="flex justify-center p-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 z-10 relative">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
             <button 
               onClick={() => setActiveTab("chat")}
               className={cn("px-6 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2", activeTab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
             >
               <BrainCircuit className="h-4 w-4" /> AI Chat
             </button>
             <button 
               onClick={() => setActiveTab("quiz")}
               className={cn("px-6 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2", activeTab === "quiz" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
             >
               <Target className="h-4 w-4" /> AI Quizzes
             </button>
          </div>
       </div>
       
       <div className="flex-1 overflow-hidden relative">
          {activeTab === "chat" ? <AIChatInterface /> : <AIQuizInterface />}
       </div>
    </div>
  );
}
