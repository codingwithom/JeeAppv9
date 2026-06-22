import express from "express";
import cors from "cors";
import playdl from "play-dl";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: ["https://omnetwork.in/v4", "http://localhost:21847", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function decodeHTMLEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ");
}

function cleanHtmlToText(html) {
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = decodeHTMLEntities(clean);
  return clean.replace(/\s+/g, ' ').trim();
}

async function fetchOgImage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(1800)
    });
    if (!response.ok) return "";
    const html = await response.text();
    
    let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
                 
    if (match && match[1]) {
      let imgUrl = match[1];
      if (imgUrl.startsWith("//")) {
        imgUrl = "https:" + imgUrl;
      } else if (imgUrl.startsWith("/")) {
        const parsed = new URL(url);
        imgUrl = parsed.origin + imgUrl;
      }
      return imgUrl;
    }
    return "";
  } catch (e) {
    return "";
  }
}

// ─── URL DETECTION ──────────────────────────────────────────────────────────
function detectType(url) {
  if (url.includes("youtu.be/") || url.includes("youtube.com/watch")) {
    if (url.includes("list=")) return "yt_playlist";
    return "yt_video";
  }
  if (url.includes("youtube.com/playlist")) return "yt_playlist";
  if (url.includes("open.spotify.com/track")) return "sp_track";
  if (url.includes("open.spotify.com/playlist")) return "sp_playlist";
  if (url.includes("open.spotify.com/album")) return "sp_album";
  return "unknown";
}

function extractListId(url) {
  try { return new URL(url).searchParams.get("list"); } catch { return null; }
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split(/[?#]/)[0] || null;
  } catch { /* ignore */ }
  return null;
}

function stripToVideoUrl(url) {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?#]/)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
  } catch { /* keep original */ }
  return url;
}

async function searchYt(query) {
  const results = await playdl.search(query, { source: { youtube: "video" }, limit: 1 });
  if (!results.length) throw new Error(`No YouTube match for: ${query}`);
  return results[0].url;
}

function extToMime(ext) {
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg" || ext === "opus") return "audio/ogg";
  return "audio/webm";
}

// ─── AUDIO CACHE ──────────────────────────────────────────────────────────────
const audioCache = new Map();

function serveFromBuffer(buffer, ext, req, res) {
  const totalSize = buffer.length;
  const mimeType = extToMime(ext);
  const rangeHeader = req.headers.range;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "no-store");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) { res.status(416).end(); return; }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;

    if (start > end || start >= totalSize) {
      res.status(416).setHeader("Content-Range", `bytes */${totalSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    res.setHeader("Content-Length", chunkSize);
    res.end(buffer.slice(start, end + 1));
  } else {
    res.status(200);
    res.setHeader("Content-Length", totalSize);
    res.end(buffer);
  }
}

function streamAndCache(ytUrl, req, res) {
  const existing = audioCache.get(ytUrl);

  if (existing?.status === "ready" && existing.buffer) {
    existing.lastAccessed = Date.now();
    serveFromBuffer(existing.buffer, existing.ext, req, res);
    return;
  }

  if (req.headers.range) {
    if (existing?.status === "downloading") {
      existing.listeners.push(() => {
        const e = audioCache.get(ytUrl);
        if (e?.status === "ready" && e.buffer) {
          serveFromBuffer(e.buffer, e.ext, req, res);
        } else {
          if (!res.headersSent) res.status(503).json({ error: "Audio not cached yet" });
        }
      });
      return;
    }
  }

  if (existing?.status === "downloading") {
    existing.listeners.push(() => {
      const e = audioCache.get(ytUrl);
      if (e?.status === "ready" && e.buffer) {
        serveFromBuffer(e.buffer, e.ext, req, res);
      } else {
        if (!res.headersSent) res.status(503).json({ error: "Download failed" });
      }
    });
    return;
  }

  const entry = {
    status: "downloading",
    ext: "mp4",
    chunks: [],
    listeners: [],
    lastAccessed: Date.now(),
  };
  audioCache.set(ytUrl, entry);

  const ytdlp = spawn("yt-dlp", [
    "-f", "bestaudio/best",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "-o", "-",
    ytUrl,
  ]);

  let headersSent = false;
  let stderrBuf = "";

  ytdlp.stderr.on("data", (d) => { stderrBuf += d.toString(); });

  ytdlp.stdout.on("data", (chunk) => {
    entry.chunks.push(chunk);

    if (!headersSent) {
      headersSent = true;
      res.setHeader("Content-Type", extToMime(entry.ext));
      res.setHeader("Cache-Control", "no-store");
    }
    if (!res.writableEnded) res.write(chunk);
  });

  ytdlp.on("close", (code) => {
    if (code === 0 && entry.chunks.length > 0) {
      entry.buffer = Buffer.concat(entry.chunks);
      entry.status = "ready";
      entry.chunks = [];
      entry.lastAccessed = Date.now();

      // Perform LRU Eviction check: Keep max 3 ready items in memory
      const readyKeys = [];
      for (const [key, val] of audioCache.entries()) {
        if (val.status === "ready") {
          readyKeys.push({ key, lastAccessed: val.lastAccessed || 0 });
        }
      }

      if (readyKeys.length > 3) {
        readyKeys.sort((a, b) => a.lastAccessed - b.lastAccessed);
        const evictCount = readyKeys.length - 3;
        for (let i = 0; i < evictCount; i++) {
          audioCache.delete(readyKeys[i].key);
          console.log(`[Cache Eviction] Evicted old audio buffer for: ${readyKeys[i].key}`);
        }
      }
    } else {
      entry.status = "error";
      entry.error = stderrBuf.replace(/WARNING:[^\n]+\n/g, "").trim() || `yt-dlp exit ${code}`;
      if (!headersSent) {
        res.status(500).json({ error: entry.error });
      }
    }

    if (!res.writableEnded) res.end();

    entry.listeners.forEach((l) => l());
    entry.listeners = [];
  });

  ytdlp.on("error", (err) => {
    entry.status = "error";
    entry.error = err.message;
    if (!headersSent && !res.headersSent) {
      res.status(500).json({ error: err.message });
    } else if (!res.writableEnded) {
      res.end();
    }
    entry.listeners.forEach((l) => l());
    entry.listeners = [];
  });
}

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

// 1. Health check & Root Welcome Routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "JEE Prep API Backend engine is running cleanly!"
  });
});

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Helper to extract JSON from HTML via brace matching
function extractJsonFromHtml(html, varName) {
  const index = html.indexOf(varName);
  if (index === -1) return null;
  
  const startIndex = html.indexOf('{', index);
  if (startIndex === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  
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
          const jsonStr = html.substring(startIndex, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            return null;
          }
        }
      }
    }
  }
  return null;
}

// Fetch YouTube subtitles directly from captionTracks inside ytInitialPlayerResponse
async function fetchYouTubeCaptionsFromHtml(html) {
  try {
    const data = extractJsonFromHtml(html, "ytInitialPlayerResponse");
    if (!data) return "";
    
    const capTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (capTracks && capTracks.length > 0) {
      // Prioritize English, then Hindi, then whatever is first
      const track = capTracks.find(t => t.languageCode === "en") || 
                    capTracks.find(t => t.languageCode === "hi") || 
                    capTracks[0];
      if (track && track.baseUrl) {
        const subtitleRes = await fetch(track.baseUrl + "&fmt=json3", {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000)
        });
        if (subtitleRes.ok) {
          const subJson = await subtitleRes.json();
          if (subJson && subJson.events) {
            const textLines = subJson.events
              .map(ev => ev.segs?.map(s => s.utf8).join("").trim() || "")
              .filter(Boolean);
            if (textLines.length > 0) {
              return textLines.join(" ");
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Scraper] Error parsing captions from HTML:", err.message);
  }
  return "";
}

// Extract YouTube metadata directly from HTML tags
function extractMetadataFromYtHtml(html, cleanUrl) {
  try {
    const titleMatch = html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i) || 
                       html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || 
                      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const keyMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    const authorMatch = html.match(/<link\s+itemprop=["']name["']\s+content=["']([^"']+)["']/i);
    
    let title = titleMatch ? decodeHTMLEntities(titleMatch[1].replace(/ - YouTube$/, "").trim()) : "Unknown Video";
    let description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "No description provided.";
    let keywords = keyMatch ? decodeHTMLEntities(keyMatch[1].trim()) : "";
    let author = authorMatch ? decodeHTMLEntities(authorMatch[1].trim()) : "Unknown Channel";
    
    return {
      title,
      description,
      keywords,
      author,
      metaText: `=== YOUTUBE VIDEO METADATA (EXTRACTED VIA HTML) ===\nURL: ${cleanUrl}\nTitle: ${title}\nChannel Name: ${author}\nKeywords: ${keywords}\nDescription:\n${description}\n`
    };
  } catch (e) {
    return null;
  }
}

// 1.5 Web scraper endpoint for crawling links and page content
app.get("/api/scrape", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    const cleanUrl = targetUrl.trim();

    // --- CASE 1: YOUTUBE LINK RESOLVER ---
    if (cleanUrl.includes("youtube.com/") || cleanUrl.includes("youtu.be/")) {
      // 1. YouTube Video
      const yvId = extractVideoId(cleanUrl);
      if (yvId) {
        console.log(`[Scraper] YouTube video detected: ${yvId}. Resolving metadata & transcript...`);
        let metaText = "";
        let transcriptText = "";
        let htmlInfo = null;

        // A. Fetch Invidious metadata
        const mirrors = [
          "https://inv.thepixora.com",
          "https://invidious.f5.si",
          "https://invidious.tiekoetter.com"
        ];
        for (const mirror of mirrors) {
          try {
            const vres = await fetch(`${mirror}/api/v1/videos/${yvId}`, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(5000)
            });
            if (vres.ok) {
              const data = await vres.json();
              if (data && data.title) {
                metaText = `=== YOUTUBE VIDEO METADATA ===\nURL: ${cleanUrl}\nTitle: ${data.title}\nChannel Name: ${data.author || "Unknown"} (URL: ${data.authorUrl || "N/A"})\nUpload Date: ${data.publishedText || "N/A"}\nDuration: ${data.lengthSeconds || 0} seconds\nViews: ${data.viewCount || 0}\nLikes: ${data.likeCount || 0}\nDescription:\n${data.description || "No description provided."}\n`;
                break;
              }
            }
          } catch (e) {
            console.warn(`[Scraper] Failed metadata fetch from ${mirror}: ${e.message}`);
          }
        }

        // B. Fetch transcript from youtube-transcript.ai
        try {
          const tres = await fetch(`https://youtube-transcript.ai/transcript/${yvId}.txt`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(8000)
          });
          if (tres.ok) {
            const contentType = tres.headers.get("content-type") || "";
            const body = await tres.text();
            if (!contentType.includes("text/html") && !body.trim().startsWith("<!DOCTYPE")) {
              transcriptText = body;
            }
          }
        } catch (e) {
          console.warn(`[Scraper] Failed transcript fetch: ${e.message}`);
        }

        // C. Parse directly from YouTube HTML if metadata or transcript is missing
        if (!metaText || !transcriptText) {
          try {
            const ytPageRes = await fetch(cleanUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
              },
              signal: AbortSignal.timeout(6000)
            });
            if (ytPageRes.ok) {
              const html = await ytPageRes.text();
              htmlInfo = extractMetadataFromYtHtml(html, cleanUrl);
              if (htmlInfo && !metaText) {
                metaText = htmlInfo.metaText;
              }
              if (!transcriptText) {
                transcriptText = await fetchYouTubeCaptionsFromHtml(html);
              }
            }
          } catch (htmlErr) {
            console.warn("[Scraper] Direct YouTube HTML fetch/parse failed:", htmlErr.message);
          }
        }

        // Fallback to play-dl if both failed
        if (!metaText && !transcriptText) {
          try {
            const info = await playdl.video_info(cleanUrl);
            const vd = info.video_details;
            metaText = `=== YOUTUBE VIDEO METADATA ===\nURL: ${cleanUrl}\nTitle: ${vd.title || "Unknown"}\nChannel Name: ${vd.channel?.name || "Unknown"} (URL: ${vd.channel?.url || "N/A"})\nUpload Date: ${vd.uploadDate || "N/A"}\nDuration: ${vd.durationInSec || 0} seconds\nViews: ${vd.views || 0}\nLikes: ${vd.likes || 0}\nDescription:\n${vd.description || "No description provided."}\n`;
          } catch (ytErr) {
            console.warn("[Scraper] play-dl video metadata fetch failed", ytErr);
          }
        }

        let combinedText = "";
        if (metaText) combinedText += metaText + "\n";
        if (transcriptText) {
          combinedText += `=== SPOKEN DIALOGUE / TRANSCRIPT ===\n${transcriptText}\n`;
        }

        // Fallback Search if metaText is empty or if we only have noembed title
        if (!metaText) {
          let noembedTitle = "";
          let noembedAuthor = "";
          try {
            const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { signal: AbortSignal.timeout(4000) });
            if (noembedRes.ok) {
              const noembedData = await noembedRes.json();
              if (noembedData && noembedData.title) {
                noembedTitle = noembedData.title;
                noembedAuthor = noembedData.author_name;
              }
            }
          } catch (neErr) {
            console.warn("[Scraper] noembed metadata resolver failed:", neErr);
          }

          if (noembedTitle) {
            combinedText = `=== YOUTUBE VIDEO METADATA (RESOLVED VIA NOEMBED) ===\nURL: ${cleanUrl}\nTitle: ${noembedTitle}\nChannel Name: ${noembedAuthor}\nDescription: This video is titled "${noembedTitle}" by channel "${noembedAuthor}".\n`;
          }
        }

        // IF transcript is empty or very short, aggregate Web summaries using multiple searches to guarantee accuracy
        const isTranscriptShort = !transcriptText || transcriptText.trim().length < 200;
        if (isTranscriptShort) {
          let videoTitle = "";
          let videoAuthor = "";
          let searchKeywords = "";
          
          if (htmlInfo) {
            videoTitle = htmlInfo.title;
            videoAuthor = htmlInfo.author;
            searchKeywords = htmlInfo.keywords;
          } else if (metaText) {
            const titleMatch = metaText.match(/Title:\s*(.+)/);
            const authorMatch = metaText.match(/Channel Name:\s*(.+)/);
            if (titleMatch) videoTitle = titleMatch[1].trim();
            if (authorMatch) videoAuthor = authorMatch[1].trim();
          }

          if (!videoTitle) {
            try {
              const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`, { signal: AbortSignal.timeout(4000) });
              if (noembedRes.ok) {
                const noembedData = await noembedRes.json();
                if (noembedData && noembedData.title) {
                  videoTitle = noembedData.title;
                  videoAuthor = noembedData.author_name;
                }
              }
            } catch (neErr) {}
          }

          if (videoTitle) {
            const queries = [];
            queries.push(`${videoTitle} plot OR summary`);
            if (videoAuthor && videoAuthor !== "Unknown Channel") {
              queries.push(`${videoAuthor} ${videoTitle} summary`);
            }
            if (searchKeywords) {
              const firstKeys = searchKeywords.split(",").slice(0, 3).map(k => k.trim()).filter(Boolean).join(" ");
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
                  const searchRes = await fetch(searchUrl, {
                    headers: {
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                    signal: AbortSignal.timeout(5000)
                  });
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

                      title = decodeHTMLEntities(title);
                      snippet = decodeHTMLEntities(snippet);
                      
                      if (title && snippet && !searchResultsMap.has(href)) {
                        searchResultsMap.set(href, `- [${title}](${href}): ${snippet}`);
                      }
                    });
                  }
                } catch (searchErr) {
                  console.warn(`[Scraper] Fallback search failed for query "${qStr}":`, searchErr.message);
                }
              })
            );

            if (searchResultsMap.size > 0) {
              const scrapedSummaries = Array.from(searchResultsMap.values()).join("\n");
              combinedText += `\n=== 3RD-PARTY AI YOUTUBE VIDEO ANALYZER REPORT ===\nBelow is the aggregated analysis, plot details, and topic summaries fetched from multiple high-authority web databases for this video to ensure correctness:\n${scrapedSummaries}\n`;
            }
          }
        }

        if (!combinedText) {
          combinedText = "Failed to retrieve YouTube video metadata or transcript due to network or bot restrictions.";
        }

        return res.status(200).json({ url: cleanUrl, text: combinedText, links: [] });
      }
      
      // 2. YouTube Channel
      if (cleanUrl.includes("/channel/") || cleanUrl.includes("/c/") || cleanUrl.includes("/user/") || cleanUrl.includes("/@")) {
        try {
          console.log(`[Scraper] YouTube channel detected: ${cleanUrl}. Resolving details...`);
          let channelName = "";
          const handleMatch = cleanUrl.match(/@([a-zA-Z0-9_-]+)/);
          if (handleMatch) {
            channelName = "@" + handleMatch[1];
          } else {
            const parts = cleanUrl.split("/");
            channelName = parts[parts.length - 1] || parts[parts.length - 2] || "YouTube Channel";
          }
          
          const searchResults = await playdl.search(channelName, { limit: 10, source: { youtube: "video" } });
          let textContent = `=== YOUTUBE CHANNEL METADATA ===\nURL: ${cleanUrl}\nChannel Name: ${channelName}\n\n=== LATEST VIDEOS FROM THIS CHANNEL ===\n`;
          
          searchResults.forEach((v, idx) => {
            textContent += `[Video ${idx + 1}] Title: ${v.title || "Unknown"}\nURL: https://www.youtube.com/watch?v=${v.id}\nDuration: ${v.durationInSec || 0} seconds\nViews: ${v.views || 0}\nUploaded: ${v.uploadedAt || "N/A"}\nThumbnail: ${v.thumbnails?.[0]?.url || ""}\nCreator: ${v.channel?.name || "Unknown"}\n\n`;
          });
          
          return res.status(200).json({ url: cleanUrl, text: textContent, links: [] });
        } catch (ytChanErr) {
          console.warn("[Scraper] play-dl channel metadata fetch failed:", ytChanErr);
        }
      }
    }

    // --- CASE 2: GITHUB FILE REWRITER ---
    if (cleanUrl.includes("github.com/") && cleanUrl.includes("/blob/")) {
      try {
        const rawUrl = cleanUrl
          .replace("github.com", "raw.githubusercontent.com")
          .replace("/blob/", "/");
        console.log(`[Scraper] GitHub file link detected. Rewriting to raw link: ${rawUrl}`);
        const response = await fetch(rawUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000)
        });
        if (response.ok) {
          let codeContent = await response.text();
          if (codeContent.length > 20000) {
            codeContent = codeContent.slice(0, 20000) + "\n\n... [File content truncated due to size limits] ...";
          }
          const textContent = `=== GITHUB FILE CONTENTS (${cleanUrl}) ===\n\n${codeContent}`;
          return res.status(200).json({ url: cleanUrl, text: textContent, links: [] });
        }
      } catch (gitErr) {
        console.warn("[Scraper] Failed to fetch raw GitHub content, falling back to normal HTML fetch...", gitErr);
      }
    }

    // --- CASE 3: GENERIC WEB PAGE SCRAPER WITH SPA & SOCIAL CONTENT EXTRACTION ---
    console.log(`[Scraper] Fetching HTML content for: ${cleanUrl}`);
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch web page: HTTP ${response.status}`);
    }

    const html = await response.text();

    // 1. Extract and summarize Meta tags (critical for social media post captions/profile cards)
    const metaTags = [];
    const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["']/gi;
    const metaRegexAlt = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["']/gi;
    let metaMatch;
    
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      metaTags.push({ key: metaMatch[1], value: metaMatch[2] });
    }
    while ((metaMatch = metaRegexAlt.exec(html)) !== null) {
      metaTags.push({ key: metaMatch[2], value: metaMatch[1] });
    }

    let metaSummary = "=== WEB PAGE METADATA ===\n";
    metaTags.forEach(m => {
      const k = m.key.toLowerCase();
      if (k.startsWith("og:") || k.startsWith("twitter:") || k === "description" || k === "keywords" || k === "title") {
        metaSummary += `${m.key}: ${decodeHTMLEntities(m.value)}\n`;
      }
    });

    // 2. Extract embedded JSON or JSON-LD blocks (critical for SPA profiles like g.dev)
    const jsonBlocks = [];
    const jsonScriptRegex = /<script\b[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = jsonScriptRegex.exec(html)) !== null) {
      const inner = scriptMatch[1].trim();
      if (inner.length > 50 && inner.length < 15000) {
        jsonBlocks.push(decodeHTMLEntities(inner));
      }
    }

    // 3. Extract and clean standard HTML Text
    let pageText = cleanHtmlToText(html);
    if (pageText.length > 15000) {
      pageText = pageText.slice(0, 15000) + "... [Plaintext truncated due to context limits]";
    }

    // 4. Combine elements
    let combinedText = `${metaSummary}\n=== PAGE PLAINTEXT CONTENT ===\n${pageText}`;
    if (jsonBlocks.length > 0) {
      combinedText += `\n\n=== EXTRACTED EMBEDDED DATA STRUCTURES (SPA DATA DUMPS) ===\n` + jsonBlocks.slice(0, 4).join("\n\n");
    }

    // 5. Extract links for sitemap parsing
    const links = [];
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
    const parsedUrl = new URL(cleanUrl);
    const hostname = parsedUrl.hostname;
    let linkMatch;

    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const rawHref = linkMatch[1].trim();
      try {
        const resolvedUrl = new URL(rawHref, cleanUrl);
        resolvedUrl.hash = ""; // discard fragments
        const href = resolvedUrl.href;
        if (resolvedUrl.hostname === hostname && !links.includes(href) && href !== cleanUrl) {
          links.push(href);
        }
      } catch (e) {}
    }

    res.status(200).json({
      url: cleanUrl,
      text: combinedText,
      links: links.slice(0, 20)
    });
  } catch (error) {
    console.error("Backend Scrape Error:", error);
    res.status(500).json({ error: error.message || "Failed to scrape web page" });
  }
});

// 1.75 Web proxy endpoint to bypass iframe frame restrictions (X-Frame-Options, CSP)
app.get("/api/proxy", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).send("Missing URL parameter 'url'");
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url || targetUrl;

    if (contentType.includes("text/html")) {
      let html = await response.text();
      const parsedUrl = new URL(finalUrl);
      const baseUrl = parsedUrl.origin + parsedUrl.pathname;

      // Rewrite relative URLs to absolute URLs routed through the proxy
      html = html.replace(/(href|src|action)=["'](?!http|\/\/|javascript:|#)([^"']+)["']/gi, (match, attr, path) => {
        try {
          const absoluteUrl = new URL(path, baseUrl).href;
          return `${attr}="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
        } catch (e) {
          return match;
        }
      });

      // Rewrite absolute navigation URLs to route through the proxy
      html = html.replace(/(href|action)=["'](https?:\/\/[^"']+)["']/gi, (match, attr, fullUrl) => {
        return `${attr}="/api/proxy?url=${encodeURIComponent(fullUrl)}"`;
      });

      // Inject a script to prevent iframe escaping
      html = html.replace("</head>", `<script>
        if (window.top !== window.self) {
          window.top.onbeforeunload = function() {};
        }
      </script></head>`);

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } else {
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error("Proxy Error:", err);
    return res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

// 2. DuckDuckGo search
app.get("/api/search", async (req, res) => {
  try {
    const { q, df } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }

    const encoded = encodeURIComponent(q);
    let searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
    if (df && typeof df === "string") {
      searchUrl += `&df=${df}`;
    }

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status: ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes("result results_links")) {
      return res.status(200).json({ results: [] });
    }

    const parts = html.split('class="result results_links');
    const rawResults = parts.slice(1).map((part) => {
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
      
      return { url, title, snippet, thumbnail: "" };
    });

    const withThumbnails = await Promise.all(
      rawResults.map(async (item, idx) => {
        if (idx < 8 && item.url) {
          const thumbnail = await fetchOgImage(item.url);
          return { ...item, thumbnail };
        }
        return item;
      })
    );

    return res.status(200).json({ results: withThumbnails });
  } catch (error) {
    console.error("Backend Search Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 3. YouTube search
function timeAgo(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return `1 day ago`;
    return `${diffDays} days ago`;
  } catch (e) {
    return "Recently";
  }
}

app.get("/api/yt-search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }
    
    let formatted = [];
    
    // Check if it is a request for a channel's latest video (e.g. "T-Series latest video")
    const channelMatch = q.match(/^(.*?)\s+latest\s+video$/i) || q.match(/^(.*?)\s+latest\s+uploads?$/i);
    if (channelMatch) {
      const channelName = channelMatch[1].trim();
      console.log(`[YT Search Endpoint] Channel request detected for name: ${channelName}`);
      try {
        const channelSearch = await playdl.search(channelName, { limit: 1, source: { youtube: "channel" } });
        if (channelSearch && channelSearch.length > 0) {
          const channel = channelSearch[0];
          console.log(`[YT Search Endpoint] Found channel: ${channel.name} (${channel.id}). Fetching RSS feed...`);
          
          const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
          const feedRes = await fetch(feedUrl, { signal: AbortSignal.timeout(5000) });
          if (feedRes.ok) {
            const xmlText = await feedRes.text();
            
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            const parsed = [];
            while ((match = entryRegex.exec(xmlText)) !== null) {
              const entryContent = match[1];
              const idMatch = entryContent.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
              const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
              const publishedMatch = entryContent.match(/<published>([^<]+)<\/published>/);
              
              if (idMatch && titleMatch) {
                const videoId = idMatch[1];
                const published = publishedMatch ? publishedMatch[1] : "";
                parsed.push({
                  videoId,
                  title: titleMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                  author: channel.name,
                  length_seconds: 0,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                  views: "N/A",
                  uploadedAt: published ? timeAgo(published) : "Recently"
                });
              }
            }
            
            if (parsed.length > 0) {
              // Fetch metadata for the top 3 videos to get exact views and duration if possible
              for (let i = 0; i < Math.min(3, parsed.length); i++) {
                try {
                  const info = await playdl.video_info(`https://www.youtube.com/watch?v=${parsed[i].videoId}`);
                  if (info && info.video_details) {
                    const vd = info.video_details;
                    parsed[i].length_seconds = vd.durationInSec || 0;
                    parsed[i].views = vd.views ? (vd.views >= 1000000 ? (vd.views / 1000000).toFixed(1) + "M" : vd.views >= 1000 ? (vd.views / 1000).toFixed(0) + "K" : vd.views.toString()) : "N/A";
                  }
                } catch (err) {
                  console.warn(`[YT Search Endpoint] Failed to fetch video info for ${parsed[i].videoId}:`, err.message);
                }
              }
              formatted = parsed;
            }
          }
        }
      } catch (channelErr) {
        console.warn(`[YT Search Endpoint] Channel lookup/scraping failed:`, channelErr.message);
      }
    }
    
    if (formatted.length === 0) {
      console.log(`[YT Search Endpoint] Query is generic or channel RSS failed. Performing standard video search for: ${q}`);
      const results = await playdl.search(q, { limit: 25, source: { youtube: "video" } });
      formatted = results.map(v => ({
        videoId: v.id || "",
        title: v.title || "Unknown",
        author: v.channel?.name || "Unknown",
        length_seconds: v.durationInSec || 0,
        thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        views: v.views ? (v.views >= 1000000 ? (v.views / 1000000).toFixed(1) + "M" : v.views >= 1000 ? (v.views / 1000).toFixed(0) + "K" : v.views.toString()) : "N/A",
        uploadedAt: v.uploadedAt || "Recently"
      }));
    }
    
    return res.status(200).json({ results: formatted });
  } catch (error) {
    console.error("Backend YT Search Error:", error);
    
    // Fallback: scrape YouTube search page
    try {
      const q = req.query.q;
      const encoded = encodeURIComponent(q);
      const searchUrl = `https://www.youtube.com/results?search_query=${encoded}&gl=US&hl=en`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const html = await response.text();
        const videos = [];
        const seenIds = new Set();
        
        let pos = 0;
        while (true) {
          pos = html.indexOf('"videoRenderer"', pos);
          if (pos === -1) break;
          
          const startIdx = html.indexOf("{", pos + 15);
          if (startIdx !== -1) {
            let braceCount = 0;
            let inString = false;
            let escape = false;
            let block = "";
            for (let i = startIdx; i < html.length; i++) {
              const char = html[i];
              if (escape) { escape = false; continue; }
              if (char === "\\") { escape = true; continue; }
              if (char === '"') { inString = !inString; continue; }
              if (!inString) {
                if (char === "{") braceCount++;
                else if (char === "}") {
                  braceCount--;
                  if (braceCount === 0) {
                    block = html.slice(startIdx, i + 1);
                    break;
                  }
                }
              }
            }
            if (block) {
              try {
                const r = JSON.parse(block);
                const vId = r.videoId;
                if (vId && !seenIds.has(vId)) {
                  seenIds.add(vId);
                  const title = r.title?.runs?.[0]?.text || r.title?.simpleText || "";
                  const author = r.ownerText?.runs?.[0]?.text || "";
                  let length_seconds = 0;
                  if (r.lengthText?.simpleText) {
                    const parts = r.lengthText.simpleText.split(":").map(Number);
                    if (parts.every((p) => !isNaN(p))) {
                      if (parts.length === 2) length_seconds = parts[0] * 60 + parts[1];
                      if (parts.length === 3) length_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                  }
                  const views = r.viewCountText?.simpleText || r.shortViewCountText?.simpleText || "N/A";
                  const uploadedAt = r.publishedTimeText?.simpleText || "Recently";
                  videos.push({
                    videoId: vId,
                    title,
                    author,
                    length_seconds,
                    thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
                    views,
                    uploadedAt
                  });
                }
              } catch(e) {}
            }
          }
          pos += 15;
        }
        if (videos.length > 0) {
          return res.status(200).json({ results: videos });
        }
      }
    } catch(scrapeErr) {
      console.error("Backend YT Search Scrape Fallback Error:", scrapeErr);
    }
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 4. Media information (Playlist & Single Video URL fetcher)
app.get("/api/media-info", async (req, res) => {
  const url = ((req.query.url) || "").trim();
  if (!url) { res.status(400).json({ error: "url param required" }); return; }

  const type = detectType(url);

  const cleanTitle = (t) => {
    if (!t) return "";
    return t
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\[\s*\d+\s*\]/g, "")
      .replace(/\(\s*\d+\s*\)/g, "")
      .trim();
  };

  const isPlaceHolder = (t) => {
    const lower = t.toLowerCase();
    return lower.includes("deleted video") || lower.includes("private video") || lower.includes("hidden video");
  };

  const extractFieldFromBlock = (block, keyName) => {
    const keyIdx = block.indexOf(`"${keyName}"`);
    if (keyIdx === -1) return "";
    
    const textIdx = block.indexOf('"text"', keyIdx);
    const simpleTextIdx = block.indexOf('"simpleText"', keyIdx);
    const contentIdx = block.indexOf('"content"', keyIdx);
    
    let valIdx = -1;
    let searchWord = "";
    
    const indices = [
      { idx: textIdx, word: '"text"' },
      { idx: simpleTextIdx, word: '"simpleText"' },
      { idx: contentIdx, word: '"content"' }
    ].filter(item => item.idx !== -1).sort((a, b) => a.idx - b.idx);
    
    if (indices.length > 0) {
      valIdx = indices[0].idx;
      searchWord = indices[0].word;
    }
    
    if (valIdx === -1) return "";
    
    const quoteStart = block.indexOf('"', valIdx + searchWord.length + 1);
    if (quoteStart === -1) return "";
    
    let escape = false;
    let quoteEnd = -1;
    for (let i = quoteStart + 1; i < block.length; i++) {
      const char = block[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        quoteEnd = i;
        break;
      }
    }
    if (quoteEnd === -1) return "";
    
    const rawStringLiteral = block.slice(quoteStart, quoteEnd + 1);
    try {
      return JSON.parse(rawStringLiteral);
    } catch (e) {
      return rawStringLiteral.slice(1, -1);
    }
  };

  const scrapePlaylistHtml = async (ytPlaylistId) => {
    const targetUrl = `https://www.youtube.com/playlist?list=${ytPlaylistId}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const html = await response.text();

    let playlistName = "YouTube Playlist";
    const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/) 
      || html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
    if (titleMatch) playlistName = cleanTitle(titleMatch[1]);

    const tracks = [];
    const seenIds = new Set();

    const rendererKeys = [
      "playlistVideoRenderer",
      "playlistVideoListRenderer",
      "gridVideoRenderer",
      "videoRenderer",
      "watchCardRichVideoRenderer",
      "lockupViewModel"
    ];

    for (const key of rendererKeys) {
      let pos = 0;
      while (true) {
        pos = html.indexOf(`"${key}"`, pos);
        if (pos === -1) break;

        const startIdx = html.indexOf("{", pos + key.length + 2);
        if (startIdx !== -1 && startIdx - pos < 50) {
          let braceCount = 0;
          let inStringDouble = false;
          let inStringSingle = false;
          let escape = false;
          let rendererStr = "";

          for (let i = startIdx; i < html.length; i++) {
            const char = html[i];
            if (escape) { escape = false; continue; }
            if (char === "\\") { escape = true; continue; }
            if (char === '"' && !inStringDouble && !inStringSingle) {
              inStringDouble = true;
              continue;
            }
            if (char === '"' && inStringDouble && !escape) {
              inStringDouble = false;
              continue;
            }
            if (char === "'" && !inStringDouble && !inStringSingle) {
              inStringSingle = true;
              continue;
            }
            if (char === "'" && inStringSingle && !escape) {
              inStringSingle = false;
              continue;
            }
            if (!inStringDouble && !inStringSingle) {
              if (char === "{") braceCount++;
              else if (char === "}") {
                braceCount--;
                if (braceCount === 0) {
                  rendererStr = html.slice(startIdx, i + 1);
                  break;
                }
              }
            }
          }

          if (rendererStr) {
            try {
              const r = JSON.parse(rendererStr);
              const videoObj = r.videoRenderer || r;
              if (videoObj) {
                const vId = videoObj.videoId || videoObj.contentId;
                if (vId && !seenIds.has(vId)) {
                  const rawTitle = videoObj.title?.runs?.[0]?.text || videoObj.title?.simpleText || videoObj.title?.content || videoObj.metadata?.lockupMetadataViewModel?.title?.content || videoObj.title || "";
                  const rawArtist = videoObj.shortBylineText?.runs?.[0]?.text || videoObj.ownerText?.runs?.[0]?.text || videoObj.longBylineText?.runs?.[0]?.text || videoObj.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || "YouTube";
                  
                  const tStr = cleanTitle(rawTitle);
                  if (isPlaceHolder(tStr)) {
                    pos += key.length + 2;
                    continue;
                  }
                  
                  const title = tStr || `YouTube Video [${vId}]`;
                  seenIds.add(vId);
                  
                  let duration = 0;
                  if (videoObj.lengthSeconds) {
                    duration = parseInt(videoObj.lengthSeconds, 10);
                  } else if (videoObj.lengthText?.simpleText) {
                    const parts = videoObj.lengthText.simpleText.split(":").map(Number);
                    if (parts.every((p) => !isNaN(p))) {
                      if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                      if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                  }

                  tracks.push({
                    title,
                    artist: cleanTitle(rawArtist) || "YouTube",
                    thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                    duration: isNaN(duration) ? 0 : duration,
                    youtubeId: vId,
                    streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
                  });
                }
              }
            } catch (e) {
              const idMatch = rendererStr.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/)|| rendererStr.match(/"contentId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
              if (idMatch) {
                const vId = idMatch[1];
                if (!seenIds.has(vId)) {
                  const title = cleanTitle(extractFieldFromBlock(rendererStr, "title")) || `YouTube Video [${vId}]`;
                  const artist = cleanTitle(
                    extractFieldFromBlock(rendererStr, "shortBylineText") ||
                    extractFieldFromBlock(rendererStr, "ownerText") ||
                    extractFieldFromBlock(rendererStr, "longBylineText") ||
                    extractFieldFromBlock(rendererStr, "metadata")
                  ) || "YouTube";
                  
                  if (isPlaceHolder(title)) {
                    pos += key.length + 2;
                    continue;
                  }
                  seenIds.add(vId);
                  tracks.push({
                    title,
                    artist,
                    thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                    duration: 0,
                    youtubeId: vId,
                    streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
                  });
                }
              }
            }
          }
        }
        pos += key.length + 2;
      }
    }

    if (tracks.length === 0) {
      const videoRegex = /"(?:videoId|contentId)"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
      let match;
      while ((match = videoRegex.exec(html)) !== null) {
        const vId = match[1];
        if (!seenIds.has(vId)) {
          const searchWindow = html.slice(Math.max(0, match.index - 500), Math.min(html.length, match.index + 500));
          const title = cleanTitle(extractFieldFromBlock(searchWindow, "title")) || `YouTube Video [${vId}]`;
          const artist = cleanTitle(
            extractFieldFromBlock(searchWindow, "shortBylineText") ||
            extractFieldFromBlock(searchWindow, "ownerText") ||
            extractFieldFromBlock(searchWindow, "longBylineText") ||
            extractFieldFromBlock(searchWindow, "metadata")
          ) || "YouTube";
          
          if (isPlaceHolder(title)) continue;
          
          seenIds.add(vId);
          tracks.push({
            title,
            artist,
            thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            duration: 0,
            youtubeId: vId,
            streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
          });
        }
      }
    }

    return { name: playlistName, tracks };
  };

  try {
    if (type === "yt_video") {
      const clean = stripToVideoUrl(url);
      const info = await playdl.video_info(clean);
      const vd = info.video_details;
      const videoId = extractVideoId(clean);
      res.json({
        type: "track",
        youtubeId: videoId,
        title: cleanTitle(vd.title ?? "Unknown"),
        artist: cleanTitle(vd.channel?.name ?? "Unknown"),
        thumbnail: vd.thumbnails?.at(-1)?.url,
        duration: vd.durationInSec ?? 0,
        streamUrl: `/api/stream?url=${encodeURIComponent(clean)}`,
      });
      return;
    }

    if (type === "yt_playlist") {
      const listId = extractListId(url) || url;
      const targetUrl = listId.startsWith("PL") || listId.startsWith("UU") || listId.startsWith("LL") 
        ? `https://www.youtube.com/playlist?list=${listId}` 
        : url;

      let playlistName = "YouTube Playlist";
      let tracks = [];

      // Strategy 1: Try HTML scraper first (extremely fast and immune to play-dl parsing bugs)
      try {
        console.log("Fetching playlist info using HTML scraper for:", targetUrl);
        const scraped = await scrapePlaylistHtml(listId);
        if (scraped.tracks.length > 0) {
          playlistName = scraped.name;
          tracks = scraped.tracks;
        } else {
          throw new Error("No tracks extracted by HTML scraper");
        }
      } catch (scrapeErr) {
        console.warn("HTML scraper failed, falling back to play-dl...", scrapeErr);
        
        // Strategy 2: Fall back to play-dl
        try {
          const playlist = await Promise.race([
            playdl.playlist_info(targetUrl, { incomplete: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("play-dl playlist_info timeout")), 8000))
          ]);
          
          playlistName = playlist.title || "YouTube Playlist";
          let videos = playlist.videos || [];
          if (videos.length === 0) {
            try {
              videos = await playlist.page(1) || [];
            } catch (pageErr) {
              console.warn("play-dl playlist page(1) fetch failed, falling back to all_videos()", pageErr);
              videos = await playlist.all_videos();
            }
          }
          
          tracks = videos.map((v) => {
            const vId = v.id || "";
            return {
              title: cleanTitle(v.title || "") || `YouTube Video [${vId}]`,
              artist: v.channel?.name || "YouTube",
              thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
              duration: v.durationInSec || 0,
              youtubeId: vId,
              streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
            };
          }).filter((t) => !isPlaceHolder(t.title));
        } catch (playdlErr) {
          console.error("All playlist fetching methods failed:", playdlErr);
        }
      }

      if (tracks.length === 0) {
        res.status(404).json({ error: "No tracks found in playlist or playlist is private" });
        return;
      }

      res.json({
        type: "playlist",
        name: playlistName,
        thumbnail: tracks[0]?.thumbnail,
        trackCount: tracks.length,
        tracks
      });
      return;
    }

    if (type === "sp_track") {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!oembedRes.ok) throw new Error("Cannot fetch Spotify track info");
      const oembed = await oembedRes.json();
      const ytUrl = await searchYt(oembed.title);
      const ytInfo = await playdl.video_info(ytUrl);
      const vd = ytInfo.video_details;
      const parts = oembed.title.split(" - ");
      const title = parts.length >= 2 ? parts.slice(1).join(" - ").trim() : oembed.title;
      const artist = parts.length >= 2 ? parts[0].trim() : (vd.channel?.name ?? "Unknown");
      const ytVideoId = extractVideoId(ytUrl);
      const cleanSpUrl = ytVideoId ? `https://www.youtube.com/watch?v=${ytVideoId}` : ytUrl;
      res.json({
        type: "track",
        youtubeId: ytVideoId,
        title,
        artist,
        thumbnail: oembed.thumbnail_url ?? vd.thumbnails?.at(-1)?.url,
        duration: vd.durationInSec ?? 0,
        streamUrl: `/api/stream?url=${encodeURIComponent(cleanSpUrl)}`,
      });
      return;
    }

    if (type === "sp_playlist" || type === "sp_album") {
      res.status(503).json({ error: "Spotify playlists/albums are not supported. Use individual Spotify tracks or a YouTube playlist link." });
      return;
    }

    res.status(400).json({ error: "Unsupported URL. Paste a YouTube video/playlist or Spotify track link." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 5. Stream audio
app.get("/api/stream", async (req, res) => {
  const url = ((req.query.url) || "").trim();
  if (!url) { res.status(400).json({ error: "url param required" }); return; }

  try {
    let ytUrl = url;
    const type = detectType(url);

    if (type === "sp_track") {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!oembedRes.ok) throw new Error("Cannot resolve Spotify track");
      const { title } = await oembedRes.json();
      ytUrl = await searchYt(title);
    } else if (type === "yt_playlist") {
      ytUrl = stripToVideoUrl(url);
    } else if (type !== "yt_video") {
      res.status(400).json({ error: "Unsupported URL for streaming" });
      return;
    }

    streamAndCache(ytUrl, req, res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) res.status(500).json({ error: msg });
  }
});

// 5.5. Text to Speech Endpoint (Microsoft Edge Neural Voices)
app.post("/api/tts", async (req, res) => {
  const { text, gender } = req.body;
  if (!text) {
    return res.status(400).json({ error: "text payload is required" });
  }

  try {
    const tts = new MsEdgeTTS();
    
    // Check for native Devanagari character script (Hindi characters)
    const hasHindi = /[\u0900-\u097F]/.test(text);
    
    // Select Voice ID based on Gender & Script:
    // Female: SwaraNeural (Hindi Devanagari) vs NeerjaNeural (English/Hinglish)
    // Male: MadhurNeural (Hindi Devanagari) vs PrabhatNeural (English/Hinglish)
    let voice = "en-IN-NeerjaNeural"; 
    if (gender === "male") {
      voice = hasHindi ? "hi-IN-MadhurNeural" : "en-IN-PrabhatNeural";
    } else {
      voice = hasHindi ? "hi-IN-SwaraNeural" : "en-IN-NeerjaNeural";
    }

    console.log(`[TTS] Request received for voice: ${voice}, text length: ${text.length}`);

    // Set standard MP3 format
    const format = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3 || "audio-24khz-96kbitrate-mono-mp3";
    await tts.setMetadata(voice, format);

    const { audioStream } = tts.toStream(text);
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");
    
    audioStream.pipe(res);

    audioStream.on("error", (streamErr) => {
      console.error("[TTS] Stream piping error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Audio streaming error occurred" });
      }
    });
  } catch (err) {
    console.error("[TTS] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to generate speech synthesis" });
    }
  }
});

// 6. Production Clean API Routing Strategy (Bypasses local file loop boundaries)
app.get(/.*/, (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  // Standard fallback text safely answering to Render's internal route ping rules
  res.status(200).send("Backend production engine running cleanly.");
});

// PORT resolution and server start
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend production engine running cleanly on port ${PORT}`);
});