import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  Info,
  Sliders,
  ChevronRight,
  TrendingUp,
  Cpu,
  Tv,
  HelpCircle,
  FileText,
  X,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import katex from "katex";
import "katex/dist/katex.min.css";

// ==========================================
// 1. MATHEMATICAL EXPRESSION PARSER & GRAPHER
// ==========================================
interface GraphWidgetProps {
  functions: string[];
  xRange?: [number, number];
  yRange?: [number, number];
  sliders?: { name: string; min: number; max: number; step: number; defaultValue: number }[];
}

export function GraphWidget({
  functions: initialFunctions,
  xRange: initialXRange = [-10, 10],
  yRange: initialYRange = [-6, 6],
  sliders: initialSliders = []
}: GraphWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [functions, setFunctions] = useState<string[]>(() => {
    let rawFuncs: any[] = [];
    if (Array.isArray(initialFunctions)) {
      rawFuncs = initialFunctions;
    } else if (initialFunctions !== undefined && initialFunctions !== null) {
      rawFuncs = [initialFunctions];
    } else {
      rawFuncs = ["sin(x)"];
    }
    return rawFuncs
      .map(f => (f !== null && f !== undefined ? String(f).trim() : ""))
      .filter(f => f.length > 0);
  });
  const [newFuncInput, setNewFuncInput] = useState("");
  const [xRange, setXRange] = useState<[number, number]>(initialXRange);
  const [yRange, setYRange] = useState<[number, number]>(initialYRange);
  const [isClosed, setIsClosed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState<'like' | 'dislike' | null>(null);
  
  // Slider states
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    const vals: Record<string, number> = {};
    initialSliders.forEach(s => {
      vals[s.name] = s.defaultValue;
    });
    return vals;
  });

  const [mousePos, setMousePos] = useState<{ x: number; y: number; graphX: number; graphY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; xRange: [number, number]; yRange: [number, number] }>({
    x: 0,
    y: 0,
    xRange: [...initialXRange],
    yRange: [...initialYRange]
  });

  // Math helper
  const parseAndEval = (expr: string, xVal: number, sVals: Record<string, number>, yVal?: number) => {
    let cleaned = expr.toLowerCase();
    
    // Remove LaTeX backslashes (e.g. \cos -> cos, \sin -> sin)
    cleaned = cleaned.replace(/\\/g, "");
    
    // Remove "y=" or "y =" prefix if present
    cleaned = cleaned.replace(/^y\s*=\s*/, "");
    
    // Insert implicit multiplication between digits and variables/parentheses (e.g. 2x -> 2*x, 3(x) -> 3*(x))
    cleaned = cleaned.replace(/(\d+)([a-z(])/g, "$1*$2");
    
    // Normalize shorthand functions without parentheses (e.g. sin x -> sin(x), cosx -> cos(x))
    const mathFuncs = ["sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "sqrt"];
    mathFuncs.forEach(func => {
      // sin x -> sin(x)
      const regexSpace = new RegExp(`\\b${func}\\s+([a-z0-9_().**+\\-/^]+)`, "g");
      cleaned = cleaned.replace(regexSpace, `${func}($1)`);
      
      // sinx -> sin(x)
      const regexVar = new RegExp(`\\b${func}([x])\\b`, "g");
      cleaned = cleaned.replace(regexVar, `${func}($1)`);
    });
    
    // Replace slider variables
    Object.entries(sVals).forEach(([name, val]) => {
      const regex = new RegExp(`\\b${name}\\b`, "g");
      cleaned = cleaned.replace(regex, `(${val})`);
    });
    
    // Replace constants
    cleaned = cleaned.replace(/\bpi\b/g, "Math.PI");
    cleaned = cleaned.replace(/\be\b/g, "Math.E");
    
    // Replace functions with Math. equivalents
    cleaned = cleaned.replace(/sin\(/g, "Math.sin(");
    cleaned = cleaned.replace(/cos\(/g, "Math.cos(");
    cleaned = cleaned.replace(/tan\(/g, "Math.tan(");
    cleaned = cleaned.replace(/cot\(/g, "1/Math.tan(");
    cleaned = cleaned.replace(/sec\(/g, "1/Math.cos(");
    cleaned = cleaned.replace(/csc\(/g, "1/Math.sin(");
    cleaned = cleaned.replace(/log\(/g, "Math.log10(");
    cleaned = cleaned.replace(/ln\(/g, "Math.log(");
    cleaned = cleaned.replace(/exp\(/g, "Math.exp(");
    cleaned = cleaned.replace(/sqrt\(/g, "Math.sqrt(");
    cleaned = cleaned.replace(/abs\(/g, "Math.abs(");
    cleaned = cleaned.replace(/asin\(/g, "Math.asin(");
    cleaned = cleaned.replace(/acos\(/g, "Math.acos(");
    cleaned = cleaned.replace(/atan\(/g, "Math.atan(");
    
    // Power symbol ^ to **
    cleaned = cleaned.replace(/\^/g, "**");
    
    // Replace independent variable x or t
    cleaned = cleaned.replace(/\bx\b/g, `(${xVal})`);
    cleaned = cleaned.replace(/\bt\b/g, `(${xVal})`);
    if (typeof yVal === "number") {
      cleaned = cleaned.replace(/\by\b/g, `(${yVal})`);
    }
    
    try {
      const fn = new Function(`return ${cleaned};`);
      const res = fn();
      return typeof res === "number" && !isNaN(res) && isFinite(res) ? res : NaN;
    } catch (e) {
      return NaN;
    }
  };

  // Zoom function
  const handleZoom = (factor: number) => {
    const xMid = (xRange[0] + xRange[1]) / 2;
    const xSpan = (xRange[1] - xRange[0]) * factor;
    const yMid = (yRange[0] + yRange[1]) / 2;
    const ySpan = (yRange[1] - yRange[0]) * factor;
    
    setXRange([xMid - xSpan / 2, xMid + xSpan / 2]);
    setYRange([yMid - ySpan / 2, yMid + ySpan / 2]);
  };

  const handleReset = () => {
    setXRange(initialXRange);
    setYRange(initialYRange);
    const resetVals: Record<string, number> = {};
    initialSliders.forEach(s => {
      resetVals[s.name] = s.defaultValue;
    });
    setSliderVals(resetVals);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left click only
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsPanning(true);
    const rect = canvas.getBoundingClientRect();
    panStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      xRange: [...xRange],
      yRange: [...yRange]
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel to graph coordinates
    const width = canvas.width;
    const height = canvas.height;
    const graphX = xRange[0] + (x / width) * (xRange[1] - xRange[0]);
    const graphY = yRange[1] - (y / height) * (yRange[1] - yRange[0]);

    setMousePos({ x, y, graphX, graphY });

    if (!isPanning) return;

    const dx = x - panStart.current.x;
    const dy = y - panStart.current.y;

    const xDiff = (dx / width) * (panStart.current.xRange[1] - panStart.current.xRange[0]);
    const yDiff = (dy / height) * (panStart.current.yRange[1] - panStart.current.yRange[0]);

    setXRange([panStart.current.xRange[0] - xDiff, panStart.current.xRange[1] - xDiff]);
    setYRange([panStart.current.yRange[0] + yDiff, panStart.current.yRange[1] + yDiff]);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Redraw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = "#09090b"; // Pitch black grid background
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = "#1e1e24";
    ctx.lineWidth = 0.5;

    // Draw main axes
    const zeroX = ((0 - xRange[0]) / (xRange[1] - xRange[0])) * width;
    const zeroY = height - ((0 - yRange[0]) / (yRange[1] - yRange[0])) * height;

    // Grid spacing logic
    const xDiff = xRange[1] - xRange[0];
    let gridSpacing = 1;
    if (xDiff > 100) gridSpacing = 20;
    else if (xDiff > 50) gridSpacing = 10;
    else if (xDiff > 20) gridSpacing = 5;
    else if (xDiff > 5) gridSpacing = 1;
    else if (xDiff > 1) gridSpacing = 0.2;
    else gridSpacing = 0.05;

    // Vertical grid lines
    const startGridX = Math.floor(xRange[0] / gridSpacing) * gridSpacing;
    for (let gx = startGridX; gx <= xRange[1]; gx += gridSpacing) {
      const px = ((gx - xRange[0]) / (xRange[1] - xRange[0])) * width;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      // Draw number labels on axis
      if (Math.abs(gx) > 0.0001) {
        ctx.fillStyle = "#71717a";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        const labelY = zeroY > height - 15 ? height - 5 : zeroY < 15 ? 12 : zeroY + 14;
        ctx.fillText(gx.toFixed(gridSpacing < 1 ? 2 : 0), px, labelY);
      }
    }

    // Horizontal grid lines
    const startGridY = Math.floor(yRange[0] / gridSpacing) * gridSpacing;
    for (let gy = startGridY; gy <= yRange[1]; gy += gridSpacing) {
      const py = height - ((gy - yRange[0]) / (yRange[1] - yRange[0])) * height;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();

      // Draw number labels on axis
      if (Math.abs(gy) > 0.0001) {
        ctx.fillStyle = "#71717a";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        const labelX = zeroX < 20 ? 25 : zeroX > width - 10 ? width - 12 : zeroX - 6;
        ctx.fillText(gy.toFixed(gridSpacing < 1 ? 2 : 0), labelX, py + 3);
      }
    }

    // Draw main axes (X and Y)
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1.2;

    // X Axis
    if (zeroY >= 0 && zeroY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }
    // Y Axis
    if (zeroX >= 0 && zeroX <= width) {
      ctx.beginPath();
      ctx.moveTo(zeroX, 0);
      ctx.lineTo(zeroX, height);
      ctx.stroke();
    }
    // Origin label
    if (zeroX >= 0 && zeroX <= width && zeroY >= 0 && zeroY <= height) {
      ctx.fillStyle = "#71717a";
      ctx.fillText("0", zeroX - 6, zeroY + 12);
    }

    // Colors for multiple functions (neon blue curve is the primary)
    const funcColors = ["#00f0ff", "#38bdf8", "#06b6d4", "#60a5fa"];

    // Plot functions
    functions.forEach((expr, fIdx) => {
      if (!expr || typeof expr !== "string" || !expr.trim()) return;
      ctx.strokeStyle = funcColors[fIdx % funcColors.length];
      ctx.lineWidth = 2.5;

      const toScreenX = (x: number) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * width;
      const toScreenY = (y: number) => height - ((y - yRange[0]) / (yRange[1] - yRange[0])) * height;

      // Check if this is an implicit equation
      const cleanExpr = expr.replace(/^y\s*=\s*/, "").trim();
      const isImplicit = cleanExpr.includes("y");

      if (isImplicit) {
        // Implicit equation plot
        const gridCols = 85;
        const gridRows = 85;
        const grid: number[][] = [];

        // Precompute grid values
        for (let i = 0; i <= gridCols; i++) {
          grid[i] = [];
          const gx = xRange[0] + (i / gridCols) * (xRange[1] - xRange[0]);
          for (let j = 0; j <= gridRows; j++) {
            const gy = yRange[0] + (j / gridRows) * (yRange[1] - yRange[0]);
            let val = NaN;
            if (cleanExpr.includes("=")) {
              const sides = cleanExpr.split("=");
              const lhs = parseAndEval(sides[0], gx, sliderVals, gy);
              const rhs = parseAndEval(sides[1], gx, sliderVals, gy);
              val = lhs - rhs;
            } else {
              val = parseAndEval(cleanExpr, gx, sliderVals, gy);
            }
            grid[i][j] = val;
          }
        }

        // Draw marching contours
        for (let i = 0; i < gridCols; i++) {
          const gx1 = xRange[0] + (i / gridCols) * (xRange[1] - xRange[0]);
          const gx2 = xRange[0] + ((i + 1) / gridCols) * (xRange[1] - xRange[0]);
          for (let j = 0; j < gridRows; j++) {
            const gy1 = yRange[0] + (j / gridRows) * (yRange[1] - yRange[0]);
            const gy2 = yRange[0] + ((j + 1) / gridRows) * (yRange[1] - yRange[0]);

            const v1 = grid[i][j + 1]; // Top-left
            const v2 = grid[i + 1][j + 1]; // Top-right
            const v3 = grid[i][j]; // Bottom-left
            const v4 = grid[i + 1][j]; // Bottom-right

            const pts: { x: number; y: number }[] = [];
            if (!isNaN(v1) && !isNaN(v2) && v1 * v2 < 0) {
              pts.push({ x: gx1 + (gx2 - gx1) * (v1 / (v1 - v2)), y: gy2 });
            }
            if (!isNaN(v3) && !isNaN(v4) && v3 * v4 < 0) {
              pts.push({ x: gx1 + (gx2 - gx1) * (v3 / (v3 - v4)), y: gy1 });
            }
            if (!isNaN(v3) && !isNaN(v1) && v3 * v1 < 0) {
              pts.push({ x: gx1, y: gy1 + (gy2 - gy1) * (v3 / (v3 - v1)) });
            }
            if (!isNaN(v4) && !isNaN(v2) && v4 * v2 < 0) {
              pts.push({ x: gx2, y: gy1 + (gy2 - gy1) * (v4 / (v4 - v2)) });
            }

            if (pts.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(toScreenX(pts[0].x), toScreenY(pts[0].y));
              ctx.lineTo(toScreenX(pts[1].x), toScreenY(pts[1].y));
              ctx.stroke();

              // Draw discrete circular nodes for implicit functions
              if ((i + j) % 6 === 0) {
                ctx.fillStyle = funcColors[fIdx % funcColors.length];
                ctx.beginPath();
                ctx.arc(toScreenX(pts[0].x), toScreenY(pts[0].y), 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
        }
      } else {
        // Standard explicit function plot
        ctx.beginPath();
        let isFirst = true;
        const steps = width;
        const pointsList: { x: number; y: number }[] = [];
        
        for (let px = 0; px <= steps; px++) {
          const xVal = xRange[0] + (px / width) * (xRange[1] - xRange[0]);
          const yVal = parseAndEval(expr, xVal, sliderVals);

          if (!isNaN(yVal)) {
            const py = toScreenY(yVal);
            if (py >= -100 && py <= height + 100) {
              if (isFirst) {
                ctx.moveTo(px, py);
                isFirst = false;
              } else {
                ctx.lineTo(px, py);
              }
              pointsList.push({ x: px, y: py });
            } else {
              isFirst = true;
            }
          } else {
            isFirst = true;
          }
        }
        ctx.stroke();

        // Draw discrete circular nodes along explicit functions
        ctx.fillStyle = funcColors[fIdx % funcColors.length];
        const nodeInterval = 15;
        pointsList.forEach((pt, ptIdx) => {
          if (ptIdx % nodeInterval === 0) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      }
    });

    // Draw coordinate tracking overlay
    if (mousePos && mousePos.x >= 0 && mousePos.x <= width && mousePos.y >= 0 && mousePos.y <= height) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, height);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw coordinates on function curves
      functions.forEach((expr, fIdx) => {
        if (!expr || typeof expr !== "string" || !expr.trim()) return;
        const curY = parseAndEval(expr, mousePos.graphX, sliderVals);
        if (!isNaN(curY)) {
          const py = height - ((curY - yRange[0]) / (yRange[1] - yRange[0])) * height;
          if (py >= 0 && py <= height) {
            // Draw dot on curve
            ctx.fillStyle = funcColors[fIdx % funcColors.length];
            ctx.beginPath();
            ctx.arc(mousePos.x, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label coordinate
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            const coordText = `f(${mousePos.graphX.toFixed(2)}) = ${curY.toFixed(2)}`;
            const textWidth = ctx.measureText(coordText).width;
            
            ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
            ctx.fillRect(mousePos.x + 8, py - 18, textWidth + 12, 22);
            ctx.strokeStyle = funcColors[fIdx % funcColors.length];
            ctx.strokeRect(mousePos.x + 8, py - 18, textWidth + 12, 22);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(coordText, mousePos.x + 14, py - 3);
          }
        }
      });
    }
  }, [functions, xRange, yRange, sliderVals, mousePos, isPanning]);

  if (isClosed) return null;

  return (
    <div ref={containerRef} className="w-full h-[320px] sm:h-[365px] bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-white font-sans my-4">
      {/* Left Panel - Formula and expression details */}
      <div className="w-full md:w-2/5 bg-[#18181b] p-4 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-zinc-800">
        
        {/* Top controls */}
        <div className="flex items-center justify-between w-full">
          <button 
            onClick={() => setIsClosed(true)}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
            title="Close Graph"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                navigator.clipboard.writeText(functions[0] || "");
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
              title="Copy Formula"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setIsLiked(prev => prev === 'like' ? null : 'like')}
              className={cn(
                "p-1.5 hover:bg-zinc-800 rounded-lg transition-all",
                isLiked === 'like' ? "text-green-400" : "text-zinc-400 hover:text-white"
              )}
              title="Like Graph"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsLiked(prev => prev === 'dislike' ? null : 'dislike')}
              className={cn(
                "p-1.5 hover:bg-zinc-800 rounded-lg transition-all",
                isLiked === 'dislike' ? "text-red-400" : "text-zinc-400 hover:text-white"
              )}
              title="Dislike Graph"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* LaTeX Centered Display */}
        <div className="flex-1 flex items-center justify-center py-6 px-3">
          <div 
            className="text-lg sm:text-xl font-semibold overflow-x-auto max-w-full text-center scrollbar-none font-mono py-2 text-zinc-100"
            dangerouslySetInnerHTML={{
              __html: (() => {
                try {
                  const formula = functions[0] || "y = sin(x)";
                  let latex = typeof formula === "string" ? formula.trim() : String(formula).trim();
                  if (!latex.startsWith("y") && !latex.includes("=")) {
                    latex = "y = " + latex;
                  }
                  // Clean standard formatting to look great in KaTeX
                  latex = latex.replace(/\\/g, "");
                  latex = latex.replace(/\*/g, " ");
                  latex = latex.replace(/\b(sin|cos|tan|cot|sec|csc|log|ln|sqrt|pi|theta|alpha|beta|gamma|lambda|phi)\b/g, "\\$1");
                  
                  return katex.renderToString(latex, { throwOnError: false, displayMode: true });
                } catch (e) {
                  return functions[0] || "y = sin(x)";
                }
              })()
            }}
          />
        </div>

        {/* Panel Footer */}
        <div className="text-[10px] text-zinc-500 text-center font-mono tracking-wider">
          MathVerse 2D Graph Engine
        </div>
      </div>

      {/* Right Panel - Grid Graph Canvas */}
      <div className="w-full md:w-3/5 relative bg-[#09090b]">
        <canvas 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />
        
        {/* Floating reset icon in the bottom-left corner */}
        <button
          onClick={handleReset}
          className="absolute bottom-4 left-4 p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 rounded-full text-zinc-400 hover:text-white shadow-lg transition-all backdrop-blur-sm"
          title="Reset Graph View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Floating Zoom controls in bottom-right corner */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 p-1 bg-zinc-900/90 border border-zinc-850 rounded-full shadow-lg backdrop-blur-sm">
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleZoom(1.2)}
            className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. SCIENTIFIC & PHYSICS SIMULATIONS WIDGET
// ==========================================
interface SimulationWidgetProps {
  type: "projectile" | "density" | "electricity" | "bohr" | "bonding" | "shm";
}

export function SimulationWidget({ type }: SimulationWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simTime, setSimTime] = useState(0);

  // PROJECTILE STATE
  const [pAngle, setPAngle] = useState(45);
  const [pVelocity, setPVelocity] = useState(20);
  const [pGravity, setPGravity] = useState(9.8);
  const [pHeight, setPHeight] = useState(0);

  // DENSITY/ARCHIMEDES STATE
  const [dMass, setDMass] = useState(8); // kg
  const [dVolume, setDVolume] = useState(10); // L
  const [dDensity, setDDensity] = useState(1.0); // kg/L (fluid)

  // CURRENT ELECTRICITY STATE
  const [eVoltage, setEVoltage] = useState(12); // V
  const [eResistance, setEResistance] = useState(20); // Ohm

  // BOHR MODEL STATE
  const [bohrLevel, setBohrLevel] = useState(1);
  const [bohrTargetLevel, setBohrTargetLevel] = useState(1);
  const [bohrTransitioning, setBohrTransitioning] = useState(false);
  const [bohrPhoton, setBohrPhoton] = useState<{ active: boolean; x: number; isAbsorbed: boolean; lambda: number } | null>(null);

  // CHEMICAL BONDING SELECT
  const [bondingMolecule, setBondingMolecule] = useState("h2o");

  // SHM STATE
  const [shmMode, setShmMode] = useState<"pendulum" | "spring">("pendulum");
  const [shmLength, setShmLength] = useState(3.0); // m
  const [shmMass, setShmMass] = useState(2.0); // kg
  const [shmK, setShmK] = useState(20); // N/m (spring)
  const [shmAmplitude, setShmAmplitude] = useState(30); // deg or cm

  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);

  // Projectile calculations
  const projCalc = useMemo(() => {
    const rad = (pAngle * Math.PI) / 180;
    const v0x = pVelocity * Math.cos(rad);
    const v0y = pVelocity * Math.sin(rad);
    
    // Time of flight
    // g t^2 - 2 v0y t - 2 h0 = 0
    const a = 0.5 * pGravity;
    const b = -v0y;
    const c = -pHeight;
    const tFlight = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    const maxH = pHeight + (v0y * v0y) / (2 * pGravity);
    const range = v0x * tFlight;

    return { tFlight, maxH, range, v0x, v0y };
  }, [pAngle, pVelocity, pGravity, pHeight]);

  // Archimedes calculations
  const densityCalc = useMemo(() => {
    const blockDensity = dMass / dVolume; // kg/L
    const g = 9.8;
    const Fg = dMass * g; // Gravity Force
    
    // Displaced volume
    let Vdisp = dVolume;
    let isFloating = false;
    
    if (blockDensity < dDensity) {
      Vdisp = dVolume * (blockDensity / dDensity);
      isFloating = true;
    }
    
    const Fb = dDensity * Vdisp * g; // Buoyancy Force
    const netForce = Fb - Fg;

    return { blockDensity, Fg, Fb, Vdisp, isFloating, netForce };
  }, [dMass, dVolume, dDensity]);

  // Electricity calculations
  const elecCalc = useMemo(() => {
    const current = eVoltage / eResistance;
    const power = current * current * eResistance;
    return { current, power };
  }, [eVoltage, eResistance]);

  // Animation Loop
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const dt = (time - lastTimeRef.current) / 1000;
      if (isPlaying) {
        setSimTime(prev => prev + dt);
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // Bohr model photon emission / absorption
  const triggerBohrTransition = (toLevel: number) => {
    if (toLevel === bohrLevel || bohrTransitioning) return;
    setBohrTargetLevel(toLevel);
    setBohrTransitioning(true);
    
    const fromEnergy = -13.6 / (bohrLevel * bohrLevel);
    const toEnergy = -13.6 / (toLevel * toLevel);
    const dE = Math.abs(toEnergy - fromEnergy); // eV
    // lambda = hc / dE
    // hc = 1240 eV*nm
    const lambda = 1240 / dE;

    // Start photon animation
    setBohrPhoton({
      active: true,
      x: toLevel > bohrLevel ? -150 : 0, // starts outside if absorbing, center if emitting
      isAbsorbed: toLevel > bohrLevel,
      lambda
    });
  };

  // Draw simulation based on type
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width = 500;
    const height = canvas.height = 300;

    ctx.clearRect(0, 0, width, height);

    // Dark canvas background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    if (type === "projectile") {
      // Draw grid
      ctx.strokeStyle = "#161b26";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      const scale = 5; // pixels per meter
      const originX = 50;
      const originY = height - 50;

      // Draw ground
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      // Draw launch tower if height > 0
      if (pHeight > 0) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(originX - 10, originY - pHeight * scale, 20, pHeight * scale);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(originX - 10, originY - pHeight * scale, 20, pHeight * scale);
      }

      // Draw full trajectory path
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      let first = true;
      for (let t = 0; t <= projCalc.tFlight; t += 0.05) {
        const x = originX + projCalc.v0x * t * scale;
        const y = (originY - pHeight * scale) - (projCalc.v0y * t - 0.5 * pGravity * t * t) * scale;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      // Draw end of line
      const finalX = originX + projCalc.v0x * projCalc.tFlight * scale;
      const finalY = originY;
      ctx.lineTo(finalX, finalY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw animating ball
      const t = isPlaying ? simTime % (projCalc.tFlight + 1) : 0;
      if (t <= projCalc.tFlight) {
        const ballX = originX + projCalc.v0x * t * scale;
        const ballY = (originY - pHeight * scale) - (projCalc.v0y * t - 0.5 * pGravity * t * t) * scale;

        ctx.fillStyle = "#f59e0b"; // Golden ball
        ctx.beginPath();
        ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Ball reached ground
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(finalX, finalY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

    } else if (type === "density") {
      const tankWidth = 220;
      const tankHeight = 180;
      const tankX = width / 2 - tankWidth / 2;
      const tankY = height - 50 - tankHeight;

      // Draw Tank back
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(tankX, tankY, tankWidth, tankHeight);

      // Draw water level
      const fluidHeight = tankHeight * 0.7; // Fluid fills 70% of tank
      const fluidTopY = tankY + (tankHeight - fluidHeight);
      ctx.fillStyle = "rgba(14, 165, 233, 0.4)"; // Blue translucent fluid
      ctx.fillRect(tankX, fluidTopY, tankWidth, fluidHeight);

      // Draw Tank outline
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tankX, tankY);
      ctx.lineTo(tankX, tankY + tankHeight);
      ctx.lineTo(tankX + tankWidth, tankY + tankHeight);
      ctx.lineTo(tankX + tankWidth, tankY);
      ctx.stroke();

      // Block size (proportional to volume)
      const blockSide = 30 + dVolume * 2;
      
      // Calculate Y coordinate of block based on density relation and time
      let blockY = fluidTopY - blockSide / 2;
      if (densityCalc.blockDensity >= dDensity) {
        // Sinking to the bottom
        const bottomY = tankY + tankHeight - blockSide;
        const sinkDuration = 2; // seconds
        const sinkProgress = isPlaying ? Math.min(simTime / sinkDuration, 1) : 0;
        blockY = fluidTopY + (bottomY - fluidTopY) * sinkProgress;
      } else {
        // Floating at equilibrium
        const submergeRatio = densityCalc.blockDensity / dDensity;
        const floatProgress = isPlaying ? Math.min(simTime / 1.5, 1) : 0;
        const targetEquilibriumY = fluidTopY - blockSide * (1 - submergeRatio);
        blockY = (fluidTopY - blockSide) + (targetEquilibriumY - (fluidTopY - blockSide)) * floatProgress;
      }

      const blockX = width / 2 - blockSide / 2;

      // Draw block
      ctx.fillStyle = "#d97706"; // Woody color
      ctx.fillRect(blockX, blockY, blockSide, blockSide);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.strokeRect(blockX, blockY, blockSide, blockSide);

      // Force label inside block
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${dMass} kg`, blockX + blockSide / 2, blockY + blockSide / 2 + 3);

      // Draw Force Arrows
      const centerX = blockX + blockSide / 2;
      const centerY = blockY + blockSide / 2;
      const forceScale = 0.5; // pixels per Newton

      // Fg arrow (gravity) pointing down
      const fgLen = Math.min(densityCalc.Fg * forceScale, 80);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, centerY + fgLen);
      ctx.stroke();
      // Arrow head
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY + fgLen - 5);
      ctx.lineTo(centerX + 5, centerY + fgLen - 5);
      ctx.lineTo(centerX, centerY + fgLen);
      ctx.fill();

      // Fb arrow (buoyancy) pointing up
      const fbLen = Math.min(densityCalc.Fb * forceScale, 80);
      if (fbLen > 5) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - fbLen);
        ctx.stroke();
        // Arrow head
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.moveTo(centerX - 5, centerY - fbLen + 5);
        ctx.lineTo(centerX + 5, centerY - fbLen + 5);
        ctx.lineTo(centerX, centerY - fbLen);
        ctx.fill();
      }

      // Legend texts
      ctx.fillStyle = "#ef4444";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Gravity Fg: ${densityCalc.Fg.toFixed(1)} N`, 30, 50);

      ctx.fillStyle = "#10b981";
      ctx.fillText(`Buoyant Force Fb: ${densityCalc.Fb.toFixed(1)} N`, 30, 70);

      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Block Density: ${densityCalc.blockDensity.toFixed(2)} kg/L`, 30, 90);

    } else if (type === "electricity") {
      // Simple loop circuit coordinates
      const pad = 60;
      const left = pad;
      const right = width - pad;
      const top = pad;
      const bottom = height - pad;

      // Draw wire loop
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, bottom);
      ctx.lineTo(left, bottom);
      ctx.closePath();
      ctx.stroke();

      // 1. Draw Battery on left
      const batCenterY = height / 2;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(left - 10, batCenterY - 25, 20, 50); // clear wire behind

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      // Draw parallel lines for battery
      ctx.beginPath();
      ctx.moveTo(left - 15, batCenterY - 15); ctx.lineTo(left + 15, batCenterY - 15);
      ctx.moveTo(left - 8, batCenterY - 5); ctx.lineTo(left + 8, batCenterY - 5);
      ctx.moveTo(left - 15, batCenterY + 5); ctx.lineTo(left + 15, batCenterY + 5);
      ctx.moveTo(left - 8, batCenterY + 15); ctx.lineTo(left + 8, batCenterY + 15);
      ctx.stroke();
      
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`+`, left + 20, batCenterY - 15);
      ctx.fillText(`-`, left + 20, batCenterY + 20);

      // 2. Draw Resistor on right
      const resCenterY = height / 2;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(right - 15, resCenterY - 30, 30, 60);

      // Glowing resistor based on Power
      const heatFactor = Math.min(elecCalc.power / 50, 1); // 50W heats to max
      const colorRed = Math.round(59 + heatFactor * 196); // 59 -> 255
      const colorBlue = Math.round(130 - heatFactor * 100);
      const colorGreen = Math.round(246 - heatFactor * 200);
      ctx.fillStyle = `rgb(${colorRed}, ${colorGreen}, ${colorBlue})`;
      
      ctx.fillRect(right - 10, resCenterY - 25, 20, 50);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(right - 10, resCenterY - 25, 20, 50);

      // Resistor zig-zag details
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.moveTo(right - 10, resCenterY - 20);
      for (let y = resCenterY - 15; y <= resCenterY + 20; y += 10) {
        ctx.lineTo(right + 10, y - 5);
        ctx.lineTo(right - 10, y);
      }
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${eResistance} Ω`, right, resCenterY + 40);

      // 3. Draw Ammeter on top wire
      const ammeterX = width / 2;
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.arc(ammeterX, top, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`${elecCalc.current.toFixed(2)}A`, ammeterX, top + 4);

      // 4. Animate Electron dots
      if (isPlaying) {
        ctx.fillStyle = "#e0f2fe";
        // Calculate speed of electrons proportional to current
        const electronSpeed = elecCalc.current * 80; // pixels per sec
        const perimeter = (right - left) * 2 + (bottom - top) * 2;
        const numElectrons = 15;
        
        for (let i = 0; i < numElectrons; i++) {
          const startDist = (i / numElectrons) * perimeter + simTime * electronSpeed;
          const dist = startDist % perimeter;
          
          let ex = left;
          let ey = top;
          
          // Trace wire coordinates
          if (dist < (right - left)) {
            ex = left + dist;
            ey = top;
          } else if (dist < (right - left) + (bottom - top)) {
            ex = right;
            ey = top + (dist - (right - left));
          } else if (dist < (right - left) * 2 + (bottom - top)) {
            ex = right - (dist - (right - left) - (bottom - top));
            ey = bottom;
          } else {
            ex = left;
            ey = bottom - (dist - (right - left) * 2 - (bottom - top));
          }

          ctx.beginPath();
          ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Readouts
      ctx.fillStyle = "#f59e0b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Power Dissipated: ${elecCalc.power.toFixed(1)} W`, 30, 40);

    } else if (type === "bohr") {
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Nucleus
      ctx.fillStyle = "#ef4444"; // Red protons
      ctx.beginPath(); ctx.arc(centerX - 3, centerY - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3b82f6"; // Blue neutrons
      ctx.beginPath(); ctx.arc(centerX + 3, centerY + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); ctx.arc(centerX, centerY - 1, 4, 0, Math.PI * 2); ctx.fill();
      
      // Draw concentric orbits (n=1, 2, 3, 4)
      const orbitScales = [0, 35, 65, 95, 125];
      for (let n = 1; n <= 4; n++) {
        ctx.strokeStyle = n === bohrLevel ? "rgba(168, 85, 247, 0.6)" : "#1e293b";
        ctx.lineWidth = n === bohrLevel ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitScales[n], 0, Math.PI * 2);
        ctx.stroke();

        // Label orbit
        ctx.fillStyle = "#64748b";
        ctx.font = "10px sans-serif";
        ctx.fillText(`n=${n}`, centerX + orbitScales[n] - 8, centerY - 6);
      }

      // Bohr Model Transitions
      if (bohrTransitioning) {
        const speed = 4; // Orbit levels per second
        const fromRadius = orbitScales[bohrLevel];
        const toRadius = orbitScales[bohrTargetLevel];
        
        // Progress of transition
        const transitionProgress = Math.min((simTime % 1.5) * speed, 1);
        const currentRadius = fromRadius + (toRadius - fromRadius) * transitionProgress;

        // Draw Electron
        const theta = simTime * 3;
        const ex = centerX + Math.cos(theta) * currentRadius;
        const ey = centerY + Math.sin(theta) * currentRadius;
        
        ctx.fillStyle = "#a855f7"; // Glowing violet electron
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Complete transition
        if (transitionProgress >= 1) {
          setBohrLevel(bohrTargetLevel);
          setBohrTransitioning(false);
          setBohrPhoton(null);
        }
      } else {
        // Draw Electron spinning on current level
        const currentRadius = orbitScales[bohrLevel];
        const theta = simTime * (4 / bohrLevel); // Faster on inner orbits
        const ex = centerX + Math.cos(theta) * currentRadius;
        const ey = centerY + Math.sin(theta) * currentRadius;

        ctx.fillStyle = "#06b6d4"; // Cyan electron
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      // Draw moving Photon wave if active
      if (bohrPhoton && bohrPhoton.active) {
        ctx.strokeStyle = bohrPhoton.lambda > 500 ? "#f43f5e" : "#3b82f6"; // Color matches energy
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const photonY = centerY - 10;
        const waveXStart = bohrPhoton.isAbsorbed ? -150 + simTime * 120 : centerX - simTime * 120;
        
        // Draw wavy line representing photon wave packet
        for (let dx = 0; dx < 40; dx++) {
          const wx = waveXStart + dx;
          const wy = photonY + Math.sin(dx * 0.4) * 6;
          if (dx === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`Photon (${Math.round(bohrPhoton.lambda)} nm)`, waveXStart + 10, photonY - 12);
      }

      // Energy text display
      const energy = -13.6 / (bohrLevel * bohrLevel);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Energy Level (E_${bohrLevel}): ${energy.toFixed(2)} eV`, 20, 30);

    } else if (type === "bonding") {
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Molecular Geometry Demo
      if (bondingMolecule === "h2o") {
        // Oxygen (Red Central)
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(centerX, centerY - 20, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("O", centerX, centerY - 16);

        // Hydrogens (White at 104.5 degrees)
        const bondLen = 60;
        const angleRad = (104.5 * Math.PI) / 180;
        
        const h1x = centerX + Math.sin(angleRad / 2) * bondLen;
        const h1y = (centerY - 20) + Math.cos(angleRad / 2) * bondLen;
        const h2x = centerX - Math.sin(angleRad / 2) * bondLen;
        const h2y = (centerY - 20) + Math.cos(angleRad / 2) * bondLen;

        // Draw bonds
        ctx.strokeStyle = "#475569"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 20); ctx.lineTo(h1x, h1y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 20); ctx.lineTo(h2x, h2y); ctx.stroke();

        // Draw H atoms
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath(); ctx.arc(h1x, h1y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.fillText("H", h1x, h1y + 4);
        
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath(); ctx.arc(h2x, h2y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.fillText("H", h2x, h2y + 4);

        // Draw angle arch
        ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.arc(centerX, centerY - 20, 35, Math.PI/2 - angleRad/2, Math.PI/2 + angleRad/2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#a855f7"; ctx.font = "bold 11px sans-serif";
        ctx.fillText("104.5°", centerX, centerY + 30);

        // Lone pair lobes
        ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 1;
        // Upper left lobe
        ctx.beginPath(); ctx.ellipse(centerX - 15, centerY - 50, 10, 16, -Math.PI / 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Upper right lobe
        ctx.beginPath(); ctx.ellipse(centerX + 15, centerY - 50, 10, 16, Math.PI / 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      } else if (bondingMolecule === "co2") {
        // Carbon (Grey Central)
        ctx.fillStyle = "#4b5563";
        ctx.beginPath(); ctx.arc(centerX, centerY, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("C", centerX, centerY + 4);

        // Oxygens (Red at 180 degrees)
        const bondLen = 70;
        const o1x = centerX - bondLen;
        const o2x = centerX + bondLen;

        // Double bonds
        ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 6;
        ctx.beginPath(); 
        ctx.moveTo(centerX - 18, centerY - 4); ctx.lineTo(o1x + 18, centerY - 4);
        ctx.moveTo(centerX - 18, centerY + 4); ctx.lineTo(o1x + 18, centerY + 4);
        ctx.moveTo(centerX + 18, centerY - 4); ctx.lineTo(o2x - 18, centerY - 4);
        ctx.moveTo(centerX + 18, centerY + 4); ctx.lineTo(o2x - 18, centerY + 4);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(o1x, centerY, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.fillText("O", o1x, centerY + 4);

        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(o2x, centerY, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.fillText("O", o2x, centerY + 4);

        // Bond angle
        ctx.fillStyle = "#a855f7"; ctx.font = "bold 11px sans-serif";
        ctx.fillText("Linear (180°)", centerX, centerY - 35);
      } else if (bondingMolecule === "nh3") {
        // Nitrogen (Blue Central)
        ctx.fillStyle = "#2563eb";
        ctx.beginPath(); ctx.arc(centerX, centerY - 15, 21, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("N", centerX, centerY - 11);

        // Hydrogens trigonal pyramidal angles
        const h1x = centerX; const h1y = centerY + 40;
        const h2x = centerX - 55; const h2y = centerY + 15;
        const h3x = centerX + 55; const h3y = centerY + 15;

        // Bonds
        ctx.strokeStyle = "#475569"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 15); ctx.lineTo(h1x, h1y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 15); ctx.lineTo(h2x, h2y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 15); ctx.lineTo(h3x, h3y); ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        [ [h1x, h1y], [h2x, h2y], [h3x, h3y] ].forEach(([hx, hy]) => {
          ctx.beginPath(); ctx.arc(hx, hy, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.stroke();
          ctx.fillStyle = "#0f172a"; ctx.fillText("H", hx, hy + 4);
          ctx.fillStyle = "#e2e8f0";
        });

        // Lone pair on top
        ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.beginPath(); ctx.ellipse(centerX, centerY - 45, 12, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "#a855f7"; ctx.font = "bold 11px sans-serif";
        ctx.fillText("Trigonal Pyramidal (107°)", centerX, centerY + 70);
      }
    } else if (type === "shm") {
      const scale = 25; // scaling factor
      const centerX = width / 2;
      const pivotY = 50;

      // Draw top support bar
      ctx.fillStyle = "#334155";
      ctx.fillRect(centerX - 100, pivotY - 10, 200, 10);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(centerX - 100, pivotY - 10, 200, 10);

      // Simple pendulum math
      if (shmMode === "pendulum") {
        const g = 9.8;
        const omega = Math.sqrt(g / shmLength);
        const thetaMax = (shmAmplitude * Math.PI) / 180;
        
        // Theta angle at current time
        const theta = isPlaying ? thetaMax * Math.sin(omega * simTime) : thetaMax;
        
        const bobX = centerX + Math.sin(theta) * (shmLength * scale * 2);
        const bobY = pivotY + Math.cos(theta) * (shmLength * scale * 2);

        // Draw string
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Draw bob mass (radius proportional to mass)
        const r = 8 + shmMass * 1.5;
        ctx.fillStyle = "#ec4899"; // Pink bob
        ctx.beginPath(); ctx.arc(bobX, bobY, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.stroke();

        // Energy Bar Charts (KE vs PE)
        const maxPE = shmMass * g * shmLength * (1 - Math.cos(thetaMax));
        const curPE = shmMass * g * shmLength * (1 - Math.cos(theta));
        const curKE = maxPE - curPE;

        // Draw graph columns on right side
        const barX = width - 120;
        const barY = 100;
        const barH = 100;

        ctx.fillStyle = "#1e293b"; ctx.fillRect(barX, barY, 80, barH);
        
        const peH = (curPE / maxPE) * barH;
        ctx.fillStyle = "#a855f7"; // purple potential energy
        ctx.fillRect(barX + 10, barY + barH - peH, 20, peH);

        const keH = (curKE / maxPE) * barH;
        ctx.fillStyle = "#06b6d4"; // cyan kinetic energy
        ctx.fillRect(barX + 45, barY + barH - keH, 20, keH);

        ctx.fillStyle = "#ffffff"; ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PE", barX + 20, barY + barH + 12);
        ctx.fillText("KE", barX + 55, barY + barH + 12);
        ctx.fillText(`Period: ${(2 * Math.PI / omega).toFixed(2)}s`, barX + 38, barY - 15);

      } else {
        // Spring-Mass math
        const omega = Math.sqrt(shmK / shmMass);
        const ampPixels = shmAmplitude * 1.2;
        const yOffset = isPlaying ? ampPixels * Math.sin(omega * simTime) : ampPixels;
        const eqLength = 110;
        const currentLength = eqLength + yOffset;

        // Draw spring coils
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX, pivotY);
        
        const coils = 14;
        for (let i = 0; i <= coils; i++) {
          const cy = pivotY + (currentLength * (i / coils));
          const cx = centerX + (i % 2 === 0 && i > 0 && i < coils ? 18 : i % 2 !== 0 && i < coils ? -18 : 0);
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // Draw mass block
        const blockSide = 26 + shmMass * 2.5;
        const blockX = centerX - blockSide / 2;
        const blockY = pivotY + currentLength;

        ctx.fillStyle = "#ec4899";
        ctx.fillRect(blockX, blockY, blockSide, blockSide);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(blockX, blockY, blockSide, blockSide);

        // Spring energy
        const maxE = 0.5 * shmK * (shmAmplitude * 0.01) * (shmAmplitude * 0.01);
        const curPE = 0.5 * shmK * (yOffset * 0.01) * (yOffset * 0.01);
        const curKE = maxE - curPE;

        // Draw graph columns on right side
        const barX = width - 120;
        const barY = 100;
        const barH = 100;

        ctx.fillStyle = "#1e293b"; ctx.fillRect(barX, barY, 80, barH);
        
        const peH = maxE > 0 ? (curPE / maxE) * barH : 0;
        ctx.fillStyle = "#a855f7"; // purple PE
        ctx.fillRect(barX + 10, barY + barH - peH, 20, peH);

        const keH = maxE > 0 ? (curKE / maxE) * barH : 0;
        ctx.fillStyle = "#06b6d4"; // cyan KE
        ctx.fillRect(barX + 45, barY + barH - keH, 20, keH);

        ctx.fillStyle = "#ffffff"; ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PE", barX + 20, barY + barH + 12);
        ctx.fillText("KE", barX + 55, barY + barH + 12);
        ctx.fillText(`Period: ${(2 * Math.PI / omega).toFixed(2)}s`, barX + 38, barY - 15);
      }
    }
  }, [type, simTime, isPlaying, pAngle, pVelocity, pGravity, pHeight, dMass, dVolume, dDensity, eVoltage, eResistance, bohrLevel, bohrTargetLevel, bohrPhoton, bohrTransitioning, bondingMolecule, shmMode, shmLength, shmMass, shmK, shmAmplitude]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-2xl flex flex-col gap-4 text-white">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-indigo-400" />
          <h3 className="font-bold text-base bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {type.toUpperCase()} Interactive Simulation
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 font-bold px-3 gap-1.5"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Run Simulation
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSimTime(0);
              setIsPlaying(false);
              setBohrPhoton(null);
            }}
            className="h-8 w-8 p-0 rounded-full border-slate-700 text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Simulation Canvas */}
        <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative flex items-center justify-center h-[300px]">
          <canvas ref={canvasRef} className="block w-[500px] h-[300px] max-w-full" />
        </div>

        {/* Sliders and Configuration */}
        <div className="w-full md:w-60 shrink-0 flex flex-col gap-3.5 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters</label>
          
          {type === "projectile" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Launch Angle:</span>
                  <span className="text-indigo-400">{pAngle}°</span>
                </div>
                <Slider min={0} max={90} step={1} value={[pAngle]} onValueChange={(val) => setPAngle(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Velocity (v₀):</span>
                  <span className="text-indigo-400">{pVelocity} m/s</span>
                </div>
                <Slider min={1} max={50} step={1} value={[pVelocity]} onValueChange={(val) => setPVelocity(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Height (h₀):</span>
                  <span className="text-indigo-400">{pHeight} m</span>
                </div>
                <Slider min={0} max={40} step={1} value={[pHeight]} onValueChange={(val) => setPHeight(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Gravity (g):</span>
                  <span className="text-indigo-400">{pGravity} m/s²</span>
                </div>
                <Slider min={1.6} max={25.0} step={0.1} value={[pGravity]} onValueChange={(val) => setPGravity(val[0])} />
              </div>

              {/* Readout calculations */}
              <div className="mt-2 text-xs font-medium text-slate-300 space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div>Range: <span className="text-yellow-400 font-mono">{projCalc.range.toFixed(2)} m</span></div>
                <div>Max Height: <span className="text-yellow-400 font-mono">{projCalc.maxH.toFixed(2)} m</span></div>
                <div>Time of Flight: <span className="text-yellow-400 font-mono">{projCalc.tFlight.toFixed(2)} s</span></div>
              </div>
            </div>
          )}

          {type === "density" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Block Mass:</span>
                  <span className="text-amber-500">{dMass} kg</span>
                </div>
                <Slider min={1} max={20} step={0.5} value={[dMass]} onValueChange={(val) => setDMass(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Block Volume:</span>
                  <span className="text-amber-500">{dVolume} L</span>
                </div>
                <Slider min={1} max={20} step={0.5} value={[dVolume]} onValueChange={(val) => setDVolume(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Fluid Density:</span>
                  <span className="text-sky-400">{dDensity} kg/L</span>
                </div>
                <Slider min={0.5} max={2.0} step={0.05} value={[dDensity]} onValueChange={(val) => setDDensity(val[0])} />
              </div>
              
              <div className="mt-2 text-xs font-medium text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 justify-between">
                  <span>Status:</span>
                  <Badge variant={densityCalc.blockDensity > dDensity ? "destructive" : "default"} className="text-[9px] h-4">
                    {densityCalc.blockDensity > dDensity ? "Sinks" : "Floats"}
                  </Badge>
                </div>
                <div>Displaced: <span className="text-sky-400 font-mono">{densityCalc.Vdisp.toFixed(2)} L</span></div>
                <div>Net Force: <span className="text-pink-400 font-mono">{densityCalc.netForce.toFixed(1)} N</span></div>
              </div>
            </div>
          )}

          {type === "electricity" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Battery Voltage:</span>
                  <span className="text-emerald-400">{eVoltage} V</span>
                </div>
                <Slider min={1} max={30} step={0.5} value={[eVoltage]} onValueChange={(val) => setEVoltage(val[0])} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Resistance:</span>
                  <span className="text-amber-500">{eResistance} Ω</span>
                </div>
                <Slider min={5} max={100} step={1} value={[eResistance]} onValueChange={(val) => setEResistance(val[0])} />
              </div>

              <div className="mt-2 text-xs font-medium text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>Current (I): <span className="text-sky-400 font-mono">{elecCalc.current.toFixed(3)} A</span></div>
                <div>Heat Power (P): <span className="text-orange-400 font-mono">{elecCalc.power.toFixed(1)} W</span></div>
              </div>
            </div>
          )}

          {type === "bohr" && (
            <div className="flex flex-col gap-3.5">
              <span className="text-xs text-slate-400">Select an orbit to trigger energy absorption/emission transitions:</span>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => triggerBohrTransition(n)}
                    disabled={bohrTransitioning}
                    className={`py-2 text-xs font-bold rounded-xl transition-all border ${
                      bohrLevel === n
                        ? "bg-purple-600/30 border-purple-500 text-purple-200"
                        : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Orbit n={n}
                  </button>
                ))}
              </div>
              
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="font-bold text-slate-300 mb-1">Spectral Lines Info:</div>
                <div>• n=3 → n=2: Emits <span className="text-red-400">Red (656nm)</span></div>
                <div>• n=4 → n=2: Emits <span className="text-cyan-400">Cyan (486nm)</span></div>
                <div>• n=2 → n=1: Emits <span className="text-purple-400">UV (121nm)</span></div>
              </div>
            </div>
          )}

          {type === "bonding" && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-400">Select Molecule:</span>
              <select
                value={bondingMolecule}
                onChange={(e) => setBondingMolecule(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
              >
                <option value="h2o">H2O (Water) - Bent</option>
                <option value="co2">CO2 (Carbon Dioxide) - Linear</option>
                <option value="nh3">NH3 (Ammonia) - Trigonal Pyramidal</option>
              </select>

              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-2">
                {bondingMolecule === "h2o" && (
                  <div>
                    <span className="font-bold text-red-400">H2O (sp³ hybridized):</span>
                    <p className="mt-1">Oxygen has 2 bonding pairs & 2 lone pairs. Repulsion from lone pairs squeezes H-O-H angle from tetrahedral 109.5° to 104.5°.</p>
                  </div>
                )}
                {bondingMolecule === "co2" && (
                  <div>
                    <span className="font-bold text-grey-400">CO2 (sp hybridized):</span>
                    <p className="mt-1">Carbon forms 2 double bonds with Oxygen. The linear arrangement minimizes electron repulsion (180° angle).</p>
                  </div>
                )}
                {bondingMolecule === "nh3" && (
                  <div>
                    <span className="font-bold text-blue-400">NH3 (sp³ hybridized):</span>
                    <p className="mt-1">Nitrogen has 3 bond pairs & 1 lone pair. The lone pair pushes the bonds down, resulting in 107° bond angle.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "shm" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setShmMode("pendulum")}
                  className={`w-full py-1 text-[10px] font-bold rounded-lg transition-colors ${
                    shmMode === "pendulum" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Pendulum
                </button>
                <button
                  onClick={() => setShmMode("spring")}
                  className={`w-full py-1 text-[10px] font-bold rounded-lg transition-colors ${
                    shmMode === "spring" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Spring-Mass
                </button>
              </div>

              {shmMode === "pendulum" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Length (L):</span>
                      <span className="text-pink-400">{shmLength} m</span>
                    </div>
                    <Slider min={0.5} max={5.0} step={0.1} value={[shmLength]} onValueChange={(val) => setShmLength(val[0])} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Bob Mass (m):</span>
                      <span className="text-pink-400">{shmMass} kg</span>
                    </div>
                    <Slider min={0.5} max={8.0} step={0.1} value={[shmMass]} onValueChange={(val) => setShmMass(val[0])} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Spring Constant (k):</span>
                      <span className="text-pink-400">{shmK} N/m</span>
                    </div>
                    <Slider min={5} max={50} step={1} value={[shmK]} onValueChange={(val) => setShmK(val[0])} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Block Mass (m):</span>
                      <span className="text-pink-400">{shmMass} kg</span>
                    </div>
                    <Slider min={0.5} max={8.0} step={0.1} value={[shmMass]} onValueChange={(val) => setShmMass(val[0])} />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Amplitude:</span>
                  <span className="text-pink-400">{shmAmplitude}{shmMode === "pendulum" ? "°" : " cm"}</span>
                </div>
                <Slider min={5} max={60} step={1} value={[shmAmplitude]} onValueChange={(val) => setShmAmplitude(val[0])} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. PREMIUM EMBEDDED PLAYABLE YOUTUBE CARD
// ==========================================
interface YouTubeCardProps {
  videoId: string;
  title: string;
  creator: string;
  views: string;
  uploadDate: string;
  rating?: string;
  whyRecommend?: string;
}

export function YouTubeCardWidget({
  videoId,
  title,
  creator,
  views,
  uploadDate,
  rating = "4.9",
  whyRecommend
}: YouTubeCardProps) {
  return (
    <div className="my-5 w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-slate-700 flex flex-col md:flex-row max-w-2xl">
      <div className="relative w-full md:w-80 h-44 md:h-auto bg-black shrink-0">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      <div className="p-4 flex flex-col justify-between flex-1 text-white gap-3.5">
        <div className="space-y-1.5">
          <Badge className="bg-red-600/90 text-white font-bold tracking-wide rounded-full text-[9px] hover:bg-red-700 uppercase flex items-center gap-1 w-fit">
            <Tv className="h-2.5 w-2.5" /> Featured Lecture
          </Badge>
          <h4 className="font-extrabold text-sm md:text-base leading-tight text-slate-100 hover:text-red-400 transition-colors line-clamp-2">
            {title}
          </h4>
          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <span>By {creator}</span>
            <span>•</span>
            <span>{views} views</span>
            <span>•</span>
            <span>{uploadDate}</span>
          </p>
        </div>

        {whyRecommend && (
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 relative">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-yellow-400" /> Why OM Tutors Recommend This:
            </div>
            <p className="italic leading-relaxed">"{whyRecommend}"</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4 text-yellow-500 fill-yellow-500/10" />
            <span className="text-[11px] font-extrabold text-yellow-500">{rating} / 5.0 Rating</span>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1 hover:underline"
          >
            Open in YT <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. STRUCTURED NEWS FEED & assembly
// ==========================================
interface NewsFeedProps {
  items: { title: string; summary: string; source: string; badge: string }[];
  recommendations?: {
    sports?: string;
    politics?: string;
    business?: string;
    technology?: string;
    schoolAssembly?: string;
    quiz?: { question: string; options: string[]; answer: string }[];
  };
}

export function NewsFeedWidget({ items, recommendations }: NewsFeedProps) {
  const [activeCategory, setActiveCategory] = useState<"sports" | "politics" | "business" | "technology" | "assembly">("technology");
  const [selectedQuizAns, setSelectedQuizAns] = useState<Record<number, string>>({});

  return (
    <div className="my-5 w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-white max-w-2xl flex flex-col">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white rounded-full">LIVE</Badge>
          <span className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
            Educational News & Academic Bulletin
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 font-mono">2026-06-16</span>
      </div>

      {/* Primary News List */}
      <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto px-4">
        {items.map((it, idx) => (
          <div key={idx} className="py-3.5 space-y-1.5 hover:bg-slate-800/10 transition-all px-1.5 rounded-lg my-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">{it.source}</span>
              <Badge variant="outline" className="text-[9px] h-4 text-yellow-500 border-yellow-500/20 bg-yellow-500/5">
                {it.badge}
              </Badge>
            </div>
            <h5 className="font-bold text-sm leading-tight text-slate-100 hover:text-blue-400 transition-colors">
              {it.title}
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {it.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Related News Categories Tabs */}
      {recommendations && (
        <div className="p-4 bg-slate-950 border-t border-slate-800/60 mt-auto">
          <div className="flex border-b border-slate-800 pb-2 mb-3 overflow-x-auto gap-2 shrink-0">
            {[
              { id: "technology", label: "Tech" },
              { id: "sports", label: "Sports" },
              { id: "politics", label: "Politics" },
              { id: "business", label: "Business" },
              { id: "assembly", label: "School Assembly" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 ${
                  activeCategory === tab.id
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-12 text-xs leading-relaxed text-slate-300 font-medium bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            {activeCategory === "technology" && recommendations.technology && (
              <p>{recommendations.technology}</p>
            )}
            {activeCategory === "sports" && recommendations.sports && (
              <p>{recommendations.sports}</p>
            )}
            {activeCategory === "politics" && recommendations.politics && (
              <p>{recommendations.politics}</p>
            )}
            {activeCategory === "business" && recommendations.business && (
              <p>{recommendations.business}</p>
            )}
            {activeCategory === "assembly" && recommendations.schoolAssembly && (
              <div>
                <span className="font-bold text-slate-400 block mb-1">Assembly Bulletins:</span>
                <p>{recommendations.schoolAssembly}</p>
              </div>
            )}
          </div>

          {/* Quick Quiz inside news */}
          {recommendations.quiz && recommendations.quiz.length > 0 && (
            <div className="mt-4 border-t border-slate-800/60 pt-4">
              <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Current Affairs Quiz
              </span>
              {recommendations.quiz.map((q, qIdx) => (
                <div key={qIdx} className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                  <p className="text-xs font-bold text-slate-200">
                    Q: {q.question}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSelectedQuizAns(prev => ({ ...prev, [qIdx]: opt }))}
                        className={`p-2 text-xs rounded-xl font-bold border text-left transition-all ${
                          selectedQuizAns[qIdx] === opt
                            ? opt === q.answer
                              ? "bg-green-600/20 border-green-500 text-green-300"
                              : "bg-red-600/20 border-red-500 text-red-300"
                            : selectedQuizAns[qIdx] && opt === q.answer
                              ? "bg-green-600/20 border-green-500 text-green-300"
                              : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {selectedQuizAns[qIdx] && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      {selectedQuizAns[qIdx] === q.answer ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 fill-green-500/10" /> Correct Answer! Excellent.
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 fill-red-500/10" /> Wrong answer. Correct was: {q.answer}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. INTERACTIVE EDUCATIONAL QUIZ
// ==========================================
interface InteractiveQuizProps {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function InteractiveQuizWidget({
  question,
  options,
  answer,
  explanation
}: InteractiveQuizProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (opt: string) => {
    if (selectedOption) return; // Prevent changing after choosing
    setSelectedOption(opt);
    setShowExplanation(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setShowExplanation(false);
  };

  return (
    <div className="my-5 w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-white max-w-2xl flex flex-col">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-blue-400" />
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-300">
            Interactive Practice Question
          </span>
        </div>
        <Badge className="bg-indigo-600/90 text-white hover:bg-indigo-700">JEE Prep</Badge>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Question Text */}
        <h4 className="font-bold text-sm md:text-base leading-relaxed text-slate-100">
          {question}
        </h4>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isSelected = selectedOption === opt;
            const isCorrect = opt === answer;
            const hasChosen = selectedOption !== null;

            let btnStyle = "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700";
            if (hasChosen) {
              if (isCorrect) {
                btnStyle = "bg-green-600/15 border-green-500 text-green-200 shadow-inner";
              } else if (isSelected) {
                btnStyle = "bg-red-600/15 border-red-500 text-red-200 shadow-inner";
              } else {
                btnStyle = "bg-slate-950/40 border-slate-850 text-slate-500 opacity-60";
              }
            }

            return (
              <button
                key={opt}
                disabled={hasChosen}
                onClick={() => handleSelect(opt)}
                className={`p-3.5 text-xs md:text-sm font-semibold rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${btnStyle}`}
              >
                <span>{opt}</span>
                {hasChosen && isCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                )}
                {hasChosen && isSelected && !isCorrect && (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button & Explanation */}
        {showExplanation && (
          <div className="mt-2 space-y-3 animate-fadeIn">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="font-bold text-indigo-400 text-xs mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Concept Explanation
              </div>
              <p className="text-xs md:text-[13px] text-slate-300 leading-relaxed font-medium">
                {explanation}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleReset}
                variant="outline"
                className="h-8 text-xs font-bold text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white rounded-full px-3.5 gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
