import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FlipUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center mx-2">
    <div
      className="relative w-16 h-20 bg-muted rounded-lg flex items-center justify-center text-3xl font-bold text-foreground shadow-sm overflow-hidden border border-border"
      style={{ perspective: "400px" }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: "60%", opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: "-60%", opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="absolute select-none"
          style={{ transformOrigin: "center" }}
        >
          {value.toString().padStart(2, "0")}
        </motion.div>
      </AnimatePresence>
    </div>
    <span className="text-xs text-muted-foreground mt-2 font-medium tracking-wider uppercase">
      {label}
    </span>
  </div>
);

export function CountdownTimer() {
  const [targetDate, setTargetDate] = useLocalStorage("target_date", "2028-04-06T00:00:00");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(targetDate);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleSave = () => {
    setTargetDate(editValue);
    setIsEditing(false);
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
          JEE 2028 Countdown
        </h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 text-xs bg-muted border-border"
              data-testid="input-target-date"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleSave}
              data-testid="button-save-date"
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-50 hover:opacity-100"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-date"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex justify-center relative z-10">
        <FlipUnit value={timeLeft.days} label="Days" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.hours} label="Hours" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.minutes} label="Minutes" />
        <span className="text-4xl text-muted-foreground/40 font-light mt-4">:</span>
        <FlipUnit value={timeLeft.seconds} label="Seconds" />
      </div>
    </Card>
  );
}
