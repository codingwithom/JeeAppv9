import React from "react";
import { Check, X, Sparkles, Delete, RotateCcw, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichMathContent } from "./RichMathContent";

export type QuestionCategory = "mcq" | "multiple_mcq" | "numerical";

export function getQuestionCategory(q: any): QuestionCategory {
  if (!q) return "mcq";

  // 1. Check explicit type, group key, or group title
  const typeStr = (q.type || q.groupKey || q.groupTitle || "").toLowerCase();
  if (typeStr === "integer" || typeStr === "numerical" || typeStr.includes("numerical") || typeStr.includes("integer")) {
    return "numerical";
  }
  if (typeStr === "mcqm" || typeStr.includes("more than one") || typeStr.includes("multiple") || typeStr.includes("one or more")) {
    return "multiple_mcq";
  }
  if (typeStr === "mcq" || typeStr.includes("single correct") || typeStr.includes("mcq")) {
    return "mcq";
  }

  // 2. Check options array length if type was not explicitly set
  const options = q.options || q.question?.en?.options || [];
  if (options && options.length > 0) {
    const correctOptions = q.correct_options || q.question?.en?.correct_options || q.question?.en?.correctOptions || [];
    if (correctOptions.length > 1) {
      return "multiple_mcq";
    }
    return "mcq";
  }

  // 3. If no options are present, check if answer or correct_options is numerical
  const rawAns = q.answer ?? q.correct_options?.[0] ?? q.question?.en?.answer ?? q.question?.en?.correct_options?.[0];
  if (rawAns !== undefined && rawAns !== null) {
    const trimmed = String(rawAns).trim();
    if (trimmed.length > 0 && !["A", "B", "C", "D", "a", "b", "c", "d"].includes(trimmed) && !isNaN(Number(trimmed))) {
      return "numerical";
    }
  }

  // 4. Default to mcq
  return "mcq";
}

interface QuestionInteractiveAreaProps {
  question: any;
  userSelectedOption: string | null;
  selectedOptionsList: string[];
  numericalInput: string;
  isChecked: boolean;
  isSolutionVisible: boolean;
  isLoading?: boolean;
  onSelectOption: (id: string) => void;
  onToggleMultiOption: (id: string) => void;
  onChangeNumerical: (val: string) => void;
  onCheckAnswer: () => void;
  onToggleSolution: () => void;
}

export function QuestionInteractiveArea({
  question,
  userSelectedOption,
  selectedOptionsList,
  numericalInput,
  isChecked,
  isSolutionVisible,
  isLoading = false,
  onSelectOption,
  onToggleMultiOption,
  onChangeNumerical,
  onCheckAnswer,
  onToggleSolution
}: QuestionInteractiveAreaProps) {
  const category = getQuestionCategory(question);

  const qBody = question?.question?.en?.content || question?.content || "";
  const options: any[] = question?.question?.en?.options || question?.options || [];
  const correctOptions: string[] = question?.question?.en?.correct_options || question?.question?.en?.correctOptions || question?.correct_options || [];
  const officialAnswer = question?.question?.en?.answer ?? question?.answer ?? (correctOptions.length > 0 ? correctOptions[0] : null);
  const explanation = question?.question?.en?.explanation || question?.explanation || "";

  // Marks configuration
  const marks = question?.marks || 4;
  const negMarks = question?.negMarks !== undefined 
    ? question.negMarks 
    : (category === "multiple_mcq" ? 2 : category === "numerical" ? 0 : 1);

  // Keypad click for numerical input
  const handleKeypadPress = (val: string) => {
    if (isChecked) return;
    if (val === "CLEAR") {
      onChangeNumerical("");
    } else if (val === "BACKSPACE") {
      onChangeNumerical(numericalInput.slice(0, -1));
    } else if (val === ".") {
      if (!numericalInput.includes(".")) {
        onChangeNumerical(numericalInput ? numericalInput + "." : "0.");
      }
    } else if (val === "-") {
      if (numericalInput.startsWith("-")) {
        onChangeNumerical(numericalInput.slice(1));
      } else {
        onChangeNumerical("-" + numericalInput);
      }
    } else {
      // Digit
      onChangeNumerical(numericalInput + val);
    }
  };

  // Check numerical correctness
  const isNumericalCorrect = React.useMemo(() => {
    if (!isChecked || category !== "numerical" || officialAnswer === null || officialAnswer === undefined) return null;
    const userNum = parseFloat(numericalInput.trim());
    const targetNum = parseFloat(String(officialAnswer).trim());
    if (!isNaN(userNum) && !isNaN(targetNum)) {
      return Math.abs(userNum - targetNum) <= 0.05;
    }
    return numericalInput.trim().toLowerCase() === String(officialAnswer).trim().toLowerCase();
  }, [isChecked, category, numericalInput, officialAnswer]);

  // Multiple MCQ correctness evaluation
  const multiEvaluation = React.useMemo(() => {
    if (!isChecked || category !== "multiple_mcq") return null;
    const correctSet = new Set(correctOptions.map(s => String(s).toUpperCase()));
    const userSet = new Set(selectedOptionsList.map(s => String(s).toUpperCase()));

    let correctSelected = 0;
    let wrongSelected = 0;

    userSet.forEach(opt => {
      if (correctSet.has(opt)) correctSelected++;
      else wrongSelected++;
    });

    const isAllCorrect = correctSelected === correctSet.size && wrongSelected === 0;
    const isPartial = correctSelected > 0 && wrongSelected === 0 && !isAllCorrect;
    const isNegative = wrongSelected > 0;

    let earnedScore = 0;
    if (isAllCorrect) earnedScore = marks;
    else if (isPartial) earnedScore = Math.min(correctSelected, 3);
    else if (isNegative) earnedScore = -negMarks;

    return { isAllCorrect, isPartial, isNegative, earnedScore };
  }, [isChecked, category, correctOptions, selectedOptionsList, marks, negMarks]);

  // Can check answer button be clicked?
  const canCheck = React.useMemo(() => {
    if (isChecked) return false;
    if (category === "mcq") return Boolean(userSelectedOption);
    if (category === "multiple_mcq") return selectedOptionsList.length > 0;
    if (category === "numerical") return numericalInput.trim().length > 0;
    return false;
  }, [isChecked, category, userSelectedOption, selectedOptionsList, numericalInput]);

  return (
    <div className="relative">
      {/* Main Question Card - Instant, Crisp, Zero-Delay */}
      <div className="space-y-6">
        {/* Subtle non-blocking progress bar if background fetching */}
        {isLoading && (
          <div className="h-0.5 w-full bg-primary/20 overflow-hidden rounded-full animate-pulse">
            <div className="h-full bg-primary w-1/2 animate-[shimmer_1s_infinite]" />
          </div>
        )}
        {/* Category Header Badge & Instructions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            {category === "mcq" && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                MCQ (Single Correct)
              </span>
            )}
            {category === "multiple_mcq" && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Multiple Choice (One or More Correct)
              </span>
            )}
            {category === "numerical" && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Numerical / Integer Type
              </span>
            )}

            <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
              {category === "multiple_mcq"
                ? "Select one or more options"
                : category === "numerical"
                ? "Enter numerical or integer value"
                : "Choose one correct option"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              +{marks} Marks
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
              -{negMarks} Marks
            </span>
          </div>
        </div>

        {/* Question Text & Math Formulas */}
        <div className="py-2 text-foreground text-sm sm:text-base leading-relaxed font-normal">
          <RichMathContent content={qBody} />
        </div>

        {/* ── 1. SINGLE MCQ OPTIONS ────────────────────────────────────────── */}
        {category === "mcq" && (
          <div className="space-y-3 pt-2">
            {options.length > 0 ? (
              options.map((opt: any) => {
                const optId = opt.identifier || opt.key;
                const isSelected = userSelectedOption === optId;
                const isCorrectOption = correctOptions.includes(optId);

                let optClass = "border-border/80 bg-card hover:bg-muted/40 text-foreground";
                if (isChecked) {
                  if (isCorrectOption) {
                    optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30";
                  } else if (isSelected && !isCorrectOption) {
                    optClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-2 ring-red-500/30";
                  }
                } else if (isSelected) {
                  optClass = "border-primary bg-primary/5 text-foreground ring-2 ring-primary/30 shadow-xs";
                }

                return (
                  <div
                    key={optId}
                    onClick={() => {
                      if (!isChecked) onSelectOption(optId);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${optClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {optId}
                      </span>
                      <div className="text-sm font-medium flex-1">
                        <RichMathContent content={opt.content} />
                      </div>
                    </div>

                    {isChecked && (
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isCorrectOption ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Correct
                          </span>
                        ) : isSelected ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-xs">
                            <X className="w-3.5 h-3.5 stroke-[3]" /> Your Choice
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            ) : isLoading ? (
              <div className="space-y-2.5 pt-1">
                {["A", "B", "C", "D"].map((optId) => (
                  <div
                    key={optId}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/20 animate-pulse flex items-center gap-3.5"
                  >
                    <span className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {optId}
                    </span>
                    <div className="h-4 bg-muted/60 rounded-md w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {["A", "B", "C", "D"].map((optId) => {
                  const isSelected = userSelectedOption === optId;
                  const isCorrectOption = correctOptions.includes(optId);
                  let optClass = "border-border/80 bg-card hover:bg-muted/40 text-foreground";
                  if (isChecked) {
                    if (isCorrectOption) {
                      optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30";
                    } else if (isSelected && !isCorrectOption) {
                      optClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-2 ring-red-500/30";
                    }
                  } else if (isSelected) {
                    optClass = "border-primary bg-primary/5 text-foreground ring-2 ring-primary/30 shadow-xs";
                  }

                  return (
                    <div
                      key={optId}
                      onClick={() => {
                        if (!isChecked) onSelectOption(optId);
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${optClass}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {optId}
                        </span>
                        <div className="text-sm font-medium flex-1 text-foreground">
                          Option {optId}
                        </div>
                      </div>
                      {isChecked && (
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isCorrectOption ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Correct
                            </span>
                          ) : isSelected ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-xs">
                              <X className="w-3.5 h-3.5 stroke-[3]" /> Your Choice
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 2. MULTIPLE MCQ OPTIONS (One or More Correct) ──────────────────── */}
        {category === "multiple_mcq" && (
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-purple-600" />
              <span>
                <strong>JEE Advanced Multi-Correct:</strong> Select all options you believe are correct. Partial marks awarded for correct subsets.
              </span>
            </div>

            {options.length > 0 ? (
              options.map((opt: any) => {
                const optId = opt.identifier || opt.key;
                const isSelected = selectedOptionsList.includes(optId);
                const isCorrectOption = correctOptions.includes(optId);

                let optClass = "border-border/80 bg-card hover:bg-muted/40 text-foreground";
                if (isChecked) {
                  if (isCorrectOption && isSelected) {
                    optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30";
                  } else if (isCorrectOption && !isSelected) {
                    optClass = "border-emerald-500/70 border-dashed bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200";
                  } else if (isSelected && !isCorrectOption) {
                    optClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-2 ring-red-500/30";
                  }
                } else if (isSelected) {
                  optClass = "border-purple-600 bg-purple-500/10 ring-2 ring-purple-500/30 shadow-xs";
                }

                return (
                  <div
                    key={optId}
                    onClick={() => {
                      if (!isChecked) onToggleMultiOption(optId);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${optClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                          : "border-muted-foreground/40 bg-muted/60 text-muted-foreground"
                      }`}>
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : optId}
                      </div>
                      <div className="text-sm font-medium flex-1">
                        <RichMathContent content={opt.content} />
                      </div>
                    </div>

                    {isChecked && (
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isCorrectOption && isSelected ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Correct
                          </span>
                        ) : isCorrectOption && !isSelected ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-600 text-emerald-600 dark:text-emerald-400">
                            Missed
                          </span>
                        ) : isSelected && !isCorrectOption ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-xs">
                            <X className="w-3.5 h-3.5 stroke-[3]" /> Wrong
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            ) : isLoading ? (
              <div className="space-y-2.5 pt-1">
                {["A", "B", "C", "D"].map((optId) => (
                  <div
                    key={optId}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/20 animate-pulse flex items-center gap-3.5"
                  >
                    <div className="w-7 h-7 rounded-md border border-muted-foreground/40 bg-muted/60 text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {optId}
                    </div>
                    <div className="h-4 bg-muted/60 rounded-md w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {["A", "B", "C", "D"].map((optId) => {
                  const isSelected = selectedOptionsList.includes(optId);
                  const isCorrectOption = correctOptions.includes(optId);

                  let optClass = "border-border/80 bg-card hover:bg-muted/40 text-foreground";
                  if (isChecked) {
                    if (isCorrectOption && isSelected) {
                      optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30";
                    } else if (isCorrectOption && !isSelected) {
                      optClass = "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-dashed";
                    } else if (isSelected && !isCorrectOption) {
                      optClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-2 ring-red-500/30";
                    }
                  } else if (isSelected) {
                    optClass = "border-primary bg-primary/5 text-foreground ring-2 ring-primary/30 shadow-xs";
                  }

                  return (
                    <div
                      key={optId}
                      onClick={() => {
                        if (!isChecked) onToggleMultiOption(optId);
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${optClass}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-xs"
                            : "border-muted-foreground/40 bg-muted/60 text-muted-foreground"
                        }`}>
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : optId}
                        </div>
                        <div className="text-sm font-medium flex-1 text-foreground">
                          Option {optId}
                        </div>
                      </div>

                      {isChecked && (
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isCorrectOption && isSelected ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Correct
                            </span>
                          ) : isCorrectOption && !isSelected ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-600 text-emerald-600 dark:text-emerald-400">
                              Missed
                            </span>
                          ) : isSelected && !isCorrectOption ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-xs">
                              <X className="w-3.5 h-3.5 stroke-[3]" /> Wrong
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isChecked && multiEvaluation && (
              <div className={`p-3.5 rounded-xl border font-semibold text-xs flex items-center justify-between ${
                multiEvaluation.isAllCorrect
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                  : multiEvaluation.isPartial
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-500/40 text-blue-800 dark:text-blue-300"
                  : "bg-red-50 dark:bg-red-950/30 border-red-500/40 text-red-800 dark:text-red-300"
              }`}>
                <span>
                  {multiEvaluation.isAllCorrect
                    ? "🎉 All Correct! Full Marks Awarded"
                    : multiEvaluation.isPartial
                    ? "✓ Partial Correct Answers (No negative marks)"
                    : "✗ Incorrect Selection"}
                </span>
                <span className="font-bold text-sm">
                  {multiEvaluation.earnedScore >= 0 ? `+${multiEvaluation.earnedScore}` : multiEvaluation.earnedScore} Marks
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 3. NUMERICAL / INTEGER TYPE UI (NTA / JEE-Adv Authentic Keypad) ──── */}
        {category === "numerical" && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block">
                    Numerical Value Input
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Type your answer using your keyboard or click the keypad buttons below.
                  </p>
                </div>

                {isChecked && officialAnswer !== null && officialAnswer !== undefined && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                      isNumericalCorrect
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}>
                      {isNumericalCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                      {isNumericalCorrect ? "Correct (+4)" : "Incorrect (0)"}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-muted border border-border text-foreground">
                      Official: <strong>{String(officialAnswer)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Number Input Box */}
              <div className="max-w-md">
                <Input
                  type="text"
                  placeholder="Enter your numerical answer (e.g. 10 or 4.5)"
                  value={numericalInput}
                  disabled={isChecked}
                  onChange={(e) => onChangeNumerical(e.target.value)}
                  className="font-mono text-base sm:text-lg font-bold py-6 px-4 rounded-xl tracking-wider text-foreground bg-background border-2 border-primary/30 focus-visible:border-primary"
                />
              </div>

              {/* On-Screen Numerical Keypad */}
              {!isChecked && (
                <div className="pt-2 max-w-xs space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Virtual CBT Keypad
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "-"].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className="py-2.5 text-sm font-bold rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground transition-all active:scale-95 shadow-2xs"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleKeypadPress("CLEAR")}
                      className="py-2 text-xs font-semibold rounded-xl border border-border bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress("BACKSPACE")}
                      className="py-2 text-xs font-semibold rounded-xl border border-border bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Delete className="w-3.5 h-3.5" /> Backspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Check Answer & Action Controls ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-border/60">
          {!isChecked ? (
            <Button
              onClick={onCheckAnswer}
              disabled={!canCheck}
              className="px-8 py-5 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-95"
            >
              Check Answer
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onToggleSolution}
              className="rounded-xl text-xs gap-2 py-4 px-6 font-semibold"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              {isSolutionVisible ? "Hide Detailed Solution" : "View Detailed Solution"}
            </Button>
          )}
        </div>

        {/* ── Step-by-Step Mathematical Explanation ───────────────────────────── */}
        {isChecked && isSolutionVisible && (
          <div className="space-y-3 pt-4 border-t border-border/60 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Step-by-Step Solution & Explanation
            </div>

            <div className="bg-muted/30 border border-border/80 rounded-2xl p-6 shadow-xs leading-relaxed">
              {explanation ? (
                <RichMathContent content={explanation} />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Official answer verified: <strong>{String(officialAnswer || correctOptions.join(", "))}</strong>. Full detailed solution is loading.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
