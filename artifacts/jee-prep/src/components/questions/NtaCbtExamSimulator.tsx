import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ArrowLeft,
  FileText,
  Sparkles,
  Info,
  Check,
  X,
  Trash2,
  History,
  Zap,
  BarChart3,
  Timer,
  Trophy,
  Eye,
  Target,
  BrainCircuit,
  MoreVertical,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext, SelectedGoal } from "@/context/AppContext";
import { RichMathContent } from "./RichMathContent";
import { cn } from "@/lib/utils";
import {
  GeneratedCbtPaper,
  GeneratedCbtQuestion,
  GeneratedCbtSection,
  CbtTestHistoryRecord,
  CbtQuestionTimeLog,
  getCountdownTargetYear,
  generateRandomPredictivePaper,
  saveCbtTestResult,
  getCbtTestHistory,
  deleteCbtTestRecord
} from "@/lib/cbtPaperGenerator";

// ─── CBT ELIGIBILITY HELPER ─────────────────────────────────────────────────
export function isCbtEligible(selectedGoal: SelectedGoal | null | undefined): boolean {
  if (!selectedGoal) return false;
  const category = (selectedGoal.category || "").toLowerCase();
  const displayName = (selectedGoal.displayName || "").toLowerCase();
  const pathStr = (selectedGoal.path || []).join(" ").toLowerCase();
  const full = `${category} ${displayName} ${pathStr}`;

  const isJee = full.includes("jee") || full.includes("iit");
  if (!isJee) return false;

  const isTargetClass = full.includes("11") || full.includes("12") || full.includes("drop");
  return isTargetClass;
}

export type QuestionStatus =
  | "not_visited"
  | "not_answered"
  | "answered"
  | "marked_review"
  | "answered_marked_review";

interface NtaCbtExamSimulatorProps {
  onExit: () => void;
  initialExam?: "jee-main" | "jee-advanced";
}

export function NtaCbtExamSimulator({ onExit, initialExam = "jee-main" }: NtaCbtExamSimulatorProps) {
  const { user, selectedGoal, setGoalSelectionOpen } = useAppContext();

  // Guard: Only for 11th, 12th, or Dropper IIT-JEE
  const isEligible = useMemo(() => isCbtEligible(selectedGoal), [selectedGoal]);

  // Target Year predicted from countdown data (e.g. 2028 for 11th, 2027 for 12th, 2026 for dropper)
  const targetExamYear = useMemo(() => getCountdownTargetYear(), []);

  // Phases: "select" | "instructions" | "exam" | "results"
  const [phase, setPhase] = useState<"select" | "instructions" | "exam" | "results">("select");
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"new_test" | "history">("new_test");
  const [chosenExam, setChosenExam] = useState<"jee-main" | "jee-advanced">(initialExam);

  // Active paper data
  const [paperData, setPaperData] = useState<GeneratedCbtPaper | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructionsAgreed, setInstructionsAgreed] = useState(false);

  // Navigation inside exam / review
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);

  // User responses: map questionKey -> selectedOption (A, B, C, D) or numerical string
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  // Question statuses: map questionKey -> QuestionStatus
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});

  // Timer & Per-Question Time Tracking
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  // Time spent per question in seconds
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});

  // Modals & Fullscreen
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showQuestionMetaModal, setShowQuestionMetaModal] = useState(false);
  const [selectedMetaQuestion, setSelectedMetaQuestion] = useState<GeneratedCbtQuestion | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Result filter, History & Collapsible Solutions
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "incorrect" | "unattempted">("all");
  const [testHistory, setTestHistory] = useState<CbtTestHistoryRecord[]>(() => getCbtTestHistory());
  const [latestResultRecord, setLatestResultRecord] = useState<CbtTestHistoryRecord | null>(null);
  const [expandedSolutionKeys, setExpandedSolutionKeys] = useState<Record<string, boolean>>({});

  // Active question pointers
  const currentSection = paperData?.sections[activeSectionIndex];
  const currentQuestion = currentSection?.questions[activeQuestionIndex];

  // All questions flattened
  const allQuestions = useMemo(() => {
    if (!paperData) return [];
    return paperData.sections.flatMap(s => s.questions);
  }, [paperData]);

  // Request Fullscreen helper
  const enterFullscreen = () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    } catch (e) {}
  };

  // Exit Fullscreen helper
  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    } catch (e) {}
  };

  // Per-Second Timer & Per-Question Time Tracking
  useEffect(() => {
    if (phase !== "exam" || reviewMode || !isTimerRunning) return;

    const interval = setInterval(() => {
      // Decrement test time
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });

      // Increment active question time
      if (currentQuestion) {
        setQuestionTimeSpent(prev => ({
          ...prev,
          [currentQuestion.qKey]: (prev[currentQuestion.qKey] || 0) + 1
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, reviewMode, isTimerRunning, currentQuestion]);

  // When active question changes: mark it visited (if previously not_visited)
  useEffect(() => {
    if (phase === "exam" && !reviewMode && currentQuestion) {
      setQuestionStatuses(prev => {
        const currentStatus = prev[currentQuestion.qKey] || "not_visited";
        if (currentStatus === "not_visited") {
          return { ...prev, [currentQuestion.qKey]: "not_answered" };
        }
        return prev;
      });
    }
  }, [phase, reviewMode, currentQuestion]);

  // Generate a brand-new predictive test paper
  const handleGenerateAndProceed = async (exam: "jee-main" | "jee-advanced") => {
    setIsGenerating(true);
    setChosenExam(exam);
    try {
      const generated = await generateRandomPredictivePaper(exam, targetExamYear);
      setPaperData(generated);
      setPhase("instructions");
    } catch (e) {
      console.error("Failed to generate predictive paper:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start exam from instructions screen
  const handleStartExam = () => {
    if (!paperData) return;

    // Initialize statuses
    const initStatuses: Record<string, QuestionStatus> = {};
    paperData.sections.forEach(s => {
      s.questions.forEach(q => {
        initStatuses[q.qKey] = "not_visited";
      });
    });
    // First question is not_answered
    const firstKey = paperData.sections[0]?.questions[0]?.qKey;
    if (firstKey) {
      initStatuses[firstKey] = "not_answered";
    }

    setQuestionStatuses(initStatuses);
    setUserAnswers({});
    setQuestionTimeSpent({});
    setActiveSectionIndex(0);
    setActiveQuestionIndex(0);
    setSecondsRemaining(paperData.durationMinutes * 60);
    setIsTimerRunning(true);
    setReviewMode(false);
    setPhase("exam");

    enterFullscreen();
  };

  // Re-attempt a past test from history
  const handleReattemptPastTest = (record: CbtTestHistoryRecord) => {
    setPaperData(record.paper);
    setChosenExam(record.exam);
    setReviewMode(false);
    setPhase("instructions");
  };

  // View past test analysis dashboard immediately (Matching Screen after submission)
  const handleViewPastAnalysis = (record: CbtTestHistoryRecord) => {
    setPaperData(record.paper);
    setChosenExam(record.exam);
    setUserAnswers(record.userAnswers || {});
    setQuestionStatuses(record.questionStatuses || {});
    setQuestionTimeSpent(record.questionTimeSpent || {});
    setLatestResultRecord(record);
    setReviewMode(false);
    setPhase("results");
  };

  // Toggle question solution in results dashboard
  const toggleSolutionExpansion = (qKey: string) => {
    setExpandedSolutionKeys(prev => ({
      ...prev,
      [qKey]: !prev[qKey]
    }));
  };

  // Format time HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Format time spent: "34s" or "2m 15s" (matching QuizPage.tsx)
  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // ─── CBT ACTION BUTTON HANDLERS (EXACTLY MATCHING NTA CBT INTERFACE) ────────

  // Save & Next (Bright Green)
  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    const ans = userAnswers[currentQuestion.qKey];
    const hasAnswer = ans !== undefined && ans !== null && String(ans).trim().length > 0;

    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.qKey]: hasAnswer ? "answered" : "not_answered"
    }));

    advanceQuestion();
  };

  // Clear (White with border)
  const handleClear = () => {
    if (!currentQuestion) return;
    setUserAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentQuestion.qKey];
      return copy;
    });

    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.qKey]: "not_answered"
    }));
  };

  // Save & Mark for Review (Blue)
  const handleSaveAndMarkForReview = () => {
    if (!currentQuestion) return;
    const ans = userAnswers[currentQuestion.qKey];
    const hasAnswer = ans !== undefined && ans !== null && String(ans).trim().length > 0;

    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.qKey]: hasAnswer ? "answered_marked_review" : "marked_review"
    }));

    advanceQuestion();
  };

  // Mark for Review & Next (Amber/Orange)
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.qKey]: "marked_review"
    }));

    advanceQuestion();
  };

  // Advance to next question
  const advanceQuestion = () => {
    if (!paperData || !currentSection) return;
    if (activeQuestionIndex < currentSection.questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    } else if (activeSectionIndex < paperData.sections.length - 1) {
      setActiveSectionIndex(prev => prev + 1);
      setActiveQuestionIndex(0);
    }
  };

  // Previous question
  const previousQuestion = () => {
    if (!paperData) return;
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(prev => prev - 1);
    } else if (activeSectionIndex > 0) {
      const prevSecIdx = activeSectionIndex - 1;
      const prevSec = paperData.sections[prevSecIdx];
      setActiveSectionIndex(prevSecIdx);
      setActiveQuestionIndex(prevSec.questions.length - 1);
    }
  };

  // Jump to specific question
  const jumpToQuestion = (secIdx: number, qIdx: number) => {
    setActiveSectionIndex(secIdx);
    setActiveQuestionIndex(qIdx);
  };

  // Check question evaluation helper
  const evaluateQuestion = (q: GeneratedCbtQuestion, userResp: string | null) => {
    const isAttempted = userResp !== null && String(userResp).trim().length > 0;
    if (!isAttempted) {
      return { isAttempted: false, isCorrect: false, score: 0 };
    }

    const correctOpts = q.correct_options || [];
    const rawOfficial = q.answer !== undefined ? String(q.answer).trim() : correctOpts[0] || "";

    const cleanUser = String(userResp).trim().toLowerCase();
    const cleanOfficial = rawOfficial.trim().toLowerCase();

    let isCorrect = false;
    if (cleanUser === cleanOfficial || correctOpts.map(c => c.toLowerCase()).includes(cleanUser)) {
      isCorrect = true;
    } else if (q.type === "numerical") {
      const userNum = parseFloat(cleanUser);
      const officialNum = parseFloat(cleanOfficial);
      if (!isNaN(userNum) && !isNaN(officialNum) && Math.abs(userNum - officialNum) < 0.05) {
        isCorrect = true;
      }
    }

    const score = isCorrect ? (q.marks || 4) : -(q.negMarks !== undefined ? q.negMarks : 1);
    return { isAttempted: true, isCorrect, score };
  };

  // Final Submit Handler
  const handleFinalSubmit = () => {
    setIsTimerRunning(false);
    setShowSubmitModal(false);
    exitFullscreen();

    if (!paperData) return;

    // Compute scorecard & Question Logs
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let totalTimeSpent = 0;

    const questionLogs: CbtQuestionTimeLog[] = [];

    paperData.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const status = questionStatuses[q.qKey] || "not_visited";
        const userResp = userAnswers[q.qKey] || null;
        const timeSpent = questionTimeSpent[q.qKey] || 0;
        totalTimeSpent += timeSpent;

        const isConsidered = (status === "answered" || status === "answered_marked_review") && userResp !== null;
        let isCorrect = false;
        let scoreAwarded = 0;

        if (isConsidered && userResp) {
          const evalResult = evaluateQuestion(q, userResp);
          isCorrect = evalResult.isCorrect;
          scoreAwarded = evalResult.score;

          if (isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
          totalScore += scoreAwarded;
        }

        questionLogs.push({
          qKey: q.qKey,
          timeSpentSec: timeSpent,
          userResponse: userResp,
          status,
          isCorrect,
          scoreAwarded
        });
      });
    });

    const totalAttempted = correctCount + incorrectCount;
    const accuracyPct = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
    const totalQCount = allQuestions.length;
    const avgTimePerQ = totalQCount > 0 ? Math.round(totalTimeSpent / totalQCount) : 0;

    // Percentile & Rank
    let percentileEst = 0;
    let rankEst = "";
    if (paperData.exam === "jee-main") {
      if (totalScore >= 240) { percentileEst = 99.9; rankEst = "AIR 1 – 600"; }
      else if (totalScore >= 190) { percentileEst = 99.2; rankEst = "AIR 600 – 4,500"; }
      else if (totalScore >= 150) { percentileEst = 97.8; rankEst = "AIR 4,500 – 16,000"; }
      else if (totalScore >= 120) { percentileEst = 95.0; rankEst = "AIR 16,000 – 45,000"; }
      else if (totalScore >= 90) { percentileEst = 90.0; rankEst = "AIR 45,000 – 95,000"; }
      else { percentileEst = Math.max(15, Math.round((totalScore / 300) * 100)); rankEst = "AIR > 1 Lakh"; }
    } else {
      if (totalScore >= 140) { percentileEst = 99.9; rankEst = "AIR 1 – 300"; }
      else if (totalScore >= 110) { percentileEst = 99.0; rankEst = "AIR 300 – 2,000"; }
      else if (totalScore >= 80) { percentileEst = 96.5; rankEst = "AIR 2,000 – 8,000"; }
      else { percentileEst = Math.max(20, Math.round((totalScore / 180) * 100)); rankEst = "AIR > 10,000"; }
    }

    const testRecord: CbtTestHistoryRecord = {
      id: paperData.id,
      paperTitle: paperData.title,
      exam: paperData.exam,
      predictedForYear: paperData.predictedForYear,
      timestamp: Date.now(),
      totalScore,
      maxScore: paperData.totalMarks,
      accuracyPct,
      percentileEst,
      rankEst,
      totalTimeSpentSec: totalTimeSpent,
      avgTimePerQSec: avgTimePerQ,
      paper: paperData,
      questionLogs,
      userAnswers,
      questionStatuses,
      questionTimeSpent
    };

    // Save to persistent test history
    saveCbtTestResult(testRecord);
    setLatestResultRecord(testRecord);
    setTestHistory(getCbtTestHistory());
    setReviewMode(false);
    setPhase("results");
  };

  // Status Counts for current section or total
  const summaryCounts = useMemo(() => {
    let notVisited = 0;
    let notAnswered = 0;
    let answered = 0;
    let markedReview = 0;
    let answeredMarkedReview = 0;

    allQuestions.forEach(q => {
      const st = questionStatuses[q.qKey] || "not_visited";
      if (st === "not_visited") notVisited++;
      else if (st === "not_answered") notAnswered++;
      else if (st === "answered") answered++;
      else if (st === "marked_review") markedReview++;
      else if (st === "answered_marked_review") answeredMarkedReview++;
    });

    return { notVisited, notAnswered, answered, markedReview, answeredMarkedReview, total: allQuestions.length };
  }, [allQuestions, questionStatuses]);

  // Subject Stats Calculator for Advanced Dashboard (matching QuizPage.tsx lines 1522-1550)
  const getSubjectStats = (sec: GeneratedCbtSection) => {
    const record = latestResultRecord;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let time = 0;
    let score = 0;

    sec.questions.forEach(q => {
      const log = record?.questionLogs.find(l => l.qKey === q.qKey);
      const spent = log?.timeSpentSec || questionTimeSpent[q.qKey] || 0;
      time += spent;

      if (!log || log.userResponse === null) {
        skipped++;
      } else if (log.isCorrect) {
        correct++;
        score += (q.marks || 4);
      } else {
        incorrect++;
        score -= (q.negMarks !== undefined ? q.negMarks : 1);
      }
    });

    return {
      correct,
      incorrect,
      skipped,
      time,
      score,
      total: sec.questions.length
    };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // GUARD SCREEN (Only for 11th, 12th & Droppers IIT-JEE)
  // ──────────────────────────────────────────────────────────────────────────
  if (!isEligible) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-5 rounded-3xl border-border shadow-xl bg-card">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground">
              Exclusively for IIT-JEE Aspirants (11th, 12th &amp; Droppers)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              The NTA CBT Exam Simulation mode is specifically calibrated with JEE Main &amp; JEE Advanced PYQ predictive models.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => setGoalSelectionOpen(true)}
              className="rounded-xl font-bold text-xs py-5 bg-primary hover:bg-primary/90 shadow-md"
            >
              Set Goal to IIT-JEE
            </Button>
            <Button variant="outline" onClick={onExit} className="rounded-xl font-semibold text-xs py-5">
              Back to Practice
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 1: EXAM SELECTION (JEE MAINS & JEE ADVANCE ONLY)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "select") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 sm:p-8 flex flex-col items-center justify-center font-sans animate-in fade-in duration-200">
        <div className="max-w-4xl w-full space-y-6">
          {/* Top Back Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="rounded-xl text-xs font-semibold gap-2 border-slate-300 dark:border-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to PYQ Questions
            </Button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Predicted Target: JEE {targetExamYear}
              </span>
            </div>
          </div>

          {/* Clean Portal Header Banner */}
          <div className="bg-[#0B3C61] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-blue-900/40">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 border border-white/15 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Randomized Predictive Algorithm (2002–2026 Trends)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                NTA CBT Exam Simulation Mode
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
                Experience the exact 100% authentic NTA computer interface. Every test dynamically samples from 24+ years of actual shift papers based on high-yield chapter weightages calibrated for your target exam year ({targetExamYear}).
              </p>
            </div>

            {/* Candidate Box */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4 shrink-0 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-black text-lg text-white">
                {user?.charAt(0).toUpperCase() || "C"}
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white uppercase text-sm">{user || "Candidate"}</p>
                <p className="text-blue-200 font-mono">Roll: 26031084920</p>
                <p className="text-amber-300 font-semibold">{selectedGoal?.displayName || `Target JEE ${targetExamYear}`}</p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs: "New Test" or "Test History" */}
          <div className="flex bg-card p-1.5 rounded-2xl border border-border/80 shadow-sm max-w-md mx-auto">
            <button
              onClick={() => setActiveTab("new_test")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "new_test" ? "bg-[#0B3C61] text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Start New Exam
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "history" ? "bg-[#0B3C61] text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Test History ({testHistory.length})
            </button>
          </div>

          {/* TAB 1: TWO EXAM OPTIONS (JEE MAINS & JEE ADVANCE) */}
          {activeTab === "new_test" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* ── OPTION 1: JEE MAINS ────────────────────────────────────────── */}
              <div
                onClick={() => handleGenerateAndProceed("jee-main")}
                className="p-6 sm:p-8 rounded-3xl border-2 border-blue-600/30 dark:border-blue-500/30 bg-card hover:border-blue-600 hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg border border-blue-500/20 group-hover:scale-110 transition-transform">
                      JM
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Official NTA Pattern
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-blue-600 transition-colors">
                      JEE Mains
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      Random predictive paper generated from 2002–2026 chapter weightages calibrated for <strong>JEE Main {targetExamYear}</strong>.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Total Questions:</span>
                      <strong className="text-foreground">75 Questions</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Subject Breakdown:</span>
                      <strong className="text-foreground">25 Phy • 25 Chem • 25 Math</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Question Pattern:</span>
                      <strong className="text-foreground">20 MCQs + 5 Numerical each</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Duration &amp; Marks:</span>
                      <strong className="text-foreground">180 Mins • 300 Marks (+4, -1)</strong>
                    </div>
                  </div>
                </div>

                <Button
                  disabled={isGenerating}
                  className="w-full rounded-2xl py-6 font-bold text-sm bg-[#0B3C61] hover:bg-[#07253d] text-white shadow-md group-hover:shadow-xl transition-all"
                >
                  {isGenerating && chosenExam === "jee-main" ? "Generating Predictive Paper..." : "Launch JEE Mains Exam →"}
                </Button>
              </div>

              {/* ── OPTION 2: JEE ADVANCE ──────────────────────────────────────── */}
              <div
                onClick={() => handleGenerateAndProceed("jee-advanced")}
                className="p-6 sm:p-8 rounded-3xl border-2 border-amber-600/30 dark:border-amber-500/30 bg-card hover:border-amber-600 hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/20 group-hover:scale-110 transition-transform">
                      JA
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      IIT Advanced Pattern
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-amber-600 transition-colors">
                      JEE Advance
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      Rigorous multi-concept problem sets from classic &amp; modern IIT-JEE papers calibrated for <strong>JEE Advanced {targetExamYear}</strong>.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Total Questions:</span>
                      <strong className="text-foreground">54 Questions</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Subject Breakdown:</span>
                      <strong className="text-foreground">18 Phy • 18 Chem • 18 Math</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Question Pattern:</span>
                      <strong className="text-foreground">Single, Multi-Correct &amp; Numerical</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                      <span>Duration &amp; Marks:</span>
                      <strong className="text-foreground">180 Mins • 180 Marks (+4, -2)</strong>
                    </div>
                  </div>
                </div>

                <Button
                  disabled={isGenerating}
                  className="w-full rounded-2xl py-6 font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-md group-hover:shadow-xl transition-all"
                >
                  {isGenerating && chosenExam === "jee-advanced" ? "Generating Predictive Paper..." : "Launch JEE Advance Exam →"}
                </Button>
              </div>
            </div>
          ) : (
            /* TAB 2: TEST HISTORY & RE-ATTEMPT */
            <div className="space-y-4 pt-2">
              {testHistory.length === 0 ? (
                <Card className="p-8 text-center space-y-3 rounded-3xl border-border bg-card">
                  <History className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                  <p className="font-bold text-foreground text-sm">No Test Attempts Yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Take your first randomized predictive CBT exam to start building your test history, time-tracking trends, and re-attempt logs.
                  </p>
                </Card>
              ) : (
                testHistory.map(record => (
                  <Card
                    key={record.id}
                    onClick={() => handleViewPastAnalysis(record)}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-primary/60 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-primary/10 text-primary">
                          {record.exam === "jee-main" ? "JEE Mains" : "JEE Advance"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(record.timestamp).toLocaleDateString()} at {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {record.paperTitle}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>Score: <strong className="text-foreground">{record.totalScore}/{record.maxScore}</strong></span>
                        <span>•</span>
                        <span>Accuracy: <strong className="text-emerald-600">{record.accuracyPct}%</strong></span>
                        <span>•</span>
                        <span>Avg Time/Q: <strong className="text-foreground">{record.avgTimePerQSec}s</strong></span>
                        <span>•</span>
                        <span>Est: <strong className="text-primary">{record.percentileEst}%ile</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPastAnalysis(record);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> View Analysis
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReattemptPastTest(record);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-[#0B3C61] text-white hover:bg-[#07253d]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Re-attempt
                      </Button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCbtTestRecord(record.id);
                          setTestHistory(getCbtTestHistory());
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 2: INSTRUCTIONS SCREEN (EXACT MATCHING NTA STANDARDS)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "instructions" && paperData) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans p-4 sm:p-10 flex flex-col justify-between max-w-5xl mx-auto select-none animate-in fade-in duration-200">
        <div className="space-y-8">
          <div className="border-b border-slate-200 pb-4 text-center">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-wider uppercase">
              GENERAL INSTRUCTIONS
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Test: <strong className="text-slate-800">{paperData.title}</strong> • Duration: 180 Minutes
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <h2 className="font-bold text-slate-900 text-sm">Test Details &amp; Guidelines</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>The clock will be set at the server. The countdown timer in the top header will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.</li>
              <li>The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</li>
            </ul>

            {/* Official NTA 5 Status Symbols */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-md bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  01
                </span>
                <span className="text-slate-600 text-xs">You have not visited the question yet.</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-md bg-[#b91c1c] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  02
                </span>
                <span className="text-slate-600 text-xs">You have not answered the question.</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-md bg-[#16a34a] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  03
                </span>
                <span className="text-slate-600 text-xs">You have answered the question.</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-[#4c1d95] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  04
                </span>
                <span className="text-slate-600 text-xs">You have NOT answered the question, but have marked the question for review.</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-9 h-9 rounded-full bg-[#4c1d95] text-white font-bold flex items-center justify-center text-xs shrink-0 relative shadow-xs">
                  05
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
                </span>
                <span className="text-slate-800 font-semibold text-xs text-emerald-700">
                  The question(s) "Answered and Marked for Review" will be considered for evaluation.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={instructionsAgreed}
                  onChange={e => setInstructionsAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I agree to undertake the test under strict fullscreen examination conditions.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPhase("select")}
            className="rounded-md px-6 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300"
          >
            &lt; Previous
          </Button>

          <Button
            disabled={!instructionsAgreed}
            onClick={handleStartExam}
            className="rounded-md px-8 py-2.5 text-xs font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 shadow-sm"
          >
            I am ready to begin
          </Button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 3: ACTIVE CBT EXAM & REVIEW MODE (NTA INTERFACE)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "exam" && paperData && currentQuestion) {
    const qUserAns = userAnswers[currentQuestion.qKey] || null;
    const qEvaluation = evaluateQuestion(currentQuestion, qUserAns);
    const isQCorrect = qEvaluation.isCorrect;
    const isQAttempted = qEvaluation.isAttempted;

    return (
      <div className="fixed inset-0 z-[100] bg-white text-slate-900 flex flex-col font-sans select-none overflow-hidden">
        {/* ── 1. TOP CANDIDATE & TIMER / MODE BAR ─────────────────────────────── */}
        <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
          {/* Left: Avatar & Candidate Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-base shrink-0">
              {user?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="text-xs leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Candidate Name</span>
                <span className="font-bold text-slate-800">: {user || "Candidate"}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-500 font-medium">Test Name</span>
                <span className="font-bold text-slate-800">: {paperData.title}</span>
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-500 font-medium">{reviewMode ? "Mode" : "Remaining Time"}</span>
                <span className="font-bold text-slate-800">:</span>
                {reviewMode ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-xs">
                    REVIEW SOLUTIONS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#2563eb] text-white font-mono font-bold text-[11px] tabular-nums">
                    {formatTime(secondsRemaining)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Mode Action or View Instructions */}
          <div className="flex items-center gap-2">
            {reviewMode ? (
              <Button
                onClick={() => setPhase("results")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg px-4 h-9 shadow-xs"
              >
                Exit Review
              </Button>
            ) : (
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              >
                View Instructions
              </button>
            )}
          </div>
        </header>

        {/* ── 2. SUBJECT SELECTION BAR ───────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={previousQuestion}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {paperData.sections.map((sec, idx) => {
                const isActive = idx === activeSectionIndex;
                return (
                  <button
                    key={sec.title}
                    onClick={() => {
                      setActiveSectionIndex(idx);
                      setActiveQuestionIndex(0);
                    }}
                    className={`px-4 py-1 rounded-md text-xs transition-all ${
                      isActive
                        ? "bg-[#dbeafe] text-[#1e40af] font-bold border border-blue-200 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 font-medium"
                    }`}
                  >
                    {sec.title}
                  </button>
                );
              })}
            </div>

            <button
              onClick={advanceQuestion}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Predictive Model: JEE {targetExamYear} High-Yield Weightage
          </span>
        </div>

        {/* ── 3. MAIN QUESTION AREA + PALETTE ─────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT: QUESTION CONTAINER */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Question Subheader Bar */}
            <div className="px-6 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-slate-900">
                  Question {currentQuestion.questionNo}:
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                  Marks: <strong className="text-emerald-600">+{currentQuestion.marks}</strong> <strong className="text-red-500">-{currentQuestion.negMarks}</strong>
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold capitalize">
                  Type: {currentQuestion.type === "numerical" ? "Numeric" : "Single"}
                </span>

                <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                  [{currentQuestion.chapter}]
                </span>

                {reviewMode && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    !isQAttempted
                      ? "bg-slate-100 text-slate-600"
                      : isQCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {!isQAttempted ? "Skipped (0)" : isQCorrect ? "Correct (+4)" : "Incorrect (-1)"}
                  </span>
                )}
              </div>

              {/* Top Navigation & 3-Dot Metadata Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousQuestion}
                  disabled={activeSectionIndex === 0 && activeQuestionIndex === 0}
                  className="h-7 px-2.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1 rounded-md"
                  title="Previous Question (Back)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={advanceQuestion}
                  disabled={
                    activeSectionIndex === (paperData.sections.length - 1) &&
                    activeQuestionIndex === (currentSection.questions.length - 1)
                  }
                  className="h-7 px-2.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1 rounded-md"
                  title="Next Question (Next)"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <button
                  onClick={() => {
                    setSelectedMetaQuestion(currentQuestion);
                    setShowQuestionMetaModal(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  title="Question Shift, Paper & Topic Details"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Content Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Question Text with Rich Math / KaTeX */}
              <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-serif">
                <RichMathContent content={currentQuestion.content} />
              </div>

              {/* Input Area: Numerical OR MCQ Radio Options */}
              {currentQuestion.type === "numerical" ? (
                /* Numerical input */
                <div className="space-y-4 max-w-md pt-2">
                  {reviewMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                        <span className="text-slate-500 block text-[11px] font-medium">Your Input:</span>
                        <strong className={`text-base font-mono font-bold ${isQCorrect ? "text-emerald-600" : isQAttempted ? "text-red-500" : "text-slate-600"}`}>
                          {qUserAns ?? "Unattempted"}
                        </strong>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-emerald-700 block text-[11px] font-medium">Official Correct Value:</span>
                        <strong className="text-base font-mono font-bold text-emerald-700">
                          {currentQuestion.correct_options?.[0] || currentQuestion.answer}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    /* Exact Virtual Keypad */
                    <div className="space-y-3 max-w-xs">
                      <input
                        type="text"
                        readOnly
                        value={userAnswers[currentQuestion.qKey] || ""}
                        placeholder="Enter value"
                        className="w-full text-lg font-mono font-bold px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none"
                      />

                      <div className="space-y-1.5 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                        <button
                          onClick={() => {
                            const current = userAnswers[currentQuestion.qKey] || "";
                            setUserAnswers(prev => ({ ...prev, [currentQuestion.qKey]: current.slice(0, -1) }));
                          }}
                          className="w-full py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold border border-slate-300"
                        >
                          Backspace
                        </button>

                        <div className="grid grid-cols-3 gap-1.5">
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "."].map(btn => (
                            <button
                              key={btn}
                              onClick={() => {
                                const current = userAnswers[currentQuestion.qKey] || "";
                                setUserAnswers(prev => ({ ...prev, [currentQuestion.qKey]: current + btn }));
                              }}
                              className="py-2 rounded bg-white hover:bg-slate-50 text-sm font-bold text-slate-800 shadow-2xs border border-slate-300"
                            >
                              {btn}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setUserAnswers(prev => {
                              const copy = { ...prev };
                              delete copy[currentQuestion.qKey];
                              return copy;
                            });
                          }}
                          className="w-full py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold border border-slate-300"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MCQ Radio Options */
                <div className="space-y-4 pt-2">
                  {/* Options List */}
                  <div className="space-y-3">
                    {(currentQuestion.options || []).map(opt => {
                      const isSelected = userAnswers[currentQuestion.qKey] === opt.identifier;
                      const isOfficialCorrect =
                        (currentQuestion.correct_options || []).includes(opt.identifier) ||
                        opt.identifier === String(currentQuestion.answer);

                      return (
                        <div
                          key={opt.identifier}
                          onClick={() => {
                            if (!reviewMode) {
                              setUserAnswers(prev => ({
                                ...prev,
                                [currentQuestion.qKey]: opt.identifier
                              }));
                            }
                          }}
                          className={cn(
                            "flex items-start gap-3 p-3.5 rounded-xl border transition-all select-none",
                            reviewMode
                              ? isOfficialCorrect
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/30"
                                : isSelected
                                ? "bg-red-500/10 border-red-500/40 text-red-950 dark:text-red-200 ring-1 ring-red-500/30"
                                : "border-slate-200 bg-slate-50/40 text-slate-700"
                              : isSelected
                              ? "bg-blue-500/10 border-blue-500 text-blue-900 cursor-pointer shadow-xs"
                              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-slate-800"
                          )}
                        >
                          <span className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                            reviewMode
                              ? isOfficialCorrect
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : isSelected
                                ? "border-red-500 bg-red-500 text-white"
                                : "border-slate-300"
                              : isSelected
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300"
                          )}>
                            {!reviewMode && isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                            {reviewMode && isOfficialCorrect && <Check className="w-3.5 h-3.5 text-white" />}
                            {reviewMode && isSelected && !isOfficialCorrect && <X className="w-3.5 h-3.5 text-white" />}
                          </span>

                          <span className="font-bold shrink-0 text-sm">({opt.identifier})</span>

                          <div className="flex-1 text-sm font-medium">
                            <RichMathContent content={opt.content} compact />
                          </div>

                          {reviewMode && isOfficialCorrect && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white shrink-0">
                              Correct Option
                            </span>
                          )}
                          {reviewMode && isSelected && !isOfficialCorrect && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white shrink-0">
                              Your Selection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── EXPLANATION BOX (REVIEW MODE ONLY - MATCHING QuizPage.tsx) ──── */}
              {reviewMode && (
                <div className="space-y-4 mt-8 pt-4 border-t border-slate-200">
                  {/* Comprehensive Scientific Derivation Box */}
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                      <BrainCircuit className="h-4 w-4" /> Comprehensive Scientific Derivation
                    </div>
                    <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-sans">
                      <RichMathContent content={currentQuestion.explanation || "No explanation provided."} />
                    </div>
                    <div className="text-xs text-muted-foreground pt-3 border-t border-border flex flex-wrap gap-4 justify-between font-semibold">
                      <span>Time spent: <strong className="text-foreground">{formatTimeSpent(questionTimeSpent[currentQuestion.qKey] || 0)}</strong></span>
                      <span>Topper benchmark speed: <strong className="text-foreground">{currentQuestion.minPossibleTimeSec}s</strong></span>
                    </div>
                  </div>

                  {/* Topper's Shortcut / Trick */}
                  {currentQuestion.fastestApproach && (
                    <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm uppercase tracking-wider">
                        <Zap className="h-4 w-4 text-amber-600" /> Topper's Shortcut / Fastest Approach ({currentQuestion.minPossibleTimeSec}s Benchmark)
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {currentQuestion.fastestApproach}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 4. OFFICIAL ACTION BUTTONS BAR ─────────────────────────────── */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              {reviewMode ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={previousQuestion}
                      className="font-bold border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg h-9 px-4 text-xs"
                      disabled={activeSectionIndex === 0 && activeQuestionIndex === 0}
                    >
                      &lt; PREV
                    </Button>
                    <Button
                      variant="outline"
                      onClick={advanceQuestion}
                      className="font-bold border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg h-9 px-4 text-xs"
                      disabled={
                        activeSectionIndex === (paperData.sections.length - 1) &&
                        activeQuestionIndex === (currentSection.questions.length - 1)
                      }
                    >
                      NEXT &gt;
                    </Button>
                  </div>
                  <Button
                    onClick={() => setPhase("results")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-6 h-9 text-xs shadow-xs"
                  >
                    EXIT REVIEW &amp; VIEW REPORT
                  </Button>
                </div>
              ) : (
                <>
                  {/* Left Buttons: SAVE & NEXT, CLEAR, and BACK / NEXT */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                      onClick={handleSaveAndNext}
                      className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs rounded-lg px-6 py-2.5 uppercase tracking-wider shadow-xs"
                    >
                      SAVE &amp; NEXT
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClear}
                      className="border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg px-5 py-2.5 uppercase bg-white hover:bg-slate-50"
                    >
                      CLEAR
                    </Button>
                    <Button
                      variant="outline"
                      onClick={previousQuestion}
                      disabled={activeSectionIndex === 0 && activeQuestionIndex === 0}
                      className="border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-lg px-4 py-2.5 uppercase gap-1"
                      title="Navigate to Previous Question"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> BACK
                    </Button>
                    <Button
                      variant="outline"
                      onClick={advanceQuestion}
                      disabled={
                        activeSectionIndex === (paperData.sections.length - 1) &&
                        activeQuestionIndex === (currentSection.questions.length - 1)
                      }
                      className="border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-lg px-4 py-2.5 uppercase gap-1"
                      title="Navigate to Next Question"
                    >
                      NEXT <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Middle/Right Buttons: SAVE & MARK FOR REVIEW and MARK FOR REVIEW & NEXT */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSaveAndMarkForReview}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-lg px-6 py-2.5 uppercase tracking-wider shadow-xs"
                    >
                      SAVE &amp; MARK FOR REVIEW
                    </Button>
                    <Button
                      onClick={handleMarkForReviewAndNext}
                      className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs rounded-lg px-6 py-2.5 uppercase tracking-wider shadow-xs"
                    >
                      MARK FOR REVIEW &amp; NEXT
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* COLLAPSE/EXPAND HANDLE FOR PALETTE */}
          <button
            onClick={() => setIsPaletteCollapsed(prev => !prev)}
            className="w-4 bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors z-10 shrink-0"
            title={isPaletteCollapsed ? "Expand Palette" : "Collapse Palette"}
          >
            {isPaletteCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {/* RIGHT: QUESTION PALETTE */}
          <aside
            className={`bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden transition-all duration-200 ${
              isPaletteCollapsed ? "w-0 border-none opacity-0" : "w-80 md:w-96"
            }`}
          >
            {/* Top Status Summary Badges */}
            {reviewMode ? (
              <div className="p-3 border-b border-slate-200 bg-white grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-emerald-700 font-bold text-base">
                    {allQuestions.filter(q => evaluateQuestion(q, userAnswers[q.qKey] || null).isCorrect).length}
                  </div>
                  <div className="text-[10px] text-emerald-800 uppercase">Correct</div>
                </div>
                <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-red-700 font-bold text-base">
                    {allQuestions.filter(q => {
                      const evalQ = evaluateQuestion(q, userAnswers[q.qKey] || null);
                      return evalQ.isAttempted && !evalQ.isCorrect;
                    }).length}
                  </div>
                  <div className="text-[10px] text-red-800 uppercase">Wrong</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <div className="text-slate-700 font-bold text-base">
                    {allQuestions.filter(q => !evaluateQuestion(q, userAnswers[q.qKey] || null).isAttempted).length}
                  </div>
                  <div className="text-[10px] text-slate-600 uppercase">Skipped</div>
                </div>
              </div>
            ) : (
              <div className="p-3 border-b border-slate-200 bg-white grid grid-cols-2 gap-2 text-[11px] font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#22c55e] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {summaryCounts.answered}
                  </span>
                  <span className="text-slate-600 text-xs">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#b91c1c] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {summaryCounts.notAnswered}
                  </span>
                  <span className="text-slate-600 text-xs">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {summaryCounts.notVisited}
                  </span>
                  <span className="text-slate-600 text-xs">Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#4c1d95] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {summaryCounts.markedReview}
                  </span>
                  <span className="text-slate-600 text-xs">Mark for review</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-[#4c1d95] text-white font-bold text-xs flex items-center justify-center shrink-0 relative">
                    {summaryCounts.answeredMarkedReview}
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                  </span>
                  <span className="text-[10px] text-slate-700 leading-tight">
                    Answered &amp; Marked for Revision (will be evaluated)
                  </span>
                </div>
              </div>
            )}

            {/* 8-Column Question Palette Grid */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1.5">
                {currentSection.questions.map((q, qIdx) => {
                  const isCurrent = qIdx === activeQuestionIndex;

                  if (reviewMode) {
                    const evalQ = evaluateQuestion(q, userAnswers[q.qKey] || null);
                    let revStyle = "bg-slate-100 border border-slate-300 text-slate-700 rounded";
                    if (evalQ.isAttempted) {
                      revStyle = evalQ.isCorrect
                        ? "bg-[#16a34a] text-white font-bold rounded"
                        : "bg-[#dc2626] text-white font-bold rounded";
                    }

                    return (
                      <button
                        key={q.qKey}
                        onClick={() => jumpToQuestion(activeSectionIndex, qIdx)}
                        className={`h-8 w-8 text-xs flex items-center justify-center font-semibold transition-transform ${revStyle} ${
                          isCurrent ? "ring-2 ring-primary ring-offset-1 scale-105" : "hover:opacity-90"
                        }`}
                      >
                        {q.questionNo}
                      </button>
                    );
                  }

                  const status = questionStatuses[q.qKey] || "not_visited";
                  let style = "bg-slate-100 border border-slate-200 text-slate-700 rounded";
                  if (status === "not_answered") {
                    style = "bg-[#b91c1c] text-white font-bold rounded";
                  } else if (status === "answered") {
                    style = "bg-[#16a34a] text-white font-bold rounded";
                  } else if (status === "marked_review") {
                    style = "bg-[#4c1d95] text-white font-bold rounded-full";
                  } else if (status === "answered_marked_review") {
                    style = "bg-[#4c1d95] text-white font-bold rounded-full relative";
                  }

                  return (
                    <button
                      key={q.qKey}
                      onClick={() => jumpToQuestion(activeSectionIndex, qIdx)}
                      className={`h-8 w-8 text-xs flex items-center justify-center font-semibold transition-transform ${style} ${
                        isCurrent ? "ring-2 ring-blue-500 ring-offset-1 scale-105" : "hover:opacity-90"
                      }`}
                    >
                      {q.questionNo}
                      {status === "answered_marked_review" && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUBMIT BUTTON OR EXIT REVIEW BUTTON */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              {reviewMode ? (
                <Button
                  onClick={() => setPhase("results")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider py-5 rounded-lg shadow-sm"
                >
                  EXIT REVIEW
                </Button>
              ) : (
                <Button
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs uppercase tracking-wider py-5 rounded-lg shadow-sm"
                >
                  SUBMIT
                </Button>
              )}
            </div>
          </aside>
        </div>

        {/* ── SUBMISSION CONFIRMATION MODAL (MATCHING QuizPage.tsx lines 2170-2200) ── */}
        <AnimatePresence>
          {showSubmitModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-foreground"
              >
                <h2 className="text-2xl font-black text-center bg-muted py-3 rounded-xl">
                  Test Submission Summary
                </h2>

                {/* 5 Status Cards matching QuizPage.tsx */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                  <div className="text-center p-4 bg-muted/40 border border-border rounded-xl shadow-xs">
                    <div className="text-3xl font-black text-foreground mb-1">{allQuestions.length}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Total</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-xs">
                    <div className="text-3xl font-black text-emerald-600 mb-1">
                      {summaryCounts.answered + summaryCounts.answeredMarkedReview}
                    </div>
                    <div className="text-xs font-bold text-emerald-600 uppercase">Answered</div>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl shadow-xs">
                    <div className="text-3xl font-black text-red-500 mb-1">
                      {summaryCounts.notAnswered}
                    </div>
                    <div className="text-xs font-bold text-red-600 uppercase">Not Answered</div>
                  </div>
                  <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl shadow-xs">
                    <div className="text-3xl font-black text-purple-600 mb-1">
                      {summaryCounts.markedReview}
                    </div>
                    <div className="text-xs font-bold text-purple-600 uppercase">Marked</div>
                  </div>
                  <div className="text-center p-4 bg-muted/60 border border-border rounded-xl shadow-xs">
                    <div className="text-3xl font-black text-muted-foreground mb-1">
                      {summaryCounts.notVisited}
                    </div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Not Visited</div>
                  </div>
                </div>

                {/* Per-Section Summary Table */}
                <div className="border border-border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#0B3C61] text-white text-[11px] uppercase">
                      <tr>
                        <th className="p-2.5">Section</th>
                        <th className="p-2.5 text-center">Total</th>
                        <th className="p-2.5 text-center bg-emerald-700">Answered</th>
                        <th className="p-2.5 text-center bg-red-700">Not Answered</th>
                        <th className="p-2.5 text-center bg-purple-800">Marked Rev</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {paperData.sections.map(sec => {
                        let ans = 0;
                        let notAns = 0;
                        let rev = 0;

                        sec.questions.forEach(q => {
                          const st = questionStatuses[q.qKey] || "not_visited";
                          if (st === "answered" || st === "answered_marked_review") ans++;
                          else if (st === "not_answered") notAns++;
                          else if (st === "marked_review") rev++;
                        });

                        return (
                          <tr key={sec.title} className="hover:bg-muted/30">
                            <td className="p-2.5 font-bold text-foreground">{sec.title}</td>
                            <td className="p-2.5 text-center text-muted-foreground">{sec.questions.length}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-600">{ans}</td>
                            <td className="p-2.5 text-center font-bold text-red-500">{notAns}</td>
                            <td className="p-2.5 text-center font-bold text-purple-600">{rev}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-center font-bold text-base text-foreground leading-relaxed">
                  Are you sure you want to submit the test for final marking?<br />
                  <span className="text-xs font-medium text-muted-foreground">No changes will be allowed after submission.</span>
                </p>

                <div className="flex justify-center gap-4 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowSubmitModal(false)}
                    className="font-bold px-8 h-12 rounded-xl border-border text-foreground hover:bg-muted"
                  >
                    Return
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleFinalSubmit}
                    className="font-bold px-10 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                  >
                    Submit
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* INSTRUCTIONS POPUP MODAL */}
        <AnimatePresence>
          {showInstructionsModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-300 text-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-sm text-slate-800">Exam Instructions</h3>
                  <button onClick={() => setShowInstructionsModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>• Marking Scheme: <strong>+4</strong> for correct response, <strong>-1</strong> for incorrect MCQ response.</p>
                  <p>• Save &amp; Next turns status to Green (Answered).</p>
                  <p>• Clear Response unselects the option and resets to Red (Not Answered).</p>
                  <p>• Save &amp; Mark for Review counts in evaluation.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setShowInstructionsModal(false)} className="bg-slate-800 text-white rounded-xl text-xs font-bold">
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QUESTION METADATA MODAL (PAPER, SHIFT, DATE, CHAPTER, TOPIC) */}
        <AnimatePresence>
          {showQuestionMetaModal && (selectedMetaQuestion || currentQuestion) && (
            <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-300 text-slate-900"
              >
                {(() => {
                  const targetQ = selectedMetaQuestion || currentQuestion;
                  if (!targetQ) return null;
                  const metaPaper = targetQ.paperTitle || `${paperData.exam === "jee-main" ? "JEE Main" : "JEE Advanced"} Archive`;
                  const metaYear = targetQ.year || (metaPaper.match(/\b(19\d\d|20\d\d)\b/) ? metaPaper.match(/\b(19\d\d|20\d\d)\b/)![0] : "—");
                  const metaShift = targetQ.shift || (metaPaper.match(/(Morning|Evening|Shift\s*\d+|Slot\s*\d+|Paper\s*\d+)/i)?.[0] || "Official Shift");

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#0B3C61] text-white font-black text-xs flex items-center justify-center shadow-xs">
                            Q{targetQ.questionNo}
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 leading-tight">Question Paper &amp; Shift Origin</h3>
                            <p className="text-[11px] text-slate-500">Official Exam PYQ Archive Details</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowQuestionMetaModal(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Exam Paper &amp; Date</span>
                          <p className="font-bold text-slate-900 text-sm leading-snug">
                            {metaPaper}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Year &amp; Shift</span>
                            <p className="font-semibold text-slate-800">
                              {metaYear} • {metaShift}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subject &amp; Class</span>
                            <p className="font-semibold text-slate-800 capitalize">
                              {targetQ.subject} • Class {targetQ.classLevel}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Chapter</span>
                          <p className="font-bold text-slate-800">
                            {targetQ.chapter}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Topic / Concept</span>
                          <p className="font-semibold text-slate-800">
                            {targetQ.topic || targetQ.chapter}
                          </p>
                        </div>

                        <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
                          <span>Target Speed: <strong>{targetQ.minPossibleTimeSec}s</strong></span>
                          <span>Marking Scheme: <strong>+{targetQ.marks} / -{targetQ.negMarks}</strong></span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          onClick={() => setShowQuestionMetaModal(false)}
                          className="bg-[#0B3C61] hover:bg-[#07253d] text-white rounded-xl text-xs font-bold px-6 h-9"
                        >
                          Close
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── ZERO-BLANK SCREEN SPINNER (IF GENERATING OR PAPER LOADING) ─────────────
  if (phase === "exam" && (!paperData || !currentQuestion)) {
    return (
      <div className="fixed inset-0 z-[100] bg-white text-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-base text-slate-800">Loading Exam Interface &amp; Questions...</p>
          <p className="text-xs text-slate-500">Preparing high-yield shift PYQ pool</p>
          <Button variant="outline" size="sm" onClick={() => setPhase("select")} className="mt-4">
            Cancel &amp; Return
          </Button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 4: ADVANCED RESULTS & DASHBOARD (MATCHING QuizPage.tsx lines 2228–2394)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === "results" && latestResultRecord && paperData) {
    const record = latestResultRecord;

    const correctAnswersCount = record.questionLogs.filter(l => l.isCorrect).length;
    const incorrectAnswersCount = record.questionLogs.filter(l => !l.isCorrect && l.userResponse !== null).length;
    const skippedAnswersCount = record.questionLogs.filter(l => l.userResponse === null).length;

    // Filter questions in solutions review list
    const filteredQuestions = record.paper.sections.flatMap(s => s.questions).filter(q => {
      const log = record.questionLogs.find(l => l.qKey === q.qKey);
      if (resultFilter === "correct") return log?.isCorrect;
      if (resultFilter === "incorrect") return !log?.isCorrect && log?.userResponse !== null;
      if (resultFilter === "unattempted") return log?.userResponse === null;
      return true;
    });

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-8 max-w-5xl mx-auto p-4 sm:p-8 pb-16 text-foreground font-sans"
      >
        {/* Top Back Navigation Strip */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="rounded-xl text-xs font-semibold gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to PYQs
          </Button>

          <Button
            onClick={() => setPhase("select")}
            className="rounded-xl text-xs font-bold gap-2 bg-[#0B3C61] hover:bg-[#07253d] text-white shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Take Another Exam
          </Button>
        </div>

        {/* ── HEADER & TROPHY CARD (MATCHING QuizPage.tsx lines 2237–2257) ───── */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20 shadow-lg shadow-yellow-500/5 shrink-0 animate-bounce">
              <Trophy className="h-10 w-10 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Test Analysis Report</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Detailed subject breakdown, accuracy metrics, and Topper benchmark time analysis.
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button
              onClick={() => {
                setReviewMode(true);
                setPhase("exam");
                setActiveSectionIndex(0);
                setActiveQuestionIndex(0);
                enterFullscreen();
              }}
              className="flex-1 md:flex-initial h-12 px-6 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/95 transition-all gap-2"
            >
              <Eye className="w-5 h-5" /> View Solutions
            </Button>
            <Button
              variant="outline"
              onClick={() => setPhase("select")}
              className="flex-1 md:flex-initial h-12 px-6 rounded-xl font-bold border-border hover:bg-muted"
            >
              Dashboard
            </Button>
          </div>
        </div>

        {/* ── METRIC OVERVIEW GRID (MATCHING QuizPage.tsx lines 2259–2288) ────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Score Obtained</span>
            <div className="text-3xl font-black text-primary mt-2">
              {record.totalScore} <span className="text-sm font-normal text-muted-foreground">/ {record.maxScore}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Accuracy Rating</span>
            <div className="text-3xl font-black text-emerald-500 mt-2">{record.accuracyPct}%</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Time Spent</span>
            <div className="text-3xl font-black text-amber-500 mt-2">{formatTimeSpent(record.totalTimeSpentSec)}</div>
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

        {/* ── NTA PREDICTED PERCENTILE & RANK STRIP ─────────────────────────── */}
        <div className="bg-[#0B3C61] text-white rounded-3xl p-6 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="space-y-1">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-amber-300 border border-white/15 uppercase">
              JEE {record.predictedForYear} Calibrated Rank Model
            </span>
            <h3 className="text-lg font-bold text-white truncate">{record.paperTitle}</h3>
          </div>
          <div className="text-center p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Estimated Percentile</span>
            <span className="text-3xl font-black text-amber-300 tabular-nums">{record.percentileEst}%ile</span>
          </div>
          <div className="text-center p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Expected All-India Rank</span>
            <span className="text-xl sm:text-2xl font-black text-white">{record.rankEst}</span>
          </div>
        </div>

        {/* ── SUBJECT-WISE BREAKDOWN (MATCHING QuizPage.tsx lines 2290–2337) ─── */}
        <div className="space-y-4">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-primary animate-pulse" /> Subject Analysis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {record.paper.sections.map(sec => {
              const stats = getSubjectStats(sec);
              if (stats.total === 0) return null;

              const subjMaxScore = sec.questions.reduce((acc, q) => acc + (q.marks || 4), 0);
              const subjAccuracy =
                stats.correct + stats.incorrect > 0
                  ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
                  : 0;

              return (
                <div
                  key={sec.title}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all"
                >
                  <div>
                    <h4 className="text-base font-extrabold text-foreground border-b border-border pb-2 mb-4 flex items-center justify-between">
                      <span>{sec.title}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                        {stats.total} Qs
                      </span>
                    </h4>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Subject Score</span>
                        <span className="text-foreground">{stats.score} / {subjMaxScore}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="text-emerald-500 font-bold">{subjAccuracy}%</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Time Spent</span>
                        <span className="text-amber-500 font-bold">{formatTimeSpent(stats.time)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Correct / Wrong</span>
                        <span className="text-foreground font-bold">
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

        {/* ── QUESTION GRID & PERFORMANCE (MATCHING QuizPage.tsx lines 2339–2392) */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight">Question Grid &amp; Performance</h3>
            <span className="text-xs text-muted-foreground font-medium">
              Click any question to jump into Review Mode with solutions
            </span>
          </div>

          <div className="space-y-6">
            {record.paper.sections.map((sec, secIdx) => {
              const stats = getSubjectStats(sec);
              if (stats.total === 0) return null;

              return (
                <div key={sec.title} className="space-y-3">
                  <div className="flex justify-between items-center bg-muted/40 px-4 py-2.5 rounded-xl border border-border/50">
                    <span className="text-sm font-bold text-foreground">{sec.title}</span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {stats.correct} Correct • {stats.incorrect} Wrong • {stats.skipped} Skipped
                    </span>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                    {sec.questions.map((q, qIdx) => {
                      const log = record.questionLogs.find(l => l.qKey === q.qKey);
                      const isCorrect = log?.isCorrect || false;
                      const isAttempted = log?.userResponse !== null;
                      const spent = log?.timeSpentSec || 0;

                      let bgClass = "bg-muted/40 text-muted-foreground border-border";
                      if (isAttempted) {
                        bgClass = isCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                      }

                      return (
                        <button
                          key={q.qKey}
                          onClick={() => {
                            setReviewMode(true);
                            setPhase("exam");
                            setActiveSectionIndex(secIdx);
                            setActiveQuestionIndex(qIdx);
                            enterFullscreen();
                          }}
                          className={cn(
                            "h-12 border rounded-xl flex flex-col items-center justify-center font-bold text-xs hover:scale-105 hover:shadow-xs transition-all select-none cursor-pointer",
                            bgClass
                          )}
                          title={`Q${q.questionNo}: ${isCorrect ? "Correct" : isAttempted ? "Wrong" : "Skipped"} • ${spent}s`}
                        >
                          <span className="text-xs font-extrabold">{qIdx + 1}</span>
                          <span className="text-[9px] font-semibold opacity-75 mt-0.5">{formatTimeSpent(spent)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── QUESTION-BY-QUESTION REVIEW WITH FASTEST APPROACH ─────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Question Solutions &amp; Fastest Solving Approaches
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Questions are listed below. Click "Show Solution" on any question to expand its full derivation and Topper approach.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Expand / Collapse All */}
              <div className="flex gap-1.5 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    filteredQuestions.forEach(q => { all[q.qKey] = true; });
                    setExpandedSolutionKeys(all);
                  }}
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-border"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedSolutionKeys({})}
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-border"
                >
                  Collapse All
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-muted p-1 rounded-xl border border-border text-xs">
                {(["all", "correct", "incorrect", "unattempted"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setResultFilter(tab)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                      resultFilter === tab ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map(q => {
              const log = record.questionLogs.find(l => l.qKey === q.qKey);
              const isCorrect = log?.isCorrect || false;
              const userAns = log?.userResponse || null;
              const timeSpent = log?.timeSpentSec || 0;
              const minTime = q.minPossibleTimeSec;
              const isExpanded = !!expandedSolutionKeys[q.qKey];

              return (
                <Card key={q.qKey} className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-2xs">
                  {/* Top Question Status Header */}
                  <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-2 text-xs gap-2">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        Q{q.questionNo}
                      </span>
                      <span className="text-muted-foreground">[{q.chapter}]</span>
                      {q.paperTitle && (
                        <span className="text-[10px] text-muted-foreground/80 hidden sm:inline truncate max-w-[220px]">
                          • {q.paperTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                      {/* Time Spent Pill */}
                      <span className="flex items-center gap-1 text-muted-foreground font-mono">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Time Spent: <strong className="text-foreground">{formatTimeSpent(timeSpent)}</strong> (Min: {minTime}s)
                      </span>

                      {isCorrect ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Correct (+4)
                        </span>
                      ) : userAns !== null ? (
                        <span className="text-red-500 flex items-center gap-1 font-bold">
                          <XCircle className="w-4 h-4" /> Incorrect (-1)
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Skipped (0)</span>
                      )}

                      {/* 3-Dot Metadata Button */}
                      <button
                        onClick={() => {
                          setSelectedMetaQuestion(q);
                          setShowQuestionMetaModal(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Question Details, Shift & Paper (3-dot)"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-sm leading-relaxed">
                    <RichMathContent content={q.content} />
                  </div>

                  {/* Expand / Collapse Button */}
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSolutionExpansion(q.qKey)}
                      className="w-full justify-between font-bold text-xs h-9 rounded-xl border-border bg-muted/30 hover:bg-muted text-foreground transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        {isExpanded ? "Hide Solution & Solving Approach" : "Show Solution & Fastest Approach"}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Collapsible Solution Section */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in duration-200">
                      {/* Responses Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block text-[11px]">Your Selected Answer:</span>
                          <span className={`font-bold ${isCorrect ? "text-emerald-600" : "text-red-500"}`}>
                            {userAns ? `Option (${userAns})` : "Unattempted"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-emerald-600 dark:text-emerald-400 block text-[11px]">Official Correct Answer:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            Option ({q.correct_options?.[0] || q.answer})
                          </span>
                        </div>
                      </div>

                      {/* TOPPER'S SHORTCUT / FASTEST APPROACH */}
                      {q.fastestApproach && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                          <span className="font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            Topper's Shortcut / Fastest Approach ({minTime}s Benchmark)
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            {q.fastestApproach}
                          </p>
                        </div>
                      )}

                      {/* Comprehensive Explanation */}
                      {q.explanation && (
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                          <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Full Derivation &amp; Solution
                          </span>
                          <div className="text-muted-foreground leading-relaxed">
                            <RichMathContent content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* QUESTION METADATA MODAL (CAN BE OPENED FROM RESULTS VIEW) */}
        <AnimatePresence>
          {showQuestionMetaModal && selectedMetaQuestion && (
            <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-border text-foreground"
              >
                {(() => {
                  const targetQ = selectedMetaQuestion;
                  const metaPaper = targetQ.paperTitle || `${paperData.exam === "jee-main" ? "JEE Main" : "JEE Advanced"} Archive`;
                  const metaYear = targetQ.year || (metaPaper.match(/\b(19\d\d|20\d\d)\b/) ? metaPaper.match(/\b(19\d\d|20\d\d)\b/)![0] : "—");
                  const metaShift = targetQ.shift || (metaPaper.match(/(Morning|Evening|Shift\s*\d+|Slot\s*\d+|Paper\s*\d+)/i)?.[0] || "Official Shift");

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-xs">
                            Q{targetQ.questionNo}
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-foreground leading-tight">Question Paper &amp; Shift Origin</h3>
                            <p className="text-[11px] text-muted-foreground">Official Exam PYQ Archive Details</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowQuestionMetaModal(false)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs text-foreground">
                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Exam Paper &amp; Date</span>
                          <p className="font-bold text-foreground text-sm leading-snug">
                            {metaPaper}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Year &amp; Shift</span>
                            <p className="font-semibold text-foreground">
                              {metaYear} • {metaShift}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Subject &amp; Class</span>
                            <p className="font-semibold text-foreground capitalize">
                              {targetQ.subject} • Class {targetQ.classLevel}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Chapter</span>
                          <p className="font-bold text-foreground">
                            {targetQ.chapter}
                          </p>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Topic / Concept</span>
                          <p className="font-semibold text-foreground">
                            {targetQ.topic || targetQ.chapter}
                          </p>
                        </div>

                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-between text-[11px] text-primary">
                          <span>Target Speed: <strong>{targetQ.minPossibleTimeSec}s</strong></span>
                          <span>Marking Scheme: <strong>+{targetQ.marks} / -{targetQ.negMarks}</strong></span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          onClick={() => setShowQuestionMetaModal(false)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold px-6 h-9"
                        >
                          Close
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Fallback view (in case state is undefined)
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-3xl border-border bg-card">
        <AlertCircle className="w-10 h-10 text-primary mx-auto" />
        <h3 className="font-bold text-foreground text-base">CBT Exam Ready</h3>
        <p className="text-xs text-muted-foreground">Select an option to launch your predictive exam simulation.</p>
        <Button onClick={() => setPhase("select")} className="rounded-xl w-full">
          Open Exam Portal
        </Button>
      </Card>
    </div>
  );
}
