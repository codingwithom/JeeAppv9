import { Router, type Request, type Response } from "express";
import { spawn } from "child_process";
import playdl from "play-dl";

const router: Router = Router();

// ─── URL type detection ───────────────────────────────────────────────────────
type UrlType =
  | "yt_video"
  | "yt_playlist"
  | "sp_track"
  | "sp_playlist"
  | "sp_album"
  | "unknown";

function detectType(url: string): UrlType {
  if (url.includes("youtu.be/") || url.includes("youtube.com/watch")) {
    if (url.includes("list=")) return "yt_playlist";
    return "yt_video";
  }
  if (url.includes("youtube.com/playlist")) return "yt_playlist";
  if (url.includes("spotify.com/track/")) return "sp_track";
  if (url.includes("spotify.com/playlist/")) return "sp_playlist";
  if (url.includes("spotify.com/album/")) return "sp_album";
  return "unknown";
}

function extractListId(url: string): string | null {
  try { return new URL(url).searchParams.get("list"); } catch { return null; }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split(/[?#]/)[0] || null;
  } catch { /* ignore */ }
  return null;
}

function stripToVideoUrl(url: string): string {
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

async function searchYt(query: string): Promise<string> {
  const results = await playdl.search(query, { source: { youtube: "video" }, limit: 1 });
  if (!results.length) throw new Error(`No YouTube match for: ${query}`);
  return results[0].url;
}

function extToMime(ext: string): string {
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg" || ext === "opus") return "audio/ogg";
  return "audio/webm";
}

// ─── In-memory audio cache ────────────────────────────────────────────────────
// Buffers the full audio download so range requests (seeking) can be served
// without re-downloading. Each entry is ~3–10 MB.
interface CacheEntry {
  status: "downloading" | "ready" | "error";
  ext: string;
  buffer?: Buffer;          // set when status === "ready"
  chunks: Buffer[];         // accumulates while downloading
  error?: string;
  listeners: Array<() => void>; // waiting for download to complete
}

const audioCache = new Map<string, CacheEntry>();

/**
 * Serve an in-memory Buffer with proper byte-range support.
 * Enables full seeking in the browser's <audio> element.
 */
function serveFromBuffer(buffer: Buffer, ext: string, req: Request, res: Response): void {
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

/**
 * Stream audio via yt-dlp stdout while simultaneously caching to memory.
 * First caller gets a streamed response (music starts immediately).
 * Subsequent range requests are served from the buffer (full seeking).
 */
function streamAndCache(ytUrl: string, req: Request, res: Response): void {
  const existing = audioCache.get(ytUrl);

  // ── Already fully cached: serve with full range support ──────────────────
  if (existing?.status === "ready" && existing.buffer) {
    serveFromBuffer(existing.buffer, existing.ext, req, res);
    return;
  }

  // ── Range request while download is in progress: wait for completion ─────
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
    // No entry at all — fall through to start download (shouldn't happen)
  }

  // ── Already downloading (non-range request): wait and then respond ────────
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

  // ── Start a fresh download ────────────────────────────────────────────────
  const entry: CacheEntry = {
    status: "downloading",
    ext: "mp4", // YouTube audio via HLS is typically MP4/AAC
    chunks: [],
    listeners: [],
  };
  audioCache.set(ytUrl, entry);

  // Stream via yt-dlp pipe — this works for HLS whereas file download doesn't
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

  ytdlp.stderr.on("data", (d: Buffer) => { stderrBuf += d.toString(); });

  ytdlp.stdout.on("data", (chunk: Buffer) => {
    // Accumulate into cache
    entry.chunks.push(chunk);

    // Stream the first chunk as soon as possible so audio starts immediately
    if (!headersSent) {
      headersSent = true;
      res.setHeader("Content-Type", extToMime(entry.ext));
      res.setHeader("Cache-Control", "no-store");
      // No Accept-Ranges or Content-Length yet — this is a live stream
    }
    if (!res.writableEnded) res.write(chunk);
  });

  ytdlp.on("close", (code) => {
    if (code === 0 && entry.chunks.length > 0) {
      entry.buffer = Buffer.concat(entry.chunks);
      entry.status = "ready";
      entry.chunks = []; // free intermediate chunks
    } else {
      entry.status = "error";
      entry.error = stderrBuf.replace(/WARNING:[^\n]+\n/g, "").trim() || `yt-dlp exit ${code}`;
      if (!headersSent) {
        res.status(500).json({ error: entry.error });
      }
    }

    if (!res.writableEnded) res.end();

    // Notify all waiting range-request listeners
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

  // Don't kill yt-dlp on client disconnect — let download finish for caching
}

// ─── GET /api/media-info?url= ─────────────────────────────────────────────────
interface TrackInfo {
  title: string;
  artist: string;
  thumbnail?: string;
  duration: number;
  streamUrl: string;
  youtubeId?: string | null;
}

router.get("/media-info", async (req: Request, res: Response) => {
  const url = ((req.query.url as string) || "").trim();
  if (!url) { res.status(400).json({ error: "url param required" }); return; }

  const type = detectType(url);

  // Safe title text-layer cleanup helper
  const cleanTitle = (t: string): string => {
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

  const isPlaceHolder = (t: string): boolean => {
    const lower = t.toLowerCase();
    return lower.includes("deleted video") || lower.includes("private video") || lower.includes("hidden video");
  };

  const extractFieldFromBlock = (block: string, keyName: string): string => {
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

      const scrapePlaylistHtml = async (ytPlaylistId: string) => {
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

        // Extract playlist title
        let playlistName = "YouTube Playlist";
        const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/) 
          || html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
        if (titleMatch) playlistName = cleanTitle(titleMatch[1]);

        const tracks: TrackInfo[] = [];
        const seenIds = new Set<string>();

        // Extract using block-based renderer parser
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
                        if (parts.every((p: number) => !isNaN(p))) {
                          if (parts.length === 2) duration = parts[0] * 60 + parts[1];
                          if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        }
                      }

                      tracks.push({
                        title,
                        artist: cleanTitle(rawArtist) || "YouTube",
                        thumbnail: `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
                        duration: isNaN(duration) ? 0 : duration,
                        youtubeId: vId,
                        streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
                      });
                    }
                  }
                } catch (e) {
                  // Fallback: extract fields directly using robust substring search
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
                        thumbnail: `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
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

        // If JSON parsing blocks throw an error or return an empty array, instantly deploy a secondary string matching loop as a hard fallback
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
                thumbnail: `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
                duration: 0,
                youtubeId: vId,
                streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
              });
            }
          }
        }

        return { name: playlistName, tracks };
      };

      let playlistName = "YouTube Playlist";
      let tracks: TrackInfo[] = [];

      try {
        const scraped = await scrapePlaylistHtml(listId);
        if (scraped.tracks.length === 0) {
          throw new Error("No tracks extracted by HTML scraper");
        }
        playlistName = scraped.name;
        tracks = scraped.tracks;
      } catch (scrapeErr) {
        console.warn("Fast HTML parser failed, falling back to play-dl...", scrapeErr);
        try {
          const playlist = await Promise.race([
            playdl.playlist_info(targetUrl, { incomplete: true }),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          playlistName = playlist.title || "YouTube Playlist";
          const videos = await Promise.race([
            playlist.all_videos(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
          ]);
          tracks = videos.map((v: any) => {
            const vId = v.id || "";
            return {
              title: cleanTitle(v.title || "") || `YouTube Video [${vId}]`,
              artist: v.channel?.name || "YouTube",
              thumbnail: v.thumbnails?.at(-1)?.url || `https://img.youtube.com/vi/${vId}/mqdefault.jpg`,
              duration: v.durationInSec || 0,
              youtubeId: vId,
              streamUrl: `/api/stream?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vId}`)}`
            };
          }).filter((t: any) => !isPlaceHolder(t.title));
        } catch (err) {
          console.error("Backend play-dl playlist fetching also failed:", err);
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
      const oembed = (await oembedRes.json()) as { title: string; thumbnail_url?: string };
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ─── GET /api/stream?url= ─────────────────────────────────────────────────────
// First request: streams via yt-dlp while caching to memory.
// Range requests (seeking): served from the in-memory buffer.
router.get("/stream", async (req: Request, res: Response) => {
  const url = ((req.query.url as string) || "").trim();
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
      const { title } = (await oembedRes.json()) as { title: string };
      ytUrl = await searchYt(title);
    } else if (type === "yt_playlist") {
      ytUrl = stripToVideoUrl(url);
    } else if (type !== "yt_video") {
      res.status(400).json({ error: "Unsupported URL for streaming" });
      return;
    }

    streamAndCache(ytUrl, req, res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) res.status(500).json({ error: msg });
  }
});

export default router;
