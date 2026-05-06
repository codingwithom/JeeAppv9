import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function ClockWidget() {
  const { theme } = useAppContext();
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [is24Hour, setIs24Hour] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      
      const hours = is24Hour ? now.getHours() : now.getHours() % 12 || 12;
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      const ampm = is24Hour ? "" : (now.getHours() >= 12 ? "PM" : "AM");

      const timeString = `${hours.toString().padStart(2, "0")}:${minutes}:${seconds}`;
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      setTime(timeString);
      setDate(`${dateString}${ampm ? " " + ampm : ""}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [is24Hour]);

  const bgClass = isDark ? "bg-card" : "bg-white";
  const textClass = isDark ? "text-foreground" : "text-gray-900";
  const mutedClass = isDark ? "text-muted-foreground" : "text-gray-600";
  const buttonBgActive = isDark ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary";
  const buttonBgInactive = isDark ? "bg-muted" : "bg-gray-200";

  return (
    <Card className={`${bgClass} border-border p-6 flex flex-col items-center justify-center min-h-80`}>
      <div className="flex items-center gap-2 mb-6">
        <Clock className={`h-5 w-5 ${mutedClass}`} />
        <h2 className={`text-lg font-semibold ${textClass}`}>Clock</h2>
      </div>

      {/* Digital Clock Display */}
      <div className="text-center space-y-4 flex-1 flex flex-col items-center justify-center">
        <div className={`text-6xl md:text-7xl font-mono font-bold ${textClass} tabular-nums tracking-tight`}>
          {time || "00:00:00"}
        </div>

        <div className={`text-xl md:text-2xl font-medium ${mutedClass}`}>
          {date || "Loading..."}
        </div>

        {/* 12/24 Hour Toggle */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => setIs24Hour(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !is24Hour ? buttonBgActive : buttonBgInactive
            } ${!is24Hour ? "" : mutedClass}`}
          >
            12H
          </button>
          <button
            onClick={() => setIs24Hour(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              is24Hour ? buttonBgActive : buttonBgInactive
            } ${is24Hour ? "" : mutedClass}`}
          >
            24H
          </button>
        </div>
      </div>
    </Card>
  );
}
