import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, RotateCcw, Check, X } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
}

const SAMPLE_CARDS: Flashcard[] = [
  { id: "1", front: "Newton's Second Law", back: "F = ma\nThe rate of change of momentum of a body is directly proportional to the force applied.", deck: "Physics" },
  { id: "2", front: "De Broglie Wavelength", back: "λ = h / p\nWhere h is Planck's constant and p is momentum.", deck: "Physics" },
  { id: "3", front: "First Law of Thermodynamics", back: "ΔU = Q - W\nThe change in internal energy equals heat added minus work done by the system.", deck: "Chemistry" },
  { id: "4", front: "Derivative of sin(x)", back: "cos(x)", deck: "Mathematics" },
  { id: "5", front: "Integration by Parts Formula", back: "∫ u dv = uv - ∫ v du", deck: "Mathematics" },
];

export function FlashcardsWidget() {
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [cards] = useState(SAMPLE_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handleDifficulty = (rating: "hard" | "good" | "easy") => {
    console.log(`Card rated: ${rating}`);
    nextCard();
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border flex flex-col items-center max-w-md w-full mx-auto" style={{ minHeight: 400 }}>
      <div className="flex items-center justify-between w-full mb-6">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Spaced Repetition
        </h2>
        <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
          {currentCard?.deck || "Review"}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-4 w-full text-right font-medium">
        Card {currentIndex + 1} of {cards.length}
      </div>

      <div className="relative w-full h-48 perspective-[1000px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentCard?.id + (isFlipped ? "-back" : "-front")}
            initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className={`absolute inset-0 flex items-center justify-center p-6 rounded-2xl border shadow-lg text-center ${isFlipped ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}
            style={{ backfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
          >
            <p className={`text-lg font-medium whitespace-pre-wrap ${isDark ? "text-white" : "text-black"}`}>
              {isFlipped ? currentCard?.back : currentCard?.front}
            </p>
            <div className="absolute bottom-3 text-[10px] text-muted-foreground opacity-50 flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Click to flip
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 w-full opacity-100 transition-opacity">
        {!isFlipped ? (
           <Button className="w-full" onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}>
             Show Answer
           </Button>
        ) : (
          <>
            <Button variant="outline" className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDifficulty("hard"); }}>
              <X className="h-4 w-4 mr-1" /> Hard
            </Button>
            <Button variant="outline" className="flex-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); handleDifficulty("good"); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> Good
            </Button>
            <Button variant="outline" className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); handleDifficulty("easy"); }}>
              <Check className="h-4 w-4 mr-1" /> Easy
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}