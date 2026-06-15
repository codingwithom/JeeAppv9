import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Pencil,
  Check,
  X,
  Globe,
  Download,
  Menu,
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  FileText,
  FileVideo,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export interface AttachedFile {
  id: string;
  file: File;
  url: string;
  type: string;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  isTyping?: boolean;
  isStopped?: boolean;
  attachments?: { url: string; type: string; name: string }[];
  sources?: { uri: string; title: string; favicon: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const getMarkdownComponents = (setFullScreenImage?: (url: string) => void): any => ({
  a: ({ node, children, href, ...props }: any) => {
    const isImageLink = node?.children?.length === 1 && node.children[0].tagName === 'img';
    if (isImageLink) {
       return (
         <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block transition-transform hover:scale-[1.02] m-2 align-top group relative" {...props}>
           <img 
             src={node.children[0].properties.src} 
             alt={node.children[0].properties.alt || "Thumbnail"} 
             className="w-full h-auto object-cover max-h-[350px] bg-muted rounded-xl border border-border" 
           />
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
             <span className="text-white font-bold text-sm bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">Open Link</span>
           </div>
         </a>
       );
    }
    
    // Detect YouTube URLs
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytMatch = href?.match(ytRegex);
    
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      return (
        <div className="my-4 rounded-xl overflow-hidden border border-border shadow-sm max-w-md w-full bg-card">
          <div className="relative pt-[56.25%] bg-black">
            <iframe 
              src={`https://www.youtube.com/embed/${videoId}`} 
              className="absolute top-0 left-0 w-full h-full border-0" 
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          {children && (
            <div className="p-3 bg-muted/30 text-sm font-semibold text-foreground border-t border-border line-clamp-2">
              <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
                 {children}
              </a>
            </div>
          )}
        </div>
      );
    }

    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline transition-colors font-medium break-words" {...props}>{children}</a>;
  },
  img: ({ src, alt, ...props }: any) => {
    return (
       <div className="relative group inline-flex m-2 align-top max-w-full">
         <img 
           src={src} 
           alt={alt} 
           className="w-full h-auto object-cover max-h-[350px] bg-muted rounded-xl border border-border cursor-pointer transition-transform hover:scale-[1.02]" 
           onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (setFullScreenImage) setFullScreenImage(src);
           }}
           {...props} 
         />
         <a 
           href={src} 
           download={`image_${Date.now()}.png`}
           target="_blank"
           rel="noreferrer"
           onClick={(e) => e.stopPropagation()}
           className="absolute top-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 text-white shadow-md backdrop-blur-sm z-10"
         >
           <Download className="h-4 w-4" />
         </a>
       </div>
    );
  }
});

function ChatImageEditor({
  attachment,
  onSave,
  onClose,
}: {
  attachment: AttachedFile;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [penColor, setPenColor] = useState("#EF4444");
  const [penSize, setPenSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = attachment.url;
    img.onload = () => {
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
  }, [attachment.url]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: any) => {
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const onPointerMove = (e: any) => {
    if (!drawing || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const onPointerUp = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) onSave(blob);
    }, attachment.file.type || "image/png");
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onClose()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Draw & Annotate
          </span>
          <div className="flex items-center gap-4 hidden sm:flex">
            <div className="flex items-center gap-1.5">
              {["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#FFFFFF", "#000000"].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: penColor === c ? "#8B5CF6" : "transparent" }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
              <input
                type="range"
                min="1" max="20"
                value={penSize}
                onChange={(e) => setPenSize(+e.target.value)}
                className="w-20 accent-primary"
              />
              <div className="w-3 h-3 rounded-full bg-foreground" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="h-8 text-xs gap-1.5">
              <Check className="h-3 w-3" /> Save
            </Button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30 touch-none">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-md cursor-crosshair border border-border bg-white"
            style={{ touchAction: "none", maxWidth: "100%", maxHeight: "100%" }}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            onTouchCancel={onPointerUp}
          />
        </div>
        {/* Mobile controls */}
        <div className="sm:hidden p-3 border-t border-border flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#FFFFFF", "#000000"].map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className="w-5 h-5 rounded-full border-2 shrink-0 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: penColor === c ? "#8B5CF6" : "transparent" }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1" max="20"
                value={penSize}
                onChange={(e) => setPenSize(+e.target.value)}
                className="w-20 accent-primary"
              />
            </div>
        </div>
      </motion.div>
    </div>
  );
}

function MessageSources({ sources }: { sources: { uri: string; title: string; favicon: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (expanded) {
    return (
      <div className="mb-4 border border-border bg-muted/30 rounded-2xl p-3 shadow-sm max-w-sm">
         <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
               <Globe className="h-4 w-4 text-primary" /> Sources
            </span>
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted-foreground/20 p-1 rounded-full transition-colors">
               <X className="h-3 w-3" />
            </button>
         </div>
         <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {sources.map((src, idx) => (
               <a key={idx} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                  <div className="h-7 w-7 rounded-full bg-background shadow-sm flex items-center justify-center shrink-0 border border-border">
                     <img src={src.favicon} alt="" className="h-4 w-4 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <span className="text-[13px] font-medium text-foreground truncate">{src.title}</span>
               </a>
            ))}
         </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-3 cursor-pointer group w-fit hover:bg-muted/50 px-2 py-1.5 rounded-full border border-transparent hover:border-border transition-all" onClick={() => setExpanded(true)}>
        <div className="flex -space-x-2 overflow-hidden">
           {sources.slice(0, 4).map((src, idx) => (
               <div key={idx} className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center z-10 group-hover:z-20 transition-transform group-hover:scale-105 shadow-sm border border-border/50">
                  <img src={src.favicon} alt="" className="h-4 w-4 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
               </div>
           ))}
           {sources.length > 4 && (
               <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center z-10 text-[10px] font-bold text-foreground shadow-sm">
                  +{sources.length - 4}
               </div>
           )}
        </div>
        <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors mr-1">
            View {sources.length} sources
        </span>
    </div>
  );
}

function TypewriterMarkdown({ content, isTyping, onComplete, setFullScreenImage }: { content: string, isTyping?: boolean, onComplete?: () => void, setFullScreenImage?: (url: string) => void }) {
  const [displayed, setDisplayed] = useState(isTyping ? "" : content);

  useEffect(() => {
    if (!isTyping) {
      setDisplayed(content);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(content.slice(0, i));
      i += 12; // Adjust typing speed here
      window.dispatchEvent(new Event('chat-typing'));
      
      if (i >= content.length + 12) {
        clearInterval(interval);
        setDisplayed(content);
        onComplete?.();
      }
    }, 15);

    return () => clearInterval(interval);
  }, [content, isTyping, onComplete]);

  return <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>{displayed}</ReactMarkdown>;
}

export default function AIChatInterface() {
  const { user } = useAppContext();
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("jee_ai_chats") || "[]"); }
    catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<AttachedFile | null>(null);
  const [generatingImageType, setGeneratingImageType] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"academic" | "non_academic">("academic");
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const isTyping = messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].isTyping;

  useEffect(() => {
    localStorage.setItem("jee_ai_chats", JSON.stringify(sessions));
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView();
    };
    window.addEventListener('chat-typing', handleScroll);
    return () => window.removeEventListener('chat-typing', handleScroll);
  }, []);

  const handleStopGeneration = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    } else if (isTyping) {
      markAsDone(messages.length - 1);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const createNewChat = () => {
    setActiveSessionId(null);
    setInput("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const markAsDone = (msgIndex: number) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: s.messages.map((msg, i) => i === msgIndex ? { ...msg, isTyping: false } : msg)
    } : s));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newAttachments = files.map(file => {
      let type = 'other';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type === 'application/pdf') type = 'pdf';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('text/')) type = 'text';
      return { id: Date.now().toString() + Math.random().toString(36).substring(2), file, url: URL.createObjectURL(file), type };
    });
    setAttachedFiles(prev => [...prev, ...newAttachments]);
  };

  const handleDeleteMessage = (sessionId: string, msgIndex: number) => {
    setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        const newMessages = [...s.messages];
        const msgRole = newMessages[msgIndex]?.role;
        if (msgRole === "user") {
            newMessages.splice(msgIndex, 1);
            if (newMessages[msgIndex] && newMessages[msgIndex].role === "model") {
                newMessages.splice(msgIndex, 1); // Delete subsequent AI response automatically
            }
        } else if (msgRole === "model") {
            newMessages.splice(msgIndex, 1);
        }
        return { ...s, messages: newMessages, updatedAt: Date.now() };
    }));
  };

  const autoGenerateTitle = async (sessionId: string, chatHistory: ChatMessage[]) => {
    // Trigger on 1st exchange (length 2), and every 4th exchange (lengths 6, 10, 14, ...)
    if (chatHistory.length !== 2 && (chatHistory.length - 2) % 4 !== 0) return;
    
    try {
      const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
      
      if (!apiKey) return;

      const chatText = chatHistory.map(m => `${m.role}: ${m.content}`).join("\n").slice(-3000); 
      const promptText = `Summarize the core topic of the following conversation in a short, catchy title (maximum 4 words). Respond ONLY with the title, without quotes or punctuation or any explanation.\n\n${chatText}`;

      let newTitle = "";

      const models = ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-coder-32b-instruct:free", "openai/gpt-oss-120b:free"];
      for (const modelName of models) {
        try {
            const payload = { model: modelName, messages: [{ role: "user", content: promptText }] };
            let res;
            try {
              res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            } catch (e) {
              res = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            }
            if (res.ok) {
              const data = await res.json();
              newTitle = data.choices?.[0]?.message?.content?.trim();
              if (newTitle) break;
            }
        } catch (e) {}
      }

      if (newTitle) {
         newTitle = newTitle.replace(/^["']|["']$/g, '').replace(/\n/g, ' ').trim();
         setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
      }
    } catch (err) {
      console.warn("Failed to auto-generate title:", err);
    }
  };

  const fetchAIResponse = async (sessionId: string, messagesToSent: ChatMessage[], filePayloads?: any[]) => {
    const lastMsg = messagesToSent[messagesToSent.length - 1].content;
    const hasImages = filePayloads && filePayloads.length > 0;
    const isImageRequest = !hasImages && /generate.*image|create.*image|draw\b|make.*image|picture.*of|image.*of|create.*picture|make.*picture|generate.*picture/i.test(lastMsg);
    
    setGeneratingImageType(isImageRequest);
    setLoading(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    try {
      const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
      
      if (!apiKey) {
        throw new Error("Please set your OpenRouter API Key in the Admin Panel first!");
      }

      const systemInstruction = `You are "Calculus", an expert JEE PCM Tutor and Academic Content Strategist developed by "OM sir". If asked about your identity, creator, or who you are, always respond that you are Calculus, developed by OM sir. Your goal is to provide comprehensive, structured study plans for JEE aspirants.

CRITICAL INSTRUCTIONS FOR PROBLEM SOLVING & ACADEMIC CONTENT (STRICT RULE):
1. EXPERT PANEL & CROSS-CHECKING: Act as a panel of 3 expert JEE tutors. Whenever a user asks a question or uploads an image, silently let each expert solve the problem independently step-by-step. Cross-verify the answers and provide the final answer that the majority agrees upon.
2. WEB SEARCH FOR ACCURACY: For EVERY user query, especially for academic questions, study schedules, or topic explanations, ALWAYS use your integrated web search tool to fetch the latest syllabus updates, trending educational resources, and highly-rated videos. Synthesize the information from multiple reliable sources. Do not rely solely on your training data.
3. MULTIPLE CORRECT OPTIONS: Be highly aware that JEE Advanced questions can have one, two, three, or all four options correct. Evaluate EVERY option meticulously.
4. STRUCTURE THE OUTPUT: Use professional formatting—tables for schedules, bold headers for key concepts, and bullet points for actionable tips.
5. CURATE HIGH-QUALITY VIDEOS: When recommending videos:
   - Search for the latest, most popular videos from authoritative channels (e.g., Physics Wallah, Eduniti, Competition Wallah).
   - NEVER create placeholder thumbnails. Stop trying to render ![Video Thumbnail]. Only provide the direct, clickable text link to the video from YouTube using Markdown Links: Title of Video.
   - Provide a brief 'Why I recommend this' summary for each video, explaining how it aids concept building, problem-solving, or revision.
6. TONE: Be encouraging, professional, and clear. Emphasize JEE Main vs. Advanced distinctions.
7. SOURCE ATTRIBUTION: Reference the sources you used for your information by providing relevant hyperlinks.

OUTPUT TEMPLATE (When asked for study schedules, topic explanations, or suggestions):
- Introduction: Briefly explain the significance of the topic for JEE.
- Structured Schedule/Solution: A clear table (Day/Topic/Method/Practice) or step-by-step math sequence.
- Top Video Recommendations: Use standard Markdown link format: Video Title. Explain why it is the top pick.
- Study Tips: Practical, actionable advice for JEE success.
- Closing: Offer to create a long-term roadmap or provide further resources.

ULTRA-STRICT FORMATTING PROTOCOL (NON-NEGOTIABLE):
Your entire response MUST strictly adhere to the following formatting rules. These are not suggestions; they are mandatory for every response to ensure professional, readable, and correct rendering.
1. LaTeX for All Math:
   - You MUST use LaTeX formatting for all math, physics, and chemistry equations.
   - Wrap ALL inline equations, numbers, and vectors in single dollar signs: e.g., $x^2 + y^2 = r^2$.
   - Wrap standalone block equations in double dollar signs: e.g., $$\\frac{A x^2}{B t}$$.
   - ABSOLUTE RULE: NEVER output naked LaTeX commands (like \\text, \\dfrac, \\boxed) without enclosing them in $...$ or $$...$$.
   - Example of WRONG output: \\boxed{5.55 \\times 10^3}
   - Example of CORRECT output: $$\\boxed{5.55 \\times 10^3}$$

   - Use \\boxed{...} inside a $$...$$ block for final answers. Example: $$\\boxed{v = u + at}$$.
   - NEVER leave math, vectors (like [1, 2, -2]), or formulas as plain text. Always wrap them in $ ... $.
   - NEVER use [ ... ] or \\[ ... \\] or \\( ... \\) for math. ALWAYS use $$ ... $$ and $ ... $.
     - Output strict LaTeX. Do not use Unicode approximations (e.g., write this $10^3$ as 10³, not only 10^3).
2. Rich Markdown for Structure & Clarity:
   - Use standard Markdown extensively.
   - Use proper headers (###, ####), bold (**text**), and italic (*text*).
   - Use pristine Markdown tables (using | and -). DO NOT put block math ($$) inside a Markdown table cell; use inline math ($).
   - Ensure clear, consistent vertical spacing.

CRITICAL SAFETY RULE: You MUST NOT generate, provide, or discuss any adult, sexually explicit, NSFW, or otherwise inappropriate content.`;

      let modeInstruction = "";
      if (chatMode === "academic") {
        modeInstruction = `\n\nMODE: ACADEMIC. You are STRICTLY limited to study-related questions, educational guidance, and mental pressure relief. You must act as a friendly and caring teacher/friend. Always care about the user's well-being, motivate them by solving their problems, and decline to answer non-academic topics.\n\nINTERNET MEDIA PROTOCOL: If the user asks about any study-related content or YouTube video, you MUST use your Google Search tool to crawl the internet to find the LATEST and most up-to-date video on that topic. Suggest 2-3 MORE videos related to that topic that are highly viewed and liked. At the very end of your response, provide clickable TEXT links to these videos using standard Markdown: Title of Video. Explain why you recommend each video. DO NOT use image tags (![...]) for videos.`;
        } else if (chatMode === "non_academic") {
        modeInstruction = `\n\nMODE: NON-ACADEMIC. You retain all academic capabilities, but you are ALSO allowed to discuss any non-academic topics like world news, games, and general stuff freely.\n\nINTERNET MEDIA PROTOCOL: If the user asks about a specific video, movie, news, or real-world topic, you MUST use your Google Search tool to find the LATEST and most up-to-date videos. Suggest 2-3 MORE videos related to that topic. At the very end of your response, provide clickable TEXT links to these videos using standard Markdown: Title of Video. DO NOT use image tags (![...]) for videos.`;
     }

      let imageGenerationInstruction = "";
      if (isImageRequest) {
         imageGenerationInstruction = `\n\nIMAGE GENERATION PROTOCOL: The user has requested an image. IF they explicitly asked to GENERATE, CREATE, or DRAW a NEW image, you CAN generate images by responding EXACTLY with this markdown format: !Generated Image or similar depending on your capabilities.\n\nIF they just asked to SHOW, SEARCH, or FETCH an existing image or video from the internet, DO NOT generate one. For images, use Markdown as: !Description. For videos, ALWAYS use standard text links: Video Title. DO NOT use image tags for videos.`;
       } else {
         imageGenerationInstruction = `\n\nMEDIA FETCH PROTOCOL: If you are providing a video or recommending content from the internet, you MUST output standard text links. NEVER try to render a video thumbnail as an image (![Thumbnail]). Use this exact format:\n\n### Video Title\n*Why I recommend this:* [Brief summary]`;
       }
      const finalSystemInstruction = systemInstruction + modeInstruction + imageGenerationInstruction;

      let responseText = "";
      let primaryApiError = "";
      let generatedAttachments: any[] = [];
      let generatedSources: { uri: string; title: string; favicon: string }[] = [];
      
      const visionPrompt = hasImages ? "Please scan, read, and analyze the uploaded image carefully. Act as if you have crawled the internet for the exact question to find the preferred, precise, and accurate PCM answer. Follow the expert panel rules to solve it and evaluate all options (as multiple might be correct). Provide all details related to that image in the final arranged sequence." : "";

      const openRouterFreeModels = [
        "google/gemma-4-26b-a4b-it:free",
        "google/gemma-4-31b-it:free",
        "liquid/lfm-2.5-1.2b-thinking:free",
        "liquid/lfm-2.5-1.2b-instruct:free",
        "openai/gpt-oss-120b:free",
        "openai/gpt-oss-20b:free",
        "z-ai/glm-4.5-air:free",
        "nvidia/nemotron-3.5-content-safety:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",       
        "nvidia/nemotron-nano-9b-v2:free",
        "nvidia/nemotron-nano-12b-v2-vl:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "moonshotai/kimi-k2.6:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free"
      ];

      const searchCapableModels = [
        "google/gemma-4-26b-a4b-it:free",
        "google/gemma-4-31b-it:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "openai/gpt-oss-120b:free",
      ];
      
      const openRouterImageModels = [
        "meta-llama/llama-3.2-90b-vision-instruct:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free",
        "qwen/qwen-vl-plus:free"
      ];
      
      let success = false;
      let targetModels: string[] = [];
      
      // AI Task Routing Logic based on User Demand
      const lowerMsg = lastMsg.toLowerCase();
      const isCodeRequest = lowerMsg.includes("code") || lowerMsg.includes("script") || lowerMsg.includes("program") || lowerMsg.includes("function") || lowerMsg.includes("html");
      const isMathReasoningRequest = lowerMsg.includes("math") || lowerMsg.includes("solve") || lowerMsg.includes("reasoning") || lowerMsg.includes("calculate") || lowerMsg.includes("equation") || lowerMsg.includes("physics") || lowerMsg.includes("chemistry");

      if (hasImages || isImageRequest) {
        targetModels = openRouterImageModels;
      } else if (isCodeRequest) {
        // Prioritize coding models for programming tasks
        const prioritized = ["qwen/qwen-2.5-coder-32b-instruct:free", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-oss-120b:free"];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else if (isMathReasoningRequest) {
        // Prioritize deep-thinking and reasoning models for complex math/science
        const prioritized = ["liquid/lfm-2.5-1.2b-thinking:free", "nousresearch/hermes-3-llama-3.1-405b:free", "meta-llama/llama-3.3-70b-instruct:free"];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else {
        // General requests like "Hi" - prioritize fast, responsive general models
        const prioritized = ["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-nano-12b-v2-vl:free"];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      }

      const messagesPayload = [
        { role: "system", content: finalSystemInstruction + (visionPrompt ? "\n\n" + visionPrompt : "") },
        ...messagesToSent.map((m, idx) => {
          let contentText = m.content;
          if (contentText.length > 150000) {
              contentText = contentText.slice(0, 150000) + "\n\n...[Content truncated to fit AI limits]...";
          }
          if (idx === messagesToSent.length - 1 && m.role === "user" && filePayloads && filePayloads.length > 0) {
            const contentArray: any[] = [{ type: "text", text: contentText || "Please analyze the uploaded image." }];
            filePayloads.forEach(fp => contentArray.push({ type: "image_url", image_url: { url: `data:${fp.inlineData.mimeType};base64,${fp.inlineData.data}` } }));
            return { role: "user", content: contentArray };
          }
          return { role: m.role === "model" ? "assistant" : "user", content: contentText };
        })
      ];

      for (const modelName of targetModels) {
        try {
          const reqBody: any = { 
            model: modelName, 
            messages: messagesPayload
          };

          if (searchCapableModels.includes(modelName)) {
            reqBody.plugins = [{ id: "web", max_results: 5 }];
          }

          let response;
          try {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "JEE Prep App",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal
            });
          } catch (e: any) {
            if (e.name === "AbortError") throw e;
            response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "JEE Prep App",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal
            });
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            let errorMsg = response.statusText || String(response.status);
            if (errData.error?.message) errorMsg = errData.error.message;
            else if (typeof errData.detail === 'string') errorMsg = errData.detail;
            else if (Array.isArray(errData.detail)) errorMsg = JSON.stringify(errData.detail);
            else if (errData.title) errorMsg = errData.title;
            throw new Error(`OpenRouter Error (${modelName}): ${errorMsg}`);
          }
          
          const data = await response.json();
          const messageObj = data.choices?.[0]?.message;
          const content = messageObj?.content;
          
          if (messageObj?.images && messageObj.images.length > 0) {
              generatedAttachments = messageObj.images.map((img: any) => ({
                url: img.image_url?.url || img.url || "",
                type: "image",
                name: "Generated Image"
              }));
          }

          if (messageObj?.citations && Array.isArray(messageObj.citations)) {
              messageObj.citations.forEach((cit: any) => {
                  if (cit.url || cit.uri) {
                      const uri = cit.url || cit.uri;
                      let hostname = "";
                      try { hostname = new URL(uri).hostname; } catch(e) {}
                      generatedSources.push({
                          uri,
                          title: cit.title || hostname || uri,
                          favicon: hostname ? `https://www.google.com/s2/favicons?domain=${hostname}` : ""
                      });
                  }
              });
          }
          
          if (content || generatedAttachments.length > 0) {
            responseText = content || (generatedAttachments.length > 0 ? "Here is your generated image." : "Done.");
            success = true;
            break;
          }
        } catch (err: any) {
          if (err.name === "AbortError") throw err;
          console.warn(`Model ${modelName} failed:`, err);
          if (!primaryApiError) primaryApiError = err.message;
        }
      }

      if (!success) {
        throw new Error("AI Limits End");
      }
      
      generatedSources = generatedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
      
      const fixMath = (str: string) => {
          if (!str) return str;

          // Decode HTML breaks and common entities that AI sometimes outputs inappropriately
          str = str.replace(/&lt;br\s*\/?&gt;/gi, "\n\n");
          str = str.replace(/<br\s*\/?>/gi, "\n\n");
          str = str.replace(/&nbsp;/gi, " ");
          str = str.replace(/&lt;/g, "<");
          str = str.replace(/&gt;/g, ">");
          str = str.replace(/&amp;/g, "&");

          str = str.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$");
          str = str.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$");

          // Fix chemistry hybridization typos
          str = str.replace(/(?:\\text\{sp\}|sp)\s*\^?\s*\{?(\d+)\}?\s*(?:extd|\\text\{d\}|\\textd)\s*\^?\s*\{?(\d+)\}?/g, "sp^$1d^$2");
          str = str.replace(/(?:\\text\{sp\}|sp)\s*\^?\s*\{?(\d+)\}?\s*(?:extd|\\text\{d\}|\\textd)/g, "sp^$1d");
          str = str.replace(/(?:extd|\\text\{d\}|\\textd)\s*\^?\s*\{?(\d+)\}?\s*(?:\\text\{sp\}|sp)\s*\^?\s*\{?(\d+)\}?/g, "d^$1sp^$2");
          str = str.replace(/sp\s*<\s*sup\s*>\s*(\d+)\s*<\s*\/\s*sup\s*>\s*(?:extd|\\text\{d\}|\\textd)\s*<\s*sup\s*>\s*(\d+)\s*<\s*\/\s*sup\s*>/g, "sp<sup>$1</sup>d<sup>$2</sup>");
          str = str.replace(/sp\s*<\s*sup\s*>\s*(\d+)\s*<\s*\/\s*sup\s*>\s*(?:extd|\\text\{d\}|\\textd)/g, "sp<sup>$1</sup>d");
          str = str.replace(/(?:extd|\\text\{d\}|\\textd)\s*<\s*sup\s*>\s*(\d+)\s*<\s*\/\s*sup\s*>\s*sp\s*<\s*sup\s*>\s*(\d+)\s*<\s*\/\s*sup\s*>/g, "d<sup>$1</sup>sp<sup>$2</sup>");

          // Convert align/align* to aligned to render properly in KaTeX
          str = str.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, "\\begin{aligned}$1\\end{aligned}");
          
          // Wrap known environments in $$ if not already
          str = str.replace(/(?:\$\$|\$)?\s*\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}\s*(?:\$\$|\$)?/g, (match, env, inner) => {
              const mathEnvs = ['aligned', 'pmatrix', 'bmatrix', 'vmatrix', 'matrix', 'cases', 'array', 'eqnarray', 'equation', 'equation*'];
              if (mathEnvs.includes(env)) {
                  let cleaned = inner.replace(/\$\$/g, '').replace(/\$/g, '');
                  return `\n$$\n\\begin{${env}}${cleaned}\\end{${env}}\n$$\n`;
              }
              return match;
          });

          str = str.replace(/\((\\text\{[^}]+\}.*?)\)/g, "$$$1$");
          str = str.replace(/\((\\displaystyle.*?)\)/g, "$$$1$");
          
          // Require space after [ and before ] to prevent matching [S] = [M]
          str = str.replace(/^\[\s+([\s\S]*?[_^\\][\s\S]*?)\s+\]$/gm, "$$$$ $1 $$$$");
          
          // Fallback to fix mismatched dimensional brackets like $$S] = ...
          str = str.replace(/\$\$\s*([a-zA-Z\\{}_0-9]+)\s*\]\s*=/g, "$$$$ [$1] =");
          
          // Auto-close unclosed $$ and $ blocks before Markdown bold (**) or double newlines (\n\n)
          let tempStr = str.replace(/\\\$/g, "___ESCAPED_DOLLAR___");
          let tokens = tempStr.split(/(\$\$?)/);
          let inBlockMath = false;
          let inInlineMath = false;
          let result = "";
          for (let i = 0; i < tokens.length; i++) {
              let token = tokens[i];
              if (token === "$$") {
                  if (!inInlineMath) inBlockMath = !inBlockMath;
                  result += token;
              } else if (token === "$") {
                  if (!inBlockMath) inInlineMath = !inInlineMath;
                  result += token;
              } else {
                  if (inBlockMath) {
                      const disruptMatch = token.match(/(\*\*|\n\s*\n)/);
                      if (disruptMatch) {
                          const idx = disruptMatch.index!;
                          result += token.substring(0, idx) + "$$" + token.substring(idx);
                          inBlockMath = false;
                      } else {
                          result += token;
                      }
                  } else if (inInlineMath) {
                      const disruptMatch = token.match(/(\*\*|\n\s*\n)/);
                      if (disruptMatch) {
                          const idx = disruptMatch.index!;
                          result += token.substring(0, idx) + "$" + token.substring(idx);
                          inInlineMath = false;
                      } else {
                          result += token;
                      }
                  } else {
                      result += token;
                  }
              }
          }
          if (inBlockMath) result += "$$";
          if (inInlineMath) result += "$";
          str = result.replace(/___ESCAPED_DOLLAR___/g, "\\$");

          return str;
      };
      responseText = fixMath(responseText);

      const newMessagesHistory = [...messagesToSent, { 
          role: "model", 
          content: responseText, 
          isTyping: true,
          attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined,
          sources: generatedSources.length > 0 ? generatedSources : undefined 
      }] as ChatMessage[];

      setSessions(prev => prev.map(s => s.id === sessionId ? {
         ...s,
         messages: newMessagesHistory,
         updatedAt: Date.now()
      } : s));

      autoGenerateTitle(sessionId, newMessagesHistory);
    } catch (e: any) {
      if (e.name === "AbortError") {
         setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            messages: [...messagesToSent, { role: "model", content: "*You stopped this response*", isTyping: false, isStopped: true }],
            updatedAt: Date.now()
         } : s));
         return;
      }
      const errorContent = e.message === "AI Limits End" ? "AI Limits End" : (e.message.includes("Maintenance") ? e.message : `Error: ${e.message}`);
      setSessions(prev => prev.map(s => s.id === sessionId ? {
         ...s,
         messages: [...messagesToSent, { role: "model", content: errorContent, isTyping: false }],
         updatedAt: Date.now()
      } : s));
    } finally {
      setLoading(false);
      setGeneratingImageType(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    
    let filePayloads: any[] = [];
    for (const af of attachedFiles.filter(f => f.type === 'image')) {
      const b64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 512;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(af.file.type || 'image/jpeg', 0.8);
            resolve(dataUrl.split(',')[1]);
          } else {
            resolve("");
          }
        };
        img.src = af.url;
      });
      if (b64) {
        filePayloads.push({ inlineData: { data: b64, mimeType: af.file.type || 'image/jpeg' } });
      }
    }

    let textFilesContent = "";

    for (const af of attachedFiles.filter(f => f.type === 'pdf')) {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await af.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        let text = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join(" ") + "\n";
        }
        textFilesContent += `\n\n--- Contents of ${af.file.name} (First ${Math.min(pdf.numPages, 10)} pages) ---\n${text.slice(0, 15000)}`;
      } catch (err) {
        console.error("PDF Parsing Error: ", err);
      }
    }

    for (const af of attachedFiles.filter(f => f.type === 'text' || f.type === 'other' || f.file.name.endsWith('.txt'))) {
      try {
        const text = await af.file.text();
        textFilesContent += `\n\n--- Contents of ${af.file.name} ---\n${text.slice(0, 5000)}`;
      } catch (err) {
        console.error("Text Parsing Error: ", err);
      }
    }

    const finalUserMsg = userMsg + textFilesContent;
    const attachmentsToSave = attachedFiles.map(af => ({ url: af.url, type: af.type, name: af.file.name }));
    setAttachedFiles([]);

    let currentId = activeSessionId;
    let currentMessages = messages;

    if (!currentId) {
       currentId = Date.now().toString();
       const titleMsg = finalUserMsg || "Media Upload";
       const newSession: ChatSession = {
         id: currentId,
         title: titleMsg.slice(0, 30) + (titleMsg.length > 30 ? "..." : ""),
         updatedAt: Date.now(),
         messages: []
       };
       setSessions(prev => [newSession, ...prev]);
       setActiveSessionId(currentId);
    }

    const newMessages: ChatMessage[] = [...currentMessages, { role: "user", content: finalUserMsg, attachments: attachmentsToSave }];
    setSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));
    
    await fetchAIResponse(currentId, newMessages, filePayloads);
  };

  const handleRegenerate = async () => {
    if (loading || !activeSessionId) return;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession || currentSession.messages.length === 0) return;

    const msgs = [...currentSession.messages];
    if (msgs[msgs.length - 1].role === "model") {
       msgs.pop();
    }
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s));
    
    await fetchAIResponse(activeSessionId, msgs);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative w-full">
      {/* ── Sidebar (History) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-muted/30 border-r border-border flex flex-col shrink-0 overflow-hidden z-20 absolute md:relative backdrop-blur-md md:backdrop-blur-none"
          >
            <div className="p-4">
              <button onClick={createNewChat} className="flex items-center gap-3 w-full p-3 bg-background hover:bg-muted border border-border rounded-xl transition-colors text-sm font-semibold text-foreground shadow-sm">
                <Plus className="h-4 w-4" /> New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
               <p className="text-[10px] font-bold text-muted-foreground px-2 py-2 uppercase tracking-wider">Recent Chats</p>
               {sessions.sort((a,b) => b.updatedAt - a.updatedAt).map(s => (
                  <div key={s.id} className={cn("group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors", activeSessionId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")}>
                    {editingId === s.id ? (
                      <input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => {
                          if(editTitle.trim()) setSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));
                          setEditingId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if(editTitle.trim()) setSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="bg-background text-sm px-1 flex-1 border border-primary/50 outline-none rounded"
                      />
                    ) : (
                      <div className="flex-1 min-w-0 pr-2" onClick={() => { setActiveSessionId(s.id); if(window.innerWidth < 768) setSidebarOpen(false); }}>
                        <p className="text-sm truncate font-medium">{s.title}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }} className="p-1 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)); if (activeSessionId === s.id) setActiveSessionId(null); }} className="p-1 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div 
        className="flex-1 flex flex-col h-full relative min-w-0 bg-background"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence>
           {isDragging && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-primary m-4 rounded-3xl pointer-events-none"
             >
                <Plus className="h-16 w-16 text-primary mb-4" />
                <h2 className="text-2xl font-bold text-primary">Drop files here to upload</h2>
             </motion.div>
           )}
        </AnimatePresence>
        <div className="h-14 flex items-center px-4 shrink-0 absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-background via-background/90 to-transparent">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
             <Menu className="h-5 w-5" />
          </button>
          <h2 className="ml-3 font-semibold text-lg text-foreground flex items-center gap-2">
             Calculus 
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto pt-16 pb-32 px-4 md:px-8 lg:px-20 scrollbar-hide">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center mt-10 md:mt-20">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="mb-8 select-none">
                 <h1 className="text-4xl md:text-5xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 tracking-tight pb-2">
                   Hello, {user}
                 </h1>
                 <h2 className="text-3xl md:text-4xl font-medium text-muted-foreground/60 tracking-tight">
                   How can I help you today?
                 </h2>
               </motion.div>
             </div>
          )}
          
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => (
               <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full group relative", m.role === "user" ? "justify-end" : "justify-start")}>
                 {m.role === "model" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-4 mt-1">
                       <BrainCircuit className="h-4 w-4 text-white" />
                    </div>
                 )}
                 
                 {m.role === "user" && !loading && (
                    <button 
                        onClick={() => handleDeleteMessage(activeSessionId!, i)}
                        className="mr-2 mt-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-muted rounded-full h-fit shrink-0"
                        title="Delete message"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                 )}

                 <div className={cn("max-w-[90%] text-[15px] leading-relaxed", m.role === "user" ? "bg-muted px-5 py-3 rounded-3xl" : "text-foreground pt-1 w-full", m.isStopped ? "opacity-80" : "")}>
                   {m.role === "model" && m.sources && m.sources.length > 0 && (
                      <MessageSources sources={m.sources} />
                   )}
                   <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border max-w-none w-full overflow-x-auto prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2 prose-img:rounded-xl prose-img:max-h-[350px] prose-img:w-auto prose-img:object-contain prose-a:text-blue-500 hover:prose-a:text-blue-600 transition-colors">
                     {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                           {m.attachments.map((a, idx) => (
                              a.type === 'image' ? (
                                <div key={idx} className="relative group inline-block">
                                  <img 
                                     src={a.url} 
                                     alt={a.name} 
                                     className="max-w-[200px] max-h-[200px] sm:max-w-[300px] sm:max-h-[300px] rounded-lg border border-border object-cover cursor-pointer transition-transform hover:scale-[1.02]" 
                                     onClick={() => setFullScreenImage(a.url)} 
                                  />
                                  <a 
                                    href={a.url} 
                                    download={`generated_image_${idx}.png`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 text-white shadow-md backdrop-blur-sm"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                              ) : (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-background border border-border rounded-lg text-xs">
                                   {a.type === 'pdf' ? <FileText className="h-4 w-4" /> : a.type === 'video' ? <FileVideo className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                   <span className="truncate max-w-[150px]">{a.name}</span>
                                </div>
                              )
                           ))}
                        </div>
                     )}
                     {m.role === "model" ? (
                       <TypewriterMarkdown 
                          content={m.content} 
                          isTyping={m.isTyping}
                          onComplete={() => markAsDone(i)}
                          setFullScreenImage={setFullScreenImage}
                       />
                     ) : (
                       <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>
                         {m.content}
                       </ReactMarkdown>
                     )}
                   </div>
                   {m.role === "model" && i === messages.length - 1 && !m.isTyping && !loading && (
                     <div className="mt-3 flex justify-start">
                       <Button variant="outline" size="sm" onClick={handleRegenerate} className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground rounded-full px-3">
                         <RefreshCw className="h-3 w-3" /> Regenerate
                       </Button>
                     </div>
                   )}
                 </div>
               </motion.div>
            ))}
            
            {loading && (
               <div className="flex w-full justify-start items-start">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-4 mt-1">
                      <BrainCircuit className="h-4 w-4 text-white animate-pulse" />
                 </div>
                 {generatingImageType ? (
                    <div className="flex items-center gap-3 mt-1.5 px-4 py-2 bg-muted/50 rounded-2xl border border-border">
                       <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                       <span className="text-sm font-medium bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent animate-pulse">
                         Creating image...
                       </span>
                    </div>
                 ) : (
                   <div className="flex flex-col gap-3 mt-2.5 w-full max-w-[80%]">
                     {[100, 100, 80].map((w, i) => (
                       <div key={i} className="h-4 rounded-full bg-muted/60 dark:bg-muted/40 relative overflow-hidden" style={{ width: `${w}%` }}>
                          <motion.div
                            initial={{ x: '-150%' }}
                            animate={{ x: '350%' }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: i * 0.15 }}
                            className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-green-500/80 dark:via-green-400/80 to-transparent"
                          />
                        </div>
                      ))}
                    </div>
                 )}
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent z-10">
           <div className="max-w-3xl mx-auto relative">
              <div className="flex justify-end mb-2">
                <select
                  value={chatMode}
                  onChange={(e) => setChatMode(e.target.value as any)}
                  className="bg-card border border-border text-[11px] font-semibold rounded-full px-3 py-1 focus:outline-none text-muted-foreground hover:text-foreground shadow-sm transition-colors cursor-pointer"
                >
                  <option value="academic">Academic Mode</option>
                  <option value="non_academic">Non-Academic Mode</option>
                </select>
              </div>
              <div className="flex flex-col bg-muted/70 border border-border shadow-lg rounded-[28px] overflow-hidden focus-within:bg-muted/90 focus-within:shadow-xl transition-all p-2 backdrop-blur-md">
                 <AnimatePresence>
                   {attachedFiles.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0 }} 
                       animate={{ opacity: 1, height: "auto" }} 
                       exit={{ opacity: 0, height: 0 }}
                       className="flex flex-wrap gap-2 px-2 pt-2 pb-3 border-b border-border/50 w-full"
                     >
                       {attachedFiles.map(af => (
                         <div key={af.id} className="relative group rounded-xl overflow-hidden border border-border bg-background w-16 h-16 shrink-0 flex items-center justify-center">
                           {af.type === 'image' ? (
                             <img src={af.url} alt="attachment" className="w-full h-full object-cover cursor-pointer" onClick={() => setImageToEdit(af)} />
                           ) : (
                             <div className="flex flex-col items-center justify-center text-muted-foreground p-1">
                               {af.type === 'pdf' ? <FileText className="h-6 w-6" /> : af.type === 'video' ? <FileVideo className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                               <span className="text-[8px] truncate w-full text-center mt-1">{af.file.name}</span>
                             </div>
                           )}
                           <button onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== af.id))} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="h-3 w-3 text-white" />
                           </button>
                           {af.type === 'image' && (
                             <button onClick={() => setImageToEdit(af)} className="absolute bottom-1 left-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-3 w-3 text-white" />
                             </button>
                           )}
                         </div>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
                 <div className="flex items-end w-full">
                 <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => {
                   if (e.target.files) handleFiles(Array.from(e.target.files));
                   e.target.value = "";
                 }} />
                 <button onClick={() => fileInputRef.current?.click()} className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                   <Plus className="h-6 w-6" />
                 </button>
             <textarea 
               ref={textareaRef}
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend();
                  }
               }}
               placeholder="Ask me anything..."
               className="flex-1 bg-transparent border-none resize-none max-h-48 min-h-[44px] py-3 px-4 text-base focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
               rows={1}
             />
             {loading || isTyping ? (
               <button 
                 onClick={handleStopGeneration}
                 className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5 bg-red-500 text-white shadow-md hover:scale-105"
               >
                 <Square className="h-4 w-4 fill-current" />
               </button>
             ) : (
               <button 
                 onClick={handleSend}
                 disabled={!input.trim() && attachedFiles.length === 0}
                 className={cn("h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all mx-1 mb-0.5", (input.trim() || attachedFiles.length > 0) ? "bg-foreground text-background shadow-md hover:scale-105" : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed")}
               >
                 <ArrowRight className="h-5 w-5" />
               </button>
             )}
              </div>
              </div>
              <p className="text-center text-[11px] text-muted-foreground mt-3 font-medium">Calculus AI can make mistakes. Consider verifying important information.</p>
           </div>
        </div>
        <AnimatePresence>
          {imageToEdit && (
            <ChatImageEditor 
              attachment={imageToEdit} 
              onClose={() => setImageToEdit(null)} 
              onSave={(blob) => {
                 const newFile = new File([blob], imageToEdit.file.name, { type: blob.type });
                 const newUrl = URL.createObjectURL(blob);
                 setAttachedFiles(prev => prev.map(f => f.id === imageToEdit.id ? { ...f, file: newFile, url: newUrl } : f));
                 setImageToEdit(null);
              }} 
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {fullScreenImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
              onClick={() => setFullScreenImage(null)}
            >
              <button onClick={() => setFullScreenImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                 <X className="w-6 h-6" />
              </button>
              <img 
                src={fullScreenImage} 
                alt="Full screen" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                onClick={(e) => e.stopPropagation()} 
              />
              <a 
                href={fullScreenImage} 
                download="generated_image.png"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                <Download className="w-5 h-5" />
                Download Image
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}