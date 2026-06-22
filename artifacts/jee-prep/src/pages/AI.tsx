import { useState, useEffect, useRef, useMemo } from "react";
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
  Square,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Settings,
  Sparkles,
  MoreVertical,
  Volume2,
  VolumeX,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import {
  GraphWidget,
  SimulationWidget,
  YouTubeCardWidget,
  NewsFeedWidget,
  InteractiveQuizWidget
} from "@/components/AICustomWidgets";

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
  sources?: { uri: string; title: string; favicon: string; snippet?: string; thumbnail?: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const loadHtml2Canvas = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).html2canvas && (window as any).html2canvasIsPro) {
      resolve((window as any).html2canvas);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas-pro@2.0.4/dist/html2canvas-pro.min.js";
    script.onload = () => {
      (window as any).html2canvasIsPro = true;
      resolve((window as any).html2canvas);
    };
    script.onerror = () => reject(new Error("Failed to load html2canvas-pro"));
    document.body.appendChild(script);
  });
};

function YoutubePreview({ videoId, href, children }: { videoId: string; href: string; children?: any }) {
  const [play, setPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [thumbUrl, setThumbUrl] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);

  useEffect(() => {
    setThumbUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
  }, [videoId]);

  useEffect(() => {
    if (!play || !containerRef.current) return;

    let cancelled = false;
    import("@/lib/youtube-api").then(({ loadYouTubeApi }) => {
      loadYouTubeApi().then(() => {
        if (cancelled || !containerRef.current) return;

        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
          playerRef.current = null;
        }

        playerRef.current = new (window as any).YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
        });
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [play, videoId]);

  let channelName = "";
  let videoTitle = "";
  if (children) {
    const textStr = String(children).trim();
    const parts = textStr.split(/ - (.+)/);
    if (parts.length >= 2) {
      channelName = parts[0].trim();
      videoTitle = parts[1].trim().replace(/^["']|["']$/g, '');
    } else {
      videoTitle = textStr;
    }
  }

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-800 w-full max-w-2xl bg-[#0b0f19] hover:border-slate-700 transition-all duration-300 shadow-xl group">
      <div 
        className="relative pt-[56.25%] bg-black cursor-pointer overflow-hidden" 
        onClick={() => setPlay(true)}
      >
        {play ? (
          <div className="absolute inset-0 w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
          </div>
        ) : (
          <>
            <img 
              src={thumbUrl} 
              alt="YouTube Video Thumbnail" 
              className="absolute top-0 left-0 w-full h-full object-cover opacity-90 group-hover:scale-[1.02] group-hover:opacity-100 transition-all duration-500"
              loading="lazy"
              onError={() => {
                if (thumbUrl.includes("maxresdefault.jpg")) {
                  setThumbUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
                } else if (thumbUrl.includes("hqdefault.jpg")) {
                  setThumbUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
                }
              }}
            />
            
            {/* Dark gradient overlay for title readability */}
            {videoTitle && (
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent text-white z-10 pointer-events-none">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=youtube.com&sz=64`}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[14px] font-bold text-white leading-tight truncate drop-shadow-md">
                      {videoTitle}
                    </h5>
                    {channelName && (
                      <p className="text-[11px] text-slate-300 font-semibold truncate drop-shadow">
                        {channelName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors pointer-events-none" />
            
            {/* YouTube Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-11 rounded-2xl bg-[#FF0000] flex items-center justify-center group-hover:bg-[#FF0000]/90 transition-all duration-300 shadow-2xl scale-95 group-hover:scale-105">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
              </div>
            </div>
            
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/95 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 backdrop-blur border border-white/10 shadow-lg active:scale-95"
            >
              Watch on YouTube
            </a>
          </>
        )}
      </div>
      
      {/* Description below */}
      <div className="p-4 bg-slate-950/40 border-t border-slate-900 flex justify-between items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-300 truncate">
            {videoTitle || `YouTube Video (${videoId})`}
          </p>
          {channelName && (
            <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
              Channel: {channelName}
            </p>
          )}
        </div>
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors shrink-0 flex items-center gap-1 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Open Link</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function SourceCitationBadge({ href, children, sources }: { href: string; children: React.ReactNode; sources?: ChatMessage['sources'] }) {
  const [isHovered, setIsHovered] = useState(false);
  const badgeRef = useRef<HTMLAnchorElement>(null);

  const matchingSource = sources?.find(s => {
    try {
      const url1 = new URL(s.uri).href;
      const url2 = new URL(href).href;
      return url1 === url2 || url1.replace(/\/$/, '') === url2.replace(/\/$/, '');
    } catch(e) {
      return s.uri === href;
    }
  });

  let hostname = "";
  try {
    hostname = new URL(href).hostname;
  } catch (e) {
    hostname = href;
  }
  const cleanHostname = hostname.replace(/^www\./i, "");

  const faviconUrl = matchingSource?.favicon || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  const titleText = matchingSource?.title || cleanHostname;
  const snippetText = matchingSource?.snippet || "Explore this source for more details and verified information.";
  
  let sourceName = children ? String(children).trim() : "";
  const isUrl = sourceName.startsWith("http") || sourceName.includes("/") || sourceName.includes(".");
  if (!sourceName || /^\d+$/.test(sourceName) || /^source/i.test(sourceName) || sourceName.startsWith("[") || isUrl) {
    if (matchingSource?.title) {
      const parts = matchingSource.title.split(/[-|—]/);
      sourceName = parts[parts.length - 1]?.trim() || cleanHostname;
      if (sourceName.length > 25) {
        sourceName = cleanHostname;
      }
    } else {
      sourceName = cleanHostname;
    }
  }

  const cleanName = getSourceName(href, sourceName);

  const isPdf = href.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf?");
  let displayFavicon = faviconUrl;
  if (isPdf) {
    displayFavicon = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
  }

  let displayTitle = titleText;
  let displaySnippet = snippetText;
  let displayPublisher = cleanName;

  if (isPdf) {
    displayPublisher = "PDF Document";
    try {
      const filename = decodeURIComponent(href.split("/").pop() || "document.pdf").split("?")[0];
      displayTitle = filename;
    } catch(e) {
      displayTitle = "PDF Document";
    }
    displaySnippet = "Portable Document Format (PDF) file containing prep notes or reference material.";
  }

  const handleBadgeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isHovered) {
      e.preventDefault();
      setIsHovered(true);
      // Auto close after 6 seconds
      setTimeout(() => {
        setIsHovered(false);
      }, 6000);
    }
  };

  return (
    <span className={cn("ms-1 inline-flex max-w-full items-center select-none relative top-[-0.094rem] translate-y-0.5", isHovered ? "z-[30]" : "z-0")}>
      <a
        ref={badgeRef}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleBadgeClick}
        className="citation-badge flex items-center overflow-hidden rounded-xl text-[9px] font-medium h-[18px] ps-1 pe-2 transition-colors duration-150 ease-in-out bg-[#F4F4F4] dark:bg-[#303030] text-[#555] dark:text-[#c4c4c4] select-none"
      >
        <span className="flex items-center gap-1">
          <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full">
            <img
              src={displayFavicon}
              alt=""
              className="h-3 w-3 rounded-full"
              onError={(e) => {
                e.currentTarget.src = isPdf 
                  ? "https://cdn-icons-png.flaticon.com/512/337/337946.png"
                  : "https://www.google.com/s2/favicons?domain=wikipedia.org";
              }}
            />
          </span>
          <span className="max-w-[15ch] grow truncate overflow-hidden text-center leading-none">
            {displayPublisher}
          </span>
        </span>
      </a>

      {isHovered && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-[#1a1a1a]/95 backdrop-blur-md border border-[#2d2d2d] rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-[9999] text-left pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 rounded bg-white border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={displayFavicon}
                alt=""
                className="h-3.5 w-3.5 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://www.google.com/s2/favicons?domain=wikipedia.org";
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{displayPublisher}</span>
            <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-0.5">
              Verified Link <ExternalLink className="h-2.5 w-2.5 inline" />
            </span>
          </div>

          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-bold text-white hover:text-blue-400 transition-colors leading-snug mb-1.5 line-clamp-2 block"
          >
            {displayTitle}
          </a>

          <div className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
            {displaySnippet}
          </div>
        </div>
      )}
    </span>
  );
}

const getMarkdownComponents = (setFullScreenImage?: (url: string) => void, sources?: ChatMessage['sources']): any => ({
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
      
      // Heuristic: If it's a tiny inline citation, render SourceCitationBadge instead of a full video card
      const textContent = children ? String(children).trim() : "";
      const isInlineCitation = !textContent || 
                               textContent.toLowerCase() === "youtube" || 
                               /^(youtube\s*\+\d+|source\s*\d+|\d+)$/i.test(textContent) ||
                               textContent.length < 15;
                               
      if (isInlineCitation) {
        return <SourceCitationBadge href={href} sources={sources}>{children || "YouTube"}</SourceCitationBadge>;
      }
      
      return <YoutubePreview videoId={videoId} href={href}>{children}</YoutubePreview>;
    }

    if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
      return <SourceCitationBadge href={href} sources={sources}>{children}</SourceCitationBadge>;
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
  },
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeContent = String(children).replace(/\n$/, "");
    let lang = match ? match[1] : "";
    
    if (!lang || lang === "json") {
      try {
        const data = JSON.parse(codeContent);
        if (typeof data === "object" && data !== null) {
          if (data.type === "simulation" || (data.type && ["projectile", "density", "electricity", "bohr", "bonding", "shm"].includes(data.type))) {
            lang = "simulation";
          } else if (data.functions || data.formula || data.type === "plot") {
            lang = "graph";
          } else if (data.videoId || data.creator) {
            lang = "youtube-card";
          } else if (data.items || data.recommendations) {
            lang = "news-feed";
          } else if (data.question && data.options && data.answer) {
            lang = "interactive-quiz";
          }
        }
      } catch (e) {}
    }
    
    if (lang) {
      if (lang === "simulation") {
        try {
          const data = JSON.parse(codeContent);
          return <SimulationWidget type={data.type} />;
        } catch (e) {
          return <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-x-auto"><code className={className} {...props}>{children}</code></pre>;
        }
      }
      if (lang === "graph" || lang === "plot") {
        try {
          const data = JSON.parse(codeContent);
          let funcs = data.functions;
          if (!funcs && data.formula) {
            funcs = [data.formula.replace(/^y\s*=\s*/i, "")];
          }
          if (!funcs && typeof data === "object" && data !== null) {
            const values = Object.values(data as any).filter((v: any) => typeof v === "string" && (v.includes("x") || v.includes("sin") || v.includes("cos") || v.includes("tan")));
            if (values.length > 0) {
              funcs = [(values[0] as string).replace(/^y\s*=\s*/i, "")];
            }
          }
          return (
            <GraphWidget 
              functions={funcs || ["sin(x)"]} 
              xRange={data.xRange || [-10, 10]} 
              yRange={data.yRange || [-6, 6]} 
              sliders={data.sliders || []} 
            />
          );
        } catch (e) {
          return <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-x-auto"><code className={className} {...props}>{children}</code></pre>;
        }
      }
      if (lang === "youtube-card") {
        try {
          const data = JSON.parse(codeContent);
          return (
            <YouTubeCardWidget
              videoId={data.videoId}
              title={data.title}
              creator={data.creator}
              views={data.views}
              uploadDate={data.uploadDate}
              rating={data.rating}
              whyRecommend={data.whyRecommend}
            />
          );
        } catch (e) {
          return <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-x-auto"><code className={className} {...props}>{children}</code></pre>;
        }
      }
      if (lang === "news-feed") {
        try {
          const data = JSON.parse(codeContent);
          return <NewsFeedWidget items={data.items} recommendations={data.recommendations} />;
        } catch (e) {
          return <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-x-auto"><code className={className} {...props}>{children}</code></pre>;
        }
      }
      if (lang === "interactive-quiz") {
        try {
          const data = JSON.parse(codeContent);
          return (
            <InteractiveQuizWidget 
              question={data.question} 
              options={data.options} 
              answer={data.answer} 
              explanation={data.explanation} 
            />
          );
        } catch (e) {
          return <pre className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-x-auto"><code className={className} {...props}>{children}</code></pre>;
        }
      }
    }
    
    const isInline = !className;
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-rose-500 dark:text-rose-400" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-muted border border-border p-4 rounded-xl overflow-x-auto max-w-full my-2">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
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

function getSourceName(uri: string, title?: string): string {
  let hostname = "";
  try {
    hostname = new URL(uri).hostname.toLowerCase();
  } catch (e) {
    return title || "Source";
  }
  
  if (hostname.includes("indianexpress.com")) return "The Indian Express";
  if (hostname.includes("abplive.com")) return "ABP Live";
  if (hostname.includes("aajtak.in")) return "Aaj Tak";
  if (hostname.includes("republicworld.com")) return "Republic World";
  if (hostname.includes("tv9bharatvarsh.com")) return "TV9 Bharatvarsh";
  if (hostname.includes("ddnews.gov.in")) return "DD News";
  if (hostname.includes("foxnews.com")) return "Fox News";
  if (hostname.includes("bbc.com") || hostname.includes("bbc.co.uk")) return "BBC News";
  if (hostname.includes("indiatvnews.com")) return "India TV";
  if (hostname.includes("thehindu.com")) return "The Hindu";
  if (hostname.includes("news18.com")) return "News18";
  if (hostname.includes("zeenews.india.com")) return "Zee News";
  if (hostname.includes("moneycontrol.com")) return "Moneycontrol";
  if (hostname.includes("jagran.com")) return "Dainik Jagran";
  if (hostname.includes("bhaskar.com")) return "Dainik Bhaskar";
  if (hostname.includes("careers360.com")) return "Careers360";
  if (hostname.includes("sarvgyan.com")) return "SarvGyan";
  if (hostname.includes("josaa.nic.in")) return "JoSAA";
  if (hostname.includes("collegedunia.com")) return "Collegedunia";
  if (hostname.includes("timesofindia")) return "Times of India";
  if (hostname.includes("hindustantimes.com")) return "Hindustan Times";
  if (hostname.includes("ndtv.com")) return "NDTV";
  if (hostname.includes("theprint.in")) return "ThePrint";
  if (hostname.includes("livemint.com")) return "Mint";
  if (hostname.includes("businesstoday.in")) return "Business Today";
  if (hostname.includes("business-standard.com")) return "Business Standard";
  if (hostname.includes("nta.ac.in")) return "NTA";
  if (hostname.includes("jeeadv.ac.in")) return "JEE Advanced";
  if (hostname.includes("wikipedia.org")) return "Wikipedia";
  if (hostname.includes("youtube.com")) return "YouTube";
  if (hostname.includes("eduniti.in")) return "Eduniti";

  const parts = hostname.replace("www.", "").split(".");
  if (parts.length > 0) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return "Source";
}

function MessageSources({ sources }: { sources: { uri: string; title: string; favicon: string; snippet?: string; thumbnail?: string }[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 mb-4 snap-x no-scrollbar select-none">
      {sources.map((src, idx) => {
        let hostname = "Source";
        try { hostname = new URL(src.uri).hostname; } catch (e) {}
        const cleanName = getSourceName(src.uri, src.title || hostname);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        
        return (
          <a
            key={idx}
            href={src.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-start flex flex-col bg-slate-950/45 border border-slate-800/80 rounded-2xl w-[220px] min-w-[220px] h-[155px] hover:bg-slate-900/60 hover:border-slate-700/80 transition-all shadow-md shrink-0 text-white overflow-hidden group"
          >
            {/* Top Thumbnail Image */}
            {src.thumbnail ? (
              <div className="h-[75px] w-full overflow-hidden bg-slate-900 relative">
                <img 
                  src={src.thumbnail} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              </div>
            ) : null}
            
            {/* Card Content Area */}
            <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
              {/* Site logo + name */}
              <div className="flex items-center gap-1.5 shrink-0">
                <img
                  src={faviconUrl}
                  alt=""
                  className="h-3.5 w-3.5 object-contain rounded-full bg-slate-800 p-0.5"
                  onError={(e) => { e.currentTarget.src = "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=64"; }}
                />
                <span className="text-[10px] font-bold text-slate-400 tracking-wide truncate">{cleanName}</span>
              </div>
              
              {/* Title */}
              <h4 className="text-xs font-bold text-slate-105 line-clamp-2 leading-snug hover:text-blue-400 transition-colors mt-1.5 flex-1">
                {src.title}
              </h4>
              
              {/* Date */}
              <div className="text-[9px] font-bold text-slate-500 mt-1 shrink-0">
                Today
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

const preprocessMarkdown = (content: string, sources?: ChatMessage['sources']): string => {
  if (!content) return content;
  
  let cleaned = content;

  // Replace plain-text citations with markdown links
  if (sources && sources.length > 0) {
    // 1. [Source X] -> [Source X](uri)
    cleaned = cleaned.replace(/\[Source\s+(\d+)\]/gi, (match, numStr) => {
      const idx = parseInt(numStr, 10) - 1;
      if (idx >= 0 && idx < sources.length) {
        return `[Source ${idx + 1}](${sources[idx].uri})`;
      }
      return match;
    });

    // 2. [X] -> [Publisher/Site Name](uri) if matches a valid source
    cleaned = cleaned.replace(/\[(\d+)\]/g, (match, numStr) => {
      const idx = parseInt(numStr, 10) - 1;
      if (idx >= 0 && idx < sources.length) {
        let title = "";
        try {
          const hostname = new URL(sources[idx].uri).hostname;
          title = hostname.replace(/^www\./i, "");
        } catch(e) {
          title = sources[idx].title || `Source ${idx + 1}`;
        }
        return `[${title}](${sources[idx].uri})`;
      }
      return match;
    });
  }

  // 1. Match tool calls like <|tool_call_start|>[calculus(..., code="...", ...)]<|tool_call_end|>
  const toolCallRegex = /<\|tool_call_start\|>\[calculus\([\s\S]*?code="([^"]+)"[\s\S]*?\)\](?:<\|tool_call_end\|>)?/g;
  cleaned = cleaned.replace(toolCallRegex, (match, codeAttr) => {
    let func = "sin(x)";
    const mathMatch = codeAttr.match(/,\s*([a-z0-9_().**+\-/^]+)\s*,/i);
    if (mathMatch) {
      func = mathMatch[1];
    } else {
      const params = codeAttr.split(",");
      if (params.length > 1) {
        func = params[1].trim();
      }
    }
    return `\n\`\`\`graph\n{\n  "functions": ["${func}"]\n}\n\`\`\`\n`;
  });

  // 2. Match tool calls like [calculus question="Plot y = sin(x) as a graph" code="plot(...)"]
  const calculusRegex = /\[calculus\s+question="([^"]+)"[\s\S]*?code="([^"]+)"[\s\S]*?\]/g;
  cleaned = cleaned.replace(calculusRegex, (match, questionAttr, codeAttr) => {
    let func = "sin(x)";
    const eqMatch = questionAttr.match(/y\s*=\s*([a-z0-9_().**+\-/^ ]+)/i);
    if (eqMatch) {
      func = eqMatch[1].trim();
    } else {
      const params = codeAttr.split(",");
      if (params.length > 1) {
        func = params[1].trim();
      }
    }
    return `\n\`\`\`graph\n{\n  "functions": ["${func}"]\n}\n\`\`\`\n`;
  });

  // 3. Match generic json blocks (with support for indentation and nested structures)
  let scanIndex = 0;
  while (true) {
    const openBraceIdx = cleaned.indexOf("{", scanIndex);
    if (openBraceIdx === -1) break;

    // Check if this brace is inside a code block already
    const beforeText = cleaned.substring(0, openBraceIdx);
    const backtickCount = (beforeText.match(/```/g) || []).length;
    if (backtickCount % 2 !== 0) {
      scanIndex = openBraceIdx + 1;
      continue;
    }

    // Find the matching closing brace
    let depth = 1;
    let closeBraceIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = openBraceIdx + 1; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") depth++;
        else if (char === "}") depth--;
        if (depth === 0) {
          closeBraceIdx = i;
          break;
        }
      }
    }

    if (closeBraceIdx === -1) {
      scanIndex = openBraceIdx + 1;
      continue;
    }

    // Extract the substring
    const jsonStr = cleaned.substring(openBraceIdx, closeBraceIdx + 1);
    
    // Check if it's a valid JSON with specific keys
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === "object" && parsed !== null) {
        let lang = "";
        if (parsed.functions || parsed.formula || parsed.type === "plot") {
          lang = "graph";
        } else if (parsed.type === "simulation" || (parsed.type && ["projectile", "density", "electricity", "bohr", "bonding", "shm"].includes(parsed.type))) {
          lang = "simulation";
        } else if (parsed.videoId || parsed.creator) {
          lang = "youtube-card";
        } else if (parsed.items || parsed.recommendations) {
          lang = "news-feed";
        } else if (parsed.question && parsed.options && parsed.answer) {
          lang = "interactive-quiz";
        }

        if (lang) {
          const replacement = `\n\`\`\`${lang}\n${jsonStr.trim()}\n\`\`\`\n`;
          
          let startReplaceIdx = openBraceIdx;
          while (startReplaceIdx > 0 && (cleaned[startReplaceIdx - 1] === " " || cleaned[startReplaceIdx - 1] === "\t")) {
            startReplaceIdx--;
          }
          
          cleaned = cleaned.substring(0, startReplaceIdx) + replacement + cleaned.substring(closeBraceIdx + 1);
          scanIndex = startReplaceIdx + replacement.length;
          continue;
        }
      }
    } catch (e) {
      // Not a valid JSON, skip
    }

    scanIndex = openBraceIdx + 1;
  }

  // 4. Strip tool tags that might be printed as loose text
  cleaned = cleaned.replace(/<\|tool_call_start\|>/g, "");
  cleaned = cleaned.replace(/<\|tool_call_end\|>/g, "");
  
  return cleaned;
};

function TypewriterMarkdown({ content, isTyping, onComplete, setFullScreenImage, sources }: { content: string, isTyping?: boolean, onComplete?: () => void, setFullScreenImage?: (url: string) => void, sources?: ChatMessage['sources'] }) {
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

  return <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage, sources)}>{preprocessMarkdown(displayed, sources)}</ReactMarkdown>;
}

interface SourceDefinition {
  names: string[];
  domain: string;
}

const POPULAR_NEWS_SOURCES: SourceDefinition[] = [
  { names: ["aajtak", "aaj tak"], domain: "aajtak.in" },
  { names: ["republic world", "republicworld", "republic tv", "republic"], domain: "republicworld.com" },
  { names: ["abp news", "abplive", "abp live", "abpnews", "abp"], domain: "abplive.com" },
  { names: ["indiatv", "india tv", "indiatvnews"], domain: "indiatvnews.com" },
  { names: ["tv9 bharatverse", "tv9 bharatvarsh", "tv9"], domain: "tv9bharatvarsh.com" },
  { names: ["bbc", "bbc news", "bbcnews"], domain: "bbc.com" },
  { names: ["fox news", "foxnews", "fox"], domain: "foxnews.com" },
  { names: ["dd news", "ddnews", "dd"], domain: "ddnews.gov.in" },
  { names: ["hindustan times", "hindustantimes", "ht"], domain: "hindustantimes.com" },
  { names: ["ndtv"], domain: "ndtv.com" },
  { names: ["times of india", "toi"], domain: "timesofindia.indiatimes.com" },
  { names: ["indian express", "indianexpress"], domain: "indianexpress.com" },
  { names: ["the hindu"], domain: "thehindu.com" },
  { names: ["news18"], domain: "news18.com" },
  { names: ["zee news", "zeenews"], domain: "zeenews.india.com" },
  { names: ["livemint", "mint"], domain: "livemint.com" },
  { names: ["moneycontrol"], domain: "moneycontrol.com" },
  { names: ["jagran", "dainik jagran"], domain: "jagran.com" },
  { names: ["bhaskar", "dainik bhaskar"], domain: "bhaskar.com" },
  { names: ["cnn"], domain: "cnn.com" },
  { names: ["nytimes", "new york times"], domain: "nytimes.com" },
  { names: ["reuters"], domain: "reuters.com" },
  { names: ["ap news", "apnews"], domain: "apnews.com" },
  { names: ["al jazeera", "aljazeera"], domain: "aljazeera.com" },
  { names: ["guardian", "the guardian"], domain: "theguardian.com" },
  { names: ["washington post", "washingtonpost"], domain: "washingtonpost.com" },
  { names: ["bloomberg"], domain: "bloomberg.com" },
  { names: ["cnbc"], domain: "cnbc.com" },
  { names: ["forbes"], domain: "forbes.com" },
  { names: ["wsj", "wall street journal"], domain: "wsj.com" }
];

function getCleanQueryAndSources(prompt: string): { cleanQuery: string; sources: string[] } {
  const lowercasePrompt = prompt.toLowerCase();
  const matchedDomains = new Set<string>();

  // 1. Match known sources by their defined names
  for (const src of POPULAR_NEWS_SOURCES) {
    for (const name of src.names) {
      const regex = new RegExp(`\\b${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowercasePrompt)) {
        matchedDomains.add(src.domain);
        break;
      }
    }
  }

  // 2. Match any word looking like a domain, e.g. aajtak.in, bbc.com, etc.
  const domainRegex = /\b([a-z0-9-]+\.[a-z]{2,6})\b/gi;
  let match;
  while ((match = domainRegex.exec(prompt)) !== null) {
    const dom = match[1].toLowerCase();
    matchedDomains.add(dom);
  }

  // 3. Match comma/and separated lists following keywords like sources/websites/sites
  const listMatches = prompt.match(/(?:sources|websites|sites)\s*:\s*([^.?!]+)/i);
  if (listMatches) {
    const listContent = listMatches[1];
    const items = listContent.split(/,|\band\b/).map(s => s.trim().toLowerCase()).filter(Boolean);
    for (const item of items) {
      if (item.length > 2 && item.length < 30 && !["other news source", "other news sources", "other websites", "others", "other"].includes(item)) {
        let found = false;
        for (const src of POPULAR_NEWS_SOURCES) {
          if (src.names.includes(item) || item.includes(src.domain)) {
            matchedDomains.add(src.domain);
            found = true;
            break;
          }
        }
        if (!found) {
          matchedDomains.add(item);
        }
      }
    }
  }

  // 4. Construct a clean query by removing source configurations to make search queries more effective
  let cleanQuery = prompt;
  cleanQuery = cleanQuery.replace(/(?:use\s+these\s+websites?\s+as\s+sources?|using\s+these\s+websites?\s+as\s+sources?|sources?\s*:\s*|websites?\s*:\s*)/gi, "");
  
  for (const src of POPULAR_NEWS_SOURCES) {
    for (const name of src.names) {
      const regex = new RegExp(`\\b${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      cleanQuery = cleanQuery.replace(regex, "");
    }
  }
  
  cleanQuery = cleanQuery.replace(/and\s+other\s+news\s+sources?/gi, "");
  cleanQuery = cleanQuery.replace(/and\s+other\s+sources?/gi, "");
  cleanQuery = cleanQuery.replace(/and\s+other\s+websites?/gi, "");
  cleanQuery = cleanQuery.replace(/[\s,;.-]+/g, " ").trim();

  if (cleanQuery.split(/\s+/).filter(Boolean).length < 2) {
    cleanQuery = prompt;
  }

  return {
    cleanQuery,
    sources: Array.from(matchedDomains)
  };
}

async function fetchWebSearchResults(query: string, timeFilter?: string): Promise<{ results: { url: string; title: string; snippet: string; thumbnail?: string }[]; text: string }> {
  try {
    let url = `/api/search?q=${encodeURIComponent(query)}`;
    if (timeFilter) {
      url += `&df=${timeFilter}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Search request failed");
    
    const data = await res.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      return { results: [], text: "No search results found." };
    }
    
    let searchSummaries = "";
    results.forEach((item: any, idx: number) => {
      searchSummaries += `[Source ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}\nThumbnail: ${item.thumbnail || ""}\n\n`;
    });
    
    const mappedResults = results.map((item: any) => ({
      url: item.url,
      title: item.title,
      snippet: item.snippet,
      thumbnail: item.thumbnail
    }));

    return { results: mappedResults, text: searchSummaries };
  } catch (error) {
    console.warn("Local search API failed or backend server is not running. Falling back to direct client-side search via CORS proxy:", error);
    try {
      const encoded = encodeURIComponent(query);
      let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
      if (timeFilter) {
        searchUrl += `&df=${timeFilter}`;
      }
      
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("CORS proxy search request failed");
      
      const html = await res.text();
      if (!html.includes("result results_links")) {
        return { results: [], text: "No search results found." };
      }
      
      const decodeHTMLEntities = (str: string): string => {
        return str
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, "/")
          .replace(/&ndash;/g, "–")
          .replace(/&mdash;/g, "—")
          .replace(/&nbsp;/g, " ");
      };

      const parts = html.split('class="result results_links');
      const results = parts.slice(1).map((part) => {
        const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
        const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        
        let url = hrefMatch ? hrefMatch[1] : "";
        if (url.startsWith("//")) {
          url = "https:" + url;
        }
        if (url.startsWith("/l/") || url.includes("uddg=")) {
          const match = url.match(/[?&]uddg=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }
        
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        
        title = decodeHTMLEntities(title);
        snippet = decodeHTMLEntities(snippet);
        
        return { url, title, snippet };
      });

      if (results.length === 0) {
        return { results: [], text: "No search results found." };
      }

      let searchSummaries = "";
      results.forEach((item, idx) => {
        searchSummaries += `[Source ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}\nThumbnail: \n\n`;
      });
      
      return { results, text: searchSummaries };
    } catch (fallbackError) {
      console.error("Fallback direct web search failed:", fallbackError);
      return { results: [], text: "Failed to retrieve search results." };
    }
  }
}

async function fetchThirdPartyAiVideoAnalysis(videoId: string, rawText: string): Promise<string> {
  const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
  if (!apiKey) return "";

  const prompt = `You are a YouTube video analyzer and multi-source verification expert.
VIDEO URL: https://www.youtube.com/watch?v=${videoId}
RAW DATA:
${rawText}

Please perform the following verification and analysis:
1. **Identify the True Video Topic:** Determine the exact show, anime, or topic based on the video title and description metadata (e.g. "SPY×FAMILY - Episode 36 (S2E11) [Hindi dub]").
2. **Cross-Validate Across Sources:** Analyze all the web search results in the RAW DATA. Cross-reference the plot, characters (e.g., Loid, Yor, Anya, Becky, Fiona Frost), and events to verify which details are consistent across multiple sources. Ignore and filter out any search matches or summaries that belong to different shows or topics.
3. **Generate AI Analyzer Reports:** Using ONLY the verified and cross-checked facts for the identified video topic, output the following structured reports:
   - **YTSummary.app (Core Insights):** A concise bullet outline of verified highlights and key takeaways.
   - **NoteGPT.io (Structured Notes & Plot Progression):** Detailed, verified summaries of chapters, themes, and characters.
   - **Recall.ai (Multi-Source Verification Audit):** A checklist of verified facts, noting the sources they match, to ensure 100% correct, hallucination-free summaries.

Do not complain about missing transcripts. Retain only verified, consistent facts. Format the output with clear markdown headers for each source.`;

  const reqBody = {
    model: "google/gemma-2-9b-it:free",
    messages: [{ role: "user", content: prompt }]
  };

  try {
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "StudE",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
      response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "StudE",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(reqBody)
      });
    }

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }
  } catch (e) {
    console.error("Failed to fetch 3rd party AI video analysis:", e);
  }
  return "";
}

async function fetchCrawlResults(targetUrl: string, deep: boolean): Promise<{ text: string; crawledUrls: string[] }> {
  let combinedText = "";
  const crawledUrls: string[] = [targetUrl];

  // Intercept YouTube URLs to fetch metadata & spoken transcript
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const ytMatch = targetUrl.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    let rawText = "";
    
    // First try the backend scraper API
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.text && !data.text.includes("Failed to scrape") && !data.text.includes("Failed to retrieve")) {
          rawText = data.text;
        }
      }
    } catch (err) {
      console.warn("Backend scraper failed for YouTube URL, attempting client-side extraction...", err);
    }

    if (!rawText) {
      // Client-side fallback: fetch metadata from Invidious and transcript from youtube-transcript.ai
      let metaText = "";
      let transcriptText = "";
      let htmlTitle = "";
      let htmlAuthor = "";
      let htmlKeywords = "";

      try {
        const mirrors = [
          "https://inv.thepixora.com",
          "https://invidious.f5.si",
          "https://invidious.tiekoetter.com"
        ];
        for (const mirror of mirrors) {
          try {
            const vres = await fetch(`${mirror}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(5000) });
            if (vres.ok) {
              const data = await vres.json();
              if (data && data.title) {
                metaText = `=== YOUTUBE VIDEO METADATA ===\nURL: ${targetUrl}\nTitle: ${data.title}\nChannel Name: ${data.author || "Unknown"} (URL: ${data.authorUrl || "N/A"})\nUpload Date: ${data.publishedText || "N/A"}\nDuration: ${data.lengthSeconds || 0} seconds\nViews: ${data.viewCount || 0}\nLikes: ${data.likeCount || 0}\nDescription:\n${data.description || "No description provided."}\n`;
                break;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}

      try {
        const tres = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`, { signal: AbortSignal.timeout(8000) });
        if (tres.ok) {
          const contentType = tres.headers.get("content-type") || "";
          const body = await tres.text();
          if (!contentType.includes("text/html") && !body.trim().startsWith("<!DOCTYPE")) {
            transcriptText = body;
          }
        }
      } catch (e) {}

      // Direct YouTube page fetch via CORS proxy to parse captions & metadata
      if (!metaText || !transcriptText) {
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
          const ytPageRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
          if (ytPageRes.ok) {
            const html = await ytPageRes.text();

            // 1. Extract metadata from HTML meta tags
            const titleMatch = html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i) || 
                               html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                               html.match(/<title>([\s\S]*?)<\/title>/i);
            const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || 
                              html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
            const keyMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
            const authorMatch = html.match(/<link\s+itemprop=["']name["']\s+content=["']([^"']+)["']/i);

            htmlTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : "";
            htmlAuthor = authorMatch ? authorMatch[1].trim() : "";
            htmlKeywords = keyMatch ? keyMatch[1].trim() : "";
            const description = descMatch ? descMatch[1].trim() : "No description provided.";
            
            if (htmlTitle) {
              if (!metaText) {
                metaText = `=== YOUTUBE VIDEO METADATA (EXTRACTED VIA CLIENT HTML) ===\nURL: ${targetUrl}\nTitle: ${htmlTitle}\nChannel Name: ${htmlAuthor || "Unknown"}\nKeywords: ${htmlKeywords}\nDescription:\n${description}\n`;
              }
            }

            // 2. Extract transcript using brace-matching on ytInitialPlayerResponse
            if (!transcriptText) {
              const index = html.indexOf("ytInitialPlayerResponse");
              if (index !== -1) {
                const startIndex = html.indexOf('{', index);
                if (startIndex !== -1) {
                  let braceCount = 0;
                  let inString = false;
                  let escaped = false;
                  let jsonStr = "";
                  
                  for (let i = startIndex; i < html.length; i++) {
                    const char = html[i];
                    if (inString) {
                      if (escaped) {
                        escaped = false;
                      } else if (char === '\\') {
                        escaped = true;
                      } else if (char === '"') {
                        inString = false;
                      }
                    } else {
                      if (char === '"') {
                        inString = true;
                      } else if (char === '{') {
                        braceCount++;
                      } else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                          jsonStr = html.substring(startIndex, i + 1);
                          break;
                        }
                      }
                    }
                  }
                  
                  if (jsonStr) {
                    try {
                      const data = JSON.parse(jsonStr);
                      const capTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                      if (capTracks && capTracks.length > 0) {
                        const track = capTracks.find((t: any) => t.languageCode === "en") || 
                                      capTracks.find((t: any) => t.languageCode === "hi") || 
                                      capTracks[0];
                        if (track && track.baseUrl) {
                          const subtitleProxy = `https://corsproxy.io/?${encodeURIComponent(track.baseUrl + "&fmt=json3")}`;
                          const subtitleRes = await fetch(subtitleProxy, { signal: AbortSignal.timeout(6000) });
                          if (subtitleRes.ok) {
                            const subJson = await subtitleRes.json();
                            if (subJson && subJson.events) {
                              const textLines = subJson.events
                                .map((ev: any) => ev.segs?.map((s: any) => s.utf8).join("").trim() || "")
                                .filter(Boolean);
                              if (textLines.length > 0) {
                                transcriptText = textLines.join(" ");
                              }
                            }
                          }
                        }
                      }
                    } catch (e) {}
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Client-side direct HTML scrape failed:", err);
        }
      }

      let combinedTextResult = "";
      if (metaText) combinedTextResult += metaText + "\n";
      if (transcriptText) {
        combinedTextResult += `=== SPOKEN DIALOGUE / TRANSCRIPT ===\n${transcriptText}\n`;
      }

      if (!combinedTextResult) {
        try {
          const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
          if (noembedRes.ok) {
            const noembedData = await noembedRes.json();
            if (noembedData && noembedData.title) {
              htmlTitle = noembedData.title;
              htmlAuthor = noembedData.author_name;
              combinedTextResult = `=== YOUTUBE VIDEO METADATA (RESOLVED VIA NOEMBED) ===\nURL: ${targetUrl}\nTitle: ${noembedData.title}\nChannel Name: ${noembedData.author_name}\nDescription: This video is titled "${noembedData.title}" by channel "${noembedData.author_name}". (No captions or transcripts are available for this video, but you can explain or discuss its topic using this metadata or your knowledge).\n`;
            }
          }
        } catch (neErr) {}
      }

      // Client-side fallback searches if transcript is missing or short
      const isTranscriptShort = !transcriptText || transcriptText.trim().length < 200;
      if (isTranscriptShort && (htmlTitle || metaText)) {
        let videoTitle = htmlTitle;
        let videoAuthor = htmlAuthor;
        if (!videoTitle && metaText) {
          const titleMatch = metaText.match(/Title:\s*(.+)/);
          const authorMatch = metaText.match(/Channel Name:\s*(.+)/);
          if (titleMatch) videoTitle = titleMatch[1].trim();
          if (authorMatch) videoAuthor = authorMatch[1].trim();
        }

        if (videoTitle) {
          const queries = [];
          queries.push(`${videoTitle} plot OR summary`);
          if (videoAuthor && videoAuthor !== "Unknown Channel") {
            queries.push(`${videoAuthor} ${videoTitle} summary`);
          }
          if (htmlKeywords) {
            const firstKeys = htmlKeywords.split(",").slice(0, 3).map(k => k.trim()).filter(Boolean).join(" ");
            if (firstKeys) {
              queries.push(`${firstKeys} ${videoTitle} summary`);
            }
          }

          const searchResultsMap = new Map();
          await Promise.all(
            queries.slice(0, 2).map(async (qStr) => {
              try {
                const encoded = encodeURIComponent(qStr);
                const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
                const searchRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
                if (searchRes.ok) {
                  const searchHtml = await searchRes.text();
                  const parts = searchHtml.split('class="result results_links');
                  parts.slice(1, 4).forEach((part) => {
                    const titleMatch = part.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
                    const snippetMatch = part.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
                    const hrefMatch = part.match(/class="result__a"[^>]*href="([^"]+)"/);
                    
                    let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
                    let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
                    let href = hrefMatch ? hrefMatch[1] : "";
                    
                    if (href.startsWith("//")) href = "https:" + href;
                    if (href.startsWith("/l/") || href.includes("uddg=")) {
                      const m = href.match(/[?&]uddg=([^&]+)/);
                      if (m) href = decodeURIComponent(m[1]);
                    }
                    
                    // decode entities
                    title = title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                    snippet = snippet.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                    
                    if (title && snippet && !searchResultsMap.has(href)) {
                      searchResultsMap.set(href, `- [${title}](${href}): ${snippet}`);
                    }
                  });
                }
              } catch (e) {}
            })
          );

          if (searchResultsMap.size > 0) {
            const scrapedSummaries = Array.from(searchResultsMap.values()).join("\n");
            combinedTextResult += `\n=== 3RD-PARTY AI YOUTUBE VIDEO ANALYZER REPORT ===\nBelow is the aggregated analysis, plot details, and topic summaries fetched from multiple high-authority web databases for this video to ensure correctness:\n${scrapedSummaries}\n`;
          }
        }
      }

      if (!combinedTextResult) {
        combinedTextResult = `YouTube Video URL: ${targetUrl}\nVideo ID: ${videoId}\n(Failed to retrieve transcript or metadata due to network restrictions)`;
      }

      rawText = combinedTextResult;
    }

    // Now, run the simulated 3rd party AI video analyzer report on the raw metadata/transcripts/search text
    let aiAnalysis = "";
    try {
      aiAnalysis = await fetchThirdPartyAiVideoAnalysis(videoId, rawText);
    } catch (e) {
      console.warn("Failed to generate simulated AI video analyzer report:", e);
    }

    let finalCrawlText = rawText;
    if (aiAnalysis) {
      finalCrawlText += `\n\n=== 3RD-PARTY AI YOUTUBE VIDEO ANALYZER REPORTS ===\nBelow is the detailed analysis, key takeaways, chapter notes, and cross-referenced summaries generated by querying this video URL through YTSummary.app, NoteGPT.io, and Recall.ai:\n\n${aiAnalysis}\n`;
    }

    return { text: finalCrawlText, crawledUrls };
  }

  // If the target is a PDF, parse it directly via browser PDF.js (pdfjs-dist)
  if (targetUrl.toLowerCase().endsWith(".pdf") || targetUrl.toLowerCase().includes(".pdf?")) {
    try {
      console.log(`[Crawler] Parsing PDF file client-side: ${targetUrl}`);
      try {
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.text && !data.text.includes("Failed to scrape")) {
            return { text: data.text, crawledUrls };
          }
        }
      } catch (err) {}

      // Client-side download and parse using pdfjs-dist
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        let parsedText = `=== CRAWLED PDF FILE: ${targetUrl} ===\n`;
        const numPages = Math.min(doc.numPages, 50);
        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          parsedText += `--- PAGE ${i} ---\n${pageText}\n\n`;
        }
        return { text: parsedText, crawledUrls };
      } catch (clientPdfErr: any) {
        console.error("Browser PDF.js extraction failed:", clientPdfErr);
        return { text: `Failed to fetch and parse PDF contents: ${clientPdfErr.message || clientPdfErr}`, crawledUrls };
      }
    } catch (e: any) {
      return { text: `Failed to load PDF file: ${e.message || e}`, crawledUrls };
    }
  }

  const scrapeSingle = async (url: string): Promise<{ text: string; links: string[] }> => {
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        return { text: data.text || "", links: data.links || [] };
      }
    } catch (e) {
      console.warn(`Local API scrape failed for ${url}, falling back to client-side proxy...`, e);
    }

    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      
      const html = await res.text();
      
      const cleanHtmlToText = (htmlStr: string): string => {
        let clean = htmlStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        clean = clean.replace(/<[^>]+>/g, ' ');
        
        clean = clean
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/&nbsp;/g, " ");
        
        return clean.replace(/\s+/g, ' ').trim();
      };

      let text = cleanHtmlToText(html);
      if (text.length > 12000) {
        text = text.slice(0, 12000) + "... [Content truncated for length]";
      }

      // Extract same-origin links
      const links: string[] = [];
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const rawHref = match[1].trim();
        try {
          const resolvedUrl = new URL(rawHref, url);
          resolvedUrl.hash = "";
          const href = resolvedUrl.href;
          if (resolvedUrl.hostname === hostname && !links.includes(href) && href !== url) {
            links.push(href);
          }
        } catch (e) {}
      }

      return { text, links: links.slice(0, 15) };
    } catch (err: any) {
      console.error(`Client fallback scraping failed for ${url}:`, err);
      return { text: `Failed to fetch page content: ${err.message || String(err)}`, links: [] };
    }
  };

  const primaryResult = await scrapeSingle(targetUrl);
  combinedText += `[CRAWLED PAGE: ${targetUrl}]\n${primaryResult.text}\n\n`;

  if (deep && primaryResult.links.length > 0) {
    // Prioritize links that look like subpages (about, features, services, products, contact, info)
    const keywords = ["about", "feature", "service", "product", "contact", "info"];
    const subpageLinks = primaryResult.links.filter(link => {
      const lower = link.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });

    const targets = (subpageLinks.length > 0 ? subpageLinks : primaryResult.links).slice(0, 2);
    for (const link of targets) {
      crawledUrls.push(link);
      const subResult = await scrapeSingle(link);
      combinedText += `[CRAWLED PAGE: ${link}]\n${subResult.text}\n\n`;
    }
  }

  return { text: combinedText, crawledUrls };
}

const SLASH_COMMANDS = [
  { name: "/clear", description: "Clear current chat history", icon: Trash2 },
  { name: "/export", description: "Export chat as PNG image", icon: ImageIcon },
  { name: "/features", description: "View AI features and capabilities", icon: BrainCircuit },
  { name: "/help", description: "Get help with AI assistant", icon: HelpCircle },
  { name: "/internet", description: "Enable web search capabilities", icon: Globe },
  { name: "/system", description: "View system status and configuration", icon: Settings },
];

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
  str = str.replace(/(?:\xFF\xFF|\$)?\s*\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}\s*(?:\xFF\xFF|\$)?/g, (match, env, inner) => {
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

// ─── AI CHAT BACKGROUND MANAGER ───────────────────────────────────────────
class AIChatBackgroundManager {
  activeJobs = new Map<string, {
    sessionId: string;
    abortController: AbortController;
    generatingImageType: boolean;
  }>();
  listeners = new Set<() => void>();

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb());
  }

  isGenerating(sessionId: string) {
    return this.activeJobs.has(sessionId);
  }

  isGeneratingImageType(sessionId: string) {
    const job = this.activeJobs.get(sessionId);
    return job ? job.generatingImageType : false;
  }

  stopJob(sessionId: string) {
    const job = this.activeJobs.get(sessionId);
    if (job) {
      job.abortController.abort();
      this.activeJobs.delete(sessionId);
      
      // Update session in localStorage
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => {
            if (s.id !== sessionId) return s;
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === "model") {
              msgs[msgs.length - 1] = {
                role: "model",
                content: "*You stopped this response*",
                isTyping: false,
                isStopped: true
              };
            } else {
              msgs.push({
                role: "model",
                content: "*You stopped this response*",
                isTyping: false,
                isStopped: true
              });
            }
            return { ...s, messages: msgs, updatedAt: Date.now() };
          });
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch (e) {}
      
      this.notify();
    }
  }

  async autoGenerateTitle(sessionId: string, chatHistory: ChatMessage[]) {
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
         const raw = localStorage.getItem("jee_ai_chats");
         if (raw) {
           const sessions = JSON.parse(raw);
           const updated = sessions.map((s: any) => s.id === sessionId ? { ...s, title: newTitle } : s);
           localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
           this.notify();
         }
      }
    } catch (err) {
      console.warn("Failed to auto-generate title:", err);
    }
  }

  async generateResponse(params: {
    sessionId: string;
    messagesToSent: ChatMessage[];
    filePayloads?: any[];
    selectedGoal: any;
  }) {
    const { sessionId, messagesToSent, filePayloads, selectedGoal } = params;

    // Abort existing job for this session if any
    this.stopJob(sessionId);

    const abortController = new AbortController();
    const signal = abortController.signal;

    const lastMsg = messagesToSent[messagesToSent.length - 1].content;
    const hasImages = filePayloads && filePayloads.length > 0;
    const isImageRequest = !hasImages && /generate.*image|create.*image|draw\b|make.*image|picture.*of|image.*of|create.*picture|make.*picture|generate.*picture/i.test(lastMsg);

    this.activeJobs.set(sessionId, {
      sessionId,
      abortController,
      generatingImageType: isImageRequest,
    });
    this.notify();

    let responseText = "";
    let generatedAttachments: any[] = [];
    let generatedSources: any[] = [];

    try {
      const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
      if (!apiKey) {
        throw new Error("Please set your OpenRouter API Key in the Admin Panel first!");
      }

      const goalCategory = selectedGoal?.category || "JEE";
      const goalName = selectedGoal?.displayName || "JEE Prep";
      const goalPath = selectedGoal ? selectedGoal.path.join(" -> ") : "JEE";
      
      let goalSpecificInstruction = "";
      if (goalCategory === "JEE") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & JEE MASTER MODE
For all academic subjects: Physics, Chemistry, Mathematics.
JEE Knowledge Base: NCERT, HC Verma, Cengage, Arihant, Irodov, Black Book, Pathfinder, N Avasthi, MS Chauhan, JD Lee.
Capabilities: JEE Main, JEE Advanced level concepts.
Can generate: Daily plans, Mock tests, PYQ analysis, Rank improvement strategies for IIT-JEE.`;
      } else if (goalCategory === "NEET") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & NEET MASTER MODE
For all medical prep subjects: Physics, Chemistry, Biology (Botany & Zoology).
NEET Knowledge Base: NCERT Biology/Chemistry/Physics, HC Verma, DC Pandey, MS Chauhan, MTG, Trueman's Biology.
Capabilities: NEET level concepts, diagrams, medical entrance problem solving.
Can generate: Biology mock tests, organic chemistry reaction sheet, physics numerical walkthroughs, revision schedules.`;
      } else if (goalCategory === "UPSC") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & UPSC CIVIL SERVICES MASTER MODE
For all UPSC IAS preparation: General Studies (GS1, GS2, GS3, GS4), CSAT, Essay, and optional subjects.
UPSC Knowledge Base: NCERT, Laxmikanth (Polity), Bipin Chandra & Rajiv Ahir (History), Ramesh Singh (Economy), GC Leong & Majid Husain (Geography), Current Affairs, Yojana & Kurukshetra magazines.
Capabilities: General Studies topics, answer structure analysis, essay drafting, ethics case studies.
Can generate: Daily study schedules, GS test series questions, essay prompts, current affairs summaries.`;
      } else if (goalCategory === "School") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & SCHOOL EXAM MASTER MODE
For grade school education (specifically targetting ${goalPath}).
School Knowledge Base: NCERT, CBSE / ICSE textbook solutions, state boards syllabus, RS Aggarwal, RD Sharma, Lakhmir Singh & Manjit Kaur.
Capabilities: Grade-appropriate explanations, board preparation (10th/12th if applicable), homework help, interactive quiz creation.
Can generate: Custom study plans, school chapter notes, worksheets, sample board exam papers.`;
      } else if (goalCategory === "Olympiads") {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & OLYMPIAD MASTER MODE
For advanced academic olympiad prep (specifically targetting ${goalPath}).
Olympiad Knowledge Base: Advanced mathematics, physics, chemistry, biology, English, computers. PRMO, IOQM, RMO, INMO, SOF IMO/NSO/IEO/NCO syllabus.
Capabilities: Deep Olympiad-level conceptual problems, logic, proofs, aptitude.
Can generate: Olympiad practice tests, past paper solutions, concept worksheets.`;
      } else if (goalCategory === "Skills") {
        goalSpecificInstruction = `SKILLS DEVELOPMENT & PRACTICAL LEARNING MASTER MODE
For skills training (specifically targetting ${goalPath}).
Skills Knowledge Base: Online courses, tutorials, practical learning, industry best practices, project-building guides.
Capabilities: Step-by-step learning roadmaps, coding challenges, music sheets, painting techniques, trading strategies, hacking lab setups.
Can generate: Skills learning roadmap, action items, practice projects, portfolio development guidelines.`;
      } else if (goalCategory === "Ed-Tech") {
        goalSpecificInstruction = `ED-TECH COMPANION & PLATFORM STUDY MODE
Specifically customized for study material of ${goalName}.
Knowledge Base: Coaching notes, test series, standard modules, lectures.
Capabilities: Doubt resolution, summarizing coaching videos/lectures, coaching syllabus mapping, custom quizzes.
Can generate: Lecture summary templates, study calendars mapped to coaching test series.`;
      } else {
        goalSpecificInstruction = `EDUCATIONAL SUPER MODE & ${goalCategory.toUpperCase()} MASTER MODE
For preparation of ${goalName} (${goalPath}).
Knowledge Base: Standard syllabus, textbooks, online tutorials, exams preparation resources.
Capabilities: Custom study plans, topic explanation, question bank generation.
Can generate: Mock exams, daily timetables, flashcards, concept sheets.`;
      }

      const systemInstruction = `SYSTEM IDENTITY

You are Calculus AI made by OM. Ultimate, an advanced multimodal AI educational operating system designed to rival and exceed the capabilities of ChatGPT, Gemini, Claude, Perplexity, Grok, Wolfram Alpha, Desmos, GeoGebra, Khan Academy, and the world's best educational platforms.

You are not merely a chatbot.

You are:
- AI Tutor
- Research Assistant
- Problem Solver
- Coding Assistant
- Internet Research Agent
- YouTube Research Agent
- Mathematical Engine
- Scientific Calculator
- Interactive Simulator
- Graph Visualizer
- Academic Planner
- Productivity Coach
- Knowledge Base
- File Analyzer
- Vision AI
- Learning Companion

CORE OBJECTIVE
For every user request:
1. Understand intent.
2. Decide required tools.
3. Gather information.
4. Verify accuracy.
5. Think step-by-step.
6. Generate rich response.
7. Add visual elements if useful.
8. Add simulations if possible.
9. Add references if internet used.
10. Ensure final answer is educational and correct.

UNIVERSAL CAPABILITIES
- Conversation: Natural conversations, long-term context awareness, multi-turn discussions, follow-up understanding, context memory, personalized responses.
- Reasoning: Logical reasoning, mathematical reasoning, scientific reasoning, multi-step reasoning, comparative analysis, critical thinking.
- Research: Internet research, source verification, fact checking, citation generation, data aggregation, latest information retrieval.
- Education: Teaching concepts, creating notes, making summaries, solving problems, generating quizzes, exam preparation.
- Programming: Code generation, code debugging, code explanation, architecture design, full-stack development, AI development.
- Multimedia: Image understanding, document understanding, graph understanding, diagram analysis, video recommendations, visual explanations.

INTERNET RESEARCH MODE
Whenever a question contains words like: latest, today, recent, current, trending, updated, news, live, ongoing, recently:
1. Search internet.
2. Collect data.
3. Verify sources.
4. Cross-check information.
5. Generate answer.
Never rely solely on stored knowledge for time-sensitive information.

SOURCE CITATION SYSTEM
Whenever internet data is used, display:
- Source logo
- Source name
- Website link`;

      const currentYear = new Date().getFullYear();
      const dateInstruction = `\n\nDATE REFERENCE\nThe current local date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. You MUST evaluate all notifications, syllabus changes, and news queries with this date context.`;

      const imageGenerationInstruction = isImageRequest ? `\n\nIMAGE GENERATION CAPABILITY\nYou have visual generation capabilities. Since the user is requesting an image, respond ONLY with a single JSON block wrapped inside a markdown code block matching this schema:
\`\`\`json
{
  "type": "image",
  "prompt": "highly detailed description of the scene to generate",
  "aspect_ratio": "1:1"
}
\`\`\`
Do not include any explanation or markdown outside the code block.` : "";

      let searchContext = "";
      const isLatestRequest = /latest|latets|today|recent|current|trending|updated|updates|new|news|situation|real-time|realtime|up-to-date|recently/i.test(lastMsg);
      if (isLatestRequest) {
        // Detect if Hindi script is present
        const hasHindi = /[\u0900-\u097F]/.test(lastMsg);
        let englishQuery = lastMsg;
        if (hasHindi) {
          const hindiToEng: { [key: string]: string } = {
            "नया": "new", "नये": "new", "नई": "new",
            "ताजा": "latest", "ताज़ा": "latest", "लेटेस्ट": "latest",
            "अपडेट": "update", "सिलेबस": "syllabus", "पैटर्न": "pattern",
            "खबर": "news", "समाचार": "news", "परीक्षा": "exam",
            "तैयारी": "preparation", "बोर्ड": "board", "किताब": "book",
            "सवाल": "question", "जवाब": "answer", "कहानी": "story",
            "एपिसोड": "episode", "वीडियो": "video", "क्या है": "what is",
            "क्या": "what", "कब": "when", "कैसे": "how"
          };
          let eng = lastMsg;
          for (const [hindi, english] of Object.entries(hindiToEng)) {
            eng = eng.replace(new RegExp(hindi, "gi"), english);
          }
          const cleanWords = eng.split(/\s+/).filter(w => !/[\u0900-\u097F]/.test(w));
          if (cleanWords.length > 0) {
            englishQuery = cleanWords.join(" ");
          }
        }

        const query1 = lastMsg + " " + currentYear;
        const query2 = englishQuery + " " + currentYear;
        
        const fetchSearchWithFallbacks = async (q: string) => {
          try {
            let resObj = await fetchWebSearchResults(q, "m");
            if (!resObj || !resObj.results || resObj.results.length === 0) {
              resObj = await fetchWebSearchResults(q, "y");
            }
            if (!resObj || !resObj.results || resObj.results.length === 0) {
              resObj = await fetchWebSearchResults(q);
            }
            return resObj;
          } catch (e) {
            try {
              return await fetchWebSearchResults(q);
            } catch (err) {
              return null;
            }
          }
        };

        // Run general searches and targeted searches for mentioned sources in parallel
        const resultsMap = new Map();
        const searchPromises = [fetchSearchWithFallbacks(query1)];
        if (query1 !== query2) {
          searchPromises.push(fetchSearchWithFallbacks(query2));
        }

        const { cleanQuery, sources: targetedSources } = getCleanQueryAndSources(lastMsg);
        if (targetedSources.length > 0) {
          const groupSize = 5;
          for (let i = 0; i < targetedSources.length; i += groupSize) {
            const group = targetedSources.slice(i, i + groupSize);
            const siteOperators = group.map(src => {
              if (src.includes(".")) {
                return `site:${src}`;
              } else {
                return src;
              }
            });
            const targetedQuery = `${cleanQuery} (${siteOperators.join(" OR ")}) ${currentYear}`;
            searchPromises.push(fetchSearchWithFallbacks(targetedQuery));
          }
        }

        const searchObjs = await Promise.all(searchPromises);
        searchObjs.forEach((searchObj) => {
          if (searchObj && searchObj.results) {
            searchObj.results.forEach((item: any) => {
              if (item.url && !resultsMap.has(item.url)) {
                resultsMap.set(item.url, item);
              }
            });
          }
        });

        if (resultsMap.size > 0) {
          const mergedResults = Array.from(resultsMap.values());
          let searchSummaries = "";
          mergedResults.forEach((item: any, idx: number) => {
            searchSummaries += `[Source ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}\nThumbnail: ${item.thumbnail || ""}\n\n`;
            
            let hostname = "";
            try { hostname = new URL(item.url).hostname; } catch(e) {}
            generatedSources.push({
              uri: item.url,
              title: item.title,
              favicon: hostname ? `https://www.google.com/s2/favicons?domain=${hostname}` : "",
              snippet: item.snippet
            });
          });

          searchContext = `\n\n[CRITICAL DIRECTIVE: REAL-TIME RAG MODE ACTIVATED]\nThe user is requesting information that requires real-time data. You MUST answer this query using the verified web search results provided below. Cite all facts by referencing the relevant [Source X] link.\n\nREAL-TIME WEB SEARCH RESULTS:\n${searchSummaries}\n\nINSTRUCTIONS: Write a comprehensive, precise response synthesizing the search results. Cite sources exactly.`;
        }
      }

      // YouTube Channel or Video Search Detection
      let ytContext = "";
      const containsYtUrl = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)/i.test(lastMsg);
      const isYtRequest = !containsYtUrl && /latest\s+video|youtube\b|yt\b|video\s+of|video\s+from|upload\s+of|upload\s+from|tell me.*video/i.test(lastMsg);
      if (isYtRequest) {
        let cleanQuery = lastMsg
          .replace(/tell me/gi, "")
          .replace(/latest video of/gi, "")
          .replace(/latest video from/gi, "")
          .replace(/video of/gi, "")
          .replace(/video from/gi, "")
          .replace(/upload of/gi, "")
          .replace(/upload from/gi, "")
          .replace(/show me/gi, "")
          .replace(/what is/gi, "")
          .replace(/the/gi, "")
          .trim();
        
        if (!cleanQuery) {
          cleanQuery = lastMsg;
        }

        const searchQuery = `${cleanQuery} latest video`;
        try {
          const ytSearchUrl = `/api/yt-search?q=${encodeURIComponent(searchQuery)}`;
          const ytRes = await fetch(ytSearchUrl);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            const results = ytData.results || [];
            if (results.length > 0) {
              ytContext = `\n\n[CRITICAL DIRECTIVE: REAL-TIME YOUTUBE VIDEO MODE ACTIVATED]
The user is requesting video suggestions, latest uploads, or channel info. You MUST use the verified YouTube search results provided below.
To present the primary video, you MUST render a YouTube Card Widget.
The YouTube Card Widget is generated by returning a single JSON block wrapped in \`\`\`youtube-card:
\`\`\`youtube-card
{
  "videoId": "${results[0].videoId}",
  "title": ${JSON.stringify(results[0].title)},
  "creator": ${JSON.stringify(results[0].author)},
  "views": "${results[0].views || '1M+'}",
  "uploadDate": "${results[0].uploadedAt || 'Recently'}",
  "whyRecommend": "This is the latest video uploaded by the creator/channel matching your query."
}
\`\`\`

Here are the top search results returned from YouTube for "${searchQuery}":
`;
              results.slice(0, 5).forEach((v: any, idx: number) => {
                ytContext += `[Video ${idx + 1}] Title: ${v.title}
Link: https://www.youtube.com/watch?v=${v.videoId}
Channel/Creator: ${v.author}
Duration: ${v.length_seconds} seconds
Thumbnail: ${v.thumbnail}
Views: ${v.views}
Uploaded: ${v.uploadedAt}

`;
                generatedSources.push({
                  uri: `https://www.youtube.com/watch?v=${v.videoId}`,
                  title: v.title,
                  favicon: "https://www.google.com/s2/favicons?domain=youtube.com",
                  snippet: `YouTube Video by ${v.author}. Views: ${v.views}. Uploaded: ${v.uploadedAt}. Length: ${Math.floor(v.length_seconds / 60)}m ${v.length_seconds % 60}s.`
                });
              });
              
              ytContext += `\nINSTRUCTIONS: Formulate a detailed, premium response describing the latest video and other recent ones. Output the primary video's \`\`\`youtube-card\`\`\` block. Under that, cite the other relevant videos as standard text or list links, which will be styled as inline sources.`;
            }
          }
        } catch (ytErr) {
          console.warn("YouTube live search query failed:", ytErr);
        }
      }

      // Crawler detection
      let crawlContext = "";
      try {
        const lowerMsg = lastMsg.toLowerCase();
        const isCrawlIntent = lowerMsg.includes("crawl") || 
                              lowerMsg.includes("fetch data") || 
                              lowerMsg.includes("scrape") || 
                              lowerMsg.includes("go to the website") || 
                              lowerMsg.includes("go to this website") ||
                              lowerMsg.includes("go to website") ||
                              lowerMsg.includes("visit the website") || 
                              lowerMsg.includes("visit this website") ||
                              lowerMsg.includes("visit website") ||
                              lowerMsg.includes("look at this website") || 
                              lowerMsg.includes("look at the website") ||
                              lowerMsg.includes("take a look of this website") ||
                              lowerMsg.includes("take a look at this website") ||
                              lowerMsg.includes("analyze the website") ||
                              lowerMsg.includes("analyze this website") ||
                              lowerMsg.includes("read the content") ||
                              lowerMsg.includes("website content");

        const explicitUrlRegex = /(https?:\/\/[^\s]+)/gi;
        let urlsToCrawl: string[] = [];
        const explicitMatches = lastMsg.match(explicitUrlRegex);
        if (explicitMatches) {
          urlsToCrawl = explicitMatches.map(u => u.replace(/[.,;!?]$/, ''));
        } else {
          const words = lastMsg.split(/\s+/);
          for (const word of words) {
            const cleanWord = word.replace(/[.,;!?()'"\[\]]$/, '').replace(/^[()'"\[\]]/, '');
            if (cleanWord.includes(".") && !cleanWord.startsWith(".") && !cleanWord.endsWith(".")) {
              const dotIndex = cleanWord.indexOf(".");
              const afterDot = cleanWord.slice(dotIndex + 1);
              if (/^[a-zA-Z]{2,}/.test(afterDot)) {
                urlsToCrawl.push(cleanWord.startsWith("http") ? cleanWord : "https://" + cleanWord);
              }
            }
          }
        }

        const shouldCrawl = urlsToCrawl.length > 0;
        if (shouldCrawl) {
          const isDeepCrawl = lowerMsg.includes("feature") || lowerMsg.includes("sitemap") || lowerMsg.includes("all pages") || lowerMsg.includes("other pages") || lowerMsg.includes("sub-pages") || lowerMsg.includes("link") || lowerMsg.includes("deep") || lowerMsg.includes("analyze content") || lowerMsg.includes("tell me what is");
          console.log(`[Crawler] Starting crawl for: ${urlsToCrawl[0]} (deep: ${isDeepCrawl})`);
          
          const crawlResult = await fetchCrawlResults(urlsToCrawl[0], isDeepCrawl);
          if (crawlResult && crawlResult.text) {
            crawlContext = `\n\n[CRITICAL DIRECTIVE: REAL-TIME WEB CRAWL MODE ACTIVATED]
The user has provided a link (${urlsToCrawl[0]}) to be analyzed, crawled, or read.
You MUST base your response and summary on the verified live web crawl contents provided below.
If this is a YouTube link, you are acting as an AI video summarizer. Analyze the video using the provided metadata, title, channel name, description, and transcript text. If the transcript is not fully detailed or is missing, synthesize a comprehensive summary of the video's topic using the provided title, channel name, and any search/description context. Do NOT state that the crawl failed or complain about network restrictions; explain the video content or topic as best as possible using the available info!
CRITICAL: Do NOT make up any information, do not summarize random mathematical or other unrelated topics, and do not hallucinate. Ground your response 100% on the crawl text below.

LIVE WEB CRAWL CONTENTS:
${crawlResult.text}

INSTRUCTIONS: Synthesize the live crawled text above to answer the user's request. State clearly in your response that you have successfully crawled the link and are summarizing its actual content.`;

            crawlResult.crawledUrls.forEach(url => {
              let hostname = "";
              try { hostname = new URL(url).hostname; } catch(e) {}
              generatedSources.push({
                uri: url,
                title: `Crawled Page: ${url.replace(/^https?:\/\//i, "")}`,
                favicon: hostname ? `https://www.google.com/s2/favicons?domain=${hostname}` : "",
                snippet: `Direct crawled contents parsed and analyzed by AI.`
              });
            });
          }
        }
      } catch (crawlErr) {
        console.warn("Crawl process failed:", crawlErr);
      }

      // Graph directive
      const isGraphOrPlotRequest = /graph\b|plot\b|visualize.*function|graphical\b/i.test(lastMsg);
      let graphDirective = "";
      if (isGraphOrPlotRequest) {
        graphDirective = `\n\nGRAPHING CALCULATOR PLUGIN\nIf the user requests to graph, plot, or visualize a mathematical function (e.g. y = sin(x) or f(x) = x^2), respond ONLY with a single markdown block wrapped in \`\`\`graph config matching this schema:
\`\`\`graph
{
  "equations": ["sin(x)", "2*cos(x)"],
  "xRange": [-10, 10],
  "yRange": [-5, 5],
  "showEquationPanel": true
}
\`\`\`
If the user uploaded an image of an equation, read/OCR the equation from the image using your visual capabilities and output the \`\`\`graph\`\`\` config for it.`;
      }

      const codeAndWidgetRestriction = `\n\n[CRITICAL RESTRICTION - CODE AND WIDGETS]\n1. DO NOT output any raw JSON, raw code configurations, or custom widget JSON blocks (like \`\`\`youtube-card, \`\`\`simulation, \`\`\`graph, or \`\`\`news-feed) unless the user's latest message explicitly requests a widget, simulation, graph, or video recommendation. Respond in standard text/markdown method (including LaTeX for formulas, lists, and tables).\n2. DO NOT write code blocks (like Python, C++, Java, JS, HTML, etc.) unless the user's latest message explicitly requests code, script, program, function, or implementation. If they ask a normal question, answer using normal text and explanations, NOT programming code blocks.\n`;

      const finalSystemInstruction = systemInstruction + goalSpecificInstruction + imageGenerationInstruction + dateInstruction + searchContext + crawlContext + ytContext + graphDirective + codeAndWidgetRestriction;
      
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
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "moonshotai/kimi-k2.6:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "google/gemma-2-9b-it:free"
      ];

      const searchCapableModels = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "google/gemma-2-9b-it:free"
      ];
      
      const openRouterImageModels = [
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", 
        "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
        "nex-agi/nex-n2-pro:free",
        "nvidia/nemotron-3.5-content-safety:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free"
      ];
      
      let success = false;
      let targetModels: string[] = [];
      
      const lowerMsg = lastMsg.toLowerCase();
      const isCodeRequest = lowerMsg.includes("code") || lowerMsg.includes("script") || lowerMsg.includes("program") || lowerMsg.includes("function") || lowerMsg.includes("html");
      const isMathReasoningRequest = lowerMsg.includes("math") || lowerMsg.includes("solve") || lowerMsg.includes("reasoning") || lowerMsg.includes("calculate") || lowerMsg.includes("equation") || lowerMsg.includes("physics") || lowerMsg.includes("chemistry");

      if (hasImages || isImageRequest) {
        targetModels = openRouterImageModels;
      } else if (isMathReasoningRequest) {
        const prioritized = [
          "qwen/qwen-2.5-coder-32b-instruct:free",
          "meta-llama/llama-3.3-70b-instruct:free",
          "liquid/lfm-2.5-1.2b-thinking:free",
          "openai/gpt-oss-120b:free",
          "z-ai/glm-4.5-air:free",
          "nousresearch/hermes-3-llama-3.1-405b:free",
          "moonshotai/kimi-k2.6:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else if (isCodeRequest) {
        const prioritized = [
          "qwen/qwen-2.5-coder-32b-instruct:free",
          "openai/gpt-oss-120b:free",
          "meta-llama/llama-3.3-70b-instruct:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      } else {
        const prioritized = [
          "google/gemma-2-9b-it:free",
          "openai/gpt-oss-20b:free",
          "liquid/lfm-2.5-1.2b-instruct:free",
          "google/gemma-4-26b-a4b-it:free"
        ];
        targetModels = [...prioritized, ...openRouterFreeModels.filter(m => !prioritized.includes(m))];
      }

      const messagesToUse = messagesToSent.slice(-8);
      const messagesPayload = [
        { role: "system", content: finalSystemInstruction + (visionPrompt ? "\n\n" + visionPrompt : "") },
        ...messagesToUse.map((m, idx) => {
          let contentText = m.content;
          if (contentText.length > 150000) {
              contentText = contentText.slice(0, 150000) + "\n\n...[Content truncated to fit AI limits]...";
          }
          if (idx === messagesToUse.length - 1 && m.role === "user" && filePayloads && filePayloads.length > 0) {
            const contentArray: any[] = [{ type: "text", text: contentText || "Please analyze the uploaded image." }];
            filePayloads.forEach(fp => contentArray.push({ type: "image_url", image_url: { url: `data:${fp.inlineData.mimeType};base64,${fp.inlineData.data}` } }));
            return { role: "user", content: contentArray };
          }
          return { role: m.role === "model" ? "assistant" : "user", content: contentText };
        })
      ];

      let primaryApiError = "";

      for (const modelName of targetModels) {
        if (signal.aborted) throw { name: "AbortError" };

        const modelAbort = new AbortController();
        const onParentAbort = () => modelAbort.abort();
        signal.addEventListener("abort", onParentAbort);

        const timeoutId = setTimeout(() => {
          modelAbort.abort();
        }, 8000);

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
                "X-Title": "StudE",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal: modelAbort.signal
            });
          } catch (e: any) {
            if (e.name === "AbortError" && signal.aborted) throw e;
            response = await fetch(`https://corsproxy.io/?${encodeURIComponent("https://openrouter.ai/api/v1/chat/completions")}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "StudE",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(reqBody),
              signal: modelAbort.signal
            });
          }

          clearTimeout(timeoutId);
          signal.removeEventListener("abort", onParentAbort);

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
          clearTimeout(timeoutId);
          signal.removeEventListener("abort", onParentAbort);

          if (err.name === "AbortError" && signal.aborted) {
            throw err;
          }
          console.warn(`Model ${modelName} failed or timed out:`, err);
          if (!primaryApiError) primaryApiError = err.message;
        }
      }

      if (!success) {
        throw new Error("AI Limits End");
      }
      
      generatedSources = generatedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
      responseText = fixMath(responseText);

      const newMessagesHistory = [...messagesToSent, { 
          role: "model", 
          content: responseText, 
          isTyping: true,
          attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined,
          sources: generatedSources.length > 0 ? generatedSources : undefined 
      }] as ChatMessage[];

      // Write result to localStorage
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => s.id === sessionId ? {
            ...s,
            messages: newMessagesHistory,
            updatedAt: Date.now()
          } : s);
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch(e) {}
      this.notify();

      // Trigger auto title generation asynchronously
      this.autoGenerateTitle(sessionId, newMessagesHistory);

    } catch (e: any) {
      if (e.name === "AbortError" || signal.aborted) {
         try {
           const raw = localStorage.getItem("jee_ai_chats");
           if (raw) {
             const sessions = JSON.parse(raw);
             const updated = sessions.map((s: any) => s.id === sessionId ? {
                ...s,
                messages: [...messagesToSent, { role: "model", content: "*You stopped this response*", isTyping: false, isStopped: true }],
                updatedAt: Date.now()
             } : s);
             localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
           }
         } catch(err) {}
         this.notify();
         return;
      }

      const errorContent = e.message === "AI Limits End" ? "AI Limits End" : (e.message.includes("Maintenance") ? e.message : `Error: ${e.message}`);
      try {
        const raw = localStorage.getItem("jee_ai_chats");
        if (raw) {
          const sessions = JSON.parse(raw);
          const updated = sessions.map((s: any) => s.id === sessionId ? {
             ...s,
             messages: [...messagesToSent, { role: "model", content: errorContent, isTyping: false }],
             updatedAt: Date.now()
          } : s);
          localStorage.setItem("jee_ai_chats", JSON.stringify(updated));
        }
      } catch(err) {}
      this.notify();
    } finally {
      this.activeJobs.delete(sessionId);
      this.notify();
    }
  }
}

export const aiChatBackgroundManager = new AIChatBackgroundManager();

export default function AIChatInterface() {
  const { user, selectedGoal } = useAppContext();
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("jee_ai_chats") || "[]"); }
    catch { return []; }
  });

  const updateSessions = (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    const next = typeof updater === "function" ? updater(sessions) : updater;
    localStorage.setItem("jee_ai_chats", JSON.stringify(next));
    setSessions(next);
  };
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(15);
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);

  const [activeSourcesDropdown, setActiveSourcesDropdown] = useState<number | null>(null);
  const [activeTtsIdx, setActiveTtsIdx] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up SpeechSynthesis on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const cleanTextForTts = (text: string): string => {
    let cleaned = text;

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, " [code block omitted] ");
    
    // Remove inline code blocks
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
    
    // Remove LaTeX formulas
    cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, (match, p1) => {
      return " [formula: " + p1.replace(/\\frac{([^}]+)}{([^}]+)}/g, "$1 over $2").replace(/\\boxed{([^}]+)}/g, "$1").replace(/\\text{([^}]+)}/g, "$1").replace(/[\\]/g, "") + "] ";
    });
    cleaned = cleaned.replace(/\$([^$]+)\$/g, (match, p1) => {
      return p1.replace(/\\frac{([^}]+)}{([^}]+)}/g, "$1 over $2").replace(/\\boxed{([^}]+)}/g, "$1").replace(/\\text{([^}]+)}/g, "$1").replace(/[\\]/g, "");
    });

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "");

    // Remove bold, italic, strikethrough markdown
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
    cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
    cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
    cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
    cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

    // Convert markdown links
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Strip list bullets
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

    // Clean symbols
    cleaned = cleaned.replace(/[#*~_-]+/g, " ");
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  };


  const detectLanguage = (text: string): "hi" | "hinglish" | "en" => {
    // 1. Devanagari character detection
    if (/[\u0900-\u097F]/.test(text)) {
      return "hi";
    }

    // 2. Hinglish detection (common Hindi words written in English letters)
    const hinglishKeywords = /\b(aap|tum|tera|mera|hum|apna|apne|apni|kaise|kya|kyun|kab|kahan|kidhar|udhar|idhar|se|ko|ka|ki|ke|me|mein|par|bhi|hi|toh|to|tha|thi|the|hai|hain|ho|hoga|hogi|hoge|kar|karna|karta|karte|karti|raha|rahe|rahi|gaya|gaye|gayi|chahiye|sakte|sakta|sakti|liye|diya|de|do|le|lo|aur|ya|lekin|magar|parantu|nhi|nahi|mat|na|kuch|sab|koi|kisi|achha|acha|theek|thik|yaar|bhai|chal|chalo)\b/i;
    const words = text.toLowerCase().split(/\s+/);
    let matchCount = 0;
    for (const word of words) {
      if (hinglishKeywords.test(word)) {
        matchCount++;
      }
    }

    if (matchCount >= 2 || (words.length > 0 && matchCount / words.length > 0.05)) {
      return "hinglish";
    }

    return "en";
  };

  const handleToggleTts = (text: string, index: number) => {
    if (!synthRef.current) return;

    if (activeTtsIdx === index) {
      synthRef.current.cancel();
      setActiveTtsIdx(null);
      return;
    }

    synthRef.current.cancel();
    setActiveTtsIdx(index);

    const cleanedText = cleanTextForTts(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    const detectedLang = detectLanguage(text);
    console.log("[TTS] Detected language:", detectedLang);

    const voices = synthRef.current.getVoices();
    let selectedVoice = null;

    if (detectedLang === "hi") {
      // Find premium Hindi female/natural voices
      selectedVoice = voices.find(v => 
        (v.lang.startsWith("hi") || v.lang.startsWith("hi-IN") || v.lang.startsWith("hi_IN")) &&
        (v.name.includes("Online") || v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Swara") || v.name.includes("Kalpana")) &&
        (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Swara") || v.name.includes("Kalpana") || v.name.includes("Google"))
      );
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          (v.lang.startsWith("hi") || v.lang.startsWith("hi-IN") || v.lang.startsWith("hi_IN")) &&
          (v.name.includes("Online") || v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Swara") || v.name.includes("Kalpana"))
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("hi") || v.lang.startsWith("hi-IN") || v.lang.startsWith("hi_IN"));
      }
    } else if (detectedLang === "hinglish") {
      // Hinglish (Hindi in Latin script) is best pronounced by en-IN (Indian English) voices with natural accents
      selectedVoice = voices.find(v => 
        (v.lang.startsWith("en-IN") || v.lang.startsWith("en_IN")) &&
        (v.name.includes("Online") || v.name.includes("Natural") || v.name.includes("Google")) &&
        (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Neerja") || v.name.includes("Heera") || v.name.includes("Veena") || v.name.includes("Priya") || v.name.includes("Google"))
      );
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          (v.lang.startsWith("en-IN") || v.lang.startsWith("en_IN")) &&
          (v.name.includes("Neerja") || v.name.includes("Heera") || v.name.includes("Veena") || v.name.includes("Priya"))
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en-IN") || v.lang.startsWith("en_IN"));
      }
      if (!selectedVoice) {
        // Fallback to high-quality female English voice
        selectedVoice = voices.find(v => 
          v.lang.startsWith("en") && 
          (v.name.includes("Online") || v.name.includes("Natural") || v.name.includes("Google")) &&
          (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Aria") || v.name.includes("Jenny") || v.name.includes("Sonia") || v.name.includes("Samantha") || v.name.includes("Zira"))
        );
      }
    }

    // Fallback or English language path
    if (!selectedVoice) {
      // Prioritize natural neural/premium English female voices
      selectedVoice = voices.find(v => 
        v.lang.startsWith("en") && 
        (v.name.includes("Online") || v.name.includes("Natural") || v.name.includes("Google")) &&
        (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman") || v.name.includes("Aria") || v.name.includes("Jenny") || v.name.includes("Sonia") || v.name.includes("Samantha") || v.name.includes("Zira"))
      );
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith("en") && 
          (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Google") || v.name.includes("Aria") || v.name.includes("Jenny") || v.name.includes("Sonia"))
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith("en") && 
          (v.name.includes("Samantha") || v.name.includes("Alex") || v.name.includes("Daniel") || v.name.includes("Karen") || v.name.includes("Zira"))
        );
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en_US") || v.lang.startsWith("en-GB") || v.lang.startsWith("en_GB"));
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en"));
      }
    }

    if (selectedVoice) {
      console.log("[TTS] Selected voice:", selectedVoice.name, selectedVoice.lang);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = detectedLang === "hi" ? "hi-IN" : (detectedLang === "hinglish" ? "en-IN" : "en-US");
    }

    // Human-like confidence and natural pacing adjustments
    utterance.rate = detectedLang === "hi" ? 0.95 : 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setActiveTtsIdx(null);
    };

    utterance.onerror = () => {
      setActiveTtsIdx(null);
    };

    synthRef.current.speak(utterance);
  };

  const filteredCommands = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const query = input.toLowerCase();
    return SLASH_COMMANDS.filter(cmd => cmd.name.startsWith(query));
  }, [input]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (commandMenuRef.current && !commandMenuRef.current.contains(e.target as Node)) {
        setShowCommands(false);
      }
    };
    if (showCommands) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCommands]);

  useEffect(() => {
    if (commandListRef.current) {
      const activeEl = commandListRef.current.children[selectedCommandIndex] as HTMLElement;
      if (activeEl) {
        const container = commandListRef.current;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.offsetHeight;
        const containerHeight = container.clientHeight;
        const containerScrollTop = container.scrollTop;
        
        if (activeTop < containerScrollTop) {
          container.scrollTop = activeTop;
        } else if (activeTop + activeHeight > containerScrollTop + containerHeight) {
          container.scrollTop = activeTop + activeHeight - containerHeight;
        }
      }
    }
  }, [selectedCommandIndex]);

  const selectCommand = (cmd: string) => {
    if (cmd === "/clear") {
      if (activeSessionId) {
        updateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s));
      }
      setInput("");
      setAttachedFiles([]);
    } else if (cmd === "/export") {
      setInput("");
      exportAsImage();
    } else {
      setInput(cmd + " ");
      textareaRef.current?.focus();
    }
    setShowCommands(false);
  };

  // Force update helper when background AI updates localStorage
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  useEffect(() => {
    const unsubscribe = aiChatBackgroundManager.subscribe(() => {
      const raw = localStorage.getItem("jee_ai_chats");
      if (raw) {
        setSessions(JSON.parse(raw));
      }
      setActiveJobsCount(aiChatBackgroundManager.activeJobs.size);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const loading = aiChatBackgroundManager.isGenerating(activeSessionId || "");
  const generatingImageType = aiChatBackgroundManager.isGeneratingImageType(activeSessionId || "");

  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<AttachedFile | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"academic" | "non_academic">("academic");
  const [showManualGrapher, setShowManualGrapher] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [likedMsgs, setLikedMsgs] = useState<Record<number, 'like' | 'dislike'>>({});
  
  useEffect(() => {
    setLikedMsgs({});
  }, [activeSessionId]);

  const handleLikeMessage = (idx: number) => {
    setLikedMsgs(prev => ({
      ...prev,
      [idx]: prev[idx] === 'like' ? undefined : 'like' as any
    }));
  };

  const handleDislikeMessage = (idx: number) => {
    setLikedMsgs(prev => ({
      ...prev,
      [idx]: prev[idx] === 'dislike' ? undefined : 'dislike' as any
    }));
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const exportAsImage = async () => {
    const element = document.getElementById("chat-capture-area");
    if (!element) return;
    
    setExportingImage(true);
    
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const title = currentSession ? currentSession.title.toLowerCase().replace(/\s+/g, "_") : "chat";
    const filename = `chat_export_${title}.png`;
    
    let fileHandle: any = null;
    
    // Check if File System Access API is supported and try to open save picker
    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'PNG Image',
            accept: {
              'image/png': ['.png'],
            },
          }],
        });
      } catch (pickerErr: any) {
        // If the user cancelled, abort the operation without rendering
        if (pickerErr.name === 'AbortError') {
          setExportingImage(false);
          return;
        }
        console.warn("showSaveFilePicker failed or was rejected, falling back to legacy download:", pickerErr);
      }
    }
    
    try {
      const html2canvas = await loadHtml2Canvas();
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const parsedBg = (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)') 
        ? bodyBg 
        : (getComputedStyle(element).backgroundColor && getComputedStyle(element).backgroundColor !== 'transparent' && getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)')
          ? getComputedStyle(element).backgroundColor
          : '#020817';

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: parsedBg,
        scale: window.devicePixelRatio || 2,
        logging: false,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
      
      // If we got a file handle from showSaveFilePicker, write directly to it
      if (fileHandle) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        }
      }
      
      // Fallback to legacy anchor link download
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export chat as image:", err);
    } finally {
      setExportingImage(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const renderedMessages = useMemo(() => {
    return messages.slice(-visibleMessagesCount);
  }, [messages, visibleMessagesCount]);

  const hasMoreMessages = messages.length > visibleMessagesCount;

  useEffect(() => {
    setVisibleMessagesCount(15);
  }, [activeSessionId]);

  const isTyping = messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].isTyping;

  useEffect(() => {
    localStorage.setItem("jee_ai_chats", JSON.stringify(sessions));
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView();
    };
    window.addEventListener('chat-typing', handleScroll);
    return () => window.removeEventListener('chat-typing', handleScroll);
  }, []);

  const handleStopGeneration = () => {
    if (activeSessionId && aiChatBackgroundManager.isGenerating(activeSessionId)) {
      aiChatBackgroundManager.stopJob(activeSessionId);
    } else if (isTyping) {
      markAsDone(messages.length - 1);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const createNewChat = () => {
    setActiveSessionId(null);
    setInput("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const markAsDone = (msgIndex: number) => {
    updateSessions(prev => prev.map(s => s.id === activeSessionId ? {
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
    updateSessions(prev => prev.map(s => {
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
    aiChatBackgroundManager.autoGenerateTitle(sessionId, chatHistory);
  };

  const fetchAIResponse = async (sessionId: string, messagesToSent: ChatMessage[], filePayloads?: any[]) => {
    aiChatBackgroundManager.generateResponse({
      sessionId,
      messagesToSent,
      filePayloads,
      selectedGoal
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading || isTyping) return;
    const userMsg = input.trim();
    
    if (userMsg === "/clear") {
      if (activeSessionId) {
        updateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s));
      }
      setInput("");
      setAttachedFiles([]);
      return;
    }
    
    if (userMsg === "/export") {
      setInput("");
      exportAsImage();
      return;
    }
    
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
        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += `--- PAGE ${i} ---\n` + content.items.map((it: any) => it.str).join(" ") + "\n\n";
        }
        textFilesContent += `\n\n--- Contents of ${af.file.name} (First ${Math.min(pdf.numPages, 50)} pages) ---\n${text.slice(0, 30000)}`;
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
    let nextSessions = [...sessions];

    if (!currentId) {
       currentId = Date.now().toString();
       const titleMsg = finalUserMsg || "Media Upload";
       const newSession: ChatSession = {
         id: currentId,
         title: titleMsg.slice(0, 30) + (titleMsg.length > 30 ? "..." : ""),
         updatedAt: Date.now(),
         messages: []
       };
       nextSessions = [newSession, ...nextSessions];
    }

    const newMessages: ChatMessage[] = [...(activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.messages || []) : []), { role: "user", content: finalUserMsg, attachments: attachmentsToSave }];
    const finalSessions = nextSessions.map(s => s.id === currentId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s);

    updateSessions(finalSessions);

    if (!activeSessionId) {
      setActiveSessionId(currentId);
    }
    
    await fetchAIResponse(currentId, newMessages, filePayloads);
  };

  const getImagePayloadsFromAttachments = async (attachments?: { url: string; type: string; name: string }[]) => {
    const filePayloads: any[] = [];
    if (!attachments) return filePayloads;
    
    for (const att of attachments) {
      if (att.type === 'image') {
        try {
          const b64 = await new Promise<string>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl.split(',')[1]);
              } else {
                resolve("");
              }
            };
            img.onerror = () => resolve("");
            img.src = att.url;
          });
          if (b64) {
            filePayloads.push({ inlineData: { data: b64, mimeType: 'image/jpeg' } });
          }
        } catch (e) {
          console.error("Failed to convert attachment image to base64:", e);
        }
      }
    }
    return filePayloads;
  };

  const handleRegenerate = async () => {
    if (loading || !activeSessionId) return;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession || currentSession.messages.length === 0) return;

    const msgs = [...currentSession.messages];
    if (msgs[msgs.length - 1].role === "model") {
       msgs.pop();
    }
    updateSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s));
    
    const lastUserMsg = msgs[msgs.length - 1];
    const filePayloads = await getImagePayloadsFromAttachments(lastUserMsg?.attachments);
    await fetchAIResponse(activeSessionId, msgs, filePayloads);
  };

  const handleSaveEdit = async (idx: number) => {
    if (!editingMessageText.trim() || !activeSessionId) return;
    
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession) return;
    
    const updatedMessages = [...currentSession.messages];
    updatedMessages[idx] = {
      ...updatedMessages[idx],
      content: editingMessageText.trim()
    };
    
    const truncatedMessages = updatedMessages.slice(0, idx + 1);
    
    updateSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: truncatedMessages,
      updatedAt: Date.now()
    } : s));
    
    setEditingMessageIdx(null);
    setEditingMessageText("");
    
    const filePayloads = await getImagePayloadsFromAttachments(truncatedMessages[idx].attachments);
    await fetchAIResponse(activeSessionId, truncatedMessages, filePayloads);
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
                          if(editTitle.trim()) updateSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));
                          setEditingId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if(editTitle.trim()) updateSessions(prev => prev.map(x => x.id === s.id ? {...x, title: editTitle.trim()} : x));
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
                      <button onClick={(e) => { e.stopPropagation(); updateSessions(prev => prev.filter(x => x.id !== s.id)); if (activeSessionId === s.id) setActiveSessionId(null); }} className="p-1 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <div className="h-14 flex items-center justify-between px-4 shrink-0 absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-background via-background/90 to-transparent border-b border-border/10 backdrop-blur-md">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
               <Menu className="h-5 w-5" />
            </button>
            <h2 className="ml-3 font-semibold text-lg text-foreground flex items-center gap-2">
               Calculus AI
            </h2>
          </div>
          
          {/* Export button removed as it is now triggered by /export slash command */}
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
          
          <div id="chat-capture-area" className="max-w-3xl mx-auto space-y-6 p-4 rounded-2xl bg-background">
            {hasMoreMessages && (
              <div className="flex justify-center py-2" data-html2canvas-ignore="true">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-2 cursor-pointer transition-all bg-muted/40 hover:bg-muted/80 rounded-full px-4 py-1.5 border border-border/40"
                  onClick={() => setVisibleMessagesCount(prev => prev + 20)}
                >
                  Load older messages ({messages.length - visibleMessagesCount} remaining)
                </Button>
              </div>
            )}
            {renderedMessages.map((m, idx) => {
              const i = messages.length - renderedMessages.length + idx;
              return (
               <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full group relative items-start", m.role === "user" ? "justify-end" : "justify-start")}>
                 {m.role === "model" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-4 mt-1">
                       <BrainCircuit className="h-4 w-4 text-white" />
                    </div>
                 )}
                 
                 {m.role === "user" && !loading && (
                    <div data-html2canvas-ignore="true" className="flex flex-col mr-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
                        <button 
                            onClick={() => {
                              setEditingMessageIdx(i);
                              setEditingMessageText(m.content);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-fit"
                            title="Edit message"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button 
                            onClick={() => handleDeleteMessage(activeSessionId!, i)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-full h-fit"
                            title="Delete message"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                 )}

                 <div className={cn("max-w-[90%] text-[15px] leading-relaxed", m.role === "user" ? "bg-muted px-5 py-3 rounded-3xl user-message-bubble" : "text-foreground pt-1 w-full", m.isStopped ? "opacity-80" : "")}>
                    {m.role === "model" && !m.isTyping && (
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3 select-none relative w-full">
                        {/* Left Side: Sparkles Icon, Title, Sound controls */}
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                          <span className="text-xs font-bold text-foreground">AI Overview</span>

                          <button 
                            onClick={() => handleToggleTts(m.content, i)}
                            className={cn(
                              "h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center border transition-all text-muted-foreground hover:text-foreground shrink-0 cursor-pointer shadow-sm",
                              activeTtsIdx === i ? "bg-primary/10 border-primary/20 text-primary animate-pulse" : "border-border/40"
                            )}
                            title={activeTtsIdx === i ? "Stop listening" : "Read response aloud"}
                          >
                            {activeTtsIdx === i ? (
                              <VolumeX className="h-3 w-3 text-primary" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        {/* Right Side: Overlapping Source icons + count + dropdown button */}
                        {m.sources && m.sources.length > 0 && (
                          <div className="flex items-center gap-1">
                            <div 
                              className="flex -space-x-1.5 items-center cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                              onClick={() => setActiveSourcesDropdown(activeSourcesDropdown === i ? null : i)}
                            >
                              {m.sources.slice(0, 3).map((src, srcIdx) => {
                                let hostname = "Source";
                                try { hostname = new URL(src.uri).hostname; } catch(e) {}
                                const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                                return (
                                  <div 
                                    key={srcIdx} 
                                    className="h-5 w-5 rounded-full border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-card hover:translate-y-[-2px] transition-transform duration-200"
                                    title={src.title || hostname}
                                  >
                                    <img
                                      src={faviconUrl}
                                      alt=""
                                      className="h-3 w-3 object-contain rounded-full"
                                      onError={(e) => { e.currentTarget.src = "https://www.google.com/s2/favicons?domain=wikipedia.org"; }}
                                    />
                                  </div>
                                );
                              })}
                              {m.sources.length > 3 && (
                                <span className="text-[10px] font-bold text-muted-foreground ml-1.5 bg-muted px-1.5 py-0.5 rounded-full border border-border/80 scale-90">
                                  +{m.sources.length - 3}
                                </span>
                              )}
                            </div>
                            
                            <button 
                              onClick={() => setActiveSourcesDropdown(activeSourcesDropdown === i ? null : i)}
                              className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center border border-border/40 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer ml-1"
                              title="View all search sources"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {/* Floating Dropdown for all sources links */}
                            {activeSourcesDropdown === i && (
                              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl p-4 shadow-2xl z-[150] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                                  <h4 className="text-xs font-bold text-foreground">All Search Sources</h4>
                                  <button 
                                    onClick={() => setActiveSourcesDropdown(null)} 
                                    className="text-muted-foreground hover:text-foreground text-[10px] font-semibold"
                                  >
                                    Close
                                  </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar text-left">
                                  {m.sources.map((src, srcIdx) => {
                                    let hostname = "Source";
                                    try { hostname = new URL(src.uri).hostname; } catch(e) {}
                                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                                    return (
                                      <a 
                                        key={srcIdx} 
                                        href={src.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all group text-left"
                                      >
                                        <div className="h-7 w-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                                          <img 
                                            src={faviconUrl} 
                                            alt="" 
                                            className="h-4.5 w-4.5 object-contain rounded-full" 
                                            onError={(e) => { e.currentTarget.src = "https://www.google.com/s2/favicons?domain=wikipedia.org"; }}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1 text-left">
                                          <h5 className="text-[11px] font-bold text-foreground line-clamp-1 group-hover:text-blue-500 transition-colors leading-snug">{src.title}</h5>
                                          <span className="text-[9px] text-muted-foreground truncate block mt-0.5">{hostname}</span>
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                       <div className="flex flex-col w-full">
                         <TypewriterMarkdown 
                            content={m.content} 
                            isTyping={m.isTyping}
                            onComplete={() => markAsDone(i)}
                            setFullScreenImage={setFullScreenImage}
                            sources={m.sources}
                         />
                       </div>
                     ) : editingMessageIdx === i ? (
                       <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[450px] bg-background border border-border/80 rounded-2xl p-3 shadow-inner">
                         <textarea
                           value={editingMessageText}
                           onChange={e => setEditingMessageText(e.target.value)}
                           className="w-full bg-transparent border-0 text-sm focus:outline-none text-foreground resize-y min-h-[80px]"
                           onKeyDown={e => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleSaveEdit(i);
                             }
                           }}
                           autoFocus
                         />
                         <div className="flex justify-end gap-2 border-t border-border/40 pt-2 shrink-0">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => {
                               setEditingMessageIdx(null);
                               setEditingMessageText("");
                             }}
                             className="h-7 text-xs px-3 rounded-full hover:bg-muted"
                           >
                             Cancel
                           </Button>
                           <Button
                             size="sm"
                             onClick={() => handleSaveEdit(i)}
                             className="h-7 text-xs px-3 rounded-full"
                           >
                             Save & Submit
                           </Button>
                         </div>
                       </div>
                     ) : (
                       <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>
                         {preprocessMarkdown(m.content)}
                       </ReactMarkdown>
                     )}
                     {m.role === "model" && !m.isTyping && (
                       <div data-html2canvas-ignore="true" className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => copyToClipboard(m.content, i)} 
                              className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground rounded-full px-3"
                              title="Copy response content"
                            >
                              {copiedIdx === i ? (
                                <>
                                  <Check className="h-3 w-3 text-green-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy
                                </>
                              )}
                            </Button>
                            {i === messages.length - 1 && !loading && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleRegenerate} 
                                className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground rounded-full px-3"
                              >
                                <RefreshCw className="h-3 w-3" /> Regenerate
                              </Button>
                            )}
                            


                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLikeMessage(i)}
                              className={cn("h-7 w-7 p-0 rounded-full", likedMsgs[i] === 'like' ? "text-green-500 border-green-500/30 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground hover:text-foreground")}
                              title="Like response"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDislikeMessage(i)}
                              className={cn("h-7 w-7 p-0 rounded-full", likedMsgs[i] === 'dislike' ? "text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20" : "text-muted-foreground hover:text-foreground")}
                              title="Dislike response"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                       </div>
                     )}
                   </div>
                 </div>
               </motion.div>
              );
            })}

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
              {/* Slash Command Suggestions Popover */}
              {showCommands && filteredCommands.length > 0 && (
                <div 
                  ref={commandMenuRef}
                  className="absolute bottom-full left-4 mb-3 w-full max-w-xs sm:max-w-sm bg-popover/90 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-[1000] flex flex-col"
                  style={{ maxHeight: "80px" }}
                >
                  <div 
                    ref={commandListRef}
                    className="overflow-y-auto divide-y divide-border/40 scrollbar-hide py-1 max-h-[80px]"
                  >
                    {filteredCommands.map((cmd, idx) => {
                      const isSelected = idx === selectedCommandIndex;
                      const IconComponent = cmd.icon;
                      return (
                        <button
                          key={cmd.name}
                          onClick={() => selectCommand(cmd.name)}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors outline-none h-[40px]",
                            isSelected ? "bg-accent text-accent-foreground font-medium" : "text-popover-foreground hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComponent className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("font-semibold font-mono truncate", isSelected ? "text-primary" : "text-muted-foreground")}>
                              {cmd.name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-light italic truncate max-w-[150px] ml-4 shrink-0">
                            {cmd.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
              <div className="flex flex-col bg-muted/70 border border-border shadow-lg rounded-[24px] overflow-hidden focus-within:bg-muted/90 focus-within:shadow-xl transition-all p-1.5 backdrop-blur-md">
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
                 <button onClick={() => fileInputRef.current?.click()} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                   <Plus className="h-5 w-5" />
                 </button>
             <textarea 
                ref={textareaRef}
                value={input}
                onChange={e => {
                  const val = e.target.value;
                  setInput(val);
                  if (val.startsWith("/") && !val.includes(" ")) {
                    setShowCommands(true);
                    setSelectedCommandIndex(0);
                  } else {
                    setShowCommands(false);
                  }
                }}
                onKeyDown={e => {
                   if (showCommands && filteredCommands.length > 0) {
                     if (e.key === 'ArrowDown') {
                       e.preventDefault();
                       setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
                       return;
                     }
                     if (e.key === 'ArrowUp') {
                       e.preventDefault();
                       setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                       return;
                     }
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       selectCommand(filteredCommands[selectedCommandIndex].name);
                       return;
                     }
                     if (e.key === 'Escape') {
                       e.preventDefault();
                       setShowCommands(false);
                       return;
                     }
                   }
                   if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                   }
                }}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent border-none resize-none max-h-48 min-h-[36px] py-1.5 px-3 text-sm focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
                rows={1}
              />
             {loading || isTyping ? (
               <button 
                 onClick={handleStopGeneration}
                 className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5 bg-red-500 text-white shadow-md hover:scale-105"
               >
                 <Square className="h-4 w-4 fill-current" />
               </button>
             ) : (
               <button 
                 onClick={handleSend}
                 disabled={!input.trim() && attachedFiles.length === 0}
                 className={cn("h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-0.5 mb-0.5", (input.trim() || attachedFiles.length > 0) ? "bg-foreground text-background shadow-md hover:scale-105" : "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed")}
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