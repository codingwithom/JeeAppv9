import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  FileQuestion,
  Flame,
  Layers,
  Sparkles,
  CalendarDays,
  Bookmark,
  BrainCircuit,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import QuestionsPage from "@/pages/QuestionsPage";
import PWPage from "@/pages/PWPage";

type OthersSubView = "hub" | "questions" | "pw";

export default function OthersPage() {
  const [location, navigate] = useLocation();
  const [subView, setSubView] = useState<OthersSubView>("hub");

  // Sync subView with route
  useEffect(() => {
    if (location === "/others/questions" || location === "/questions") {
      setSubView("questions");
    } else if (location === "/others/pw" || location === "/pw") {
      setSubView("pw");
    } else {
      setSubView("hub");
    }
  }, [location]);

  if (subView === "questions") {
    return (
      <div className="animate-in fade-in duration-200">
        <div className="p-4 border-b border-border/60 bg-card/60 backdrop-blur-md">
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
        </div>
        <QuestionsPage />
      </div>
    );
  }

  if (subView === "pw") {
    return <PWPage />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
          <Layers className="w-3.5 h-3.5" />
          Learning Hub &amp; Resources
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
          Study Tools &amp; Curricula
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Access specialized study portals below to track your live Physics Wallah batch syllabus, practice verified JEE question banks, or organize revision materials.
        </p>
      </div>

      {/* Main Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── CARD 1: PHYSICS WALLAH PORTAL ──────────────────────────────────── */}
        <div
          onClick={() => {
            navigate("/pw");
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
                Official Live Tracker
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-2">
                Physics Wallah (PW) Portal
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-500" />
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Live curriculum tracking for all PW batches (Arjuna, Lakshya, Prayas, Yakeen). Follow teacher-wise chapters, official syllabus PDFs, paired DPPs, and class schedules.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                Teacher-Wise Chapters
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                Official PDF Notes
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                DPP Trackers
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                Live Class Timetable
              </span>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
              Launch dedicated PW Tracker
            </span>
            <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm group-hover:shadow-md transition-all">
              Open PW Tracker <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── CARD 2: JEE QUESTIONS PRACTICE ─────────────────────────────────── */}
        <div
          onClick={() => {
            navigate("/questions");
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
                JEE Questions Vault
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Official JEE Main &amp; JEE Advanced practice with shift-wise tests, chapter-wise filters, numerical response keypads, and detailed LaTeX solutions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                JEE Main 2010–2026
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                JEE Advanced
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                172 Chapters
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                Instant Solutions
              </span>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
              Launch Question Practice
            </span>
            <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 shadow-sm group-hover:shadow-md transition-all">
              Open Questions <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Quick Access Utilities */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          More Prep Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            onClick={() => navigate("/calendar")}
            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Calendar &amp; Timetable</h4>
              <p className="text-[11px] text-muted-foreground">Study blocks &amp; tags</p>
            </div>
          </Card>

          <Card
            onClick={() => navigate("/saves")}
            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground group-hover:text-emerald-600 transition-colors">Formula &amp; Saves</h4>
              <p className="text-[11px] text-muted-foreground">Flashcards &amp; bookmarks</p>
            </div>
          </Card>

          <Card
            onClick={() => navigate("/quiz")}
            className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground group-hover:text-purple-600 transition-colors">AI Practice</h4>
              <p className="text-[11px] text-muted-foreground">Adaptive question solver</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
