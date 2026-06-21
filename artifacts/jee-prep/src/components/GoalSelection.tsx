import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Atom, 
  Activity, 
  Building, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Trophy, 
  Calculator, 
  Coins, 
  Code, 
  Play, 
  ArrowLeft,
  ChevronRight, 
  ArrowRight,
  Compass,
  Check,
  Search,
  Sparkles,
  HelpCircle,
  Award,
  BookMarked
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext, SelectedGoal } from "@/context/AppContext";

interface GoalSelectionProps {
  canClose?: boolean;
}

type Step = 
  | "root" 
  | "sub_options" 
  | "stream_selection" 
  | "board_selection" 
  | "custom_input"
  | "engineering_medical"
  | "college_entrance"
  | "school_boards_olympiads"
  | "ca_banking"
  | "more_options";

export function GoalSelection({ canClose = false }: GoalSelectionProps) {
  const { selectGoal, setGoalSelectionOpen, selectedGoal, theme } = useAppContext();
  const isDark = theme === "dark";
  
  // Navigation states
  const [currentStep, setCurrentStep] = useState<Step>("root");
  
  // Current selections in the wizard
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [customEdTech, setCustomEdTech] = useState("");

  // History tracking for back button navigation
  const [history, setHistory] = useState<Array<{
    step: Step;
    category: string | null;
    subOption: string | null;
    stream: string | null;
  }>>([]);

  const navigateTo = (
    step: Step,
    category: string | null = selectedCategory,
    subOption: string | null = selectedSubOption,
    stream: string | null = selectedStream
  ) => {
    setHistory(prev => [...prev, { 
      step: currentStep, 
      category: selectedCategory, 
      subOption: selectedSubOption, 
      stream: selectedStream 
    }]);

    setCurrentStep(step);
    setSelectedCategory(category);
    setSelectedSubOption(subOption);
    setSelectedStream(stream);
  };

  const handleBack = () => {
    if (history.length === 0) {
      if (canClose) {
        setGoalSelectionOpen(false);
      }
      return;
    }
    const prev = history[history.length - 1];
    setHistory(prevHistory => prevHistory.slice(0, -1));
    setCurrentStep(prev.step);
    setSelectedCategory(prev.category);
    setSelectedSubOption(prev.subOption);
    setSelectedStream(prev.stream);
  };

  // Complete selection
  const handleComplete = (displayName: string, path: string[], overrideCategory?: string | null) => {
    const finalCategory = overrideCategory || selectedCategory;
    if (!finalCategory) return;
    
    const goal: SelectedGoal = {
      category: finalCategory,
      path: path,
      displayName: displayName
    };
    
    selectGoal(goal);
    setGoalSelectionOpen(false);
  };

  // List of Boards
  const boardsList = [
    "CBSE", 
    "ICSE", 
    "UP Board", 
    "Bihar Board", 
    "Maharashtra Board", 
    "MP State Board", 
    "Rajasthan State Board", 
    "West Bengal Board", 
    "J&K State Board", 
    "Karnataka Board", 
    "Gujarat Board", 
    "Jharkhand State Board", 
    "Odisha Board", 
    "Tamil Nadu Board", 
    "Assam Board", 
    "Kerala Board", 
    "Telangana Board", 
    "Andhra Pradesh Board"
  ];

  // Sub-options depending on selected category
  const getSubOptions = () => {
    switch (selectedCategory) {
      case "JEE":
      case "NEET":
        return ["11th", "12th", "Dropper"];
      case "Boards":
        return ["10th", "12th"];
      case "Govt Exam":
        return [
          "SSC", "Polytechnic", "Defence", "PSC", "Banking", 
          "Judiciary", "Teaching", "Railway", "Nursing Exams", 
          "AE/JE", "ESE + GATE", "GATE"
        ];
      case "School":
        return Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
      case "Olympiads":
        return ["Govt Olympiads", "Private Olympiads"];
      case "Skills":
        return ["Dance", "Coding", "Art", "Painting", "Music", "Trading", "Gaming", "Hacking"];
      case "Ed-Tech":
        return [
          "PW", "Allen", "Anand Sir(SuperInfinity)", "Next Topper", 
          "Khan Academy", "Unacademy", "Akash", "Vedantu", "Other"
        ];
      default:
        return [];
    }
  };

  // Action when a root category is clicked
  const handleCategoryClick = (catId: string) => {
    const directRedirects = ["UPSC", "CA", "Banking", "Digital Courses", "PG Exams", "YouTube courses"];
    
    if (directRedirects.includes(catId)) {
      handleComplete(catId, [catId], catId);
    } else {
      navigateTo("sub_options", catId);
    }
  };

  // Action when a sub-option is clicked
  const handleSubOptionClick = (option: string) => {
    if (!selectedCategory) return;

    if (selectedCategory === "JEE" || selectedCategory === "NEET") {
      handleComplete(`${selectedCategory} - ${option}`, [selectedCategory, option]);
    } else if (selectedCategory === "Boards") {
      handleComplete(`Boards - ${option}`, [selectedCategory, option]);
    } else if (selectedCategory === "Govt Exam" || selectedCategory === "Skills") {
      handleComplete(option, [selectedCategory, option]);
    } else if (selectedCategory === "School") {
      const classNum = parseInt(option.replace("Class ", ""));
      if (classNum >= 1 && classNum <= 10) {
        navigateTo("board_selection", selectedCategory, option);
      } else {
        navigateTo("stream_selection", selectedCategory, option);
      }
    } else if (selectedCategory === "Olympiads") {
      navigateTo("board_selection", selectedCategory, option);
    } else if (selectedCategory === "Ed-Tech") {
      if (option === "Other") {
        navigateTo("custom_input", selectedCategory, option);
      } else {
        handleComplete(option, [selectedCategory, option]);
      }
    }
  };

  // Action when stream is selected (School Class 11/12)
  const handleStreamClick = (stream: string) => {
    navigateTo("board_selection", selectedCategory, selectedSubOption, stream);
  };

  // Action when board is selected
  const handleBoardClick = (board: string) => {
    if (!selectedCategory || !selectedSubOption) return;

    if (selectedCategory === "School") {
      const classNum = parseInt(selectedSubOption.replace("Class ", ""));
      const is11or12 = classNum === 11 || classNum === 12;
      
      let displayClass = `${classNum}th`;
      if (classNum === 1) displayClass = "1st";
      else if (classNum === 2) displayClass = "2nd";
      else if (classNum === 3) displayClass = "3rd";
      
      const displayName = `${displayClass} - ${board}`;
      const path = is11or12 
        ? [selectedCategory, selectedSubOption, selectedStream || "", board]
        : [selectedCategory, selectedSubOption, board];
        
      handleComplete(displayName, path);
    } else if (selectedCategory === "Olympiads") {
      handleComplete(board, [selectedCategory, selectedSubOption, board]);
    }
  };

  // Custom Ed-Tech confirmation
  const handleCustomEdTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEdTech.trim() || !selectedCategory) return;
    handleComplete(customEdTech.trim(), [selectedCategory, "Custom: " + customEdTech.trim()]);
  };

  // Olympiads list
  const getOlympiadList = () => {
    if (selectedSubOption === "Govt Olympiads") {
      return [
        "PRMO (Pre-Regional Mathematical Olympiad)", 
        "IOQM (Indian Olympiad Qualifier in Mathematics)", 
        "RMO (Regional Mathematical Olympiad)", 
        "INMO (Indian National Mathematical Olympiad)", 
        "NSEP (National Standard Examination in Physics)", 
        "NSEC (National Standard Examination in Chemistry)", 
        "NSEB (National Standard Examination in Biology)", 
        "NSEA (National Standard Examination in Astronomy)", 
        "NSEJS (National Standard Examination in Junior Science)", 
        "INPhO (Indian National Physics Olympiad)", 
        "INChO (Indian National Chemistry Olympiad)", 
        "INBO (Indian National Biology Olympiad)", 
        "INAO (Indian National Astronomy Olympiad)", 
        "INJSO (Indian National Junior Science Olympiad)"
      ];
    } else {
      return [
        "SOF IMO (International Mathematics Olympiad)", 
        "SOF NSO (National Science Olympiad)", 
        "SOF IEO (International English Olympiad)", 
        "SOF NCO (National Cyber Olympiad)", 
        "SOF IGKO (International General Knowledge Olympiad)", 
        "SOF ISSO (International Social Studies Olympiad)", 
        "NSTSE (National Level Science Talent Search Examination)", 
        "UIMO (Unified International Mathematics Olympiad)", 
        "UIEO (Unified International English Olympiad)", 
        "SilverZone iOM (International Olympiad of Mathematics)", 
        "SilverZone iOS (International Olympiad of Science)", 
        "SilverZone iEO (International Olympiad of English)", 
        "CREST Mathematics Olympiad (CMO)", 
        "CREST Science Olympiad (CSO)", 
        "CREST English Olympiad (CEO)", 
        "ITO National Maths Indian Talent Olympiad (NMITO)", 
        "ITO Science Indian Talent Olympiad (SITO)"
      ];
    }
  };

  // Header Titles depending on current step
  const getHeaderTitle = () => {
    switch (currentStep) {
      case "root":
        return "Select your Goal";
      case "engineering_medical":
        return "Engineering & Medical Exams";
      case "college_entrance":
        return "College Entrance Exams";
      case "school_boards_olympiads":
        return "Schools, Boards & Olympiads";
      case "ca_banking":
        return "CA, CS, Banking & Finance";
      case "more_options":
        return "Explore More Learning Programs";
      case "sub_options":
        if (selectedCategory === "School") return "Select Class";
        if (selectedCategory === "Olympiads") return "Select Olympiad Type";
        return `Select ${selectedCategory} Goal`;
      case "stream_selection":
        return "Select Stream";
      case "board_selection":
        if (selectedCategory === "Olympiads") return "Select Olympiad Exam";
        return "Select Board";
      case "custom_input":
        return "Enter Platform Name";
      default:
        return "Select your Goal";
    }
  };

  // Lightweight hardware-accelerated animations for low-end devices
  const stepVariants = {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 }
  };
  const stepTransition = { duration: 0.18, ease: "easeOut" as const };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Centered Title Header with Back Arrow on Left */}
        <div className="relative flex items-center justify-center px-6 py-5 border-b border-border/60 bg-muted/10 shrink-0">
          {(currentStep !== "root" || (canClose && selectedGoal)) && (
            <button
              onClick={handleBack}
              className="absolute left-6 p-2 rounded-full hover:bg-muted text-foreground transition-all active:scale-90 transform-gpu"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <h1 className="text-xl font-bold tracking-tight text-foreground text-center select-none">
            {getHeaderTitle()}
          </h1>
          
          {canClose && selectedGoal && (
            <button
              onClick={() => setGoalSelectionOpen(false)}
              className="absolute right-6 text-muted-foreground hover:text-foreground text-sm font-medium transition-all active:scale-95 transform-gpu"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {currentStep === "root" && (
              <motion.div
                key="root-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-8"
              >
                {/* Popular Exams Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight text-foreground/90">
                    Popular Exams
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* IIT-JEE */}
                    <button
                      onClick={() => handleCategoryClick("JEE")}
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30 bg-[#E5F1FF] dark:bg-blue-950/20 text-[#0066cc] dark:text-blue-300 font-semibold text-base transition-all hover:bg-[#D4E9FF] dark:hover:bg-blue-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200 shadow-sm"
                    >
                      <div className="p-1 rounded-full bg-white/70 dark:bg-zinc-900/60 shrink-0">
                        <Atom className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="truncate">IIT-JEE</span>
                    </button>

                    {/* NEET */}
                    <button
                      onClick={() => handleCategoryClick("NEET")}
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border border-green-100/50 dark:border-green-900/30 bg-[#E8F7F0] dark:bg-emerald-950/20 text-[#059669] dark:text-emerald-300 font-semibold text-base transition-all hover:bg-[#D8F0E4] dark:hover:bg-emerald-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200 shadow-sm"
                    >
                      <div className="p-1 rounded-full bg-white/70 dark:bg-zinc-900/60 shrink-0">
                        <Activity className="h-5 w-5 text-emerald-500" />
                      </div>
                      <span className="truncate">NEET</span>
                    </button>

                    {/* UPSC */}
                    <button
                      onClick={() => handleCategoryClick("UPSC")}
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border border-yellow-100/50 dark:border-yellow-900/30 bg-[#FEF9E6] dark:bg-amber-950/20 text-[#d97706] dark:text-amber-300 font-semibold text-base transition-all hover:bg-[#FDF3D2] dark:hover:bg-amber-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200 shadow-sm"
                    >
                      <div className="p-1 rounded-full bg-white/70 dark:bg-zinc-900/60 shrink-0">
                        <Building className="h-5 w-5 text-amber-500" />
                      </div>
                      <span className="truncate">UPSC</span>
                    </button>

                    {/* Govt. Exams */}
                    <button
                      onClick={() => navigateTo("sub_options", "Govt Exam")}
                      className="flex items-center justify-center gap-3 p-4 rounded-xl border border-orange-100/50 dark:border-orange-900/30 bg-[#FFF0E6] dark:bg-orange-950/20 text-[#ea580c] dark:text-orange-300 font-semibold text-base transition-all hover:bg-[#FFEBDC] dark:hover:bg-orange-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200 shadow-sm"
                    >
                      <div className="p-1 rounded-full bg-white/70 dark:bg-zinc-900/60 shrink-0">
                        <Award className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="truncate">Govt. Exams</span>
                    </button>
                  </div>
                </div>

                {/* All Exams Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight text-foreground/90">
                    All Exams
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item 1: Engineering & Medical Exams */}
                    <button
                      onClick={() => navigateTo("engineering_medical")}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-blue-500/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-100/30 dark:border-blue-900/20 transition-all shrink-0">
                        <Atom className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          Engineering & Medical Exams ( College & Job )
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* Item 2: College Entrance Exams */}
                    <button
                      onClick={() => navigateTo("college_entrance")}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-indigo-500/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-100/30 dark:border-indigo-900/20 transition-all shrink-0">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          College Entrance Exams ( UG & PG )
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* Item 3: Schools, Boards & Olympiads */}
                    <button
                      onClick={() => navigateTo("school_boards_olympiads")}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-amber-500/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100/30 dark:border-amber-900/20 transition-all shrink-0">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          Schools, Boards & Olympiads
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* Item 4: All Government Job Exams */}
                    <button
                      onClick={() => navigateTo("sub_options", "Govt Exam")}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-[#ea580c]/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-100/30 dark:border-rose-900/20 transition-all shrink-0">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          All Government Job Exams
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* Item 5: CA, CS, Banking & Finance Courses */}
                    <button
                      onClick={() => navigateTo("ca_banking")}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-sky-500/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-500 border border-sky-100/30 dark:border-sky-900/20 transition-all shrink-0">
                        <Calculator className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          CA, CS, Banking & Finance Courses
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* Item 6: NET Exams & Teacher Training */}
                    <button
                      onClick={() => {
                        setSelectedCategory("Govt Exam");
                        handleComplete("Teacher Training & NET", ["Govt Exam", "Teaching"], "Govt Exam");
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-emerald-500/20 hover:scale-[1.01] active:scale-95 transform-gpu duration-200 text-left group shadow-sm"
                    >
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-100/30 dark:border-emerald-900/20 transition-all shrink-0">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-foreground select-none">
                          NET Exams & Teacher Training
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/45 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Collapsible/Explore Section for Other Formats (Skills, Edtech, etc.) */}
                <div className="pt-4 border-t border-border/40 text-center">
                  <button
                    onClick={() => navigateTo("more_options")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 transform-gpu"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Looking for skills, coaching edtech, or video courses?
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Step 1: Engineering & Medical sub-selector */}
            {currentStep === "engineering_medical" && (
              <motion.div
                key="eng-med-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">Select your stream below</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCategoryClick("JEE")}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-blue-100/40 dark:border-blue-900/30 bg-[#E5F1FF] dark:bg-blue-950/20 text-[#0066cc] dark:text-blue-300 transition-all hover:bg-[#D4E9FF] dark:hover:bg-blue-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3">
                      <Atom className="h-8 w-8 text-blue-500" />
                    </div>
                    <span className="font-bold text-lg">Engineering Exams (IIT-JEE)</span>
                  </button>

                  <button
                    onClick={() => handleCategoryClick("NEET")}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-green-100/40 dark:border-green-900/30 bg-[#E8F7F0] dark:bg-emerald-950/20 text-[#059669] dark:text-emerald-300 transition-all hover:bg-[#D8F0E4] dark:hover:bg-emerald-900/40 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3">
                      <Activity className="h-8 w-8 text-emerald-500" />
                    </div>
                    <span className="font-bold text-lg">Medical Exams (NEET)</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Step 2: College Entrance selector */}
            {currentStep === "college_entrance" && (
              <motion.div
                key="college-entrance-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">Select your college target</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSelectedCategory("PG Exams");
                      handleComplete("PG Entrance Exams", ["PG Exams"], "PG Exams");
                    }}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-300 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3 text-indigo-500">
                      <GraduationCap className="h-8 w-8" />
                    </div>
                    <span className="font-bold text-lg text-center">Post Graduate (PG) Exams</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCategory("School");
                      navigateTo("board_selection", "School", "Class 12");
                    }}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-purple-100/40 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/10 text-purple-700 dark:text-purple-300 transition-all hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3 text-purple-500">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <span className="font-bold text-lg text-center">Under Graduate (UG) Entrance</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Step 3: Schools, Boards, Olympiads selector */}
            {currentStep === "school_boards_olympiads" && (
              <motion.div
                key="school-boards-oly-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">Select your learning environment</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* School Classes */}
                  <button
                    onClick={() => handleCategoryClick("School")}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-blue-100/40 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10 text-blue-700 dark:text-blue-300 transition-all hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white dark:bg-zinc-900 mb-3 text-blue-500">
                      <BookMarked className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-base">Class 1-12 School</span>
                  </button>

                  {/* Boards */}
                  <button
                    onClick={() => handleCategoryClick("Boards")}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-purple-100/40 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10 text-purple-700 dark:text-purple-300 transition-all hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white dark:bg-zinc-900 mb-3 text-purple-500">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-base">10th / 12th Boards</span>
                  </button>

                  {/* Olympiads */}
                  <button
                    onClick={() => handleCategoryClick("Olympiads")}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-100/40 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white dark:bg-zinc-900 mb-3 text-amber-500">
                      <Trophy className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-base">Olympiad Exams</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Step 4: CA, CS, Banking sub-selector */}
            {currentStep === "ca_banking" && (
              <motion.div
                key="ca-bank-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">Select professional path</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCategoryClick("CA")}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-sky-100/40 dark:border-sky-900/30 bg-sky-50/50 dark:bg-sky-950/10 text-sky-700 dark:text-sky-300 transition-all hover:bg-sky-50 dark:hover:bg-sky-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3 text-sky-500">
                      <Calculator className="h-8 w-8" />
                    </div>
                    <span className="font-bold text-lg">Chartered Accountancy (CA)</span>
                  </button>

                  <button
                    onClick={() => handleCategoryClick("Banking")}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border border-emerald-100/40 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:scale-[1.02] active:scale-95 transform-gpu duration-200"
                  >
                    <div className="p-3 rounded-full bg-white/70 dark:bg-zinc-900/60 mb-3 text-[#059669]">
                      <Coins className="h-8 w-8" />
                    </div>
                    <span className="font-bold text-lg">Banking & Finance Prep</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Custom Step 5: Explore More selector */}
            {currentStep === "more_options" && (
              <motion.div
                key="more-opt-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground">Select alternative study formats</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Skills */}
                  <button
                    onClick={() => handleCategoryClick("Skills")}
                    className="flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-[1.02] active:scale-95 transform-gpu duration-200 text-center"
                  >
                    <div className="p-2 bg-muted rounded-xl mb-3 text-foreground shrink-0">
                      <Code className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm">Skills & Hobbies</span>
                  </button>

                  {/* Ed-Tech */}
                  <button
                    onClick={() => handleCategoryClick("Ed-Tech")}
                    className="flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-[1.02] active:scale-95 transform-gpu duration-200 text-center"
                  >
                    <div className="p-2 bg-muted rounded-xl mb-3 text-foreground shrink-0">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm">Coaching Ed-Tech</span>
                  </button>

                  {/* Digital Courses */}
                  <button
                    onClick={() => handleCategoryClick("Digital Courses")}
                    className="flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-[1.02] active:scale-95 transform-gpu duration-200 text-center"
                  >
                    <div className="p-2 bg-muted rounded-xl mb-3 text-foreground shrink-0">
                      <Play className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm">Digital Courses</span>
                  </button>

                  {/* YouTube Courses */}
                  <button
                    onClick={() => handleCategoryClick("YouTube courses")}
                    className="flex flex-col items-center p-6 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-[1.02] active:scale-95 transform-gpu duration-200 text-center"
                  >
                    <div className="p-2 bg-muted rounded-xl mb-3 text-foreground shrink-0">
                      <Play className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm">YouTube Classes</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Standard Step: sub_options */}
            {currentStep === "sub_options" && (
              <motion.div
                key="sub-options-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded bg-primary/10 text-primary text-xs font-semibold">
                    {selectedCategory}
                  </div>
                  <span className="text-sm text-muted-foreground">Select option below to proceed</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {getSubOptions().map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSubOptionClick(opt)}
                      className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 active:scale-95 transform-gpu transition-all font-medium text-sm text-center text-foreground hover:scale-[1.02] duration-200"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Standard Step: stream_selection */}
            {currentStep === "stream_selection" && (
              <motion.div
                key="stream-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded bg-primary/10 text-primary text-xs font-semibold">
                    {selectedCategory} &gt; {selectedSubOption}
                  </div>
                  <span className="text-sm text-muted-foreground">Choose stream</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {["Science", "Arts", "Commerce"].map((stream) => (
                    <button
                      key={stream}
                      onClick={() => handleStreamClick(stream)}
                      className="p-6 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-center font-bold text-base text-foreground active:scale-95 transform-gpu transition-all hover:scale-[1.02] duration-200"
                    >
                      {stream}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Standard Step: board_selection */}
            {currentStep === "board_selection" && (
              <motion.div
                key="board-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{selectedCategory}</span>
                  <span className="text-muted-foreground/60">&gt;</span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{selectedSubOption}</span>
                  {selectedStream && (
                    <>
                      <span className="text-muted-foreground/60">&gt;</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{selectedStream}</span>
                    </>
                  )}
                </div>

                {selectedCategory === "Olympiads" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                    {getOlympiadList().map((oly) => (
                      <button
                        key={oly}
                        onClick={() => handleBoardClick(oly)}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-left text-sm text-foreground hover:scale-[1.01] active:scale-95 transform-gpu transition-all duration-200 flex items-start gap-2"
                      >
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{oly}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {boardsList.map((board) => (
                      <button
                        key={board}
                        onClick={() => handleBoardClick(board)}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-center font-medium text-sm text-foreground hover:scale-[1.02] active:scale-95 transform-gpu transition-all duration-200"
                      >
                        {board}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Standard Step: custom_input */}
            {currentStep === "custom_input" && (
              <motion.div
                key="custom-step"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={stepTransition}
                className="max-w-md mx-auto py-8"
              >
                <form onSubmit={handleCustomEdTechSubmit} className="space-y-6">
                  <div className="text-center space-y-2">
                    <HelpCircle className="h-12 w-12 mx-auto text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Custom Platform Name</h3>
                    <p className="text-xs text-muted-foreground">
                      Please write the name of your Ed-tech platform below.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      autoFocus
                      required
                      placeholder="e.g. My Coaching Institute"
                      value={customEdTech}
                      onChange={(e) => setCustomEdTech(e.target.value)}
                      className="h-12 text-sm bg-muted border-border"
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={!customEdTech.trim()}
                      className="w-full h-12 text-sm font-semibold"
                    >
                      Confirm and Complete
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
