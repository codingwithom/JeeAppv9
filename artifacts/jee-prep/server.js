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
    const rawResults = parts.slice(1, 7).map((part) => {
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
        if (idx < 4 && item.url) {
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
app.get("/api/yt-search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }
    
    const results = await playdl.search(q, { limit: 25, source: { youtube: "video" } });
    const formatted = results.map(v => ({
      videoId: v.id || "",
      title: v.title || "Unknown",
      author: v.channel?.name || "Unknown",
      length_seconds: v.durationInSec || 0,
      thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`
    }));
    
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
                  videos.push({
                    videoId: vId,
                    title,
                    author,
                    length_seconds,
                    thumbnail: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
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