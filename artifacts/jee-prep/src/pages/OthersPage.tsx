import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  Layers, 
  FileQuestion, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Flame, 
  Atom, 
  Download, 
  ExternalLink, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Bookmark, 
  FileText, 
  Video, 
  ChevronRight,
  Zap,
  Award,
  Calendar,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import QuestionsPage from "@/pages/QuestionsPage";

type OthersSubView = "hub" | "questions" | "pw";

interface PWResource {
  id: string;
  title: string;
  subject: "Physics" | "Chemistry" | "Mathematics";
  batch: "Manzil" | "Lakshya" | "Prayas" | "Arjuna" | "All";
  category: "DPP" | "Notes" | "Formula Book" | "One-Shot Lecture" | "Mind Map";
  faculty?: string;
  chapter: string;
  durationOrPages: string;
  description: string;
  link?: string;
  type: "pdf" | "video" | "practice";
}

const PW_RESOURCES: PWResource[] = [
  // Physics Resources
  {
    id: "pw-phy-1",
    title: "Mechanics & Kinematics High-Yield Mind Map",
    subject: "Physics",
    batch: "Manzil",
    category: "Mind Map",
    faculty: "Rajwant Sir",
    chapter: "Kinematics & Laws of Motion",
    durationOrPages: "14 Pages",
    description: "Complete formula chart, projectile motion shortcuts, and constrained motion pulley tricks.",
    type: "pdf"
  },
  {
    id: "pw-phy-2",
    title: "Electrodynamics & Gauss Law Super Notes",
    subject: "Physics",
    batch: "Lakshya",
    category: "Notes",
    faculty: "Saleem Sir",
    chapter: "Electrostatics & Capacitance",
    durationOrPages: "28 Pages",
    description: "Detailed derivations for electric field, potential distributions, capacitor dielectric combinations, and boundary conditions.",
    type: "pdf"
  },
  {
    id: "pw-phy-3",
    title: "Rotational Motion Advanced DPP with Solutions",
    subject: "Physics",
    batch: "Prayas",
    category: "DPP",
    faculty: "Rajwant Sir",
    chapter: "Rotational Dynamics",
    durationOrPages: "25 Questions",
    description: "High-level problems on moment of inertia, rolling without slipping, and angular momentum conservation.",
    type: "practice"
  },
  {
    id: "pw-phy-4",
    title: "Current Electricity & Circuits One-Shot Marathon",
    subject: "Physics",
    batch: "Manzil",
    category: "One-Shot Lecture",
    faculty: "MR Sir",
    chapter: "Current Electricity",
    durationOrPages: "4h 15m",
    description: "Complete revision covering Kirchhoff rules, potentiometer, meter bridge, RC transient circuits with 30+ PYQs.",
    type: "video"
  },
  {
    id: "pw-phy-5",
    title: "Modern Physics & Dual Nature Complete Formula Book",
    subject: "Physics",
    batch: "All",
    category: "Formula Book",
    faculty: "Rajwant Sir",
    chapter: "Modern Physics",
    durationOrPages: "10 Pages",
    description: "Photoelectric equation, de Broglie wavelength, Bohr model transitions, and nuclear decay kinetics formulas.",
    type: "pdf"
  },

  // Chemistry Resources
  {
    id: "pw-chem-1",
    title: "Organic Chemistry All Reagents & Reaction Mechanisms",
    subject: "Chemistry",
    batch: "Manzil",
    category: "Formula Book",
    faculty: "Pankaj Sir",
    chapter: "Complete Organic Chemistry",
    durationOrPages: "36 Pages",
    description: "Comprehensive chart of oxidizing & reducing agents, Grignard reagents, named reactions (Aldol, Cannizzaro, Sandmeyer).",
    type: "pdf"
  },
  {
    id: "pw-chem-2",
    title: "Chemical Bonding & Molecular Orbital Theory (MOT) Notes",
    subject: "Chemistry",
    batch: "Arjuna",
    category: "Notes",
    faculty: "Amit Mahajan Sir",
    chapter: "Chemical Bonding",
    durationOrPages: "22 Pages",
    description: "VSEPR geometries, dipole moment comparison, bond order calculation tricks, and hydrogen bonding anomalies.",
    type: "pdf"
  },
  {
    id: "pw-chem-3",
    title: "Thermodynamics & Thermochemistry Advanced DPP",
    subject: "Chemistry",
    batch: "Prayas",
    category: "DPP",
    faculty: "Faisal Sir",
    chapter: "Thermodynamics",
    durationOrPages: "30 Questions",
    description: "Problems on state functions, enthalpy calculations, entropy criteria, Gibbs free energy spontaneity, and Hess law.",
    type: "practice"
  },
  {
    id: "pw-chem-4",
    title: "Coordination Compounds & CFT One-Shot Marathon",
    subject: "Chemistry",
    batch: "Manzil",
    category: "One-Shot Lecture",
    faculty: "Amit Mahajan Sir",
    chapter: "Coordination Chemistry",
    durationOrPages: "3h 45m",
    description: "Crystal field splitting, color and magnetic moment, isomerism (optical & geometrical), and Werner theory.",
    type: "video"
  },
  {
    id: "pw-chem-5",
    title: "Inorganic Chemistry NCERT High-Yield Line-by-Line Mind Map",
    subject: "Chemistry",
    batch: "All",
    category: "Mind Map",
    faculty: "Pankaj Sir",
    chapter: "d- and f-Block Elements & p-Block",
    durationOrPages: "18 Pages",
    description: "Key trends in oxidation states, catalytic properties, interstitial compounds, and potassium dichromate / permanganate reactions.",
    type: "pdf"
  },

  // Mathematics Resources
  {
    id: "pw-math-1",
    title: "Definite Integration & Area Under Curves Master Notes",
    subject: "Mathematics",
    batch: "Lakshya",
    category: "Notes",
    faculty: "Sachin Sir",
    chapter: "Definite Integrals & AUC",
    durationOrPages: "32 Pages",
    description: "King property, Leibniz rule, periodicity properties, reduction formulas, and tricky area enclosed calculations.",
    type: "pdf"
  },
  {
    id: "pw-math-2",
    title: "Coordinate Geometry (Conics & Circles) All Formulae Chart",
    subject: "Mathematics",
    batch: "Manzil",
    category: "Formula Book",
    faculty: "Ashish Agarwal Sir",
    chapter: "Circles, Parabola, Ellipse, Hyperbola",
    durationOrPages: "16 Pages",
    description: "Standard equations, tangents, normals, director circles, auxiliary circles, and focal distance properties.",
    type: "pdf"
  },
  {
    id: "pw-math-3",
    title: "Vectors & 3D Geometry Advanced Practice DPP",
    subject: "Mathematics",
    batch: "Prayas",
    category: "DPP",
    faculty: "Sachin Sir",
    chapter: "Vector Algebra & 3D Geometry",
    durationOrPages: "25 Questions",
    description: "Scalar and vector triple products, shortest distance between skew lines, coplanarity, and projection problems.",
    type: "practice"
  },
  {
    id: "pw-math-4",
    title: "Calculus (Differential & Integral) Marathon Revision",
    subject: "Mathematics",
    batch: "Manzil",
    category: "One-Shot Lecture",
    faculty: "Sachin Sir",
    chapter: "Differential Calculus",
    durationOrPages: "5h 20m",
    description: "Continuity, differentiability, Rolle's & LMVT theorems, tangents and normals, maxima and minima with JEE Advanced PYQs.",
    type: "video"
  },
  {
    id: "pw-math-5",
    title: "Matrices & Determinants Rapid Mind Map",
    subject: "Mathematics",
    batch: "Arjuna",
    category: "Mind Map",
    faculty: "Ashish Sir",
    chapter: "Matrices & Determinants",
    durationOrPages: "8 Pages",
    description: "System of linear equations (Cramer's rule), adjoint and inverse properties, Cayley-Hamilton theorem, and special matrices.",
    type: "pdf"
  }
];

export default function OthersPage() {
  const [location, navigate] = useLocation();
  const [subView, setSubView] = useState<OthersSubView>("hub");

  // PW Portal Filters
  const [pwSubject, setPwSubject] = useState<string>("All");
  const [pwBatch, setPwBatch] = useState<string>("All");
  const [pwCategory, setPwCategory] = useState<string>("All");
  const [pwSearch, setPwSearch] = useState<string>("");

  // Sync with URL query or path
  useEffect(() => {
    if (location === "/others/questions" || location === "/questions") {
      setSubView("questions");
    } else if (location === "/others/pw" || location === "/pw") {
      setSubView("pw");
    } else {
      setSubView("hub");
    }
  }, [location]);

  // Filtered PW Resources
  const filteredPwResources = PW_RESOURCES.filter((res) => {
    if (pwSubject !== "All" && res.subject !== pwSubject) return false;
    if (pwBatch !== "All" && res.batch !== pwBatch && res.batch !== "All") return false;
    if (pwCategory !== "All" && res.category !== pwCategory) return false;
    if (pwSearch.trim().length > 0) {
      const q = pwSearch.toLowerCase();
      const match = res.title.toLowerCase().includes(q) ||
                    res.chapter.toLowerCase().includes(q) ||
                    (res.faculty && res.faculty.toLowerCase().includes(q)) ||
                    res.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="min-h-full bg-background text-foreground transition-colors">
      {/* ── Sub-view 1: Questions View ────────────────────────────────────────── */}
      {subView === "questions" && (
        <div>
          {/* Top Bar with Back Button */}
          <div className="bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubView("hub");
                navigate("/others");
              }}
              className="gap-2 text-xs font-semibold rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Others
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                JEE Main & Advanced PYQ System
              </span>
            </div>
          </div>
          {/* Questions Full Component */}
          <QuestionsPage />
        </div>
      )}

      {/* ── Sub-view 2: Dedicated Physics Wallah (PW) Portal ────────────────── */}
      {subView === "pw" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
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
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Physics Wallah (PW) Portal
              </span>
            </div>
          </div>

          {/* PW Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-primary/10 to-purple-500/10 border border-amber-500/20 p-6 sm:p-8">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-xs font-bold text-foreground shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Complete PW Study Ecosystem
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
                Physics Wallah <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">JEE Vault</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Curated lecture notes, Daily Practice Problems (DPP), formula cheat sheets, and marathon one-shots from Lakshya, Prayas, Arjuna, and Manzil batches.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="space-y-3 bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search PW notes, chapters, faculty (e.g. Rajwant, Calculus)..."
                  value={pwSearch}
                  onChange={(e) => setPwSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs bg-background border-border"
                />
              </div>

              {/* Subject Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["All", "Physics", "Chemistry", "Mathematics"].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setPwSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      pwSubject === sub
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Batch and Category */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium text-[11px] flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3 h-3" /> Batch:
              </span>
              {["All", "Manzil", "Lakshya", "Prayas", "Arjuna"].map((b) => (
                <button
                  key={b}
                  onClick={() => setPwBatch(b)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    pwBatch === b
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {b}
                </button>
              ))}

              <span className="text-muted-foreground font-medium text-[11px] flex items-center gap-1 ml-auto mr-1">
                Category:
              </span>
              {["All", "DPP", "Notes", "Formula Book", "Mind Map", "One-Shot Lecture"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPwCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    pwCategory === cat
                      ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPwResources.map((res) => (
              <Card
                key={res.id}
                className="p-5 rounded-2xl border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      res.subject === "Physics"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : res.subject === "Chemistry"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    }`}>
                      {res.subject}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                        {res.batch}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/5 text-primary border border-primary/20">
                        {res.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {res.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {res.faculty && (
                      <span className="font-medium text-foreground">{res.faculty}</span>
                    )}
                    <span>•</span>
                    <span>{res.durationOrPages}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (res.type === "pdf") {
                        navigate("/pdf");
                      } else if (res.type === "video") {
                        navigate("/video");
                      } else {
                        setSubView("questions");
                      }
                    }}
                    className="h-8 px-3 rounded-lg text-xs gap-1.5 font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                  >
                    {res.type === "pdf" ? (
                      <>
                        <FileText className="w-3.5 h-3.5" /> View PDF
                      </>
                    ) : res.type === "video" ? (
                      <>
                        <Video className="w-3.5 h-3.5" /> Watch
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" /> Practice
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredPwResources.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10 space-y-3">
              <Atom className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No resources match your filters</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try resetting your subject, batch, or search keyword to see more Physics Wallah resources.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPwSubject("All");
                  setPwBatch("All");
                  setPwCategory("All");
                  setPwSearch("");
                }}
                className="rounded-xl text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Sub-view 3: Main "Others" Hub Landing Page ─────────────────────── */}
      {subView === "hub" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              Learning Hub & Utilities
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Others &amp; Resources
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Select a module below to practice official JEE Main &amp; Advanced previous year questions or access complete Physics Wallah study vaults.
            </p>
          </div>

          {/* Cards Grid: Option 1 (Questions) & Option 2 (PW) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── OPTION 1: QUESTIONS ────────────────────────────────────── */}
            <div
              onClick={() => {
                setSubView("questions");
                navigate("/others/questions");
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
                    1. JEE Questions
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Official JEE Main &amp; JEE Advanced practice with paper-wise shifts, chapter-wise filters, CBT numerical keypads, and step-by-step LaTeX derivations.
                  </p>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    JEE Main 2010–2026
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    JEE Advanced Papers
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    172 Chapters
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Zero Delay 0ms CDN
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap to launch Question Practice
                </span>
                <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 shadow-sm group-hover:shadow-md transition-all">
                  Open Questions <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ── OPTION 2: PHYSICS WALLAH (PW) ─────────────────────────── */}
            <div
              onClick={() => {
                setSubView("pw");
                navigate("/others/pw");
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
                    Batches &amp; Notes
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-2">
                    2. PW (Physics Wallah)
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-500" />
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Exclusive Physics Wallah study materials, Daily Practice Problems (DPP), Lakshya, Prayas, Arjuna, and Manzil one-shot revision marathon notes.
                  </p>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Lakshya &amp; Prayas
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Manzil Series
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    DPP Sheets &amp; Solutions
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Faculty Mind Maps
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap to explore PW Resources
                </span>
                <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm group-hover:shadow-md transition-all">
                  Open PW Hub <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
