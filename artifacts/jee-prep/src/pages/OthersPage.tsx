import React, { useState, useEffect, useMemo } from "react";
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
  Check, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Bookmark, 
  FileText, 
  Video, 
  ChevronRight, 
  ChevronDown, 
  Zap, 
  Award, 
  Calendar, 
  SlidersHorizontal, 
  Search, 
  RotateCcw, 
  CheckSquare, 
  Square,
  TrendingUp,
  ListTodo,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import QuestionsPage from "@/pages/QuestionsPage";
import { idbGet, idbSet } from "@/lib/idb";

type OthersSubView = "hub" | "questions" | "pw";

interface PWLecture {
  id: string;
  title: string;
  type: "lecture" | "dpp" | "revision" | "doubt";
  duration?: string;
  date?: string;
}

interface PWChapter {
  id: string;
  title: string;
  lectures: PWLecture[];
}

interface PWSubject {
  name: string;
  faculty?: string;
  chapters: PWChapter[];
}

interface PWRemoteSubject {
  id: string;
  name: string;
  faculty?: string;
}

interface PWBatch {
  id: string;
  name: string;
  target: string;
  description: string;
  subjects: PWSubject[];
}

interface PWCatalogBatch {
  batch_id: string;
  name: string;
  byName?: string;
  exam?: string;
  class?: string;
  language?: string;
  start_date?: string;
  end_date?: string;
}

const PW_CATALOG_URL = "https://studystark.github.io/batches/batches.json";
const PW_DETAILS_URL = "https://vidcloud.eu.org/api/v3/batches";
const PW_TOPICS_URL = "https://vidcloud.eu.org/api/v2/batches";
const PW_TOKEN_URL = "https://vidcloud.eu.org/generate_token.php";
const EMPTY_PW_BATCH: PWBatch = {
  id: "",
  name: "Physics Wallah batches",
  target: "Select a batch",
  description: "Live batch metadata will appear here.",
  subjects: [],
};

async function fetchBatchMetadata(batchId: string): Promise<PWSubject[]> {
  const response = await fetch(`/api/pw-metadata?batchId=${encodeURIComponent(batchId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`PW metadata unavailable (${response.status})`);
  const payload = await response.json() as { subjects?: PWSubject[] };
  return Array.isArray(payload.subjects) ? payload.subjects : [];
}

function catalogToBatch(batch: PWCatalogBatch): PWBatch {
  return {
    id: batch.batch_id,
    name: batch.name,
    target: [batch.class, batch.exam].filter(Boolean).join(" • ") || "Physics Wallah batch",
    description: batch.byName || `${batch.language || ""} batch metadata from the public catalog`.trim(),
    subjects: [],
  };
}

function extractCatalogBatches(payload: unknown): PWCatalogBatch[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.vidyapeeth_batches, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is PWCatalogBatch => {
        if (!item || typeof item !== "object") return false;
        const value = item as Record<string, unknown>;
        return typeof value.batch_id === "string" && typeof value.name === "string";
      });
    }
  }
  return [];
}

async function fetchPublicToken(): Promise<string> {
  const response = await fetch(PW_TOKEN_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Public metadata token unavailable");
  const payload = await response.json() as { access_token?: string; token?: string };
  const token = payload.access_token || payload.token;
  if (!token) throw new Error("Public metadata token missing");
  return token;
}

async function fetchBatchDetails(batchId: string): Promise<PWRemoteSubject[]> {
  const response = await fetch(`${PW_DETAILS_URL}/${encodeURIComponent(batchId)}/details?type=EXPLORE_LEAD`);
  if (!response.ok) throw new Error(`Batch details unavailable (${response.status})`);
  const payload = await response.json() as { data?: { subjects?: unknown } };
  if (!Array.isArray(payload.data?.subjects)) return [];

  return payload.data.subjects.flatMap((item: any): PWRemoteSubject[] => {
    if (!item || typeof item !== "object") return [];
    const subjectName = typeof item.subject === "string" ? item.subject : "Subject";
    const faculty = Array.isArray(item.teacherIds)
      ? item.teacherIds.map((teacher: any) => [teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" & ")
      : undefined;
    return typeof item._id === "string" ? [{ id: item._id, name: subjectName, faculty }] : [];
  });
}

async function fetchSubjectTopics(batchId: string, subject: PWRemoteSubject, token: string): Promise<PWSubject> {
  const topics: PWChapter[] = [];
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (topics.length < totalCount && page <= 100) {
    const response = await fetch(
      `${PW_TOPICS_URL}/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subject.id)}/topics?page=${page}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Topic metadata unavailable (${response.status})`);
    const payload = await response.json() as {
      data?: Array<{ _id?: string; name?: string }>;
      paginate?: { totalCount?: number; limit?: number };
    };
    const pageTopics = (payload.data || []).filter(topic => typeof topic.name === "string");
    pageTopics.forEach(topic => {
      const id = topic._id || `${subject.id}-${topics.length}`;
      topics.push({
        id: `${subject.id}-${id}`,
        title: topic.name as string,
        lectures: [{ id: `${subject.id}-${id}-item`, title: topic.name as string, type: "lecture" }],
      });
    });
    totalCount = payload.paginate?.totalCount || topics.length;
    if (pageTopics.length === 0) break;
    page += 1;
  }

  return { name: subject.name, faculty: subject.faculty, chapters: topics };
}

// Fallback initial dataset in case offline or CDN loading
const DEFAULT_PW_BATCHES: PWBatch[] = [
  {
    id: "arjuna-jee-2026",
    name: "Arjuna JEE 2026",
    target: "Class 11 (JEE Main & Advanced 2027)",
    description: "Complete foundational Class 11 curriculum with theory lectures and daily problem sheets (DPPs).",
    subjects: [
      {
        name: "Physics",
        faculty: "Rajwant Sir & Saleem Sir",
        chapters: [
          {
            id: "arj-phy-1",
            title: "Units, Dimensions & Measurements",
            lectures: [
              { id: "arj-phy-1-1", title: "Lec 01: Physical Quantities, Fundamental & Derived Units", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-1-2", title: "Lec 02: Dimensional Formulae & Principle of Homogeneity", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-1-3", title: "Lec 03: Applications of Dimensional Analysis & Limitations", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-1-4", title: "Lec 04: Errors in Measurement, Vernier Calliper & Screw Gauge", type: "lecture", duration: "2h 00m" },
              { id: "arj-phy-1-dpp1", title: "DPP 01: Units & Dimensions (20 Questions)", type: "dpp", duration: "45m" },
              { id: "arj-phy-1-dpp2", title: "DPP 02: Errors & Instruments Analysis (25 Questions)", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-2",
            title: "Mathematical Tools & Vectors",
            lectures: [
              { id: "arj-phy-2-1", title: "Lec 01: Coordinate Systems, Trigonometry & Graphs", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-2-2", title: "Lec 02: Differentiation Basics & Maxima/Minima", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-2-3", title: "Lec 03: Integration Fundamentals & Definite Integrals in Physics", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-2-4", title: "Lec 04: Vector Addition, Triangle Law & Parallelogram Law", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-2-5", title: "Lec 05: Resolution of Vectors & Unit Vectors in 2D/3D", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-2-6", title: "Lec 06: Dot Product, Cross Product & Applications", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-2-dpp1", title: "DPP 01: Basic Calculus in Physics", type: "dpp", duration: "40m" },
              { id: "arj-phy-2-dpp2", title: "DPP 02: Vector Algebra & Products", type: "dpp", duration: "45m" }
            ]
          },
          {
            id: "arj-phy-3",
            title: "Motion in a Straight Line (Kinematics 1D)",
            lectures: [
              { id: "arj-phy-3-1", title: "Lec 01: Distance, Displacement, Average Speed & Velocity", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-3-2", title: "Lec 02: Instantaneous Velocity, Acceleration & Calculus Problems", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-3-3", title: "Lec 03: Equations of Motion for Uniform Acceleration", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-3-4", title: "Lec 04: Motion Under Gravity & Stopping Distance", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-3-5", title: "Lec 05: Motion Graphs (s-t, v-t, a-t Transformation)", type: "lecture", duration: "2h 05m" },
              { id: "arj-phy-3-dpp1", title: "DPP 01: Uniform & Non-Uniform 1D Motion", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-4",
            title: "Motion in a Plane (Kinematics 2D & Projectile)",
            lectures: [
              { id: "arj-phy-4-1", title: "Lec 01: 2D Kinematics Equations & Position Vectors", type: "lecture", duration: "1h 40m" },
              { id: "arj-phy-4-2", title: "Lec 02: Ground to Ground Projectile Motion & Formulae", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-4-3", title: "Lec 03: Equation of Trajectory & Radius of Curvature", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-4-4", title: "Lec 04: Horizontal Projectile & Projection from a Tower", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-4-5", title: "Lec 05: Projectile on an Inclined Plane", type: "lecture", duration: "2h 00m" },
              { id: "arj-phy-4-6", title: "Lec 06: Relative Motion in 1D & River-Boat Problems", type: "lecture", duration: "2h 10m" },
              { id: "arj-phy-4-7", title: "Lec 07: Rain-Man Problems & Aircraft Wind Problems", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-4-dpp1", title: "DPP 01: Projectile Motion Problems", type: "dpp", duration: "45m" },
              { id: "arj-phy-4-dpp2", title: "DPP 02: Relative Motion in 2D", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-phy-5",
            title: "Newton's Laws of Motion (NLM) & Friction",
            lectures: [
              { id: "arj-phy-5-1", title: "Lec 01: Inertia, Momentum & Newton's Second Law", type: "lecture", duration: "1h 45m" },
              { id: "arj-phy-5-2", title: "Lec 02: Free Body Diagrams (FBD) & Normal Reaction", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-5-3", title: "Lec 03: Tension in Strings & Smooth Pulley Systems", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-5-4", title: "Lec 04: Constrained Motion (String & Wedge Constraints)", type: "lecture", duration: "2h 05m" },
              { id: "arj-phy-5-5", title: "Lec 05: Pseudo Force & Non-Inertial Reference Frames", type: "lecture", duration: "1h 50m" },
              { id: "arj-phy-5-6", title: "Lec 06: Friction Fundamentals, Static vs Kinetic Friction", type: "lecture", duration: "1h 55m" },
              { id: "arj-phy-5-7", title: "Lec 07: Two-Block Problems & Critical Acceleration", type: "lecture", duration: "2h 15m" },
              { id: "arj-phy-5-dpp1", title: "DPP 01: Pulley & Constraint Problems", type: "dpp", duration: "50m" },
              { id: "arj-phy-5-dpp2", title: "DPP 02: Friction & Multi-Block Systems", type: "dpp", duration: "55m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Amit Mahajan Sir & Pankaj Sir",
        chapters: [
          {
            id: "arj-chem-1",
            title: "Some Basic Concepts of Chemistry (Mole Concept)",
            lectures: [
              { id: "arj-chem-1-1", title: "Lec 01: Introduction, Matter Classification & Laws of Chemical Combination", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-1-2", title: "Lec 02: Mole Definition, Atomic & Molecular Masses, Avogadro Number", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-1-3", title: "Lec 03: Percentage Composition, Empirical & Molecular Formula", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-1-4", title: "Lec 04: Stoichiometry & Limiting Reagent Concept", type: "lecture", duration: "2h 00m" },
              { id: "arj-chem-1-5", title: "Lec 05: Concentration Terms (Molarity, Molality, Mole Fraction, ppm)", type: "lecture", duration: "2h 10m" },
              { id: "arj-chem-1-dpp1", title: "DPP 01: Mole Concept & Limiting Reagent", type: "dpp", duration: "45m" },
              { id: "arj-chem-1-dpp2", title: "DPP 02: Concentration Terms & Mixing Problems", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-chem-2",
            title: "Structure of Atom",
            lectures: [
              { id: "arj-chem-2-1", title: "Lec 01: Subatomic Particles & Rutherford Nuclear Model", type: "lecture", duration: "1h 40m" },
              { id: "arj-chem-2-2", title: "Lec 02: Electromagnetic Radiations & Planck's Quantum Theory", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-2-3", title: "Lec 03: Photoelectric Effect & Dual Nature of Light", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-2-4", title: "Lec 04: Bohr's Model of Hydrogen Atom & Line Spectrum", type: "lecture", duration: "2h 00m" },
              { id: "arj-chem-2-5", title: "Lec 05: De Broglie Hypothesis & Heisenberg Uncertainty Principle", type: "lecture", duration: "1h 50m" },
              { id: "arj-chem-2-6", title: "Lec 06: Quantum Numbers (n, l, m, s) & Orbitals Shapes", type: "lecture", duration: "2h 05m" },
              { id: "arj-chem-2-7", title: "Lec 07: Aufbau Principle, Pauli Exclusion & Hund's Rule", type: "lecture", duration: "1h 45m" },
              { id: "arj-chem-2-dpp1", title: "DPP 01: Quantum Theory & Bohr Model", type: "dpp", duration: "45m" },
              { id: "arj-chem-2-dpp2", title: "DPP 02: Quantum Numbers & Electronic Configuration", type: "dpp", duration: "45m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir & Ashish Agarwal Sir",
        chapters: [
          {
            id: "arj-math-1",
            title: "Sets, Relations & Functions",
            lectures: [
              { id: "arj-math-1-1", title: "Lec 01: Set Representation, Subsets & Power Set", type: "lecture", duration: "1h 45m" },
              { id: "arj-math-1-2", title: "Lec 02: Set Operations, Venn Diagrams & Cardinality Problems", type: "lecture", duration: "1h 50m" },
              { id: "arj-math-1-3", title: "Lec 03: Cartesian Product & Relations (Reflexive, Symmetric, Transitive)", type: "lecture", duration: "2h 00m" },
              { id: "arj-math-1-4", title: "Lec 04: Functions Definition, Domain & Range", type: "lecture", duration: "2h 10m" },
              { id: "arj-math-1-5", title: "Lec 05: Classification of Functions (One-One, Onto, Bijective)", type: "lecture", duration: "1h 55m" },
              { id: "arj-math-1-dpp1", title: "DPP 01: Equivalence Relations & Cardinality", type: "dpp", duration: "45m" },
              { id: "arj-math-1-dpp2", title: "DPP 02: Domain & Range Calculation", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "arj-math-2",
            title: "Trigonometric Functions & Identities",
            lectures: [
              { id: "arj-math-2-1", title: "Lec 01: Angle Measurement (Degrees & Radians), Unit Circle", type: "lecture", duration: "1h 45m" },
              { id: "arj-math-2-2", title: "Lec 02: Compound Angle Formulae (sin(A±B), cos(A±B))", type: "lecture", duration: "1h 55m" },
              { id: "arj-math-2-3", title: "Lec 03: Transformation Formulae (Product into Sum & Vice Versa)", type: "lecture", duration: "1h 50m" },
              { id: "arj-math-2-4", title: "Lec 04: Multiple & Submultiple Angles (2A, 3A, A/2)", type: "lecture", duration: "2h 00m" },
              { id: "arj-math-2-5", title: "Lec 05: Trigonometric Equations & General Solutions", type: "lecture", duration: "2h 10m" },
              { id: "arj-math-2-dpp1", title: "DPP 01: Trigonometric Identities & Simplification", type: "dpp", duration: "45m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "lakshya-jee-2026",
    name: "Lakshya JEE 2026",
    target: "Class 12 (JEE Main & Advanced 2026)",
    description: "Complete Class 12 syllabus coverage with advanced problem solving and board synchronization.",
    subjects: [
      {
        name: "Physics",
        faculty: "Saleem Sir & Rajwant Sir",
        chapters: [
          {
            id: "lak-phy-1",
            title: "Electrostatics & Electric Field",
            lectures: [
              { id: "lak-phy-1-1", title: "Lec 01: Electric Charges & Coulomb's Law in Vector Form", type: "lecture", duration: "1h 50m" },
              { id: "lak-phy-1-2", title: "Lec 02: Electric Field & Principle of Superposition", type: "lecture", duration: "1h 55m" },
              { id: "lak-phy-1-3", title: "Lec 03: Electric Dipole, Torque & Potential Energy", type: "lecture", duration: "1h 45m" },
              { id: "lak-phy-1-4", title: "Lec 04: Gauss's Law & Electric Flux Calculations", type: "lecture", duration: "2h 10m" },
              { id: "lak-phy-1-5", title: "Lec 05: Applications of Gauss's Law (Symmetric Distributions)", type: "lecture", duration: "2h 00m" },
              { id: "lak-phy-1-dpp1", title: "DPP 01: Coulomb's Law & Superposition", type: "dpp", duration: "50m" },
              { id: "lak-phy-1-dpp2", title: "DPP 02: Gauss's Law & Flux Applications", type: "dpp", duration: "50m" }
            ]
          },
          {
            id: "lak-phy-2",
            title: "Current Electricity",
            lectures: [
              { id: "lak-phy-2-1", title: "Lec 01: Drift Velocity, Mobility & Ohm's Law Derivation", type: "lecture", duration: "1h 45m" },
              { id: "lak-phy-2-2", title: "Lec 02: Resistance Combinations & Color Coding", type: "lecture", duration: "1h 40m" },
              { id: "lak-phy-2-3", title: "Lec 03: Kirchhoff's Current & Voltage Laws (KCL & KVL)", type: "lecture", duration: "2h 05m" },
              { id: "lak-phy-2-4", title: "Lec 04: Nodal Analysis & Symmetry in Resistor Circuits", type: "lecture", duration: "2h 15m" },
              { id: "lak-phy-2-5", title: "Lec 05: Potentiometer, Meter Bridge & Galvanometer Conversion", type: "lecture", duration: "2h 00m" },
              { id: "lak-phy-2-dpp1", title: "DPP 01: Kirchhoff's Laws & Complex Circuits", type: "dpp", duration: "50m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir & Faisal Sir",
        chapters: [
          {
            id: "lak-chem-1",
            title: "Solutions & Colligative Properties",
            lectures: [
              { id: "lak-chem-1-1", title: "Lec 01: Types of Solutions & Henry's Law Applications", type: "lecture", duration: "1h 45m" },
              { id: "lak-chem-1-2", title: "Lec 02: Raoult's Law for Volatile & Non-Volatile Solutes", type: "lecture", duration: "1h 55m" },
              { id: "lak-chem-1-3", title: "Lec 03: Ideal & Non-Ideal Solutions, Azeotropes", type: "lecture", duration: "1h 50m" },
              { id: "lak-chem-1-4", title: "Lec 04: Colligative Properties (RLVP, Elevation in BP, Depression in FP)", type: "lecture", duration: "2h 15m" },
              { id: "lak-chem-1-5", title: "Lec 05: Osmotic Pressure & Van't Hoff Factor (i)", type: "lecture", duration: "2h 00m" },
              { id: "lak-chem-1-dpp1", title: "DPP 01: Raoult's Law & Colligative Properties", type: "dpp", duration: "45m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir & Ashish Sir",
        chapters: [
          {
            id: "lak-math-1",
            title: "Continuity, Differentiability & Limits",
            lectures: [
              { id: "lak-math-1-1", title: "Lec 01: Limits Recap, L'Hopital's Rule & Expansions", type: "lecture", duration: "1h 50m" },
              { id: "lak-math-1-2", title: "Lec 02: Continuity at a Point & in an Interval", type: "lecture", duration: "1h 55m" },
              { id: "lak-math-1-3", title: "Lec 03: Intermediate Value Theorem & Types of Discontinuity", type: "lecture", duration: "1h 45m" },
              { id: "lak-math-1-4", title: "Lec 04: Differentiability & Geometrical Significance", type: "lecture", duration: "2h 05m" },
              { id: "lak-math-1-dpp1", title: "DPP 01: Continuity & Differentiability", type: "dpp", duration: "50m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "prayas-jee-2026",
    name: "Prayas JEE 2026 (Droppers)",
    target: "Droppers / Repeaters (JEE Main & Advanced 2026)",
    description: "Intensive 11th + 12th complete syllabus coverage with high-speed problem solving.",
    subjects: [
      {
        name: "Physics",
        faculty: "Rajwant Sir & Saleem Sir",
        chapters: [
          {
            id: "pra-phy-1",
            title: "Mechanics Comprehensive Capsule",
            lectures: [
              { id: "pra-phy-1-1", title: "Lec 01: Kinematics 1D & 2D Rapid Problem Solving", type: "lecture", duration: "2h 15m" },
              { id: "pra-phy-1-2", title: "Lec 02: Newton's Laws & Friction Multi-Block Mastery", type: "lecture", duration: "2h 20m" },
              { id: "pra-phy-1-3", title: "Lec 03: Work, Energy, Power & Vertical Circular Motion", type: "lecture", duration: "2h 10m" },
              { id: "pra-phy-1-dpp1", title: "DPP 01: Advanced Mechanics PYQ Drill", type: "dpp", duration: "1h 00m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir & Amit Mahajan Sir",
        chapters: [
          {
            id: "pra-chem-1",
            title: "Physical Chemistry Fundamentals",
            lectures: [
              { id: "pra-chem-1-1", title: "Lec 01: Mole Concept, Stoichiometry & Redox Titrations", type: "lecture", duration: "2h 10m" },
              { id: "pra-chem-1-2", title: "Lec 02: Chemical Thermodynamics & Thermochemistry", type: "lecture", duration: "2h 25m" },
              { id: "pra-chem-1-dpp1", title: "DPP 01: Physical Chemistry High-Yield Problems", type: "dpp", duration: "50m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir",
        chapters: [
          {
            id: "pra-math-1",
            title: "Algebra Rapid Revision",
            lectures: [
              { id: "pra-math-1-1", title: "Lec 01: Quadratic Equations & Location of Roots", type: "lecture", duration: "2h 15m" },
              { id: "pra-math-1-2", title: "Lec 02: Complex Numbers Geometry & De Moivre's Theorem", type: "lecture", duration: "2h 30m" },
              { id: "pra-math-1-dpp1", title: "DPP 01: Algebra Advanced Problems", type: "dpp", duration: "1h 00m" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "manzil-jee-2026",
    name: "Manzil JEE (One-Shot Revision)",
    target: "All JEE Aspirants (High-Yield Marathons)",
    description: "Complete chapter one-shot marathons with theory, shortcuts, and 40+ PYQs per chapter.",
    subjects: [
      {
        name: "Physics",
        faculty: "MR Sir, Rajwant Sir, Saleem Sir",
        chapters: [
          {
            id: "man-phy-1",
            title: "Mechanics One-Shot Marathons",
            lectures: [
              { id: "man-phy-1-1", title: "Kinematics in 1 Shot (Full Theory + 40 PYQs)", type: "lecture", duration: "5h 15m" },
              { id: "man-phy-1-2", title: "Newton's Laws of Motion & Friction in 1 Shot", type: "lecture", duration: "5h 45m" },
              { id: "man-phy-1-3", title: "Rotational Dynamics in 1 Shot Complete Mastery", type: "lecture", duration: "6h 30m" }
            ]
          }
        ]
      },
      {
        name: "Chemistry",
        faculty: "Pankaj Sir, Faisal Sir, Amit Mahajan Sir",
        chapters: [
          {
            id: "man-chem-1",
            title: "Chemistry One-Shot Marathons",
            lectures: [
              { id: "man-chem-1-1", title: "Complete Chemical Bonding in 1 Shot", type: "lecture", duration: "5h 00m" },
              { id: "man-chem-1-2", title: "Complete Organic Chemistry Reaction Mechanisms", type: "lecture", duration: "7h 20m" }
            ]
          }
        ]
      },
      {
        name: "Mathematics",
        faculty: "Sachin Sir, Ashish Agarwal Sir",
        chapters: [
          {
            id: "man-math-1",
            title: "Mathematics One-Shot Marathons",
            lectures: [
              { id: "man-math-1-1", title: "Complete Definite Integration & Area Under Curves in 1 Shot", type: "lecture", duration: "6h 15m" },
              { id: "man-math-1-2", title: "Vectors & 3D Geometry Full Chapter Marathon", type: "lecture", duration: "5h 40m" }
            ]
          }
        ]
      }
    ]
  }
];

export default function OthersPage() {
  const [location, navigate] = useLocation();
  const [subView, setSubView] = useState<OthersSubView>("hub");

  // PW Batches Data & Selection State
  const [batches, setBatches] = useState<PWBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [contentFilter, setContentFilter] = useState<"all" | "lecture" | "dpp">("all");
  const [lectureSearch, setLectureSearch] = useState<string>("");
  const [batchSearch, setBatchSearch] = useState<string>("");
  const [catalogBatches, setCatalogBatches] = useState<PWCatalogBatch[]>([]);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [openLectureMenu, setOpenLectureMenu] = useState<string | null>(null);
  const loadingBatchIds = React.useRef(new Set<string>());

  // Completed Lectures Set (stored locally and synced to IndexedDB)
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("pw_completed_lectures");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load the live PW batch catalog. Detailed subjects and lectures load on selection.
  useEffect(() => {
    fetch(PW_CATALOG_URL)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const remoteBatches = extractCatalogBatches(data);
        setCatalogBatches(remoteBatches);
        setBatches(remoteBatches.map(catalogToBatch));
        setSelectedBatchId(current => current || remoteBatches[0]?.batch_id || "");
        if (remoteBatches.length > 0) {
          setSyncMessage(`Catalog synced: ${remoteBatches.length.toLocaleString()} public batches`);
        }
      })
      .catch(() => setSyncMessage("Using the local batch catalog"));

    // Also load completed items from IndexedDB
    idbGet<Record<string, boolean>>("pw_completed_lectures").then(saved => {
      if (saved) {
        setCompletedMap(prev => ({ ...prev, ...saved }));
      }
    }).catch(() => {});
  }, []);

  // Save completed map on change
  useEffect(() => {
    try {
      localStorage.setItem("pw_completed_lectures", JSON.stringify(completedMap));
      idbSet("pw_completed_lectures", completedMap).catch(() => {});
    } catch {}
  }, [completedMap]);

  // Sync subView with URL route
  useEffect(() => {
    if (location === "/others/questions" || location === "/questions") {
      setSubView("questions");
    } else if (location === "/others/pw" || location === "/pw") {
      setSubView("pw");
    } else {
      setSubView("hub");
    }
  }, [location]);

  // Active Batch Object
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || EMPTY_PW_BATCH;
  }, [batches, selectedBatchId]);

  useEffect(() => {
    const selectedBatch = batches.find(batch => batch.id === selectedBatchId);
    if (!selectedBatchId || selectedBatch?.subjects.length || !catalogBatches.some(batch => batch.batch_id === selectedBatchId) || loadingBatchIds.current.has(selectedBatchId)) {
      return;
    }

    loadingBatchIds.current.add(selectedBatchId);
    fetchBatchMetadata(selectedBatchId)
      .then(subjects => {
        if (subjects.length === 0) {
          setSyncMessage("This batch has no public subject metadata");
          return;
        }
        setBatches(prev => prev.map(batch => batch.id === selectedBatchId ? { ...batch, subjects } : batch));
        const topicCount = subjects.reduce((count, subject) => count + subject.chapters.length, 0);
        setSyncMessage(`Loaded ${subjects.length} subjects, teachers, and ${topicCount} chapter names`);
      })
        .catch(() => setSyncMessage("Live batch metadata could not be loaded. Check that the backend is running, then retry the batch."))
        .finally(() => loadingBatchIds.current.delete(selectedBatchId));
      }, [batches, catalogBatches, selectedBatchId]);

  // Expand all chapters by default when batch changes
  useEffect(() => {
    const chapterIds = currentBatch.subjects.flatMap(subject => subject.chapters.map(chapter => chapter.id));
    setOpenChapters(previous => {
      const next = Object.fromEntries(chapterIds.map(id => [id, previous[id] ?? true]));
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (previousKeys.length === nextKeys.length && nextKeys.every(id => previous[id] === next[id])) {
        return previous;
      }
      return next;
    });
  }, [currentBatch.subjects]);

  // Toggle Lecture completion
  const toggleLectureCompletion = (lectureId: string) => {
    setCompletedMap(prev => {
      const updated = { ...prev, [lectureId]: !prev[lectureId] };
      return updated;
    });
  };

  // Toggle Chapter accordion open/close
  const toggleChapter = (chapterId: string) => {
    setOpenChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Mark an entire chapter as completed / pending
  const toggleAllInChapter = (chapter: PWChapter) => {
    const allCompleted = chapter.lectures.every(l => completedMap[l.id]);
    setCompletedMap(prev => {
      const updated = { ...prev };
      chapter.lectures.forEach(l => {
        updated[l.id] = !allCompleted;
      });
      return updated;
    });
  };

  // Calculation of progress stats for the selected batch
  const batchStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    const subjectStats: Record<string, { total: number; completed: number }> = {};

    currentBatch.subjects.forEach(sub => {
      if (!subjectStats[sub.name]) {
        subjectStats[sub.name] = { total: 0, completed: 0 };
      }
      sub.chapters.forEach(ch => {
        ch.lectures.forEach(l => {
          total++;
          subjectStats[sub.name].total++;
          if (completedMap[l.id]) {
            completed++;
            subjectStats[sub.name].completed++;
          }
        });
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent, subjectStats };
  }, [currentBatch, completedMap]);

  const visibleCatalogBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return catalogBatches.slice(0, 12);
    return catalogBatches
      .filter(batch => [batch.name, batch.byName, batch.exam, batch.class].filter(Boolean).join(" ").toLowerCase().includes(query))
      .slice(0, 12);
  }, [batchSearch, catalogBatches]);

  const visibleBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return batches;
    return batches.filter(batch => `${batch.name} ${batch.target} ${batch.description}`.toLowerCase().includes(query));
  }, [batches, batchSearch]);

  return (
    <div className="min-h-full bg-background text-foreground transition-colors">
      {/* ── SUB-VIEW 1: QUESTIONS (Full JEE Main & Advanced Practice) ────── */}
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
              Back to Others Hub
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                JEE Main &amp; Advanced PYQ System
              </span>
            </div>
          </div>
          {/* Questions Full Component */}
          <QuestionsPage />
        </div>
      )}

      {/* ── SUB-VIEW 2: PHYSICS WALLAH (PW) BATCH & LECTURE TRACKER ──────── */}
      {subView === "pw" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
          {/* Top Navigation Bar */}
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
                PW Daily Lecture Tracker
              </span>
            </div>
          </div>

          {/* Batch Selector Header */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Select Your Physics Wallah Batch
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  {currentBatch.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentBatch.target} • {currentBatch.description}
                </p>
              </div>

              {/* Batch Switcher Pills */}
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Input
                  value={batchSearch}
                  onChange={(event) => setBatchSearch(event.target.value)}
                  placeholder="Search Arjuna, Lakshya, Ajay..."
                  className="h-9 w-full text-xs sm:w-64"
                  aria-label="Search public PW batches"
                />
                <div className="flex max-w-xl flex-wrap justify-end gap-2">
                {visibleBatches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedBatchId === b.id
                        ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30 scale-102"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/60"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
                {visibleCatalogBatches
                  .filter(batch => !batches.some(existing => existing.id === batch.batch_id))
                  .map(batch => (
                    <button
                      key={batch.batch_id}
                      onClick={() => {
                        setBatches(prev => [...prev, catalogToBatch(batch)]);
                        setSelectedBatchId(batch.batch_id);
                      }}
                      className="border border-dashed border-amber-500/50 bg-amber-500/5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                    >
                      {batch.name}
                    </button>
                  ))}
                </div>
                {syncMessage && <span className="text-[10px] text-muted-foreground">{syncMessage}</span>}
              </div>
            </div>

            {/* Overall Progress Bar Card */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-foreground">Batch Progress:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {batchStats.completed} / {batchStats.total} Items Completed
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-base text-foreground">
                    {batchStats.percent}%
                  </span>
                  {batchStats.completed > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm("Reset all completed checkmarks for this batch?")) {
                          setCompletedMap({});
                        }
                      }}
                      className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
                      title="Reset completed ticks"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${batchStats.percent}%` }}
                />
              </div>

              {/* Subject-Wise Micro Badges */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                {Object.entries(batchStats.subjectStats).map(([subName, stats]) => {
                  const subPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <div 
                      key={subName}
                      className="px-2.5 py-1 rounded-lg bg-background border border-border/80 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="font-medium text-foreground">{subName}:</span>
                      <span className="font-mono font-bold text-primary">{stats.completed}/{stats.total}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">({subPct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filtering & Search Bar */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search lecture, topic, or chapter (e.g. Projectile, Mole)..."
                  value={lectureSearch}
                  onChange={(e) => setLectureSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs bg-background border-border"
                />
              </div>

              {/* Subject Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["All", ...currentBatch.subjects.map(s => s.name)].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubject(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activeSubject === sub
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ListTodo className="w-3.5 h-3.5" /> Filter by Status:
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { key: "all", label: "All Items" },
                  { key: "pending", label: "Pending Only" },
                  { key: "completed", label: "Completed" }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      statusFilter === tab.key
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" /> Show content:
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { key: "all", label: "All" },
                  { key: "lecture", label: "Lectures" },
                  { key: "dpp", label: "DPPs" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setContentFilter(tab.key as "all" | "lecture" | "dpp")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      contentFilter === tab.key
                        ? "bg-primary/10 text-primary font-bold border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chapters & Lectures Accordions */}
          {currentBatch.subjects.length === 0 ? (
            <Card className="border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No subject metadata was returned for this batch.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The metadata service returned no subjects. Try refreshing the batch or selecting another batch.
              </p>
            </Card>
          ) : <div className="space-y-4">
            {currentBatch.subjects
              .filter(sub => activeSubject === "All" || sub.name === activeSubject)
              .map(sub => {
                return (
                  <div key={sub.name} className="space-y-3">
                    <div className="flex items-center justify-between gap-2 pt-2 pb-1">
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          sub.name === "Physics"
                            ? "bg-blue-500"
                            : sub.name === "Chemistry"
                            ? "bg-emerald-500"
                            : "bg-purple-500"
                        }`} />
                        {sub.name}
                        {sub.faculty && (
                          <span className="text-xs font-normal text-muted-foreground">
                            • {sub.faculty}
                          </span>
                        )}
                      </h2>
                    </div>

                    {sub.chapters.length === 0 && (
                      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground">
                        Subject and teacher loaded. No chapter names were returned for this subject.
                      </div>
                    )}

                    {/* Chapter Cards */}
                    <div className="space-y-3">
                      {sub.chapters.map(ch => {
                        // Apply filters to lectures
                        const filteredLectures = ch.lectures.filter(l => {
                          if (contentFilter !== "all" && l.type !== contentFilter) return false;
                          if (statusFilter === "completed" && !completedMap[l.id]) return false;
                          if (statusFilter === "pending" && completedMap[l.id]) return false;
                          if (lectureSearch.trim().length > 0) {
                            const q = lectureSearch.toLowerCase();
                            const match = l.title.toLowerCase().includes(q) || ch.title.toLowerCase().includes(q);
                            if (!match) return false;
                          }
                          return true;
                        });

                        // If search/filter hid all lectures, hide chapter
                        if (filteredLectures.length === 0 && (lectureSearch.trim().length > 0 || statusFilter !== "all" || contentFilter !== "all")) {
                          return null;
                        }

                        const isOpen = openChapters[ch.id] ?? true;
                        const totalInChapter = ch.lectures.length;
                        const completedInChapter = ch.lectures.filter(l => completedMap[l.id]).length;
                        const isChapterComplete = totalInChapter > 0 && completedInChapter === totalInChapter;

                        return (
                          <Card 
                            key={ch.id}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isChapterComplete 
                                ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10" 
                                : "border-border/80 bg-card"
                            }`}
                          >
                            {/* Chapter Header */}
                            <div 
                              onClick={() => toggleChapter(ch.id)}
                              className="p-4 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 select-none transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isChapterComplete
                                    ? "bg-emerald-500 text-white shadow-xs"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {isChapterComplete ? <Check className="w-4 h-4 stroke-[3]" /> : <BookOpen className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                                    {ch.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{completedInChapter} of {totalInChapter} completed</span>
                                    <span>•</span>
                                    <span className="font-semibold text-primary">{Math.round((completedInChapter / totalInChapter) * 100)}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAllInChapter(ch);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                  title="Mark all items in this chapter as done"
                                >
                                  {isChapterComplete ? "Uncheck All" : "Mark All"}
                                </button>
                                <div className="p-1 text-muted-foreground">
                                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Lectures Checklist Rows */}
                            {isOpen && (
                              <div className="border-t border-border/60 divide-y divide-border/40 bg-muted/10">
                                {filteredLectures.map(lec => {
                                  const isChecked = Boolean(completedMap[lec.id]);
                                  const isMenuOpen = openLectureMenu === lec.id;
                                  return (
                                    <div
                                      key={lec.id}
                                      onClick={() => toggleLectureCompletion(lec.id)}
                                      className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                        isChecked
                                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 text-muted-foreground"
                                          : "hover:bg-muted/30 text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        {/* Tick Checkbox */}
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                          isChecked
                                            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                            : "border-border/80 bg-background hover:border-primary"
                                        }`}>
                                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <p className={`text-xs sm:text-sm font-medium leading-tight ${
                                            isChecked ? "line-through opacity-75" : ""
                                          }`}>
                                            {lec.title}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="relative flex items-center gap-2 shrink-0">
                                        {lec.duration && (
                                          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
                                            {lec.duration}
                                          </span>
                                        )}
                                        {lec.date && (
                                          <span className="text-[11px] text-muted-foreground hidden md:inline-block">
                                            {new Date(lec.date).toLocaleDateString()}
                                          </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                          lec.type === "dpp"
                                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                        }`}>
                                          {lec.type}
                                        </span>
                                        <button
                                          type="button"
                                          aria-label={`Actions for ${lec.title}`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenLectureMenu(isMenuOpen ? null : lec.id);
                                          }}
                                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                        {isMenuOpen && (
                                          <div className="absolute right-0 top-8 z-20 min-w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                                            <button
                                              type="button"
                                              disabled
                                              className="flex w-full cursor-not-allowed items-center rounded-md px-3 py-2 text-left text-xs text-muted-foreground opacity-60"
                                              title="No public PDF URL was returned in this metadata response"
                                            >
                                              Open PDF in new tab
                                            </button>
                                            <button
                                              type="button"
                                              disabled
                                              className="flex w-full cursor-not-allowed items-center rounded-md px-3 py-2 text-left text-xs text-muted-foreground opacity-60"
                                              title="No public PDF URL was returned in this metadata response"
                                            >
                                              Open in PDF viewer
                                            </button>
                                            <span className="block px-3 py-1 text-[10px] text-muted-foreground">
                                              PDF link not supplied by the metadata API
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>}
        </div>
      )}

      {/* ── SUB-VIEW 3: MAIN "OTHERS" HUB LANDING PAGE ─────────────────────── */}
      {subView === "hub" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              Learning Hub &amp; Utilities
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Others &amp; Resources
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Select a module below to practice official JEE Main &amp; Advanced previous year questions or track your daily Physics Wallah lectures and DPP syllabus progress.
            </p>
          </div>

          {/* Cards Grid: Option 1 (Questions) & Option 2 (PW Tracker) */}
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
                    Daily Lecture Tracker
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-2">
                    2. PW (Physics Wallah)
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-500" />
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select your batch (Arjuna, Lakshya, Prayas, Manzil) and tick off lectures and DPPs as you complete them to track your daily syllabus completion.
                  </p>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Arjuna &amp; Lakshya
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Prayas Dropper
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Interactive Ticks
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/60">
                    Auto-Sync CDN
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap to track PW Batches &amp; Lectures
                </span>
                <Button className="rounded-xl font-bold text-xs gap-2 py-4 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm group-hover:shadow-md transition-all">
                  Open PW Tracker <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
