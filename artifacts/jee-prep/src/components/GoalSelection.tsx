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
  ChevronLeft, 
  ArrowRight,
  Compass,
  Check,
  Search,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext, SelectedGoal } from "@/context/AppContext";

interface GoalSelectionProps {
  canClose?: boolean;
}

export function GoalSelection({ canClose = false }: GoalSelectionProps) {
  const { selectGoal, setGoalSelectionOpen, selectedGoal } = useAppContext();
  
  // Navigation states: 'root' | 'sub_options' | 'stream_selection' | 'board_selection' | 'custom_input'
  const [currentStep, setCurrentStep] = useState<"root" | "sub_options" | "stream_selection" | "board_selection" | "custom_input">("root");
  
  // Current selections in the wizard
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [customEdTech, setCustomEdTech] = useState("");

  // History tracking for back button navigation
  const [history, setHistory] = useState<Array<{
    step: "root" | "sub_options" | "stream_selection" | "board_selection" | "custom_input";
    category: string | null;
    subOption: string | null;
    stream: string | null;
  }>>([]);

  const navigateTo = (
    step: "root" | "sub_options" | "stream_selection" | "board_selection" | "custom_input",
    category: string | null = selectedCategory,
    subOption: string | null = selectedSubOption,
    stream: string | null = selectedStream
  ) => {
    // Record history
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
  const handleComplete = (displayName: string, path: string[]) => {
    if (!selectedCategory) return;
    
    const goal: SelectedGoal = {
      category: selectedCategory,
      path: path,
      displayName: displayName
    };
    
    selectGoal(goal);
    setGoalSelectionOpen(false);
  };

  // Category Configuration
  const categories = [
    { id: "JEE", name: "IIT-JEE", isPopular: true, icon: Atom, color: "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/15" },
    { id: "NEET", name: "NEET", isPopular: true, icon: Activity, color: "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/15" },
    { id: "UPSC", name: "UPSC", isPopular: true, icon: Building, color: "bg-yellow-500/10 border-yellow-500/20 text-amber-500 hover:bg-yellow-500/15" },
    { id: "Boards", name: "Boards", isPopular: true, icon: GraduationCap, color: "bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500/15" },
    
    { id: "Govt Exam", name: "Govt Exam", icon: Briefcase },
    { id: "School", name: "School", icon: BookOpen },
    { id: "Olympiads", name: "Olympiads", icon: Trophy },
    { id: "CA", name: "CA", icon: Calculator },
    { id: "Banking", name: "Banking", icon: Coins },
    { id: "Skills", name: "Skills", icon: Code },
    { id: "Ed-Tech", name: "Ed-Tech", icon: Sparkles },
    { id: "Digital Courses", name: "Digital Courses", icon: Play },
    { id: "PG Exams", name: "PG Exams", icon: GraduationCap },
    { id: "YouTube courses", name: "YouTube courses", icon: Play }
  ];

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
      // Direct redirect to home
      handleComplete(catId, [catId]);
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
        // Go to board selection directly
        navigateTo("board_selection", selectedCategory, option);
      } else {
        // Class 11 or 12: go to stream selection
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

  // Popular Exams grid
  const popularExams = categories.filter(c => c.isPopular);
  // Other Exams grid
  const otherExams = categories.filter(c => !c.isPopular);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            {(currentStep !== "root" || (canClose && selectedGoal)) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {getHeaderTitle()}
            </h1>
          </div>
          {canClose && selectedGoal && (
            <Button
              variant="ghost"
              onClick={() => setGoalSelectionOpen(false)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {currentStep === "root" && (
              <motion.div
                key="root-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Popular Exams Section */}
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground/80 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" /> Popular Exams
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {popularExams.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.id)}
                          className={`flex flex-col items-center justify-center p-6 rounded-xl border text-center transition-all duration-300 group hover:scale-[1.03] hover:shadow-md ${
                            cat.color || "border-border bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="p-3 rounded-full bg-background mb-3 shadow-sm group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="font-bold text-sm text-foreground">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* All Exams Section */}
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground/80 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Other Exams & Categories
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {otherExams.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.id)}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/20 hover:scale-[1.01] hover:shadow-sm text-left transition-all group"
                        >
                          <div className="p-2.5 rounded-lg bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate">{cat.name}</h3>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Tap to select goal options
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === "sub_options" && (
              <motion.div
                key="sub-options-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
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
                      className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all font-medium text-sm text-center text-foreground hover:scale-[1.02]"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === "stream_selection" && (
              <motion.div
                key="stream-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
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
                      className="p-6 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-center font-bold text-base text-foreground transition-all hover:scale-[1.02]"
                    >
                      {stream}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === "board_selection" && (
              <motion.div
                key="board-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getOlympiadList().map((oly) => (
                      <button
                        key={oly}
                        onClick={() => handleBoardClick(oly)}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-left text-sm text-foreground hover:scale-[1.01] transition-all flex items-start gap-2"
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
                        className="p-4 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-center font-medium text-sm text-foreground hover:scale-[1.02] transition-all"
                      >
                        {board}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === "custom_input" && (
              <motion.div
                key="custom-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
