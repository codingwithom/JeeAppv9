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

  try {
    if (type === "yt_video") {
      const clean = stripToVideoUrl(url);
      const info = await playdl.video_info(clean);
      const vd = info.video_details;
      const videoId = extractVideoId(clean);
      res.json({
        type: "track",
        youtubeId: videoId,
        title: vd.title ?? "Unknown",
        artist: vd.channel?.name ?? "Unknown",
        thumbnail: vd.thumbnails?.at(-1)?.url,
        duration: vd.durationInSec ?? 0,
        streamUrl: `/api/stream?url=${encodeURIComponent(clean)}`,
      });
      return;
    }

    if (type === "yt_playlist") {
      const listId = extractListId(url);
      const playlistUrl = listId ? `https://www.youtube.com/playlist?list=${listId}` : url;
      const playlist = await playdl.playlist_info(playlistUrl, { incomplete: true });
      const videos = await playlist.all_videos();
      const tracks: TrackInfo[] = videos.slice(0, 100).map((v) => {
        const ytId = extractVideoId(v.url);
        const cleanVUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : v.url;
        return {
          title: v.title ?? "Unknown",
          artist: v.channel?.name ?? "Unknown",
          thumbnail: v.thumbnails?.[0]?.url,
          duration: v.durationInSec ?? 0,
          youtubeId: ytId ?? undefined,
          streamUrl: `/api/stream?url=${encodeURIComponent(cleanVUrl)}`,
        };
      });
      res.json({
        type: "playlist",
        name: playlist.title ?? "YouTube Playlist",
        thumbnail: playlist.thumbnail?.url ?? tracks[0]?.thumbnail,
        trackCount: playlist.total_videos ?? tracks.length,
        tracks,
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
