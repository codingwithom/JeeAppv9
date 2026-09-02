import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Search, 
  Filter, 
  Calendar, 
  Layers, 
  Sparkles, 
  GraduationCap, 
  AlertCircle,
  FileQuestion,
  RotateCcw,
  Check,
  ChevronLeft,
  Bookmark,
  Share2,
  Atom,
  Clock,
  Award,
  X,
  ArrowRight,
  SlidersHorizontal
} from "lucide-react";
import { useAppContext, SelectedGoal } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RichMathContent } from "@/components/questions/RichMathContent";
import { QuestionInteractiveArea } from "@/components/questions/QuestionInteractiveArea";
import { useToast } from "@/hooks/use-toast";

// Inlined instant logos (0ms load time)
import { JEE_MAIN_LOGO, JEE_ADVANCED_LOGO } from "@/data/pyq/examIcons";

type Mode = "landing" | "paper_list" | "paper_practice" | "chapter_list" | "chapter_practice" | "search_practice";
type ExamType = "jee-main" | "jee-advanced";

function isFullyLoaded(q: any): boolean {
  if (!q) return false;
  return Boolean(
    (q.options && q.options.length > 0) ||
    q.type === "integer" ||
    (q.explanation && q.explanation.length > 0) ||
    (q.correct_options && q.correct_options.length > 0)
  );
}

function formatTopicName(str?: string): string {
  if (!str) return "";
  return str
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPaperTitle(titleOrKey?: string): string {
  if (!titleOrKey) return "JEE Past Year Paper";
  const str = String(titleOrKey).trim();
  if (str.includes(" | ")) {
    return str.split(" | ")[0].trim();
  }
  if (str.includes("-")) {
    return str
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return str;
}

// Universal helper that resolves data files from any path (dist/data, dist/data/pyq, root /data, etc.)
async function fetchStaticData(subPath: string): Promise<Response | null> {
  const cleanPath = subPath.startsWith("/") ? subPath.slice(1) : subPath;
  const candidates = [
    `/${cleanPath}`,
    `./${cleanPath}`,
    `/${cleanPath.replace(/^data\/pyq\//, "data/")}`,
    `./${cleanPath.replace(/^data\/pyq\//, "data/")}`,
    `/${cleanPath.replace(/^data\//, "data/pyq/")}`,
    `./${cleanPath.replace(/^data\//, "data/pyq/")}`
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch (e) {}
  }
  return null;
}

function scoreMatch(query: string, item: any): number {
  const cleanQ = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const cleanTarget = (item.text + " " + (item.paperTitle || "") + " " + (item.chapter || "")).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");

  if (cleanTarget.includes(cleanQ)) return 1000;

  const qWords = cleanQ.split(" ").filter(w => w.length > 1);
  if (qWords.length === 0) return 0;

  let nGramScore = 0;
  for (let i = 0; i <= qWords.length - 3; i++) {
    const chunk = qWords.slice(i, i + 3).join(" ");
    if (cleanTarget.includes(chunk)) {
      nGramScore += 15;
    }
  }

  let tokenMatches = 0;
  for (const w of qWords) {
    if (cleanTarget.includes(w)) tokenMatches++;
  }

  const tokenRatio = tokenMatches / qWords.length;
  if (tokenRatio < 0.25 && nGramScore === 0) return 0;

  return (tokenRatio * 100) + nGramScore;
}

export default function QuestionsPage() {
  const { selectedGoal, selectGoal, setGoalSelectionOpen, theme } = useAppContext();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("landing");
  const [selectedExam, setSelectedExam] = useState<ExamType>("jee-main");
  const [selectedSubject, setSelectedSubject] = useState<string>("physics");

  // Paper-wise state
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersData, setPapersData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [paperSearch, setPaperSearch] = useState<string>("");
  const [shiftFilter, setShiftFilter] = useState<"all" | "morning" | "evening">("all");
  
  // Paper practice state
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [paperQuestionsLoading, setPaperQuestionsLoading] = useState(false);
  const [paperSubjects, setPaperSubjects] = useState<any[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>("Physics");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [activeQuestionData, setActiveQuestionData] = useState<any>(null);
  const [questionDetailLoading, setQuestionDetailLoading] = useState<boolean>(false);

  // Chapter-wise state
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chapterGroups, setChapterGroups] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [chapterQuestionsLoading, setChapterQuestionsLoading] = useState(false);
  const [chapterQuestionGroups, setChapterQuestionGroups] = useState<any[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [currentChapterQIndex, setCurrentChapterQIndex] = useState<number>(0);

  // User Answer & Feedback State
  const [userSelectedOption, setUserSelectedOption] = useState<string | null>(null);
  const [selectedOptionsList, setSelectedOptionsList] = useState<string[]>([]);
  const [numericalInput, setNumericalInput] = useState<string>("");
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isSolutionVisible, setIsSolutionVisible] = useState<boolean>(false);

  // In-memory cache for loaded questions (0ms instant retrieval)
  const chapterQuestionsCacheRef = useRef<Map<string, any>>(new Map());

  // Global Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchSubject, setSearchSubject] = useState<string>("all");
  const [searchCategory, setSearchCategory] = useState<string>("all");
  const [searchExam, setSearchExam] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState<number>(0);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchIndexData, setSearchIndexData] = useState<any[] | null>(null);
  const [searchActiveResultIndex, setSearchActiveResultIndex] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Search Effect (Debounced query + smart fuzzy scoring + multi-filter support)
  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    const hasFilters = searchSubject !== "all" || searchCategory !== "all" || searchExam !== "all";

    if (!hasQuery && !hasFilters) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      let foundViaApi = false;
      try {
        const params = new URLSearchParams();
        if (hasQuery) params.set("q", searchQuery.trim());
        if (searchSubject !== "all") params.set("subject", searchSubject);
        if (searchCategory !== "all") params.set("category", searchCategory);
        if (searchExam !== "all") params.set("exam", searchExam);
        params.set("limit", "50");

        const res = await fetch(`/api/pyq/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setSearchTotal(data.total || 0);
          foundViaApi = true;
        }
      } catch (e) {}

      // Fallback to client-side local search (for 100% static hosting / offline builds)
      if (!foundViaApi) {
        try {
          let idxData = searchIndexData;
          if (!idxData) {
            const res = await fetchStaticData("data/pyq/search_index.json");
            if (res && res.ok) {
              idxData = await res.json();
              setSearchIndexData(idxData);
            }
          }

          if (idxData) {
            const subjFilter = searchSubject.toLowerCase();
            const catFilter = searchCategory.toLowerCase();
            const examFilter = searchExam.toLowerCase();

            const matches: any[] = [];
            for (const item of idxData) {
              if (subjFilter !== "all" && item.subject?.toLowerCase() !== subjFilter) continue;
              if (catFilter !== "all" && item.category?.toLowerCase() !== catFilter) continue;
              if (examFilter !== "all" && item.exam?.toLowerCase() !== examFilter) continue;

              if (!hasQuery) {
                matches.push({ item, score: 1 });
              } else {
                const score = scoreMatch(searchQuery, item);
                if (score > 0) {
                  matches.push({ item, score });
                }
              }
            }

            if (hasQuery) {
              matches.sort((a, b) => b.score - a.score);
            }

            setSearchTotal(matches.length);
            setSearchResults(matches.slice(0, 50).map(m => m.item));
          }
        } catch (err) {
          console.error(err);
        }
      }
      setSearchLoading(false);
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery, searchSubject, searchCategory, searchExam]);

  // Open search question in interactive attempt mode
  const openSearchResult = async (item: any, index: number) => {
    setSearchActiveResultIndex(index);
    setMode("search_practice");
    resetAnswerState();

    const normalizedCategory = item.category === "numerical" ? "integer" : item.category === "multiple_mcq" ? "mcqm" : "mcq";
    const preliminaryQ = {
      ...item,
      question_id: item.questionId || item.permalink || item.id,
      content: item.text,
      paperTitle: item.paperTitle,
      chapter: item.chapter,
      topic: item.chapter,
      subject: item.subject,
      type: normalizedCategory,
      options: [],
      correct_options: []
    };
    setActiveQuestionData(preliminaryQ);
    setQuestionDetailLoading(true);

    try {
      let fullQ: any = null;

      // 1. If question came from a paper, check local paper JSON
      if (item.paperKey && item.questionId) {
        try {
          const pRes = await fetchStaticData(`data/pyq/papers/${item.paperKey}.json`);
          if (pRes && pRes.ok) {
            const pData = await pRes.json();
            for (const sec of (pData.sections || [])) {
              const qIndex = (sec.questions || []).findIndex((x: any) => x.question_id === item.questionId);
              if (qIndex !== -1) {
                const matched = sec.questions[qIndex];
                const optList = matched.question?.en?.options || matched.options || [];
                const corList = matched.question?.en?.correct_options || matched.question?.en?.correctOptions || matched.correct_options || [];
                fullQ = {
                  ...matched,
                  questionNo: qIndex + 1,
                  content: matched.question?.en?.content || matched.content || item.text,
                  options: optList,
                  correct_options: corList,
                  explanation: matched.question?.en?.explanation || matched.explanation || "",
                  paperTitle: formatPaperTitle(item.paperTitle || matched.paperTitle || pData.title || item.paperKey),
                  subject: item.subject || matched.subject || sec.title?.toLowerCase(),
                  type: matched.type || (optList.length > 0 ? normalizedCategory : "integer")
                };
                break;
              }
            }
          }
        } catch(e) {}

        if (!fullQ) {
          try {
            const res = await fetch(`/api/pyq/paper-question?exam=${item.exam || "jee-main"}&paperKey=${encodeURIComponent(item.paperKey)}&questionId=${encodeURIComponent(item.questionId)}`);
            if (res.ok) {
              const data = await res.json();
              const matched = (data.questions || []).find((x: any) => x.question_id === item.questionId) || data.questions?.[0];
              if (matched) {
                const optList = matched.question?.en?.options || matched.options || [];
                const corList = matched.question?.en?.correct_options || matched.question?.en?.correctOptions || matched.correct_options || [];
                fullQ = {
                  ...matched,
                  content: matched.question?.en?.content || matched.content,
                  options: optList,
                  correct_options: corList,
                  explanation: matched.question?.en?.explanation || matched.explanation || "",
                  paperTitle: formatPaperTitle(item.paperTitle || matched.paperTitle || item.paperKey),
                  subject: item.subject || matched.subject,
                  type: matched.type || normalizedCategory
                };
              }
            }
          } catch(e) {}
        }
      }

      // 2. If question has permalink, try static local question file or API
      if (!fullQ && item.permalink) {
        try {
          const sRes = await fetchStaticData(`data/pyq/questions/${encodeURIComponent(item.permalink)}.json`);
          if (sRes && sRes.ok) {
            const sData = await sRes.json();
            const sq = sData.questions?.[0] || sData;
            if (sq) {
              const optList = sq.question?.en?.options || sq.options || [];
              const corList = sq.question?.en?.correct_options || sq.question?.en?.correctOptions || sq.correct_options || [];
              fullQ = {
                ...sq,
                content: sq.question?.en?.content || sq.content || item.text,
                options: optList,
                correct_options: corList,
                explanation: sq.question?.en?.explanation || sq.explanation || "",
                paperTitle: formatPaperTitle(item.paperTitle || sq.paperTitle || item.paperKey),
                subject: item.subject || sq.subject,
                type: sq.type || normalizedCategory
              };
            }
          }
        } catch (e) {}

        if (!fullQ) {
          try {
            const res = await fetch(`/api/pyq/question?permalink=${encodeURIComponent(item.permalink)}`);
            if (res.ok) {
              const data = await res.json();
              const sq = data.questions?.[0] || null;
              if (sq) {
                const optList = sq.question?.en?.options || sq.options || [];
                const corList = sq.question?.en?.correct_options || sq.question?.en?.correctOptions || sq.correct_options || [];
                fullQ = {
                  ...sq,
                  content: sq.question?.en?.content || sq.content || item.text,
                  options: optList,
                  correct_options: corList,
                  explanation: sq.question?.en?.explanation || sq.explanation || "",
                  paperTitle: formatPaperTitle(item.paperTitle || sq.paperTitle || item.paperKey),
                  subject: item.subject || sq.subject,
                  type: sq.type || normalizedCategory
                };
              }
            }
          } catch(e) {}
        }
      }

      if (fullQ) {
        setActiveQuestionData({
          ...fullQ,
          paperTitle: formatPaperTitle(item.paperTitle || fullQ.paperTitle || item.paperKey),
          subject: item.subject || fullQ.subject,
          type: fullQ.type || normalizedCategory
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionDetailLoading(false);
    }
  };

  const navigateSearchResult = (newIdx: number) => {
    if (newIdx >= 0 && newIdx < searchResults.length) {
      openSearchResult(searchResults[newIdx], newIdx);
    }
  };

  // Check if current goal is IIT-JEE 11th or 12th
  const goalCheck = useMemo(() => {
    if (!selectedGoal) return { isAllowed: false, reason: "no_goal" };
    const text = `${selectedGoal.category || ""} ${selectedGoal.displayName || ""} ${(selectedGoal.path || []).join(" ")}`.toLowerCase();
    const isJee = text.includes("jee") || text.includes("iit");
    if (!isJee) return { isAllowed: false, reason: "wrong_category" };

    // Check if 11th or 12th
    const isClass11or12 = text.includes("11") || text.includes("12") || text.includes("dropper") || !text.includes("class");
    if (!isClass11or12) return { isAllowed: false, reason: "wrong_class" };

    return { isAllowed: true, reason: "ok" };
  }, [selectedGoal]);

  // Reset answer states when question changes
  const resetAnswerState = () => {
    setUserSelectedOption(null);
    setSelectedOptionsList([]);
    setNumericalInput("");
    setIsChecked(false);
    setIsSolutionVisible(false);
  };

  // 1. Load Papers List (100% local, instant)
  const loadPapers = async (exam: ExamType) => {
    setSelectedExam(exam);
    setMode("paper_list");
    setShiftFilter("all");
    setSelectedYear("all");
    setPaperSearch("");
    setPapersLoading(true);

    try {
      const res = await fetchStaticData(`data/pyq/catalogs/${exam}-papers.json`);
      if (res && res.ok) {
        const localData = await res.json();
        if (localData && localData.papers && localData.papers.length > 0) {
          setPapersData(localData.papers);
          setPapersLoading(false);
          return;
        }
      }
    } catch (e) {}

    fetch(`/api/pyq/papers?exam=${exam}`)
      .then(res => res.json())
      .then(data => setPapersData(data.papers || []))
      .catch(() => {})
      .finally(() => setPapersLoading(false));
  };

  // 2. Open Paper for Practice (Uses local static pre-scraped paper file)
  const openPaperPractice = async (paper: any) => {
    setSelectedPaper(paper);
    setMode("paper_practice");
    setPaperQuestionsLoading(true);
    resetAnswerState();
    setCurrentQuestionIndex(0);
    setActiveSubjectTab("Physics");

    const exam = (paper.exam || selectedExam) as ExamType;

    try {
      let data: any = null;

      // 1. Check local static pre-scraped paper file first
      try {
        const localRes = await fetchStaticData(`data/pyq/papers/${paper.key}.json`);
        if (localRes && localRes.ok) {
          data = await localRes.json();
        }
      } catch (e) {}

      // 2. Fallback to API if not in static files yet
      if (!data) {
        try {
          const res = await fetch(`/api/pyq/paper-questions?exam=${exam}&paperKey=${encodeURIComponent(paper.key)}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {}
      }

      let sections: any[] = data?.sections || data?.questions || [];
      if (Array.isArray(sections) && sections.length > 0 && sections[0].question_id) {
        sections = [{ title: "Physics", questions: sections }];
      }
      setPaperSubjects(sections);

      // Find all questions in sections that mention "physics"
      const physicsSections = sections.filter((s: any) => 
        (s.title || "").toLowerCase().includes("physics")
      );
      let allPhysicsQuestions = physicsSections.flatMap((s: any) => s.questions || []);
      if (allPhysicsQuestions.length === 0 && sections.length > 0) {
        allPhysicsQuestions = sections[0].questions || [];
      }
      const firstQ = allPhysicsQuestions[0];

      if (firstQ) {
        if (isFullyLoaded(firstQ)) {
          setActiveQuestionData(firstQ);
        } else {
          loadQuestionDetail(paper.key, firstQ.question_id, exam);
        }
      } else {
        setActiveQuestionData(null);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Paper Loading", description: "Loading questions...", variant: "default" });
    } finally {
      setPaperQuestionsLoading(false);
    }
  };

  const prefetchAdjacentPaperQuestions = (centerIdx: number) => {
    if (!currentPaperQuestions || currentPaperQuestions.length === 0) return;
    const nextIdx = centerIdx + 1;
    if (nextIdx < currentPaperQuestions.length) {
      const item = currentPaperQuestions[nextIdx];
      if (item && !isFullyLoaded(item)) {
        const exam = selectedPaper?.exam || selectedExam;
        fetch(`/api/pyq/paper-question?exam=${exam}&paperKey=${encodeURIComponent(selectedPaper.key)}&questionId=${encodeURIComponent(item.question_id)}`)
          .then(r => (r.ok ? r.json() : null))
          .then(data => {
            const batch = data?.questions || [];
            if (batch.length > 0) {
              setPaperSubjects(prevSections =>
                prevSections.map((sec: any) => ({
                  ...sec,
                  questions: (sec.questions || []).map((existingQ: any) => {
                    const found = batch.find((b: any) => b.question_id === existingQ.question_id);
                    if (found) {
                      return {
                        ...existingQ,
                        ...found,
                        content: found.question?.en?.content || found.content || existingQ.content,
                        options: found.question?.en?.options || found.options || existingQ.options || [],
                        correct_options: found.question?.en?.correct_options || found.question?.en?.correctOptions || found.correct_options || existingQ.correct_options || [],
                        explanation: found.question?.en?.explanation || found.explanation || existingQ.explanation || ""
                      };
                    }
                    return existingQ;
                  })
                }))
              );
            }
          })
          .catch(() => {});
      }
    }
  };

  // Load detailed question data (options, correct answer, explanation)
  const loadQuestionDetail = async (paperKey: string, questionId: string, examOverride?: ExamType, fallbackQ?: any, targetIdx?: number) => {
    const currentIdx = targetIdx !== undefined ? targetIdx : currentQuestionIndex;
    const immediateQ = fallbackQ || currentPaperQuestions.find((item: any) => item.question_id === questionId);
    if (immediateQ) {
      const fullImmediate = {
        ...immediateQ,
        chapter: immediateQ.chapter || immediateQ.topic || `Question ${currentIdx + 1}`,
        topic: immediateQ.topic || immediateQ.chapter || "",
        content: immediateQ.question?.en?.content || immediateQ.content || "",
        options: immediateQ.question?.en?.options || immediateQ.options || [],
        correct_options: immediateQ.question?.en?.correct_options || immediateQ.question?.en?.correctOptions || immediateQ.correct_options || [],
        explanation: immediateQ.question?.en?.explanation || immediateQ.explanation || "",
        type: immediateQ.type || (immediateQ.options?.length > 0 ? "mcq" : "integer"),
        paperTitle: formatPaperTitle(immediateQ.paperTitle || selectedPaper?.title || paperKey)
      };
      setActiveQuestionData(fullImmediate);
      if (isFullyLoaded(fullImmediate)) {
        setQuestionDetailLoading(false);
        resetAnswerState();
        return;
      }
    }

    setQuestionDetailLoading(true);
    resetAnswerState();
    const exam = examOverride || selectedPaper?.exam || selectedExam;
    try {
      const res = await fetch(`/api/pyq/paper-question?exam=${exam}&paperKey=${encodeURIComponent(paperKey)}&questionId=${encodeURIComponent(questionId)}`);
      if (res.ok) {
        const data = await res.json();
        const batch = data.questions || [];
        // Match the exact question by question_id!
        const matchedQ = batch.find((item: any) => item.question_id === questionId) || batch[0] || null;
        if (matchedQ) {
          const normalizedQ = {
            ...matchedQ,
            content: matchedQ.question?.en?.content || matchedQ.content,
            options: matchedQ.question?.en?.options || matchedQ.options || [],
            correct_options: matchedQ.question?.en?.correct_options || matchedQ.question?.en?.correctOptions || matchedQ.correct_options || [],
            explanation: matchedQ.question?.en?.explanation || matchedQ.explanation || ""
          };
          setActiveQuestionData(normalizedQ);

          // Cache all questions in this batch into paperSubjects state
          setPaperSubjects(prevSections => {
            return prevSections.map((sec: any) => ({
              ...sec,
              questions: (sec.questions || []).map((existingQ: any) => {
                const found = batch.find((b: any) => b.question_id === existingQ.question_id);
                if (found) {
                  return {
                    ...existingQ,
                    ...found,
                    content: found.question?.en?.content || found.content || existingQ.content,
                    options: found.question?.en?.options || found.options || existingQ.options || [],
                    correct_options: found.question?.en?.correct_options || found.question?.en?.correctOptions || found.correct_options || existingQ.correct_options || [],
                    explanation: found.question?.en?.explanation || found.explanation || existingQ.explanation || ""
                  };
                }
                return existingQ;
              })
            }));
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionDetailLoading(false);
      prefetchAdjacentPaperQuestions(currentIdx);
    }
  };

  // 3. Load Chapters List (100% local, instant)
  const loadChapters = async (exam: ExamType, subject: string = "physics") => {
    setSelectedExam(exam);
    setSelectedSubject(subject);
    setMode("chapter_list");
    setChaptersLoading(true);

    try {
      const res = await fetchStaticData(`data/pyq/catalogs/${exam}-${subject}-chapters.json`);
      if (res && res.ok) {
        const localData = await res.json();
        if (localData && (localData.chapterGroups || localData.chapters)) {
          setChapterGroups(localData.chapterGroups || []);
          setAllChapters(localData.chapters || []);
          setChaptersLoading(false);
          return;
        }
      }
    } catch (e) {}

    fetch(`/api/pyq/chapters?exam=${exam}&subject=${subject}`)
      .then(res => res.json())
      .then(data => {
        setChapterGroups(data.chapterGroups || []);
        setAllChapters(data.chapters || []);
      })
      .catch(() => {})
      .finally(() => setChaptersLoading(false));
  };

  // 4. Open Chapter Questions
  const openChapterPractice = async (chapter: any) => {
    setSelectedChapter(chapter);
    setMode("chapter_practice");
    setChapterQuestionsLoading(true);
    setSelectedTypeFilter("all");
    setCurrentChapterQIndex(0);
    resetAnswerState();

    const subject = chapter.subject || selectedSubject || "physics";

    try {
      let data: any = null;
      try {
        const localRes = await fetchStaticData(`data/pyq/chapters/${selectedExam}_${chapter.key}.json`);
        if (localRes && localRes.ok) {
          data = await localRes.json();
        }
      } catch (e) {}

      if (!data) {
        const res = await fetch(`/api/pyq/chapter-questions?exam=${selectedExam}&subject=${subject}&chapterKey=${chapter.key}`);
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data) {
        setChapterQuestionGroups(data.questions || []);
        const allQList = (data.questions || []).flatMap((g: any) => g.questions || []);
        if (allQList.length > 0) {
          loadChapterQuestionDetail(allQList[0].permalink, allQList[0], 0);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading chapter questions", description: "Could not load questions.", variant: "destructive" });
    } finally {
      setChapterQuestionsLoading(false);
    }
  };

  const prefetchAdjacentChapterQuestions = (centerIdx: number) => {
    if (!chapterFlattenedQuestions || chapterFlattenedQuestions.length === 0) return;
    const targets = [centerIdx + 1, centerIdx + 2, centerIdx - 1];
    targets.forEach(i => {
      if (i >= 0 && i < chapterFlattenedQuestions.length) {
        const item = chapterFlattenedQuestions[i];
        if (item && item.permalink && !chapterQuestionsCacheRef.current.has(item.permalink)) {
          fetch(`/api/pyq/question?permalink=${encodeURIComponent(item.permalink)}`)
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
              const fullQ = data?.questions?.[0];
              if (fullQ) {
                chapterQuestionsCacheRef.current.set(item.permalink, fullQ);
              }
            })
            .catch(() => {});
        }
      }
    });
  };

  const loadChapterQuestionDetail = async (permalink: string, fallbackQ?: any, targetIdx?: number) => {
    if (!permalink) return;
    const currentIdx = targetIdx !== undefined ? targetIdx : currentChapterQIndex;

    // 1. If in cache, load in 0ms instantly!
    if (chapterQuestionsCacheRef.current.has(permalink)) {
      setActiveQuestionData(chapterQuestionsCacheRef.current.get(permalink));
      setQuestionDetailLoading(false);
      resetAnswerState();
      prefetchAdjacentChapterQuestions(currentIdx);
      return;
    }

    // 2. Set fallback question immediately with explicit type so there is ZERO category confusion!
    const immediateFallback = fallbackQ ? {
      ...fallbackQ,
      type: fallbackQ.type || (fallbackQ.groupKey === "integer" ? "integer" : fallbackQ.groupKey === "mcqm" ? "mcqm" : "mcq")
    } : null;
    setActiveQuestionData(immediateFallback);
    setQuestionDetailLoading(true);
    resetAnswerState();

    try {
      let q = null;
      // 3. Try loading static local question file first (works 100% offline & in static build without API)
      try {
        const staticRes = await fetchStaticData(`data/pyq/questions/${encodeURIComponent(permalink)}.json`);
        if (staticRes && staticRes.ok) {
          const sData = await staticRes.json();
          q = sData.questions?.[0] || sData;
        }
      } catch (e) {}

      // 4. Fallback to API if static file not available
      if (!q) {
        const res = await fetch(`/api/pyq/question?permalink=${encodeURIComponent(permalink)}`);
        if (res.ok) {
          const data = await res.json();
          q = data.questions?.[0] || null;
        }
      }

      if (q) {
        if (immediateFallback?.type && !q.type) {
          q.type = immediateFallback.type;
        }
        chapterQuestionsCacheRef.current.set(permalink, q);
        setActiveQuestionData(q);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionDetailLoading(false);
      prefetchAdjacentChapterQuestions(currentIdx);
    }
  };

  // Flattened questions for chapter practice
  const chapterFlattenedQuestions = useMemo(() => {
    if (!chapterQuestionGroups) return [];
    if (selectedTypeFilter === "all") {
      return chapterQuestionGroups.flatMap((g: any) =>
        (g.questions || []).map((q: any) => ({
          ...q,
          groupKey: g.key,
          groupTitle: g.title,
          type: q.type || (g.key === "integer" ? "integer" : g.key === "mcqm" ? "mcqm" : "mcq")
        }))
      );
    }
    const targetGroup = chapterQuestionGroups.find((g: any) => g.key === selectedTypeFilter);
    return targetGroup
      ? (targetGroup.questions || []).map((q: any) => ({
          ...q,
          groupKey: targetGroup.key,
          groupTitle: targetGroup.title,
          type: q.type || (targetGroup.key === "integer" ? "integer" : targetGroup.key === "mcqm" ? "mcqm" : "mcq")
        }))
      : [];
  }, [chapterQuestionGroups, selectedTypeFilter]);

  // Current questions list for paper practice (combines Section A, B, etc. for the subject)
  const currentPaperQuestions = useMemo(() => {
    if (!paperSubjects || paperSubjects.length === 0) return [];

    const tabLower = activeSubjectTab.toLowerCase();
    const matchingSections = paperSubjects.filter((s: any) => 
      (s.title || "").toLowerCase().includes(tabLower)
    );

    if (matchingSections.length > 0) {
      return matchingSections.flatMap((s: any) => s.questions || []);
    }

    const fallbackSec = paperSubjects.find((s: any) => (s.questions || []).length > 0);
    return fallbackSec ? fallbackSec.questions || [] : [];
  }, [paperSubjects, activeSubjectTab]);

  // Handle checking answer
  const handleCheckAnswer = () => {
    if (!userSelectedOption && !numericalInput) {
      toast({ title: "Select an option first", description: "Please pick an answer to check." });
      return;
    }
    setIsChecked(true);
    setIsSolutionVisible(true);
  };

  // ─── IF GOAL IS NOT IIT-JEE 11th or 12th ──────────────────────────────────
  if (!goalCheck.isAllowed) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 sm:p-8 bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-lg w-full bg-card border border-border/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
            <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5" /> Under Progress
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              we are Under Progress to uploads the Questions
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PYQs are currently available exclusively for <strong className="text-foreground">IIT-JEE (11th & 12th)</strong> students.
              Question banks for other streams and classes are actively being prepared and will be released shortly.
            </p>
          </div>

          {selectedGoal && (
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/60 text-xs font-medium text-muted-foreground">
              Current Selected Goal: <span className="font-bold text-foreground">{selectedGoal.displayName}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => {
                selectGoal({
                  category: "JEE",
                  path: ["JEE", "11th"],
                  displayName: "11th - IIT JEE"
                });
                toast({ title: "Goal updated to IIT-JEE 11th", description: "You can now practice all IIT-JEE PYQs!" });
              }}
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5 shadow-md shadow-primary/20"
            >
              Switch to IIT-JEE (11th)
            </Button>
            <Button
              variant="outline"
              onClick={() => setGoalSelectionOpen(true)}
              className="flex-1 rounded-xl font-medium py-5"
            >
              Choose Goal
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── 1. LANDING VIEW (Matches JEE img.png + Search System) ───────────────────
  if (mode === "landing") {
    const isSearchActive = Boolean(
      searchQuery.trim().length > 0 ||
      searchSubject !== "all" ||
      searchCategory !== "all" ||
      searchExam !== "all"
    );

    return (
      <div className="min-h-full p-4 sm:p-8 md:p-10 max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Joint Entrance Examination
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice Previous Years Questions with detailed explanations, inline mathematical formulas, and step-by-step solutions.
          </p>
        </div>

        {/* ── GLOBAL SEARCH & ADVANCED FILTER TOGGLE BAR ─────────────────────── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 21,000+ PYQs by question, paper date (e.g. '2026 8th April', '2025 morning'), subject..."
                className="pl-12 pr-10 py-6 text-sm sm:text-base rounded-2xl bg-muted/40 border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Advanced Filters Toggle Button */}
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={`h-[52px] px-3.5 sm:px-4 rounded-2xl border transition-all flex items-center gap-2 text-xs font-semibold shrink-0 ${
                isFilterOpen || (searchSubject !== "all" || searchCategory !== "all" || searchExam !== "all")
                  ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90"
                  : "bg-card hover:bg-muted border-border/80 text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle Advanced Filters (Subject, Exam, Category)"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(searchSubject !== "all" || searchCategory !== "all" || searchExam !== "all") && (
                <span className="w-2 h-2 rounded-full bg-amber-300" />
              )}
            </Button>
          </div>

          {/* Collapsible Advanced Filters (Hidden/Off by default) */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
                  {/* Subject Filters */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
                    <span className="px-2 font-bold text-[11px] text-muted-foreground">Subject:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "physics", label: "Physics" },
                      { id: "chemistry", label: "Chemistry" },
                      { id: "mathematics", label: "Maths" }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSearchSubject(s.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          searchSubject === s.id
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Category Filters */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
                    <span className="px-2 font-bold text-[11px] text-muted-foreground">Category:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "mcq", label: "MCQ" },
                      { id: "multiple_mcq", label: "Multiple MCQ" },
                      { id: "numerical", label: "Integer / Numerical" }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSearchCategory(c.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          searchCategory === c.id
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Exam Filters */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
                    <span className="px-2 font-bold text-[11px] text-muted-foreground">Exam:</span>
                    {[
                      { id: "all", label: "All" },
                      { id: "jee-main", label: "JEE Main" },
                      { id: "jee-advanced", label: "JEE Adv" }
                    ].map(e => (
                      <button
                        key={e.id}
                        onClick={() => setSearchExam(e.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          searchExam === e.id
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>

                  {/* Reset Filters */}
                  {(searchSubject !== "all" || searchCategory !== "all" || searchExam !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchSubject("all");
                        setSearchCategory("all");
                        setSearchExam("all");
                      }}
                      className="h-7 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SEARCH RESULTS PANEL (When user types or selects filters) ──────── */}
        {isSearchActive ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-base text-foreground">Search Results</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {searchTotal} questions found
                </span>
              </div>
              {searchLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Searching PYQs...</span>
                </div>
              )}
            </div>

            {searchResults.length === 0 && !searchLoading ? (
              <div className="p-10 rounded-2xl border border-dashed border-border text-center space-y-2 bg-card/40">
                <FileQuestion className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                <h4 className="text-sm font-semibold text-foreground">No questions found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your search terms, changing the subject, or choosing "All" categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {searchResults.map((item: any, idx: number) => (
                  <motion.div
                    key={item.permalink || idx}
                    whileHover={{ y: -2 }}
                    onClick={() => openSearchResult(item, idx)}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.subject === "physics"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : item.subject === "chemistry"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}>
                          {item.subject}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.category === "multiple_mcq"
                            ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            : item.category === "numerical"
                            ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20"
                            : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                        }`}>
                          {item.category === "multiple_mcq" ? "Multiple MCQ" : item.category === "numerical" ? "Numerical / Integer" : "MCQ"}
                        </span>

                        <span className="text-xs text-muted-foreground truncate font-medium">
                          {item.paperTitle}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0">
                        Attempt Question <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground line-clamp-2 leading-relaxed font-normal">
                      {item.text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="truncate">Topic: <strong className="text-foreground">{formatTopicName(item.chapter)}</strong></span>
                      <span className="capitalize font-medium">{item.exam?.replace("-", " ")}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── QUICK SUGGESTION TAGS & MAIN CARDS WHEN NOT SEARCHING ────────── */
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Popular Searches:</span>
              {[
                "2026 8th April",
                "2025 morning shift",
                "blast furnace",
                "Rotational Motion",
                "Quadratic Equations",
                "Thermodynamics"
              ].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-3 py-1 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Two Main Cards Grid (Matching JEE img.png) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: JEE Main */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-border/60 bg-white p-1 flex items-center justify-center shadow-xs">
                    <img 
                      src={JEE_MAIN_LOGO} 
                      alt="JEE Main" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      JEE Main
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Previous Years Questions with Solutions
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => loadPapers("jee-main")}
                    className="py-6 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-sm transition-all"
                  >
                    Paper Wise
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadChapters("jee-main")}
                    className="py-6 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-sm transition-all"
                  >
                    Chapter Wise
                  </Button>
                </div>
              </motion.div>

              {/* Card 2: JEE Advanced */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-border/60 bg-white p-1 flex items-center justify-center shadow-xs">
                    <img 
                      src={JEE_ADVANCED_LOGO} 
                      alt="JEE Advanced" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      JEE Advanced
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Previous Years Questions with Solutions
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => loadPapers("jee-advanced")}
                    className="py-6 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-sm transition-all"
                  >
                    Paper Wise
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadChapters("jee-advanced")}
                    className="py-6 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-sm transition-all"
                  >
                    Chapter Wise
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <Atom className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Physics First</h4>
              <p className="text-xs text-muted-foreground">Comprehensive Physics questions across all shifts & papers.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Instant Answer Check</h4>
              <p className="text-xs text-muted-foreground">Select an option and get immediate verification with score calculation.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Step-by-Step Solutions</h4>
              <p className="text-xs text-muted-foreground">Full mathematical derivations, diagrams, and explanations.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. PAPER-WISE LIST VIEW (Matches pw_001.png) ───────────────────────────
  if (mode === "paper_list") {
    const years = ["all", ...new Set(papersData.map((g: any) => String(g.title)))];
    const totalPapersCount = papersData.reduce((acc: number, g: any) => acc + (g.papers?.length || 0), 0);

    const filteredGroups = papersData.filter((group: any) => {
      if (selectedYear !== "all" && String(group.title) !== selectedYear) return false;
      return true;
    }).map((group: any) => ({
      ...group,
      papers: (group.papers || []).filter((p: any) => {
        const titleLower = p.title.toLowerCase();
        if (shiftFilter === "morning" && !titleLower.includes("morning")) return false;
        if (shiftFilter === "evening" && !titleLower.includes("evening")) return false;
        if (!paperSearch.trim()) return true;
        return titleLower.includes(paperSearch.toLowerCase());
      })
    })).filter((group: any) => group.papers.length > 0);

    return (
      <div className="min-h-full p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("landing")}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="cursor-pointer hover:underline" onClick={() => setMode("landing")}>Questions</span>
                <span>/</span>
                <span className="capitalize">{selectedExam.replace("-", " ")}</span>
                <span>/</span>
                <span>Paper Wise</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {selectedExam === "jee-main" ? "JEE Main" : "JEE Advanced"} Papers
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Exam Toggle between JEE Main & JEE Advanced */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60">
              <button
                onClick={() => loadPapers("jee-main")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedExam === "jee-main"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <img src={JEE_MAIN_LOGO} alt="JEE Main" className="w-4 h-4 object-contain" />
                JEE Main
              </button>
              <button
                onClick={() => loadPapers("jee-advanced")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedExam === "jee-advanced"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <img src={JEE_ADVANCED_LOGO} alt="JEE Advanced" className="w-4 h-4 object-contain" />
                JEE Advanced
              </button>
            </div>

            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shift (e.g. 8th April)..."
                value={paperSearch}
                onChange={(e) => setPaperSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-card border-border/80 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filters bar: Shift Filters & Year Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/60">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
              Shift:
            </span>
            <button
              onClick={() => setShiftFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                shiftFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Shifts
            </button>
            <button
              onClick={() => setShiftFilter("morning")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                shiftFilter === "morning"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              ☀️ Morning (9 AM)
            </button>
            <button
              onClick={() => setShiftFilter("evening")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                shiftFilter === "evening"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              🌙 Evening (3 PM)
            </button>
          </div>

          <span className="text-xs text-muted-foreground font-medium px-2">
            Total <strong className="text-foreground">{totalPapersCount}</strong> papers available
          </span>
        </div>

        {/* Year Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedYear === y
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {y === "all" ? "All Years" : y}
            </button>
          ))}
        </div>

        {/* Papers Grouped by Year */}
        {papersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading papers catalog...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-border/60 p-8">
            <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="font-semibold text-foreground text-base">No papers match your search/filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try switching years or resetting the shift filter.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedYear("all");
                setShiftFilter("all");
                setPaperSearch("");
              }}
              className="mt-4 rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map((group: any) => (
              <div key={group.title} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    {group.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {group.papers?.length} papers / shifts
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.papers.map((paper: any) => {
                    const isMorning = paper.title.toLowerCase().includes("morning");
                    const isEvening = paper.title.toLowerCase().includes("evening");

                    return (
                      <Card
                        key={paper.key}
                        className="p-5 rounded-2xl border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-base text-foreground leading-snug">
                              {paper.title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isMorning && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                ☀️ Morning Shift (9:00 AM)
                              </span>
                            )}
                            {isEvening && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                🌙 Evening Shift (3:00 PM)
                              </span>
                            )}
                            {paper.date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                {new Date(paper.date).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              English
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Hindi
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => openPaperPractice(paper)}
                          variant="outline"
                          className="w-full rounded-xl border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs py-5 transition-all shadow-xs"
                        >
                          Practice Questions
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── 3. PAPER PRACTICE VIEW (Matches pw_004.png, pw_007.png, pw_010.png) ────
  if (mode === "paper_practice") {
    const activeQFromList = currentPaperQuestions[currentQuestionIndex];
    const qBody = activeQuestionData?.question?.en?.content || activeQuestionData?.content || activeQFromList?.content || "";
    const options = activeQuestionData?.question?.en?.options || activeQuestionData?.options || activeQFromList?.options || [];
    const correctOptions = activeQuestionData?.question?.en?.correct_options || activeQuestionData?.question?.en?.correctOptions || activeQuestionData?.correct_options || activeQFromList?.correct_options || [];
    const explanation = activeQuestionData?.question?.en?.explanation || activeQuestionData?.explanation || activeQFromList?.explanation || "";
    const marks = activeQuestionData?.marks || activeQFromList?.marks || 4;
    const negMarks = activeQuestionData?.negMarks !== undefined ? activeQuestionData.negMarks : (activeQFromList?.negMarks !== undefined ? activeQFromList.negMarks : 1);
    const qType = (activeQuestionData?.type || activeQFromList?.type) === "integer" ? "Numerical" : "MCQ (Single Correct Answer)";

    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between gap-4 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("paper_list")}
              className="rounded-full shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {selectedPaper?.title}
              </h2>
              <p className="text-[11px] text-muted-foreground capitalize">
                {selectedExam.replace("-", " ")} Practice
              </p>
            </div>
          </div>

          {/* Subject Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
            {["Physics", "Chemistry", "Mathematics"].map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setActiveSubjectTab(sub);
                  setCurrentQuestionIndex(0);
                  resetAnswerState();
                  const tabLower = sub.toLowerCase();
                  const matching = paperSubjects.filter((s: any) => (s.title || "").toLowerCase().includes(tabLower));
                  const subQuestions = matching.flatMap((s: any) => s.questions || []);
                  if (subQuestions.length > 0) {
                    const firstQ = subQuestions[0];
                    if (isFullyLoaded(firstQ)) {
                      setActiveQuestionData(firstQ);
                    } else {
                      loadQuestionDetail(selectedPaper.key, firstQ.question_id, selectedPaper.exam, firstQ, 0);
                    }
                  } else {
                    setActiveQuestionData(null);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeSubjectTab === sub
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area: Left Sidebar (Question list) + Right (Question details) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Question Navigator */}
          <div className="w-64 sm:w-80 border-r border-border/80 bg-card/40 flex flex-col shrink-0 overflow-hidden hidden md:flex">
            <div className="p-3.5 border-b border-border/60 font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>{activeSubjectTab} Questions</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-[10px] text-foreground font-bold">
                {currentPaperQuestions.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {currentPaperQuestions.map((q: any, idx: number) => {
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.question_id || idx}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      resetAnswerState();
                      if (isFullyLoaded(q)) {
                        setActiveQuestionData(q);
                      } else {
                        loadQuestionDetail(selectedPaper.key, q.question_id, selectedPaper.exam, q, idx);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all text-xs ${
                      isCurrent
                        ? "bg-primary/10 border border-primary/40 text-foreground font-semibold shadow-xs"
                        : "hover:bg-muted/60 text-muted-foreground border border-transparent"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {formatTopicName(q.topic || q.chapter) || `Question ${idx + 1}`}
                        </span>
                        {q.type && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground shrink-0 font-medium">
                            {q.type === "integer" ? "NUM" : "MCQ"}
                          </span>
                        )}
                      </div>
                      <div className="line-clamp-2 leading-relaxed text-muted-foreground text-[11px]" dangerouslySetInnerHTML={{
                        __html: (q.content || `Question ${idx + 1}`).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90)
                      }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Question Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between space-y-6">
            {currentPaperQuestions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 my-auto">
                <div className="max-w-md text-center space-y-4 p-8 bg-card border border-border/80 rounded-2xl shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Paper Offline Pack</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Questions for <strong>{selectedPaper?.title || "this paper"}</strong> are not currently present in your offline data folder.
                    You can copy the paper JSON into <code>dist/data/pyq/papers/</code> or select one of the available papers from the list.
                  </p>
                  <Button onClick={() => setMode("paper_list")} variant="outline" className="rounded-xl text-xs">
                    Back to Papers List
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl w-full mx-auto space-y-6">
                {/* Previous / Next top bar */}
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => {
                      const prevIdx = currentQuestionIndex - 1;
                      setCurrentQuestionIndex(prevIdx);
                      resetAnswerState();
                      const q = currentPaperQuestions[prevIdx];
                      if (isFullyLoaded(q)) {
                        setActiveQuestionData(q);
                      } else if (q) {
                        loadQuestionDetail(selectedPaper.key, q.question_id, selectedPaper.exam, q, prevIdx);
                      }
                    }}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    disabled={currentQuestionIndex >= currentPaperQuestions.length - 1}
                    onClick={() => {
                      const nextIdx = currentQuestionIndex + 1;
                      setCurrentQuestionIndex(nextIdx);
                      resetAnswerState();
                      const q = currentPaperQuestions[nextIdx];
                      if (isFullyLoaded(q)) {
                        setActiveQuestionData(q);
                      } else if (q) {
                        loadQuestionDetail(selectedPaper.key, q.question_id, selectedPaper.exam, q, nextIdx);
                      }
                    }}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Question Card */}
                <div className="space-y-6 bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                  {/* Question Header & Context */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-extrabold text-sm shadow-xs">
                        Q{currentQuestionIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="truncate">
                            {formatTopicName(activeQuestionData?.topic || activeQuestionData?.chapter || currentPaperQuestions[currentQuestionIndex]?.topic || currentPaperQuestions[currentQuestionIndex]?.chapter) || `Question ${currentQuestionIndex + 1}`}
                          </span>
                          {activeQuestionData?.subject && (
                            <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                              {activeQuestionData.subject}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                          {selectedPaper?.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  <QuestionInteractiveArea
                    question={activeQuestionData || currentPaperQuestions[currentQuestionIndex]}
                    userSelectedOption={userSelectedOption}
                    selectedOptionsList={selectedOptionsList}
                    numericalInput={numericalInput}
                    isChecked={isChecked}
                    isSolutionVisible={isSolutionVisible}
                    isLoading={questionDetailLoading}
                    onSelectOption={(id) => setUserSelectedOption(id)}
                    onToggleMultiOption={(id) => setSelectedOptionsList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onChangeNumerical={(val) => setNumericalInput(val)}
                    onCheckAnswer={() => setIsChecked(true)}
                    onToggleSolution={() => setIsSolutionVisible(!isSolutionVisible)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. CHAPTER-WISE CATALOG (Matches cw_001.png) ───────────────────────────
  if (mode === "chapter_list") {
    return (
      <div className="min-h-full p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("landing")}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="cursor-pointer hover:underline" onClick={() => setMode("landing")}>Questions</span>
                <span>/</span>
                <span className="capitalize">{selectedExam.replace("-", " ")}</span>
                <span>/</span>
                <span className="capitalize">{selectedSubject}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground capitalize">
                {selectedSubject} Chapters
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Subject Selector Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
              {[
                { id: "physics", label: "Physics" },
                { id: "chemistry", label: "Chemistry" },
                { id: "mathematics", label: "Mathematics" }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    loadChapters(selectedExam, sub.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedSubject === sub.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {allChapters.length} Chapters
            </span>
          </div>
        </div>

        {/* Chapter Groups & Chapters Grid */}
        {chaptersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium capitalize">Loading {selectedSubject} chapters...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {chapterGroups.map((group: any) => {
              const groupChapters = allChapters.filter((c: any) => c.chapterGroup === group.key);
              if (groupChapters.length === 0) return null;

              return (
                <div key={group.key} className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {group.title || group.name || group.key}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {groupChapters.map((ch: any) => {
                      const count = ch.pyq?.count?.total || ch.pyq?.count || ch.questionsCount || 0;
                      return (
                        <Card
                          key={ch.key}
                          onClick={() => openChapterPractice(ch)}
                          className="p-5 rounded-2xl border-border/80 bg-card hover:border-primary/50 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                              {ch.title}
                            </h4>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                            <span className="px-2 py-0.5 rounded bg-muted font-bold text-foreground">
                              {typeof count === "object" ? count.total || "40+" : count} questions
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── 5. CHAPTER PRACTICE VIEW (Matches cw_002.png, cw_004.png, cw_006.png) ──
  if (mode === "chapter_practice") {
    const activeQ = chapterFlattenedQuestions[currentChapterQIndex] || null;
    const qBody = activeQuestionData?.question?.en?.content || activeQuestionData?.content || activeQ?.question?.en?.content || activeQ?.content || "";
    const options = activeQuestionData?.question?.en?.options || activeQuestionData?.options || activeQ?.question?.en?.options || activeQ?.options || [];
    const correctOptions = activeQuestionData?.question?.en?.correct_options || activeQuestionData?.question?.en?.correctOptions || activeQuestionData?.correct_options || activeQ?.question?.en?.correct_options || activeQ?.correct_options || [];
    const explanation = activeQuestionData?.question?.en?.explanation || activeQuestionData?.explanation || activeQ?.question?.en?.explanation || activeQ?.explanation || "";
    const paperBadge = formatPaperTitle(activeQuestionData?.paperTitle || activeQ?.paperTitle || activeQuestionData?.year || activeQ?.year || "IIT-JEE");
    const marks = activeQuestionData?.marks || activeQ?.marks || 4;
    const negMarks = activeQuestionData?.negMarks !== undefined ? activeQuestionData.negMarks : (activeQ?.negMarks !== undefined ? activeQ.negMarks : 1);

    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between gap-4 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("chapter_list")}
              className="rounded-full shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {selectedChapter?.title}
              </h2>
              <p className="text-[11px] text-muted-foreground capitalize">
                {selectedExam.replace("-", " ")} {selectedSubject} • {chapterFlattenedQuestions.length} Questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("chapter_list")}
              className="rounded-xl text-xs"
            >
              Switch Chapter
            </Button>
          </div>
        </div>

        {/* Content Area: Left Filter Sidebar + Right Question View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Question Types & Question Navigator */}
          <div className="w-64 sm:w-80 border-r border-border/80 bg-card/40 flex flex-col shrink-0 overflow-hidden hidden md:flex">
            {/* Question Type Filter Tabs */}
            <div className="p-3 border-b border-border/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block px-1">
                Question Types
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedTypeFilter("all");
                    setCurrentChapterQIndex(0);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all ${
                    selectedTypeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  All Questions
                </button>
                {chapterQuestionGroups.map((g: any) => (
                  <button
                    key={g.key}
                    onClick={() => {
                      setSelectedTypeFilter(g.key);
                      setCurrentChapterQIndex(0);
                      const qList = g.questions || [];
                      if (qList.length > 0) {
                        loadChapterQuestionDetail(qList[0].permalink);
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all flex items-center justify-between ${
                      selectedTypeFilter === g.key
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{g.title}</span>
                    <span className="text-[10px] opacity-70 font-mono">({g.questions?.length || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chapterFlattenedQuestions.map((q: any, idx: number) => {
                const isCurrent = idx === currentChapterQIndex;
                return (
                  <button
                    key={q.permalink || idx}
                    onClick={() => {
                      setCurrentChapterQIndex(idx);
                      resetAnswerState();
                      loadChapterQuestionDetail(q.permalink, q, idx);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all text-xs ${
                      isCurrent
                        ? "bg-primary/10 border border-primary/40 text-foreground font-semibold shadow-xs"
                        : "hover:bg-muted/60 text-muted-foreground border border-transparent"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-[10px] text-primary block truncate font-medium">
                        {q.paperTitle || "IIT-JEE"}
                      </span>
                      <div className="line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{
                        __html: (q.question?.en?.content || `Question ${idx + 1}`).replace(/<[^>]+>/g, " ").slice(0, 80)
                      }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Question Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="max-w-3xl w-full mx-auto space-y-6">
              {/* Previous / Next buttons */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentChapterQIndex === 0}
                  onClick={() => {
                    const prevIdx = currentChapterQIndex - 1;
                    setCurrentChapterQIndex(prevIdx);
                    resetAnswerState();
                    const targetQ = chapterFlattenedQuestions[prevIdx];
                    if (targetQ) {
                      loadChapterQuestionDetail(targetQ.permalink, targetQ, prevIdx);
                    }
                  }}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  disabled={currentChapterQIndex >= chapterFlattenedQuestions.length - 1}
                  onClick={() => {
                    const nextIdx = currentChapterQIndex + 1;
                    setCurrentChapterQIndex(nextIdx);
                    resetAnswerState();
                    const targetQ = chapterFlattenedQuestions[nextIdx];
                    if (targetQ) {
                      loadChapterQuestionDetail(targetQ.permalink, targetQ, nextIdx);
                    }
                  }}
                  className="rounded-xl text-xs gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Question Card */}
              <div className="space-y-6 bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs">
                {/* Question Header & Context */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-extrabold text-sm shadow-xs">
                      Q{currentChapterQIndex + 1}
                    </span>
                    <span className="text-xs font-semibold text-foreground px-2.5 py-0.5 rounded-full bg-muted border border-border/60">
                      {paperBadge}
                    </span>
                  </div>
                </div>

                <QuestionInteractiveArea
                  question={activeQuestionData || activeQ}
                  userSelectedOption={userSelectedOption}
                  selectedOptionsList={selectedOptionsList}
                  numericalInput={numericalInput}
                  isChecked={isChecked}
                  isSolutionVisible={isSolutionVisible}
                  isLoading={questionDetailLoading}
                  onSelectOption={(id) => setUserSelectedOption(id)}
                  onToggleMultiOption={(id) => setSelectedOptionsList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onChangeNumerical={(val) => setNumericalInput(val)}
                  onCheckAnswer={() => setIsChecked(true)}
                  onToggleSolution={() => setIsSolutionVisible(!isSolutionVisible)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 6. SEARCH PRACTICE VIEW (Attempt any question found via search) ────────
  if (mode === "search_practice") {
    const activeItem = searchResults[searchActiveResultIndex] || null;
    const paperBadge = formatPaperTitle(activeQuestionData?.paperTitle || activeItem?.paperTitle || activeQuestionData?.year || activeItem?.year || "JEE Examination");

    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-border/80 flex items-center justify-between gap-4 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setMode("landing");
                resetAnswerState();
              }}
              className="rounded-full hover:bg-muted shrink-0"
              title="Back to Search Results"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground truncate">
                <span className="cursor-pointer hover:underline text-primary" onClick={() => setMode("landing")}>
                  Search Results
                </span>
                <span>/</span>
                <span className="capitalize">{activeQuestionData?.subject || activeItem?.subject || "Question"}</span>
                <span>/</span>
                <span className="capitalize">{formatTopicName(activeQuestionData?.chapter || activeItem?.chapter)}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                {paperBadge}
              </h2>
            </div>
          </div>

          {/* Navigation Controls between search results */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline-block">
              Result {searchActiveResultIndex + 1} of {searchResults.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={searchActiveResultIndex <= 0}
              onClick={() => navigateSearchResult(searchActiveResultIndex - 1)}
              className="rounded-xl text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={searchActiveResultIndex >= searchResults.length - 1}
              onClick={() => navigateSearchResult(searchActiveResultIndex + 1)}
              className="rounded-xl text-xs gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Question & Interactive Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div className="max-w-3xl w-full space-y-6">
            <div className="space-y-6 bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-extrabold text-sm shadow-xs">
                    {activeQuestionData?.questionNo ? `Q${activeQuestionData.questionNo}` : `#${searchActiveResultIndex + 1}`}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{formatTopicName(activeQuestionData?.chapter || activeItem?.chapter)}</span>
                      {activeQuestionData?.subject && (
                        <span className={`capitalize text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          activeQuestionData.subject === "physics"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : activeQuestionData.subject === "chemistry"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}>
                          {activeQuestionData.subject}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {paperBadge}
                    </div>
                  </div>
                </div>
              </div>

              <QuestionInteractiveArea
                question={activeQuestionData}
                userSelectedOption={userSelectedOption}
                selectedOptionsList={selectedOptionsList}
                numericalInput={numericalInput}
                isChecked={isChecked}
                isSolutionVisible={isSolutionVisible}
                isLoading={questionDetailLoading}
                onSelectOption={(id) => setUserSelectedOption(id)}
                onToggleMultiOption={(id) => {
                  setSelectedOptionsList(prev => 
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  );
                }}
                onChangeNumerical={(val) => setNumericalInput(val)}
                onCheckAnswer={handleCheckAnswer}
                onToggleSolution={() => setIsSolutionVisible(v => !v)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
